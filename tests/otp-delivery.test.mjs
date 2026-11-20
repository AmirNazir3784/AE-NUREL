// Tests for the Stage F OTP delivery-failure mitigation (Better Auth 1.7.14).
//
// Two layers, in one file:
//   * Pure tests — server/membership/otp-delivery.mjs. Dependency-free:
//     they run with `node --test` and no node_modules.
//   * Integration tests — the real auth instance against a temporary
//     SQLite database, using the same mkdtemp pattern as
//     tests/email-otp.test.mjs. They are skipped automatically when
//     better-auth/kysely/mysql2/nodemailer are not installed. No real
//     email is ever sent and no live database is touched.
//
// What the integration tests prove (and how they simulate failure
// deterministically, without a real SMTP server):
//   * Transport DOWN at check time: SMTP pointed at a closed loopback
//     port (127.0.0.1:15991). The transport pre-check fails fast with a
//     generic 503 and no account is created, no code is sent, no
//     duplicate can arise. Switching the environment back to the local
//     outbox proves retry works afterwards.
//   * Transport HEALTHY at check time but DEAD at send time (the race
//     Better Auth's swallow hides): the local-outbox directory is
//     removed after startup, so the send throws ENOENT after the
//     pre-check passed. Sign-up still answers 200 — that IS the
//     Better Auth 1.7.14 swallow, reproduced on purpose — but the
//     tracker records 'failed' and the status endpoint reports it, so
//     the verify page can tell the user honestly. Restoring the
//     directory proves resend + verification then work, with the 60s
//     cooldown preserved across the failed send.
//
// Rate-limit note: Better Auth limits are per IP + path, so each test
// uses its own x-forwarded-for address (local mode reads that header).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  OTP_DELIVERY_MAX_ENTRIES,
  OTP_DELIVERY_TTL_MS,
  createOtpDeliveryTracker,
  getOtpDeliveryStatus,
} from '../server/membership/otp-delivery.mjs';
import {
  PENDING_VERIFICATION_COOKIE,
  PENDING_VERIFICATION_SIGNATURE_COOKIE,
  handlePendingVerificationRecovery,
  handlePendingVerificationStatus,
} from '../server/membership/pending-verification.mjs';
import { otpIdentifier } from '../server/membership/email-otp.mjs';

describe('createOtpDeliveryTracker (pure)', () => {
  it('starts unknown, records sent and failed per address', () => {
    const tracker = createOtpDeliveryTracker();
    assert.equal(tracker.statusFor('alice@example.test'), 'unknown');
    assert.equal(tracker.recordSent('alice@example.test'), true);
    assert.equal(tracker.statusFor('alice@example.test'), 'sent');
    assert.equal(tracker.recordFailed('bob@example.test', 'ECONNREFUSED'), true);
    assert.equal(tracker.statusFor('bob@example.test'), 'failed');
    // Addresses are independent: recording one never affects another.
    assert.equal(tracker.statusFor('alice@example.test'), 'sent');
  });
  it('normalises case and whitespace, and never throws on bad input', () => {
    const tracker = createOtpDeliveryTracker();
    assert.equal(tracker.recordSent('  ALICE@Example.Test '), true);
    assert.equal(tracker.statusFor('alice@example.test'), 'sent');
    assert.equal(tracker.recordSent('not-an-email'), false);
    assert.equal(tracker.recordSent(''), false);
    assert.equal(tracker.recordSent(null), false);
    assert.equal(tracker.recordFailed(undefined, 'ECONNREFUSED'), false);
    assert.equal(tracker.statusFor(null), 'unknown');
    assert.equal(tracker.statusFor(''), 'unknown');
  });
  it('a later record overwrites the earlier status for the same address', () => {
    const tracker = createOtpDeliveryTracker();
    tracker.recordFailed('alice@example.test', 'ECONNREFUSED');
    assert.equal(tracker.statusFor('alice@example.test'), 'failed');
    tracker.recordSent('alice@example.test');
    assert.equal(tracker.statusFor('alice@example.test'), 'sent');
  });
  it('entries expire after the TTL (10 minutes, matching the pending cookie)', () => {
    let nowMs = 1_000_000;
    const tracker = createOtpDeliveryTracker({ now: () => nowMs });
    tracker.recordSent('alice@example.test');
    assert.equal(tracker.statusFor('alice@example.test'), 'sent');
    nowMs += OTP_DELIVERY_TTL_MS - 1;
    assert.equal(tracker.statusFor('alice@example.test'), 'sent');
    nowMs += 2;
    assert.equal(tracker.statusFor('alice@example.test'), 'unknown');
    assert.equal(tracker.size(), 0);
  });
  it('caps the map and evicts the oldest entry first', () => {
    const tracker = createOtpDeliveryTracker();
    for (let i = 0; i < OTP_DELIVERY_MAX_ENTRIES + 5; i++) {
      tracker.recordSent(`user${i}@example.test`);
    }
    assert.equal(tracker.size(), OTP_DELIVERY_MAX_ENTRIES);
    assert.equal(tracker.statusFor('user0@example.test'), 'unknown');
    assert.equal(tracker.statusFor(`user${OTP_DELIVERY_MAX_ENTRIES + 4}@example.test`), 'sent');
  });
  it('keeps the transport error code server-side only (status never carries it)', () => {
    const tracker = createOtpDeliveryTracker();
    tracker.recordFailed('alice@example.test', 'ECONNREFUSED');
    const entry = tracker.getEntry('alice@example.test');
    assert.equal(entry.status, 'failed');
    assert.equal(entry.errorCode, 'ECONNREFUSED');
    // The public status is just the word 'failed' — nothing else.
    assert.equal(tracker.statusFor('alice@example.test'), 'failed');
    assert.equal(tracker.getEntry('nobody@example.test'), null);
  });
});

