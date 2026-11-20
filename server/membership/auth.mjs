import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { membershipDatabase } from './database.mjs';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import {
  OTP_LENGTH,
  OTP_EXPIRES_IN_SECONDS,
  OTP_MAX_ATTEMPTS,
  buildOtpEmail,
  isOtpResendCoolingDown,
  isOtpResendBudgetExhausted,
  isOtpGuessBudgetExhausted,
  isPasswordResetCoolingDown,
  otpIdentifier,
  recordOtpResend,
  recordOtpWrongGuess,
  recordPasswordResetAttempt,
  resolveEmailTransport,
} from './email-otp.mjs';
import {
  clearPendingVerificationCookieHeader,
  clearPendingVerificationSignatureCookieHeader,
  pendingVerificationCookieHeader,
  pendingVerificationSignatureCookieHeader,
} from './pending-verification.mjs';
import { otpDelivery } from './otp-delivery.mjs';
import { passwordPolicyMessage } from './password-policy.mjs';
import {
  createEmailDeliveryStore,
  getActiveEmailDeliveryStore,
  repopulateOtpDeliveryFromStore,
  setActiveEmailDeliveryStore,
} from './email-delivery.mjs';
import { shouldSetPendingVerificationCookie } from './activation.mjs';

// Email OTP (Better Auth 1.7.14 `emailOTP` plugin) is used for EMAIL
// VERIFICATION ONLY. There is no passwordless sign-in in this codebase:
// the client never calls signIn.emailOtp, and the server closes the
// plugin endpoints that would allow it (see DISABLED_OTP_PATHS and the
// before-hook below). Email/password sign-in, link-based forgot/reset
// password, requireEmailVerification and the verifiedMember gate are all
// unchanged.
//
// How verification works now (verified against Better Auth 1.7.14 source
// and a local SQLite run — see phase2 MANIFEST.md):
//   * `overrideDefaultEmailVerification: true` makes every core
//     verification trigger (sign-up, sign-in of an unverified user,
//     /send-verification-email) send an OTP instead of a link. This only
//     works because auth.mjs does NOT define its own
//     `emailVerification.sendVerificationEmail`: Better Auth merges
//     plugin init options under user options (defu), so a user-defined
//     sender would silently defeat the override. The old link sender is
//     therefore removed here; links issued before this deploy still
//     verify until their 1-hour expiry via GET /verify-email.
//   * Sign-up creates the account (autoSignIn stays false: no session
//     at sign-up) and the plugin sends a 6-digit code, 5-minute expiry.
//     The code is stored HASHED (storeOTP: "hashed") in the existing
//     `verification` table — no new tables — as
//     `<sha256-base64url>:<attempts>` under identifier
//     `email-verification-otp-<email>`.
//   * POST /email-otp/verify-email checks the code (atomicVerifyOTP:
//     a correct code is consumed, a wrong code increments the attempt
//     counter, 5 wrong attempts invalidate the code with
//     TOO_MANY_ATTEMPTS). On success the user is marked emailVerified
//     and — because autoSignInAfterVerification is true — a session is
//     created for exactly that just-verified account. No session is
//     created at any earlier step: not at sign-up, not at OTP send time.
//   * The OTP plugin registers more endpoints than AENural uses
//     (/sign-in/email-otp, /email-otp/request-password-reset,
//     /email-otp/reset-password, /forget-password/email-otp,
//     /email-otp/request-email-change, /email-otp/change-email,
//     /email-otp/check-verification-otp). They are closed by the
//     before-hook below with a generic 404. `disableSignUp: true` is
//     belt-and-braces: even if the hook were bypassed, signInEmailOTP
//     would refuse to auto-create an account.
//   * `sendVerificationOnSignUp` stays false: with the override on, the
//     plugin's own after-hook for it is disabled by its own matcher,
//     so the override is the single send path (no double mail).
//   * OTP mail goes through the same sendMail() as link mail, so the
//     transport rules in email-otp.mjs apply to every account email.

// Plugin endpoints AENural does not offer. Closed by the before-hook
// with a generic 404 ("This request could not be completed."). Rate
// limiting still runs before hooks, so these paths are also rate
// limited (see customRules below) even though they never execute.
const DISABLED_OTP_PATHS = [
  '/sign-in/email-otp',
  '/email-otp/request-password-reset',
  '/email-otp/reset-password',
  '/forget-password/email-otp',
  '/email-otp/request-email-change',
  '/email-otp/change-email',
  '/email-otp/check-verification-otp',
];

// Cache infrastructure per module; development HMR must refresh auth options.
let authPromise;
// Transport-health cache (see checkEmailTransportHealth). A successful
// verification is trusted for SMTP_VERIFY_CACHE_TTL_MS; a failed one is
// trusted only for SMTP_VERIFY_NEGATIVE_CACHE_TTL_MS, so a transient
// outage recovers quickly and a blackholed server does not cost a
// 10-second timeout on every sign-up attempt. Before Phase 4 the
// successful result was cached forever per process, so once mail had
// verified healthy the pre-check could never fail again — even after
// the SMTP server died. That staleness is fixed by the TTLs below.
// resetEmailTransportHealthCache() clears the cache (tests, and any
// operator flow that must re-probe immediately).
let smtpVerifyState = null; // { promise, ok, atMs } | null
export const SMTP_VERIFY_CACHE_TTL_MS = 60_000;
export const SMTP_VERIFY_NEGATIVE_CACHE_TTL_MS = 10_000;
export function resetEmailTransportHealthCache() {
  smtpVerifyState = null;
}

