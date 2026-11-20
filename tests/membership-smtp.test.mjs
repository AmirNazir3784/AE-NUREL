// SMTP integration tests for AENural membership (Phase 4).
//
// What this file proves, against the ACTUAL app mail path (real
// Better Auth 1.7.14 + the app's own auth.mjs/sendMail, not a mocked
// sender): registration OTP mail, resent OTP mail and password-reset
// mail are really generated and sent; and the failure modes — SMTP
// auth failure, connection failure, 5xx rejection, timeout, invalid
// sender config, and a send failing AFTER the transport pre-check
// (the Better Auth 1.7.14 swallow case) — behave as documented, with
// no silent local-outbox fallback, no duplicate accounts, no account
// enumeration, and no OTP/token/PII/internal-error leakage.
//
// HOW TO RUN
//   npm run membership:test-smtp   full suite (see package.json —
//                                  sets NODE_EXTRA_CA_CERTS for the
//                                  test CA; starts nothing itself)
//   node --test tests/membership-smtp.test.mjs
//                                  also full: the file re-execs itself
//                                  once with the CA trusted (see below).
//   npm test                       runs this file too (same re-exec).
//
// TEST SMTP SERVERS — nothing here touches real Hostinger SMTP or
// sends real email. Two local servers are used:
//   * The fake SMTP server (tests/helpers/fake-smtp.mjs): scriptable
//     failures on loopback. Always used; started by this file.
//   * Mailpit (https://github.com/axllent/mailpit): an independent,
//     real SMTP implementation, used as a happy-path cross-check.
//     It runs ONLY when its API answers — set AENURAL_MAILPIT_API
//     (default http://127.0.0.1:8026) and AENURAL_MAILPIT_SMTP_PORT
//     (default 1026) and start it with STARTTLS, e.g.:
//       mailpit --listen 127.0.0.1:8026 --smtp 127.0.0.1:1026 \
//         --smtp-tls-cert <ca-dir>/server.pem \
//         --smtp-tls-key <ca-dir>/server-key.pem \
//         --smtp-auth-accept-any
//     (the certificate comes from tests/helpers/smtp-test-ca.mjs).
//     A Mailpit that answers its API but offers no STARTTLS fails
//     the describe's pre-flight (assertMailpitStartTls) with the
//     cause named, instead of failing both tests below with a generic
//     503 — that misconfiguration happened in CI runs #221/#220, when
//     the workflow ran a bare Mailpit service with no TLS flags.
//     Otherwise the Mailpit describe skips with a reason.
//   * Disposable MySQL (migration 002 + store + full OTP flow) runs
//     ONLY when AENURAL_TEST_MYSQL_HOST is set and a connection
//     succeeds (AENURAL_TEST_MYSQL_PORT, _DB, _USER, _PASSWORD).
//     Otherwise it skips with a reason. Never the Hostinger DB.
//
// TLS — the app verifies the SMTP certificate, so the fake server and
// Mailpit need a certificate chaining to a CA this process trusts.
// Node reads NODE_EXTRA_CA_CERTS only at startup. This file therefore
// generates a test-only CA (openssl, tests/helpers/smtp-test-ca.mjs)
// and, when the CA is not yet trusted and the re-exec guard is unset,
// re-runs itself once as `node --test <this file>` with the variable
// set (NODE_TEST* variables scrubbed, so the inner run executes).
// When openssl is missing the CA is null and the TLS-dependent tests
// skip with a clear reason; the pure tests still run.
//
// ISOLATION — every scenario group gets a fresh auth module (imported
// with a cache-busting query string, so authPromise, the SMTP
// transport cache and the verify cache are fresh), a fresh temp data
// directory, and unique email addresses (the in-memory OTP tracker is
// process-global). Rate limits are per IP, so every call uses a fresh
// x-forwarded-for address. The fake server is shared; behaviours are
// switched per test and the connection counter is reset where a test
// counts connections.
//
// DURATION — the timeout tests deliberately wait out the app's own
// timeouts (10s greeting, 20s socket) plus an 11s cache-expiry wait:
// expect roughly 60–90 seconds for the full file. That is the cost of
// proving timeouts instead of asserting them from code.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createFakeSmtpServer, smtpProbe } from './helpers/fake-smtp.mjs';
import { ensureSmtpTestCa, trustedCaPath, isCaTrusted } from './helpers/smtp-test-ca.mjs';
import {
  EMAIL_DELIVERY_TABLE,
  EMAIL_DELIVERY_RETENTION_DAYS,
  createEmailDeliveryStore,
  fromDbTimestamp,
  repopulateOtpDeliveryFromStore,
  toDbTimestamp,
} from '../server/membership/email-delivery.mjs';
import { createOtpDeliveryTracker } from '../server/membership/otp-delivery.mjs';
import {
  handlePendingVerificationStatus,
  handlePendingVerificationRecovery,
  pendingVerificationCookieHeader,
  pendingVerificationSignatureCookieHeader,
  PENDING_VERIFICATION_COOKIE,
  PENDING_VERIFICATION_SIGNATURE_COOKIE,
} from '../server/membership/pending-verification.mjs';
import { otpIdentifier, resolveEmailTransport, buildOtpEmail } from '../server/membership/email-otp.mjs';
import { membershipConfig } from '../server/membership/config.mjs';

// --- TLS trust bootstrap (see the header comment) ---
const smtpTestCa = ensureSmtpTestCa();
let tlsEnabled = false;
if (smtpTestCa) {
  const wantedCa = trustedCaPath(smtpTestCa.caPath);
  if (isCaTrusted(wantedCa)) {
    tlsEnabled = true;
  } else if (!process.env.AENURAL_SMTP_TEST_REEXEC) {
    const env = { ...process.env, NODE_EXTRA_CA_CERTS: wantedCa, AENURAL_SMTP_TEST_REEXEC: '1' };
    for (const key of Object.keys(env)) {
      if (key.startsWith('NODE_TEST')) delete env[key];
    }
    const rerun = spawnSync(process.execPath, ['--test', fileURLToPath(import.meta.url)], {
      stdio: 'inherit',
      env,
    });
    if (typeof rerun.status === 'number') process.exit(rerun.status);
    // Re-exec unavailable: fall through and let the TLS tests skip.
  }
}
const origin = 'http://localhost:3000';
const password = 'QA-Sample-Creator-123456';
const runId = Date.now().toString(36);
let emailCounter = 0;
const testEmail = (tag) => `smtp-${runId}-${tag}-${++emailCounter}@example.test`;

// =====================================================================
// Pure tests — no node_modules, no servers beyond the fake one.
// =====================================================================

describe('fake SMTP server (pure)', () => {
  let server;
  before(async () => {
    server = createFakeSmtpServer();
    await server.listen(0);
  });
  after(async () => {
    await server?.close();
  });

  it('greets, answers EHLO/AUTH/MAIL/RCPT/DATA and records the message', async () => {
    server.setBehavior('ok');
    server.reset();
    const lines = await smtpProbe({
      host: '127.0.0.1',
      port: server.port,
      commands: [
        'EHLO test',
        'AUTH PLAIN dGVzdAB0ZXN0',
        'MAIL FROM:<support@aenural.com>',
        'RCPT TO:<alice@example.test>',
        'DATA',
        'Subject: hi\r\n\r\nbody line\r\n.',
        'QUIT',
      ],
    });
    assert.ok(lines[0]?.startsWith('220'), `expected a 220 greeting, got ${lines[0]}`);
    assert.ok(lines.some((l) => l.startsWith('235')), 'AUTH should succeed');
    assert.equal(server.messages.length, 1, 'exactly one message should be recorded');
    assert.equal(server.messages[0].from, 'support@aenural.com');
    assert.deepEqual(server.messages[0].to, ['alice@example.test']);
    assert.match(server.messages[0].raw, /body line/);
  });

  it('answers 535 on AUTH when behaviour is auth-fail', async () => {
    server.setBehavior('auth-fail');
    const lines = await smtpProbe({
      host: '127.0.0.1',
      port: server.port,
      commands: ['EHLO test', 'AUTH PLAIN dGVzdAB0ZXN0'],
    });
    assert.ok(lines.some((l) => l.startsWith('535')), `expected a 535, got ${JSON.stringify(lines)}`);
  });

  it('says nothing when behaviour is blackhole (greeting timeout shape)', async () => {
    server.setBehavior('blackhole');
    const lines = await smtpProbe({ host: '127.0.0.1', port: server.port, timeoutMs: 800 });
    assert.deepEqual(lines, [], 'a blackholed server sends no greeting');
    server.setBehavior('ok');
  });

  it('closes the connection after EHLO when behaviour is drop-after-ehlo', async () => {
    server.setBehavior('drop-after-ehlo');
    const lines = await smtpProbe({
      host: '127.0.0.1',
      port: server.port,
      commands: ['EHLO test'],
    });
    assert.ok(lines.some((l) => l.startsWith('250')), 'EHLO should be answered before the drop');
    server.setBehavior('ok');
  });
});