describe('pending-verification status with delivery (pure)', () => {
  it('returns delivery unknown without a cookie, and never leaks internals', async () => {
    const empty = handlePendingVerificationStatus(
      new Request('http://localhost:3000/api/membership/pending-verification'),
    );
    assert.deepEqual(await empty.json(), { email: null, emailMasked: null, delivery: 'unknown' });
  });
  it('returns only email, masked email and delivery for the cookie owner', async () => {
    const { pendingVerificationCookieHeader } = await import('../server/membership/pending-verification.mjs');
    const response = handlePendingVerificationStatus(
      new Request('http://localhost:3000/api/membership/pending-verification', {
        headers: { cookie: pendingVerificationCookieHeader('alice@example.test') },
      }),
    );
    const body = await response.json();
    assert.deepEqual(Object.keys(body).sort(), ['delivery', 'email', 'emailMasked']);
    assert.equal(body.delivery, 'unknown', 'no send was recorded for this address in this process');
    assert.ok(!JSON.stringify(body).includes('ECONNREFUSED'));
  });
});

// --- Integration: real Better Auth 1.7.14, temporary SQLite ---
let integration = null;
let integrationError = null;
try {
  const authMod = await import('../server/membership/auth.mjs');
  const dbMod = await import('../server/membership/database.mjs');
  integration = { ...authMod, ...dbMod };
} catch (error) {
  integrationError = error;
}

