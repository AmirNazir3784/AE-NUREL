// These switches are server configuration, never client-side entitlements.
//
// Canonical definition: server/membership/activation.mjs
// (resolveMembershipActivation). This file is the render-thread mirror of
// that truth table — the two MUST agree, and
// tests/membership-activation.test.mjs pins them against the same env
// matrix. Do not change one without the other, and never add a second
// switch, a client-side toggle, or a public readiness endpoint.
//
// Production default is OFF: with AENURAL_MEMBERSHIP_ENABLED unset (or
// anything but "1") and no explicit owner-test opt-in, membership is
// disabled — API routes answer 404 and auth pages render an unavailable
// state. Owner-only mode in production now requires the explicit
// AENURAL_OWNER_TEST_MODE=1 opt-in; it is no longer implied by "not
// enabled" (Phase 4 fix — the old implied fallback meant "disabled" in
// production still ran Better Auth on a SQLite owner database).
// Development default stays ON (local SQLite) unless
// AENURAL_MEMBERSHIP_DISABLED=1 — and the explicit disable wins in
// development even if AENURAL_MEMBERSHIP_ENABLED is also set to 1.
export function ownerTestEnabled() {
  return process.env.AENURAL_OWNER_TEST_MODE === "1";
}
export function membershipEnabled() {
  if (ownerTestEnabled()) return true;
  if (process.env.NODE_ENV === "development") return process.env.AENURAL_MEMBERSHIP_DISABLED !== "1";
  return process.env.AENURAL_MEMBERSHIP_ENABLED === "1";
}