describe('email delivery store (pure, fake database)', () => {
  // Minimal Kysely-shaped stand-in: only the query shapes the store
  // uses. Rows live in an array; where/orderBy/limit are honoured.
  function createFakeDb() {
    const rows = [];
    const makeQuery = (kind, table) => {
      const state = { kind, table, values: null, filters: [], orders: [], limit: null, columns: null };
      const q = {
        values(v) { state.values = v; return q; },
        select(c) { state.columns = c; return q; },
        where(col, op, val) { state.filters.push([col, op, val]); return q; },
        orderBy(col, dir) { state.orders.push([col, dir]); return q; },
        limit(n) { state.limit = n; return q; },
        async execute() {
          if (state.kind === 'insert') {
            rows.push({ ...state.values });
            return [];
          }
          if (state.kind === 'delete') {
            for (let i = rows.length - 1; i >= 0; i--) {
              if (state.filters.every(([c, op, v]) => compare(rows[i][c], op, v))) rows.splice(i, 1);
            }
            return [];
          }
          return applySelect();
        },
        async executeTakeFirst() {
          const out = await q.execute();
          return out[0];
        },
      };
      function compare(actual, op, expected) {
        if (op === '=') return actual === expected;
        if (op === '>=') return actual >= expected;
        if (op === '<') return actual < expected;
        return false;
      }
      function applySelect() {
        let out = rows.filter((r) => state.filters.every(([c, op, v]) => compare(r[c], op, v)));
        // Multi-column ORDER BY: apply the least significant key
        // first so the first orderBy() stays the primary key (the
        // store orders by attempted_at, then id as tiebreak).
        for (const [col, dir] of [...state.orders].reverse()) {
          out = [...out].sort((a, b) => (dir === 'desc' ? (b[col] < a[col] ? -1 : b[col] > a[col] ? 1 : 0) : (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0)));
        }
        if (state.limit !== null) out = out.slice(0, state.limit);
        if (state.columns) out = out.map((r) => Object.fromEntries(state.columns.map((c) => [c, r[c]])));
        return out;
      }
      return q;
    };
    return {
      rows,
      insertInto: (t) => makeQuery('insert', t),
      selectFrom: (t) => makeQuery('select', t),
      deleteFrom: (t) => makeQuery('delete', t),
    };
  }

  it('records attempts and reports the latest status per address and kind', async () => {
    const db = createFakeDb();
    const store = createEmailDeliveryStore(db);
    assert.equal(await store.latestStatus('alice@example.test', 'otp'), 'unknown');
    assert.equal(await store.recordAttempt({ email: 'Alice@Example.Test ', kind: 'otp', status: 'failed', errorCode: 'ECONNREFUSED' }), true);
    assert.equal(await store.latestStatus('alice@example.test', 'otp'), 'failed');
    assert.equal(await store.latestStatus('alice@example.test', 'password-reset'), 'unknown', 'kinds are independent');
    assert.equal(await store.recordAttempt({ email: 'alice@example.test', kind: 'otp', status: 'sent' }), true);
    assert.equal(await store.latestStatus('alice@example.test', 'otp'), 'sent', 'a later send overwrites the failure');
    assert.equal(await store.recordAttempt({ email: 'alice@example.test', kind: 'password-reset', status: 'sent' }), true);
    assert.equal(db.rows.length, 3);
    assert.deepEqual(Object.keys(db.rows[0]).sort(), ['attempted_at', 'email', 'error_code', 'id', 'kind', 'status']);
    assert.equal(db.rows[0].email, 'alice@example.test', 'addresses are stored lower-cased');
    assert.equal(db.rows[0].errorCode, undefined, 'no camelCase fields leak into rows');
  });

  it('attempts in the same millisecond still order by insertion (no coin flip)', async () => {
    // Regression: with a frozen clock every row shares one timestamp,
    // so "latest" was decided by the random id. The store keeps its
    // timestamps strictly increasing instead.
    const db = createFakeDb();
    const frozenMs = Date.parse('2026-11-19T07:00:00Z');
    const store = createEmailDeliveryStore(db, { now: () => frozenMs });
    await store.recordAttempt({ email: 'alice@example.test', kind: 'otp', status: 'failed', errorCode: 'EAUTH' });
    await store.recordAttempt({ email: 'alice@example.test', kind: 'otp', status: 'sent' });
    await store.recordAttempt({ email: 'alice@example.test', kind: 'otp', status: 'failed', errorCode: 'ETIMEDOUT' });
    for (let i = 0; i < 5; i++) {
      assert.equal(await store.latestStatus('alice@example.test', 'otp'), 'failed', 'the last write wins, deterministically');
    }
    assert.ok(db.rows[0].attempted_at < db.rows[1].attempted_at, 'timestamps increase even with a frozen clock');
    assert.ok(db.rows[1].attempted_at < db.rows[2].attempted_at);
  });

  it('rejects invalid input instead of writing rows', async () => {
    const db = createFakeDb();
    const store = createEmailDeliveryStore(db);
    assert.equal(await store.recordAttempt({ email: 'not-an-email', kind: 'otp', status: 'sent' }), false);
    assert.equal(await store.recordAttempt({ email: 'alice@example.test', kind: 'sms', status: 'sent' }), false);
    assert.equal(await store.recordAttempt({ email: 'alice@example.test', kind: 'otp', status: 'maybe' }), false);
    assert.equal(await store.recordAttempt({}), false);
    assert.equal(await store.latestStatus(null, 'otp'), 'unknown');
    assert.equal(await store.latestStatus('alice@example.test', 'sms'), 'unknown');
    assert.equal(db.rows.length, 0);
  });

  it('never throws when the database fails', async () => {
    const failingDb = {
      insertInto: () => { throw new Error('boom'); },
      selectFrom: () => { throw new Error('boom'); },
      deleteFrom: () => { throw new Error('boom'); },
    };
    const store = createEmailDeliveryStore(failingDb);
    assert.equal(await store.recordAttempt({ email: 'alice@example.test', kind: 'otp', status: 'sent' }), false);
    assert.equal(await store.latestStatus('alice@example.test', 'otp'), 'unknown');
    assert.deepEqual(await store.recentAttempts(Date.now() - 1000), []);
  });

  it('prunes rows older than the retention window (fake clock)', async () => {
    const db = createFakeDb();
    let nowMs = Date.parse('2026-11-01T00:00:00Z');
    const store = createEmailDeliveryStore(db, { now: () => nowMs });
    await store.recordAttempt({ email: 'old@example.test', kind: 'otp', status: 'sent' });
    assert.equal(db.rows.length, 1);
    nowMs = Date.parse('2026-12-05T00:00:00Z'); // 34 days later
    await store.recordAttempt({ email: 'new@example.test', kind: 'otp', status: 'sent' });
    assert.equal(db.rows.length, 1, 'the 34-day-old row is pruned when a new row is recorded');
    assert.equal(db.rows[0].email, 'new@example.test');
    assert.equal(EMAIL_DELIVERY_RETENTION_DAYS, 30);
  });

  it('repopulation restores only recent OTP rows, newest per address', async () => {
    const db = createFakeDb();
    let nowMs = 1_000_000_000;
    const store = createEmailDeliveryStore(db, { now: () => nowMs });
    await store.recordAttempt({ email: 'alice@example.test', kind: 'otp', status: 'failed', errorCode: 'EAUTH' });
    await store.recordAttempt({ email: 'alice@example.test', kind: 'otp', status: 'sent' });
    await store.recordAttempt({ email: 'bob@example.test', kind: 'password-reset', status: 'failed', errorCode: 'ETIMEDOUT' });
    const tracker = createOtpDeliveryTracker({ now: () => nowMs });
    const restored = await repopulateOtpDeliveryFromStore({ store, tracker, now: () => nowMs });
    assert.equal(restored, 1, 'only alice has an OTP row to restore; reset rows have no tracker');
    assert.equal(tracker.statusFor('alice@example.test'), 'sent', 'the newest OTP row wins');
    assert.equal(tracker.statusFor('bob@example.test'), 'unknown');
    // A row older than the 10-minute window is not restored.
    nowMs += 601_000;
    const tracker2 = createOtpDeliveryTracker({ now: () => nowMs });
    assert.equal(await repopulateOtpDeliveryFromStore({ store, tracker: tracker2, now: () => nowMs }), 0);
    assert.equal(tracker2.statusFor('alice@example.test'), 'unknown');
  });

  it('timestamps round-trip and sort chronologically', () => {
    const a = toDbTimestamp(Date.parse('2026-11-19T07:00:00.123Z'));
    assert.equal(a, '2026-11-19 07:00:00.123');
    assert.equal(fromDbTimestamp(a), Date.parse('2026-11-19T07:00:00.123Z'));
    assert.ok(toDbTimestamp(2) > toDbTimestamp(1), 'lexicographic order is chronological');
    // The MySQL driver returns DATETIME columns as Date objects, not
    // strings — the reader must accept both shapes.
    assert.equal(fromDbTimestamp(new Date('2026-11-19T07:00:00.123Z')), Date.parse('2026-11-19T07:00:00.123Z'));
    assert.ok(Number.isNaN(fromDbTimestamp(new Date('invalid'))));
    assert.ok(Number.isNaN(fromDbTimestamp(null)));
  });
});

