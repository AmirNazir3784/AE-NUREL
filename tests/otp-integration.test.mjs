// Stage G integration tests — the end-to-end OTP + account flows that
// tests/email-otp.test.mjs and tests/membership-server.test.mjs do not
// already cover, run against the real Better Auth 1.7.14 instance on a
// temporary SQLite database in local-outbox mode.
//
// Coverage map (this file + the two existing files = the full brief):
//   * signup, OTP generation, correct/incorrect/expired/reused code,
//     resend cooldown, previous-code invalidation, refresh /
//     missing-context recovery, duplicate signup, unverified-login
//     restriction — email-otp.test.mjs, plus expired/reused/duplicate
//     here (they were not covered anywhere before).
//   * session establishment, dashboard (service) access, logout,
//     email/password login — here.
//   * forgot-password + reset (link flow, unchanged), session
//     invalidation on reset, token single-use — membership-server.test.mjs
//     (full) plus a compact pass here so this file is self-contained.
//   * MySQL persistence — mocked/disposable ONLY here (a fake pool; see
//     the 'MySQL persistence (mocked)' test). A live Hostinger MySQL
//     connection is NEVER attempted from this file and is marked NOT RUN
//     in the Phase 3 report — it can only run from Faisal's PC.
//   * server authorization / ownership — membership-server.test.mjs
//     (project ownership 404s) plus a compact ownership check here.
//
// No real email is ever sent and no live database is touched. Tests are
// skipped automatically when better-auth/kysely/mysql2/nodemailer are
// not installed.
//
// Rate-limit note: Better Auth limits are per IP + path, so each call
// uses its own x-forwarded-for address (local mode reads that header).
import './helpers/auth-dom.mjs';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { otpIdentifier } from '../server/membership/email-otp.mjs';
import { verifyMysqlConnection } from '../server/membership/database.mjs';
import { resolveMysqlTls } from '../server/membership/mysql-tls.mjs';
import {
  handlePendingVerificationRecovery,
  handlePendingVerificationStatus,
  PENDING_VERIFICATION_COOKIE,
} from '../server/membership/pending-verification.mjs';

let integration = null;
let integrationError = null;
try {
  const authMod = await import('../server/membership/auth.mjs');
  const dbMod = await import('../server/membership/database.mjs');
  const serviceMod = await import('../server/membership/service.mjs');
  integration = { ...authMod, ...dbMod, ...serviceMod };
} catch (error) {
  integrationError = error;
}

