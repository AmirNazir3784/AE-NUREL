// Controlled membership activation — flag behaviour + flow guards (Phase 4).
//
// node:test, no live DB, no live SMTP, no node_modules: every module under
// test is dependency-free (activation.mjs, config.mjs + its mysql-tls /
// email-otp imports, and the src/lib/membership-config.ts mirror, which
// Node 24 loads via type stripping — it contains no TS-only syntax).
// Anything needing a running Next.js app, a live MySQL server, real SMTP
// or a browser is marked NOT RUN in phase4/flows/FLOWS-REPORT.md, not
// faked here.
//
// Run from the repo root: `node --test tests/membership-activation.test.mjs`
// (or `npm test`, which runs tests/*.test.mjs).

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  resolveMembershipActivation,
  missingEnabledConfig,
  REQUIRED_ENABLED_ENV_KEYS,
  shouldSetPendingVerificationCookie,
} from '../server/membership/activation.mjs';
import { membershipConfig } from '../server/membership/config.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const SECRET = 'test-secret-that-is-long-enough-0123456789abcdef';

// The TS mirror is imported dynamically: on a Node without type stripping
// the agreement tests skip instead of failing the suite.
let tsMirror = null;
try {
  tsMirror = await import('../src/lib/membership-config.ts');
} catch {
  tsMirror = null;
}

// ---------------------------------------------------------------------------
// 1. Activation truth table (canonical module)
// ---------------------------------------------------------------------------

const MATRIX = [
  // [env, mode, enabled, ownerOnly]
  [{ NODE_ENV: 'production' }, 'disabled', false, false],
  [{ NODE_ENV: 'production', AENURAL_MEMBERSHIP_ENABLED: '0' }, 'disabled', false, false],
  [{ NODE_ENV: 'production', AENURAL_MEMBERSHIP_ENABLED: '' }, 'disabled', false, false],
  [{ NODE_ENV: 'production', AENURAL_MEMBERSHIP_ENABLED: '1' }, 'enabled', true, false],
  [{ NODE_ENV: 'production', AENURAL_MEMBERSHIP_ENABLED: 'true' }, 'disabled', false, false],
  [{ NODE_ENV: 'production', AENURAL_MEMBERSHIP_ENABLED: '1', AENURAL_OWNER_TEST_MODE: '1' }, 'owner-only', true, true],
  // Headline Phase 4 change: production "not enabled" no longer implies
  // owner-only mode. Both of these used to return owner-only (SQLite).
  [{ NODE_ENV: 'production', AENURAL_OWNER_TEST_MODE: '0' }, 'disabled', false, false],
  [{ NODE_ENV: 'production', AENURAL_MEMBERSHIP_ENABLED: '0', AENURAL_OWNER_TEST_MODE: '0' }, 'disabled', false, false],
  [{ NODE_ENV: 'production', AENURAL_OWNER_TEST_MODE: '1' }, 'owner-only', true, true],
  [{ NODE_ENV: 'production', AENURAL_OWNER_TEST_MODE: 'yes' }, 'disabled', false, false],
  [{ NODE_ENV: 'development' }, 'enabled', true, false],
  [{ NODE_ENV: 'development', AENURAL_MEMBERSHIP_DISABLED: '1' }, 'disabled', false, false],
  [{ NODE_ENV: 'development', AENURAL_MEMBERSHIP_DISABLED: '0' }, 'enabled', true, false],
  [{ NODE_ENV: 'development', AENURAL_OWNER_TEST_MODE: '1' }, 'owner-only', true, true],
  [{ NODE_ENV: 'development', AENURAL_MEMBERSHIP_ENABLED: '1', AENURAL_MEMBERSHIP_DISABLED: '1' }, 'disabled', false, false],
  [{ NODE_ENV: 'test', AENURAL_MEMBERSHIP_ENABLED: '1' }, 'enabled', true, false],
  [{ NODE_ENV: 'test' }, 'disabled', false, false],
  [{}, 'disabled', false, false],
  [{ AENURAL_MEMBERSHIP_ENABLED: '1' }, 'enabled', true, false],
];

