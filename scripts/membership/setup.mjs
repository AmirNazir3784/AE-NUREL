// setup.mjs — AENural membership setup wizard (Phase 3).
//
// INTENDED REPO PATH: scripts/membership/setup.mjs
// RUN:  npm run membership:setup        (from the repo root, on the PC)
//       node scripts/membership/setup.mjs --help
//
// Pure, testable logic lives in ./setup-lib.mjs (no fs/network/process
// access). This file is the thin CLI: prompts, git/npm/mysql/smtp calls,
// and the stage orchestration. It uses only Node builtins plus the
// modules already in the repo (mysql2, nodemailer, server/membership/*),
// all imported lazily inside the stages that need them, so --help works
// with no node_modules installed.
//
// SAFETY (do not weaken):
//   * No password/secret/OTP is ever printed, logged, stored in the state
//     file or written to the readiness report. Error messages are passed
//     through redactText() with the in-memory secrets before printing.
//   * Remote MySQL uses resolveMysqlTls() from server/membership/mysql-tls.mjs
//     (fail-closed, rejectUnauthorized always true). No flag disables it.
//   * Stage D never runs a DROP, never deletes data, and only runs CREATE
//     statements for tables that do not exist yet, after a typed YES.
//   * Stage E sends ONE test email, only after explicit approval, only to
//     an address the user typed. No silent fallback to the local outbox.
//   * The wizard never resets git changes, never overwrites uncommitted
//     work without confirmation, and never kills a process the user did
//     not confirm. It only ever writes .env.local (atomically, with an
//     in-memory rollback), .aenural-local/setup-state.json and
//     .aenural-local/readiness-report.md — and .gitignore, only if the
//     user explicitly confirms the append.
//   * Nothing here deploys, merges, pushes, or touches production. The
//     production host/profile (127.0.0.1) is treated as out of scope for
//     schema writes.

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
// (no readline import: see createLineReader below — readline drops buffered piped input)
import { spawnSync, execFileSync } from 'node:child_process';
import net from 'node:net';
import dns from 'node:dns';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

import {
  STAGE_ORDER, STAGES, EXPECTED_BRANCH, EXPECTED_PACKAGE_NAME,
  DEV_DEFAULTS, ENV_SPEC, resolveSmtpPreset, validateSmtpPair,
  generateSecret, isValidSecret, parseEnvFile, serializeEnvFile,
  maskEmail, isValidEmail, redactText, processHiddenChunk,
  missingGitignorePatterns, validateDbTarget, splitSqlStatements,
  parseSqlTables, diffSchema, missingTables, parseGrants, missingPermissions,
  createState, markStage, nextPendingStage, allStagesPassed,
  assertStateHasNoSecrets, renderReadinessReport, buildSetupTestEmail,
} from './setup-lib.mjs';

const REPO_ROOT = process.cwd();
const STATE_DIR = path.join(REPO_ROOT, '.aenural-local');
const STATE_FILE = path.join(STATE_DIR, 'setup-state.json');
const REPORT_FILE = path.join(STATE_DIR, 'readiness-report.md');
const ENV_FILE = path.join(REPO_ROOT, '.env.local');
const SQL_FILE = path.join(REPO_ROOT, 'server', 'membership', 'migrations', '001-initial-mysql.sql');

const REQUIRED_MYSQL_PERMS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER'];

// Secrets held ONLY in memory for this run (for redaction + env writing).
// Never written to state, report, logs or disk except inside .env.local.
const runSecrets = [];
function rememberSecret(value) {
  if (typeof value === 'string' && value.length >= 4 && !runSecrets.includes(value)) runSecrets.push(value);
}
function redact(message) {
  return redactText(String(message ?? ''), runSecrets);
}

// ---------------------------------------------------------------------------
// Output — plain text only, no ANSI (must work in plain Windows CMD as
// well as PowerShell and POSIX shells).
// ---------------------------------------------------------------------------

function out(line = '') { process.stdout.write(line + '\n'); }
function ok(line) { out(`[OK] ${line}`); }
function failLine(line) { out(`[FAIL] ${line}`); }
function warn(line) { out(`[WARN] ${line}`); }
function skip(line) { out(`[SKIP] ${line}`); }
function info(line) { out(`[INFO] ${line}`); }

// ---------------------------------------------------------------------------
// CLI arguments
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const args = { stage: null, nonInteractive: false, dryRun: false, resume: true, resetState: false, help: false, fromEnv: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--non-interactive') args.nonInteractive = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--resume') args.resume = true;
    else if (a === '--from-env' || a === '--use-env') args.fromEnv = true;
    else if (a === '--reset-state') args.resetState = true;
    else if (a === '--check') args.stage = 'i';
    else if (a === '--stage') {
      const v = (argv[++i] || '').toLowerCase();
      if (!STAGE_ORDER.includes(v)) throw new Error(`--stage must be one of: ${STAGE_ORDER.join(', ')}. Got "${v}".`);
      args.stage = v;
    } else if (a.startsWith('--stage=')) {
      const v = a.slice('--stage='.length).toLowerCase();
      if (!STAGE_ORDER.includes(v)) throw new Error(`--stage must be one of: ${STAGE_ORDER.join(', ')}. Got "${v}".`);
      args.stage = v;
    } else {
      throw new Error(`Unknown argument "${a}". Run with --help.`);
    }
  }
  return args;
}

const HELP_TEXT = [
  'AENural membership setup wizard — npm run membership:setup',
  '',
  'Guides the local setup on the PC: preflight, .env.local, MySQL + TLS,',
  'schema (approved only), SMTP + test email, then lint/typecheck/test/',
  'build/release:check. Resumable: progress is kept in the local-only,',
  'git-ignored file .aenural-local/setup-state.json (no secrets in it).',
  'A redacted readiness report is written to .aenural-local/readiness-report.md.',
  '',
  'Usage: node scripts/membership/setup.mjs [options]',
  '',
  '  --help               Show this help.',
  '  --resume             Resume from saved progress (default). Passed stages are skipped.',
  '  --reset-state        Forget saved progress and start from Stage A.',
  '  --stage <a|b|c|d|e|i> Run only one stage (a=preflight, b=env, c=mysql, d=schema, e=smtp, i=validation).',
  '  --check              Shortcut for --stage i (validation only).',
  '  --non-interactive    Never prompt. Fails clearly if input is needed.',
  '  --from-env           Stage B reads secrets from .env.local instead of prompting.',
  '                       Fails clearly, naming any required value that is missing.',
  '                       Pre-fill .env.local first (see the guide, section 3).',
  '  --dry-run            Stages C and D only inspect and print the plan; no DB writes, no email.',
  '',
  'Safety: never prints passwords/secrets; remote MySQL TLS is fail-closed;',
  'Stage D needs a typed YES and never runs DROP; Stage E sends one test',
  'email only after approval. Nothing here deploys, merges or touches production.',
].join('\n');

// ---------------------------------------------------------------------------
// Prompts (plain text I/O — works in CMD, PowerShell and POSIX)
// ---------------------------------------------------------------------------

export class NonInteractiveError extends Error {
  constructor(message) { super(message); this.name = 'NonInteractiveError'; }
}

let nonInteractive = false;

// Line reader over stdin.
//
// WHY NOT readline? Node's readline closes its interface the moment a
// piped stdin stream ends, dropping any lines it had already buffered —
// so the SECOND prompt in a run never resolves and the process exits
// silently (reproduced 2026-11-18: two sequential rl.question() calls
// over `printf 'YES\nYES\n' | node` answer only the first). This reader
// owns its buffer: every byte is kept until a readLine() consumes it,
// EOF resolves pending reads with '' instead of hanging, and nothing
// is ever silently dropped. It also works unchanged on a TTY (the
// terminal echoes in cooked mode) and in CMD/PowerShell.
export function createLineReader(stream) {
  let buffer = '';
  let ended = false;
  const waiters = [];
  const drain = () => {
    while (waiters.length > 0) {
      const nl = buffer.indexOf('\n');
      if (nl === -1) break;
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      waiters.shift()(line);
    }
    if (ended) {
      while (waiters.length > 0) {
        let line = buffer;
        buffer = '';
        if (line.endsWith('\r')) line = line.slice(0, -1);
        waiters.shift()(line);
      }
    }
  };
  const onData = chunk => { buffer += chunk.toString('utf8'); drain(); };
  const onEnd = () => { ended = true; drain(); };
  let listening = false;
  return {
    start() {
      if (listening) return;
      stream.on('data', onData);
      stream.on('end', onEnd);
      if (typeof stream.resume === 'function') stream.resume();
      listening = true;
    },
    stop() {
      if (!listening) return;
      stream.removeListener('data', onData);
      stream.removeListener('end', onEnd);
      if (typeof stream.pause === 'function') stream.pause();
      listening = false;
    },
    readLine() {
      this.start();
      return new Promise(resolve => { waiters.push(resolve); drain(); });
    },
  };
}

const stdinReader = createLineReader(process.stdin);

export function ask(question, { defaultValue = '', allowEmpty = false } = {}) {
  if (nonInteractive) {
    if (defaultValue !== '' || allowEmpty) return Promise.resolve(defaultValue);
    throw new NonInteractiveError(`Non-interactive mode: input needed for "${question}" and no default is available.`);
  }
  const shown = defaultValue !== '' ? `${question} [${defaultValue}]: ` : `${question}: `;
  process.stdout.write(shown);
  return stdinReader.readLine().then(answer => {
    const value = answer.trim();
    return value === '' ? defaultValue : value;
  });
}

// Hidden input (passwords) — Windows-first rewrite (Phase 3 fix).
//
// Why the old version failed on Windows (reported 2026-11-18: Stage B
// ended with "[FAIL] SMTP_PASSWORD is required and was left empty" after
// typing/pasting in VS Code CMD and standalone Command Prompt):
//   * It gave NO visual feedback at all, so the user could not tell
//     whether keystrokes were reaching the prompt.
//   * `stdin.isTTY` is unreliable under the `npm run` wrapper (npm.cmd):
//     stdin can report non-TTY even on a real console, and the piped
//     line-reader path then returned '' on an ended stdin.
//   * A `setRawMode` failure rejected the whole prompt instead of
//     falling back, and a mode failure could resolve '' silently.
//   * Bracketed-paste markers (ESC [ 200 ~ / ESC [ 201 ~) from Windows
//     Terminal / VS Code paste were kept as password characters.
//
// New behaviour — one '*' per character typed or pasted (never the
// character itself), Backspace erases one '*', Ctrl-U clears the line,
// Ctrl-C cancels. Fallback chain, in order:
//   1. TTY raw mode (all platforms).
//   2. Windows only: PowerShell `Read-Host -AsSecureString` — it natively
//      handles typing and pasting in CMD, PowerShell and VS Code terminals.
//      The SecureString is converted to plain text in memory only
//      (Marshal, zeroed afterwards) and is never printed or logged.
//      Returns null on failure so the chain continues; '' means the user
//      pressed Enter with an empty value (a legitimate empty answer).
//   3. Clearly-labelled VISIBLE prompt (the password WILL be visible) —
//      the user can still choose it over cancelling with Ctrl-C.
// A failed mode switch NEVER resolves '' silently: it falls back, or
// rejects loudly. `io` lets tests inject { stdin, stdout, platform,
// powershellRunner }.
export function runPowershellSecureString(question, runner = spawnSync) {
  const prompt = String(question ?? 'Password').replace(/'/g, "''").replace(/[\r\n]+/g, ' ').trim() || 'Password';
  const script = [
    `$s = Read-Host -AsSecureString -Prompt '${prompt}'`,
    'if ($null -eq $s) { exit 0 }',
    '$p = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)',
    'try { [Runtime.InteropServices.Marshal]::PtrToStringAuto($p) }',
    'finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p) }',
  ].join('; ');
  try {
    const result = runner('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'], timeout: 300000 });
    if (!result || result.error || result.status !== 0) return null;
    return String(result.stdout ?? '').replace(/\r?\n$/, '');
  } catch {
    return null;
  }
}