describe('OTP delivery failure integration (live Better Auth, skipped without dependencies)', { skip: !integration }, () => {
  let directory;
  let auth;
  let db;
  let config;
  const origin = 'http://localhost:3000';
  const password = 'QA-Sample-Creator-123456';
  let ipCounter = 100;
  const nextIp = () => `10.30.40.${++ipCounter}`;

  const call = (endpoint, body, ip = nextIp(), extraHeaders = {}) =>
    auth.handler(new Request(origin + '/api/auth/' + endpoint, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': ip, ...extraHeaders },
      body: JSON.stringify(body),
    }));
  const setCookies = (response) => response.headers.getSetCookie();
  const pendingCookieOf = (response) =>
    setCookies(response).find((value) => value.startsWith(PENDING_VERIFICATION_COOKIE + '='));
  // Sign-up sets BOTH the pending cookie and the HMAC signature cookie
  // (Phase 4 oracle guard); the status endpoint only reports delivery
  // when the signature verifies, so tests must send both name=value
  // pairs — exactly as a browser would after sign-up.
  const signedCookiesOf = (response) =>
    setCookies(response)
      .filter((value) =>
        value.startsWith(PENDING_VERIFICATION_COOKIE + '=') ||
        value.startsWith(PENDING_VERIFICATION_SIGNATURE_COOKIE + '='))
      .map((value) => value.split(';')[0])
      .join('; ');
  async function mailAll(email) {
    let files = [];
    try {
      files = (await readdir(directory)).filter((name) => name.startsWith('mail-'));
    } catch {
      return [];
    }
    const all = await Promise.all(files.map(async (name) => JSON.parse(await readFile(path.join(directory, name), 'utf8'))));
    return all.filter((message) => message.to === email && message.subject.includes('verification code'))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const codeFromMail = (message) => message.text.match(/\b(\d{6})\b/)?.[1];
  async function userCount() {
    return (await db.selectFrom('user').select('id').execute()).length;
  }
  async function ageVerificationRow(email) {
    await db.updateTable('verification')
      .set({ createdAt: new Date(Date.now() - 120_000).toISOString() })
      .where('identifier', '=', otpIdentifier('email-verification', email))
      .execute();
  }
  async function deliveryStatusFor(cookie) {
    const response = handlePendingVerificationStatus(
      new Request(origin + '/api/membership/pending-verification', { headers: { cookie } }),
      { secret: config.secret },
    );
    return response.json();
  }
  // Point mail at a closed loopback port: TCP connect fails instantly
  // (ECONNREFUSED), so the health check fails fast with no hang.
  function useBrokenSmtp() {
    delete process.env.AENURAL_EMAIL_TRANSPORT;
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = '15991';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'support@aenural.com';
    process.env.SMTP_PASSWORD = 'not-a-real-password';
    process.env.MAIL_FROM = 'support@aenural.com';
  }
  function useLocalOutbox() {
    process.env.AENURAL_EMAIL_TRANSPORT = 'local-outbox';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.MAIL_FROM;
  }

  before(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'aenural-otp-delivery-'));
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
    const allowed = path.resolve(os.tmpdir()) + path.sep + 'aenural-otp-delivery-';
    if (resolved.toLowerCase().startsWith(allowed.toLowerCase())) await rm(resolved, { recursive: true, force: true });
  });

  it('sign-up fails fast with a generic 503 when the transport is down — no account, no code, no duplicate', async () => {
    useBrokenSmtp();
    const before = await userCount();
    const response = await call('sign-up/email', { name: 'QA Creator', email: 'down-signup@example.test', password, callbackURL: origin + '/sign-in' });
    assert.equal(response.status, 503, 'mail down must fail fast, not create a silent account');
    const body = await response.json();
    assert.equal(body.message, 'Account services are temporarily unavailable. Try again.');
    assert.ok(!JSON.stringify(body).includes('SMTP') && !JSON.stringify(body).includes('15991'), 'no provider internals in the customer error');
    assert.equal(await userCount(), before, 'no account was created by the failed attempt');
    // A second identical attempt is the same 503, still no account:
    // retrying a failed sign-up can never create a duplicate.
    const retry = await call('sign-up/email', { name: 'QA Creator', email: 'down-signup@example.test', password, callbackURL: origin + '/sign-in' });
    assert.equal(retry.status, 503);
    assert.equal(await userCount(), before);
    assert.equal(pendingCookieOf(response), undefined, 'no pending cookie is set when sign-up never happened');
    assert.equal(getOtpDeliveryStatus('down-signup@example.test'), 'unknown', 'no send was attempted, so nothing is recorded');
  });

  it('resend and recovery answer the same generic 503 while mail is down', async () => {
    // This test runs while the transport is still broken from the
    // previous test. No account exists for either address, and the 503
    // must be identical for both — it cannot enumerate accounts.
    useBrokenSmtp();
    const resend = await call('email-otp/send-verification-otp', { email: 'down-signup@example.test', type: 'email-verification' });
    assert.equal(resend.status, 503);
    assert.equal((await resend.json()).message, 'Account services are temporarily unavailable. Try again.');
    const recover = (email) => handlePendingVerificationRecovery(
      new Request(origin + '/api/membership/pending-verification/resend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      }),
      { auth, db, config, checkEmailTransportHealth: integration.checkEmailTransportHealth },
    );
    const unknownRes = await recover('nobody-here@example.test');
    const knownRes = await recover('down-signup@example.test');
    assert.equal(unknownRes.status, 503);
    assert.equal(knownRes.status, 503);
    assert.deepEqual(await unknownRes.json(), await knownRes.json());
  });

  it('sign-up works again once mail recovers, and the send is recorded as sent', async () => {
    useLocalOutbox();
    const email = 'recovered@example.test';
    const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: origin + '/sign-in' });
    assert.equal(response.status, 200);
    assert.equal((await mailAll(email)).length, 1, 'exactly one code is sent after recovery');
    const status = await deliveryStatusFor(signedCookiesOf(response));
    assert.deepEqual(status, { email, emailMasked: 're***@example.test', delivery: 'sent' });
    assert.equal(getOtpDeliveryStatus(email), 'sent');
  });

  it('a send that fails AFTER the pre-check still answers success (the 1.7.14 swallow) but is recorded as failed', async () => {
    // Healthy at check time (local outbox), dead at send time: remove
    // the outbox directory after startup, so the mail write throws
    // ENOENT inside the send callback — after the pre-check passed.
    useLocalOutbox();
    const email = 'race-failure@example.test';
    await rm(directory, { recursive: true, force: true });
    try {
      const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: origin + '/sign-in' });
      // THIS is the Better Auth 1.7.14 limitation, reproduced: the
      // response is success even though no mail exists. The fix is not
      // the status code — 1.7.14 gives us no way to change it — it is
      // that the failure is now recorded and visible to the user.
      assert.equal(response.status, 200, 'Better Auth swallows the send failure and answers success (known 1.7.14 limitation)');
      assert.equal((await response.json()).user.emailVerified, false);
      assert.equal((await mailAll(email)).length, 0, 'no code was actually delivered');
      const status = await deliveryStatusFor(signedCookiesOf(response));
      assert.equal(status.delivery, 'failed', 'the verify page can now see the send failed');
      assert.deepEqual(Object.keys(status).sort(), ['delivery', 'email', 'emailMasked'], 'the status leaks no error code or provider detail');
      assert.equal(getOtpDeliveryStatus(email), 'failed');
    } finally {
      await mkdir(directory, { recursive: true });
    }
  });

  it('retry after a failed send preserves the 60s cooldown, then succeeds and verifies', async () => {
    const email = 'race-failure@example.test';
    // Still inside the cooldown from the failed send: the resend is
    // silently dropped with generic success and no new code is sent.
    // (The failed send created a code row; the cooldown is keyed to it.)
    const immediate = await call('email-otp/send-verification-otp', { email, type: 'email-verification' });
    assert.equal(immediate.status, 200);
    assert.deepEqual(await immediate.json(), { success: true });
    assert.equal((await mailAll(email)).length, 0, 'no code is sent inside the cooldown, even after a failed send');
    // After the cooldown a resend rotates the code and delivers it.
    await ageVerificationRow(email);
    const resend = await call('email-otp/send-verification-otp', { email, type: 'email-verification' });
    assert.equal(resend.status, 200);
    const messages = await mailAll(email);
    assert.equal(messages.length, 1, 'exactly one code arrives on the post-cooldown resend');
    const code = codeFromMail(messages[0]);
    assert.ok(/^\d{6}$/.test(code));
    assert.equal(getOtpDeliveryStatus(email), 'sent', 'the successful retry overwrites the earlier failure');
    // The rotated code verifies; the account created by the failed
    // sign-up is the one that gets verified — no duplicate was made.
    const verified = await call('email-otp/verify-email', { email, otp: code });
    assert.equal(verified.status, 200);
    assert.equal((await verified.json()).user.emailVerified, true);
    assert.equal(await userCount(), 2, 'only the two accounts from this file exist (recovered + race-failure)');
  });
});

if (!integration) {
  it('OTP delivery integration tests need installed dependencies (skipped)', (t) => {
    t.skip(`better-auth/kysely/mysql2/nodemailer not installed: ${integrationError?.message || 'unknown error'}`);
  });
}