for (const [env, mode, enabled, ownerOnly] of MATRIX) {
  test(`activation truth table: ${JSON.stringify(env)} -> ${mode}`, () => {
    const result = resolveMembershipActivation(env);
    assert.equal(result.mode, mode);
    assert.equal(result.enabled, enabled);
    assert.equal(result.ownerOnly, ownerOnly);
    assert.equal(typeof result.reason, 'string');
    assert.ok(result.reason.length > 0, 'every mode carries an operator-readable reason');
  });
}

test('activation: no env value other than the exact string "1" enables anything', () => {
  for (const value of ['True', 'TRUE', 'yes', 'on', ' 1', '1 ', '2']) {
    assert.equal(resolveMembershipActivation({ NODE_ENV: 'production', AENURAL_MEMBERSHIP_ENABLED: value }).mode, 'disabled', value);
    assert.equal(resolveMembershipActivation({ NODE_ENV: 'production', AENURAL_OWNER_TEST_MODE: value }).mode, 'disabled', value);
  }
});

// ---------------------------------------------------------------------------
// 2. The TS render-thread mirror must agree with the canonical module
// ---------------------------------------------------------------------------

if (tsMirror) {
  for (const [env, mode, enabled, ownerOnly] of MATRIX) {
    test(`TS mirror agrees: ${JSON.stringify(env)} -> ${mode}`, () => {
      const saved = {};
      for (const key of ['NODE_ENV', 'AENURAL_MEMBERSHIP_ENABLED', 'AENURAL_MEMBERSHIP_DISABLED', 'AENURAL_OWNER_TEST_MODE']) {
        saved[key] = process.env[key];
        delete process.env[key];
      }
      try {
        Object.assign(process.env, env);
        assert.equal(tsMirror.membershipEnabled(), enabled);
        assert.equal(tsMirror.ownerTestEnabled(), ownerOnly);
      } finally {
        for (const key of Object.keys(saved)) {
          if (saved[key] === undefined) delete process.env[key];
          else process.env[key] = saved[key];
        }
      }
    });
  }
} else {
  test('TS mirror agrees with the canonical module (SKIPPED: Node cannot import .ts here)', { skip: true }, () => {});
}

// ---------------------------------------------------------------------------
// 3. membershipConfig() — disabled returns null, enabled fails closed
// ---------------------------------------------------------------------------

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'aenural-activation-'));
}