export async function promptHidden(question, io = {}) {
  const stdin = io.stdin || process.stdin;
  const stdout = io.stdout || process.stdout;
  const platform = io.platform || process.platform;
  const powershellRunner = io.powershellRunner || runPowershellSecureString;
  if (nonInteractive) {
    throw new NonInteractiveError(`Non-interactive mode: hidden input needed for "${question}". Provide the value in .env.local first, or run interactively.`);
  }
  stdout.write(question);

  // Visible fallback (last resort): labelled clearly, never silent.
  const readVisibleLine = async () => {
    stdout.write('\n[WARN] Hidden password input is not available in this terminal, so the password WILL be visible as you type. Press Ctrl-C to cancel instead.\n');
    stdout.write(question);
    if (stdin === process.stdin) return stdinReader.readLine();
    const reader = createLineReader(stdin);
    const value = await reader.readLine();
    reader.stop();
    return value;
  };
  // PowerShell fallback (Windows only). Returns null when it cannot run,
  // so the chain continues; '' is a real empty answer, not a failure.
  const tryPowershell = async () => {
    if (platform !== 'win32') return null;
    try {
      return await powershellRunner(question);
    } catch {
      return null;
    }
  };

  if (!stdin.isTTY) {
    // Piped input: read through the shared line reader when this is the
    // real stdin (buffered lines survive across prompts). A
    // caller-supplied stream (tests) gets its own short-lived reader.
    // Under `npm run` on Windows, stdin can report non-TTY while the
    // console itself is still reachable — if stdout IS a TTY, try the
    // PowerShell prompt first; piped stdout (CI) skips straight to the
    // line reader so nothing hangs waiting on a console that is not there.
    if (platform === 'win32' && stdout.isTTY) {
      const viaPowershell = await tryPowershell();
      if (viaPowershell !== null) { stdout.write('\n'); return viaPowershell; }
    }
    if (stdin === process.stdin) return stdinReader.readLine();
    const reader = createLineReader(stdin);
    const value = await reader.readLine();
    reader.stop();
    return value;
  }

  // TTY raw mode: the line reader must not be listening at the same time
  // or it would swallow keystrokes. Stop it first; it restarts on the
  // next visible prompt. Anything already buffered stays buffered.
  stdinReader.stop();
  let rawModeOn = false;
  try {
    if (typeof stdin.setRawMode !== 'function') throw new Error('setRawMode is not available on this stdin');
    stdin.setRawMode(true);
    rawModeOn = true;
  } catch {
    // Raw mode failed (the common Windows-under-npm failure): fall back
    // to PowerShell, then to a labelled visible prompt. Never reject and
    // never resolve '' for a mode failure.
    const viaPowershell = await tryPowershell();
    if (viaPowershell !== null) { stdout.write('\n'); return viaPowershell; }
    return readVisibleLine();
  }
  return new Promise((resolve, reject) => {
    let value = '';
    let settled = false;
    const cleanup = () => {
      if (rawModeOn) { try { stdin.setRawMode(false); } catch { /* not a TTY any more */ } rawModeOn = false; }
      try { stdin.pause(); } catch { /* ignore */ }
      stdin.removeListener('data', onData);
      stdin.removeListener('error', onError);
      stdin.removeListener('end', onEnd);
    };
    const onError = error => {
      if (settled) return;
      settled = true;
      cleanup();
      stdout.write('\n');
      reject(new Error('Hidden input failed: ' + (error?.message || String(error))));
    };
    const onEnd = () => {
      if (settled) return;
      settled = true;
      cleanup();
      stdout.write('\n');
      resolve(value);
    };
    const onData = chunk => {
      const result = processHiddenChunk(chunk.toString('utf8'), value);
      value = result.value;
      if (result.added > 0) stdout.write('*'.repeat(result.added));
      if (result.removed > 0) stdout.write('\b \b'.repeat(result.removed));
      if (result.cleared > 0) stdout.write('\b \b'.repeat(result.cleared));
      if (result.cancelled) {
        if (settled) return;
        settled = true;
        cleanup();
        stdout.write('\n');
        reject(new Error('Input cancelled (Ctrl-C).'));
        return;
      }
      if (result.submitted) {
        if (settled) return;
        settled = true;
        cleanup();
        stdout.write('\n');
        resolve(value);
      }
    };
    stdin.resume();
    stdin.on('data', onData);
    stdin.on('error', onError);
    stdin.on('end', onEnd);
  });
}

// Required-secret prompt with immediate re-prompt on empty input.
// Returns { value, kept } on success, or { value: null, aborted: true }
// if the user chooses to abort after 3 empty attempts. Never fails the
// whole stage for one empty field — the caller keeps whatever was
// already saved. `deps` lets tests inject { promptHidden, ask, reloadEnv }.
export async function promptSecretValue(spec, current, deps = {}) {
  const hidden = deps.promptHidden || promptHidden;
  const askFn = deps.ask || ask;
  const reloadEnv = deps.reloadEnv || (() => loadEnvFile().values);
  const isSet = current !== undefined && current !== '';
  let emptyAttempts = 0;
  for (;;) {
    const typed = await hidden(`  Type ${spec.label} (Enter keeps the current value): `);
    if (typed !== '') return { value: typed, kept: false };
    if (isSet) return { value: current, kept: true };
    emptyAttempts++;
    warn(`${spec.key} is required and was left empty. Type it again — the password stays hidden, but one * shows for every character you type or paste.`);
    if (emptyAttempts < 3) continue;
    out('  No password entered 3 times. You can:');
    out('    (r)etry typing it now,');
    out('    (l)oad it from .env.local instead (add the line first, then choose this), or');
    out('    (a)bort Stage B — values already entered stay saved, and re-running resumes here.');
    const choice = (await askFn('Choose (r)etry / (l)oad from .env.local / (a)bort Stage B', { defaultValue: 'r', allowEmpty: true })).trim().toLowerCase();
    if (choice.startsWith('l')) {
      const fresh = reloadEnv() || {};
      if (fresh[spec.key]) {
        ok(`${spec.key} loaded from .env.local (value not shown).`);
        return { value: fresh[spec.key], kept: true };
      }
      warn(`${spec.key} is still not set in .env.local. Add it there first, or type it when prompted.`);
      emptyAttempts = 0;
      continue;
    }
    if (choice.startsWith('a')) return { value: null, aborted: true };
    emptyAttempts = 0;
  }
}

// Atomic .env.local write (temp file in the same directory + rename,
// mode 0600). On failure the previous content is restored from memory
// and the error is rethrown — no backup copy with credentials is ever
// left on disk. Returns the new file text. Used for the incremental
// per-field saves in Stage B as well as the final write.
export function writeEnvFileAtomic(envFile, previousText, updates) {
  const newText = serializeEnvFile(previousText, updates);
  const tmpPath = envFile + `.tmp-${process.pid}`;
  try {
    fs.writeFileSync(tmpPath, newText, { mode: 0o600 });
    fs.renameSync(tmpPath, envFile);
    try { fs.chmodSync(envFile, 0o600); } catch { /* best effort on Windows */ }
  } catch (error) {
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    try {
      if (previousText) fs.writeFileSync(envFile, previousText, { mode: 0o600 });
      else if (fs.existsSync(envFile)) fs.unlinkSync(envFile);
      warn('Write failed; previous .env.local content was restored from memory.');
    } catch { /* restore best effort */ }
    throw error;
  }
  return newText;
}

export async function confirm(question, defaultYes = false) {
  const hint = defaultYes ? '(Y/n)' : '(y/N)';
  const answer = (await ask(`${question} ${hint}`, { allowEmpty: true })).trim().toLowerCase();
  if (answer === '') return defaultYes;
  return answer === 'y' || answer === 'yes';
}

export async function confirmTyped(question, word = 'YES') {
  const answer = await ask(`${question} (type ${word} to confirm, anything else cancels)`, { allowEmpty: true });
  return answer === word;
}

// ---------------------------------------------------------------------------
// Small system helpers
// ---------------------------------------------------------------------------

