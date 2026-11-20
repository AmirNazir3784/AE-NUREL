// Tests for the email OTP verification flow (Better Auth 1.7.14).
//
// Two layers, in one file:
//   * Pure tests — email-otp.mjs, pending-verification.mjs, config.mjs.
//     Dependency-free: they run with `node --test` and no node_modules.
//   * Integration tests — the real auth instance against a temporary
//     SQLite database in local-outbox mode (AENURAL_EMAIL_TRANSPORT=
//     local-outbox), using the same mkdtemp pattern as
//     tests/membership-server.test.mjs. They are skipped automatically
//     when better-auth/kysely/mysql2/nodemailer are not installed, and
//     run as part of `npm test` in the repo. No real email is ever sent
//     and no live database is touched.
//
// Rate-limit note: Better Auth limits are per IP + path, so each test
// uses its own x-forwarded-for address (local mode reads that header)
// and the wrong-attempt sequence uses a fresh address per attempt.
// That isolates the OTP attempt counter from the per-IP rate limit;
// the rate limit itself is covered by the plugin's own defaults and
// the customRules in auth.mjs, not by hammering one bucket here.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  OTP_LENGTH,
  OTP_EXPIRES_IN_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_RESEND_MAX_PER_HOUR,
  OTP_RESEND_MAX_PER_DAY,
  OTP_WRONG_GUESS_MAX_PER_HOUR,
  OTP_EMAIL_SUBJECT,
  SUPPORT_EMAIL,
  buildOtpEmail,
  emailBudgetKey,
  escapeHtml,
  isOtpResendCoolingDown,
  isOtpResendBudgetExhausted,
  isOtpGuessBudgetExhausted,
  isPasswordResetCoolingDown,
  maskEmail,
  otpIdentifier,
  recordOtpResend,
  recordOtpWrongGuess,
  recordPasswordResetAttempt,
  resetOtpBudgets,
  resolveEmailTransport,
  assertEmailTransportFlag,
} from '../server/membership/email-otp.mjs';
import {
  PENDING_VERIFICATION_COOKIE,
  PENDING_VERIFICATION_MAX_AGE_SECONDS,
  PENDING_VERIFICATION_RECOVERY_MESSAGE,
  PENDING_VERIFICATION_SIGNATURE_COOKIE,
  checkAnonymousRouteLimit,
  clearPendingVerificationCookieHeader,
  clearPendingVerificationSignatureCookieHeader,
  handlePendingVerificationRecovery,
  handlePendingVerificationStatus,
  isValidPendingEmail,
  pendingVerificationCookieHeader,
  pendingVerificationSignatureCookieHeader,
  pendingVerificationStatus,
  readPendingVerificationEmail,
  resetAnonymousRouteLimits,
  secureCookiesForConfig,
} from '../server/membership/pending-verification.mjs';
import { recordOtpDeliverySent } from '../server/membership/otp-delivery.mjs';
import { membershipConfig } from '../server/membership/config.mjs';
import { randomUUID } from 'node:crypto';
import { pruneStaleGuests } from '../server/membership/guest.mjs';
import { createMemberService, dbTimestamp } from '../server/membership/service.mjs';

describe('OTP policy constants', () => {
  it('is a 6-digit code, 5-minute expiry, 5 attempts, 60s resend cooldown', () => {
    assert.equal(OTP_LENGTH, 6);
    assert.equal(OTP_EXPIRES_IN_SECONDS, 300);
    assert.equal(OTP_MAX_ATTEMPTS, 5);
    assert.equal(OTP_RESEND_COOLDOWN_SECONDS, 60);
  });
});

