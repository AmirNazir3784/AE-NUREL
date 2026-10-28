// These switches are server configuration, never client-side entitlements.
export function ownerTestEnabled() {
  return process.env.AENURAL_OWNER_TEST_MODE === "1" || process.env.NODE_ENV === "production" && process.env.AENURAL_MEMBERSHIP_ENABLED !== "1" && process.env.AENURAL_OWNER_TEST_MODE !== "0";
}
export function membershipEnabled() {
  return ownerTestEnabled() || process.env.AENURAL_MEMBERSHIP_ENABLED === "1" || process.env.NODE_ENV === "development" && process.env.AENURAL_MEMBERSHIP_DISABLED !== "1";
}