function execQuiet(command, args, options = {}) {
  try {
    // stdio: silence the child's stderr (e.g. git's "not a git repository"
    // fatal) — callers treat a null return as "unavailable".
    return execFileSync(command, args, { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'], ...options }).trim();
  } catch {
    return null;
  }
}

function probeTcp(host, port, timeoutMs = 5000) {
  return new Promise(resolve => {
    const socket = net.connect({ host, port, timeout: timeoutMs });
    let done = false;
    const finish = value => { if (!done) { done = true; socket.destroy(); resolve(value); } };
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

function findPidListeningOnPort(port) {
  if (process.platform === 'win32') {
    const output = execQuiet('netstat', ['-ano']);
    if (!output) return null;
    for (const line of output.split(/\r?\n/)) {
      const m = line.match(/TCP\s+[\d.:[\]]+:(\d+)\s+\S+\s+LISTENING\s+(\d+)/i);
      if (m && Number(m[1]) === port) return Number(m[2]);
    }
    return null;
  }
  const output = execQuiet('lsof', ['-nP', '-i', `:${port}`, '-sTCP:LISTEN', '-t']);
  if (!output) return null;
  const pid = Number(output.split(/\s+/)[0]);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function killPid(pid) {
  if (process.platform === 'win32') {
    const result = spawnSync('taskkill', ['/F', '/PID', String(pid)], { encoding: 'utf8' });
    return result.status === 0;
  }
  try { process.kill(pid, 'SIGTERM'); return true; } catch { return false; }
}

function getPublicIp(timeoutMs = 5000) {
  return new Promise(resolve => {
    const req = https.get('https://api.ipify.org?format=text', { timeout: timeoutMs }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data.trim() || null));
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

// Read the npm version, trying the most reliable source first.
// Why not just `npm.cmd --version`? On Windows, running a .cmd file
// through execFileSync WITHOUT a shell is unreliable (ENOENT/EINVAL
// depending on Node/libuv), so the old probe returned null even though
// npm demonstrably worked — the wizard itself was launched by npm.
// Order: (1) process.env.npm_execpath — set whenever npm runs a script,
// so `node <execpath> --version` is the most reliable probe of all;
// (2) on win32, `npm.cmd --version` WITH shell: true; (3) plain `npm
// --version` (shell on win32, direct exec elsewhere). Returns the
// version string, or null when every source fails. `deps` lets tests
// inject { execQuiet, env, platform }.
export function readNpmVersion(deps = {}) {
  const exec = deps.execQuiet || execQuiet;
  const env = deps.env || process.env;
  const platform = deps.platform || process.platform;
  const execpath = env.npm_execpath;
  if (execpath) {
    const viaExecpath = exec(process.execPath, [execpath, '--version']);
    if (viaExecpath) return viaExecpath;
  }
  if (platform === 'win32') {
    const viaCmd = exec('npm.cmd', ['--version'], { shell: true });
    if (viaCmd) return viaCmd;
  }
  const viaNpm = exec('npm', ['--version'], platform === 'win32' ? { shell: true } : {});
  if (viaNpm) return viaNpm;
  return null;
}

function runCommand(label, command, args, env) {
  info(`Running: ${label} ...`);
  const started = Date.now();
  const result = spawnSync(command, args, { stdio: 'inherit', encoding: 'utf8', env });
  const durationMs = Date.now() - started;
  if (result.error) {
    failLine(`${label} could not start: ${redact(result.error.message)}`);
    return { label, code: 1, durationMs, started: false };
  }
  if (result.status === 0) ok(`${label} passed (exit 0, ${Math.round(durationMs / 1000)}s).`);
  else failLine(`${label} failed (exit ${result.status}, ${Math.round(durationMs / 1000)}s).`);
  return { label, code: result.status ?? 1, durationMs, started: true };
}

// ---------------------------------------------------------------------------
// .env.local + state handling
// ---------------------------------------------------------------------------

function loadEnvFile() {
  if (!fs.existsSync(ENV_FILE)) return { text: '', values: {}, exists: false };
  const text = fs.readFileSync(ENV_FILE, 'utf8');
  const { values } = parseEnvFile(text);
  return { text, values, exists: true };
}

// Effective env for child processes: .env.local values, overridden by real
// environment variables that are already set (real env wins).
function childEnv() {
  const { values } = loadEnvFile();
  const env = { ...process.env };
  for (const [key, value] of Object.entries(values)) {
    if (env[key] === undefined || env[key] === '') env[key] = value;
  }
  return env;
}

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return createState();
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || !parsed.stages) return createState();
    const state = createState();
    state.startedAt = parsed.startedAt || state.startedAt;
    state.updatedAt = parsed.updatedAt || state.updatedAt;
    for (const id of STAGE_ORDER) {
      if (parsed.stages[id] && typeof parsed.stages[id] === 'object') state.stages[id] = parsed.stages[id];
    }
    if (parsed.config && typeof parsed.config === 'object') state.config = parsed.config;
    // Step 5 (S5-35): state files written by older wizard runs may still
    // hold the full test-recipient email under `testRecipient`. Drop it on
    // load — only the masked form is kept from now on.
    if (state.config && 'testRecipient' in state.config) delete state.config.testRecipient;
    if (parsed.results && typeof parsed.results === 'object') state.results = parsed.results;
    return state;
  } catch {
    warn('Saved wizard state could not be read; starting fresh (previous state file left untouched).');
    return createState();
  }
}

function saveState(state) {
  assertStateHasNoSecrets(state, '$', runSecrets);
  fs.mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
  const tmp = STATE_FILE + `.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, STATE_FILE);
  try { fs.chmodSync(STATE_FILE, 0o600); } catch { /* best effort on Windows */ }
}

// ---------------------------------------------------------------------------
// Stage A — Preflight
// ---------------------------------------------------------------------------

async function stageA(ctx) {
  const { dryRun } = ctx;
  out(STAGES.a.title);
  const problems = [];
  const notes = [];

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < 20) {
    failLine(`Node.js ${process.versions.node} is too old. The wizard needs Node 20 or newer.`);
    problems.push('node-version');
  } else if (nodeMajor !== 24) {
    warn(`Node.js ${process.versions.node} detected. Node 24 is the version used for local acceptance; other 20+ versions should work but are untested here.`);
    notes.push(`node ${process.versions.node} (not 24)`);
  } else {
    ok(`Node.js ${process.versions.node}.`);
  }

  const npmVersion = readNpmVersion();
  if (npmVersion) ok(`npm ${npmVersion}.`);
  else if (process.env.npm_execpath || process.env.npm_lifecycle_event) info('npm is available (this wizard was started by npm); the version string could not be read, continuing.');
  else warn('Could not read the npm version; npm commands may fail.');

  // Correct project directory.
  let pkg = null;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  } catch {
    failLine('No package.json in the current directory. Run the wizard from the repo root (D:\\Work\\online-tools-platform).');
    problems.push('project-dir');
  }
  if (pkg) {
    if (pkg.name === EXPECTED_PACKAGE_NAME) ok(`Project directory OK: package "${pkg.name}".`);
    else {
      failLine(`package.json name is "${pkg.name}", expected "${EXPECTED_PACKAGE_NAME}". You may be in the wrong directory.`);
      problems.push('project-name');
    }
    if (!pkg.scripts || !pkg.scripts['membership:setup']) {
      warn('package.json has no "membership:setup" script yet. Apply the staged package.json.patch (adds "membership:setup": "node scripts/membership/setup.mjs"), then re-run.');
      notes.push('membership:setup script missing — apply package.json.patch');
    }
  }
  for (const dir of ['server/membership', 'scripts/membership']) {
    if (fs.existsSync(path.join(REPO_ROOT, dir))) ok(`Found ${dir}/.`);
    else { failLine(`Missing ${dir}/ — wrong directory or an incomplete checkout.`); problems.push(`missing-${dir}`); }
  }

  // Git branch + dirty check.
  const branch = execQuiet('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch) {
    if (branch === EXPECTED_BRANCH) ok(`Git branch: ${branch}.`);
    else {
      warn(`Git branch is "${branch}", expected "${EXPECTED_BRANCH}". The wizard continues, but the membership work lives on ${EXPECTED_BRANCH}.`);
      notes.push(`branch ${branch}`);
    }
  } else {
    warn('Not a git checkout (or git is not on PATH). Skipping branch/dirty checks.');
    notes.push('no git');
  }
  const dirty = execQuiet('git', ['status', '--porcelain']);
  if (dirty) {
    const files = dirty.split('\n').map(l => l.slice(3).trim()).filter(Boolean);
    out('Uncommitted changes found:');
    for (const f of files.slice(0, 20)) out(`  - ${f}`);
    if (files.length > 20) out(`  ... and ${files.length - 20} more`);
    const watched = ['package.json', 'scripts/membership/', 'server/membership/', 'config/membership.env.example'];
    const clashes = files.filter(f => watched.some(w => f === w || f.startsWith(w)));
    if (clashes.length) {
      warn('Some uncommitted changes are in files this setup touches. The wizard only writes .env.local, .aenural-local/* and (with confirmation) .gitignore — it never resets git changes — but review the list above first.');
      if (!(await confirm('Continue with uncommitted changes present?', false))) {
        failLine('Aborted by user: uncommitted changes present.');
        return { status: 'fail', notes: 'aborted: dirty tree', report: {} };
      }
    } else {
      info('None of the uncommitted changes are in files this setup touches. Continuing.');
    }
  } else if (branch) {
    ok('Working tree is clean.');
  }

  // Dependencies present?
  const require = createRequire(path.join(REPO_ROOT, 'package.json'));
  const missingDeps = [];
  for (const dep of ['better-auth', 'mysql2', 'nodemailer']) {
    try { require.resolve(dep); ok(`Dependency resolvable: ${dep}.`); }
    catch { missingDeps.push(dep); }
  }
  if (!fs.existsSync(path.join(REPO_ROOT, 'node_modules'))) {
    warn('node_modules is missing. Run "npm ci" before Stage C/E/I (a running dev server must be stopped first — see below).');
    notes.push('node_modules missing');
  } else if (missingDeps.length) {
    warn(`node_modules exists but these packages do not resolve: ${missingDeps.join(', ')}. Run "npm ci" (stop the dev server first).`);
    notes.push(`unresolvable: ${missingDeps.join(', ')}`);
  }

  // .env.local presence — names only, never values.
  const envFile = loadEnvFile();
  if (!envFile.exists) {
    warn('.env.local does not exist yet. Stage B will create it.');
    notes.push('.env.local missing');
  } else {
    const required = ENV_SPEC.filter(s => !['DB_SSL_CA_FILE', 'DB_TLS_ALLOW_PUBLIC_CA', 'AENURAL_EMAIL_TRANSPORT', 'AUTH_TRUSTED_IP_HEADER'].includes(s.key));
    const setNames = required.filter(s => envFile.values[s.key] !== undefined && envFile.values[s.key] !== '').map(s => s.key);
    const unsetNames = required.filter(s => !(envFile.values[s.key] !== undefined && envFile.values[s.key] !== '')).map(s => s.key);
    ok(`.env.local exists. Set: ${setNames.join(', ') || '(none)'}.`);
    if (unsetNames.length) {
      warn(`Not yet set in .env.local: ${unsetNames.join(', ')}. Stage B will ask for these.`);
      notes.push(`unset: ${unsetNames.join(', ')}`);
    }
    // Step 5 (S5-06 reconciliation): an existing .env.local that pairs
    // remote-MySQL dev with a blank header will now fail at auth startup
    // — flag it here, before Stage B, instead of letting the operator
    // discover it from a startup throw.
    if (envFile.values.AENURAL_MEMBERSHIP_DATABASE === 'mysql' && !envFile.values.AUTH_TRUSTED_IP_HEADER) {
      warn('Remote-MySQL dev is set (AENURAL_MEMBERSHIP_DATABASE=mysql) but AUTH_TRUSTED_IP_HEADER is blank — auth now refuses to start without it. Stage B will ask for it: use x-real-ip.');
      notes.push('AUTH_TRUSTED_IP_HEADER missing for remote-MySQL dev');
    }
    for (const secretKey of ['DB_PASSWORD', 'SMTP_PASSWORD', 'BETTER_AUTH_SECRET']) {
      if (envFile.values[secretKey] !== undefined) rememberSecret(envFile.values[secretKey]);
    }
  }

  // .gitignore coverage.
  if (fs.existsSync(path.join(REPO_ROOT, '.gitignore'))) {
    const missing = missingGitignorePatterns(fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf8'));
    if (missing.length === 0) ok('.gitignore covers .env.local, *.pem and /.aenural-local/.');
    else {
      failLine(`.gitignore does NOT cover: ${missing.join(', ')}. Stage B will ask to fix this before writing secrets.`);
      problems.push('gitignore');
    }
  } else {
    failLine('No .gitignore found. Stage B will ask to fix this before writing secrets.');
    problems.push('gitignore');
  }

  // Dev server lock: a running Next dev server locks native Windows deps
  // (onnxruntime-node), so npm ci fails while it runs.
  const devListening = await probeTcp('127.0.0.1', 3000, 2000);
  if (devListening) {
    warn('Something is listening on port 3000 (probably the Next dev server). While it runs, "npm ci" will fail on Windows because native deps are locked.');
    const pid = findPidListeningOnPort(3000);
    if (pid) info(`Listener PID: ${pid}.`);
    else info('Could not identify the listening process PID automatically.');
    if (missingDeps.length || !fs.existsSync(path.join(REPO_ROOT, 'node_modules'))) {
      const stopIt = await confirm('Stop ONLY the process listening on port 3000 so npm ci can run?', false);
      if (stopIt) {
        if (pid && killPid(pid)) ok(`Stopped PID ${pid}. Re-run "npm ci" yourself, then re-run the wizard.`);
        else {
          failLine('Could not stop the listener automatically. Stop the dev server yourself (Ctrl-C in its terminal), run "npm ci", then re-run the wizard.');
          problems.push('dev-server-lock');
        }
        notes.push('dev server stopped by user request');
      } else {
        warn('Leaving the dev server running. Do NOT run "npm ci" while it runs; stop it first (Ctrl-C in its terminal).');
        notes.push('dev server left running');
      }
    } else {
      info('Dependencies are already installed, so the running dev server does not block this run. It WILL block "npm ci" if you need it later — stop the server first.');
      notes.push('dev server running (deps already installed)');
    }
  } else {
    ok('Port 3000 is free (no dev server running).');
  }

  if (dryRun) info('Dry run: preflight only inspected, nothing changed.');
  if (problems.length) {
    return { status: 'fail', notes: notes.concat(problems).join('; '), report: { env: { status: 'FAIL', detail: problems.join(', ') } } };
  }
  return { status: 'pass', notes: notes.join('; ') || 'preflight clean', report: {} };
}

// ---------------------------------------------------------------------------
// Stage B — Environment config (.env.local)
// ---------------------------------------------------------------------------

async function stageB(ctx) {
  const { state, dryRun, fromEnv } = ctx;
  out(STAGES.b.title);
  if (dryRun) {
    info('Dry run: Stage B only reports what it would ask. No file is written.');
    for (const spec of ENV_SPEC) out(`  - ${spec.key} (${spec.label})`);
    return { status: 'skip', notes: 'dry-run', report: {} };
  }
  if (fromEnv) info('--from-env: secrets are read from .env.local, no secret prompts. Missing required values fail clearly below.');
  else {
    info('Tip: you can pre-fill passwords in .env.local first and the wizard will use them without asking.');
    info('  Example line (double quotes are needed when the value has $ # , ! spaces or backslashes):');
    info('    SMTP_PASSWORD="p$a#s,s!w"');
    info('  Or run: npm run membership:setup -- --from-env   (skips all secret prompts)');
    info('  Passwords you type show one * per character (paste works too). If a prompt ever looks stuck,');
    info('  press Ctrl-C, pre-fill the value in .env.local, and re-run — Stage A stays passed.');
  }

  // .gitignore must cover secrets before any secret is written.
  const gitignorePath = path.join(REPO_ROOT, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const missing = missingGitignorePatterns(fs.readFileSync(gitignorePath, 'utf8'));
    if (missing.length) {
      failLine(`.gitignore does not cover: ${missing.join(', ')}. Writing secrets now would risk committing them.`);
      if (await confirm('Append the missing patterns to .gitignore now?', true)) {
        fs.appendFileSync(gitignorePath, '\n# Added by AENural setup wizard — keep local secrets out of git.\n' + missing.map(p => p + '\n').join(''));
        ok('.gitignore updated.');
      } else {
        failLine('Refusing to write .env.local without .gitignore coverage. Fix .gitignore and re-run.');
        return { status: 'fail', notes: 'gitignore incomplete', report: { gitignore: { status: 'FAIL', detail: `Missing: ${missing.join(', ')}` } } };
      }
    }
  }

  const envFile = loadEnvFile();
  const previousText = envFile.exists ? envFile.text : '';
  const values = { ...envFile.values };
  for (const secretKey of ['DB_PASSWORD', 'SMTP_PASSWORD', 'BETTER_AUTH_SECRET']) {
    if (values[secretKey]) rememberSecret(values[secretKey]);
  }

  // SMTP provider choice first — it prefills host/port/secure.
  out('SMTP provider:');
  out('  1) Hostinger Email — smtp.hostinger.com:465 (secure)');
  out('  2) Titan Email — smtp.titan.email:465 (secure)');
  out('  3) Custom SMTP host');
  const currentHost = values.SMTP_HOST || DEV_DEFAULTS.SMTP_HOST;
  const defaultChoice = currentHost === 'smtp.titan.email' ? '2' : currentHost === 'smtp.hostinger.com' ? '1' : '3';
  const choice = (nonInteractive || fromEnv)
    ? defaultChoice
    : (await ask('Choose SMTP provider (1/2/3)', { defaultValue: defaultChoice })).trim();
  let smtpPreset;
  try {
    if (choice === '1') smtpPreset = resolveSmtpPreset('hostinger');
    else if (choice === '2') smtpPreset = resolveSmtpPreset('titan');
    else if (choice === '3') {
      if (fromEnv) {
        smtpPreset = resolveSmtpPreset('custom', { host: values.SMTP_HOST || '', port: values.SMTP_PORT || '465', secure: values.SMTP_SECURE || 'true' });
      } else {
        const host = await ask('Custom SMTP host', { defaultValue: values.SMTP_HOST || '' });
        const port = await ask('Custom SMTP port', { defaultValue: values.SMTP_PORT || '465' });
        const secure = await ask('Custom SMTP secure (true for 465, false for 587)', { defaultValue: values.SMTP_SECURE || 'true' });
        smtpPreset = resolveSmtpPreset('custom', { host, port, secure });
      }
    } else throw new Error(`Choose 1, 2 or 3. Got "${choice}".`);
  } catch (error) {
    failLine(redact(error.message));
    return { status: 'fail', notes: 'smtp preset', report: {} };
  }
  values.SMTP_HOST = smtpPreset.host;
  values.SMTP_PORT = String(smtpPreset.port);
  values.SMTP_SECURE = String(smtpPreset.secure);

  // Prompt for every var. Secrets are typed hidden (one * per character)
  // and never echoed. Each resolved value is saved to .env.local
  // IMMEDIATELY (atomic write, same temp+rename+0600 mechanism), so a
  // later failure in this stage loses nothing already entered — the
  // original bug saved nothing until the end of Stage B, so one empty
  // SMTP_PASSWORD discarded the DB_PASSWORD typed just before it.
  const updates = {};
  let currentText = previousText;
  const saveProgress = () => {
    try {
      currentText = writeEnvFileAtomic(ENV_FILE, currentText, updates);
    } catch (error) {
      failLine(`Could not write .env.local: ${redact(error.message)}`);
      throw new Error('env-write-failed');
    }
  };
  const missingFromEnv = [];
  for (const spec of ENV_SPEC) {
    if (['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE'].includes(spec.key)) {
      updates[spec.key] = values[spec.key];
      try { saveProgress(); } catch { return { status: 'fail', notes: 'env write failed', report: {} }; }
      continue;
    }
    const current = values[spec.key];
    const isSet = current !== undefined && current !== '';
    if (spec.key === 'BETTER_AUTH_SECRET') {
      if (isSet && isValidSecret(current)) {
        info('BETTER_AUTH_SECRET is already set and valid (value not shown). Keeping it.');
        updates[spec.key] = current;
      } else {
        if (isSet) warn('BETTER_AUTH_SECRET is set but shorter than 32 characters. Generating a fresh one.');
        else info('BETTER_AUTH_SECRET is not set. Generating a fresh one.');
        const generated = generateSecret(48);
        rememberSecret(generated);
        updates[spec.key] = generated;
        ok('BETTER_AUTH_SECRET generated (value not shown).');
      }
      try { saveProgress(); } catch { return { status: 'fail', notes: 'env write failed', report: {} }; }
      continue;
    }
    if (spec.secret) {
      if (fromEnv) {
        // --from-env: never prompt for secrets. Use the .env.local value,
        // or record it as missing and fail clearly after the loop.
        if (isSet) { updates[spec.key] = current; info(`${spec.key} taken from .env.local (value not shown).`); }
        else missingFromEnv.push(spec.key);
        continue;
      }
      out(`${spec.label}: ${isSet ? 'already set (hidden, kept unless you type a new value)' : 'not set'}`);
      if (spec.note) info(`  ${spec.note}`);
      const result = await promptSecretValue(spec, current);
      if (result.aborted) {
        failLine(`Stage B aborted at ${spec.key}. Values already entered were saved to .env.local — re-run the wizard to resume here.`);
        return { status: 'fail', notes: `${spec.key} aborted by user`, report: {} };
      }
      if (!result.kept) rememberSecret(result.value);
      updates[spec.key] = result.value;
      try { saveProgress(); } catch { return { status: 'fail', notes: 'env write failed', report: {} }; }
      continue;
    }
    if (fromEnv) {
      updates[spec.key] = current !== undefined && current !== '' ? current : (DEV_DEFAULTS[spec.key] ?? '');
      continue;
    }
    // Step 5 (S5-06): remote-MySQL dev is non-local, so auth now requires
    // the header at startup. Default it to the documented x-real-ip value
    // in that mode (still UNCONFIRMED with Hostinger — confirm before
    // production); local SQLite dev keeps a blank default.
    const def = current !== undefined && current !== '' ? current : (spec.key === 'AUTH_TRUSTED_IP_HEADER' && updates.AENURAL_MEMBERSHIP_DATABASE === 'mysql' ? 'x-real-ip' : (DEV_DEFAULTS[spec.key] ?? ''));
    const label = `${spec.label}${spec.note ? ` — ${spec.note}` : ''}`;
    const answer = await ask(label, { defaultValue: def, allowEmpty: true });
    updates[spec.key] = answer;
    try { saveProgress(); } catch { return { status: 'fail', notes: 'env write failed', report: {} }; }
  }
  if (missingFromEnv.length) {
    failLine(`--from-env: the following required values are missing from .env.local: ${missingFromEnv.join(', ')}.`);
    failLine('Add them to .env.local first (see the guide, section 3 — quote values with $ # , ! spaces or backslashes in double quotes), or run the wizard without --from-env to be prompted.');
    return { status: 'fail', notes: `--from-env missing: ${missingFromEnv.join(', ')}`, report: {} };
  }

  // Validate before writing.
  const problems = [];
  if (!isValidEmail(updates.MAIL_FROM)) problems.push('MAIL_FROM must be a valid email address.');
  if (!isValidEmail(updates.SMTP_USER) && !updates.SMTP_USER.includes('@')) problems.push('SMTP_USER should be the mailbox address (e.g. support@aenural.com).');
  const smtpPairProblem = validateSmtpPair(updates.SMTP_PORT, updates.SMTP_SECURE);
  if (smtpPairProblem) problems.push(smtpPairProblem);
  if (!/^\d+$/.test(String(updates.DB_PORT || ''))) problems.push('DB_PORT must be a number (3306).');
  for (const urlKey of ['BETTER_AUTH_URL', 'SITE_URL']) {
    try { const u = new URL(updates[urlKey]); if (!['http:', 'https:'].includes(u.protocol)) problems.push(`${urlKey} must be http(s).`); }
    catch { problems.push(`${urlKey} is not a valid URL.`); }
  }
  if (updates.DB_HOST && updates.DB_HOST.trim().toLowerCase() === 'localhost') {
    problems.push('DB_HOST must not be localhost (Node resolves it to IPv6 ::1 and Hostinger MySQL rejects it). Use 127.0.0.1 for loopback or srv2224.hstgr.io for remote dev.');
  }
  if (updates.DB_SSL_CA_FILE && !fs.existsSync(updates.DB_SSL_CA_FILE)) {
    problems.push(`DB_SSL_CA_FILE points to a file that does not exist: ${updates.DB_SSL_CA_FILE}. Fix the path or leave it blank.`);
  }
  if (updates.DB_TLS_ALLOW_PUBLIC_CA && !['0', '1', ''].includes(String(updates.DB_TLS_ALLOW_PUBLIC_CA).trim())) {
    problems.push('DB_TLS_ALLOW_PUBLIC_CA must be 1, 0 or blank.');
  }
  if (updates.DB_TLS_ALLOW_PUBLIC_CA === '1' && updates.DB_SSL_CA_FILE) {
    warn('Both DB_SSL_CA_FILE and DB_TLS_ALLOW_PUBLIC_CA=1 are set. The CA file wins; the opt-in is ignored. That is safe, but remove one to avoid confusion.');
  }
  // Step 5 (S5-06 reconciliation): the header is REQUIRED at startup for
  // any non-local run, including remote-MySQL dev — blank is only OK for
  // local SQLite dev. x-real-ip is the only value the startup check
  // accepts until Hostinger confirms otherwise (S5-02/S5-03), so any
  // other value fails Stage B fast instead of failing at auth startup.
  if (updates.AUTH_TRUSTED_IP_HEADER) {
    if (updates.AUTH_TRUSTED_IP_HEADER.trim().toLowerCase() !== 'x-real-ip') {
      problems.push('AUTH_TRUSTED_IP_HEADER must be x-real-ip (the only value the startup check accepts until Hostinger confirms otherwise). Other headers are not safe here — see docs/authentication/trusted-proxy-ip.md.');
    } else {
      warn('AUTH_TRUSTED_IP_HEADER=x-real-ip is the documented value, but it is still UNCONFIRMED with Hostinger. It is required for remote-MySQL dev; confirm it with Hostinger support before any production use.');
    }
  } else if (updates.AENURAL_MEMBERSHIP_DATABASE === 'mysql') {
    problems.push('AUTH_TRUSTED_IP_HEADER is required for remote-MySQL dev (auth refuses to start without it). Set it to x-real-ip — the value is still UNCONFIRMED with Hostinger, so confirm it before production.');
  }
  if (problems.length) {
    for (const p of problems) failLine(p);
    return { status: 'fail', notes: problems.join('; '), report: {} };
  }

  // Test recipient for Stage E. Step 5 (S5-35): only the MASKED form is
  // ever stored in state (testRecipientMasked); the full address lives
  // only in memory for this run, so it is NOT prefilled from a previous
  // run — the operator re-types it each time.
  let testRecipient = '';
  const recipientAnswer = await ask('Test recipient email for the Stage E test email (a mailbox you control)', { defaultValue: testRecipient, allowEmpty: true });
  if (recipientAnswer && !isValidEmail(recipientAnswer)) {
    failLine('That is not a valid email address.');
    return { status: 'fail', notes: 'invalid test recipient', report: {} };
  }
  testRecipient = recipientAnswer;
  if (testRecipient) info(`Test email will go to ${maskEmail(testRecipient)} (masked here; the full address is held only in memory for this run, never stored).`);

  // Final write (idempotent — every field was already saved incrementally
  // above, so this only guarantees the file matches the resolved set
  // exactly). The previous content is kept ONLY in memory and restored
  // if the write fails — no backup copy with credentials is ever left
  // on disk. If validation above failed, the stage already returned and
  // the values entered so far stay saved for the next run.
  try {
    currentText = writeEnvFileAtomic(ENV_FILE, currentText, updates);
  } catch (error) {
    failLine(`Could not write .env.local: ${redact(error.message)}`);
    return { status: 'fail', notes: 'env write failed', report: {} };
  }
  for (const v of Object.values(updates)) if (typeof v === 'string' && v.length >= 4) rememberSecret(v);
  ok('.env.local written atomically (previous settings preserved; each value was also saved as soon as it was entered).');
  state.config.dbHost = updates.DB_HOST;
  state.config.dbName = updates.DB_NAME;
  state.config.dbUser = updates.DB_USER;
  state.config.smtpHost = updates.SMTP_HOST;
  state.config.smtpPort = Number(updates.SMTP_PORT);
  state.config.mailFrom = updates.MAIL_FROM;
  state.config.testRecipientMasked = testRecipient ? maskEmail(testRecipient) : '';
  return {
    status: 'pass',
    notes: `.env.local written; DB ${updates.DB_HOST}/${updates.DB_NAME} as ${updates.DB_USER}; SMTP ${updates.SMTP_HOST}:${updates.SMTP_PORT}`,
    report: {
      env: { status: 'PASS', detail: 'All required vars present in .env.local (names only recorded).' },
      gitignore: { status: 'PASS', detail: '.gitignore covers .env.local, *.pem, /.aenural-local/.' },
    },
  };
}

// ---------------------------------------------------------------------------
// Shared MySQL helpers (Stages C + D)
// ---------------------------------------------------------------------------

async function loadMysqlModules() {
  const tls = await import('../../server/membership/mysql-tls.mjs');
  const mysql = await import('mysql2/promise');
  return { tls, mysql };
}

function effectiveEnv() {
  const { values } = loadEnvFile();
  const env = { ...values, ...process.env };
  // process.env wins only where it is actually set; .env.local fills gaps.
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined || process.env[key] === '') env[key] = value;
  }
  for (const secretKey of ['DB_PASSWORD', 'SMTP_PASSWORD', 'BETTER_AUTH_SECRET']) {
    if (env[secretKey]) rememberSecret(env[secretKey]);
  }
  return env;
}

function printMysqlFailureHints(error) {
  const message = redact(error?.message || String(error));
  const code = error?.code || '';
  if (/ER_ACCESS_DENIED_ERROR|ER_HOST_NOT_PRIVILEGED|1130|1045/i.test(code + ' ' + message)) {
    out('');
    out('Access denied / host not allowed. This is usually the Remote MySQL allowlist, not the password:');
    out('  1) In hPanel go to Databases > Remote MySQL.');
    out('  2) Add your CURRENT public IP (NOT "Any Host" / % — that opens the database to the internet).');
    out('  3) If your IP changed since you added it, remove the old entry and add the new one.');
    out('  4) Double-check DB_USER is the FULL username exactly as hPanel shows it (it may carry a prefix).');
  }
  if (/self-signed|UNABLE_TO_VERIFY|CERT|certificate/i.test(message)) {
    out('');
    out('TLS certificate problem. Do NOT fix this with rejectUnauthorized: false.');
    out('  1) Ask Hostinger support for the CA certificate bundle for this MySQL host.');
    out('  2) Save it as a .pem file and set DB_SSL_CA_FILE to its path (Stage B).');
    out('  3) Or, if the Stage C probe proves the cert chains to a public CA, set DB_TLS_ALLOW_PUBLIC_CA=1.');
    out('  See docs/authentication/hostinger-setup.md section 6, outcomes A/B/C.');
  }
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EHOSTUNREACH/i.test(code + ' ' + message)) {
    out('');
    out('The host/port could not be reached at all. Check: DB_HOST/DB_PORT spelling,');
    out('your internet connection, and hPanel > Databases > Remote MySQL (allowlist).');
  }
}

async function openMysqlConnection(env, tls) {
  const profile = tls.resolveMysqlTls(env);
  const options = {
    host: String(env.DB_HOST || '127.0.0.1').trim(),
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: 'utf8mb4',
    timezone: 'Z',
    connectTimeout: 10000,
    multipleStatements: false,
  };
  if (profile.ssl) options.ssl = profile.ssl;
  const { mysql } = await loadMysqlModules();
  const connection = await mysql.createConnection(options);
  return { connection, profile };
}

// ---------------------------------------------------------------------------
// Stage C — MySQL verify
// ---------------------------------------------------------------------------

async function stageC(ctx) {
  const { state, dryRun } = ctx;
  out(STAGES.c.title);
  const env = effectiveEnv();
  if (!env.DB_NAME || !env.DB_USER || !env.DB_PASSWORD) {
    failLine('DB_NAME, DB_USER and DB_PASSWORD must be set in .env.local first (Stage B).');
    return { status: 'fail', notes: 'db credentials missing', report: {} };
  }

  let tls;
  try {
    ({ tls } = await loadMysqlModules());
  } catch (error) {
    failLine(`Could not load the repo MySQL modules (mysql2 or server/membership/mysql-tls.mjs): ${redact(error.message)}. Run "npm ci" first (stop the dev server first).`);
    return { status: 'fail', notes: 'mysql modules unavailable', report: {} };
  }

  let profile;
  try {
    profile = tls.resolveMysqlTls(env);
    ok(`TLS profile: ${profile.profile} for host ${profile.host} (fail-closed; verification always on).`);
  } catch (error) {
    failLine(redact(error.message));
    printMysqlFailureHints(error);
    return { status: 'fail', notes: 'tls profile unresolved', report: { 'mysql-tls': { status: 'FAIL', detail: 'TLS profile could not be resolved (see message).' } } };
  }

  // DNS + TCP reachability first, so a typo fails fast with a clear message.
  try {
    const lookup = await dns.promises.lookup(profile.host);
    ok(`DNS: ${profile.host} resolves to ${lookup.address}.`);
  } catch (error) {
    failLine(`DNS lookup failed for ${profile.host}: ${redact(error.message)}`);
    return { status: 'fail', notes: 'dns failed', report: {} };
  }
  const tcpOk = await probeTcp(profile.host, Number(env.DB_PORT || 3306), 8000);
  if (!tcpOk) {
    failLine(`TCP port ${env.DB_PORT || 3306} on ${profile.host} is not reachable. Check the host/port and the Remote MySQL allowlist (see hints below).`);
    const ip = await getPublicIp();
    if (ip) out(`Your current public IP is ${ip} — add exactly this in hPanel > Databases > Remote MySQL (not Any Host).`);
    return { status: 'fail', notes: 'tcp unreachable', report: { 'mysql-connectivity': { status: 'FAIL', detail: `TCP ${profile.host}:${env.DB_PORT || 3306} unreachable.` } } };
  }
  ok(`TCP ${profile.host}:${env.DB_PORT || 3306} reachable.`);

  if (dryRun) {
    info('Dry run: DNS + TCP checked, TLS profile resolved. No MySQL connection was made and nothing was changed.');
    return { status: 'skip', notes: 'dry-run (no DB connection)', report: {} };
  }

  let connection;
  try {
    ({ connection } = await openMysqlConnection(env, tls));
    const [[versionRow]] = await connection.query('SELECT VERSION() AS version');
    const [[sslVersionRow]] = await connection.query("SHOW SESSION STATUS LIKE 'Ssl_version'");
    const [[sslCipherRow]] = await connection.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'");
    const sslVersion = String(sslVersionRow?.Value ?? sslVersionRow?.value ?? '');
    const sslCipher = String(sslCipherRow?.Value ?? sslCipherRow?.value ?? '');
    ok(`MySQL connected: server version ${versionRow?.version ?? 'unknown'}, database ${env.DB_NAME}, user ${env.DB_USER}.`);
    if (profile.ssl) {
      tls.assertEncryptedSession(sslVersion, profile.host);
      if (!/^TLSv1\.[23]/.test(sslVersion)) {
        failLine(`Remote session uses ${sslVersion || '(unencrypted)'}, not TLS 1.2/1.3. Refusing to continue.`);
        return { status: 'fail', notes: 'tls version too old', report: {} };
      }
      ok(`Session encrypted: ${sslVersion}${sslCipher ? ` (${sslCipher})` : ''}.`);
    } else {
      info(`Loopback profile: session encryption ${sslVersion ? `on (${sslVersion})` : 'off (expected for loopback)'}.`);
    }

    // Read-only permission check via SHOW GRANTS.
    const [grantRows] = await connection.query('SHOW GRANTS');
    const grants = grantRows.map(row => String(Object.values(row)[0] || ''));
    const parsed = parseGrants(grants, env.DB_NAME);
    const missing = missingPermissions(parsed, REQUIRED_MYSQL_PERMS);
    if (missing.length) {
      failLine(`MySQL user is missing permissions on ${env.DB_NAME}: ${missing.join(', ')}. Grant them in hPanel/phpMyAdmin before Stage D.`);
      return { status: 'fail', notes: `missing perms: ${missing.join(', ')}`, report: { 'mysql-permissions': { status: 'FAIL', detail: `Missing: ${missing.join(', ')}` } } };
    }
    ok(`Permissions OK on ${env.DB_NAME}: ${parsed.all ? 'ALL PRIVILEGES' : REQUIRED_MYSQL_PERMS.join(', ')}.`);

    // Read-only table listing (also feeds Stage D).
    const [tableRows] = await connection.query('SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()');
    const found = tableRows.map(r => r.name);
    const missingTbl = missingTables(found, tls.REQUIRED_MYSQL_TABLES);
    if (missingTbl.length) info(`Tables present: ${found.length}. Missing (${missingTbl.length}): ${missingTbl.join(', ')} — Stage D will propose the import.`);
    else ok(`All ${tls.REQUIRED_MYSQL_TABLES.length} required tables are present.`);

    state.results.mysql = {
      host: profile.host, profile: profile.profile, dbName: env.DB_NAME, dbUser: env.DB_USER,
      encrypted: Boolean(sslVersion), tlsVersion: sslVersion, cipher: sslCipher,
      serverVersion: String(versionRow?.version ?? ''), permissions: parsed.all ? 'ALL' : REQUIRED_MYSQL_PERMS.join(','),
      tablesFound: found.length, tablesMissing: missingTbl,
    };
    return {
      status: 'pass',
      notes: `mysql ${profile.host} ${sslVersion || 'plain-loopback'}; ${found.length} tables, ${missingTbl.length} missing`,
      report: {
        'mysql-connectivity': { status: 'PASS', detail: `Connected to ${profile.host} as ${env.DB_USER}, DB ${env.DB_NAME}.` },
        'mysql-tls': { status: profile.ssl ? 'PASS' : 'SKIP', detail: profile.ssl ? `Encrypted session ${sslVersion}${sslCipher ? ` (${sslCipher})` : ''}.` : 'Loopback profile — no TLS expected.' },
        'mysql-permissions': { status: 'PASS', detail: parsed.all ? 'ALL PRIVILEGES.' : `${REQUIRED_MYSQL_PERMS.join(', ')}.` },
      },
    };
  } catch (error) {
    failLine(`MySQL connection failed: ${redact(error?.message || String(error))}${error?.code ? ` [${error.code}]` : ''}`);
    printMysqlFailureHints(error);
    return { status: 'fail', notes: redact(error?.message || 'mysql failed'), report: { 'mysql-connectivity': { status: 'FAIL', detail: redact(error?.message || 'connection failed') } } };
  } finally {
    if (connection) { try { await connection.end(); } catch { /* already closing */ } }
  }
}

// ---------------------------------------------------------------------------
// Stage D — Schema
// ---------------------------------------------------------------------------

async function stageD(ctx) {
  const { state, dryRun } = ctx;
  out(STAGES.d.title);
  const env = effectiveEnv();
  if (!env.DB_NAME || !env.DB_USER || !env.DB_PASSWORD) {
    failLine('DB_NAME, DB_USER and DB_PASSWORD must be set in .env.local first (Stage B).');
    return { status: 'fail', notes: 'db credentials missing', report: {} };
  }

  // Never touch a production-looking target.
  const target = validateDbTarget({ host: env.DB_HOST, dbName: env.DB_NAME });
  for (const e of target.errors) failLine(e);
  if (target.errors.length) {
    return { status: 'fail', notes: target.errors.join('; '), report: { schema: { status: 'FAIL', detail: target.errors.join('; ') } } };
  }
  for (const w of target.warnings) warn(w);
  if (target.warnings.length) {
    const named = `I understand this is a development database (${env.DB_HOST} / ${env.DB_NAME})`;
    if (!(await confirmTyped(`Type YES to confirm you want schema changes on ${env.DB_HOST} / ${env.DB_NAME} (a development database, never production)`, 'YES'))) {
      failLine('Schema stage aborted: target database not confirmed as a development database.');
      return { status: 'fail', notes: 'db target not confirmed', report: {} };
    }
    info(named + ' — confirmed.');
  }

  if (!fs.existsSync(SQL_FILE)) {
    failLine(`Migration file not found: server/membership/migrations/001-initial-mysql.sql. Run "npm run membership:prepare-mysql" to regenerate it offline, then re-run.`);
    return { status: 'fail', notes: 'migration file missing', report: {} };
  }
  const sqlText = fs.readFileSync(SQL_FILE, 'utf8');
  const expectedTables = parseSqlTables(sqlText);
  const expectedNames = Object.keys(expectedTables);
  if (expectedNames.length !== 14) {
    warn(`The migration file defines ${expectedNames.length} tables, expected 14. Continuing with what it defines — review the file before approving.`);
  }
  info('Migration file note: all 14 tables use CREATE TABLE IF NOT EXISTS');
  info('(5 Better Auth + 9 application tables, Phase 4), and the wizard only');
  info('runs CREATE statements for tables that are MISSING, so re-running is');
  info('safe — it never replays a table that exists.');

  let tls;
  try {
    ({ tls } = await loadMysqlModules());
  } catch (error) {
    failLine(`Could not load the repo MySQL modules: ${redact(error.message)}. Run "npm ci" first.`);
    return { status: 'fail', notes: 'mysql modules unavailable', report: {} };
  }

  let connection;
  try {
    ({ connection } = await openMysqlConnection(env, tls));
    const [tableRows] = await connection.query('SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()');
    const found = tableRows.map(r => r.name);
    const [colRows] = await connection.query("SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = DATABASE()");
    const foundColumns = {};
    for (const row of colRows) {
      const t = row.t;
      if (!foundColumns[t]) foundColumns[t] = [];
      foundColumns[t].push(row.c);
    }
    const diff = diffSchema(found, foundColumns, expectedTables);
    out('');
    out(`Present: ${expectedNames.length - diff.missingTables.length}/${expectedNames.length} required tables.`);
    for (const table of expectedNames) {
      out(`  ${found.some(f => f.toLowerCase() === table.toLowerCase()) ? '[OK]     ' : '[MISSING]'} ${table}`);
    }
    if (diff.extraTables.length) info(`Other tables in this database (not required, left alone): ${diff.extraTables.join(', ')}`);
    if (diff.incompatible.length) {
      failLine('Incompatible schema found (existing tables are missing columns):');
      for (const line of diff.incompatible) out(`  - ${line}`);
      out('The wizard will NOT alter existing tables automatically. Review the difference manually');
      out('(compare against server/membership/migrations/001-initial-mysql.sql) and fix it by hand,');
      out('or regenerate the migration with "npm run membership:prepare-mysql" if auth options changed.');
      return { status: 'fail', notes: `incompatible: ${diff.incompatible.join('; ')}`, report: { schema: { status: 'FAIL', detail: diff.incompatible.join('; ') } } };
    }

    if (diff.missingTables.length === 0) {
      ok('Schema OK: all required tables exist. Nothing to change.');
      state.results.schema = { missing: [], applied: [] };
      return { status: 'pass', notes: 'schema complete', report: { schema: { status: 'PASS', detail: `All ${expectedNames.length} required tables present.` } } };
    }

    // Build the exact statements that would be run: CREATE for missing
    // tables only, taken verbatim from the reviewed migration file.
    const statements = splitSqlStatements(sqlText);
    const toRun = [];
    for (const table of diff.missingTables) {
      const stmt = statements.find(s => {
        const m = s.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?[`"]?([A-Za-z0-9_]+)[`"]?/i);
        return m && m[1].toLowerCase() === table.toLowerCase();
      });
      if (!stmt) {
        failLine(`Migration file has no CREATE statement for missing table "${table}". Aborting — do not hand-edit the migration.`);
        return { status: 'fail', notes: `no statement for ${table}`, report: {} };
      }
      toRun.push({ table, sql: stmt });
    }
    out('');
    out(`Proposed change: create ${toRun.length} missing table(s): ${diff.missingTables.join(', ')}.`);
    out('No DROP, no ALTER, no data is deleted. MySQL DDL statements commit implicitly,');
    out('so there is no transactional rollback for this step — the change is small and');
    out('reviewed, but it cannot be undone by the wizard. To undo, drop the created tables by hand.');
    for (const { table, sql } of toRun) out(`  - CREATE TABLE ${table}  (${sql.split('\n')[0].slice(0, 120)})`);

    if (dryRun) {
      info('Dry run: plan shown above. No statement was executed.');
      return { status: 'skip', notes: `dry-run: would create ${diff.missingTables.join(', ')}`, report: { schema: { status: 'PENDING', detail: `Dry run: ${diff.missingTables.length} table(s) missing: ${diff.missingTables.join(', ')}` } } };
    }

    if (!(await confirmTyped(`Type YES to create these ${toRun.length} table(s) in ${env.DB_NAME} on ${env.DB_HOST}`, 'YES'))) {
      info('Schema change declined. Re-run the wizard when ready; nothing was changed.');
      return { status: 'fail', notes: 'schema change not approved', report: { schema: { status: 'PENDING', detail: `Missing tables (not yet approved): ${diff.missingTables.join(', ')}` } } };
    }
    const applied = [];
    for (const { table, sql } of toRun) {
      await connection.query(sql);
      applied.push(table);
      ok(`Created table ${table}.`);
    }
    // Verify after applying.
    const [afterRows] = await connection.query('SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()');
    const afterFound = afterRows.map(r => r.name);
    const stillMissing = missingTables(afterFound, tls.REQUIRED_MYSQL_TABLES);
    if (stillMissing.length) {
      failLine(`After applying, still missing: ${stillMissing.join(', ')}. Inspect manually before continuing.`);
      return { status: 'fail', notes: `still missing: ${stillMissing.join(', ')}`, report: { schema: { status: 'FAIL', detail: `Still missing: ${stillMissing.join(', ')}` } } };
    }
    ok(`Schema verified after applying: all ${tls.REQUIRED_MYSQL_TABLES.length} required tables present.`);
    state.results.schema = { missing: diff.missingTables, applied };
    return {
      status: 'pass',
      notes: `created ${applied.join(', ')}; schema verified`,
      report: { schema: { status: 'PASS', detail: `Created ${applied.length} table(s): ${applied.join(', ')}. Verified after applying.` } },
    };
  } catch (error) {
    failLine(`Schema check failed: ${redact(error?.message || String(error))}${error?.code ? ` [${error.code}]` : ''}`);
    printMysqlFailureHints(error);
    return { status: 'fail', notes: redact(error?.message || 'schema failed'), report: {} };
  } finally {
    if (connection) { try { await connection.end(); } catch { /* already closing */ } }
  }
}