describe('buildOtpEmail', () => {
  it('sends the branded subject with plain-text + HTML bodies', () => {
    const mail = buildOtpEmail({ email: 'alice@example.test', otp: '123456' });
    assert.equal(mail.subject, OTP_EMAIL_SUBJECT);
    assert.equal(mail.subject, 'Your AENural verification code');
    assert.match(mail.text, /123456/);
    assert.match(mail.text, /5 minutes/);
    assert.match(mail.text, new RegExp(SUPPORT_EMAIL.replace('.', '\\.')));
    assert.match(mail.text, /Never share this code/);
    assert.match(mail.html, /123456/);
    assert.match(mail.html, /5 minutes/);
    assert.match(mail.html, /Never share this code/);
    // No verification link anywhere in the OTP email.
    assert.doesNotMatch(mail.text, /https?:\/\//);
    assert.doesNotMatch(mail.html, /verify-email\?token=/);
  });
  it('treats the code as a string (a leading zero is significant)', () => {
    const mail = buildOtpEmail({ email: 'alice@example.test', otp: '012345' });
    assert.match(mail.text, /012345/);
  });
  it('refuses to build mail for a malformed code or address', () => {
    for (const otp of ['12345', '1234567', '12345a', 123456, '', null]) {
      assert.throws(() => buildOtpEmail({ email: 'alice@example.test', otp }), /6-digit/);
    }
    assert.throws(() => buildOtpEmail({ email: 'not-an-email', otp: '123456' }), /email/);
  });
  it('escapes the recipient address in the HTML body', () => {
    assert.equal(escapeHtml('<a@b>&"'), '&lt;a@b&gt;&amp;&quot;');
    const mail = buildOtpEmail({ email: 'a<b@example.test', otp: '123456' });
    assert.doesNotMatch(mail.html, /a<b@example\.test/);
  });
});

describe('otpIdentifier', () => {
  it('matches Better Auth 1.7.14 verification-row identifiers', () => {
    assert.equal(otpIdentifier('email-verification', 'alice@example.test'), 'email-verification-otp-alice@example.test');
    assert.equal(otpIdentifier('sign-in', 'alice@example.test'), 'sign-in-otp-alice@example.test');
  });
});

describe('maskEmail', () => {
  it('masks the local part and keeps the domain', () => {
    assert.equal(maskEmail('alice@example.test'), 'al***@example.test');
    assert.equal(maskEmail('ab@example.test'), 'a***@example.test');
    assert.equal(maskEmail('a@example.test'), 'a***@example.test');
    assert.equal(maskEmail('not-an-email'), '***');
    assert.equal(maskEmail(null), '***');
  });
});

describe('isOtpResendCoolingDown', () => {
  const now = Date.now();
  it('is cooling down within 60s of the previous send', () => {
    assert.equal(isOtpResendCoolingDown(new Date(now - 30_000), now), true);
    assert.equal(isOtpResendCoolingDown(new Date(now - 59_000).toISOString(), now), true);
    assert.equal(isOtpResendCoolingDown(now - 10_000, now), true);
  });
  it('is not cooling down after 60s, or with no previous send', () => {
    assert.equal(isOtpResendCoolingDown(new Date(now - 60_000), now), false);
    assert.equal(isOtpResendCoolingDown(new Date(now - 120_000), now), false);
    assert.equal(isOtpResendCoolingDown(null, now), false);
    assert.equal(isOtpResendCoolingDown(undefined, now), false);
  });
  it('fails closed when a timestamp is present but unreadable (S5-25)', () => {
    // "No row" (null/undefined) means no cooldown. A row that EXISTS
    // but whose timestamp cannot be parsed must NOT be treated as "no
    // cooldown" — its age is unproven, so the send is blocked.
    assert.equal(isOtpResendCoolingDown('not-a-date', now), true);
    assert.equal(isOtpResendCoolingDown({}, now), true);
    assert.equal(isOtpResendCoolingDown(Number.NaN, now), true);
  });
});

describe('per-email OTP budgets (S5-16, S5-09)', () => {
  // Fixed wall-clock times so hour/day windows are deterministic.
  // base is a UTC hour boundary (01:00), so +minutes stay in the
  // intended hour/day windows.
  const hour = 60 * 60 * 1000;
  const base = Math.floor(1780000000000 / hour) * hour;
  const at = (minutes) => base + minutes * 60_000;

  it('caps resends at 10/hour, then enforces a 1-hour cooling-off', () => {
    resetOtpBudgets();
    const email = 'budget-hour@example.test';
    assert.equal(OTP_RESEND_MAX_PER_HOUR, 10);
    for (let i = 0; i < 9; i++) {
      assert.equal(recordOtpResend(email, at(i * 2)), true);
      assert.equal(isOtpResendBudgetExhausted(email, at(i * 2)), false, `after ${i + 1} resends`);
    }
    assert.equal(recordOtpResend(email, at(18)), true);
    assert.equal(isOtpResendBudgetExhausted(email, at(18)), true, '10th resend exhausts the hour budget');
    // Cooling-off: still exhausted 30 minutes later, free again once
    // the hour window has rolled over and the cool-off has expired.
    assert.equal(isOtpResendBudgetExhausted(email, at(48)), true);
    assert.equal(isOtpResendBudgetExhausted(email, at(18) + 61 * 60_000), false);
    // Budgets are per address: another email is unaffected.
    assert.equal(isOtpResendBudgetExhausted('other@example.test', at(18)), false);
  });
  it('caps resends at 20/day across hour windows', () => {
    resetOtpBudgets();
    const email = 'budget-day@example.test';
    assert.equal(OTP_RESEND_MAX_PER_DAY, 20);
    for (let h = 0; h < 2; h++) {
      for (let i = 0; i < 10; i++) recordOtpResend(email, at(h * 70 + i * 2));
    }
    assert.equal(isOtpResendBudgetExhausted(email, at(140)), true, '20 resends in one UTC day exhaust the day budget');
    // The day cap persists past the 1-hour cooling-off: same UTC day,
    // still 20 recorded. Only a new UTC day resets it.
    assert.equal(isOtpResendBudgetExhausted(email, at(140) + hour), true, 'day budget still exhausted an hour later');
    assert.equal(isOtpResendBudgetExhausted(email, at(1400)), false, 'a new UTC day resets the day budget');
  });
  it('caps cumulative wrong guesses at 15/hour across rotations', () => {
    resetOtpBudgets();
    const email = 'budget-guess@example.test';
    assert.equal(OTP_WRONG_GUESS_MAX_PER_HOUR, 15);
    for (let i = 0; i < 14; i++) {
      recordOtpWrongGuess(email, at(i));
      assert.equal(isOtpGuessBudgetExhausted(email, at(i)), false, `after ${i + 1} wrong guesses`);
    }
    recordOtpWrongGuess(email, at(14));
    assert.equal(isOtpGuessBudgetExhausted(email, at(14)), true);
    assert.equal(isOtpGuessBudgetExhausted(email, at(14) + hour), false, 'next hour window resets the guess budget');
  });
  it('applies a 60s per-email cooldown to password-reset mail', () => {
    resetOtpBudgets();
    const email = 'budget-reset@example.test';
    assert.equal(isPasswordResetCoolingDown(email, at(0)), false);
    recordPasswordResetAttempt(email, at(0));
    assert.equal(isPasswordResetCoolingDown(email, at(0)), true);
    assert.equal(isPasswordResetCoolingDown(email, at(0) + 59_000), true);
    assert.equal(isPasswordResetCoolingDown(email, at(0) + 61_000), false);
    assert.equal(isPasswordResetCoolingDown('other@example.test', at(0)), false);
  });
  it('keys budgets by SHA-256 of the lower-cased address, never the address', () => {
    assert.match(emailBudgetKey('Alice@Example.test'), /^[a-f0-9]{64}$/);
    assert.equal(emailBudgetKey('Alice@Example.test'), emailBudgetKey('alice@example.test'));
    assert.notEqual(emailBudgetKey('alice@example.test'), emailBudgetKey('bob@example.test'));
  });
});

describe('pending-verification cookies — __Host- prefix and secure derivation (S5-29, S5-32)', () => {
  const secret = 'test-signing-secret-32-chars-minimum';
  it('uses the __Host- prefix with Secure when secure cookies apply', () => {
    const emailHeader = pendingVerificationCookieHeader('alice@example.test', { secure: true });
    assert.match(emailHeader, /^__Host-aenural_pending_verification=alice%40example\.test; Max-Age=600; Path=\/; HttpOnly; SameSite=Lax; Secure$/);
    const sigHeader = pendingVerificationSignatureCookieHeader('alice@example.test', secret, { secure: true });
    assert.match(sigHeader, /^__Host-aenural_pending_verification_sig=[A-Za-z0-9_-]+; Max-Age=600; Path=\/; HttpOnly; SameSite=Lax; Secure$/);
    // Readers accept the prefixed names, and delivery reports with them.
    assert.equal(readPendingVerificationEmail(emailHeader), 'alice@example.test');
    assert.match(clearPendingVerificationCookieHeader({ secure: true }), /^__Host-aenural_pending_verification=; Max-Age=0;/);
    assert.match(clearPendingVerificationSignatureCookieHeader({ secure: true }), /^__Host-aenural_pending_verification_sig=; Max-Age=0;/);
  });
  it('keeps plain names without Secure in local mode', () => {
    assert.match(pendingVerificationCookieHeader('alice@example.test', { secure: false }), /^aenural_pending_verification=alice%40example\.test;/);
    assert.doesNotMatch(pendingVerificationCookieHeader('alice@example.test', { secure: false }), /__Host-/);
  });
  it('derives Secure from the origin protocol, not from local mode', () => {
    assert.equal(secureCookiesForConfig({ origin: 'https://aenural.com', local: false }), true);
    assert.equal(secureCookiesForConfig({ origin: 'http://localhost:3000', local: true }), false);
    // A non-local deployment served over plain HTTP must NOT get
    // Secure cookies it cannot use; an https: origin always does.
    assert.equal(secureCookiesForConfig({ origin: 'http://192.0.2.10:3000', local: false }), false);
    assert.equal(secureCookiesForConfig({ local: false }), true);
    assert.equal(secureCookiesForConfig({ local: true }), false);
  });
});

describe('anonymous route rate limiting (S5-30)', () => {
  it('allows up to the max per key per window, then throttles', () => {
    resetAnonymousRouteLimits();
    for (let i = 0; i < 3; i++) assert.equal(checkAnonymousRouteLimit('status:10.0.0.1', { max: 3 }), true);
    assert.equal(checkAnonymousRouteLimit('status:10.0.0.1', { max: 3 }), false);
    assert.equal(checkAnonymousRouteLimit('status:10.0.0.2', { max: 3 }), true, 'a different IP has its own bucket');
    assert.equal(checkAnonymousRouteLimit('resend:10.0.0.1', { max: 3 }), true, 'a different scope has its own bucket');
  });
  it('returns no-store + Vary: Cookie from the status handler (S5-28)', async () => {
    const response = handlePendingVerificationStatus(
      new Request('http://localhost:3000/api/membership/pending-verification', {
        headers: { cookie: pendingVerificationCookieHeader('alice@example.test') },
      }),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Vary'), 'Cookie');
    assert.deepEqual(await response.json(), { email: 'alice@example.test', emailMasked: 'al***@example.test', delivery: 'unknown' });
  });
});

describe('resolveEmailTransport (no silent outbox fallback)', () => {
  const smtpEnv = { SMTP_HOST: 'smtp.hostinger.com', SMTP_USER: 'support@aenural.com', SMTP_PASSWORD: 'secret', MAIL_FROM: 'support@aenural.com' };
  it('uses SMTP whenever SMTP is configured, even in local mode', () => {
    assert.equal(resolveEmailTransport(smtpEnv, { local: true, sqlite: true }), 'smtp');
    assert.equal(resolveEmailTransport(smtpEnv, { local: false, sqlite: false }), 'smtp');
  });
  it('uses the local outbox only behind the explicit flag in local/SQLite mode', () => {
    assert.equal(resolveEmailTransport({ AENURAL_EMAIL_TRANSPORT: 'local-outbox' }, { local: true, sqlite: true }), 'local-outbox');
    assert.equal(resolveEmailTransport({ AENURAL_EMAIL_TRANSPORT: 'local-outbox' }, { local: false, sqlite: true }), 'local-outbox');
  });
  it('never falls back to the outbox when SMTP is configured', () => {
    // Resolution is a pure function of configuration, never of a send
    // outcome: with SMTP configured the answer is always 'smtp', so a
    // failed SMTP send has no outbox branch to fall into.
    for (const flag of [undefined, '', 'smtp']) {
      const env = { ...smtpEnv, ...(flag === undefined ? {} : { AENURAL_EMAIL_TRANSPORT: flag }) };
      assert.equal(resolveEmailTransport(env, { local: true, sqlite: true }), 'smtp');
    }
  });
  it('throws instead of sending when no transport is configured', () => {
    assert.throws(() => resolveEmailTransport({}, { local: true, sqlite: true }), /AENURAL_EMAIL_TRANSPORT=local-outbox/);
    assert.throws(() => resolveEmailTransport({}, { local: false, sqlite: false }), /SMTP is required/);
    assert.throws(() => resolveEmailTransport({ AENURAL_EMAIL_TRANSPORT: 'smtp' }, { local: true, sqlite: true }), /requires SMTP_HOST/);
    assert.throws(() => resolveEmailTransport({ AENURAL_EMAIL_TRANSPORT: 'local-outbox' }, { local: false, sqlite: false }), /local development only/);
    assert.throws(() => resolveEmailTransport({ AENURAL_EMAIL_TRANSPORT: 'carrier-pigeon' }, { local: true, sqlite: true }), /must be "smtp" or "local-outbox"/);
  });
});

describe('membershipConfig — email transport flag', () => {
  let directory;
  before(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'aenural-otp-config-'));
  });
  after(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });
  const productionMysqlEnv = (overrides = {}) => ({
    NODE_ENV: 'production',
    AENURAL_MEMBERSHIP_ENABLED: '1',
    BETTER_AUTH_URL: 'https://aenural.com',
    BETTER_AUTH_SECRET: 'x'.repeat(40),
    DB_HOST: '127.0.0.1',
    DB_NAME: 'aenural_test', DB_USER: 'aenural_test', DB_PASSWORD: 'test-password',
    SMTP_HOST: 'smtp.hostinger.com', SMTP_USER: 'support@aenural.com',
    SMTP_PASSWORD: 'test-password', MAIL_FROM: 'support@aenural.com',
    AUTH_TRUSTED_IP_HEADER: 'x-real-ip',
    ...overrides,
  });
  it('rejects local-outbox in production and unknown flag values', () => {
    assert.throws(() => membershipConfig(productionMysqlEnv({ AENURAL_EMAIL_TRANSPORT: 'local-outbox' })), /local development only/);
    assert.throws(() => membershipConfig(productionMysqlEnv({ AENURAL_EMAIL_TRANSPORT: 'nope' })), /must be "smtp" or "local-outbox"/);
    assert.throws(() => assertEmailTransportFlag({ AENURAL_EMAIL_TRANSPORT: 'local-outbox' }, { local: false, sqlite: false }), /local development only/);
  });
  it('accepts an unset flag and keeps the SQLite dev default', () => {
    assert.equal(membershipConfig(productionMysqlEnv()).sqlite, false);
    const dev = membershipConfig({ NODE_ENV: 'development', AENURAL_LOCAL_DATA_DIR: directory, BETTER_AUTH_URL: 'http://localhost:3000' });
    assert.equal(dev.sqlite, true);
    assert.equal(dev.mysqlTls, null);
  });
});

