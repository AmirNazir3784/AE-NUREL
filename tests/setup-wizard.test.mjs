// setup-wizard.test.mjs — unit tests for the setup wizard's pure parts.
//
// INTENDED REPO PATH: tests/setup-wizard.test.mjs
// RUN:  node --test tests/setup-wizard.test.mjs   (no deps, no node_modules needed)
//
// These tests never touch a live database, live SMTP, the network, or the
// filesystem outside temp assertions on pure functions. Anything that needs
// a real MySQL/SMTP connection is explicitly NOT covered here — see the
// wizard MANIFEST for what must be tested on the PC instead.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  parseEnvFile, serializeEnvFile, quoteEnvValue, needsQuoting, unquoteEnvValue,
  generateSecret, isValidSecret,
  maskEmail, isValidEmail, redactText, processHiddenChars, processHiddenChunk,
  stripBracketedPasteMarkers,
  missingGitignorePatterns, validateDbTarget,
  splitSqlStatements, parseSqlTables, diffSchema, missingTables,
  parseGrants, missingPermissions,
  resolveSmtpPreset, validateSmtpPair,
  createState, markStage, nextPendingStage, allStagesPassed, assertStateHasNoSecrets,
  renderReadinessReport, buildSetupTestEmail, STAGE_ORDER,
} from '../scripts/membership/setup-lib.mjs';
import { parseArgs, promptHidden, promptSecretValue, writeEnvFileAtomic, readNpmVersion, createLineReader } from '../scripts/membership/setup.mjs';

// --- .env parsing / serialising -------------------------------------------

test('parseEnvFile: comments, blanks, quotes and bare values', () => {
  const { entries, values } = parseEnvFile([
    '# comment',
    '',
    'DB_HOST=srv2224.hstgr.io',
    'DB_PASSWORD="p#ss word"',
    "SMTP_USER='support@aenural.com'",
    'EMPTY=',
    'export FOO=bar',
    'not-a-kv-line',
  ].join('\n'));
  assert.equal(values.DB_HOST, 'srv2224.hstgr.io');
  assert.equal(values.DB_PASSWORD, 'p#ss word');
  assert.equal(values.SMTP_USER, 'support@aenural.com');
  assert.equal(values.EMPTY, '');
  assert.equal(values.FOO, 'bar');
  assert.equal(entries.find(e => e.key === 'DB_HOST').type, 'kv');
  assert.equal(entries.filter(e => e.type === 'comment').length, 1);
  assert.equal(entries.filter(e => e.type === 'blank').length, 1);
});

test('parseEnvFile: double-quoted escapes round-trip', () => {
  const { values } = parseEnvFile('A="a\\"b\\\\c\\nd"');
  assert.equal(values.A, 'a"b\\c\nd');
});