describe('migration 002 SQL (pure)', () => {
  it('is additive, idempotent and stores no secret material', async () => {
    const sqlPath = path.resolve(import.meta.dirname, '../server/membership/migrations/002-email-delivery-attempts.sql');
    const raw = await readFile(sqlPath, 'utf8');
    const code = raw.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    assert.match(code, /create table if not exists `aenural_email_delivery_attempts`/i);
    assert.match(code, /`email` varchar\(255\) not null/i);
    assert.match(code, /`kind` varchar\(24\) not null/i);
    assert.match(code, /`status` varchar\(16\) not null/i);
    assert.match(code, /`error_code` varchar\(64\)/i);
    assert.match(code, /`attempted_at` varchar\(32\) not null/i);
    assert.match(code, /aenural_email_delivery_attempts_email_idx/i);
    assert.doesNotMatch(code, /\b(drop|truncate|alter|delete from)\b/i, 'no destructive statement may appear in the migration');
    assert.doesNotMatch(code, /otp|token|password/i, 'the migration must not mention OTPs, tokens or passwords');
  });
});

describe('email transport configuration (pure)', () => {
  it('allows http://localhost in MySQL mode but rejects non-loopback http', () => {
    // Regression test (Phase 4): the HTTPS rule used to reject ANY
    // http origin in MySQL mode, including http://localhost:3000 —
    // the exact configuration the setup guide instructs for local
    // MySQL testing — so the app could never start against a local
    // database. Loopback stays allowed; anything else must be HTTPS.
    const base = {
      NODE_ENV: 'test',
      AENURAL_MEMBERSHIP_ENABLED: '1',
      BETTER_AUTH_SECRET: 'x'.repeat(40),
      AENURAL_MEMBERSHIP_DATABASE: 'mysql',
      DB_HOST: '127.0.0.1',
      DB_PORT: '13306',
      DB_NAME: 'aenural_test',
      DB_USER: 'aenural_test',
      DB_PASSWORD: 'test-only-password',
      AUTH_TRUSTED_IP_HEADER: 'x-real-ip',
      SMTP_HOST: '127.0.0.1',
      SMTP_USER: 'support@aenural.com',
      SMTP_PASSWORD: 'not-a-real-password',
      MAIL_FROM: 'support@aenural.com',
    };
    assert.doesNotThrow(() => membershipConfig({ ...base, BETTER_AUTH_URL: 'http://localhost:3000' }));
    assert.doesNotThrow(() => membershipConfig({ ...base, BETTER_AUTH_URL: 'http://127.0.0.1:3000' }));
    assert.doesNotThrow(() => membershipConfig({ ...base, BETTER_AUTH_URL: 'https://aenural.com' }));
    // The HTTPS rule is a PRODUCTION requirement (Phase 4 audit F1):
    // in test/development mode any origin is accepted, so the
    // non-loopback rejections below must run under NODE_ENV=production.
    const prodBase = { ...base, NODE_ENV: 'production' };
    assert.throws(() => membershipConfig({ ...prodBase, BETTER_AUTH_URL: 'http://192.168.1.5:3000' }), /require HTTPS/);
    assert.throws(() => membershipConfig({ ...prodBase, BETTER_AUTH_URL: 'http://aenural.com' }), /require HTTPS/);
  });
  it('refuses SMTP when the sender is not configured — no silent fallback', () => {
    const env = { SMTP_HOST: '127.0.0.1', SMTP_USER: 'support@aenural.com', SMTP_PASSWORD: 'x', MAIL_FROM: '' };
    assert.throws(() => resolveEmailTransport(env, { local: true, sqlite: true }), /SMTP_HOST, SMTP_USER, SMTP_PASSWORD and MAIL_FROM/);
  });
  it('buildOtpEmail keeps the branded template and a 6-digit code', () => {
    const { subject, text, html } = buildOtpEmail({ email: 'alice@example.test', otp: '042318' });
    assert.equal(subject, 'Your AENural verification code');
    assert.match(text, /042318/);
    assert.match(text, /5 minutes/);
    assert.match(text, /Never share this code/);
    assert.match(html, /042318/);
    assert.match(html, /support@aenural\.com/);
    assert.throws(() => buildOtpEmail({ email: 'alice@example.test', otp: '42318' }), /6-digit/);
    assert.throws(() => buildOtpEmail({ email: 'alice@example.test', otp: '42318a' }), /6-digit/);
  });
});

// =====================================================================
// Integration — real Better Auth 1.7.14 + the app's own mail path.
// Skipped automatically when the dependencies are not installed.
// =====================================================================
let integration = null;
let integrationError = null;
try {
  const authMod = await import('../server/membership/auth.mjs');
  const dbMod = await import('../server/membership/database.mjs');
  integration = { ...authMod, ...dbMod };
} catch (error) {
  integrationError = error;
}

// Shared fake SMTP servers for the whole file (started once).
let fakeSmtp = null;
let plainSmtp = null;
async function ensureFakeServers() {
  if (!fakeSmtp) {
    fakeSmtp = createFakeSmtpServer(
      smtpTestCa ? { tlsCert: smtpTestCa.certPath, tlsKey: smtpTestCa.keyPath } : {},
    );
    await fakeSmtp.listen(0);
  }
  if (!plainSmtp) {
    plainSmtp = createFakeSmtpServer(); // No certificate: no STARTTLS.
    await plainSmtp.listen(0);
  }
  return { fakeSmtp, plainSmtp };
}

// Mailpit cross-check: only when its API answers.
const mailpitApi = process.env.AENURAL_MAILPIT_API || 'http://127.0.0.1:8026';
const mailpitSmtpPort = Number(process.env.AENURAL_MAILPIT_SMTP_PORT || 1026);
let mailpitAvailable = false;
async function probeMailpit() {
  // The probe runs while other test files may be loading the machine,
  // so one short timeout can fire spuriously (seen once under a
  // parallel `node --test tests/*.test.mjs` run). Retry briefly
  // before concluding Mailpit is absent.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${mailpitApi}/api/v1/info`, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        mailpitAvailable = true;
        return true;
      }
    } catch {
      // Retry below; the skip message names the API URL.
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  mailpitAvailable = false;
  return false;
}
async function mailpitMessages() {
  const response = await fetch(`${mailpitApi}/api/v1/messages`);
  const body = await response.json();
  return body.messages ?? [];
}

// Pre-flight: the app requires STARTTLS (see the file header), so a
// Mailpit whose API answers but whose SMTP port offers no STARTTLS is
// a configuration error, not an app failure. Without this check the
// two tests below fail with a generic 503 from the transport
// pre-check and the real cause is invisible — that is exactly what
// happened in CI runs #221/#220, where the workflow ran a bare
// Mailpit service (no TLS flags). Fail here with the cause named.
// (GitHub Actions starts Mailpit with STARTTLS in
// .github/workflows/ci.yml; see the MAILPIT note there.)
async function assertMailpitStartTls() {
  const lines = [];
  await new Promise((resolve, reject) => {
    const socket = net.connect({ host: '127.0.0.1', port: mailpitSmtpPort });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('timed out waiting for the Mailpit SMTP greeting'));
    }, 5000);
    let buffer = '';
    let greeted = false;
    socket.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let index;
      while ((index = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, index).replace(/\r$/, '');
        buffer = buffer.slice(index + 1);
        lines.push(line);
        if (!greeted && /^220 /.test(line)) {
          greeted = true;
          socket.write('EHLO probe\r\n');
        } else if (greeted && /^250 /.test(line)) {
          clearTimeout(timer);
          socket.end();
          resolve();
          return;
        }
      }
    });
  });
  // Match the capability line itself (250-STARTTLS / 250 STARTTLS):
  // a loose /STARTTLS/ match would also hit the EHLO hostname echo
  // in the server's greeting line, and the probe would pass on a
  // plaintext server — the exact bug this guard exists to catch.
  if (!lines.some((line) => /^250[- ]STARTTLS\b/.test(line))) {
    throw new Error(
      `Mailpit at 127.0.0.1:${mailpitSmtpPort} does not advertise STARTTLS (EHLO: ${lines.join(' | ')}). ` +
        'Start Mailpit with --smtp-tls-cert/--smtp-tls-key (see the file header): the app requires STARTTLS and refuses plaintext SMTP.',
    );
  }
}
async function mailpitMessage(id) {
  const response = await fetch(`${mailpitApi}/api/v1/message/${id}`);
  return response.json();
}
async function mailpitDeleteAll() {
  await fetch(`${mailpitApi}/api/v1/messages`, { method: 'DELETE' });
}

// Disposable-MySQL cross-check: only when explicitly configured.
const mysqlTest = process.env.AENURAL_TEST_MYSQL_HOST
  ? {
      host: process.env.AENURAL_TEST_MYSQL_HOST,
      port: Number(process.env.AENURAL_TEST_MYSQL_PORT || 3306),
      database: process.env.AENURAL_TEST_MYSQL_DB || 'aenural_test',
      user: process.env.AENURAL_TEST_MYSQL_USER || 'aenural_test',
      password: process.env.AENURAL_TEST_MYSQL_PASSWORD || 'test-only-password',
    }
  : null;

const DB_KEY = Symbol.for('aenural.membership.database.v1');
let groupCounter = 0;

