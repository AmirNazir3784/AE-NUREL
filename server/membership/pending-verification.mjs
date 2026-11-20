// Pending-verification state for the email OTP flow.
//
// Better Auth 1.7.14 provides no mechanism to remember which email is
// awaiting verification across a page refresh, so AENural keeps that one
// fact in a short-lived, server-set cookie:
//
//   * The cookie holds ONLY the email address — never a code, token or
//     password. The code itself lives only in the user's inbox and, in
//     hashed form, in the `verification` table.
//   * httpOnly (JavaScript cannot read it), SameSite=Lax, explicit
//     Path=/, Secure when the configured origin is https: (plain HTTP
//     in local development only), __Host- prefix outside local mode,
//     Max-Age 600 seconds (10 min — twice the 5-minute code lifetime,
//     so a code that is still valid always has its cookie, and a stale
//     cookie never lingers).
//   * Path is "/" rather than "/verify-email" on purpose: the cookie
//     must be sent with the same-origin API calls that need it
//     (GET /api/membership/pending-verification and the OTP resend),
//     and a /verify-email-scoped cookie would be invisible to /api/*.
//   * Never localStorage, never URL parameters, never client storage of
//     any kind: the email is only ever written by the server (after a
//     successful sign-up, or by the recovery route below) and is cleared
//     when verification succeeds.
//
// Two small server handlers live here for the app's API routes to wire
// (there is no Next.js app router in the Phase 2 backend scope, so the
// routes themselves are integration work — see MANIFEST.md for the exact
// wiring snippet):
//   * handlePendingVerificationStatus — GET: returns the cookie email
//     (full address, so the page can call verifyEmail after a refresh)
//     plus a masked form for display. The client masks for display;
//     the cookie is the user's own address for this browser.
//   * handlePendingVerificationRecovery — POST { email }: re-sends a
//     code when, and only when, an unverified account exists for that
//     email. The response is byte-identical in every case (unknown
//     address, already-verified address, unverified address, mail
//     transport down at the generic level) so it cannot be used to
//     enumerate accounts.

import { maskEmail, isOtpResendBudgetExhausted } from './email-otp.mjs';
import { getOtpDeliveryStatus } from './otp-delivery.mjs';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const PENDING_VERIFICATION_COOKIE = 'aenural_pending_verification';
export const PENDING_VERIFICATION_SIGNATURE_COOKIE = 'aenural_pending_verification_sig';
export const PENDING_VERIFICATION_MAX_AGE_SECONDS = 600;
export const PENDING_VERIFICATION_RECOVERY_MESSAGE =
  'If an unverified AENural account exists for that email, a new verification code was sent.';

// --- Anonymous-route rate limiting (S5-05, S5-30) ---------------------------
// The custom /api/membership/* routes sit outside Better Auth's rate
// limiter, so the pending-verification GET/POST branches get their own
// bound here: a bounded in-memory per-IP throttle (generous limits — the
// per-email OTP budget below is the real bound for sends). It is keyed
// on the client IP only when the route could read one from a header;
// when no IP value is present the throttle is skipped rather than
// collapsing every visitor into one shared bucket. Same single-process
// constraint as the OTP delivery tracker. `service.limitOperation()`
// was NOT reused: its `aenural_operation_limits.owner_id` column has a
// MySQL foreign key to `user(id)`, so an anonymous IP/email-hash key
// would violate it (see otp-REPORT.md).
const ROUTE_LIMIT_MAX_ENTRIES = 5000;
const routeLimits = new Map(); // key -> { windowStartMs, count }
/**
 * @param {string} key
 * @param {{ max?: number, windowMs?: number }} [options]
 * @returns {boolean}
 */
export function checkAnonymousRouteLimit(key, { max, windowMs = 60_000 } = {}) {
  if (typeof key !== 'string' || !key || !Number.isFinite(max) || max <= 0) return true;
  const nowMs = Date.now();
  const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
  let entry = routeLimits.get(key);
  if (!entry || entry.windowStartMs !== windowStartMs) {
    entry = { windowStartMs, count: 0 };
    routeLimits.set(key, entry);
    if (routeLimits.size > ROUTE_LIMIT_MAX_ENTRIES) {
      const oldest = routeLimits.keys().next().value;
      routeLimits.delete(oldest);
    }
  }
  entry.count += 1;
  return entry.count <= max;
}
export function resetAnonymousRouteLimits() {
  routeLimits.clear();
}

