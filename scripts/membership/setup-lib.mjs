// setup-lib.mjs — pure, dependency-free helpers for the AENural membership
// setup wizard (scripts/membership/setup.mjs).
//
// INTENDED REPO PATH: scripts/membership/setup-lib.mjs
//
// Everything in this file is a pure function of its arguments: no fs, no
// network, no process.env reads, no imports beyond node:crypto. That is
// deliberate — every export is unit-testable with `node --test` and no
// node_modules installed (see tests/setup-wizard.test.mjs).
//
// SECURITY RULES (enforced here, relied on by setup.mjs):
//   * No function in this file ever receives, stores or returns a password,
//     secret or OTP. The state object is validated by
//     assertStateHasNoSecrets() before it is written to disk.
//   * The readiness-report renderer only ever receives redacted data
//     (names + set/unset + host/db names). redactText() is the last line
//     of defence: setup.mjs runs every error message through it with the
//     secrets it holds in memory before printing.

import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

export const STAGE_ORDER = ['a', 'b', 'c', 'd', 'e', 'i'];

export const STAGES = {
  a: { id: 'a', name: 'Preflight', title: 'Stage A — Preflight checks' },
  b: { id: 'b', name: 'Environment config', title: 'Stage B — .env.local configuration' },
  c: { id: 'c', name: 'MySQL verify', title: 'Stage C — MySQL connection + TLS verification' },
  d: { id: 'd', name: 'Schema', title: 'Stage D — Schema inspection + approved migration' },
  e: { id: 'e', name: 'SMTP verify', title: 'Stage E — SMTP verification + test email' },
  i: { id: 'i', name: 'Validation', title: 'Stage I — Lint / typecheck / test / build / release:check' },
};

export const STAGE_STATUSES = ['not-run', 'pass', 'fail', 'skip', 'pending'];

// Expected dev target. The wizard refuses to write schema anywhere else
// without an explicit typed confirmation naming the actual host/database.
export const EXPECTED_DEV_DB_HOST = 'srv2224.hstgr.io';
export const EXPECTED_DEV_DB_NAME = 'u853936014_aenural_dev';
export const EXPECTED_DEV_DB_USER = 'aenural_devuse';
export const EXPECTED_BRANCH = 'feature/hostinger-authentication';
export const EXPECTED_PACKAGE_NAME = 'online-tools-platform';

// --- Dev defaults offered by the Stage B prompts (placeholders only) -------
export const DEV_DEFAULTS = {
  BETTER_AUTH_URL: 'http://localhost:3000',
  SITE_URL: 'http://localhost:3000',
  DB_HOST: EXPECTED_DEV_DB_HOST,
  DB_PORT: '3306',
  DB_NAME: EXPECTED_DEV_DB_NAME,
  DB_USER: EXPECTED_DEV_DB_USER,
  DB_SSL_CA_FILE: '',
  DB_TLS_ALLOW_PUBLIC_CA: '',
  AENURAL_MEMBERSHIP_DATABASE: 'mysql',
  SMTP_HOST: 'smtp.hostinger.com',
  SMTP_PORT: '465',
  SMTP_SECURE: 'true',
  SMTP_USER: 'support@aenural.com',
  MAIL_FROM: 'support@aenural.com',
  AENURAL_EMAIL_TRANSPORT: '',
  AUTH_TRUSTED_IP_HEADER: '',
};