// ---------------------------------------------------------------------------
// Stage E — SMTP verify + one test email
// ---------------------------------------------------------------------------

async function stageE(ctx) {
  const { state, dryRun } = ctx;
  out(STAGES.e.title);
  const env = effectiveEnv();
  const transport = (env.AENURAL_EMAIL_TRANSPORT || '').trim();
  if (transport === 'local-outbox') {
    warn('AENURAL_EMAIL_TRANSPORT=local-outbox is set: account mail goes to the private local outbox, not real SMTP.');
    warn('Stage E does not send real mail in this mode. Remove the flag (Stage B leaves it blank) to test real SMTP.');
    return { status: 'skip', notes: 'local-outbox transport', report: { 'smtp-test-sent': { status: 'SKIP', detail: 'Local outbox transport explicitly set; no real SMTP test.' } } };
  }
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.MAIL_FROM) {
    failLine('SMTP_HOST, SMTP_USER, SMTP_PASSWORD and MAIL_FROM must be set in .env.local first (Stage B).');
    return { status: 'fail', notes: 'smtp config missing', report: {} };
  }
  const port = Number(env.SMTP_PORT || 465);
  const secure = String(env.SMTP_SECURE || 'true').toLowerCase() === 'true';
  const pairProblem = validateSmtpPair(port, secure);
  if (pairProblem && (port === 465 || port === 587)) {
    failLine(pairProblem);
    return { status: 'fail', notes: pairProblem, report: {} };
  }
  if (pairProblem) warn(pairProblem);

  try {
    const lookup = await dns.promises.lookup(env.SMTP_HOST);
    ok(`DNS: ${env.SMTP_HOST} resolves to ${lookup.address}.`);
  } catch (error) {
    failLine(`DNS lookup failed for ${env.SMTP_HOST}: ${redact(error.message)}`);
    return { status: 'fail', notes: 'smtp dns failed', report: {} };
  }
  const tcpOk = await probeTcp(env.SMTP_HOST, port, 8000);
  if (!tcpOk) {
    failLine(`TCP port ${port} on ${env.SMTP_HOST} is not reachable. Check the host/port and your network/firewall.`);
    return { status: 'fail', notes: 'smtp tcp unreachable', report: { 'smtp-connectivity': { status: 'FAIL', detail: `TCP ${env.SMTP_HOST}:${port} unreachable.` } } };
  }
  ok(`TCP ${env.SMTP_HOST}:${port} reachable (${secure ? 'implicit TLS (465-style)' : 'STARTTLS (587-style)'}).`);

  if (dryRun) {
    info('Dry run: connectivity checked. No SMTP login and no email was sent.');
    return { status: 'skip', notes: 'dry-run (no smtp login)', report: {} };
  }

  let nodemailer;
  try {
    nodemailer = (await import('nodemailer')).default;
  } catch (error) {
    failLine(`Could not load nodemailer: ${redact(error.message)}. Run "npm ci" first (stop the dev server first).`);
    return { status: 'fail', notes: 'nodemailer unavailable', report: {} };
  }
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2', servername: env.SMTP_HOST },
  });
  try {
    await transporter.verify();
    ok(`SMTP login OK as ${env.SMTP_USER}.`);
  } catch (error) {
    failLine(`SMTP login failed: ${redact(error?.message || String(error))}${error?.code ? ` [${error.code}]` : ''}`);
    out('Check: SMTP_USER is the full mailbox address, SMTP_PASSWORD is the mailbox password from hPanel,');
    out('and the provider/port pair matches (Hostinger 465/secure, Titan smtp.titan.email:465).');
    out('If the mailbox is Titan, not Hostinger Email, Stage B must pick Titan.');
    return { status: 'fail', notes: redact(error?.message || 'smtp auth failed'), report: { 'smtp-auth': { status: 'FAIL', detail: 'SMTP login failed (see message).' } } };
  }
  // Sender compatibility: MAIL_FROM should match the mailbox or its domain.
  const fromDomain = String(env.MAIL_FROM).split('@')[1] || '';
  const userDomain = String(env.SMTP_USER).split('@')[1] || '';
  if (env.MAIL_FROM !== env.SMTP_USER && fromDomain !== userDomain) {
    warn(`MAIL_FROM (${env.MAIL_FROM}) is not the SMTP mailbox (${env.SMTP_USER}) and not even the same domain. Many providers reject this. Stage E will still try the test email — if it is rejected, align MAIL_FROM with the mailbox.`);
  } else {
    ok(`Sender OK: MAIL_FROM ${env.MAIL_FROM} matches the SMTP mailbox/domain.`);
  }

  // Step 5 (S5-35): the full address is never stored in state, so Stage E
  // always asks for it fresh (the masked form in state is display-only).
  const recipient = await ask('Test recipient email (a mailbox you control)', { allowEmpty: true });
  if (!recipient || !isValidEmail(recipient)) {
    failLine('A valid test recipient email is required to send the test email.');
    return { status: 'fail', notes: 'no test recipient', report: {} };
  }
  state.config.testRecipientMasked = maskEmail(recipient);
  out('');
  out(`The wizard will send ONE setup test email to ${maskEmail(recipient)} from ${env.MAIL_FROM}.`);
  out('It is clearly a setup test (no code, no link). Nothing else will be sent.');
  if (!(await confirm('Send this one test email now?', true))) {
    info('Test email not sent. Re-run the wizard to send it later.');
    return { status: 'fail', notes: 'test email not approved', report: { 'smtp-test-sent': { status: 'PENDING', detail: 'Not yet sent (approval pending).' } } };
  }
  let accepted = false;
  try {
    const mail = buildSetupTestEmail({ to: recipient, from: env.MAIL_FROM });
    const infoResult = await transporter.sendMail({ from: env.MAIL_FROM, to: recipient, subject: mail.subject, text: mail.text, html: mail.html });
    const response = String(infoResult?.response || '');
    accepted = /250/.test(response) || Boolean(infoResult?.accepted?.length);
    if (accepted) ok(`SMTP accepted the test email (250). Message ID: ${infoResult?.messageId || '(not returned)'}.`);
    else {
      failLine(`SMTP did not confirm acceptance (response: ${response || '(empty)'}). Treat as NOT sent.`);
      return { status: 'fail', notes: 'smtp did not accept', report: {} };
    }
  } catch (error) {
    failLine(`Sending the test email failed: ${redact(error?.message || String(error))}${error?.code ? ` [${error.code}]` : ''}`);
    out('No silent fallback was used: a failed send never writes mail to the local outbox.');
    return { status: 'fail', notes: redact(error?.message || 'send failed'), report: { 'smtp-test-sent': { status: 'FAIL', detail: 'Send failed (see message).' } } };
  }

  out('');
  out('SMTP accepted the message (250). That proves the server took it — it does NOT prove it reached the inbox.');
  out('Check the recipient mailbox now (including Spam/Junk). It can take a minute or two.');
  const arrived = await confirm('Did the test email arrive in the inbox?', false);
  state.results.smtp = {
    host: env.SMTP_HOST, port, secure, user: env.SMTP_USER, mailFrom: env.MAIL_FROM,
    testRecipientMasked: maskEmail(recipient), accepted, inboxConfirmed: arrived,
  };
  if (arrived) {
    ok('Inbox delivery confirmed by you.');
  } else {
    warn('Inbox delivery NOT confirmed. Check Spam/Junk and the sender domain. If it never arrives, check SPF/DKIM/DMARC for the sender domain (see checklist below).');
  }
  out('');
  out('DNS checklist (the wizard cannot verify DNS reliably — check in hPanel / your DNS provider):');
  out('  - SPF: the sender domain must authorise the SMTP host to send for it.');
  out('  - DKIM: the mailbox provider should sign outgoing mail; verify the DKIM record exists.');
  out('  - DMARC: a DMARC policy should exist for the sender domain.');
  out('  - Daily sending limit: confirm the mailbox plan limit in hPanel (Hostinger Email vs Titan differ).');
  return {
    status: 'pass',
    notes: `smtp ${env.SMTP_HOST}:${port} accepted test mail; inbox ${arrived ? 'confirmed' : 'NOT confirmed'}`,
    report: {
      'smtp-connectivity': { status: 'PASS', detail: `TCP + DNS OK for ${env.SMTP_HOST}:${port}.` },
      'smtp-auth': { status: 'PASS', detail: `Login OK as ${env.SMTP_USER}; MAIL_FROM ${env.MAIL_FROM}.` },
      'smtp-test-sent': { status: 'PASS', detail: 'One setup test email accepted by SMTP (250).' },
      'inbox-delivery': arrived
        ? { status: 'PASS', detail: 'Recipient confirmed arrival in the inbox.' }
        : { status: 'PENDING', detail: 'SMTP accepted (250) but inbox arrival not confirmed. Check Spam/Junk + SPF/DKIM/DMARC.' },
    },
  };
}