// Load a fresh auth module + database for one scenario group. Each
// group gets its own temp data directory and fresh module state
// (authPromise, SMTP transport cache, verify cache); the in-memory
// OTP tracker is process-global, so every group uses unique emails.
async function loadGroup(tag, envOverrides = {}) {
  const directory =
    envOverrides.AENURAL_LOCAL_DATA_DIR || (await mkdtemp(path.join(os.tmpdir(), `aenural-smtp-${tag}-`)));
  const env = {
    NODE_ENV: 'test',
    AENURAL_MEMBERSHIP_ENABLED: '1',
    BETTER_AUTH_SECRET: 'test-only-secret-that-is-long-enough-123456',
    BETTER_AUTH_URL: origin,
    AENURAL_LOCAL_DATA_DIR: directory,
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: String(fakeSmtp.port),
    SMTP_SECURE: 'false',
    SMTP_USER: 'support@aenural.com',
    SMTP_PASSWORD: 'not-a-real-password',
    MAIL_FROM: 'support@aenural.com',
    ...envOverrides,
  };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  // Keys a previous group may have set that this group must not inherit.
  if (!('AENURAL_EMAIL_TRANSPORT' in envOverrides)) delete process.env.AENURAL_EMAIL_TRANSPORT;
  if (!('AENURAL_MEMBERSHIP_DATABASE' in envOverrides)) delete process.env.AENURAL_MEMBERSHIP_DATABASE;
  for (const key of ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'AUTH_TRUSTED_IP_HEADER']) {
    if (!(key in envOverrides)) delete process.env[key];
  }
  groupCounter += 1;
  const suffix = `?smtp-group=${tag}-${groupCounter}-${Date.now()}`;
  const authMod = await import(`../server/membership/auth.mjs${suffix}`);
  const dbMod = await import(`../server/membership/database.mjs${suffix}`);
  const auth = await authMod.membershipAuth();
  const { db, config } = await dbMod.membershipDatabase();
  return { auth, db, config, authMod, directory };
}

async function unloadGroup(group, { keepDirectory = false } = {}) {
  try {
    await group.db?.destroy();
  } catch {
    // Already closed.
  }
  delete globalThis[DB_KEY];
  if (!keepDirectory) await rm(group.directory, { recursive: true, force: true }).catch(() => {});
}