export function authOptions(database, config, db = null) {
  // Secure cookies follow the configured origin's protocol (S5-32):
  // https: origins get Secure cookies, plain-http origins (local
  // development on http://localhost:3000) do not. Never keyed on
  // config.local alone — a non-local deployment served over plain HTTP
  // must not get Secure cookies it cannot use, and an https: origin
  // must always get them.
  const useSecureCookies = typeof config?.origin === 'string' && config.origin
    ? config.origin.startsWith('https:')
    : !config?.local;
  // Trusted proxy-IP header (S5-07, S5-08, S5-20). There is NO silent
  // fallback: in non-local mode the header must be configured, and a
  // blank value throws here, at authOptions()/membershipAuth() time,
  // instead of silently trusting 'x-real-ip' — the very value that is
  // still UNCONFIRMED with Hostinger (see
  // docs/authentication/trusted-proxy-ip.md). Local mode keeps
  // 'x-forwarded-for': local development is loopback-only, and the
  // header there is only a test convenience — local mode must never be
  // exposed beyond localhost (if it ever is, that header is forgeable
  // and every per-IP limit is bypassed).
  //
  // Single overwritten header only (S5-08): this config lists one
  // header and sets no `trustedProxies`. That is correct ONLY while the
  // header is a single value the proxy overwrites (x-real-ip). If
  // Hostinger confirms x-forwarded-for, do NOT just change this
  // variable — add trustedProxies with the proxy IPs/CIDRs Hostinger
  // provides, and re-verify with the §7 live check in
  // docs/authentication/trusted-proxy-ip.md.
  const trustedIpHeader = (() => {
    if (config.local) return 'x-forwarded-for';
    const header = config.env?.AUTH_TRUSTED_IP_HEADER;
    if (typeof header !== 'string' || !header.trim()) {
      throw new Error('Configure AUTH_TRUSTED_IP_HEADER before enabling account services. Confirm the value with Hostinger support — do not guess (see docs/authentication/trusted-proxy-ip.md).');
    }
    return header.trim();
  })();
  // Durable delivery audit (Phase 4, server/membership/email-delivery.mjs).
  // When a Kysely database is available (the normal membershipAuth()
  // path), every OTP and password-reset send attempt is recorded in the
  // `aenural_email_delivery_attempts` table as well as in the in-memory
  // tracker. The store is best-effort by construction: a missing table
  // (migration 002 not applied yet), a dead database, or a tracking bug
  // can never fail a delivery. Offline callers (prepare-mysql) pass no
  // database, so the store stays null and recording is a no-op.
  const deliveryStore = db ? createEmailDeliveryStore(db) : null;
  if (deliveryStore) setActiveEmailDeliveryStore(deliveryStore);
  // Record one send outcome in both places: the in-memory OTP tracker
  // (the verify page's synchronous status source — OTP kind only) and
  // the durable audit table (OTP + password-reset). Never throws and
  // never changes the outcome of the send it records.
  //
  // The durable write is deliberately NOT awaited. Better Auth 1.7.14
  // runs every endpoint inside a Kysely transaction
  // (@better-auth/core runWithTransaction) that holds one pool
  // connection per in-flight request, and this callback runs inside
  // that transaction. Awaiting a second query on the same pool here
  // deadlocks as soon as concurrent sends reach the pool limit (5):
  // every connection is held by a transaction waiting for an audit
  // insert that can never get a connection. Reproduced 2026-11-19:
  // 8 parallel sign-ups stall forever (5 mails sent, 5 pool
  // connections idle in Sleep, 0 further progress; 4 parallel
  // sign-ups complete in ~2s). The in-memory tracker above is still
  // updated synchronously, so the verify page sees the outcome at
  // response time; the audit row lands milliseconds later, once the
  // transaction has committed and freed a connection. recordAttempt
  // never throws (it catches everything internally) and the trailing
  // .catch is a belt-and-braces guard against an unhandled rejection.
  // Cost: a crash in that millisecond window loses the audit row —
  // acceptable for a best-effort audit (see email-delivery.mjs).
  function recordDelivery(email, kind, status, errorCode) {
    try {
      if (kind === 'otp') {
        if (status === 'sent') otpDelivery.recordSent(email);
        else otpDelivery.recordFailed(email, errorCode);
      }
    } catch { /* tracking must never affect the send */ }
    if (!deliveryStore) return;
    deliveryStore.recordAttempt({ email, kind, status, errorCode }).catch(() => {});
  }
  let transport;
  function createSmtpTransport() {
    return nodemailer.createTransport({ host: config.env.SMTP_HOST, port: Number(config.env.SMTP_PORT || 465), secure: config.env.SMTP_SECURE !== 'false', requireTLS:config.env.SMTP_SECURE==='false', connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000, tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2', servername: config.env.SMTP_HOST }, auth: { user: config.env.SMTP_USER, pass: config.env.SMTP_PASSWORD } });
  }
  // Single mail-sending path for link mail and OTP mail. The transport is
  // decided purely from configuration (see resolveEmailTransport): SMTP
  // whenever it is configured, the local outbox only behind the explicit
  // AENURAL_EMAIL_TRANSPORT=local-outbox flag in local/SQLite mode.
  // A failed SMTP send throws — there is no fallback to the outbox.
  // NOTE on Better Auth 1.7.14 (Stage F, investigated 2026-11-18 — see
  // docs/authentication/otp-delivery-failure.md): every plugin/core
  // caller invokes the send functions through runInBackgroundOrAwait(),
  // which catches send errors and logs them server-side instead of
  // failing the request (better-auth/dist/context/create-context.mjs
  // lines 215-229; the same code is unchanged in 1.7.25). The
  // user-visible response therefore stays a generic success even when
  // mail is down; the failure is visible in the server log as
  // "[membership] Email send failed: <code>" (code only — never the
  // recipient, the code, or any credential). There is NO supported
  // option, hook, return value or event in 1.7.14 that surfaces the
  // failure to the request, and `sendVerificationOTP` returns
  // Promise<void>, so the response can never honestly say "sent".
  //
  // The supported mitigation implemented here (it does not fix the
  // swallow — nothing inside the supported API can — it makes the
  // failure visible anyway):
  //   1. The app's own sendVerificationOTP callback below is the one
  //      place a failure is observable before Better Auth swallows it,
  //      so it records the outcome in otp-delivery.mjs (in-memory,
  //      per-email, "sent" | "failed" | "unknown") and in the durable
//      `aenural_email_delivery_attempts` audit table (Phase 4, see
//      email-delivery.mjs — OTP and password-reset attempts, with
//      restart recovery at startup). GET
  //      /api/membership/pending-verification reports that status for
  //      the cookie owner's address, and the verify page shows an
  //      honest error + retry state when it is "failed".
  //   2. The before-hook pre-checks the mail transport with
  //      checkEmailTransportHealth() before any OTP send the app
  //      controls (sign-up, the resend endpoint, the legacy resend
  //      path) and fails fast with a generic 503 when mail is down —
  //      so a broken transport blocks the send up front instead of
  //      creating an account whose code never arrives. The check runs
  //      AFTER the 60s resend-cooldown short-circuit (a cooled-down
  //      request sends nothing, so there is nothing to pre-check).
  //   3. AENural deliberately does NOT configure
  //      advanced.backgroundTasks.handler: with a handler set, sends
  //      are not even awaited, so the response would return before the
  //      send finishes and even the callback recording above would
  //      race the verify page. The default awaited path is what makes
  //      the tracker accurate at response time.
  // The one send path NOT pre-checked is sign-in of an unverified user
  // (it also triggers an OTP via the override): blocking sign-in when
  // mail is down would lock out verified users too, and the endpoint
  // cannot tell verified from unverified before authentication without
  // creating an enumeration oracle. A failure there is still recorded
  // by (1) and shown on the verify page.
  async function sendMail({ to, subject, text, html, url }) {
    if (config.ownerOnly) throw new APIError('SERVICE_UNAVAILABLE', { message: 'Email recovery is unavailable for this private owner account.' });
    const mode = resolveEmailTransport(config.env, config);
    if (mode === 'local-outbox') {
      await writeFile(config.directory + '/mail-' + randomUUID() + '.json', JSON.stringify({ to, subject, text: text ?? null, html: html ?? null, url: url ?? null, createdAt: new Date().toISOString() }), { mode: 0o600 });
      return;
    }
    transport ||= createSmtpTransport();
    try {
      await transport.sendMail({ from: config.env.MAIL_FROM, to, subject, text, html });
    } catch (error) {
      console.error('[membership] Email send failed:', error?.code || error?.name || 'SEND_FAILED');
      throw error;
    }
  }
  async function send(to, subject, url) {
    if (new URL(url).origin !== config.origin) throw new Error('Unexpected account email origin.');
    // Password-reset mail goes through the same sendMail() as OTP mail
    // and is swallowed the same way by Better Auth 1.7.14 — but unlike
    // OTP mail it was never recorded anywhere. Record the attempt
    // (kind 'password-reset') in the durable audit table so operators
    // can see whether reset mail is actually leaving the server. The
    // reset URL (which carries the token) is never stored. There is no
    // user-facing delivery signal for reset mail — the response must
    // stay generic so it cannot enumerate accounts — so a failed reset
    // send is visible only in the audit table and the server log.
    try {
      await sendMail({ to, subject, text: subject + '\n\n' + url + '\n\nIf you did not request this, you can ignore this email.', url });
    } catch (error) {
      await recordDelivery(to, 'password-reset', 'failed', error?.code || error?.name);
      throw error;
    }
    await recordDelivery(to, 'password-reset', 'sent');
  }
  async function sendOtpMail(to, otp) {
    // buildOtpEmail throws on a malformed OTP instead of sending it.
    const { subject, text, html } = buildOtpEmail({ email: to, otp });
    await sendMail({ to, subject, text, html });
  }
  // True while the last OTP row for this email was created less than the
  // resend cooldown ago. Reads the plugin's own verification row, so it
  // stays correct even if the plugin internals change storage — the
  // identifier format is the contract (see otpIdentifier).
  async function otpResendCoolingDown(ctx, email) {
    if (typeof email !== 'string' || !email) return false;
    const existing = await ctx.context.internalAdapter.findVerificationValue(
      otpIdentifier('email-verification', email.toLowerCase()),
    );
    return isOtpResendCoolingDown(existing?.createdAt);
  }
  // Parse a stored timestamp (Date, ISO string or epoch number) to
  // milliseconds, or null when it cannot be parsed. Epoch numbers below
  // 1e11 are treated as seconds, above as milliseconds.
  function timestampToMs(value) {
    if (value instanceof Date) {
      const ms = value.getTime();
      return Number.isFinite(ms) ? ms : null;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return null;
      return value < 1e11 ? value * 1000 : value;
    }
    if (typeof value === 'string') {
      const ms = Date.parse(value);
      return Number.isFinite(ms) ? ms : null;
    }
    return null;
  }
  // S5-14: did this sign-up actually create a new account? Better Auth
  // 1.7.14 answers a duplicate sign-up with a generic 200 carrying a
  // synthetic `user` object for the submitted email (no second account,
  // no second code), so the after-hook cannot tell it from a real
  // sign-up by the response shape — and the synthetic response even
  // carries the pre-existing user's original createdAt.
  //
  // Recency alone ("row created within the last 60s") does NOT
  // separate them: an attacker re-signing-up seconds after the
  // victim's sign-up sees a row created seconds ago, exactly like a
  // genuine sign-up. The discriminator is the DATABASE, read before
  // this request creates anything: the before-hook snapshots whether
  // a user row for this email already exists (passed to the after-hook
  // via the hook context — see the /sign-up/email branch below) and
  // the after-hook trusts that snapshot. A row that existed before
  // the request means this sign-up is a duplicate, however fast the
  // machine is; a row that did not exist means this request created
  // it. No wall-clock comparison is involved, so there is no race.
  //
  // The old request-start timing comparison (row createdAt at/after
  // Date.now() recorded in the before-hook, 5ms tolerance) is kept
  // ONLY as a fallback for when no existence snapshot is available:
  // no database handle (offline callers never serve requests), or the
  // snapshot query failed. It was the flaky path: on a fast runner a
  // duplicate request can start within 5ms of the original row's
  // creation and be misclassified as new (CI run #226, S5-14). If no
  // request-start timestamp is available, or the row is
  // missing/unreadable, the answer is false (fail closed: no
  // signature cookie). The email cookie is still set — only the
  // signature is gated.
  //
  // Why not databaseHooks.user.create.after (the cleaner-looking
  // option)? That hook receives the endpoint context, but it runs via
  // queueAfterTransactionHook — deferred until after the transaction
  // commits — so a Set-Cookie appended there races the response and
  // cannot be relied on. The existence snapshot in the endpoint
  // before-hook and the check in the endpoint after-hook both run
  // synchronously in the request path instead.
  //
  // Duplicate sign-up deliberately still answers generic 200: returning
  // an "already exists" error would be a much worse enumeration oracle.
  async function isNewlyCreatedUser(email, returnedCreatedAt, startedAtMs, userExistedBefore) {
    // Deterministic path: the before-hook already asked the database.
    // A pre-existing row means duplicate (false); no row means this
    // request created the account (true). Sequential duplicate
    // sign-ups always see the committed row from the first sign-up.
    if (typeof userExistedBefore === 'boolean') return !userExistedBefore;
    if (typeof startedAtMs !== 'number' || !Number.isFinite(startedAtMs)) return false;
    const createdAfterRequestStart = (ms) => ms !== null && ms >= startedAtMs - 5;
    if (db) {
      try {
        const row = await db.selectFrom('user').select('createdAt').where('email', '=', email).executeTakeFirst();
        if (!row || row.createdAt === null || row.createdAt === undefined) return false;
        return createdAfterRequestStart(timestampToMs(row.createdAt));
      } catch {
        return false; // cannot prove newness: fail closed (no signature)
      }
    }
    // No database handle (offline callers never serve requests): fall
    // back to the createdAt Better Auth returned. The duplicate
    // response carries the pre-existing user's ORIGINAL createdAt, so
    // the same request-start comparison still separates new from
    // duplicate.
    return createdAfterRequestStart(timestampToMs(returnedCreatedAt));
  }
  // Fail fast when mail is down, before an OTP send the app controls.
  // Throws a generic 503 (same message for every address — the check
  // runs before any account lookup, so it cannot enumerate accounts).
  // Used only where the endpoint exists solely to send a code; sign-in
  // is deliberately excluded (see the NOTE above sendMail): blocking
  // sign-in when mail is down would lock out verified users too.
  async function requireHealthyEmailTransport() {
    let healthy = true;
    try {
      healthy = await checkEmailTransportHealth(config);
    } catch {
      healthy = false;
    }
    if (!healthy) {
      throw new APIError('SERVICE_UNAVAILABLE', { message: 'Account services are temporarily unavailable. Try again.' });
    }
  }
  return {
    appName: 'AENural', baseURL: config.origin, secret: config.secret, database,
    trustedOrigins: [config.origin],
    emailAndPassword: { enabled: true, disableSignUp: !!config.ownerOnly, minPasswordLength: 12, maxPasswordLength: 128, requireEmailVerification: true, autoSignIn: false, revokeSessionsOnPasswordReset: true, resetPasswordTokenExpiresIn: 1800, sendResetPassword: async ({ user, url }) => send(user.email, 'Reset your AENural password', url) },
    // No sendVerificationEmail here on purpose (see the header comment):
    // defining one would defeat the plugin's overrideDefaultEmailVerification.
    // expiresIn (1h) still bounds any verification-link token issued before
    // this deploy; no new link tokens are created while the override is on.
    emailVerification: { sendOnSignUp: !config.ownerOnly, sendOnSignIn: !config.ownerOnly, autoSignInAfterVerification: true, expiresIn: 3600 },
    plugins: [
      emailOTP({
        otpLength: OTP_LENGTH,
        expiresIn: OTP_EXPIRES_IN_SECONDS,
        allowedAttempts: OTP_MAX_ATTEMPTS,
        storeOTP: 'hashed',
        resendStrategy: 'rotate',
        disableSignUp: true,
        sendVerificationOnSignUp: false,
        overrideDefaultEmailVerification: true,
        rateLimit: { window: 60, max: 3 },
        sendVerificationOTP: async ({ email, otp, type }) => {
          // Only email-verification is enabled. The before-hook closes
          // the endpoints that could request other types, but if one
          // ever reaches here, fail closed: never send a code for a
          // flow AENural does not offer.
          if (type !== 'email-verification') {
            console.error('[membership] Refused OTP send for disabled type:', type);
            throw new APIError('BAD_REQUEST', { message: 'This request could not be completed.' });
          }
          // Delivery tracking (Stage F, durable audit added Phase 4):
          // this callback is the ONLY place a send failure is
          // observable — Better Auth's runInBackgroundOrAwait()
          // swallows the throw below and answers success. Record the
          // outcome first (in-memory tracker + durable audit table,
          // see recordDelivery above), then rethrow so the failure is
          // still logged by sendMail and by Better Auth. The record
          // calls are wrapped so tracking can never change the outcome
          // of a send: a tracking bug must neither fail a delivery
          // nor mask a real failure.
          try {
            await sendOtpMail(email, otp);
          } catch (error) {
            await recordDelivery(email, 'otp', 'failed', error?.code || error?.name);
            throw error;
          }
          await recordDelivery(email, 'otp', 'sent');
        },
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (DISABLED_OTP_PATHS.includes(ctx.path)) {
          throw new APIError('NOT_FOUND', { message: 'This request could not be completed.' });
        }
        // S5-36: common/weak-password screen on sign-up and password
        // change (local blocklist + pattern checks, no network calls).
        // The helper returns null for missing/short passwords so Better
        // Auth's own length error is never masked.
        if (ctx.path === '/sign-up/email' || ctx.path === '/change-password') {
          const reason = passwordPolicyMessage(ctx.body?.password ?? ctx.body?.newPassword);
          if (reason) throw new APIError('BAD_REQUEST', { message: reason });
        }
        if (ctx.path === '/sign-up/email' && !config.ownerOnly) {
          // Sign-up sends a code immediately (sendOnSignUp +
          // overrideDefaultEmailVerification). Fail fast when mail is
          // down instead of creating an account whose code never
          // arrives: the user retries the same sign-up later and no
          // duplicate account is created, because this attempt never
          // created one. Local-outbox mode reports healthy, so local
          // development and tests are unaffected.
          // S5-14: snapshot whether a user row for this email already
          // exists, so the after-hook can tell a genuine new account
          // from a duplicate sign-up without any wall-clock comparison
          // (see isNewlyCreatedUser). The lookup runs on the same db
          // handle the after-hook uses and sees committed rows only,
          // so a sequential duplicate always finds the first sign-up's
          // row. The submitted email is lowercased first: Better Auth
          // stores emails lowercased, and the snapshot must match the
          // stored row. If the lookup fails, the snapshot stays
          // undefined and the after-hook falls back to the
          // request-start timing comparison. The request-start
          // timestamp is still recorded for that fallback path.
          // Returning { context: {...} } merges the fields into the
          // endpoint context the after-hook receives (Better Auth
          // 1.7.14 dispatch); it does not end the request.
          const signUpStartedAtMs = Date.now();
          await requireHealthyEmailTransport();
          let signUpUserExistedBefore;
          if (db && typeof ctx.body?.email === 'string' && ctx.body.email) {
            try {
              const existing = await db.selectFrom('user').select('id').where('email', '=', ctx.body.email.toLowerCase()).executeTakeFirst();
              signUpUserExistedBefore = !!existing;
            } catch {
              signUpUserExistedBefore = undefined; // timing fallback in the after-hook
            }
          }
          return { context: { signUpStartedAtMs, signUpUserExistedBefore } };
        }
        if (ctx.path === '/email-otp/send-verification-otp') {
          if (ctx.body?.type !== 'email-verification') {
            throw new APIError('NOT_FOUND', { message: 'This request could not be completed.' });
          }
          // Per-email 60s resend cooldown, in addition to the per-IP
          // rate limit. On cooldown the endpoint is short-circuited
          // with its own success shape ({ success: true }) and NO new
          // code is created or sent — deliberately the same generic
          // success as a real send, so the response cannot be used to
          // tell whether an account exists for the address. A fixed
          // 500ms floor keeps the timing indistinguishable from the
          // legacy endpoint's constant-time floor and from a slow SMTP
          // send. Returning ctx.json() from a before-hook ends the
          // request here (verified against 1.7.14).
          if (await otpResendCoolingDown(ctx, ctx.body?.email)) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return ctx.json({ success: true });
          }
          // Per-email resend budget (S5-16): max 10/hour and 20/day per
          // address, then a 1-hour cooling-off period (see
          // email-otp.mjs). Exhausted budgets answer the same generic
          // success as a real send — no code, no mail, no signal. The
          // budget is recorded only after the transport pre-check
          // passes, so a 503 outage does not consume it.
          if (isOtpResendBudgetExhausted(ctx.body?.email)) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return ctx.json({ success: true });
          }
          // No cooldown applies, so a code is about to be sent: fail
          // fast with a generic 503 when mail is down instead of
          // letting Better Auth swallow the send failure and answer
          // success. Same 503 for every address (no account lookup
          // has happened), so this cannot enumerate accounts.
          await requireHealthyEmailTransport();
          recordOtpResend(ctx.body?.email);
        }
        if (ctx.path === '/send-verification-email') {
          // Same cooldown for the legacy resend path: with the
          // override on, it also sends an OTP, so it must not bypass
          // the cooldown. The endpoint's own success shape is
          // { status: true }; match it so the two paths are
          // indistinguishable.
          if (await otpResendCoolingDown(ctx, ctx.body?.email)) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return ctx.json({ status: true });
          }
          // Same per-email resend budget as the plugin resend path
          // (S5-16): generic success while throttled, recorded only
          // after the transport pre-check passes.
          if (isOtpResendBudgetExhausted(ctx.body?.email)) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return ctx.json({ status: true });
          }
          // As above: a code is about to be sent, so pre-check mail.
          await requireHealthyEmailTransport();
          recordOtpResend(ctx.body?.email);
        }
        if (ctx.path === '/email-otp/verify-email') {
          // Cumulative wrong-guess budget (S5-16): max 15 wrong guesses
          // per hour per address, counted across code rotations (the
          // per-code 5-attempt counter does not survive a resend).
          // Past the cap the endpoint answers TOO_MANY_ATTEMPTS (429)
          // until the hour window rolls over. The count itself is
          // recorded in the after-hook, only for genuinely wrong codes
          // (INVALID_OTP) — an expired code is not a guess against a
          // live code.
          if (isOtpGuessBudgetExhausted(ctx.body?.email)) {
            throw new APIError('TOO_MANY_REQUESTS', { message: 'Too many incorrect attempts. Request a new code.' });
          }
        }
        if (ctx.path === '/request-password-reset') {
          // Password-reset mail (S5-09, S5-27): the same two controls
          // as OTP mail — a 60s per-email cooldown and a fail-fast
          // transport pre-check — before any account lookup, so both
          // are identical for known and unknown addresses and cannot
          // enumerate accounts. While cooling down, answer the
          // endpoint's own generic success shape; while mail is down,
          // answer the same generic 503 as the OTP paths. There is
          // deliberately NO user-facing per-address delivery signal
          // for reset mail (that would be an enumeration oracle): a
          // failed reset send is visible only in the server log and
          // the durable audit table — see the runbook in
          // docs/authentication/otp-delivery-failure.md §6.
          // NOTE: '/forget-password' is NOT handled here: in Better
          // Auth 1.7.14 it answers 404 (the live path is
          // /request-password-reset), and short-circuiting it with a
          // generic success would change that 404 into a 200. It still
          // gets its own customRules entry below (rate limit only).
          if (isPasswordResetCoolingDown(ctx.body?.email)) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return ctx.json({ status: true, message: 'If this email exists in our system, check your email for the reset link' });
          }
          await requireHealthyEmailTransport();
          recordPasswordResetAttempt(ctx.body?.email);
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        // Pending-verification cookie lifecycle. `ctx.context.returned`
        // is the endpoint's return value as a plain object on success
        // ({ token, user } for sign-up, { status, token, user } for
        // verify-email) and an APIError on failure — the after-hook
        // runs in both cases, so success is detected from the payload
        // shape, never from the HTTP status (verified against 1.7.14).
        if (ctx.path === '/sign-up/email') {
          const returned = ctx.context.returned;
          const email = returned && typeof returned === 'object' && returned.user && typeof returned.user.email === 'string' ? returned.user.email : null;
          if (email) {
            const attrs = { secure: useSecureCookies };
            ctx.context.responseHeaders?.append('Set-Cookie', pendingVerificationCookieHeader(email, attrs));
            // Signature cookie: proves this browser just signed up for
            // this address, so GET /api/membership/pending-verification
            // may report the OTP delivery status for it (see
            // pending-verification.mjs — without the signature gate,
            // the recovery route would turn delivery into an
            // unverified-account existence oracle). It is set ONLY when
            // the sign-up actually created a new account (S5-14):
            // a duplicate sign-up answers with a synthetic user object
            // for a pre-existing address, and setting the signature
            // there would let anyone read that address's recent
            // delivery status. Signing must never break sign-up: if
            // the newness check fails, the email cookie still works
            // and delivery simply reports 'unknown'.
            try {
              if (await isNewlyCreatedUser(email, returned.user.createdAt, ctx.signUpStartedAtMs, ctx.signUpUserExistedBefore)) {
                ctx.context.responseHeaders?.append('Set-Cookie', pendingVerificationSignatureCookieHeader(email, config.secret, attrs));
              }
            } catch { /* unsigned cookie still works; delivery reports 'unknown' */ }
          }
        }
        if (ctx.path === '/email-otp/verify-email') {
          if (ctx.context.returned?.status === true) {
            const attrs = { secure: useSecureCookies };
            ctx.context.responseHeaders?.append('Set-Cookie', clearPendingVerificationCookieHeader(attrs));
            ctx.context.responseHeaders?.append('Set-Cookie', clearPendingVerificationSignatureCookieHeader(attrs));
          } else {
            // Cumulative wrong-guess budget (S5-16): count genuinely
            // wrong codes (INVALID_OTP) per address, across rotations.
            // The before-hook blocks verify attempts once the hourly
            // budget is exhausted.
            const code = ctx.context.returned?.body?.code ?? ctx.context.returned?.code;
            if (code === 'INVALID_OTP' && typeof ctx.body?.email === 'string') {
              recordOtpWrongGuess(ctx.body.email);
            }
          }
        }
        if (ctx.path === '/sign-in/email') {
          // Unverified-sign-in resume (Phase 4): signing in with the
          // correct password as an unverified user sends a fresh OTP
          // first (sendOnSignIn + overrideDefaultEmailVerification) and
          // then fails with EMAIL_NOT_VERIFIED (verified live against
          // Better Auth 1.7.14: APIError, status FORBIDDEN,
          // body.code EMAIL_NOT_VERIFIED). Remember the address in the
          // pending-verification cookie so /verify-email opens on the
          // code step without asking for the email again. The helper
          // sets the cookie ONLY for that exact failure: a wrong
          // password answers INVALID_EMAIL_OR_PASSWORD and sets
          // nothing, and a verified sign-in succeeds (returned is the
          // session object, not an error). If Better Auth ever changes
          // the error shape, the helper returns null and the flow
          // degrades to the recovery step on /verify-email (the user
          // re-types the email once).
          //
          // S5-15: the signature cookie is set here too, alongside the
          // email cookie. This is safe: it is issued only after the
          // caller proved the account password (correct password +
          // EMAIL_NOT_VERIFIED), which is strictly stronger proof of
          // ownership than the sign-up flow's proof (knowing an email
          // address). Without it, a failed OTP send after sign-in was
          // invisible — the verify page could never show the honest
          // "we couldn't send the code" banner for this flow.
          //
          // S5-24 (accepted residual, NOT implemented): the fresh OTP
          // this sign-in triggers is NOT subject to the 60s resend
          // cooldown. Suppressing it would require either blocking
          // sign-in (which would lock out verified users too — the
          // endpoint cannot tell verified from unverified before
          // authentication) or throwing inside the send callback
          // (which would rotate the code without sending a new one,
          // stranding the user with no working code). The trigger
          // requires the correct account password, so an attacker
          // cannot mail-bomb a victim through sign-in at all; the
          // 8/min/IP sign-in rate limit bounds the legitimate-user
          // path (repeated sign-ins by the account owner).
          const email = shouldSetPendingVerificationCookie(ctx.context.returned, ctx.body?.email);
          if (email) {
            const attrs = { secure: useSecureCookies };
            ctx.context.responseHeaders?.append('Set-Cookie', pendingVerificationCookieHeader(email, attrs));
            try {
              ctx.context.responseHeaders?.append('Set-Cookie', pendingVerificationSignatureCookieHeader(email, config.secret, attrs));
            } catch { /* unsigned cookie still works; delivery reports 'unknown' */ }
          }
        }
      }),
    },
    user: { changeEmail: { enabled: false }, deleteUser: { enabled: !config.ownerOnly } },
    session: { expiresIn: 7 * 86400, updateAge: 86400, cookieCache: { enabled: false } },
    // customRules override the plugin's own per-endpoint rate limits
    // for matching paths (verified in 1.7.14's rate limiter: default
    // rules -> plugin rules -> customRules, last match wins). Limits
    // are per IP + path. The verify limit (5/min) matches the 5
    // allowed OTP attempts, so rate limiting never blocks a legitimate
    // user before the attempt counter does; the send limit (3/min) plus
    // the 60s per-email cooldown above bounds resend abuse.
    // /forget-password and /reset-password (S5-09) previously fell back
    // to the loose 60/min default: /forget-password sends reset mail
    // (3/min, matching the other mail-sending paths) and
    // /reset-password is token-guessing surface (5/min, matching OTP
    // verify). /forget-password answers 404 in Better Auth 1.7.14 —
    // the live reset path is /request-password-reset — but the rule
    // still applies if a future version serves it. Reset mail also gets
    // its own 60s per-email cooldown in the before-hook above, because
    // a per-IP limit alone does not bound mail to one victim address.
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 60, customRules: { '/sign-in/email': { window: 60, max: 8 }, '/sign-up/email': { window: 60, max: 4 }, '/request-password-reset': { window: 60, max: 3 }, '/forget-password': { window: 60, max: 3 }, '/reset-password': { window: 60, max: 5 }, '/send-verification-email': { window: 60, max: 3 }, '/email-otp/send-verification-otp': { window: 60, max: 3 }, '/email-otp/verify-email': { window: 60, max: 5 }, '/email-otp/check-verification-otp': { window: 60, max: 5 }, '/sign-in/email-otp': { window: 60, max: 3 }, '/email-otp/request-password-reset': { window: 60, max: 3 }, '/email-otp/reset-password': { window: 60, max: 3 }, '/forget-password/email-otp': { window: 60, max: 3 }, '/email-otp/request-email-change': { window: 60, max: 3 }, '/email-otp/change-email': { window: 60, max: 3 } } },
    advanced: { useSecureCookies, ipAddress: { ipAddressHeaders: [trustedIpHeader] } },
    databaseHooks: { user: {
      create: { before: async user => { if(typeof user.name!=='string'||!user.name.trim()||user.name.length>80)throw new APIError('BAD_REQUEST',{message:'Use a name between 1 and 80 characters.'});return {data:{...user,name:user.name.trim()}}; } },
      update: { before: async user => { if(user.name!==undefined&&(typeof user.name!=='string'||!user.name.trim()||user.name.length>80))throw new APIError('BAD_REQUEST',{message:'Use a name between 1 and 80 characters.'});return {data:user}; } },
      delete: { before: async user => { const {db}=await membershipDatabase();await db.transaction().execute(async tx=>{for(const table of ['aenural_activity','aenural_projects','aenural_caption_jobs','aenural_daily_usage','aenural_checkouts','aenural_orders','aenural_operation_limits'])await tx.deleteFrom(table).where('owner_id','=',user.id).execute();}); } },
    } },
    logger: { disabled: config.local },
  };
}