test('membershipConfig: production with the flag off returns null (no SQLite owner fallback)', () => {
  const dir = tempDir();
  try {
    assert.equal(membershipConfig({ NODE_ENV: 'production', AENURAL_LOCAL_DATA_DIR: dir }), null);
    assert.equal(membershipConfig({ NODE_ENV: 'production', AENURAL_MEMBERSHIP_ENABLED: '0', AENURAL_LOCAL_DATA_DIR: dir }), null);
    // The old implied-owner fallback: this used to return an owner-only
    // SQLite config. It must now be null too.
    assert.equal(membershipConfig({ NODE_ENV: 'production', AENURAL_OWNER_TEST_MODE: '0', AENURAL_LOCAL_DATA_DIR: dir }), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('membershipConfig: development with MEMBERSHIP_DISABLED=1 returns null', () => {
  const dir = tempDir();
  try {
    assert.equal(membershipConfig({ NODE_ENV: 'development', AENURAL_MEMBERSHIP_DISABLED: '1', AENURAL_LOCAL_DATA_DIR: dir }), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('membershipConfig: explicit owner-test mode still works (opt-in only)', () => {
  const dir = tempDir();
  try {
    const config = membershipConfig({
      NODE_ENV: 'production',
      AENURAL_OWNER_TEST_MODE: '1',
      AENURAL_OWNER_DATA_DIR: dir,
      BETTER_AUTH_SECRET: SECRET,
      BETTER_AUTH_URL: 'https://aenural.com',
      // Coordinator merge (Phase 4): production owner-test mode now
      // requires the trusted proxy-IP header (SEC-02) — its sign-in rate
      // limiting keys on it, and the silent x-real-ip fallback was
      // trusting an unconfirmed header. Local/dev owner-test is unaffected.
      AUTH_TRUSTED_IP_HEADER: 'x-real-ip',
    });
    assert.equal(config.ownerOnly, true);
    assert.equal(config.mode, 'owner-only');
    assert.equal(config.sqlite, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('membershipConfig: production owner-test mode without the trusted header refuses to start (SEC-02)', () => {
  const dir = tempDir();
  try {
    assert.throws(
      () => membershipConfig({
        NODE_ENV: 'production',
        AENURAL_OWNER_TEST_MODE: '1',
        AENURAL_OWNER_DATA_DIR: dir,
        BETTER_AUTH_SECRET: SECRET,
        BETTER_AUTH_URL: 'https://aenural.com',
      }),
      /AUTH_TRUSTED_IP_HEADER/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('membershipConfig: enabled production without secure config throws and names the missing keys', () => {
  const missing = missingEnabledConfig({ NODE_ENV: 'production', AENURAL_MEMBERSHIP_ENABLED: '1' });
  assert.deepEqual([...missing], [...REQUIRED_ENABLED_ENV_KEYS]);
  assert.throws(
    () => membershipConfig({ NODE_ENV: 'production', AENURAL_MEMBERSHIP_ENABLED: '1', BETTER_AUTH_SECRET: SECRET, BETTER_AUTH_URL: 'https://aenural.com' }),
    (error) => {
      assert.match(error.message, /Missing: /);
      for (const key of REQUIRED_ENABLED_ENV_KEYS) assert.ok(error.message.includes(key), `names ${key}`);
      assert.ok(!error.message.includes(SECRET), 'never leaks the secret');
      return true;
    },
  );
});

test('membershipConfig: enabled production with full config returns a MySQL (non-SQLite) config', () => {
  const config = membershipConfig({
    NODE_ENV: 'production',
    AENURAL_MEMBERSHIP_ENABLED: '1',
    BETTER_AUTH_SECRET: SECRET,
    BETTER_AUTH_URL: 'https://aenural.com',
    DB_HOST: '127.0.0.1',
    DB_NAME: 'u853936014_aenural_dev',
    DB_USER: 'aenural_devuse',
    DB_PASSWORD: 'not-a-real-password',
    SMTP_HOST: 'smtp.hostinger.com',
    SMTP_USER: 'support@aenural.com',
    SMTP_PASSWORD: 'not-a-real-password',
    MAIL_FROM: 'support@aenural.com',
    AUTH_TRUSTED_IP_HEADER: 'x-real-ip',
  });
  assert.equal(config.mode, 'enabled');
  assert.equal(config.sqlite, false);
  assert.equal(config.local, false);
  assert.equal(config.mysqlTls.profile, 'loopback');
  assert.equal(missingEnabledConfig({
    DB_NAME: 'x', DB_USER: 'x', DB_PASSWORD: 'x', SMTP_HOST: 'x',
    SMTP_USER: 'x', SMTP_PASSWORD: 'x', MAIL_FROM: 'x', AUTH_TRUSTED_IP_HEADER: 'x',
  }).length, 0);
});

test('membershipConfig: local-outbox transport in production is a startup error, never a silent fallback', () => {
  assert.throws(
    () => membershipConfig({
      NODE_ENV: 'production',
      AENURAL_MEMBERSHIP_ENABLED: '1',
      AENURAL_EMAIL_TRANSPORT: 'local-outbox',
      BETTER_AUTH_SECRET: SECRET,
      BETTER_AUTH_URL: 'https://aenural.com',
      DB_HOST: '127.0.0.1',
      DB_NAME: 'x', DB_USER: 'x', DB_PASSWORD: 'x',
      SMTP_HOST: 'x', SMTP_USER: 'x', SMTP_PASSWORD: 'x', MAIL_FROM: 'x',
      AUTH_TRUSTED_IP_HEADER: 'x-real-ip',
    }),
    /local-outbox is for local development only/,
  );
});

test('membershipConfig: development default stays on with local SQLite', () => {
  const dir = tempDir();
  try {
    const config = membershipConfig({ NODE_ENV: 'development', AENURAL_LOCAL_DATA_DIR: dir, BETTER_AUTH_SECRET: SECRET });
    assert.equal(config.mode, 'enabled');
    assert.equal(config.local, true);
    assert.equal(config.sqlite, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 4. Unverified-sign-in resume (pure helper; live shape verified by probe)
// ---------------------------------------------------------------------------

test('shouldSetPendingVerificationCookie: only the exact EMAIL_NOT_VERIFIED shape', () => {
  // Shapes observed live against Better Auth 1.7.14 (Phase 4 probe):
  // APIError { status: 'FORBIDDEN', body: { code: 'EMAIL_NOT_VERIFIED' } }.
  const err = { status: 'FORBIDDEN', body: { message: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' } };
  assert.equal(shouldSetPendingVerificationCookie(err, 'User@Example.test'), 'user@example.test');
  // Top-level code variant (defensive; same meaning).
  assert.equal(shouldSetPendingVerificationCookie({ code: 'EMAIL_NOT_VERIFIED' }, 'a@b.co'), 'a@b.co');
  // Wrong password must NOT set the cookie (nothing was sent).
  assert.equal(shouldSetPendingVerificationCookie({ status: 'UNAUTHORIZED', body: { code: 'INVALID_EMAIL_OR_PASSWORD' } }, 'a@b.co'), null);
  // Success payloads (sign-in of a verified user) must NOT set it.
  assert.equal(shouldSetPendingVerificationCookie({ user: { email: 'a@b.co' }, token: 'x' }, 'a@b.co'), null);
  assert.equal(shouldSetPendingVerificationCookie({ status: true }, 'a@b.co'), null);
  assert.equal(shouldSetPendingVerificationCookie(null, 'a@b.co'), null);
  assert.equal(shouldSetPendingVerificationCookie(err, ''), null);
  assert.equal(shouldSetPendingVerificationCookie(err, 'not-an-email'), null);
  assert.equal(shouldSetPendingVerificationCookie(err, undefined), null);
});

// ---------------------------------------------------------------------------
// 5. Static guards on the branch files (skip when run outside the repo)
// ---------------------------------------------------------------------------

function readRepoFile(relativePath) {
  const full = join(repoRoot, relativePath);
  if (!existsSync(full)) return null;
  return readFileSync(full, 'utf8');
}

test('static guard: both API route entry points gate on the flag before any auth work', (t) => {
  for (const route of ['src/app/api/auth/[...all]/route.ts', 'src/app/api/membership/[...path]/route.ts', 'src/app/api/payments/webhook/route.ts']) {
    const source = readRepoFile(route);
    if (source === null) {
      t.skip(`route file absent in this checkout: ${route}`);
      continue;
    }
    assert.ok(source.includes('membershipEnabled()'), `${route} checks the flag`);
    assert.ok(source.includes('404'), `${route} answers 404 when disabled`);
    // The gate must come before any auth/database import is USED: the
    // membership/auth imports in these files are dynamic (lazy), so a
    // disabled request never initialises auth. A static server import
    // here would defeat the gate.
    assert.ok(!/^import .*server\/membership/m.test(source), `${route} has no static server/membership import`);
    assert.ok(!source.includes("from \"../../../../../server/membership"), `${route} has no static server/membership import`);
  }
});

test('static guard: auth after-hook sets the pending cookie for unverified sign-in only', (t) => {
  const source = readRepoFile('server/membership/auth.mjs');
  if (source === null) {
    t.skip('auth.mjs absent in this checkout');
    return;
  }
  assert.ok(source.includes('shouldSetPendingVerificationCookie'), 'after-hook uses the helper');
  assert.ok(source.includes("ctx.path === '/sign-in/email'"), 'after-hook handles the sign-in path');
  assert.ok(source.includes('pendingVerificationCookieHeader(email'), 'cookie is set from the helper result');
});

test('static guard: disabled auth pages render no working form', (t) => {
  const source = readRepoFile('src/features/membership/access-page.tsx');
  if (source === null) {
    t.skip('access-page.tsx absent in this checkout');
    return;
  }
  assert.ok(source.includes('Accounts unavailable'), 'disabled heading does not promise a working form');
  // The disabled branch is the ternary arm starting at
  // `view !== "verification" ? <div>` and ending at `: ownerOnly` — it
  // must not render AccessForm (no fields, no submit button).
  const start = source.indexOf('view !== "verification" ? <div>');
  assert.ok(start !== -1, 'disabled branch exists');
  const end = source.indexOf(': ownerOnly', start);
  assert.ok(end !== -1, 'disabled branch ends at the owner-only arm');
  assert.ok(!source.slice(start, end).includes('AccessForm'), 'disabled branch renders no AccessForm');
  assert.ok(source.includes('Use the free caption tools'), 'disabled state links onward to the free tools');
});

test('static guard: login form offers the verification-resume route on EMAIL_NOT_VERIFIED', (t) => {
  const source = readRepoFile('src/features/membership/access-form.tsx');
  if (source === null) {
    t.skip('access-form.tsx absent in this checkout');
    return;
  }
  assert.ok(source.includes('EMAIL_NOT_VERIFIED'), 'login distinguishes the unverified error');
  assert.ok(source.includes('href="/verify-email"'), 'login links to /verify-email for unverified users');
  assert.ok(source.includes('Continue to verification to enter your code'), 'resume copy is neutral (S5-15: never asserts a code was sent)');
});

test('static guard: no readiness/status endpoint exposes diagnostics', () => {
  // There must be no route that reports activation state, env, or
  // diagnostics publicly. The activation doc states the rule; this pins
  // the current inventory (auth + membership + payments webhook only).
  for (const candidate of ['src/app/api/readiness/route.ts', 'src/app/api/status/route.ts', 'src/app/api/health/route.ts', 'src/app/api/membership/readiness/route.ts']) {
    assert.ok(!existsSync(join(repoRoot, candidate)), `${candidate} must not exist as a public endpoint`);
  }
});

// ---------------------------------------------------------------------------
// 6. Owner activation — Step 5 fixes (S5-04, S5-11, S5-12, S5-13, S5-22,
//     S5-23, S5-37, S5-38). The module is imported dynamically so this
//     file still loads when its dependencies are absent (same pattern as
//     the TS mirror above); the tests skip instead of failing the suite.
// ---------------------------------------------------------------------------

let ownerActivation = null;
try {
  ownerActivation = await import('../server/membership/owner-activation.mjs');
} catch {
  ownerActivation = null;
}

if (ownerActivation) {
  const {
    hashOwnerActivationToken,
    verifyOwnerActivationToken,
    isStrongOwnerPassword,
    isUsableOwnerEmail,
    resolveOwnerEmail,
    createOwnerActivationAttemptTracker,
    ownerActivationClientIp,
    mapOwnerActivationError,
    OWNER_ACTIVATION_GENERIC_ERROR,
    OWNER_TOKEN_SCRYPT,
  } = ownerActivation;

  test('owner token: scrypt hash verifies the right token and rejects the wrong one (S5-04)', async () => {
    const token = 'test-only-owner-token-for-scrypt-verify';
    const hash = await hashOwnerActivationToken(token);
    assert.match(hash, /^scrypt\$16384\$8\$1\$/);
    assert.equal(OWNER_TOKEN_SCRYPT.N, 16384);
    assert.equal(await verifyOwnerActivationToken(token, hash), true);
    assert.equal(await verifyOwnerActivationToken('wrong-token', hash), false);
    assert.equal(await verifyOwnerActivationToken(token, hash), true, 'verification is repeatable before any activation');
  });

  test('owner token: malformed stored hashes fail closed as false, never throw (S5-04)', async () => {
    const token = 'test-only-owner-token-for-malformed-hash';
    const hash = await hashOwnerActivationToken(token);
    // Legacy unsalted SHA-256 hex (the old committed format) is NOT accepted.
    const { createHash } = await import('node:crypto');
    assert.equal(await verifyOwnerActivationToken(token, createHash('sha256').update(token).digest('hex')), false);
    for (const bad of ['', 'not-a-hash', 'scrypt$16384$8$1$short$short', 'scrypt$3$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==', 'scrypt$16384$8$1', 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==', null, undefined, 123]) {
      assert.equal(await verifyOwnerActivationToken(token, bad), false, `malformed stored hash must verify false: ${String(bad)?.slice(0, 30)}`);
    }
    assert.equal(await verifyOwnerActivationToken('', hash), false);
    assert.equal(await verifyOwnerActivationToken(token.repeat(10), hash), false, 'over-long token is rejected');
  });

  test('owner password: complexity floor needs 3 of 4 character classes (S5-22)', () => {
    assert.equal(isStrongOwnerPassword('Test-Only-Owner-Password-123!'), true);
    assert.equal(isStrongOwnerPassword('Passw0rd-password!'), true);
    assert.equal(isStrongOwnerPassword('aaaaaaaaaaaaaaaa'), false, 'length alone is not enough');
    assert.equal(isStrongOwnerPassword('Passwordpassword'), false, 'two classes are not enough');
    assert.equal(isStrongOwnerPassword('1234567890123456'), false, 'digits alone are not enough');
    assert.equal(isStrongOwnerPassword('short1!'), false, 'under 16 chars fails');
    assert.equal(isStrongOwnerPassword('x'.repeat(129)), false, 'over 128 chars fails');
    assert.equal(isStrongOwnerPassword(''), false);
    assert.equal(isStrongOwnerPassword(null), false);
  });

  test('owner email: placeholder and unconfigured addresses are unusable (S5-13)', () => {
    assert.equal(isUsableOwnerEmail('owner@aenural.com'), false);
    assert.equal(isUsableOwnerEmail('Owner@Aenural.com'), false, 'placeholder check is case-insensitive');
    assert.equal(isUsableOwnerEmail(''), false);
    assert.equal(isUsableOwnerEmail('not-an-email'), false);
    assert.equal(isUsableOwnerEmail('owner@example.test'), true);
    assert.equal(resolveOwnerEmail({ AENURAL_OWNER_EMAIL: '  Owner@Example.test ' }), 'owner@example.test');
    assert.equal(resolveOwnerEmail({}), '');
    assert.equal(resolveOwnerEmail(undefined), '');
  });

  test('owner activation attempts: 5 failures lock the IP out, success clears it (S5-12)', () => {
    let nowMs = 1_000_000;
    const tracker = createOwnerActivationAttemptTracker({ now: () => nowMs });
    assert.equal(tracker.isLockedOut('203.0.113.7'), false);
    for (let i = 0; i < 4; i++) tracker.recordFailure('203.0.113.7');
    assert.equal(tracker.isLockedOut('203.0.113.7'), false, '4 failures do not lock out yet');
    tracker.recordFailure('203.0.113.7');
    assert.equal(tracker.isLockedOut('203.0.113.7'), true);
    assert.equal(tracker.isLockedOut('198.51.100.9'), false, 'lockout is per IP');
    nowMs += 10 * 60 * 1000 + 1;
    assert.equal(tracker.isLockedOut('203.0.113.7'), false, 'lockout expires after 10 minutes');
    tracker.recordFailure('198.51.100.9');
    tracker.recordSuccess('198.51.100.9');
    assert.equal(tracker.failureCount('198.51.100.9'), 0, 'success clears the failure count');
  });

  test('owner activation client IP: trusted header, first entry, unknown fallback (S5-12)', () => {
    const headers = (values) => new Headers(values);
    assert.equal(ownerActivationClientIp(headers({ 'x-real-ip': '203.0.113.7' }), 'x-real-ip'), '203.0.113.7');
    assert.equal(ownerActivationClientIp(headers({ 'x-real-ip': '203.0.113.7, 198.51.100.9' }), 'x-real-ip'), '203.0.113.7');
    assert.equal(ownerActivationClientIp(headers({}), 'x-real-ip'), 'unknown');
    assert.equal(ownerActivationClientIp(headers({ 'x-forwarded-for': '198.51.100.9' }), ''), 'unknown', 'no header name falls back to x-real-ip, not to x-forwarded-for');
    assert.equal(ownerActivationClientIp(headers({ 'x-real-ip': 'not an ip with spaces' }), 'x-real-ip'), 'unknown');
    assert.equal(OWNER_ACTIVATION_GENERIC_ERROR, 'This activation could not be verified.');
  });

  test('owner activation errors: unique violations map to the generic 403 (S5-37)', () => {
    for (const raced of [{ code: 'ER_DUP_ENTRY', message: "Duplicate entry 'x' for key 'user.email'" }, { code: 'SQLITE_CONSTRAINT_UNIQUE', message: 'UNIQUE constraint failed: user.email' }]) {
      const mapped = mapOwnerActivationError(raced);
      assert.equal(mapped.status, 403);
      assert.equal(mapped.message, OWNER_ACTIVATION_GENERIC_ERROR);
    }
    const other = new Error('boom');
    assert.equal(mapOwnerActivationError(other), other, 'non-unique errors pass through unchanged');
  });
} else {
  test('owner activation helpers (SKIPPED: server/membership/owner-activation.mjs cannot be imported here)', { skip: true }, () => {});
}

test('static guard: owner bootstrap holds no token hash and is marked inert (S5-04)', (t) => {
  const source = readRepoFile('server/membership/owner-bootstrap.json');
  if (source === null) {
    t.skip('owner-bootstrap.json absent in this checkout');
    return;
  }
  assert.ok(!source.includes('activationTokenHash'), 'no activationTokenHash field may remain in the file');
  assert.ok(!source.includes('66b62422'), 'the old committed hash value must not appear');
  assert.ok(source.includes('_note'), 'the file carries a note explaining it is inert');
  assert.ok(source.includes('AENURAL_OWNER_ACTIVATION_TOKEN_HASH'), 'the note names the env var that holds the hash');
});

test('static guard: owner-activation.mjs reads the hash from env, never from the bootstrap file (S5-04)', (t) => {
  const source = readRepoFile('server/membership/owner-activation.mjs');
  if (source === null) {
    t.skip('owner-activation.mjs absent in this checkout');
    return;
  }
  assert.ok(source.includes('AENURAL_OWNER_ACTIVATION_TOKEN_HASH'), 'hash is read from the env var');
  assert.ok(source.includes('AENURAL_OWNER_EMAIL'), 'owner email is read from the env var');
  assert.ok(!source.includes("from './owner-bootstrap.json'"), 'the bootstrap file is never imported');
  assert.ok(!source.includes('import bootstrap'), 'the bootstrap file is never imported');
  assert.ok(!source.includes('createHash'), 'no unsalted SHA-256 token verification remains');
  assert.ok(source.includes('scrypt'), 'token verification uses scrypt');
  assert.ok(source.includes('OWNER_PLACEHOLDER_EMAIL') || source.includes('owner@aenural.com'), 'placeholder email is checked');
  assert.ok(source.includes('consumedTokenHashes') || source.includes('consumed'), 'successful activation invalidates the token');
});

test('static guard: activate-owner route has per-IP limits, lockout and attempt logging (S5-12, S5-23)', (t) => {
  const source = readRepoFile('src/app/api/membership/activate-owner/route.ts');
  if (source === null) {
    t.skip('activate-owner route absent in this checkout');
    return;
  }
  assert.ok(source.includes("limitOperation('owner-activation', 'activate', 5)"), 'global 5/min backstop is kept');
  assert.ok(source.includes("'activate:' + clientIp"), 'per-IP bucket is keyed by client IP');
  assert.ok(source.includes('isLockedOut'), 'progressive lockout is checked');
  assert.ok(source.includes('owner-activation-attempt'), 'attempts are logged server-side');
  assert.ok(source.includes("{ event: 'owner-activation-attempt', at: new Date().toISOString(), ip, outcome, status }"), 'the log line carries timestamp, IP and outcome code only — never the token or password');
  assert.ok(source.includes('CSRF-only') || source.includes('CSRF'), 'the Origin check is documented as CSRF-only');
  assert.ok(source.includes('the ONLY credential') || source.includes('only credential'), 'the token is documented as the only authentication');
});

test('static guard: token generator prints once, never writes a file (S5-04)', (t) => {
  const source = readRepoFile('scripts/membership/generate-owner-token.mjs');
  if (source === null) {
    t.skip('generate-owner-token.mjs absent in this checkout');
    return;
  }
  assert.ok(source.includes('randomBytes(32)'), 'token is 32 random bytes');
  assert.ok(source.includes('AENURAL_OWNER_ACTIVATION_TOKEN_HASH'), 'it prints the env var to set');
  assert.ok(!source.includes('writeFile'), 'the script must never write the token to a file');
  assert.ok(!source.includes('appendFile'), 'the script must never write the token to a file');
});

test('static guard: env example documents the owner vars as placeholders (S5-04, S5-13)', (t) => {
  const source = readRepoFile('config/membership.env.example');
  if (source === null) {
    t.skip('membership.env.example absent in this checkout');
    return;
  }
  assert.ok(source.includes('AENURAL_OWNER_EMAIL=<redacted>'), 'owner email placeholder is documented');
  assert.ok(source.includes('AENURAL_OWNER_ACTIVATION_TOKEN_HASH=<redacted>'), 'owner token hash placeholder is documented');
});

test('static guard: verify-owner checks state before sending the password (S5-38)', (t) => {
  const source = readRepoFile('scripts/membership/verify-owner.mjs');
  if (source === null) {
    t.skip('verify-owner.mjs absent in this checkout');
    return;
  }
  assert.ok(!source.includes('410'), 'the script no longer treats 410 as already-activated');
  assert.ok(!source.includes("new URL('../../server/membership/owner-bootstrap.json'"), 'the script no longer reads the inert bootstrap file');
  assert.ok(!source.includes('const bootstrap'), 'the script no longer reads the inert bootstrap file');
  assert.ok(!source.includes('activationTokenHash'), 'the script no longer compares a committed hash');
  assert.ok(source.includes('skippedActivationPost'), 'an already-active owner skips the activation POST');
  const probe = source.indexOf('signIn()');
  const activationPost = source.indexOf("'/api/membership/activate-owner'");
  assert.ok(probe !== -1 && activationPost !== -1 && probe < activationPost, 'sign-in probe runs before the activation POST');
});

test('static guard: rotation doc describes the env-var + scrypt procedure (S5-04)', (t) => {
  const source = readRepoFile('docs/authentication/owner-activation-rotation.md');
  if (source === null) {
    t.skip('owner-activation-rotation.md absent in this checkout');
    return;
  }
  assert.ok(source.includes('AENURAL_OWNER_ACTIVATION_TOKEN_HASH'), 'doc names the env var');
  assert.ok(source.includes('AENURAL_OWNER_EMAIL'), 'doc names the owner email env var');
  assert.ok(source.includes('scrypt'), 'doc describes scrypt verification');
  assert.ok(source.includes('generate-owner-token.mjs'), 'doc points at the generator script');
  assert.ok(source.includes('compromised'), 'doc treats the old committed hash as compromised');
  assert.ok(!source.includes('66b62422'), 'doc contains no hash value');
});