test('serializeEnvFile: preserves comments/order, updates in place, appends new keys', () => {
  const original = '# header\nDB_HOST=old.example\n\n# smtp\nSMTP_PORT=465\n';
  const out = serializeEnvFile(original, { DB_HOST: 'srv2224.hstgr.io', DB_NAME: 'u853936014_aenural_dev' });
  // The trailing blank line of the original is preserved (entries are kept verbatim).
  assert.match(out, /^# header\nDB_HOST=srv2224\.hstgr\.io\n\n# smtp\nSMTP_PORT=465\n\nDB_NAME=u853936014_aenural_dev\n$/);
});

test('serializeEnvFile: quoting for spaces, # and =; untouched keys left alone', () => {
  const out = serializeEnvFile('A=keep\n', { B: 'has space', C: 'has#hash', D: 'a=b', E: 'plain', F: null });
  assert.match(out, /B="has space"/);
  assert.match(out, /C="has#hash"/);
  assert.match(out, /D="a=b"/);
  assert.match(out, /E=plain/);
  assert.equal(out.includes('F='), false);
  assert.match(out, /A=keep/);
});

test('quoteEnvValue: plain values unquoted, tricky values quoted + escaped', () => {
  assert.equal(quoteEnvValue('srv2224.hstgr.io'), 'srv2224.hstgr.io');
  assert.equal(quoteEnvValue(''), '""');
  assert.equal(quoteEnvValue('a b'), '"a b"');
  assert.equal(quoteEnvValue('say "hi"'), '"say \\"hi\\""');
  assert.equal(needsQuoting('plain'), false);
  assert.equal(needsQuoting(' lead'), true);
  assert.equal(unquoteEnvValue('"x"'), 'x');
  assert.equal(unquoteEnvValue("'x'"), 'x');
  assert.equal(unquoteEnvValue('x'), 'x');
});

// --- secrets ---------------------------------------------------------------

test('generateSecret: 48 random bytes as base64url, valid; short secrets rejected', () => {
  const a = generateSecret();
  const b = generateSecret();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
  assert.equal(a.length, 64); // 48 bytes -> 64 base64url chars, no padding
  assert.equal(isValidSecret(a), true);
  assert.equal(isValidSecret('short'), false);
  assert.equal(isValidSecret(''), false);
  assert.equal(isValidSecret('x'.repeat(32)), true);
});

// --- redaction / masking ---------------------------------------------------

test('maskEmail: keeps domain, hides local part', () => {
  assert.equal(maskEmail('alice@example.test'), 'al***@example.test');
  assert.equal(maskEmail('a@example.test'), 'a***@example.test');
  assert.equal(maskEmail('not-an-email'), '***');
  assert.equal(maskEmail(null), '***');
});

test('isValidEmail', () => {
  assert.equal(isValidEmail('faisal@example.com'), true);
  assert.equal(isValidEmail('bad'), false);
  assert.equal(isValidEmail('a@b'), false);
  assert.equal(isValidEmail(''), false);
});

test('redactText: replaces secrets longest-first, ignores short values', () => {
  const out = redactText('pw hunter2 and hunter2x end', ['hunter2', 'ab']);
  assert.equal(out, 'pw [REDACTED] and [REDACTED]x end');
  assert.equal(redactText('nothing here', ['secret']), 'nothing here');
});

// --- hidden input character processing -------------------------------------

test('processHiddenChars: plain input, backspace, Ctrl-U, Enter, Ctrl-C', () => {
  assert.deepEqual(processHiddenChars('abc\r'), { value: 'abc', cancelled: false });
  assert.deepEqual(processHiddenChars('ab\x7fc\r'), { value: 'ac', cancelled: false });
  assert.deepEqual(processHiddenChars('ab\x08c\n'), { value: 'ac', cancelled: false });
  assert.deepEqual(processHiddenChars('abc\x15def\r'), { value: 'def', cancelled: false });
  assert.deepEqual(processHiddenChars('ab\x03'), { value: 'ab', cancelled: true });
  assert.deepEqual(processHiddenChars(''), { value: '', cancelled: false });
});

// --- hidden prompt, non-TTY path (piped stdin) -----------------------------

test('promptHidden: non-TTY stdin reads one line without echoing the value', async () => {
  const stdin = Readable.from(['typed-secret\n']);
  let captured = '';
  const stdout = new Writable({ write(chunk, _enc, cb) { captured += chunk.toString(); cb(); } });
  const value = await promptHidden('Password: ', { stdin, stdout });
  assert.equal(value, 'typed-secret');
  assert.equal(captured.includes('typed-secret'), false); // never echoed back
  assert.match(captured, /Password: /);
});

// --- line reader: the piped-stdin regression --------------------------------
// Node's readline drops buffered lines once a piped stdin ends, so a
// second rl.question() never resolves. The wizard's own reader must
// answer every queued line in order, including after EOF.
test('createLineReader: sequential reads over piped input, CRLF + EOF', async () => {
  const reader = createLineReader(Readable.from(['YES\r\n', 'YES\n', 'last-no-newline']));
  assert.equal(await reader.readLine(), 'YES');
  assert.equal(await reader.readLine(), 'YES');
  assert.equal(await reader.readLine(), 'last-no-newline');
  assert.equal(await reader.readLine(), ''); // EOF resolves, never hangs
  reader.stop();
});

test('createLineReader: lines arriving in split chunks', async () => {
  const stream = new Readable({ read() {} });
  const reader = createLineReader(stream);
  const p1 = reader.readLine();
  const p2 = reader.readLine();
  stream.push('fir');
  stream.push('st\nsec');
  stream.push('ond\n');
  stream.push(null);
  assert.equal(await p1, 'first');
  assert.equal(await p2, 'second');
  reader.stop();
});

// --- .gitignore coverage ---------------------------------------------------

const BRANCH_GITIGNORE = [
  '# dependencies', '/node_modules', '# env files (can opt-in for committing if needed)',
  '.env*', '*.pem', '# Local account database, secrets and development mail; never publish user data.',
  '/.aenural-local/',
].join('\n');

test('missingGitignorePatterns: branch .gitignore covers everything', () => {
  assert.deepEqual(missingGitignorePatterns(BRANCH_GITIGNORE), []);
});

test('missingGitignorePatterns: reports each missing pattern', () => {
  assert.deepEqual(missingGitignorePatterns(''), ['.env*', '*.pem', '/.aenural-local/']);
  assert.deepEqual(missingGitignorePatterns('.env*\n*.pem\n'), ['/.aenural-local/']);
  // A bare ".env" line alone does NOT cover .env.local.
  assert.deepEqual(missingGitignorePatterns('.env\n*.pem\n/.aenural-local/\n'), ['.env*']);
});

// --- DB target guard ---------------------------------------------------------

test('validateDbTarget: expected dev target is clean', () => {
  const r = validateDbTarget({ host: 'srv2224.hstgr.io', dbName: 'u853936014_aenural_dev' });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test('validateDbTarget: production-looking DB name is refused', () => {
  const r = validateDbTarget({ host: 'srv2224.hstgr.io', dbName: 'u853936014_aenural_prod' });
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /production/);
});

test('validateDbTarget: different host/db and loopback only warn (confirmation handled by the wizard)', () => {
  const r = validateDbTarget({ host: 'other.hstgr.io', dbName: 'other_db' });
  assert.deepEqual(r.errors, []);
  assert.equal(r.warnings.length, 2);
  const loop = validateDbTarget({ host: '127.0.0.1', dbName: 'u853936014_aenural_dev' });
  assert.equal(loop.warnings.some(w => /PRODUCTION profile/.test(w)), true);
  const missing = validateDbTarget({ host: '', dbName: '' });
  assert.equal(missing.errors.length, 2);
});

// --- SQL parsing / schema diff ----------------------------------------------

const SAMPLE_SQL = [
  'SET NAMES utf8mb4;',
  "create table `user` (`id` varchar(36) not null primary key, `name` varchar(255) not null, `email` varchar(255) not null unique, `emailVerified` boolean not null, `createdAt` timestamp(3) default CURRENT_TIMESTAMP(3) not null);",
  "create table if not exists `aenural_projects` (`id` varchar(36) primary key, `owner_id` varchar(36) not null, `title` varchar(100) not null, `payload` longtext not null);",
  "create index `session_userId_idx` on `session` (`userId`);",
  "-- a comment; with a semicolon inside",
  "create table `rateLimit` (`id` varchar(36) not null primary key, `key` varchar(255) not null unique, `count` integer not null);",
].join('\n');

test('splitSqlStatements: splits on real semicolons only', () => {
  const stmts = splitSqlStatements(SAMPLE_SQL);
  assert.equal(stmts.length, 5); // SET + 3 CREATEs + 1 CREATE INDEX (comment attached to next stmt is fine)
  assert.equal(stmts.filter(s => /create table/i.test(s)).length, 3);
});

test('parseSqlTables: finds tables + columns, skips indexes', () => {
  const tables = parseSqlTables(SAMPLE_SQL);
  assert.deepEqual(Object.keys(tables).sort(), ['aenural_projects', 'rateLimit', 'user']);
  assert.deepEqual(tables.user, ['id', 'name', 'email', 'emailVerified', 'createdAt']);
  assert.deepEqual(tables.aenural_projects, ['id', 'owner_id', 'title', 'payload']);
  assert.deepEqual(tables.rateLimit, ['id', 'key', 'count']);
});

test('diffSchema: missing tables, missing columns, extra tables', () => {
  const expected = parseSqlTables(SAMPLE_SQL);
  const diff = diffSchema(
    ['user', 'aenural_projects', 'some_other_table'],
    { user: ['id', 'name', 'email'], aenural_projects: ['id', 'owner_id', 'title', 'payload'] },
    expected,
  );
  assert.deepEqual(diff.missingTables, ['rateLimit']);
  assert.deepEqual(diff.missingColumns, { user: ['emailVerified', 'createdAt'] });
  assert.equal(diff.incompatible.length, 1);
  assert.deepEqual(diff.extraTables, ['some_other_table']);
});

test('diffSchema: complete schema has no diff', () => {
  const expected = parseSqlTables(SAMPLE_SQL);
  const diff = diffSchema(
    ['user', 'rateLimit', 'aenural_projects'],
    { user: ['id', 'name', 'email', 'emailVerified', 'createdAt'], rateLimit: ['id', 'key', 'count'], aenural_projects: ['id', 'owner_id', 'title', 'payload'] },
    expected,
  );
  assert.deepEqual(diff.missingTables, []);
  assert.deepEqual(diff.missingColumns, {});
  assert.deepEqual(diff.incompatible, []);
});

test('missingTables: case-insensitive (rateLimit)', () => {
  assert.deepEqual(missingTables(['User', 'RATELIMIT'], ['user', 'rateLimit', 'session']), ['session']);
});

// --- grants ------------------------------------------------------------------

test('parseGrants + missingPermissions: ALL PRIVILEGES and partial grants', () => {
  const all = parseGrants(['GRANT ALL PRIVILEGES ON `u853936014_aenural_dev`.* TO `aenural_devuse`@`%`'], 'u853936014_aenural_dev');
  assert.equal(all.all, true);
  assert.deepEqual(missingPermissions(all), []);
  const partial = parseGrants(['GRANT SELECT, INSERT ON `u853936014_aenural_dev`.* TO `x`@`%`'], 'u853936014_aenural_dev');
  assert.deepEqual(missingPermissions(partial), ['UPDATE', 'DELETE', 'CREATE', 'ALTER']);
  // Grants on a different database do not count.
  const other = parseGrants(['GRANT ALL PRIVILEGES ON `other_db`.* TO `x`@`%`'], 'u853936014_aenural_dev');
  assert.equal(other.all, false);
  assert.deepEqual(missingPermissions(other).length, 6);
});

// --- SMTP presets -------------------------------------------------------------

test('resolveSmtpPreset: hostinger/titan/custom', () => {
  assert.deepEqual(resolveSmtpPreset('hostinger'), { host: 'smtp.hostinger.com', port: 465, secure: true });
  assert.deepEqual(resolveSmtpPreset('titan'), { host: 'smtp.titan.email', port: 465, secure: true });
  assert.deepEqual(resolveSmtpPreset('custom', { host: 'mail.example.test', port: '587', secure: 'false' }), { host: 'mail.example.test', port: 587, secure: false });
  assert.throws(() => resolveSmtpPreset('nope'), /Unknown SMTP provider/);
  assert.throws(() => resolveSmtpPreset('custom', { host: '', port: 465 }), /needs a host/);
});

test('validateSmtpPair: 465/true and 587/false pass; mismatches fail', () => {
  assert.equal(validateSmtpPair(465, 'true'), null);
  assert.equal(validateSmtpPair(587, 'false'), null);
  assert.match(validateSmtpPair(465, 'false'), /465 requires SMTP_SECURE=true/);
  assert.match(validateSmtpPair(587, 'true'), /587 requires SMTP_SECURE=false/);
});

// --- state machine -------------------------------------------------------------

test('state machine: create, mark, resume, complete', () => {
  const state = createState();
  assert.deepEqual(STAGE_ORDER, ['a', 'b', 'c', 'd', 'e', 'i']);
  assert.equal(nextPendingStage(state), 'a');
  assert.equal(allStagesPassed(state), false);
  markStage(state, 'a', 'pass', 'ok');
  markStage(state, 'b', 'skip', 'dry run');
  assert.equal(nextPendingStage(state), 'c');
  for (const id of ['c', 'd', 'e', 'i']) markStage(state, id, 'pass');
  assert.equal(nextPendingStage(state), null);
  assert.equal(allStagesPassed(state), true);
  assert.throws(() => markStage(state, 'z', 'pass'), /Unknown stage/);
  assert.throws(() => markStage(state, 'a', 'bogus'), /Unknown stage status/);
});

test('assertStateHasNoSecrets: refuses secret-looking keys at any depth', () => {
  assert.throws(() => assertStateHasNoSecrets({ config: { dbPassword: 'x' } }), /Refusing to persist a secret/);
  assert.throws(() => assertStateHasNoSecrets({ results: [{ token: 'abc' }] }), /Refusing to persist a secret/);
  assert.throws(() => assertStateHasNoSecrets({ a: { smtp_password: 'x' } }), /Refusing to persist a secret/);
  assert.throws(() => assertStateHasNoSecrets({ a: { otp: '123456' } }), /Refusing to persist a secret/);
  assert.doesNotThrow(() => assertStateHasNoSecrets(createState()));
  assert.doesNotThrow(() => assertStateHasNoSecrets({ config: { dbHost: 'srv2224.hstgr.io', dbUser: 'aenural_devuse' } }));
  // Report item ids contain "otp" mid-name but hold no secret — must not trip the guard.
  assert.doesNotThrow(() => assertStateHasNoSecrets({ results: { 'stage-i-report': { 'otp-signup': { status: 'NOT RUN' }, 'otp-resend': { status: 'PASS' } } } }));
});

test('assertStateHasNoSecrets (S5-35): also scans string values against the in-memory secret list', () => {
  // A secret stored under an innocuous key is caught when the caller passes the run secrets.
  assert.throws(() => assertStateHasNoSecrets({ config: { note: 'backup Hunter2Example!' } }, '$', ['Hunter2Example']), /contains a known secret/);
  assert.throws(() => assertStateHasNoSecrets({ results: [{ detail: 'token was abcdefgh1234' }] }, '$', ['abcdefgh1234']), /contains a known secret/);
  // Without the list, only the key-name check applies (backwards compatible).
  assert.doesNotThrow(() => assertStateHasNoSecrets({ config: { note: 'backup Hunter2Example!' } }));
  // Short secrets (< 8 chars) are not value-scanned: a 4-char fragment could
  // appear inside a legitimate hostname, and the key-name check is the guard there.
  assert.doesNotThrow(() => assertStateHasNoSecrets({ config: { dbHost: 'mail.example.com' } }, '$', ['mail']));
  // Ordinary values never trip the scan, and the masked test recipient is fine.
  assert.doesNotThrow(() => assertStateHasNoSecrets({ config: { dbHost: 'srv2224.hstgr.io', testRecipientMasked: 'fa***@example.com' } }, '$', ['correct-horse-battery-staple']));
});

test('wizard state (S5-35): the full test-recipient email is never a state field', () => {
  const state = createState();
  assert.equal('testRecipient' in state.config, false);
  // Only the masked form belongs in state; the full address lives in memory only.
  state.config.testRecipientMasked = 'fa***@example.com';
  assert.doesNotThrow(() => assertStateHasNoSecrets(state));
});

// --- readiness report ----------------------------------------------------------

test('renderReadinessReport: groups, statuses, counts, no secret passthrough by construction', () => {
  const text = renderReadinessReport({
    generatedAt: '2026-11-18T00:00:00.000Z',
    items: {
      env: { status: 'PASS', detail: 'All required vars present.' },
      'mysql-tls': { status: 'FAIL', detail: 'TLS profile unresolved.' },
      schema: { status: 'PENDING', detail: '2 tables missing.' },
    },
    blockers: ['AUTH_TRUSTED_IP_HEADER unconfirmed.'],
    notes: ['Local-only report.'],
  });
  assert.match(text, /# AENural membership setup — readiness report/);
  assert.match(text, /REDACTED REPORT/);
  assert.match(text, /\| Environment \(.env\.local complete, git-ignored\) \| PASS \|/);
  assert.match(text, /\| MySQL TLS \(encrypted session, verified cert, TLS 1\.2\+\) \| FAIL \|/);
  assert.match(text, /PASS: 1 \| FAIL: 1 \| PENDING: 1 \| NOT RUN: \d+ \| SKIP: 0/);
  assert.match(text, /does NOT claim/);
  assert.match(text, /AUTH_TRUSTED_IP_HEADER unconfirmed/);
  assert.equal(text.includes('hunter2'), false);
});

// --- setup test email ------------------------------------------------------------

test('buildSetupTestEmail: branded setup test, no code, no link', () => {
  const mail = buildSetupTestEmail({ to: 'faisal@example.test', from: 'support@aenural.com' });
  assert.equal(mail.subject, 'AENural setup test — please confirm receipt');
  assert.match(mail.text, /setup test email/);
  assert.match(mail.text, /no verification code/);
  assert.equal(/\b\d{6}\b/.test(mail.text), false);
  assert.equal(mail.text.includes('http'), false);
  assert.throws(() => buildSetupTestEmail({ to: 'bad', from: 'support@aenural.com' }), /valid test recipient/);
  assert.throws(() => buildSetupTestEmail({ to: 'a@b.test', from: 'bad' }), /MAIL_FROM must be a valid/);
});

// --- CLI arg parsing ---------------------------------------------------------------

test('parseArgs: flags, --stage= form, --check; rejects bad input', () => {
  assert.deepEqual(parseArgs([]), { stage: null, nonInteractive: false, dryRun: false, resume: true, resetState: false, help: false, fromEnv: false });
  assert.equal(parseArgs(['--stage', 'c']).stage, 'c');
  assert.equal(parseArgs(['--stage=i']).stage, 'i');
  assert.equal(parseArgs(['--check']).stage, 'i');
  assert.equal(parseArgs(['--non-interactive', '--dry-run']).nonInteractive, true);
  assert.equal(parseArgs(['--help']).help, true);
  assert.throws(() => parseArgs(['--stage', 'x']), /--stage must be one of/);
  assert.throws(() => parseArgs(['--bogus']), /Unknown argument/);
});

// --- Windows password-input fix (Phase 3 fix) -------------------------------
// Dummy values only — no real credentials anywhere in these tests.

// --- env round-trip for special characters ----------------------------------

test('env round-trip: $ # , ! backslash quotes and spaces survive write -> parse', () => {
  const password = 'p$a#s,s!w\\ord"x';
  const out = serializeEnvFile('', { DB_PASSWORD: password, A: ' lead', B: 'trail ' });
  const { values } = parseEnvFile(out);
  assert.equal(values.DB_PASSWORD, password);
  assert.equal(values.A, ' lead');
  assert.equal(values.B, 'trail ');
  // A literal backslash followed by "n" survives (the old chained
  // .replace() unquoting corrupted it into a real newline).
  assert.equal(parseEnvFile('A="a\\\\nb"').values.A, 'a\\nb');
  // A real \n escape still decodes to a newline.
  assert.equal(parseEnvFile('A="a\\nb"').values.A, 'a\nb');
  assert.equal(needsQuoting('a$b'), true);
  assert.equal(needsQuoting('a!b'), true);
  assert.equal(needsQuoting('a,b'), true);
  assert.equal(needsQuoting('a\\b'), true);
  assert.equal(needsQuoting('plain'), false);
  assert.equal(quoteEnvValue('a\tb'), '"a\\tb"');
  assert.equal(unquoteEnvValue('"a\\tb"'), 'a\tb');
});

// --- bracketed-paste + incremental hidden-char processing --------------------

test('stripBracketedPasteMarkers: removes Windows Terminal / VS Code paste framing only', () => {
  assert.equal(stripBracketedPasteMarkers('\x1b[200~p@ss\x1b[201~'), 'p@ss');
  assert.equal(stripBracketedPasteMarkers('plain'), 'plain');
});

test('processHiddenChars: bracketed paste markers are not part of the password', () => {
  assert.deepEqual(processHiddenChars('\x1b[200~ab\x1b[201~\r'), { value: 'ab', cancelled: false });
});

test('processHiddenChunk: typing, backspace, Ctrl-U, submit, cancel, paste', () => {
  let r = processHiddenChunk('ab', '');
  assert.deepEqual([r.value, r.added, r.submitted, r.cancelled], ['ab', 2, false, false]);
  r = processHiddenChunk('\x7f', r.value);
  assert.deepEqual([r.value, r.removed], ['a', 1]);
  r = processHiddenChunk('\x7f', '');
  assert.deepEqual([r.value, r.removed], ['', 0]); // backspace on empty removes nothing
  r = processHiddenChunk('c\x15', 'a');
  assert.deepEqual([r.value, r.cleared], ['', 2]); // typed c, then Ctrl-U clears both
  r = processHiddenChunk('\x1b[200~p@ss\x1b[201~\r', '');
  assert.deepEqual([r.value, r.added, r.submitted], ['p@ss', 4, true]);
  r = processHiddenChunk('ab\x03', '');
  assert.equal(r.cancelled, true);
  assert.equal(r.value, 'ab');
});

// --- promptHidden: TTY raw mode with asterisk feedback -----------------------

class FakeTty extends EventEmitter {
  constructor() { super(); this.isTTY = true; this.rawMode = null; }
  setRawMode(v) { this.rawMode = v; }
  resume() {}
  pause() {}
}

function captureStdout() {
  let captured = '';
  const stdout = new Writable({ write(chunk, _enc, cb) { captured += chunk.toString(); cb(); } });
  return { stdout, get: () => captured, stars: () => (captured.match(/\*/g) || []).length };
}

test('promptHidden: TTY typing shows one * per char, backspace erases one *', async () => {
  const stdin = new FakeTty();
  const out = captureStdout();
  const p = promptHidden('Password: ', { stdin, stdout: out.stdout });
  stdin.emit('data', Buffer.from('a'));
  stdin.emit('data', Buffer.from('b'));
  stdin.emit('data', Buffer.from('\x7f'));
  stdin.emit('data', Buffer.from('c'));
  stdin.emit('data', Buffer.from('\r'));
  assert.equal(await p, 'ac');
  assert.equal(out.stars(), 3); // a, b, c — backspace wrote "\b \b", not a star
  assert.equal(out.get().includes('ac'), false); // the value itself is never echoed
  assert.equal(stdin.rawMode, false); // raw mode restored
});

test('promptHidden: TTY paste of a whole password (with bracketed markers) shows one * per char', async () => {
  const stdin = new FakeTty();
  const out = captureStdout();
  const p = promptHidden('Password: ', { stdin, stdout: out.stdout });
  stdin.emit('data', Buffer.from('\x1b[200~p@ssw0rd\x1b[201~\r'));
  assert.equal(await p, 'p@ssw0rd');
  assert.equal(out.stars(), 8);
});

test('promptHidden: Ctrl-C rejects, never resolves an empty value', async () => {
  const stdin = new FakeTty();
  const out = captureStdout();
  const p = promptHidden('Password: ', { stdin, stdout: out.stdout });
  stdin.emit('data', Buffer.from('ab\x03'));
  await assert.rejects(p, /cancelled/);
});

// A setRawMode failure must NEVER resolve '' silently: on POSIX it falls
// back to a clearly-labelled visible prompt; on Windows it tries
// PowerShell first.
class ThrowingTty extends FakeTty {
  setRawMode() { throw new Error('setRawMode unavailable'); }
}

test('promptHidden: setRawMode failure falls back to a labelled visible prompt (no silent empty)', async () => {
  const stdin = new ThrowingTty();
  const out = captureStdout();
  const p = promptHidden('Password: ', { stdin, stdout: out.stdout, platform: 'linux' });
  await new Promise(r => setTimeout(r, 0)); // let the fallback attach its reader
  stdin.emit('data', Buffer.from('fallback-secret\n'));
  assert.equal(await p, 'fallback-secret');
  assert.match(out.get(), /WILL be visible/);
});

test('promptHidden: setRawMode failure on Windows tries PowerShell first', async () => {
  const stdin = new ThrowingTty();
  const out = captureStdout();
  const p = promptHidden('Password: ', {
    stdin, stdout: out.stdout, platform: 'win32',
    powershellRunner: async () => 'ps-secret-dummy',
  });
  assert.equal(await p, 'ps-secret-dummy');
  assert.equal(out.get().includes('ps-secret-dummy'), false);
});

test('promptHidden: PowerShell failure on Windows falls through to the visible prompt', async () => {
  const stdin = new ThrowingTty();
  const out = captureStdout();
  const p = promptHidden('Password: ', {
    stdin, stdout: out.stdout, platform: 'win32',
    powershellRunner: async () => null,
  });
  await new Promise(r => setTimeout(r, 0));
  stdin.emit('data', Buffer.from('visible-secret\n'));
  assert.equal(await p, 'visible-secret');
});

// --- promptSecretValue: empty re-prompts, then load/abort --------------------

test('promptSecretValue: empty re-prompts immediately, then accepts the typed value', async () => {
  let calls = 0;
  const hidden = async () => { calls++; return calls < 3 ? '' : 's3cret-dummy'; };
  const res = await promptSecretValue({ key: 'SMTP_PASSWORD', label: 'SMTP password' }, '', { promptHidden: hidden, ask: async () => 'r' });
  assert.deepEqual(res, { value: 's3cret-dummy', kept: false });
  assert.equal(calls, 3);
});

test('promptSecretValue: Enter keeps an already-set value', async () => {
  let calls = 0;
  const hidden = async () => { calls++; return ''; };
  const res = await promptSecretValue({ key: 'SMTP_PASSWORD', label: 'SMTP password' }, 'existing-dummy', { promptHidden: hidden });
  assert.deepEqual(res, { value: 'existing-dummy', kept: true });
  assert.equal(calls, 1);
});

test('promptSecretValue: after 3 empties, (l)oad reads the value from .env.local', async () => {
  const hidden = async () => '';
  const res = await promptSecretValue(
    { key: 'SMTP_PASSWORD', label: 'SMTP password' }, '',
    { promptHidden: hidden, ask: async () => 'l', reloadEnv: () => ({ SMTP_PASSWORD: 'from-env-dummy' }) },
  );
  assert.deepEqual(res, { value: 'from-env-dummy', kept: true });
});

test('promptSecretValue: after 3 empties, (a)bort returns aborted without failing the whole wizard silently', async () => {
  const hidden = async () => '';
  const res = await promptSecretValue(
    { key: 'SMTP_PASSWORD', label: 'SMTP password' }, '',
    { promptHidden: hidden, ask: async () => 'a' },
  );
  assert.deepEqual(res, { value: null, aborted: true });
});

// --- readNpmVersion: probe fallback order -------------------------------------

test('readNpmVersion: npm_execpath first, npm.cmd with shell on win32, then plain npm', () => {
  const calls = [];
  const fakeExec = (cmd, args, opts) => {
    calls.push([cmd, args, opts]);
    if (cmd === process.execPath) return '10.9.0';
    return null;
  };
  assert.equal(readNpmVersion({ execQuiet: fakeExec, env: { npm_execpath: '/x/npm-cli.js' }, platform: 'win32' }), '10.9.0');
  assert.deepEqual(calls[0][1], ['/x/npm-cli.js', '--version']);

  const calls2 = [];
  const fake2 = (cmd, _args, opts) => {
    calls2.push([cmd, opts]);
    if (cmd === 'npm.cmd') return '9.8.1';
    return null;
  };
  assert.equal(readNpmVersion({ execQuiet: fake2, env: {}, platform: 'win32' }), '9.8.1');
  assert.deepEqual(calls2[0][1], { shell: true });

  assert.equal(readNpmVersion({ execQuiet: () => null, env: {}, platform: 'linux' }), null);
});

// --- writeEnvFileAtomic: incremental saves preserve earlier values -----------

test('writeEnvFileAtomic: incremental writes preserve earlier values and special chars', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aenural-env-'));
  const file = path.join(dir, '.env.local');
  try {
    let text = writeEnvFileAtomic(file, '', { DB_PASSWORD: 'p$a#s,s!w\\ord"x' });
    writeEnvFileAtomic(file, text, { SMTP_PASSWORD: ' lead and trail ' });
    const { values } = parseEnvFile(fs.readFileSync(file, 'utf8'));
    assert.equal(values.DB_PASSWORD, 'p$a#s,s!w\\ord"x');
    assert.equal(values.SMTP_PASSWORD, ' lead and trail ');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --- CLI arg parsing: --from-env ----------------------------------------------

test('parseArgs: --from-env / --use-env', () => {
  assert.equal(parseArgs(['--from-env']).fromEnv, true);
  assert.equal(parseArgs(['--use-env']).fromEnv, true);
  assert.equal(parseArgs([]).fromEnv, false);
});