export function isValidPendingEmail(email) {
  return (
    typeof email === 'string' &&
    email.length >= 3 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

// Whether pending-verification cookies get the Secure flag (and the
// __Host- prefix). Derived from the configured origin's protocol
// (S5-32): https: origins get Secure, plain-http origins (local
// development on http://localhost:3000) do not. Falls back to
// !config.local only when no origin is configured (offline callers).
export function secureCookiesForConfig(config) {
  if (typeof config?.origin === 'string' && config.origin) return config.origin.startsWith('https:');
  return config ? !config.local : false;
}

function cookieAttributes({ secure = false } = {}) {
  // Secure mirrors the configured origin's protocol (S5-32): on when
  // the origin is https:, off for plain-http local development
  // (http://localhost:3000) — never keyed on config.local alone, so a
  // non-local deployment served over plain HTTP does not get Secure
  // cookies it cannot use, and an https: origin always does.
  return `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

// Cookie names (S5-29): in non-local mode (secure cookies) the
// __Host- prefix applies — it binds the cookie to the host (no Domain
// attribute, Path=/, Secure required), matching the guest cookie in
// guest.mjs. Plain names are kept only in local mode, where Secure is
// off and __Host- would be rejected by the browser. Readers accept
// both names so a cookie set before a deploy still reads.
function pendingVerificationCookieName({ secure = false } = {}) {
  return secure ? `__Host-${PENDING_VERIFICATION_COOKIE}` : PENDING_VERIFICATION_COOKIE;
}
function pendingVerificationSignatureCookieName({ secure = false } = {}) {
  return secure ? `__Host-${PENDING_VERIFICATION_SIGNATURE_COOKIE}` : PENDING_VERIFICATION_SIGNATURE_COOKIE;
}

// Set-Cookie value that stores ONLY the email address.
export function pendingVerificationCookieHeader(email, { secure = false } = {}) {
  if (!isValidPendingEmail(email)) throw new Error('A valid email is required for the pending-verification cookie.');
  return (
    `${pendingVerificationCookieName({ secure })}=${encodeURIComponent(email)}; ` +
    `Max-Age=${PENDING_VERIFICATION_MAX_AGE_SECONDS}; ${cookieAttributes({ secure })}`
  );
}

// Set-Cookie value that removes the cookie (sent after successful
// verification; the 10-minute Max-Age is the backstop if it is missed).
// Clears the name that matches the secure flag; a stale cookie under the
// other name expires on its own 10-minute Max-Age and is never read in
// preference to a current one (readers check __Host- first).
export function clearPendingVerificationCookieHeader({ secure = false } = {}) {
  return (
    `${pendingVerificationCookieName({ secure })}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ` +
    cookieAttributes({ secure })
  );
}

// --- Signature cookie (delivery-status oracle guard) -----------------------
// The email cookie alone cannot prove HOW the browser got the address:
// the recovery route sets it for ANY well-formed address (that is what
// keeps its response identical across cases). The OTP delivery status,
// however, is only ever recorded when a send was actually attempted —
// and a send is only attempted for an existing unverified account. So
// reporting delivery for a recovery-set cookie would let anyone learn
// whether an unverified account exists for an address, with no
// password and no account access: POST resend for the victim's address,
// then GET the status and read 'sent' vs 'unknown'.
//
// The sign-up after-hook therefore sets a SECOND cookie holding
// HMAC-SHA256(secret, 'pending-verification:' + email). Delivery is
// reported only when that signature verifies (see
// pendingVerificationStatus). Recovery never sets it, so a
// recovery-originated session keeps the email across refresh but its
// delivery always reads 'unknown' — the honest-error banner is a
// sign-up-flow feature, not a recovery oracle. A forged signature
// cannot be produced without the server secret, and a missing or
// invalid signature degrades gracefully to 'unknown' (never an error).
function pendingVerificationSignature(email, secret) {
  return createHmac('sha256', secret).update('pending-verification:' + email).digest('base64url');
}

export function pendingVerificationSignatureCookieHeader(email, secret, { secure = false } = {}) {
  if (!isValidPendingEmail(email)) throw new Error('A valid email is required for the pending-verification signature cookie.');
  if (typeof secret !== 'string' || !secret) throw new Error('A signing secret is required for the pending-verification signature cookie.');
  return (
    `${pendingVerificationSignatureCookieName({ secure })}=${pendingVerificationSignature(email, secret)}; ` +
    `Max-Age=${PENDING_VERIFICATION_MAX_AGE_SECONDS}; ${cookieAttributes({ secure })}`
  );
}

export function clearPendingVerificationSignatureCookieHeader({ secure = false } = {}) {
  return (
    `${pendingVerificationSignatureCookieName({ secure })}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ` +
    cookieAttributes({ secure })
  );
}

function readCookieValue(cookieHeader, name) {
  if (typeof cookieHeader !== 'string' || !cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key !== name) continue;
    try {
      return decodeURIComponent(rest.join('='));
    } catch {
      return null;
    }
  }
  return null;
}

// Readers accept both the __Host- name and the plain name (__Host-
// first): a cookie set before a deploy, or in local mode, still reads.
function readCookieValueEitherName(cookieHeader, plainName) {
  return readCookieValue(cookieHeader, `__Host-${plainName}`)
    ?? readCookieValue(cookieHeader, plainName);
}

function hasValidPendingVerificationSignature(cookieHeader, secret) {
  if (typeof secret !== 'string' || !secret) return false;
  const email = readPendingVerificationEmail(cookieHeader);
  const signature = readCookieValueEitherName(cookieHeader, PENDING_VERIFICATION_SIGNATURE_COOKIE);
  if (!email || !signature) return false;
  const expected = pendingVerificationSignature(email, secret);
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function readPendingVerificationEmail(cookieHeader) {
  const value = readCookieValueEitherName(cookieHeader, PENDING_VERIFICATION_COOKIE);
  if (value === null) return null;
  const email = value.trim().toLowerCase();
  return isValidPendingEmail(email) ? email : null;
}

export function pendingVerificationStatus(cookieHeader, { secret } = {}) {
  const email = readPendingVerificationEmail(cookieHeader);
  // Delivery status (Stage F): 'sent' | 'failed' | 'unknown', recorded
  // by the app's own sendVerificationOTP callback (see otp-delivery.mjs)
  // — the only place a send failure is observable, because Better Auth
  // 1.7.14 swallows it and answers success. 'unknown' means no send
  // was attempted for this address, or the entry expired (10 min). No
  // error code, provider detail or OTP is ever returned here. Without a
  // pending cookie there is no address, so delivery is 'unknown'.
  // Delivery is reported ONLY when the sign-up signature cookie
  // verifies (see above): without that gate the recovery route — which
  // sets the email cookie for any well-formed address — would turn
  // this endpoint into an unverified-account existence oracle.
  const delivery = email && hasValidPendingVerificationSignature(cookieHeader, secret)
    ? getOtpDeliveryStatus(email)
    : 'unknown';
  return email
    ? { email, emailMasked: maskEmail(email), delivery }
    : { email: null, emailMasked: null, delivery: 'unknown' };
}

// GET /api/membership/pending-verification — reads the cookie the server
// set at sign-up and reports which email is awaiting verification.
// Returns the full address (the page needs it to call verifyEmail after
// a refresh), a masked form for display, and the delivery status of the
// last OTP send for that address ('sent' | 'failed' | 'unknown') so the
// verify page can show an honest error when the code never left the
// server instead of leaving the user guessing. See the residual
// enumeration note in otp-delivery.mjs: 'failed' is only ever shown for
// the address in the caller's own pending cookie.
export function handlePendingVerificationStatus(request, { secret } = {}) {
  const status = pendingVerificationStatus(request?.headers?.get('cookie') || '', { secret });
  // S5-28: the response carries the caller's own email + delivery
  // status, so it must never sit in a shared cache and it varies by
  // cookie — same headers as the route's json() wrapper for every
  // other branch. (force-dynamic already prevents Next.js caching;
  // this is the defence-in-depth half.)
  return Response.json(status, {
    status: 200,
    headers: { 'Cache-Control': 'no-store', 'Vary': 'Cookie' },
  });
}

// POST /api/membership/pending-verification/resend — body { email }.
// Re-sends an email-verification OTP only when an unverified account
// exists for that address. Every outcome returns the same generic
// 200 response (same JSON, same status), with the pending cookie set
// whenever the submitted address is well-formed — so the response
// cannot distinguish unknown / verified / unverified addresses.
//
// `checkEmailTransportHealth` is injected (it lives in auth.mjs, which
// would be a circular import here) and optional: when provided and it
// reports the mail transport down, the route answers 503 with a generic
// message instead of pretending a code was sent. That check runs before
// any account lookup, so it leaks nothing about the address either.
export async function handlePendingVerificationRecovery(
  request,
  { auth, db, config, checkEmailTransportHealth } = {},
) {
  const genericHeaders = new Headers({
    'Cache-Control': 'no-store',
    'Vary': 'Cookie',
  });
  const generic = (status = 200, message = PENDING_VERIFICATION_RECOVERY_MESSAGE) =>
    Response.json({ success: true, message }, { status, headers: genericHeaders });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'This request could not be completed.' }, { status: 400 });
  }
  const submitted = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!submitted) {
    return Response.json({ message: 'This request could not be completed.' }, { status: 400 });
  }
  if (!isValidPendingEmail(submitted)) {
    // Well-formed request, unusable address: same generic answer as an
    // unknown address, and no cookie is set for a malformed value.
    return generic();
  }
  // The cookie is set for every well-formed address, whether or not an
  // account exists: the caller supplied the value, so setting it leaks
  // nothing, and it keeps the response identical across cases.
  // Deliberately the EMAIL cookie only — never the signature cookie
  // (see the oracle guard above): a recovery-set signature would let
  // anyone read the delivery status for an arbitrary address.
  // Secure follows the configured origin's protocol (S5-32), not
  // config.local alone — see secureCookiesForConfig below.
  genericHeaders.set(
    'Set-Cookie',
    pendingVerificationCookieHeader(submitted, { secure: secureCookiesForConfig(config) }),
  );

  // Per-email resend budget (S5-16): enforced here, before any account
  // lookup, so an exhausted budget answers the same generic success
  // without sending — it cannot enumerate accounts. The plugin
  // before-hook enforces the same budget for browser resends; this
  // layer covers the recovery route even if the internal call ever
  // stopped running the hook.
  if (isOtpResendBudgetExhausted(submitted)) {
    return generic();
  }

  if (typeof checkEmailTransportHealth === 'function' && config) {
    let healthy = true;
    try {
      healthy = await checkEmailTransportHealth(config);
    } catch {
      healthy = false;
    }
    if (!healthy) {
      return Response.json(
        { message: 'Account services are unavailable. Try again.' },
        { status: 503, headers: genericHeaders },
      );
    }
  }

  try {
    const user = await db
      .selectFrom('user')
      .select(['email', 'emailVerified'])
      .where('email', '=', submitted)
      .executeTakeFirst();
    const verified = user?.emailVerified === true || user?.emailVerified === 1;
    if (user && !verified) {
      // Goes through the real plugin endpoint (server-side call).
      // What is PROVEN about that call (S5-05, integration test in
      // tests/email-otp.test.mjs — "resend route twice in a row"):
      // the per-email 60s resend cooldown in the before-hook DOES run
      // for server-side auth.api.sendVerificationOTP() calls — a second
      // immediate call sends nothing — and the same before-hook records
      // the send against the per-email resend budget (S5-16), so the
      // budget is enforced here without this handler recording it a
      // second time. What is NOT claimed: the per-IP rate limit.
      // Better Auth documents that rate limits apply only to
      // client-initiated requests, and a server-side call carries no
      // client IP, so no per-IP protection is inherited here. This
      // route is bounded instead by the per-email resend budget
      // (checked above and in the before-hook) and the per-IP throttle
      // in src/app/api/membership/[...path]/route.ts.
      // The plugin itself returns success for unknown addresses; the
      // existence check above is what stops codes going to
      // already-verified accounts.
      await auth.api.sendVerificationOTP({
        body: { email: submitted, type: 'email-verification' },
      });
    }
  } catch (error) {
    // Database or send failure: log only the error code (never the
    // address or any code) and still answer generically. The caller
    // cannot tell a failure from an unknown address, and the server
    // log keeps the failure visible to operators.
    console.error('[membership] Verification recovery failed:', error?.code || error?.name || 'RECOVERY_FAILED');
  }
  return generic();
}
