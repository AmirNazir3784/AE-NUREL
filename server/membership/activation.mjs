// Controlled membership activation for AENural (Phase 4, Worker D).
//
// CANONICAL DEFINITION of the membership on/off switch. There is exactly
// one switch: the environment. It is read here (server config path) and
// mirrored in `src/lib/membership-config.ts` (render path) — the two files
// MUST agree, and `tests/membership-activation.test.mjs` pins them against
// the same env matrix. Never add a second switch, a public toggle, an
// auto-activate-on-deploy step, or a public readiness/status endpoint.
//
// Modes:
//   * 'enabled'    — public membership is on. Production requires MySQL +
//                    SMTP + the trusted-proxy header (enforced by
//                    server/membership/config.mjs, which throws before any
//                    auth object exists). Local development uses SQLite.
//   * 'owner-only' — ONLY the pre-provisioned private owner account can
//                    sign in (public sign-up is closed, email recovery is
//                    refused). SQLite, in its own data directory. This is a
//                    deliberate private-test mode, never a fallback: it is
//                    entered ONLY with the explicit opt-in
//                    AENURAL_OWNER_TEST_MODE=1.
//   * 'disabled'   — no account services at all. API routes answer 404,
//                    auth pages render an unavailable state (no working
//                    form), and no database, auth library or mail transport
//                    is initialised for the request.
//
// Truth table (values are exact strings; anything else counts as unset):
//   AENURAL_OWNER_TEST_MODE === '1'                        -> owner-only
//   NODE_ENV === 'production':
//       AENURAL_MEMBERSHIP_ENABLED === '1'                 -> enabled
//       otherwise                                          -> disabled
//   NODE_ENV === 'development':
//       AENURAL_MEMBERSHIP_DISABLED === '1'                -> disabled
//       otherwise                                          -> enabled
//   any other NODE_ENV (incl. 'test' and unset):
//       AENURAL_MEMBERSHIP_ENABLED === '1'                 -> enabled
//       otherwise                                          -> disabled
//
// CHANGE vs Phases 1-3 (deliberate, breaking for the owner-test flow):
// the old code implied owner-only mode in production whenever the flag
// was not '1' (and OWNER_TEST_MODE was not '0'). That meant "disabled"
// in production still ran Better Auth on a SQLite owner database, served
// /api/auth/* (owner sign-in, password reset) and /api/membership/*
// (guest caption quota). There was no true off state in production, and
// a deploy following config/membership.env.example (ENABLED=0, no
// OWNER_TEST_MODE) silently ran owner-test auth. From this change on,
// production with the flag off is fully disabled; owner testing in
// production requires the explicit AENURAL_OWNER_TEST_MODE=1 opt-in.
// See docs/authentication/controlled-activation.md.
//
// This module is deliberately dependency-free (no better-auth, nodemailer,
// kysely or node: imports) so every export can be unit-tested with the
// plain Node test runner and no node_modules installed.

export const ACTIVATION_MODES = Object.freeze(['enabled', 'owner-only', 'disabled']);

// Env keys that must be present (non-empty) before public membership may
// be enabled outside local/SQLite mode. Names only — never values.
export const REQUIRED_ENABLED_ENV_KEYS = Object.freeze([
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'MAIL_FROM',
  'AUTH_TRUSTED_IP_HEADER',
]);

export function resolveMembershipActivation(env = process.env) {
  const ownerTest = env?.AENURAL_OWNER_TEST_MODE === '1';
  if (ownerTest) {
    return {
      mode: 'owner-only',
      enabled: true,
      ownerOnly: true,
      reason: 'AENURAL_OWNER_TEST_MODE=1 (explicit owner-only test mode).',
    };
  }
  if (env?.NODE_ENV === 'production') {
    if (env?.AENURAL_MEMBERSHIP_ENABLED === '1') {
      return {
        mode: 'enabled',
        enabled: true,
        ownerOnly: false,
        reason: 'AENURAL_MEMBERSHIP_ENABLED=1 in production.',
      };
    }
    return {
      mode: 'disabled',
      enabled: false,
      ownerOnly: false,
      reason: 'Production default is off: AENURAL_MEMBERSHIP_ENABLED is not 1.',
    };
  }
  if (env?.NODE_ENV === 'development') {
    if (env?.AENURAL_MEMBERSHIP_DISABLED === '1') {
      return {
        mode: 'disabled',
        enabled: false,
        ownerOnly: false,
        reason: 'AENURAL_MEMBERSHIP_DISABLED=1 in development.',
      };
    }
    return {
      mode: 'enabled',
      enabled: true,
      ownerOnly: false,
      reason: 'Development default is on (local SQLite) unless disabled.',
    };
  }
  if (env?.AENURAL_MEMBERSHIP_ENABLED === '1') {
    return {
      mode: 'enabled',
      enabled: true,
      ownerOnly: false,
      reason: 'AENURAL_MEMBERSHIP_ENABLED=1 outside production.',
    };
  }
  return {
    mode: 'disabled',
    enabled: false,
    ownerOnly: false,
    reason: 'Membership is not enabled for this environment.',
  };
}

// Names of the required keys (see above) that are missing or blank.
// Returns [] when the enabled configuration is complete. Used by
// server/membership/config.mjs so the fail-closed startup error names
// exactly which keys are missing (names only, never values).
export function missingEnabledConfig(env = process.env) {
  return REQUIRED_ENABLED_ENV_KEYS.filter(
    (key) => typeof env?.[key] !== 'string' || env[key].trim() === '',
  );
}

// Unverified-sign-in resume: should the pending-verification cookie be set
// for this sign-in attempt?
//
// Verified live against Better Auth 1.7.14 (Phase 4 probe, real SQLite
// run): signing in with a correct password as an unverified user sends a
// fresh OTP first (sendOnSignIn + overrideDefaultEmailVerification) and
// then fails with an APIError whose status is FORBIDDEN and whose
// `body.code` is 'EMAIL_NOT_VERIFIED'. A wrong password fails instead
// with status UNAUTHORIZED and body.code 'INVALID_EMAIL_OR_PASSWORD' and
// sends nothing. The cookie must therefore be set ONLY for the exact
// EMAIL_NOT_VERIFIED shape — checked in both places Better Auth exposes
// the code (`returned.body.code`, then `returned.code`) because the
// after-hook sees the APIError object, not the HTTP body.
//
// Returns the normalised (trimmed, lower-cased) email when the cookie
// should be set, otherwise null. If Better Auth ever changes the error
// shape, this returns null and the flow degrades safely to today's
// recovery step on /verify-email (the user re-types the email once);
// it can never set the cookie for a failed password or a verified user.
export function shouldSetPendingVerificationCookie(returned, bodyEmail) {
  const code = returned?.body?.code ?? returned?.code;
  if (code !== 'EMAIL_NOT_VERIFIED') return null;
  if (typeof bodyEmail !== 'string') return null;
  const email = bodyEmail.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !email.includes('@')) return null;
  return email;
}