// ---------------------------------------------------------------------------
// Stage I — Validation
// ---------------------------------------------------------------------------

const MANUAL_CHECKS = [
  ['otp-signup', 'OTP signup: register with a real mailbox you control; code auto-sent; masked email shown on /verify-email; entering the code signs you in to /account. Did it work?'],
  ['otp-negative', 'OTP negatives: a wrong code is rejected; a code older than 5 minutes is rejected; a used code cannot be reused; 5 wrong attempts invalidate the code. Did they behave?'],
  ['otp-resend', 'OTP resend: Resend is disabled during the 60s countdown; after resending, the old code no longer works. Did it behave?'],
  ['otp-persistence', 'OTP persistence: refresh /verify-email mid-flow — the masked email is still shown. Did it persist?'],
  ['password-reset', 'Forgot/reset password: reset link works, new password signs in, old session is revoked, token is single-use. Did it work?'],
  ['unverified-restrictions', 'Unverified user: a fresh unverified account cannot sign in or use protected features. Confirmed?'],
  ['duplicate-signup', 'Duplicate signup with the same email fails cleanly. Confirmed?'],
];

async function stageI(ctx) {
  const { state, dryRun } = ctx;
  out(STAGES.i.title);
  out('This stage runs the real checks and records exit codes. Nothing is weakened to pass.');
  const env = childEnv();
  const report = {};
  const results = {};
  let failed = false;

  if (dryRun) {
    info('Dry run: validation commands are listed, not run.');
    for (const label of ['npm run lint', 'npm run typecheck', 'npm test', 'npm run build', 'npm run release:check', 'npm run membership:verify-mysql']) out(`  - ${label}`);
    return { status: 'skip', notes: 'dry-run', report: {} };
  }

  const npm = npmCommand();
  const commands = [
    ['eslint', 'ESLint', npm, ['run', 'lint']],
    ['typescript', 'TypeScript', npm, ['run', 'typecheck']],
    ['tests', 'Tests', npm, ['run', 'test']],
    ['build', 'Production build', npm, ['run', 'build']],
  ];
  for (const [id, label, cmd, args] of commands) {
    const r = runCommand(label, cmd, args, env);
    results[id] = r;
    report[id] = r.code === 0
      ? { status: 'PASS', detail: `Exit 0 (${Math.round(r.durationMs / 1000)}s).` }
      : { status: 'FAIL', detail: `Exit ${r.code}. Fix the failures and re-run the wizard.` };
    if (r.code !== 0) failed = true;
  }

  // release:check is a PRODUCTION config check. In local dev config it is
  // expected to fail (it demands AENURAL_MEMBERSHIP_ENABLED=1 and production
  // origins). Record the outcome, do not gate the wizard on it.
  const release = runCommand('Release config check (production)', 'node', ['scripts/membership/release-check.mjs'], env);
  results['release-check'] = release;
  report['release-check'] = release.code === 0
    ? { status: 'PASS', detail: 'Exit 0. (Unusual in local dev config — verify the env really is production-shaped.)' }
    : { status: 'PENDING', detail: 'Production-only check; it is expected to fail in local dev config. Run it again with production env before launch (see production-checklist.md).' };

  // DB connectivity proof (reuses the app-integrated check).
  const verify = runCommand('MySQL readiness (membership:verify-mysql)', npm, ['run', 'membership:verify-mysql'], env);
  results['mysql-verify'] = verify;
  if (verify.code !== 0) {
    warn('membership:verify-mysql failed. Stage C may have passed earlier, but the app-integrated check is the one that matters — investigate before continuing.');
    failed = true;
  }

  // Manual auth-flow checks (interactive only; NOT RUN otherwise).
  const manual = {};
  if (!nonInteractive) {
    out('');
    out('Manual auth-flow checks (localhost, from docs/authentication/hostinger-setup.md section 10).');
    out('Answer y (passed), n (failed) or leave blank to mark NOT RUN. Do not guess — only confirm what you actually tried.');
    for (const [id, question] of MANUAL_CHECKS) {
      const answer = (await ask(`${question} (y/n, blank = not run)`, { allowEmpty: true })).trim().toLowerCase();
      if (answer === 'y' || answer === 'yes') { manual[id] = 'PASS'; report[id] = { status: 'PASS', detail: 'Confirmed by the operator during this run.' }; }
      else if (answer === 'n' || answer === 'no') { manual[id] = 'FAIL'; report[id] = { status: 'FAIL', detail: 'Operator reported a failure — investigate before launch.' }; failed = true; }
      else { manual[id] = 'NOT RUN'; report[id] = { status: 'NOT RUN', detail: 'Not tried in this run.' }; }
    }
  } else {
    info('Non-interactive mode: manual auth-flow checks are left NOT RUN.');
    for (const [id] of MANUAL_CHECKS) report[id] = { status: 'NOT RUN', detail: 'Not tried in this run (non-interactive).' };
  }

  state.results.validation = {
    commands: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { code: v.code, durationMs: v.durationMs }])),
    manual,
  };
  if (failed) {
    return { status: 'fail', notes: 'one or more validation checks failed (see above)', report };
  }
  return { status: 'pass', notes: 'lint/typecheck/test/build passed; manual checks recorded', report };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