// Env vars the wizard cares about, in prompt order. `secret: true` vars are
// never printed, never stored in state, and never appear in the report.
export const ENV_SPEC = [
  { key: 'BETTER_AUTH_SECRET', label: 'Better Auth secret', secret: true, generated: true, note: 'Auto-generated if missing/invalid (min 32 chars).' },
  { key: 'BETTER_AUTH_URL', label: 'Better Auth URL', note: 'Local dev: http://localhost:3000' },
  { key: 'SITE_URL', label: 'Site URL', note: 'Local dev: http://localhost:3000' },
  { key: 'DB_HOST', label: 'MySQL host', note: 'Remote dev: srv2224.hstgr.io. Never use localhost here (Node resolves it to ::1).' },
  { key: 'DB_PORT', label: 'MySQL port', note: '3306' },
  { key: 'DB_NAME', label: 'MySQL database', note: 'Dev database: u853936014_aenural_dev' },
  { key: 'DB_USER', label: 'MySQL username', note: 'Hostinger shows the FULL username in hPanel (it may carry a prefix such as u853936014_). Type exactly what hPanel shows.' },
  { key: 'DB_PASSWORD', label: 'MySQL password', secret: true, note: 'Dev DB password from hPanel. Typed hidden, never shown.' },
  { key: 'DB_SSL_CA_FILE', label: 'MySQL CA bundle path (optional)', note: 'Path to a PEM file, only if Hostinger gave you a CA. Leave blank to try the public-CA path first.' },
  { key: 'DB_TLS_ALLOW_PUBLIC_CA', label: 'Allow public CA (optional)', note: 'Set to 1 ONLY if the Stage C probe proves the server cert chains to a public CA. Leave blank otherwise.' },
  { key: 'AENURAL_MEMBERSHIP_DATABASE', label: 'Membership database mode', note: 'mysql (forces MySQL in local dev; default dev run uses SQLite).' },
  { key: 'SMTP_HOST', label: 'SMTP host', note: 'Hostinger: smtp.hostinger.com. Titan mailboxes: smtp.titan.email.' },
  { key: 'SMTP_PORT', label: 'SMTP port', note: '465 = implicit TLS (secure true). 587 = STARTTLS (secure false).' },
  { key: 'SMTP_SECURE', label: 'SMTP secure (true/false)', note: 'true for port 465, false for port 587.' },
  { key: 'SMTP_USER', label: 'SMTP username', note: 'Usually the mailbox address, e.g. support@aenural.com' },
  { key: 'SMTP_PASSWORD', label: 'SMTP password', secret: true, note: 'Mailbox password from hPanel. Typed hidden, never shown.' },
  { key: 'MAIL_FROM', label: 'Mail From address', note: 'Must match the SMTP mailbox or an address authorised for it.' },
  { key: 'AENURAL_EMAIL_TRANSPORT', label: 'Email transport override (optional)', note: 'Leave BLANK for real SMTP (default). local-outbox is local-dev only and is never set by this wizard.' },
  { key: 'AUTH_TRUSTED_IP_HEADER', label: 'Trusted proxy IP header', note: 'Local SQLite dev: leave blank. Remote-MySQL dev (AENURAL_MEMBERSHIP_DATABASE=mysql): REQUIRED at startup — set x-real-ip. Still UNCONFIRMED with Hostinger; confirm before production, and never substitute another header.' },
];

// SMTP presets offered in Stage B. Titan's port/secure pair is the standard
// implicit-TLS pair (465/true); the wizard still verifies it in Stage E.
export const SMTP_PRESETS = {
  hostinger: { id: 'hostinger', label: 'Hostinger Email', host: 'smtp.hostinger.com', port: 465, secure: true },
  titan: { id: 'titan', label: 'Titan Email', host: 'smtp.titan.email', port: 465, secure: true },
  custom: { id: 'custom', label: 'Custom SMTP host', host: '', port: 465, secure: true },
};

export function resolveSmtpPreset(choice, custom = {}) {
  const preset = SMTP_PRESETS[String(choice || '').toLowerCase()];
  if (!preset) throw new Error(`Unknown SMTP provider "${choice}". Choose hostinger, titan or custom.`);
  if (preset.id !== 'custom') return { host: preset.host, port: preset.port, secure: preset.secure };
  const host = String(custom.host || '').trim();
  const port = Number(custom.port);
  if (!host) throw new Error('Custom SMTP needs a host name.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Custom SMTP needs a port between 1 and 65535.');
  return { host, port, secure: custom.secure === true || String(custom.secure).toLowerCase() === 'true' };
}

// Port/secure must be a matching pair (same rule as release-check.mjs).
export function validateSmtpPair(port, secure) {
  const p = Number(port);
  const s = String(secure).toLowerCase() === 'true';
  if (p === 465 && !s) return 'SMTP port 465 requires SMTP_SECURE=true; 465 with STARTTLS will fail.';
  if (p === 587 && s) return 'SMTP port 587 requires SMTP_SECURE=false (STARTTLS); 587 with implicit TLS will fail.';
  if (p !== 465 && p !== 587) return `SMTP port ${port} is unusual for this setup (expected 465 or 587). Continuing, but Stage E will verify it.`;
  return null;
}