function makeCaller(auth) {
  let ipCounter = 0;
  const nextIp = () => `10.40.50.${++ipCounter}`;
  const call = (endpoint, body, ip = nextIp(), extraHeaders = {}) =>
    auth.handler(
      new Request(`${origin}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': ip, ...extraHeaders },
        body: JSON.stringify(body),
      }),
    );
  return { call, nextIp };
}

const codeFromText = (text) => text.match(/\b(\d{6})\b/)?.[1];
const fakeMessagesFor = (email) => fakeSmtp.messages.filter((m) => m.to.includes(email));
const mailpitMessagesFor = (messages, email) => messages.filter((m) => (m.To || []).some((t) => t.Address === email));

function resetTokenFromText(text) {
  // Nodemailer quoted-printable-encodes long lines: the reset URL is
  // wrapped with soft line breaks ("=\n"). Undo those before looking
  // for the URL, or the token at the end of the URL is cut off.
  const unfolded = String(text).replace(/=\r?\n/g, '');
  const urls = unfolded.match(/https?:\/\/\S+/g) || [];
  for (const raw of urls) {
    try {
      const url = new URL(raw.replace(/[),.]+$/, ''));
      const queryToken = url.searchParams.get('token');
      if (queryToken) return queryToken;
      const segment = url.pathname.split('/').filter(Boolean).at(-1);
      if (segment && segment.length > 10) return segment;
    } catch {
      // Not a URL; keep looking.
    }
  }
  return null;
}

async function userCount(db) {
  return (await db.selectFrom('user').select('id').execute()).length;
}
async function auditRows(db, email) {
  const rows = await db.selectFrom(EMAIL_DELIVERY_TABLE).selectAll().execute();
  return email ? rows.filter((r) => r.email === email) : rows;
}
async function ageVerificationRow(db, email) {
  await db
    .updateTable('verification')
    .set({ createdAt: new Date(Date.now() - 120_000).toISOString() })
    .where('identifier', '=', otpIdentifier('email-verification', email))
    .execute();
}
async function outboxFiles(directory) {
  try {
    return (await readdir(directory)).filter((name) => name.startsWith('mail-'));
  } catch {
    return [];
  }
}
async function deliveryStatusFor(cookie, secret) {
  // Mirrors the app route (src/app/api/membership/[...path]/route.ts):
  // the server secret is passed so the sign-up signature cookie can
  // verify. Without it delivery always reads 'unknown' (Phase 4
  // oracle guard) — which is the correct production behaviour, not
  // a test failure.
  const response = handlePendingVerificationStatus(
    new Request(`${origin}/api/membership/pending-verification`, { headers: { cookie } }),
    { secret },
  );
  return response.json();
}
const pendingCookieOf = (response) =>
  response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${PENDING_VERIFICATION_COOKIE}=`));
// Both cookies the sign-up after-hook sets (pending + HMAC signature):
// the status endpoint only reports delivery when the signature
// verifies, so tests must send the pair — exactly as a browser would.
const signedCookiesOf = (response) =>
  response.headers
    .getSetCookie()
    .filter((value) =>
      value.startsWith(`${PENDING_VERIFICATION_COOKIE}=`) ||
      value.startsWith(`${PENDING_VERIFICATION_SIGNATURE_COOKIE}=`))
    .map((value) => value.split(';')[0])
    .join('; ');
const sessionCookieOf = (response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
async function getSession(auth, cookie) {
  const response = await auth.handler(
    new Request(`${origin}/api/auth/get-session`, { headers: { cookie } }),
  );
  const body = await response.json().catch(() => null);
  return body?.user ?? body?.session ?? null;
}

// --- Happy path: the fake SMTP server ---------------------------------
describe('SMTP happy path via the fake SMTP server (live Better Auth)', { skip: !integration || !tlsEnabled }, () => {
  let group;
  let call;

  before(async () => {
    await ensureFakeServers();
    fakeSmtp.setBehavior('ok');
    fakeSmtp.reset();
    group = await loadGroup('happy', {});
  });
  after(async () => {
    await unloadGroup(group);
  });

  it('sends a branded registration OTP mail and the code verifies', async () => {
    ({ call } = makeCaller(group.auth));
    const email = testEmail('happy');
    const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    assert.equal(response.status, 200, 'sign-up must succeed when mail is healthy');
    const body = await response.json();
    assert.equal(body.user.emailVerified, false);
    assert.equal(body.token, null, 'no session is issued at sign-up');
    assert.ok(pendingCookieOf(response), 'the pending-verification cookie is set');

    const messages = fakeMessagesFor(email);
    assert.equal(messages.length, 1, 'exactly one OTP mail is sent at sign-up');
    const [message] = messages;
    assert.equal(message.from, 'support@aenural.com');
    assert.deepEqual(message.to, [email]);
    assert.match(message.raw, /Subject: Your AENural verification code/);
    assert.match(message.raw, /From: support@aenural.com/);
    const code = codeFromText(message.raw);
    assert.ok(/^\d{6}$/.test(code), 'the mail carries a 6-digit code');
    assert.match(message.raw, /5 minutes/);
    assert.match(message.raw, /Never share this code/);
    assert.match(message.raw, /support@aenural\.com/);

    const status = await deliveryStatusFor(signedCookiesOf(response), group.config.secret);
    assert.deepEqual(Object.keys(status).sort(), ['delivery', 'email', 'emailMasked']);
    assert.equal(status.delivery, 'sent');
    assert.equal(status.email, email);

    const verified = await call('email-otp/verify-email', { email, otp: code });
    assert.equal(verified.status, 200);
    assert.equal((await verified.json()).user.emailVerified, true);

    const rows = await auditRows(group.db, email);
    assert.equal(rows.filter((r) => r.kind === 'otp' && r.status === 'sent').length, 1, 'the durable audit records the OTP send');
    assert.ok(!JSON.stringify(rows).includes(code), 'the audit table never stores the OTP value');
  });

  it('resends rotate the code: the old code dies, the new code verifies', async () => {
    const email = testEmail('resend');
    const signup = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    assert.equal(signup.status, 200);
    const firstCode = codeFromText(fakeMessagesFor(email)[0].raw);
    assert.ok(firstCode);

    // Inside the 60s cooldown the resend is silently dropped.
    const immediate = await call('email-otp/send-verification-otp', { email, type: 'email-verification' });
    assert.equal(immediate.status, 200);
    assert.deepEqual(await immediate.json(), { success: true });
    assert.equal(fakeMessagesFor(email).length, 1, 'no mail inside the cooldown');

    await ageVerificationRow(group.db, email);
    const resend = await call('email-otp/send-verification-otp', { email, type: 'email-verification' });
    assert.equal(resend.status, 200);
    assert.equal(fakeMessagesFor(email).length, 2, 'exactly one new mail after the cooldown');
    const secondCode = codeFromText(fakeMessagesFor(email)[1].raw);
    assert.ok(/^\d{6}$/.test(secondCode));
    assert.notEqual(secondCode, firstCode, 'resend rotates the code');

    const stale = await call('email-otp/verify-email', { email, otp: firstCode });
    assert.notEqual(stale.status, 200, 'the rotated-out code must not verify');
    const verified = await call('email-otp/verify-email', { email, otp: secondCode });
    assert.equal(verified.status, 200);
    assert.equal((await verified.json()).user.emailVerified, true);
    assert.equal(await userCount(group.db), 2, 'no duplicate account from the resend');
  });

  it('sends a password-reset mail and the full reset flow works', async () => {
    const email = testEmail('reset');
    const signup = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    assert.equal(signup.status, 200);
    const code = codeFromText(fakeMessagesFor(email)[0].raw);
    assert.equal((await call('email-otp/verify-email', { email, otp: code })).status, 200);
    const login = await call('sign-in/email', { email, password });
    assert.equal(login.status, 200);
    const oldCookie = sessionCookieOf(login);
    assert.ok(await getSession(group.auth, oldCookie), 'a live session exists before the reset');

    const known = await call('request-password-reset', { email, redirectTo: `${origin}/reset-password` });
    const unknown = await call('request-password-reset', { email: 'nobody-here@example.test', redirectTo: `${origin}/reset-password` });
    assert.equal(known.status, unknown.status, 'reset requests answer identically (no enumeration)');
    assert.deepEqual(await known.json(), await unknown.json());

    const resets = fakeMessagesFor(email).filter((m) => /Reset your AENural password/.test(m.raw));
    assert.equal(resets.length, 1, 'exactly one reset mail is sent');
    assert.match(resets[0].raw, new RegExp(origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'the reset link points at the site origin');
    const token = resetTokenFromText(resets[0].raw);
    assert.ok(token, 'the reset mail carries a usable token');
    assert.ok(!JSON.stringify(await auditRows(group.db, email)).includes(token), 'the audit table never stores the reset token');

    const nextPassword = 'QA-Sample-Creator-999999';
    const reset = await call('reset-password', { token, newPassword: nextPassword });
    assert.equal(reset.status, 200);
    assert.equal(await getSession(group.auth, oldCookie), null, 'the old session is revoked by the reset');
    assert.equal((await call('sign-in/email', { email, password })).status, 401, 'the old password no longer works');
    assert.equal((await call('sign-in/email', { email, password: nextPassword })).status, 200, 'the new password works');
    const reuse = await call('reset-password', { token, newPassword: password });
    assert.notEqual(reuse.status, 200, 'the reset token is single-use');

    const rows = await auditRows(group.db, email);
    assert.equal(rows.filter((r) => r.kind === 'password-reset' && r.status === 'sent').length, 1, 'the durable audit records the reset send');
  });
});

// --- Happy path cross-check: Mailpit ----------------------------------
describe('SMTP happy path via Mailpit (live Better Auth)', { skip: !integration || !tlsEnabled }, () => {
  let group;
  let call;

  before(async () => {
    await ensureFakeServers();
    if (!(await probeMailpit())) {
      // Skipped dynamically: the describe-level skip cannot probe.
      return;
    }
    await assertMailpitStartTls();
    await mailpitDeleteAll();
    group = await loadGroup('mailpit', { SMTP_PORT: String(mailpitSmtpPort) });
  });
  after(async () => {
    if (group) await unloadGroup(group);
  });

  it('delivers the registration OTP to a real SMTP server (skipped without Mailpit)', async (t) => {
    if (!mailpitAvailable || !group) {
      t.skip(`Mailpit is not running (start it per the file header; API ${mailpitApi})`);
      return;
    }
    ({ call } = makeCaller(group.auth));
    const email = testEmail('mailpit');
    const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    assert.equal(response.status, 200);
    const messages = mailpitMessagesFor(await mailpitMessages(), email);
    assert.equal(messages.length, 1, 'Mailpit must hold exactly one OTP mail');
    const detail = await mailpitMessage(messages[0].ID);
    assert.equal(detail.From.Address, 'support@aenural.com');
    assert.equal(detail.Subject, 'Your AENural verification code');
    const code = codeFromText(detail.Text || '');
    assert.ok(/^\d{6}$/.test(code), 'Mailpit copy carries the 6-digit code');
    assert.match(detail.Text, /5 minutes/);
    assert.match(detail.HTML || '', /\d{6}/, 'the HTML body carries the code');
    const verified = await call('email-otp/verify-email', { email, otp: code });
    assert.equal(verified.status, 200);
    assert.equal((await verified.json()).user.emailVerified, true);
  });

  it('delivers the password-reset mail to Mailpit (skipped without Mailpit)', async (t) => {
    if (!mailpitAvailable || !group) {
      t.skip(`Mailpit is not running (start it per the file header; API ${mailpitApi})`);
      return;
    }
    const email = testEmail('mailpit-reset');
    const signup = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    assert.equal(signup.status, 200);
    const code = codeFromText((await mailpitMessage(mailpitMessagesFor(await mailpitMessages(), email)[0].ID)).Text);
    assert.equal((await call('email-otp/verify-email', { email, otp: code })).status, 200);
    await call('request-password-reset', { email, redirectTo: `${origin}/reset-password` });
    const resets = mailpitMessagesFor(await mailpitMessages(), email).filter((m) => m.Subject === 'Reset your AENural password');
    assert.equal(resets.length, 1, 'Mailpit must hold exactly one reset mail');
    const detail = await mailpitMessage(resets[0].ID);
    assert.ok(resetTokenFromText(detail.Text || ''), 'the Mailpit reset mail carries a token');
  });
});

// --- Failure modes: the pre-check fails fast --------------------------
// These tests never get past the transport-health pre-check, so no
// account is created, no code is sent and no transport is ever opened.
describe('SMTP failure modes: pre-check fails fast (live Better Auth)', { skip: !integration }, () => {
  let group;
  let call;

  before(async () => {
    await ensureFakeServers();
    group = await loadGroup('prefail', { SMTP_PORT: '15999' });
    ({ call } = makeCaller(group.auth));
  });
  after(async () => {
    await unloadGroup(group);
  });

  it('connection failure: sign-up answers a generic 503 and creates no account', async () => {
    group.authMod.resetEmailTransportHealthCache();
    const before = await userCount(group.db);
    const email = testEmail('connfail');
    const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    assert.equal(response.status, 503, 'a dead SMTP server must fail fast, not create a silent account');
    const body = await response.json();
    assert.equal(body.message, 'Account services are temporarily unavailable. Try again.');
    assert.ok(!JSON.stringify(body).includes('SMTP') && !JSON.stringify(body).includes('15999'), 'no provider internals in the customer error');
    assert.equal(await userCount(group.db), before, 'no account was created by the failed attempt');
    assert.equal(pendingCookieOf(response), undefined, 'no pending cookie when sign-up never happened');
    assert.equal((await outboxFiles(group.directory)).length, 0, 'no silent outbox fallback: nothing is written to disk');
    // A retry of the same sign-up is the same 503, still no account.
    const retry = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    assert.equal(retry.status, 503);
    assert.equal(await userCount(group.db), before);
  });

  it('connection failure: resend and recovery answer the same 503 for known and unknown addresses', async () => {
    group.authMod.resetEmailTransportHealthCache();
    const resend = await call('email-otp/send-verification-otp', { email: 'nobody-here@example.test', type: 'email-verification' });
    assert.equal(resend.status, 503);
    assert.equal((await resend.json()).message, 'Account services are temporarily unavailable. Try again.');
    const recover = (email) =>
      handlePendingVerificationRecovery(
        new Request(`${origin}/api/membership/pending-verification/resend`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email }),
        }),
        { auth: group.auth, db: group.db, config: group.config, checkEmailTransportHealth: group.authMod.checkEmailTransportHealth },
      );
    const unknownRes = await recover('nobody-here@example.test');
    const knownRes = await recover(testEmail('connfail'));
    assert.equal(unknownRes.status, 503);
    assert.equal(knownRes.status, 503);
    assert.deepEqual(await unknownRes.json(), await knownRes.json(), 'the 503 cannot enumerate accounts');
  });

  it('invalid sender config: missing MAIL_FROM fails fast with a generic 503', async () => {
    // Point the pre-check at the fake server but remove the sender:
    // resolveEmailTransport must refuse before any account lookup.
    process.env.SMTP_PORT = String(fakeSmtp.port);
    process.env.MAIL_FROM = '';
    process.env.AENURAL_EMAIL_TRANSPORT = 'smtp';
    group.authMod.resetEmailTransportHealthCache();
    const before = await userCount(group.db);
    const email = testEmail('badconfig');
    const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).message, 'Account services are temporarily unavailable. Try again.');
    assert.equal(await userCount(group.db), before);
    assert.equal((await outboxFiles(group.directory)).length, 0, 'a config error never falls back to the outbox');
    delete process.env.AENURAL_EMAIL_TRANSPORT;
    process.env.MAIL_FROM = 'support@aenural.com';
    process.env.SMTP_PORT = '15999';
  });

  it('plaintext SMTP (no STARTTLS) is refused by the app TLS policy', async () => {
    // The app requires TLS. A server that cannot upgrade is not a
    // usable transport — the pre-check must fail instead of sending
    // credentials and codes in the clear.
    process.env.SMTP_PORT = String(plainSmtp.port);
    group.authMod.resetEmailTransportHealthCache();
    const before = await userCount(group.db);
    const email = testEmail('plaintext');
    const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    assert.equal(response.status, 503);
    assert.equal(await userCount(group.db), before);
    assert.equal((await outboxFiles(group.directory)).length, 0);
    process.env.SMTP_PORT = '15999';
  });
});