const STAGE_RUNNERS = { a: stageA, b: stageB, c: stageC, d: stageD, e: stageE, i: stageI };

function buildReportItems(state) {
  const items = {};
  // Stage statuses seed the report; explicit per-item results override.
  const seed = (id, detail) => { items[id] = { status: 'NOT RUN', detail }; };
  seed('env', 'Not checked in this run.');
  seed('gitignore', 'Not checked in this run.');
  seed('mysql-connectivity', 'Not checked in this run.');
  seed('mysql-tls', 'Not checked in this run.');
  seed('mysql-permissions', 'Not checked in this run.');
  seed('schema', 'Not checked in this run.');
  seed('smtp-connectivity', 'Not checked in this run.');
  seed('smtp-auth', 'Not checked in this run.');
  seed('smtp-test-sent', 'Not checked in this run.');
  seed('inbox-delivery', 'Not checked in this run.');
  for (const [id] of MANUAL_CHECKS) seed(id, 'Not tried in this run.');
  seed('eslint', 'Not run in this run.');
  seed('typescript', 'Not run in this run.');
  seed('tests', 'Not run in this run.');
  seed('build', 'Not run in this run.');
  seed('release-check', 'Not run in this run.');
  // Re-apply saved per-item results from earlier runs (state.results is
  // the durable record; stage reports are per-run).
  for (const stageId of STAGE_ORDER) {
    const stageReport = state.results[`stage-${stageId}-report`];
    if (stageReport && typeof stageReport === 'object') {
      for (const [id, item] of Object.entries(stageReport)) items[id] = item;
    }
  }
  return items;
}