// ---------------------------------------------------------------------------
// Secrets
// ---------------------------------------------------------------------------

export function generateSecret(bytes = 48) {
  return randomBytes(bytes).toString('base64url');
}

export function isValidSecret(value) {
  return typeof value === 'string' && value.trim().length >= 32;
}

// ---------------------------------------------------------------------------
// .env file parsing / serialising
//
// parseEnvFile keeps every line (comments, blanks, order) so serialising
// preserves unrelated settings. Values support double quotes (with \"
// \\ \n \r \t escapes), single quotes (literal) and bare values. No
// variable expansion is performed.
// ---------------------------------------------------------------------------

export function unquoteEnvValue(raw) {
  const value = String(raw ?? '').trim();
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    // Single-pass unescape: a backslash only ever escapes the ONE character
    // that follows it. The old chained .replace() calls corrupted values
    // containing a literal backslash followed by "n" (e.g. a password with
    // "\n" in it became a real newline on reload, because `\\n` was turned
    // into a newline before `\\` was unescaped). Unknown escapes keep
    // their backslash so nothing is silently lost.
    const inner = value.slice(1, -1);
    let out = '';
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === '\\' && i + 1 < inner.length) {
        const next = inner[i + 1];
        if (next === 'n') { out += '\n'; i++; }
        else if (next === 'r') { out += '\r'; i++; }
        else if (next === 't') { out += '\t'; i++; }
        else if (next === '"') { out += '"'; i++; }
        else if (next === '\\') { out += '\\'; i++; }
        else out += ch;
      } else {
        out += ch;
      }
    }
    return out;
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  return value;
}

export function needsQuoting(value) {
  const v = String(value ?? '');
  // Quote on whitespace, #, =, quotes (as before) AND on $, !, comma and
  // backslash. Those four are safe bare in dotenv, but quoting them keeps
  // passwords intact through every loader (dotenv, shells, editors) and
  // makes the written file unambiguous about where the value ends.
  return v === '' || /[\s#="'$!,\\]/.test(v) || v !== v.trim() || v.startsWith('#');
}

export function quoteEnvValue(value) {
  const v = String(value ?? '');
  if (!needsQuoting(v)) return v;
  return '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"';
}

// Returns { entries, values }.
// entries: [{ type: 'kv'|'comment'|'blank'|'raw', key?, value?, raw }]
export function parseEnvFile(text) {
  const entries = [];
  const values = {};
  for (const rawLine of String(text ?? '').split(/\r?\n/)) {
    if (rawLine.trim() === '') { entries.push({ type: 'blank', raw: rawLine }); continue; }
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('#')) { entries.push({ type: 'comment', raw: rawLine }); continue; }
    const eq = rawLine.indexOf('=');
    if (eq === -1) { entries.push({ type: 'raw', raw: rawLine }); continue; }
    let key = rawLine.slice(0, eq).trim();
    if (key.startsWith('export ')) key = key.slice('export '.length).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) { entries.push({ type: 'raw', raw: rawLine }); continue; }
    const value = unquoteEnvValue(rawLine.slice(eq + 1));
    entries.push({ type: 'kv', key, value, raw: rawLine });
    values[key] = value;
  }
  return { entries, values };
}

// Apply `updates` ({ KEY: value }) to an existing .env text, preserving
// comments, blanks, order and unrelated keys. New keys are appended.
// Pass `null`/`undefined` as a value to leave that key untouched; pass ''
// to write an empty value. Returns the new file text.
export function serializeEnvFile(text, updates) {
  const { entries } = parseEnvFile(text ?? '');
  const remaining = { ...updates };
  const out = [];
  for (const entry of entries) {
    if (entry.type === 'kv' && Object.prototype.hasOwnProperty.call(remaining, entry.key)) {
      const value = remaining[entry.key];
      delete remaining[entry.key];
      if (value === undefined || value === null) { out.push(entry.raw); continue; }
      out.push(`${entry.key}=${quoteEnvValue(value)}`);
    } else {
      out.push(entry.raw);
    }
  }
  for (const [key, value] of Object.entries(remaining)) {
    if (value === undefined || value === null) continue;
    out.push(`${key}=${quoteEnvValue(value)}`);
  }
  return out.join('\n') + (out.length ? '\n' : '');
}