describe('OTP + account integration (live Better Auth, skipped without dependencies)', { skip: !integration }, () => {
  let directory;
  let auth;
  let db;
  let config;
  let service;
  const origin = 'http://localhost:3000';
  const password = 'QA-Sample-Creator-123456';
  let ipCounter = 200;
  const nextIp = () => `10.40.50.${++ipCounter}`;

  const call = (endpoint, body, ip = nextIp(), extraHeaders = {}) =>
    auth.handler(new Request(origin + '/api/auth/' + endpoint, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': ip, ...extraHeaders },
      body: JSON.stringify(body),
    }));
  const sessionCookieOf = (response) =>
    response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
  async function mailAll(email, subjectPart) {
    const files = (await readdir(directory)).filter((name) => name.startsWith('mail-'));
    const all = await Promise.all(files.map(async (name) => JSON.parse(await readFile(path.join(directory, name), 'utf8'))));
    return all.filter((message) => message.to === email && message.subject.includes(subjectPart))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const codeFromMail = (message) => message.text.match(/\b(\d{6})\b/)?.[1];
  async function register(email, ip) {
    const response = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: origin + '/sign-in' }, ip);
    assert.equal(response.status, 200, `sign-up for ${email} should succeed`);
    const body = await response.json();
    assert.equal(body.token, null, 'no session is issued at sign-up');
    assert.equal(body.user.emailVerified, false);
    return body.user;
  }
  async function otpCode(email) {
    const message = (await mailAll(email, 'verification code'))[0];
    assert.ok(message, `an OTP mail should exist for ${email}`);
    return codeFromMail(message);
  }
  async function verifyEmail(email, code) {
    const response = await call('email-otp/verify-email', { email, otp: code });
    assert.equal(response.status, 200, `verify for ${email} should succeed`);
    const body = await response.json();
    assert.equal(body.status, true);
    assert.equal(body.user.emailVerified, true);
    return body;
  }
  async function ageVerificationRow(email, { expiresAt = null, createdAt = null } = {}) {
    const set = {};
    if (expiresAt) set.expiresAt = expiresAt;
    if (createdAt) set.createdAt = createdAt;
    await db.updateTable('verification').set(set)
      .where('identifier', '=', otpIdentifier('email-verification', email)).execute();
  }
  async function getSession(cookie) {
    return auth.api.getSession({ headers: new Headers({ cookie }) });
  }

  before(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'aenural-otp-integration-'));
    process.env.NODE_ENV = 'test';
    process.env.AENURAL_MEMBERSHIP_ENABLED = '1';
    process.env.AENURAL_LOCAL_DATA_DIR = directory;
    process.env.AENURAL_EMAIL_TRANSPORT = 'local-outbox';
    process.env.BETTER_AUTH_URL = origin;
    auth = await integration.membershipAuth();
    ({ db, config } = await integration.membershipDatabase());
    service = integration.createMemberService(db, { local: true });
  });
  after(async () => {
    await db?.destroy();
    const resolved = path.resolve(directory || '');
    const allowed = path.resolve(os.tmpdir()) + path.sep + 'aenural-otp-integration-';
    if (resolved.toLowerCase().startsWith(allowed.toLowerCase())) await rm(resolved, { recursive: true, force: true });
  });

  it('rejects an expired code with OTP_EXPIRED and deletes the row', async () => {
    const email = 'expired@example.test';
    await register(email, nextIp());
    const code = await otpCode(email);
    // Age the row past its 5-minute expiry (created 6 minutes ago,
    // expiresAt 1 minute ago): the code is now expired, not merely old.
    await ageVerificationRow(email, {
      createdAt: new Date(Date.now() - 360_000).toISOString(),
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    const response = await call('email-otp/verify-email', { email, otp: code });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 'OTP_EXPIRED');
    const row = await db.selectFrom('verification').select('identifier')
      .where('identifier', '=', otpIdentifier('email-verification', email)).executeTakeFirst();
    assert.equal(row, undefined, 'an expired code row is deleted, not left reusable');
    // A fresh code can be requested (no cooldown row survives expiry).
    const resend = await call('email-otp/send-verification-otp', { email, type: 'email-verification' });
    assert.equal(resend.status, 200);
    const fresh = await otpCode(email);
    assert.notEqual(fresh, code);
    await verifyEmail(email, fresh);
  });

  it('rejects a reused (already consumed) code with INVALID_OTP', async () => {
    const email = 'reused@example.test';
    await register(email, nextIp());
    const code = await otpCode(email);
    await verifyEmail(email, code);
    const again = await call('email-otp/verify-email', { email, otp: code });
    assert.equal(again.status, 400);
    assert.equal((await again.json()).code, 'INVALID_OTP');
    // The account stays verified; the reused attempt changed nothing.
    const login = await call('sign-in/email', { email, password });
    assert.equal(login.status, 200);
  });

  it('answers a duplicate sign-up generically and never creates a second account or second code', async () => {
    // Better Auth 1.7.14, sign-up.mjs: with requireEmailVerification on
    // (and autoSignIn off) a sign-up for an existing email returns a
    // GENERIC 200 with a synthetic user — deliberately, so the response
    // cannot be used to enumerate accounts. It is NOT a 422 here (the
    // 422 only applies when requireEmailVerification is off). The
    // important guarantees are: no second account, no second code, and
    // the returned user is synthetic (its id is not the real user's).
    const email = 'duplicate@example.test';
    const real = await register(email, nextIp());
    const before = await mailAll(email, 'verification code');
    assert.equal(before.length, 1);
    const second = await call('sign-up/email', { name: 'QA Creator', email, password, callbackURL: origin + '/sign-in' });
    assert.equal(second.status, 200, 'duplicate sign-up is answered generically, not with an error');
    const secondBody = await second.json();
    assert.equal(secondBody.token, null);
    assert.equal(secondBody.user.email, email);
    assert.equal(secondBody.user.emailVerified, false);
    assert.notEqual(secondBody.user.id, real.id, 'the returned user is synthetic, not the real account');
    const users = await db.selectFrom('user').select('id').where('email', '=', email).execute();
    assert.equal(users.length, 1, 'no duplicate account was created');
    assert.equal((await mailAll(email, 'verification code')).length, 1, 'no second code was sent');
  });

  it('establishes a session on verification, grants dashboard access, and logs out cleanly', async () => {
    const email = 'session@example.test';
    const user = await register(email, nextIp());
    await verifyEmail(email, await otpCode(email));
    // Password login works after verification and issues a session.
    const login = await call('sign-in/email', { email, password });
    assert.equal(login.status, 200);
    const cookie = sessionCookieOf(login);
    assert.match(cookie, /session_token=/);
    const session = await getSession(cookie);
    assert.ok(session, 'a session exists after login');
    assert.equal(session.user.id, user.id);
    assert.equal(session.user.emailVerified, true);
    // Dashboard (service) access for exactly this user: free quota,
    // no premium, nothing used yet.
    const access = await service.access(user.id);
    assert.equal(access.used, 0);
    assert.equal(access.remaining, 3);
    assert.equal(access.premium, false);
    const overview = await service.overview(user.id);
    assert.deepEqual(overview.projects, []);
    assert.deepEqual(overview.orders, []);
    // Logout revokes the session: the same cookie is dead afterwards.
    const signOut = await auth.handler(new Request(origin + '/api/auth/sign-out', {
      method: 'POST',
      headers: { origin, 'x-forwarded-for': nextIp(), cookie },
    }));
    assert.equal(signOut.status, 200);
    assert.equal(await getSession(cookie), null, 'the session is gone after sign-out');
    // Signing in again after logout works.
    assert.equal((await call('sign-in/email', { email, password })).status, 200);
  });

  it('bars unverified users from sign-in and from dashboard access', async () => {
    const email = 'unverified@example.test';
    const user = await register(email, nextIp());
    const blocked = await call('sign-in/email', { email, password });
    assert.equal(blocked.status, 403, 'an unverified account cannot sign in');
    assert.equal(blocked.headers.getSetCookie().some((value) => value.startsWith('better-auth.session_token=')), false);
    // No session exists, so there is no dashboard access to grant: the
    // service-level access check is keyed by user id, but the HTTP
    // layer (verifiedMember) only ever calls it for a verified session.
    // What this test proves server-side is that verification is the
    // gate: the user row is still unverified here.
    const row = await db.selectFrom('user').select('emailVerified').where('id', '=', user.id).executeTakeFirst();
    assert.equal(Boolean(row.emailVerified), false);
    await verifyEmail(email, await otpCode(email));
    assert.equal((await call('sign-in/email', { email, password })).status, 200);
  });

  it('refresh / missing-context recovery: no cookie means recovery, then the code step returns', async () => {
    // Direct visit with no pending cookie: the status endpoint reports
    // nothing pending and the form must show recovery, not the code step.
    const empty = await handlePendingVerificationStatus(
      new Request(origin + '/api/membership/pending-verification'),
    ).json();
    assert.deepEqual(empty, { email: null, emailMasked: null, delivery: 'unknown' });
    // Recovery for an unverified account: the cookie is set, a fresh
    // code is sent, and the status endpoint now reports it as sent.
    const email = 'refresh@example.test';
    await register(email, nextIp());
    await ageVerificationRow(email, { createdAt: new Date(Date.now() - 120_000).toISOString() });
    const recovered = await handlePendingVerificationRecovery(
      new Request(origin + '/api/membership/pending-verification/resend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      }),
      { auth, db, config, checkEmailTransportHealth: integration.checkEmailTransportHealth },
    );
    assert.equal(recovered.status, 200);
    const cookie = recovered.headers.getSetCookie()
      .find((value) => value.startsWith(PENDING_VERIFICATION_COOKIE + '='));
    assert.ok(cookie, 'recovery sets the pending cookie');
    const status = await handlePendingVerificationStatus(
      new Request(origin + '/api/membership/pending-verification', { headers: { cookie } }),
      { secret: config.secret },
    ).json();
    assert.equal(status.email, email);
    // Phase 4 oracle guard: recovery sets the email cookie only — never
    // the sign-up signature cookie — so delivery reads 'unknown' even
    // though a fresh code was just sent. The email survives the refresh
    // and the recovered code still verifies below; the honest
    // sent/failed banner is a sign-up-flow feature, not a recovery oracle.
    assert.equal(status.delivery, 'unknown');
    // The recovered code verifies (refresh survival: the cookie, not
    // browser memory, is what the page uses after a refresh).
    await verifyEmail(email, await otpCode(email));
  });

  it('keeps the link-based forgot/reset flow working and revokes sessions on reset', async () => {
    const email = 'reset@example.test';
    const user = await register(email, nextIp());
    await verifyEmail(email, await otpCode(email));
    const login = await call('sign-in/email', { email, password });
    const cookie = sessionCookieOf(login);
    assert.ok(await getSession(cookie), 'a live session exists before the reset');
    // Forgot-password answers identically for known/unknown addresses.
    const known = await call('request-password-reset', { email, redirectTo: origin + '/reset-password' });
    const unknown = await call('request-password-reset', { email: 'nobody-here@example.test', redirectTo: origin + '/reset-password' });
    assert.equal(known.status, unknown.status);
    assert.deepEqual(await known.json(), await unknown.json());
    const resetMail = (await mailAll(email, 'Reset your AENural password'))[0];
    assert.ok(resetMail, 'a reset link mail is sent');
    const token = new URL(resetMail.url).pathname.split('/').at(-1);
    assert.ok(token, 'the reset link carries a token');
    // Resetting revokes the pre-reset session (revokeSessionsOnPasswordReset).
    const nextPassword = 'QA-New-Sample-Password-123';
    assert.equal((await call('reset-password', { token, newPassword: nextPassword })).status, 200);
    assert.equal(await getSession(cookie), null, 'the old session is revoked by the password reset');
    assert.equal((await call('sign-in/email', { email, password })).status, 401, 'the old password no longer works');
    assert.equal((await call('sign-in/email', { email, password: nextPassword })).status, 200, 'the new password works');
    // The token is single-use.
    assert.equal((await call('reset-password', { token, newPassword: password })).status, 400);
    // Ownership: another user cannot read this user's projects.
    // (saveProject stores the payload as given; validation of the
    // project shape lives in the route layer and is covered by
    // membership-server.test.mjs — here only ownership is asserted.)
    const saved = await service.saveProject(user.id, { title: 'Ownership probe', captions: { cues: [] } });
    const other = await register('other-owner@example.test', nextIp());
    await verifyEmail('other-owner@example.test', await otpCode('other-owner@example.test'));
    await assert.rejects(service.project(other.id, saved.id), (error) => error.status === 404);
    await assert.rejects(service.deleteProject(other.id, saved.id), (error) => error.status === 404);
    await service.deleteProject(user.id, saved.id);
  });

  it('MySQL persistence (MOCKED — no live Hostinger connection is attempted)', async () => {
    // A fake mysql2/promise pool: proves the app's verification logic
    // (verifyMysqlConnection) against the TLS profiles, with zero
    // network. Live MySQL is NOT RUN here — see the Phase 3 report.
    const fakePool = (sslVersion, cipher = 'TLS_AES_256_GCM_SHA384') => ({
      getConnection: async () => ({
        query: async (sql) => {
          if (sql === 'SELECT 1') return [[]];
          if (sql.includes('Ssl_version')) return [[{ Value: sslVersion }]];
          if (sql.includes('Ssl_cipher')) return [[{ Value: cipher }]];
          return [[]];
        },
        release: () => {},
      }),
    });
    // Loopback (production on Hostinger, 127.0.0.1): plain profile,
    // session still encrypted in this fake — reported, not required.
    const loopbackTls = resolveMysqlTls({ DB_HOST: '127.0.0.1' });
    assert.equal(loopbackTls.profile, 'loopback');
    const loopback = await verifyMysqlConnection(fakePool('TLSv1.3'), loopbackTls);
    assert.equal(loopback.host, '127.0.0.1');
    assert.equal(loopback.encrypted, true);
    assert.equal(loopback.tlsVersion, 'TLSv1.3');
    // Remote host with the public-CA opt-in: TLS REQUIRED — an
    // unencrypted session must throw instead of connecting silently.
    const remoteTls = resolveMysqlTls({ DB_HOST: 'srv2224.hstgr.io', DB_TLS_ALLOW_PUBLIC_CA: '1' });
    assert.deepEqual(remoteTls.ssl, { rejectUnauthorized: true, minVersion: 'TLSv1.2', servername: 'srv2224.hstgr.io', verifyIdentity: true });
    const remote = await verifyMysqlConnection(fakePool('TLSv1.2', 'ECDHE-RSA-AES256-GCM-SHA384'), remoteTls);
    assert.equal(remote.encrypted, true);
    assert.equal(remote.tlsVersion, 'TLSv1.2');
    await assert.rejects(
      verifyMysqlConnection(fakePool(''), remoteTls),
      /not encrypted|TLS|SSL/i,
      'a remote session that cannot prove encryption must fail',
    );
    // And the OTP rows themselves persist in the (disposable SQLite)
    // database: a verification row written by sign-up is still there
    // when read back — the same table/shape MySQL stores in production.
    const email = 'persist@example.test';
    await register(email, nextIp());
    const row = await db.selectFrom('verification').select(['identifier', 'value', 'expiresAt'])
      .where('identifier', '=', otpIdentifier('email-verification', email)).executeTakeFirst();
    assert.ok(row, 'the OTP verification row persists in the database');
    assert.ok(!String(row.value).includes(await otpCode(email)), 'the stored value never holds the plain code');
  });
});

if (!integration) {
  it('OTP integration tests need installed dependencies (skipped)', (t) => {
    t.skip(`better-auth/kysely/mysql2/nodemailer not installed: ${integrationError?.message || 'unknown error'}`);
  });
}