// Mail-transport health check for the pending-verification recovery
// route (and any future server-side caller that must answer the user
// about mail). Returns true when mail can be sent, false when it cannot
// — never throws, never logs an address, a code or a credential.
//   * Local-outbox mode: true (nothing remote to check; a disk failure
//     surfaces separately as a thrown send error, logged by sendMail).
//   * SMTP mode: runs nodemailer transport.verify() (connect +
//     authenticate, no mail sent), cached for SMTP_VERIFY_CACHE_TTL_MS
//     on success and SMTP_VERIFY_NEGATIVE_CACHE_TTL_MS on failure.
//     A failed verification is NOT cached forever, so a transient
//     outage recovers on the next check.
// Deliberately NOT called from membershipAuth(): a mail outage must not
// take down sign-in and verified sessions, which do not need mail.
export async function checkEmailTransportHealth(config) {
  try {
    if (resolveEmailTransport(config.env, config) !== 'smtp') return true;
  } catch {
    return false;
  }
  const nowMs = Date.now();
  if (smtpVerifyState) {
    const ageMs = nowMs - smtpVerifyState.atMs;
    const ttlMs = smtpVerifyState.ok ? SMTP_VERIFY_CACHE_TTL_MS : SMTP_VERIFY_NEGATIVE_CACHE_TTL_MS;
    if (ageMs < ttlMs) return smtpVerifyState.promise;
  }
  const startedAtMs = nowMs;
  const promise = (async () => {
    const probe = nodemailer.createTransport({ host: config.env.SMTP_HOST, port: Number(config.env.SMTP_PORT || 465), secure: config.env.SMTP_SECURE !== 'false', requireTLS: config.env.SMTP_SECURE === 'false', connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000, tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2', servername: config.env.SMTP_HOST }, auth: { user: config.env.SMTP_USER, pass: config.env.SMTP_PASSWORD } });
    await probe.verify();
    return true;
  })().catch((error) => {
    console.error('[membership] SMTP verification failed:', error?.code || error?.name || 'SMTP_UNAVAILABLE');
    return false;
  });
  smtpVerifyState = { promise, ok: true, atMs: startedAtMs };
  promise.then((ok) => {
    if (smtpVerifyState?.promise === promise) smtpVerifyState = { promise, ok, atMs: startedAtMs };
  });
  return promise;
}

export async function membershipAuth() {
  if (!authPromise) authPromise = (async () => {
    const { authDatabase, config, db, dialect } = await membershipDatabase();
    const options = authOptions(authDatabase, config, db);
    const auth = betterAuth(options);
    if (config.sqlite ?? config.local) {
      const { getMigrations } = await import('better-auth/db/migration');
      const migrations = await getMigrations(options); await migrations.runMigrations();
      const { ensureMembershipSchema } = await import('./schema.mjs');
      await ensureMembershipSchema(db, dialect);
    }
    // Restart recovery (Phase 4): restore recent OTP delivery statuses
    // from the durable audit table into the in-memory tracker, so a
    // restart does not reset every status to "unknown". Best-effort:
    // when migration 002 has not been applied yet (or the table is
    // otherwise unreadable) this is a silent no-op and the in-memory
    // tracker simply starts empty, as before.
    try {
      await repopulateOtpDeliveryFromStore({
        store: getActiveEmailDeliveryStore(),
        tracker: otpDelivery,
      });
    } catch { /* restart recovery must never block startup */ }
    // Guest-row prune (S5-34, best-effort): guest user rows accumulate
    // without bound — one row per fresh cookie. On startup, delete
    // guest rows older than 90 days that have no activity/quota/job
    // rows at all (see pruneStaleGuests in guest.mjs for the retention
    // rule). A failure here must never block startup.
    try {
      const { pruneStaleGuests } = await import('./guest.mjs');
      await pruneStaleGuests(db, { olderThanDays: 90 });
    } catch { /* prune is best-effort; rows simply accumulate until the next start */ }
    return auth;
  })();
  try { return await authPromise; } catch (error) { authPromise = undefined; throw error; }
}
export async function verifiedMember(requestHeaders) {
  // Anonymous visits to public tools do not initialize the DB/auth library.
  if (!/\b(?:__Secure-)?better-auth\.session_token=/.test(requestHeaders.get('cookie') || '')) return null;
  const auth = await membershipAuth();
  const session = await auth.api.getSession({ headers: requestHeaders, query: { disableCookieCache: true } });
  return session?.user?.emailVerified ? session.user : null;
}