describe('pending-verification cookie', () => {
  it('holds only the email, httpOnly, SameSite=Lax, 10-minute Max-Age', () => {
    const header = pendingVerificationCookieHeader('alice@example.test', { secure: false });
    assert.match(header, new RegExp(`^${PENDING_VERIFICATION_COOKIE}=alice%40example\\.test; Max-Age=${PENDING_VERIFICATION_MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax$`));
    assert.doesNotMatch(header, /Secure/);
    assert.equal(readPendingVerificationEmail(header), 'alice@example.test');
    assert.deepEqual(pendingVerificationStatus(header), { email: 'alice@example.test', emailMasked: 'al***@example.test', delivery: 'unknown' });
  });
  it('sets Secure outside local mode and clears with Max-Age=0', () => {
    assert.match(pendingVerificationCookieHeader('alice@example.test', { secure: true }), /; Secure$/);
    // S5-29: secure cookies use the __Host- prefix, so the clear
    // header clears the prefixed name.
    const cleared = clearPendingVerificationCookieHeader({ secure: true });
    assert.match(cleared, new RegExp(`^__Host-${PENDING_VERIFICATION_COOKIE}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Lax; Secure$`));
    assert.equal(readPendingVerificationEmail(cleared), null);
  });
  it('rejects malformed cookie values instead of trusting them', () => {
    assert.equal(readPendingVerificationEmail(''), null);
    assert.equal(readPendingVerificationEmail(`${PENDING_VERIFICATION_COOKIE}=not-an-email`), null);
    assert.equal(readPendingVerificationEmail(`${PENDING_VERIFICATION_COOKIE}=%E0%A4%A`), null);
    assert.equal(readPendingVerificationEmail('other=alice@example.test'), null);
    assert.equal(isValidPendingEmail('a@b'), false);
    assert.equal(isValidPendingEmail('alice@example.test'), true);
    assert.throws(() => pendingVerificationCookieHeader('not-an-email'), /valid email/);
  });
  it('serves the masked status from the cookie header', async () => {
    const response = handlePendingVerificationStatus(
      new Request('http://localhost:3000/api/membership/pending-verification', {
        headers: { cookie: pendingVerificationCookieHeader('alice@example.test') },
      }),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { email: 'alice@example.test', emailMasked: 'al***@example.test', delivery: 'unknown' });
    const empty = handlePendingVerificationStatus(new Request('http://localhost:3000/api/membership/pending-verification'));
    assert.deepEqual(await empty.json(), { email: null, emailMasked: null, delivery: 'unknown' });
  });
  it('reports delivery only with a valid sign-up signature cookie (Phase 4)', async () => {
    // The recovery route sets the email cookie for ANY well-formed
    // address, so reporting delivery for it would let anyone learn
    // whether an unverified account exists for an address. Delivery
    // is reported only when the HMAC signature cookie set at sign-up
    // verifies for that address.
    const secret = 'test-signing-secret-32-chars-minimum';
    const email = 'sig-gate@example.test';
    recordOtpDeliverySent(email);
    const emailCookie = pendingVerificationCookieHeader(email, { secure: false });
    const sigCookie = pendingVerificationSignatureCookieHeader(email, secret, { secure: false });
    assert.match(sigCookie, new RegExp(`^${PENDING_VERIFICATION_SIGNATURE_COOKIE}=[A-Za-z0-9_-]+; Max-Age=${PENDING_VERIFICATION_MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax$`));
    // Unsigned (recovery-set) cookie: email is shown, delivery is not.
    assert.deepEqual(pendingVerificationStatus(emailCookie), { email, emailMasked: 'si***@example.test', delivery: 'unknown' });
    // Signed cookie: delivery is reported.
    assert.deepEqual(pendingVerificationStatus(`${emailCookie}; ${sigCookie.split(';')[0]}`, { secret }), { email, emailMasked: 'si***@example.test', delivery: 'sent' });
    // Wrong secret, tampered signature, or a signature for another email: unknown.
    assert.equal(pendingVerificationStatus(`${emailCookie}; ${sigCookie.split(';')[0]}`, { secret: 'a-different-secret-32-chars-min' }).delivery, 'unknown');
    const sigValue = sigCookie.split(';')[0].split('=')[1];
    const tamperedValue = sigValue.slice(0, -1) + (sigValue.endsWith('A') ? 'B' : 'A');
    assert.equal(pendingVerificationStatus(`${emailCookie}; ${PENDING_VERIFICATION_SIGNATURE_COOKIE}=${tamperedValue}`, { secret }).delivery, 'unknown');
    const otherSig = pendingVerificationSignatureCookieHeader('other@example.test', secret, { secure: false });
    assert.equal(pendingVerificationStatus(`${emailCookie}; ${otherSig.split(';')[0]}`, { secret }).delivery, 'unknown');
    // The status handler passes the secret through; the email is still
    // returned without one, just without delivery.
    const response = handlePendingVerificationStatus(
      new Request('http://localhost:3000/api/membership/pending-verification', {
        headers: { cookie: `${emailCookie}; ${sigCookie.split(';')[0]}` },
      }),
      { secret },
    );
    assert.deepEqual(await response.json(), { email, emailMasked: 'si***@example.test', delivery: 'sent' });
    // Clearing removes the signature too.
    assert.match(clearPendingVerificationSignatureCookieHeader({ secure: false }), new RegExp(`^${PENDING_VERIFICATION_SIGNATURE_COOKIE}=; Max-Age=0;`));
    assert.throws(() => pendingVerificationSignatureCookieHeader(email, ''), /signing secret/);
    assert.throws(() => pendingVerificationSignatureCookieHeader('not-an-email', secret), /valid email/);
  });
});