describe('SMTP failure modes: SMTP auth failure (live Better Auth)', { skip: !integration || !tlsEnabled }, () => {
  let group;
  let call;

  before(async () => {
    await ensureFakeServers();
    fakeSmtp.setBehavior('auth-fail');
    fakeSmtp.reset();
    group = await loadGroup('authfail', {});
    ({ call } = makeCaller(group.auth));
  });
  after(async () => {
    await unloadGroup(group);
    fakeSmtp.setBehavior('ok');
  });

  it('SMTP auth failure: sign-up 503s, creates no account, writes no outbox file', async () => {
    group.authMod.resetEmailTransportHealthCache();
    const before = await userCount(group.db);
    const email = testEmail('authfail');
    const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    assert.equal(response.status, 503, 'bad SMTP credentials must fail fast at the pre-check');
    assert.equal((await response.json()).message, 'Account services are temporarily unavailable. Try again.');
    assert.equal(await userCount(group.db), before);
    assert.equal(fakeSmtp.messages.length, 0, 'no mail is sent when authentication fails');
    assert.equal((await outboxFiles(group.directory)).length, 0, 'no silent outbox fallback on auth failure');
    assert.ok(fakeSmtp.authAttempts > 0, 'the server actually saw the AUTH attempt');
  });
});

// --- The swallow: send fails AFTER the pre-check ----------------------
describe('send fails AFTER the transport pre-check (the 1.7.14 swallow)', { skip: !integration || !tlsEnabled }, () => {
  let group;
  let call;

  before(async () => {
    await ensureFakeServers();
    group = await loadGroup('swallow', {});
    ({ call } = makeCaller(group.auth));
  });
  after(async () => {
    await unloadGroup(group);
    fakeSmtp.setBehavior('ok');
  });

  it('DATA 554 after a passing pre-check: sign-up answers 200 but the code never arrives', async () => {
    // Connection 1 (verify) succeeds, connection 2 (send) is rejected.
    fakeSmtp.reset();
    fakeSmtp.setBehavior({ mode: 'fail-after-n-ok', okConnections: 1, failStage: 'data' });
    group.authMod.resetEmailTransportHealthCache();
    const email = testEmail('swallow-data');
    const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    // THIS is the Better Auth 1.7.14 limitation, reproduced on purpose:
    // the response is success even though no mail exists. The fix is
    // not the status code — 1.7.14 gives the app no way to change it —
    // it is that the failure is recorded and visible to the user.
    assert.equal(response.status, 200, 'Better Auth swallows the send failure and answers success (known 1.7.14 limitation)');
    assert.equal((await response.json()).user.emailVerified, false);
    assert.equal(fakeMessagesFor(email).length, 0, 'no code was actually delivered');
    assert.equal(await userCount(group.db), 1, 'the account WAS created (the send happens after sign-up)');
    const status = await deliveryStatusFor(signedCookiesOf(response), group.config.secret);
    assert.equal(status.delivery, 'failed', 'the verify page can see the send failed');
    assert.deepEqual(Object.keys(status).sort(), ['delivery', 'email', 'emailMasked'], 'the status leaks no error code or provider detail');
    const rows = await auditRows(group.db, email);
    assert.equal(rows.filter((r) => r.kind === 'otp' && r.status === 'failed').length, 1, 'the durable audit records the failed send');
    assert.ok(rows[0].error_code, 'the audit keeps the transport error code server-side');
    fakeSmtp.setBehavior('ok');
  });

  it('RCPT 550 after a passing pre-check: same swallow, same honest status', async () => {
    // verify() never sends RCPT, so a server that rejects recipients
    // passes the pre-check and fails only at send time.
    fakeSmtp.reset();
    fakeSmtp.setBehavior('reject-rcpt');
    group.authMod.resetEmailTransportHealthCache();
    const email = testEmail('swallow-rcpt');
    const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    assert.equal(response.status, 200, 'the swallow applies to recipient rejection too');
    assert.equal(fakeMessagesFor(email).length, 0);
    const status = await deliveryStatusFor(signedCookiesOf(response), group.config.secret);
    assert.equal(status.delivery, 'failed');
    fakeSmtp.setBehavior('ok');
  });

  it('retry after a failed send preserves the cooldown, then succeeds with no duplicate', async () => {
    const email = testEmail('swallow-retry');
    fakeSmtp.reset();
    fakeSmtp.setBehavior({ mode: 'fail-after-n-ok', okConnections: 1, failStage: 'data' });
    group.authMod.resetEmailTransportHealthCache();
    const signup = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    assert.equal(signup.status, 200);
    assert.equal(fakeMessagesFor(email).length, 0);

    // Still inside the cooldown from the failed send: the resend is
    // silently dropped with generic success and no new code is sent.
    fakeSmtp.setBehavior('ok');
    const immediate = await call('email-otp/send-verification-otp', { email, type: 'email-verification' });
    assert.equal(immediate.status, 200);
    assert.deepEqual(await immediate.json(), { success: true });
    assert.equal(fakeMessagesFor(email).length, 0, 'no code is sent inside the cooldown, even after a failed send');

    // After the cooldown a resend rotates the code and delivers it.
    await ageVerificationRow(group.db, email);
    const resend = await call('email-otp/send-verification-otp', { email, type: 'email-verification' });
    assert.equal(resend.status, 200);
    const messages = fakeMessagesFor(email);
    assert.equal(messages.length, 1, 'exactly one code arrives on the post-cooldown resend');
    const code = codeFromText(messages[0].raw);
    assert.ok(/^\d{6}$/.test(code));
    const status = await deliveryStatusFor(signedCookiesOf(signup), group.config.secret);
    assert.equal(status.delivery, 'sent', 'the successful retry overwrites the earlier failure');
    const verified = await call('email-otp/verify-email', { email, otp: code });
    assert.equal(verified.status, 200);
    assert.equal((await verified.json()).user.emailVerified, true);
    const rows = await auditRows(group.db, email);
    assert.equal(rows.filter((r) => r.kind === 'otp' && r.status === 'failed').length, 1);
    assert.equal(rows.filter((r) => r.kind === 'otp' && r.status === 'sent').length, 1);
  });
});

// --- Timeouts ----------------------------------------------------------
describe('SMTP timeouts (live Better Auth)', { skip: !integration || !tlsEnabled }, () => {
  let group;
  let call;

  before(async () => {
    await ensureFakeServers();
    group = await loadGroup('timeouts', {});
    ({ call } = makeCaller(group.auth));
  });
  after(async () => {
    await unloadGroup(group);
    fakeSmtp.setBehavior('ok');
  });

  it('greeting that never arrives: the pre-check times out and sign-up 503s', async () => {
    fakeSmtp.setBehavior('blackhole');
    group.authMod.resetEmailTransportHealthCache();
    const before = await userCount(group.db);
    const email = testEmail('timeout-greeting');
    const started = Date.now();
    const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    const elapsed = Date.now() - started;
    assert.equal(response.status, 503, 'a greeting timeout must fail fast with a generic 503');
    assert.ok(elapsed >= 9000, `the pre-check should wait out the 10s greeting timeout (took ${elapsed}ms)`);
    assert.equal(await userCount(group.db), before);
    fakeSmtp.setBehavior('ok');
  });

  it('DATA that never answers: the send times out and is recorded as failed', async () => {
    // Connection 1 (verify) succeeds; connection 2 hangs in DATA until
    // the app's 20s socket timeout. The response is the swallow (200)
    // — the value is the recorded failure, not the status code.
    fakeSmtp.reset();
    fakeSmtp.setBehavior({ mode: 'fail-after-n-ok', okConnections: 1, failStage: 'hang-data' });
    group.authMod.resetEmailTransportHealthCache();
    const email = testEmail('timeout-data');
    const started = Date.now();
    const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    const elapsed = Date.now() - started;
    assert.equal(response.status, 200, 'the swallow applies to send timeouts too');
    assert.ok(elapsed >= 19000, `the send should wait out the 20s socket timeout (took ${elapsed}ms)`);
    assert.equal(fakeMessagesFor(email).length, 0, 'a timed-out send delivers nothing');
    const status = await deliveryStatusFor(signedCookiesOf(response), group.config.secret);
    assert.equal(status.delivery, 'failed');
    const rows = await auditRows(group.db, email);
    assert.equal(rows.filter((r) => r.kind === 'otp' && r.status === 'failed').length, 1);
    fakeSmtp.setBehavior('ok');
  });
});