function writeReport(state) {
  const items = buildReportItems(state);
  const blockers = [];
  if (state.stages.c?.status !== 'pass') blockers.push('MySQL/TLS verification has not passed yet (Stage C).');
  if (state.stages.d?.status !== 'pass') blockers.push('Schema has not been verified yet (Stage D).');
  if (state.stages.e?.status !== 'pass') blockers.push('SMTP test has not passed yet (Stage E).');
  if (items['inbox-delivery']?.status !== 'PASS') blockers.push('Inbox delivery of the test email is unconfirmed (Stage E).');
  blockers.push('Remote TLS for srv2224.hstgr.io is unverified until Stage C passes on the allowlisted PC.');
  blockers.push('AUTH_TRUSTED_IP_HEADER=x-real-ip is UNCONFIRMED with Hostinger — confirm it before production (remote-MySQL dev requires the header at startup; local SQLite dev does not).');
  blockers.push('Free-quota policy DECIDED 2026-11-18: 3 videos per UTC day (docs corrected in Phase 3; code already enforced daily).');
  blockers.push('CI retarget patch ready (docs/ci-retarget-patch.md) but NOT pushed — GitHub App lacks workflows permission; apply locally or via web UI.');
  const notes = [];
  if (state.stages.i?.status !== 'pass') notes.push('Validation (Stage I) has not fully passed in this run.');
  notes.push('This report is local-only (git-ignored) and redacted: no passwords, secrets, OTPs or tokens.');
  const text = renderReadinessReport({
    generatedAt: new Date().toISOString(),
    repo: 'faisalhere-afk/aenural-website',
    branch: EXPECTED_BRANCH,
    items,
    blockers,
    notes,
  });
  fs.mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(REPORT_FILE, text, { mode: 0o600 });
  return REPORT_FILE;
}