// --- Integration: real Better Auth 1.7.14, temporary SQLite, local outbox ---
let integration = null;
let integrationError = null;
try {
  const authMod = await import('../server/membership/auth.mjs');
  const dbMod = await import('../server/membership/database.mjs');
  integration = { ...authMod, ...dbMod };
} catch (error) {
  integrationError = error;
}

describe('email OTP integration (live Better Auth, skipped without dependencies)', { skip: !integration }, () => {
  let directory;
  let auth;
  let db;
  let config;
  const origin = 'http://localhost:3000';
  const password = 'QA-Sample-Creator-123456';
  const ipFor = (n) => `10.20.30.${n}`;
  let ipCounter = 0;
  const nextIp = () => ipFor(++ipCounter);

  const call = (endpoint, body, ip = nextIp()) =>
    auth.handler(new Request(origin + '/api/auth/' + endpoint, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    }));
  const setCookies = (response) => response.headers.getSetCookie();
  const hasCookie = (response, name) => setCookies(response).some((value) => value.startsWith(name + '='));
  async function mailAll(email, subjectPart) {
    const files = (await readdir(directory)).filter((name) => name.startsWith('mail-'));
    const all = await Promise.all(files.map(async (name) => JSON.parse(await readFile(path.join(directory, name), 'utf8'))));
    return all
      .filter((message) => message.to === email && message.subject.includes(subjectPart))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const codeFromMail = (message) => message.text.match(/\b(\d{6})\b/)?.[1];
  async function ageVerificationRow(email) {
    await db.updateTable('verification')
      .set({ createdAt: new Date(Date.now() - 120_000).toISOString() })
      .where('identifier', '=', otpIdentifier('email-verification', email))
      .execute();
  }
  // Age a code past its 5-minute expiry (both columns: the plugin
  // checks expiresAt, the cooldown reads createdAt).
  async function ageVerificationRowExpired(email) {
    const past = new Date(Date.now() - 600_000).toISOString();
    await db.updateTable('verification')
      .set({ createdAt: past, expiresAt: past })
      .where('identifier', '=', otpIdentifier('email-verification', email))
      .execute();
  }
  // A wrong code derived from the real one (no literal 6-digit
  // strings in this file): flip the first digit so it can never
  // equal the real code.
  const wrongCode = (code) => (code[0] === '9' ? '0' : '9') + code.slice(1);
  async function register(email, ip) {
    const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: origin + '/sign-in' }, ip);
    assert.equal(response.status, 200, `sign-up for ${email} should succeed`);
    const body = await response.json();
    assert.equal(body.token, null, 'no session is issued at sign-up');
    assert.equal(body.user.emailVerified, false);
    return { response, body };
  }

  before(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'aenural-email-otp-'));
    process.env.NODE_ENV = 'test';
    process.env.AENURAL_MEMBERSHIP_ENABLED = '1';
    process.env.AENURAL_LOCAL_DATA_DIR = directory;
    process.env.AENURAL_EMAIL_TRANSPORT = 'local-outbox';
    process.env.BETTER_AUTH_URL = origin;
    auth = await integration.membershipAuth();
    ({ db, config } = await integration.membershipDatabase());
  });
  after(async () => {
    await db?.destroy();
    const resolved = path.resolve(directory || '');
    const allowed = path.resolve(os.tmpdir()) + path.sep + 'aenural-email-otp-';
    if (resolved.toLowerCase().startsWith(allowed.toLowerCase())) await rm(resolved, { recursive: true, force: true });
  });

  it('sign-up sends a 6-digit OTP email (not a link) and sets the pending cookie', async () => {
    const email = 'otp-signup@example.test';
    const { response } = await register(email, nextIp());
    assert.ok(hasCookie(response, PENDING_VERIFICATION_COOKIE), 'sign-up sets the pending-verification cookie');
    const cookie = setCookies(response).find((value) => value.startsWith(PENDING_VERIFICATION_COOKIE + '='));
    const sigCookie = setCookies(response).find((value) => value.startsWith(PENDING_VERIFICATION_SIGNATURE_COOKIE + '='));
    assert.ok(sigCookie, 'sign-up sets the delivery-signature cookie (Phase 4 oracle guard)');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Max-Age=600/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, new RegExp(encodeURIComponent(email)));
    assert.doesNotMatch(cookie, /Secure/, 'local mode uses plain HTTP, so no Secure flag');
    // Stage F: the send was recorded as delivered (the local-outbox
    // write succeeded), so the verify page can trust the status instead
    // of guessing whether a code is on its way. Phase 4: delivery is
    // reported only for the signed sign-up session, so the request must
    // carry both cookies and the server secret — exactly as the app
    // route does (see src/app/api/membership/[...path]/route.ts).
    const statusResponse = handlePendingVerificationStatus(new Request(origin + '/api/membership/pending-verification', {
      headers: { cookie: `${cookie.split(';')[0]}; ${sigCookie.split(';')[0]}` },
    }), { secret: config.secret });
    assert.deepEqual(await statusResponse.json(), { email, emailMasked: maskEmail(email), delivery: 'sent' });
    const messages = await mailAll(email, 'verification code');
    assert.equal(messages.length, 1, 'exactly one OTP mail is sent at sign-up');
    assert.equal(messages[0].subject, OTP_EMAIL_SUBJECT);
    assert.match(messages[0].text, /\b\d{6}\b/);
    assert.equal(messages[0].url, null, 'OTP mail carries no verification link');
    assert.equal((await mailAll(email, 'Verify your AENural email')).length, 0, 'no link verification mail is sent');
    // Unverified users still cannot sign in.
    const blocked = await call('sign-in/email', { email, password }, nextIp());
    assert.equal(blocked.status, 403);
  });

  it('resend within 60s is silently dropped with the same generic success', async () => {
    const email = 'otp-cooldown@example.test';
    await register(email, nextIp());
    const before = await mailAll(email, 'verification code');
    assert.equal(before.length, 1);
    const resend = await call('email-otp/send-verification-otp', { email, type: 'email-verification' }, nextIp());
    assert.equal(resend.status, 200);
    assert.deepEqual(await resend.json(), { success: true });
    const after = await mailAll(email, 'verification code');
    assert.equal(after.length, 1, 'no new code is created or sent inside the cooldown');
    assert.equal(codeFromMail(after[0]), codeFromMail(before[0]), 'the original code is untouched');
  });

  it('send for an unknown address returns the same generic success and sends nothing', async () => {
    const response = await call('email-otp/send-verification-otp', { email: 'nobody-here@example.test', type: 'email-verification' }, nextIp());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true });
    assert.equal((await mailAll('nobody-here@example.test', 'verification code')).length, 0);
  });

  it('resend after the cooldown rotates the code and the old code stops working', async () => {
    const email = 'otp-rotate@example.test';
    const ip = nextIp();
    await register(email, ip);
    const first = (await mailAll(email, 'verification code'))[0];
    const firstCode = codeFromMail(first);
    await ageVerificationRow(email);
    const resend = await call('email-otp/send-verification-otp', { email, type: 'email-verification' }, nextIp());
    assert.equal(resend.status, 200);
    const messages = await mailAll(email, 'verification code');
    assert.equal(messages.length, 2, 'a new code is sent after the cooldown');
    const secondCode = codeFromMail(messages[0]);
    assert.notEqual(secondCode, firstCode, 'the new code differs from the old one');
    const stale = await call('email-otp/verify-email', { email, otp: firstCode }, nextIp());
    assert.equal(stale.status, 400);
    assert.equal((await stale.json()).code, 'INVALID_OTP');
    const good = await call('email-otp/verify-email', { email, otp: secondCode }, nextIp());
    assert.equal(good.status, 200);
    const goodBody = await good.json();
    assert.equal(goodBody.status, true);
    assert.equal(goodBody.user.emailVerified, true);
    assert.ok(goodBody.token, 'a session token is issued only after successful OTP verification');
    assert.ok(hasCookie(good, 'better-auth.session_token'), 'the session cookie is set on verification');
    const cleared = setCookies(good).find((value) => value.startsWith(PENDING_VERIFICATION_COOKIE + '='));
    assert.match(cleared, /Max-Age=0/, 'the pending cookie is cleared after verification');
    const login = await call('sign-in/email', { email, password }, nextIp());
    assert.equal(login.status, 200, 'password sign-in works after OTP verification');
  });

  it('five wrong codes invalidate the code (TOO_MANY_ATTEMPTS on the sixth)', async () => {
    const email = 'otp-attempts@example.test';
    await register(email, nextIp());
    const code = codeFromMail((await mailAll(email, 'verification code'))[0]);
    for (let attempt = 1; attempt <= 5; attempt++) {
      const wrong = await call('email-otp/verify-email', { email, otp: '000000' }, `10.20.40.${attempt}`);
      assert.equal(wrong.status, 400, `wrong attempt ${attempt} is rejected`);
      assert.equal((await wrong.json()).code, 'INVALID_OTP');
    }
    const sixth = await call('email-otp/verify-email', { email, otp: '000000' }, '10.20.40.6');
    assert.equal(sixth.status, 403);
    assert.equal((await sixth.json()).code, 'TOO_MANY_ATTEMPTS');
    // The code is gone after TOO_MANY_ATTEMPTS: even the right code fails.
    const gone = await call('email-otp/verify-email', { email, otp: code }, '10.20.40.7');
    assert.equal(gone.status, 400);
    assert.equal((await gone.json()).code, 'INVALID_OTP');
    // A fresh code can be requested (no cooldown row survives).
    const resend = await call('email-otp/send-verification-otp', { email, type: 'email-verification' }, nextIp());
    assert.equal(resend.status, 200);
    const fresh = codeFromMail((await mailAll(email, 'verification code'))[0]);
    assert.notEqual(fresh, code);
    const good = await call('email-otp/verify-email', { email, otp: fresh }, nextIp());
    assert.equal(good.status, 200);
  });

  it('stores the OTP hashed, never in plain text', async () => {
    const email = 'otp-hashed@example.test';
    await register(email, nextIp());
    const code = codeFromMail((await mailAll(email, 'verification code'))[0]);
    const row = await db.selectFrom('verification').select(['identifier', 'value'])
      .where('identifier', '=', otpIdentifier('email-verification', email)).executeTakeFirst();
    assert.ok(row, 'a verification row exists for the OTP');
    assert.equal(row.identifier, otpIdentifier('email-verification', email));
    assert.ok(!String(row.value).includes(code), 'the stored value must not contain the plain code');
  });

  it('closes passwordless sign-in, OTP password reset and the check-only endpoint', async () => {
    const cases = [
      ['sign-in/email-otp', { email: 'otp-signup@example.test', otp: '123456' }],
      ['email-otp/request-password-reset', { email: 'otp-signup@example.test' }],
      ['email-otp/reset-password', { email: 'otp-signup@example.test', otp: '123456', password: 'QA-New-Sample-Password-123' }],
      ['forget-password/email-otp', { email: 'otp-signup@example.test' }],
      ['email-otp/check-verification-otp', { email: 'otp-signup@example.test', type: 'email-verification', otp: '123456' }],
      ['email-otp/request-email-change', { newEmail: 'other@example.test' }],
      ['email-otp/change-email', { newEmail: 'other@example.test', otp: '123456' }],
      ['email-otp/send-verification-otp', { email: 'otp-signup@example.test', type: 'sign-in' }],
      ['email-otp/send-verification-otp', { email: 'otp-signup@example.test', type: 'forget-password' }],
    ];
    for (const [endpoint, body] of cases) {
      const response = await call(endpoint, body, nextIp());
      assert.equal(response.status, 404, `${endpoint} must be closed`);
      assert.deepEqual(await response.json(), { message: 'This request could not be completed.' });
    }
  });

  it('keeps the link-based password reset working', async () => {
    const email = 'otp-reset@example.test';
    await register(email, nextIp());
    const known = await call('request-password-reset', { email, redirectTo: origin + '/reset-password' }, nextIp());
    const unknown = await call('request-password-reset', { email: 'nobody-here@example.test', redirectTo: origin + '/reset-password' }, nextIp());
    assert.equal(known.status, unknown.status);
    assert.deepEqual(await known.json(), await unknown.json());
    const resetMail = (await mailAll(email, 'Reset your AENural password'))[0];
    assert.ok(resetMail, 'a reset link mail is sent');
    // Same shape the existing suite relies on: the token is the last
    // path segment of /api/auth/reset-password/<token>?callbackURL=...
    assert.match(resetMail.url, /\/api\/auth\/reset-password\/[A-Za-z0-9]+/);
    assert.ok(new URL(resetMail.url).pathname.split('/').at(-1));
  });

  it('recovery answers identically for unknown, verified and unverified addresses', async () => {
    const recover = (email) => handlePendingVerificationRecovery(
      new Request(origin + '/api/membership/pending-verification/resend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      }),
      { auth, db, config, checkEmailTransportHealth: integration.checkEmailTransportHealth },
    );
    // Unverified: sign up, then age the code past the cooldown so the
    // recovery resend is allowed to send a fresh code.
    const pendingEmail = 'otp-recovery-pending@example.test';
    await register(pendingEmail, nextIp());
    await ageVerificationRow(pendingEmail);
    // Verified: sign up and verify immediately.
    const verifiedEmail = 'otp-recovery-verified@example.test';
    await register(verifiedEmail, nextIp());
    const verifiedCode = codeFromMail((await mailAll(verifiedEmail, 'verification code'))[0]);
    assert.equal((await call('email-otp/verify-email', { email: verifiedEmail, otp: verifiedCode }, nextIp())).status, 200);

    const unknownBefore = (await mailAll('nobody-here@example.test', 'verification code')).length;
    const verifiedBefore = (await mailAll(verifiedEmail, 'verification code')).length;
    const pendingBefore = (await mailAll(pendingEmail, 'verification code')).length;

    const unknownRes = await recover('nobody-here@example.test');
    const verifiedRes = await recover(verifiedEmail);
    const pendingRes = await recover(pendingEmail);
    const expectedBody = { success: true, message: PENDING_VERIFICATION_RECOVERY_MESSAGE };
    assert.equal(unknownRes.status, 200);
    assert.equal(verifiedRes.status, 200);
    assert.equal(pendingRes.status, 200);
    assert.deepEqual(await unknownRes.json(), expectedBody);
    assert.deepEqual(await verifiedRes.json(), expectedBody);
    assert.deepEqual(await pendingRes.json(), expectedBody);
    // The pending cookie is set for every well-formed address.
    for (const res of [unknownRes, verifiedRes, pendingRes]) {
      assert.ok(res.headers.getSetCookie().some((value) => value.startsWith(PENDING_VERIFICATION_COOKIE + '=')), 'recovery sets the pending cookie');
    }
    // Only the unverified account receives a new code.
    assert.equal((await mailAll('nobody-here@example.test', 'verification code')).length, unknownBefore);
    assert.equal((await mailAll(verifiedEmail, 'verification code')).length, verifiedBefore);
    assert.equal((await mailAll(pendingEmail, 'verification code')).length, pendingBefore + 1);
  });

  it('S5-05: calling the resend route twice in a row sends only one code', async () => {
    // Settles the S5-05 question with a live run: the per-email 60s
    // resend cooldown in the before-hook DOES run for the server-side
    // auth.api.sendVerificationOTP() call the recovery route makes —
    // the second immediate call sends nothing. (The per-IP rate limit
    // does not inherit: a server-side call carries no client IP. The
    // route's own bounds are the per-email budget + the route-level
    // per-IP throttle — see pending-verification.mjs.)
    const recover = (email) => handlePendingVerificationRecovery(
      new Request(origin + '/api/membership/pending-verification/resend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      }),
      { auth, db, config, checkEmailTransportHealth: integration.checkEmailTransportHealth },
    );
    const email = 'otp-resend-route-twice@example.test';
    await register(email, nextIp());
    await ageVerificationRow(email);
    assert.equal((await mailAll(email, 'verification code')).length, 1);
    const first = await recover(email);
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { success: true, message: PENDING_VERIFICATION_RECOVERY_MESSAGE });
    assert.equal((await mailAll(email, 'verification code')).length, 2, 'first recovery resend sends a fresh code');
    const second = await recover(email);
    assert.equal(second.status, 200);
    assert.deepEqual(await second.json(), { success: true, message: PENDING_VERIFICATION_RECOVERY_MESSAGE });
    assert.equal((await mailAll(email, 'verification code')).length, 2, 'second immediate recovery resend is suppressed');
  });

  it('S5-39(1): rotated code gets a fresh 5-guess budget after 4 wrong guesses', async () => {
    const email = 'otp-fresh-budget@example.test';
    await register(email, nextIp());
    const firstCode = codeFromMail((await mailAll(email, 'verification code'))[0]);
    for (let attempt = 1; attempt <= 4; attempt++) {
      const wrong = await call('email-otp/verify-email', { email, otp: wrongCode(firstCode) }, nextIp());
      assert.equal(wrong.status, 400, `wrong attempt ${attempt} on first code is rejected`);
      assert.equal((await wrong.json()).code, 'INVALID_OTP');
    }
    await ageVerificationRow(email);
    const resend = await call('email-otp/send-verification-otp', { email, type: 'email-verification' }, nextIp());
    assert.equal(resend.status, 200);
    const secondCode = codeFromMail((await mailAll(email, 'verification code'))[0]);
    assert.notEqual(secondCode, firstCode);
    for (let attempt = 1; attempt <= 5; attempt++) {
      const wrong = await call('email-otp/verify-email', { email, otp: wrongCode(secondCode) }, nextIp());
      assert.equal(wrong.status, 400, `wrong attempt ${attempt} on rotated code is rejected`);
      assert.equal((await wrong.json()).code, 'INVALID_OTP');
    }
    const sixth = await call('email-otp/verify-email', { email, otp: wrongCode(secondCode) }, nextIp());
    assert.equal(sixth.status, 403);
    assert.equal((await sixth.json()).code, 'TOO_MANY_ATTEMPTS');
  });

  it('S5-39(2): a code aged past 5 minutes fails as expired', async () => {
    const email = 'otp-expired@example.test';
    await register(email, nextIp());
    const code = codeFromMail((await mailAll(email, 'verification code'))[0]);
    await ageVerificationRowExpired(email);
    const response = await call('email-otp/verify-email', { email, otp: code }, nextIp());
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 'OTP_EXPIRED');
  });

  it('S5-39(3): verifying the same code twice fails the second time', async () => {
    const email = 'otp-reuse@example.test';
    await register(email, nextIp());
    const code = codeFromMail((await mailAll(email, 'verification code'))[0]);
    const first = await call('email-otp/verify-email', { email, otp: code }, nextIp());
    assert.equal(first.status, 200);
    const second = await call('email-otp/verify-email', { email, otp: code }, nextIp());
    assert.equal(second.status, 400);
    assert.equal((await second.json()).code, 'INVALID_OTP');
  });

  it('S5-14: duplicate sign-up sets no signature cookie (and creates no second account)', async () => {
    const email = 'otp-duplicate@example.test';
    const { response: first } = await register(email, nextIp());
    assert.ok(hasCookie(first, PENDING_VERIFICATION_SIGNATURE_COOKIE), 'first sign-up sets the signature cookie');
    const dup = await call('sign-up/email', { name: 'QA Creator', email, password: 'QA-Other-Password-123456', callbackURL: origin + '/sign-in' }, nextIp());
    assert.equal(dup.status, 200, 'duplicate sign-up stays a generic success (no "already exists" error)');
    assert.ok(hasCookie(dup, PENDING_VERIFICATION_COOKIE), 'duplicate sign-up still sets the email cookie');
    assert.ok(!hasCookie(dup, PENDING_VERIFICATION_SIGNATURE_COOKIE), 'duplicate sign-up must NOT set the signature cookie');
    const rows = await db.selectFrom('user').select('id').where('email', '=', email).execute();
    assert.equal(rows.length, 1, 'no second user row is created');
    assert.equal((await mailAll(email, 'verification code')).length, 1, 'no second code is sent');
  });

  it('S5-15: unverified sign-in sets the signature cookie, so delivery is readable', async () => {
    const email = 'otp-signin-sig@example.test';
    await register(email, nextIp());
    const signin = await call('sign-in/email', { email, password }, nextIp());
    assert.equal(signin.status, 403);
    assert.equal((await signin.json()).code, 'EMAIL_NOT_VERIFIED');
    assert.ok(hasCookie(signin, PENDING_VERIFICATION_COOKIE), 'sign-in sets the pending email cookie');
    assert.ok(hasCookie(signin, PENDING_VERIFICATION_SIGNATURE_COOKIE), 'sign-in sets the signature cookie (S5-15)');
    const cookies = setCookies(signin).map((value) => value.split(';')[0]).join('; ');
    const statusResponse = handlePendingVerificationStatus(
      new Request(origin + '/api/membership/pending-verification', { headers: { cookie: cookies } }),
      { secret: config.secret },
    );
    assert.deepEqual(await statusResponse.json(), { email, emailMasked: maskEmail(email), delivery: 'sent' });
  });

  it('S5-16: after 10 resends in an hour the 11th is suppressed with generic success', async () => {
    const email = 'otp-resend-budget@example.test';
    await register(email, nextIp());
    assert.equal((await mailAll(email, 'verification code')).length, 1);
    for (let i = 1; i <= 10; i++) {
      await ageVerificationRow(email);
      const resend = await call('email-otp/send-verification-otp', { email, type: 'email-verification' }, nextIp());
      assert.equal(resend.status, 200);
      assert.deepEqual(await resend.json(), { success: true });
      assert.equal((await mailAll(email, 'verification code')).length, 1 + i, `resend ${i} sends a code`);
    }
    await ageVerificationRow(email);
    const blocked = await call('email-otp/send-verification-otp', { email, type: 'email-verification' }, nextIp());
    assert.equal(blocked.status, 200);
    assert.deepEqual(await blocked.json(), { success: true }, 'throttled resend answers the same generic success');
    assert.equal((await mailAll(email, 'verification code')).length, 11, 'no 11th code is sent inside the budget');
  });

  it('S5-09: password-reset mail has a 60s per-email cooldown with generic responses', async () => {
    const email = 'otp-reset-cooldown@example.test';
    await register(email, nextIp());
    const resetMailCount = async () => (await mailAll(email, 'Reset your AENural password')).length;
    const first = await call('request-password-reset', { email, redirectTo: origin + '/reset-password' }, nextIp());
    assert.equal(first.status, 200);
    const firstBody = await first.json();
    assert.equal(await resetMailCount(), 1, 'first reset request sends one reset mail');
    const second = await call('request-password-reset', { email, redirectTo: origin + '/reset-password' }, nextIp());
    assert.equal(second.status, 200);
    assert.deepEqual(await second.json(), firstBody, 'cooled-down reset answers identically');
    assert.equal(await resetMailCount(), 1, 'no second reset mail inside the 60s cooldown');
  });

  it('S5-34: guest prune deletes only old, unused guest rows', async () => {
    const oldMs = Date.now() - 100 * 24 * 60 * 60 * 1000;
    const oldCreatedAt = dbTimestamp(oldMs);
    const nowCreatedAt = dbTimestamp();
    const insertGuest = async (id, createdAt) => {
      await db.insertInto('user').values({ id, email: `${id}@guest.invalid`, name: 'Guest', emailVerified: 0, createdAt, updatedAt: createdAt }).execute();
    };
    const oldUnused = 'prune-old-unused-1';
    const oldUsed = 'prune-old-used-1';
    const recent = 'prune-recent-1';
    await insertGuest(oldUnused, oldCreatedAt);
    await insertGuest(oldUsed, oldCreatedAt);
    await insertGuest(recent, nowCreatedAt);
    await db.insertInto('aenural_daily_usage').values({ id: `${oldUsed}:2026-01-01`, owner_id: oldUsed, day: '2026-01-01', used: 1 }).execute();
    const oldMemberId = randomUUID();
    await db.insertInto('user').values({ id: oldMemberId, email: 'prune-old-member@example.test', name: 'Member', emailVerified: 1, createdAt: oldCreatedAt, updatedAt: oldCreatedAt }).execute();
    const deleted = await pruneStaleGuests(db, { olderThanDays: 90 });
    assert.equal(deleted, 1, 'exactly the old unused guest row is pruned');
    const remaining = async (id) => db.selectFrom('user').select('id').where('id', '=', id).executeTakeFirst();
    assert.equal(await remaining(oldUnused), undefined);
    assert.ok(await remaining(oldUsed), 'old guest WITH quota history is kept');
    assert.ok(await remaining(recent), 'recent guest is kept');
    assert.ok(await remaining(oldMemberId), 'old non-guest user is kept');
  });

  it('S5-33: project() never echoes unvalidated stored payload keys', async () => {
    const email = 'otp-project-read@example.test';
    const { body } = await register(email, nextIp());
    const ownerId = body.user.id;
    const service = createMemberService(db, { local: true });
    const projectId = randomUUID();
    const tampered = {
      schemaVersion: 1, title: 'My project',
      source: { filename: 'video.mp4', durationSeconds: 10, width: 640, height: 360 },
      captions: { filename: 'c.srt', format: 'srt', cues: [{ id: '1', text: 'hi', start: 0, end: 1000 }] },
      style: { preset: 'Clean' }, alignment: [],
      admin: true, secretKey: 'do-not-echo', nested: { evil: 1 },
    };
    await db.insertInto('aenural_projects').values({
      id: projectId, owner_id: ownerId, title: 'My project',
      payload: JSON.stringify(tampered), revision: 1,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).execute();
    const got = await service.project(ownerId, projectId);
    assert.equal(got.admin, undefined);
    assert.equal(got.secretKey, undefined);
    assert.equal(got.nested, undefined);
    assert.equal(got.title, 'My project');
    assert.equal(got.source.filename, 'video.mp4');
    assert.equal(got.captions.cues[0].text, 'hi');
  });
});

if (!integration) {
  it('email OTP integration tests need installed dependencies (skipped)', (t) => {
    t.skip(`better-auth/kysely/mysql2/nodemailer not installed: ${integrationError?.message || 'unknown error'}`);
  });
}