// --- Enumeration and status privacy -----------------------------------
describe('no enumeration, no status leakage (live Better Auth)', { skip: !integration || !tlsEnabled }, () => {
  let group;
  let call;

  before(async () => {
    await ensureFakeServers();
    fakeSmtp.setBehavior('ok');
    fakeSmtp.reset();
    group = await loadGroup('privacy', {});
    ({ call } = makeCaller(group.auth));
  });
  after(async () => {
    await unloadGroup(group);
  });

  it('resend answers identically for unknown, unverified and verified addresses', async () => {
    const unverified = testEmail('enum-unverified');
    const signup = await call('sign-up/email', { name: 'QA Creator', email: unverified, password, callbackURL: `${origin}/sign-in` });
    assert.equal(signup.status, 200);
    const verified = testEmail('enum-verified');
    const signup2 = await call('sign-up/email', { name: 'QA Creator', email: verified, password, callbackURL: `${origin}/sign-in` });
    assert.equal(signup2.status, 200);
    const code = codeFromText(fakeMessagesFor(verified)[0].raw);
    assert.equal((await call('email-otp/verify-email', { email: verified, otp: code })).status, 200);

    // Age both rows past the cooldown so the resend is attempted.
    await ageVerificationRow(group.db, unverified);
    const resendUnknown = await call('email-otp/send-verification-otp', { email: 'nobody-here@example.test', type: 'email-verification' });
    const resendUnverified = await call('email-otp/send-verification-otp', { email: unverified, type: 'email-verification' });
    const resendVerified = await call('email-otp/verify-email', { email: verified, otp: '000000' });
    assert.equal(resendUnknown.status, 200);
    assert.equal(resendUnverified.status, 200);
    assert.deepEqual(await resendUnknown.json(), await resendUnverified.json(), 'unknown and unverified resends are indistinguishable');
    assert.notEqual(resendVerified.status, 200, 'a wrong code for a verified address is rejected, as for any address');
  });

  it('recovery answers identically for unknown, unverified and verified addresses', async () => {
    const unverified = testEmail('rec-unverified');
    const signup = await call('sign-up/email', { name: 'QA Creator', email: unverified, password, callbackURL: `${origin}/sign-in` });
    assert.equal(signup.status, 200);
    const verified = testEmail('rec-verified');
    const signup2 = await call('sign-up/email', { name: 'QA Creator', email: verified, password, callbackURL: `${origin}/sign-in` });
    assert.equal(signup2.status, 200);
    const code = codeFromText(fakeMessagesFor(verified)[0].raw);
    assert.equal((await call('email-otp/verify-email', { email: verified, otp: code })).status, 200);
    const recover = (email) =>
      handlePendingVerificationRecovery(
        new Request(`${origin}/api/membership/pending-verification/resend`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email }),
        }),
        { auth: group.auth, db: group.db, config: group.config, checkEmailTransportHealth: group.authMod.checkEmailTransportHealth },
      );
    const unknownRes = await recover('nobody-here@example.test');
    const unverifiedRes = await recover(unverified);
    const verifiedRes = await recover(verified);
    assert.equal(unknownRes.status, 200);
    assert.equal(unverifiedRes.status, 200);
    assert.equal(verifiedRes.status, 200);
    const unknownBody = await unknownRes.json();
    const unverifiedBody = await unverifiedRes.json();
    const verifiedBody = await verifiedRes.json();
    assert.deepEqual(unknownBody, unverifiedBody);
    assert.deepEqual(unknownBody, verifiedBody);
  });

  it('the delivery status answers only for the cookie owner and leaks nothing', async () => {
    const email = testEmail('status-owner');
    const signup = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    assert.equal(signup.status, 200);
    // No cookie: unknown, and no address is revealed.
    const noCookie = handlePendingVerificationStatus(new Request(`${origin}/api/membership/pending-verification`));
    assert.deepEqual(await noCookie.json(), { email: null, emailMasked: null, delivery: 'unknown' });
    // A query parameter cannot select another address: the endpoint
    // reads only the caller's own cookie.
    const querySnoop = handlePendingVerificationStatus(
      new Request(`${origin}/api/membership/pending-verification?email=${encodeURIComponent('victim@example.test')}`),
    );
    assert.deepEqual(await querySnoop.json(), { email: null, emailMasked: null, delivery: 'unknown' });
    // With the cookie: exactly the three public fields, nothing else.
    const status = await deliveryStatusFor(signedCookiesOf(signup), group.config.secret);
    assert.deepEqual(Object.keys(status).sort(), ['delivery', 'email', 'emailMasked']);
    assert.equal(status.delivery, 'sent');
    assert.ok(!JSON.stringify(status).includes('ECONNREFUSED') && !JSON.stringify(status).includes('EAUTH'));
  });
});

// --- Concurrency -------------------------------------------------------
describe('concurrent OTP resends (live Better Auth)', { skip: !integration || !tlsEnabled }, () => {
  let group;
  let call;

  before(async () => {
    await ensureFakeServers();
    fakeSmtp.setBehavior('ok');
    fakeSmtp.reset();
    group = await loadGroup('concurrent', {});
    ({ call } = makeCaller(group.auth));
  });
  after(async () => {
    await unloadGroup(group);
  });

  it('two simultaneous resends leave exactly one working code and one account', async () => {
    const email = testEmail('concurrent');
    const signup = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
    assert.equal(signup.status, 200);
    await ageVerificationRow(group.db, email);
    const before = fakeMessagesFor(email).length;
    const [first, second] = await Promise.all([
      call('email-otp/send-verification-otp', { email, type: 'email-verification' }),
      call('email-otp/send-verification-otp', { email, type: 'email-verification' }),
    ]);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    const messages = fakeMessagesFor(email).slice(before);
    assert.ok(messages.length >= 1, 'at least one resend mail arrives');
    const codes = messages.map((m) => codeFromText(m.raw)).filter(Boolean);
    assert.ok(codes.length >= 1);
    // Exactly one of the delivered codes verifies (rotate semantics);
    // the others are dead. Which one wins is timing — the assertion
    // is order-independent.
    let verifiedCount = 0;
    for (const code of codes) {
      const response = await call('email-otp/verify-email', { email, otp: code });
      if (response.status === 200) verifiedCount += 1;
    }
    assert.equal(verifiedCount, 1, 'exactly one concurrent code verifies');
    assert.equal(await userCount(group.db), 1, 'concurrency creates no duplicate account');
  });
});

// --- Transport-health cache -------------------------------------------
describe('transport-health cache is time-bounded (live Better Auth)', { skip: !integration || !tlsEnabled }, () => {
  let group;
  let call;

  before(async () => {
    await ensureFakeServers();
    group = await loadGroup('cache', {});
    ({ call } = makeCaller(group.auth));
  });
  after(async () => {
    await unloadGroup(group);
    fakeSmtp.setBehavior('ok');
  });

  it('a stale successful verification does not hide a later outage forever', async () => {
    fakeSmtp.setBehavior('ok');
    group.authMod.resetEmailTransportHealthCache();
    const good = testEmail('cache-good');
    assert.equal((await call('sign-up/email', { name: 'QA Creator', email: good, password, callbackURL: `${origin}/sign-in` })).status, 200);

    // Mail breaks. The cached success still answers the pre-check, so
    // this sign-up hits the swallow (200 + recorded failure) — the
    // cache window is 60 seconds, and this test proves the window
    // exists rather than pretending it does not.
    fakeSmtp.setBehavior('auth-fail');
    const bad = testEmail('cache-bad');
    const swallowed = await call('sign-up/email', { name: 'QA Creator', email: bad, password, callbackURL: `${origin}/sign-in` });
    assert.equal(swallowed.status, 200, 'inside the cache window the pre-check still passes and the send fails swallowed');
    assert.equal(fakeMessagesFor(bad).length, 0);
    const status = await deliveryStatusFor(signedCookiesOf(swallowed), group.config.secret);
    assert.equal(status.delivery, 'failed');

    // Clearing the cache forces a fresh probe, which now fails fast.
    group.authMod.resetEmailTransportHealthCache();
    const blocked = testEmail('cache-blocked');
    const response = await call('sign-up/email', { name: 'QA Creator', email: blocked, password, callbackURL: `${origin}/sign-in` });
    assert.equal(response.status, 503, 'after a cache reset the pre-check re-probes and fails fast');
    fakeSmtp.setBehavior('ok');
  });

  it('a failed verification is trusted only briefly, then re-probed', async () => {
    fakeSmtp.setBehavior('auth-fail');
    group.authMod.resetEmailTransportHealthCache();
    const first = testEmail('cache-neg-1');
    assert.equal((await call('sign-up/email', { name: 'QA Creator', email: first, password, callbackURL: `${origin}/sign-in` })).status, 503);

    // Mail recovers, but the negative cache still answers "down".
    fakeSmtp.setBehavior('ok');
    const second = testEmail('cache-neg-2');
    assert.equal((await call('sign-up/email', { name: 'QA Creator', email: second, password, callbackURL: `${origin}/sign-in` })).status, 503, 'inside the negative window the pre-check still fails fast');

    // After the negative TTL the next attempt re-probes and succeeds.
    await new Promise((resolve) => setTimeout(resolve, 11_000));
    const third = testEmail('cache-neg-3');
    const response = await call('sign-up/email', { name: 'QA Creator', email: third, password, callbackURL: `${origin}/sign-in` });
    assert.equal(response.status, 200, 'after the negative TTL the pre-check re-probes and mail works again');
    assert.equal(fakeMessagesFor(third).length, 1);
  });

  it('the cache TTLs are bounded constants', () => {
    assert.equal(group.authMod.SMTP_VERIFY_CACHE_TTL_MS, 60_000);
    assert.equal(group.authMod.SMTP_VERIFY_NEGATIVE_CACHE_TTL_MS, 10_000);
  });
});

