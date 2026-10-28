// These switches are server configuration, never client-side entitlements.
export function membershipEnabled() {
  return process.env.AENURAL_MEMBERSHIP_ENABLED === "1" || process.env.NODE_ENV === "development" && process.env.AENURAL_MEMBERSHIP_DISABLED !== "1";
}