// ---------------------------------------------------------------------------
// Redaction / masking
// ---------------------------------------------------------------------------

export function maskEmail(email) {
  if (typeof email !== 'string') return '***';
  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const shown = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${shown}***@${domain}`;
}

export function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Replace every occurrence of each secret (longest first) with [REDACTED].
// Empty/short secrets are ignored so short common strings are never masked.
export function redactText(text, secrets = []) {
  let out = String(text ?? '');
  const usable = [...new Set((secrets || []).filter(s => typeof s === 'string' && s.length >= 4))].sort((a, b) => b.length - a.length);
  for (const secret of usable) out = out.split(secret).join('[REDACTED]');
  return out;
}

// ---------------------------------------------------------------------------
// Hidden-input character processing (pure half of the hidden prompt).
// The TTY raw-mode reader in setup.mjs feeds keystrokes through this so
// backspace / Ctrl-C / paste behaviour is unit-testable without a terminal.
// ---------------------------------------------------------------------------

// Bracketed-paste markers (ESC [ 200 ~ ... ESC [ 201 ~) are injected by
// Windows Terminal / VS Code when the user pastes. They are framing, not
// part of the password: without stripping them, a pasted password gains
// a literal "[200~" prefix and "[201~" suffix and authentication fails.
const BRACKETED_PASTE_RE = /\u001b\[[0-9;?]*[A-Za-z~]/g;

export function stripBracketedPasteMarkers(input) {
  return String(input ?? '').replace(BRACKETED_PASTE_RE, '');
}

// Incremental step: apply one chunk of typed/pasted characters to the
// value collected so far. Returns the new value plus display feedback
// counts so the caller can echo one '*' per typed char and erase one
// '*' per backspace/clear — without ever echoing the characters.
//   { value, cancelled, submitted, added, removed, cleared }
export function processHiddenChunk(chunk, value = '') {
  let current = String(value ?? '');
  let added = 0;
  let removed = 0;
  let cleared = 0;
  for (const ch of stripBracketedPasteMarkers(chunk)) {
    if (ch === '\u0003') return { value: current, cancelled: true, submitted: false, added, removed, cleared }; // Ctrl-C
    if (ch === '\r' || ch === '\n') return { value: current, cancelled: false, submitted: true, added, removed, cleared }; // Enter ends input
    if (ch === '\u007f' || ch === '\b') {
      if (current.length > 0) { current = current.slice(0, -1); removed++; }
      continue;
    }
    if (ch === '\u0015') { cleared += current.length; current = ''; continue; } // Ctrl-U clears line
    if (ch < ' ') continue; // ignore other control chars (incl. lone ESC)
    current += ch;
    added++;
  }
  return { value: current, cancelled: false, submitted: false, added, removed, cleared };
}

// Whole-input form (kept for compatibility). Input: a string of
// characters as typed. Output: { value, cancelled }.
export function processHiddenChars(input) {
  const result = processHiddenChunk(input, '');
  return { value: result.value, cancelled: result.cancelled };
}

// ---------------------------------------------------------------------------
// .gitignore coverage
// ---------------------------------------------------------------------------

export const REQUIRED_GITIGNORE_PATTERNS = ['.env*', '*.pem', '/.aenural-local/'];

// Returns the required patterns NOT covered by the .gitignore text.
// `.env*` covers `.env.local`; a bare `.env` line alone does not.
export function missingGitignorePatterns(gitignoreText) {
  const lines = String(gitignoreText ?? '').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const missing = [];
  if (!lines.some(l => l === '.env*' || l === '.env.*' || l === '.env.local' || l === '/.env*')) missing.push('.env*');
  if (!lines.includes('*.pem')) missing.push('*.pem');
  if (!lines.some(l => l === '/.aenural-local/' || l === '.aenural-local/' || l === '.aenural-local')) missing.push('/.aenural-local/');
  return missing;
}

// ---------------------------------------------------------------------------
// DB target guard (Stage D)
// ---------------------------------------------------------------------------

// Returns { errors, warnings }. errors non-empty means: refuse to write
// schema here. A different dev host/db is allowed only after the user
// types the confirmation the wizard asks for (the wizard checks that
// separately); this function only classifies the target.
export function validateDbTarget({ host, dbName }) {
  const errors = [];
  const warnings = [];
  const h = String(host || '').trim();
  const db = String(dbName || '').trim();
  if (!h) errors.push('DB_HOST is not set.');
  if (!db) errors.push('DB_NAME is not set.');
  if (/prod/i.test(db)) errors.push(`DB_NAME "${db}" looks like a production database. Refusing to write schema here.`);
  if (h && h !== EXPECTED_DEV_DB_HOST) {
    warnings.push(`DB_HOST is "${h}", not the expected dev host ${EXPECTED_DEV_DB_HOST}. Confirm this is a development database before any schema write.`);
  }
  if (db && db !== EXPECTED_DEV_DB_NAME) {
    warnings.push(`DB_NAME is "${db}", not the expected dev database ${EXPECTED_DEV_DB_NAME}. Confirm this is a development database before any schema write.`);
  }
  if (h === '127.0.0.1' || h === 'localhost' || h === '::1') {
    warnings.push('DB_HOST is loopback — that is the Hostinger PRODUCTION profile (app and MySQL on the same host). Only continue if this is a local development MySQL, never a production database.');
  }
  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// SQL parsing + schema diff (Stage D)
//
// 001-initial-mysql.sql is NOT fully idempotent: the 5 Better Auth tables
// use plain `create table`, only the 8 app tables use
// `create table if not exists`. The wizard therefore never replays the
// file blindly — it parses it, checks what already exists, and only runs
// CREATE statements for tables that are missing.
// ---------------------------------------------------------------------------

export function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;
  const text = String(sql ?? '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1] || '';
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      current += ch;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; current += '*/'; i++; continue; }
      current += ch;
      continue;
    }
    if (!inSingle && !inDouble && !inBacktick && ch === '-' && next === '-') { inLineComment = true; current += ch; continue; }
    if (!inSingle && !inDouble && !inBacktick && ch === '/' && next === '*') { inBlockComment = true; current += ch; continue; }
    if (ch === "'" && !inDouble && !inBacktick) inSingle = !inSingle;
    else if (ch === '"' && !inSingle && !inBacktick) inDouble = !inDouble;
    else if (ch === '`' && !inSingle && !inDouble) inBacktick = !inBacktick;
    if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
      const stmt = current.trim();
      if (stmt) statements.push(stmt + ';');
      current = '';
      continue;
    }
    current += ch;
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