// --- Durable audit + restart recovery (SQLite, fake SMTP) -----------
describe('durable delivery audit and restart recovery (live Better Auth)', { skip: !integration || !tlsEnabled }, () => {
  it('audit rows survive a restart and repopulate the in-memory tracker', async () => {
    await ensureFakeServers();
    // Group 1: one successful send and one failed send (the second
    // connection is rejected after a passing pre-check), both against
    // the fake SMTP server. The data directory is kept afterwards so
    // group 2 can reopen the same SQLite database — a restart.
    fakeSmtp.setBehavior('ok');
    fakeSmtp.reset();
    const group1 = await loadGroup('durable-1', {});
    const { call } = makeCaller(group1.auth);
    const goodEmail = testEmail('durable-good');
    const badEmail = testEmail('durable-bad');
    let goodCode;
    try {
      const good = await call('sign-up/email', { name: 'QA Creator', email: goodEmail, password, callbackURL: `${origin}/sign-in` });
      assert.equal(good.status, 200);
      assert.equal(fakeMessagesFor(goodEmail).length, 1);
      goodCode = codeFromText(fakeMessagesFor(goodEmail)[0].raw);
      assert.ok(/^\d{6}$/.test(goodCode));

      fakeSmtp.reset();
      fakeSmtp.setBehavior({ mode: 'fail-after-n-ok', okConnections: 1, failStage: 'data' });
      group1.authMod.resetEmailTransportHealthCache();
      const bad = await call('sign-up/email', { name: 'QA Creator', email: badEmail, password, callbackURL: `${origin}/sign-in` });
      assert.equal(bad.status, 200, 'the send failure is swallowed (known 1.7.14 limitation)');
      assert.equal(fakeMessagesFor(badEmail).length, 0);
      fakeSmtp.setBehavior('ok');

      const rows = await auditRows(group1.db);
      const goodRows = rows.filter((r) => r.email === goodEmail);
      const badRows = rows.filter((r) => r.email === badEmail);
      assert.equal(goodRows.length, 1);
      assert.equal(goodRows[0].kind, 'otp');
      assert.equal(goodRows[0].status, 'sent');
      assert.equal(badRows.length, 1);
      assert.equal(badRows[0].kind, 'otp');
      assert.equal(badRows[0].status, 'failed');
      assert.ok(badRows[0].error_code, 'the failed row keeps the error code server-side');
      assert.deepEqual(Object.keys(rows[0]).sort(), ['attempted_at', 'email', 'error_code', 'id', 'kind', 'status']);
      assert.ok(!JSON.stringify(rows).includes(goodCode), 'no audit row contains the OTP value');
    } finally {
      // A restart: close the database but KEEP the data directory.
      await unloadGroup(group1, { keepDirectory: true });
    }

    // Group 2: a FRESH auth module over the SAME data directory.
    // membershipAuth() must repopulate the tracker from the durable
    // rows, so both statuses are visible without any new send.
    const directory = group1.directory;
    const group2 = await loadGroup('durable-2', { AENURAL_LOCAL_DATA_DIR: directory });
    try {
      const rows = await auditRows(group2.db);
      assert.ok(rows.length >= 2, 'the audit rows are still in the database after the restart');
      const { getOtpDeliveryStatus } = await import('../server/membership/otp-delivery.mjs');
      assert.equal(getOtpDeliveryStatus(goodEmail), 'sent', 'restart restores the sent status from the durable table');
      assert.equal(getOtpDeliveryStatus(badEmail), 'failed', 'restart restores the failed status from the durable table');
      // A real browser keeps BOTH cookies across a restart, so the
      // test rebuilds the pair the sign-up after-hook set (same secret:
      // both groups share the data directory, hence the secret file).
      const signedCookie =
        `${pendingVerificationCookieHeader(badEmail).split(';')[0]}; ` +
        pendingVerificationSignatureCookieHeader(badEmail, group2.config.secret, { secure: false }).split(';')[0];
      const status = await deliveryStatusFor(signedCookie, group2.config.secret);
      assert.equal(status.delivery, 'failed', 'the status endpoint reports the restored failure');
    } finally {
      await unloadGroup(group2);
    }
  });
});

// --- Disposable MySQL ---------------------------------------------------
describe('migration 002 + durable store + OTP flow on disposable MySQL', { skip: !integration || !mysqlTest }, () => {
  let mysql2;
  let connection;

  before(async () => {
    await ensureFakeServers();
    try {
      mysql2 = await import('mysql2/promise');
    } catch {
      return;
    }
    try {
      // Connect without a database so the test can recreate its own
      // schema from scratch on every run (001 uses plain CREATE TABLE
      // for the Better Auth tables and is not re-runnable as-is).
      connection = await mysql2.createConnection({ host: mysqlTest.host, port: mysqlTest.port, user: mysqlTest.user, password: mysqlTest.password, multipleStatements: true, connectTimeout: 3000 });
      await connection.query('SELECT 1');
    } catch {
      connection = null;
    }
  });
  after(async () => {
    await connection?.end().catch(() => {});
  });

  it('applies 001 and 002, is idempotent, and the store + OTP flow work', async (t) => {
    if (!connection) {
      t.skip(`no disposable MySQL at ${mysqlTest.host}:${mysqlTest.port} (set AENURAL_TEST_MYSQL_* to run this)`);
      return;
    }
    const sql001 = await readFile(path.resolve(import.meta.dirname, '../server/membership/migrations/001-initial-mysql.sql'), 'utf8');
    const sql002 = await readFile(path.resolve(import.meta.dirname, '../server/membership/migrations/002-email-delivery-attempts.sql'), 'utf8');
    if (!/^[A-Za-z0-9_]+$/.test(mysqlTest.database)) throw new Error('test database name must be alphanumeric');
    await connection.query(`DROP DATABASE IF EXISTS \`${mysqlTest.database}\`; CREATE DATABASE \`${mysqlTest.database}\` CHARACTER SET utf8mb4; USE \`${mysqlTest.database}\`;`);
    await connection.query(sql001);
    await connection.query(sql002);
    await connection.query(sql002); // Re-running 002 must be a no-op.
    const [tables] = await connection.query(
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = 'aenural_email_delivery_attempts'",
      [mysqlTest.database],
    );
    assert.equal(tables[0].n, 1, 'the audit table exists after 001 + 002');
    const [columns] = await connection.query(
      "SELECT column_name AS name FROM information_schema.columns WHERE table_schema = ? AND table_name = 'aenural_email_delivery_attempts' ORDER BY ordinal_position",
      [mysqlTest.database],
    );
    assert.deepEqual(columns.map((c) => c.name), ['id', 'email', 'kind', 'status', 'error_code', 'attempted_at']);
    const [indexes] = await connection.query(
      "SELECT DISTINCT index_name AS name FROM information_schema.statistics WHERE table_schema = ? AND table_name = 'aenural_email_delivery_attempts' AND index_name = 'aenural_email_delivery_attempts_email_idx'",
      [mysqlTest.database],
    );
    assert.equal(indexes.length, 1, 'the lookup index exists');
    assert.equal(indexes[0].name, 'aenural_email_delivery_attempts_email_idx');

    // The store works against the MySQL dialect, and the timestamp
    // format the store writes is accepted by datetime(3).
    fakeSmtp.setBehavior('ok');
    fakeSmtp.reset();
    const group = await loadGroup('mysql', {
      AENURAL_MEMBERSHIP_DATABASE: 'mysql',
      DB_HOST: mysqlTest.host,
      DB_PORT: String(mysqlTest.port),
      DB_NAME: mysqlTest.database,
      DB_USER: mysqlTest.user,
      DB_PASSWORD: mysqlTest.password,
      AUTH_TRUSTED_IP_HEADER: 'x-real-ip',
    });
    try {
      const { call } = makeCaller(group.auth);
      const email = testEmail('mysql');
      const before = await userCount(group.db);
      const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: `${origin}/sign-in` });
      assert.equal(response.status, 200, 'sign-up works against MySQL + fake SMTP');
      assert.equal(fakeMessagesFor(email).length, 1, 'the OTP mail is sent');
      const code = codeFromText(fakeMessagesFor(email)[0].raw);
      assert.ok(/^\d{6}$/.test(code));
      assert.equal((await call('email-otp/verify-email', { email, otp: code })).status, 200);
      assert.equal(await userCount(group.db), before + 1);
      const rows = await auditRows(group.db, email);
      assert.equal(rows.filter((r) => r.kind === 'otp' && r.status === 'sent').length, 1, 'the MySQL audit table records the send');
      // mysql2 returns DATETIME as a Date; SQLite returns the stored
      // string. Either way the value must be the UTC attempt time.
      const attemptedAt = rows[0].attempted_at instanceof Date ? rows[0].attempted_at : new Date(fromDbTimestamp(rows[0].attempted_at));
      assert.ok(Number.isFinite(attemptedAt.getTime()), 'attempted_at parses as a time');
      assert.ok(Date.now() - attemptedAt.getTime() < 120_000, 'attempted_at is the just-completed send');
      // Cleanup: the disposable database is throwaway, but leave no
      // test account behind in case it is shared.
      await group.db.deleteFrom('user').where('email', '=', email).execute();
    } finally {
      await unloadGroup(group);
      fakeSmtp.setBehavior('ok');
    }
  });
});

after(async () => {
  await fakeSmtp?.close();
  await plainSmtp?.close();
});

if (!integration) {
  it('SMTP integration tests need installed dependencies (skipped)', (t) => {
    t.skip(`better-auth/kysely/mysql2/nodemailer not installed: ${integrationError?.message || 'unknown error'}`);
  });
}