export async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.stdout.write(HELP_TEXT + '\n');
    process.exitCode = 2;
    return;
  }
  if (args.help) {
    out(HELP_TEXT);
    return;
  }
  nonInteractive = args.nonInteractive;

  out('AENural membership setup wizard');
  out('Repo: faisalhere-afk/aenural-website — branch feature/hostinger-authentication');
  out('Local-only: writes .env.local, .aenural-local/setup-state.json and .aenural-local/readiness-report.md.');
  out('');

  let state = loadState();
  if (args.resetState) {
    state = createState();
    info('Saved progress cleared (--reset-state). Starting from Stage A.');
  }
  if (args.dryRun) info('Dry-run mode: Stages C and D inspect only; no DB writes, no email.');

  const stagesToRun = args.stage ? [args.stage] : STAGE_ORDER;
  if (!args.stage) {
    const resumeFrom = nextPendingStage(state);
    if (resumeFrom) info(`Resuming: next unfinished stage is ${resumeFrom.toUpperCase()} (${STAGES[resumeFrom].name}). Passed stages are skipped.`);
    else info('All stages already passed. Re-running to refresh the report; use --reset-state to start over.');
  }

  let overallFail = false;
  for (const stageId of stagesToRun) {
    if (!args.stage && ['pass', 'skip'].includes(state.stages[stageId]?.status)) {
      skip(`${STAGES[stageId].title} — already ${state.stages[stageId].status} (use --stage ${stageId} to re-run, --reset-state to start over).`);
      continue;
    }
    out('');
    let result;
    try {
      result = await STAGE_RUNNERS[stageId]({ state, dryRun: args.dryRun, nonInteractive, fromEnv: args.fromEnv });
    } catch (error) {
      if (error instanceof NonInteractiveError) {
        failLine(`Stage ${stageId.toUpperCase()}: ${error.message}`);
        result = { status: 'fail', notes: error.message, report: {} };
      } else {
        failLine(`Stage ${stageId.toUpperCase()} crashed: ${redact(error?.message || String(error))}`);
        result = { status: 'fail', notes: redact(error?.message || 'crash'), report: {} };
      }
    }
    if (result.report && Object.keys(result.report).length) {
      state.results[`stage-${stageId}-report`] = result.report;
    }
    markStage(state, stageId, result.status, result.notes || '');
    try { saveState(state); } catch (error) {
      failLine(`Could not save wizard state: ${redact(error.message)}`);
    }
    if (result.status === 'pass') ok(`Stage ${stageId.toUpperCase()} passed.`);
    else if (result.status === 'skip') skip(`Stage ${stageId.toUpperCase()} skipped: ${result.notes || ''}`);
    else {
      failLine(`Stage ${stageId.toUpperCase()} FAILED. Fix the problem above and re-run the wizard — it resumes after this stage.`);
      overallFail = true;
      if (!args.stage) break; // stop at the first failed stage in a full run
      break;
    }
  }

  out('');
  stdinReader.stop(); // no more prompts after this point; let the process exit
  const reportPath = writeReport(state);
  ok(`Readiness report written (redacted, local-only): ${reportPath}`);
  out('');
  out('Stage summary:');
  for (const id of STAGE_ORDER) {
    const s = state.stages[id];
    out(`  [${s.status.toUpperCase()}] Stage ${id.toUpperCase()} — ${STAGES[id].name}${s.notes ? ` — ${s.notes}` : ''}`);
  }
  if (allStagesPassed(state) && !overallFail) {
    out('');
    ok('Setup wizard complete. This is local-integration readiness only — NOT production approval.');
    out('Next: run the app (npm run dev) and follow docs/authentication/hostinger-setup.md section 10');
    out('for the full signup -> OTP -> login test, then the production checklist before any launch.');
  } else if (overallFail) {
    out('');
    failLine('Wizard stopped at a failed stage. Re-run "npm run membership:setup" to resume — passed stages are skipped.');
    process.exitCode = 1;
  } else {
    out('');
    info('Wizard finished with some stages skipped or pending. Re-run to complete them.');
  }
}

// Only run when executed directly (importing this file for tests must not
// start the wizard).
const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entryPath && fileURLToPath(import.meta.url) === entryPath) {
  main().catch(error => {
    stdinReader.stop();
    process.stderr.write(`[FAIL] Wizard crashed: ${redact(error?.message || String(error))}\n`);
    process.exitCode = 1;
  });
}