// Parse CREATE TABLE statements: { tableName: [column, ...] }.
// Handles `create table [if not exists] \`name\` (...)` and plain names.
export function parseSqlTables(sql) {
  const tables = {};
  for (const stmt of splitSqlStatements(sql)) {
    const m = stmt.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?[`"]?([A-Za-z0-9_]+)[`"]?\s*\(/i);
    if (!m) continue;
    const table = m[1];
    const openIdx = stmt.indexOf('(', m.index);
    // Find the matching close paren for the column list (depth counting,
    // respecting backticks/quotes is overkill for this generated file —
    // the column list has no nested parens except type params like
    // varchar(36) / timestamp(3), which depth counting handles).
    let depth = 0;
    let end = -1;
    for (let i = openIdx; i < stmt.length; i++) {
      if (stmt[i] === '(') depth++;
      else if (stmt[i] === ')') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) { tables[table] = []; continue; }
    const body = stmt.slice(openIdx + 1, end);
    const columns = [];
    // Split top-level commas.
    let part = '';
    let d = 0;
    const parts = [];
    for (const ch of body) {
      if (ch === '(') d++;
      if (ch === ')') d--;
      if (ch === ',' && d === 0) { parts.push(part); part = ''; continue; }
      part += ch;
    }
    if (part.trim()) parts.push(part);
    for (const p of parts) {
      const t = p.trim();
      if (/^(primary\s+key|unique|key|index|constraint|foreign\s+key|check)\b/i.test(t)) continue;
      const cm = t.match(/^[`"]?([A-Za-z0-9_]+)[`"]?\s/);
      if (cm) columns.push(cm[1]);
    }
    tables[table] = columns;
  }
  return tables;
}

// Diff live schema against the expected tables.
// foundTables: string[]; foundColumns: { table: [col, ...] } (lower-cased
// keys/values are compared case-insensitively — MySQL table names are
// case-sensitive on Linux but the check must not false-alarm on casing).
export function diffSchema(foundTables, foundColumns, expectedTables) {
  const foundLower = new Set((foundTables || []).map(t => String(t).toLowerCase()));
  const missingTables = Object.keys(expectedTables).filter(t => !foundLower.has(t.toLowerCase()));
  const missingColumns = {};
  const incompatible = [];
  for (const [table, cols] of Object.entries(expectedTables)) {
    if (foundLower.has(table.toLowerCase())) {
      const live = new Set(((foundColumns || {})[table] || (foundColumns || {})[table.toLowerCase()] || []).map(c => String(c).toLowerCase()));
      const missing = cols.filter(c => !live.has(c.toLowerCase()));
      if (missing.length) {
        missingColumns[table] = missing;
        incompatible.push(`${table}: missing column(s) ${missing.join(', ')}`);
      }
    }
  }
  const extraTables = (foundTables || []).filter(t => !Object.keys(expectedTables).some(e => e.toLowerCase() === String(t).toLowerCase()));
  return { missingTables, missingColumns, incompatible, extraTables };
}

export function missingTables(foundTables, requiredTables) {
  const found = new Set((foundTables || []).map(t => String(t).toLowerCase()));
  return (requiredTables || []).filter(t => !found.has(String(t).toLowerCase()));
}

// Parse SHOW GRANTS rows into a permission summary for one database.
// grants: array of strings (the single-column values of SHOW GRANTS).
// Returns { all: boolean, perms: Set<string>, raw: string[] }.
export function parseGrants(grants, dbName) {
  const perms = new Set();
  let all = false;
  const db = String(dbName || '').replace(/[_%]/g, c => '\\' + c);
  const dbPattern = new RegExp(`(?:on\\s+(?:\`${db}\`\\.|${db}\\.)\\*|on\\s+\\*\\.\\*)`, 'i');
  for (const raw of grants || []) {
    const line = String(raw || '');
    if (!dbPattern.test(line)) continue; // grant on a different database
    const m = line.match(/grant\s+(.+?)\s+on\s+/i);
    if (!m) continue;
    for (const p of m[1].split(',')) {
      const perm = p.trim().toUpperCase();
      if (perm === 'ALL PRIVILEGES' || perm === 'ALL') { all = true; continue; }
      perms.add(perm);
    }
  }
  return { all, perms, raw: (grants || []).map(String) };
}

export function missingPermissions(parsed, required = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER']) {
  if (!parsed) return required.slice();
  if (parsed.all) return [];
  return required.filter(p => !parsed.perms.has(p));
}

// ---------------------------------------------------------------------------
// Wizard state (resumable runs)
// ---------------------------------------------------------------------------

// A key holds a secret only if it ENDS with a secret word (optionally
// plural, optionally after a _/- separated prefix or a camelCase
// boundary): dbPassword, SMTP_PASSWORD, auth-secret, verificationToken,
// otp. A key that merely CONTAINS one of those words mid-name — e.g.
// the report item id "otp-signup" — is not a secret and must not trip
// the guard.
const SECRET_KEY_PATTERN = /(?:^|[_-])(password|passwd|pwd|secret|token|otp|private[_-]?key|credential)s?$/i;
function keyLooksSecret(key) {
  const normalized = String(key).replace(/([a-z0-9])([A-Z])/g, '$1-$2');
  return SECRET_KEY_PATTERN.test(normalized);
}

export function createState() {
  const now = new Date().toISOString();
  return {
    version: 1,
    wizard: 'membership-setup',
    branch: EXPECTED_BRANCH,
    startedAt: now,
    updatedAt: now,
    stages: Object.fromEntries(STAGE_ORDER.map(id => [id, { status: 'not-run', at: null, notes: '' }])),
    // Names only — never passwords, secrets, OTPs or tokens. Enforced by
    // assertStateHasNoSecrets() before every write.
    config: {},
    results: {},
  };
}

export function markStage(state, stageId, status, notes = '') {
  if (!STAGES[stageId]) throw new Error(`Unknown stage "${stageId}".`);
  if (!STAGE_STATUSES.includes(status)) throw new Error(`Unknown stage status "${status}".`);
  state.stages[stageId] = { status, at: new Date().toISOString(), notes: String(notes || '') };
  state.updatedAt = new Date().toISOString();
  return state;
}

export function nextPendingStage(state) {
  for (const id of STAGE_ORDER) {
    if (state?.stages?.[id]?.status !== 'pass' && state?.stages?.[id]?.status !== 'skip') return id;
  }
  return null;
}

export function allStagesPassed(state) {
  return STAGE_ORDER.every(id => ['pass', 'skip'].includes(state?.stages?.[id]?.status));
}

// Walk the state object and throw if any key looks like it could hold a
// secret, or any string value is labelled as one. The state file is
// git-ignored, but a secret must never be in it in the first place.
// Step 5 (S5-35): string VALUES are also scanned against the in-memory
// secret list (`secrets`, same list redactText() uses), so a secret stored
// under an innocuous key is caught too. Only secrets of 8+ characters
// are value-scanned: shorter strings risk false positives against
// legitimate values (a 4-character password fragment could appear inside
// a hostname), and the key-name check above remains the primary guard.
// Callers that hold secrets (the wizard's runSecrets) must pass them;
// without the list, only the key-name check applies.
export function assertStateHasNoSecrets(value, path = '$', secrets = []) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertStateHasNoSecrets(v, `${path}[${i}]`, secrets));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      if (keyLooksSecret(key)) {
        throw new Error(`Refusing to persist a secret in wizard state: key "${key}" at ${path}.`);
      }
      assertStateHasNoSecrets(v, `${path}.${key}`, secrets);
    }
    return;
  }
  if (typeof value === 'string') {
    for (const secret of secrets || []) {
      if (typeof secret === 'string' && secret.length >= 8 && value.includes(secret)) {
        throw new Error(`Refusing to persist a secret in wizard state: value at ${path} contains a known secret.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Readiness report (redacted by construction)
// ---------------------------------------------------------------------------

export const REPORT_ITEM_GROUPS = [
  { group: 'Environment', items: [
    ['env', 'Environment (.env.local complete, git-ignored)'],
    ['gitignore', '.gitignore covers .env.local, *.pem, /.aenural-local/'],
  ] },
  { group: 'MySQL', items: [
    ['mysql-connectivity', 'MySQL connectivity (host reachable, auth OK)'],
    ['mysql-tls', 'MySQL TLS (encrypted session, verified cert, TLS 1.2+)'],
    ['mysql-permissions', 'MySQL permissions (SELECT/INSERT/UPDATE/DELETE/CREATE/ALTER)'],
    ['schema', 'Schema — all 13 required tables present'],
  ] },
  { group: 'Email', items: [
    ['smtp-connectivity', 'SMTP connectivity (host/port reachable, TLS)'],
    ['smtp-auth', 'SMTP authentication + sender compatibility'],
    ['smtp-test-sent', 'Setup test email accepted by SMTP (250)'],
    ['inbox-delivery', 'Test email confirmed arrived in inbox'],
  ] },
  { group: 'Auth flows (manual, localhost)', items: [
    ['otp-signup', 'OTP signup: code auto-sent, masked email shown, verify -> /account'],
    ['otp-negative', 'OTP negatives: wrong / expired / reused code rejected, 5 attempts lock'],
    ['otp-resend', 'OTP resend: 60s cooldown, old code invalidated'],
    ['otp-persistence', 'OTP persistence: masked email kept across refresh'],
    ['password-reset', 'Forgot/reset password (link flow, single-use, session revoked)'],
    ['unverified-restrictions', 'Unverified users barred from protected features'],
    ['duplicate-signup', 'Duplicate signup fails cleanly'],
  ] },
  { group: 'Validation', items: [
    ['eslint', 'ESLint (npm run lint)'],
    ['typescript', 'TypeScript (npm run typecheck)'],
    ['tests', 'Tests (npm test)'],
    ['build', 'Production build (npm run build)'],
    ['release-check', 'Release config check (npm run release:check)'],
  ] },
];

export const REPORT_STATUSES = ['PASS', 'FAIL', 'PENDING', 'NOT RUN', 'SKIP'];

// items: { [id]: { status, detail } }. Only redacted details may be passed
// in — this function does not redact (callers must pass names, not values).
export function renderReadinessReport({ generatedAt, repo, branch, items = {}, blockers = [], notes = [] }) {
  const lines = [];
  lines.push('# AENural membership setup — readiness report');
  lines.push('');
  lines.push(`Generated: ${generatedAt || new Date().toISOString()}`);
  lines.push(`Repo: ${repo || 'faisalhere-afk/aenural-website'}`);
  lines.push(`Branch: ${branch || EXPECTED_BRANCH}`);
  lines.push('');
  lines.push('> REDACTED REPORT — this file contains no passwords, secrets, OTP codes,');
  lines.push('> session tokens or credential-bearing connection strings. Only setting');
  lines.push('> names, host/database names and PASS/FAIL status are recorded.');
  lines.push('');
  const counts = {};
  for (const s of REPORT_STATUSES) counts[s] = 0;
  for (const group of REPORT_ITEM_GROUPS) {
    lines.push(`## ${group.group}`);
    lines.push('');
    lines.push('| Item | Status | Detail |');
    lines.push('| --- | --- | --- |');
    for (const [id, label] of group.items) {
      const item = items[id] || { status: 'NOT RUN', detail: '' };
      const status = REPORT_STATUSES.includes(item.status) ? item.status : 'NOT RUN';
      counts[status]++;
      lines.push(`| ${label} | ${status} | ${String(item.detail || '').replace(/\|/g, '/')} |`);
    }
    lines.push('');
  }
  lines.push('## Summary');
  lines.push('');
  lines.push(REPORT_STATUSES.map(s => `${s}: ${counts[s]}`).join(' | '));
  lines.push('');
  lines.push('## What this report does NOT claim');
  lines.push('');
  lines.push('- Code-complete is not the same as local-integration-verified.');
  lines.push('- Local-integration-verified is not the same as production-config-prepared.');
  lines.push('- Nothing here approves production. Production approval needs every');
  lines.push('  pre-deployment check in docs/authentication/production-checklist.md');
  lines.push('  to pass, including a separate production database/user, live SMTP');
  lines.push('  with SPF/DKIM/DMARC, backups, and a tested rollback plan.');
  lines.push('');
  if (blockers.length) {
    lines.push('## Outstanding blockers');
    lines.push('');
    for (const b of blockers) lines.push(`- ${String(b).replace(/\n/g, ' ')}`);
    lines.push('');
  }
  if (notes.length) {
    lines.push('## Notes');
    lines.push('');
    for (const n of notes) lines.push(`- ${String(n).replace(/\n/g, ' ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Setup test email (Stage E) — branded like buildOtpEmail() in
// server/membership/email-otp.mjs, but this is clearly a SETUP test: it
// contains no code, no link and no credentials.
// ---------------------------------------------------------------------------

export function buildSetupTestEmail({ to, from }) {
  if (!isValidEmail(to)) throw new Error('A valid test recipient email is required.');
  if (!isValidEmail(from)) throw new Error('MAIL_FROM must be a valid email address.');
  const subject = 'AENural setup test — please confirm receipt';
  const text =
    'Hello,\n\n' +
    'This is a setup test email from your AENural membership configuration.\n\n' +
    'If you can read this, SMTP delivery from your AENural setup is working.\n' +
    'This message contains no verification code and no link — it only proves\n' +
    'that mail can be sent from this configuration.\n\n' +
    'Sent to: ' + to + '\n' +
    'From: ' + from + '\n\n' +
    'Questions? Contact ' + from + '.\n';
  const html =
    '<div style="font-family:system-ui,-apple-system,sans-serif;color:#111827;max-width:480px">' +
    '<h1 style="font-size:20px;margin:0 0 8px">AENural setup test</h1>' +
    '<p style="margin:0 0 8px">This is a setup test email from your AENural membership configuration.</p>' +
    '<p style="margin:0 0 8px">If you can read this, SMTP delivery from your AENural setup is working. ' +
    'This message contains no verification code and no link — it only proves that mail can be sent.</p>' +
    `<p style="margin:0">Sent to ${to} from ${from}.</p>` +
    '</div>';
  return { subject, text, html };
}
