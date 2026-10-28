import { membershipEnabled } from "./membership-config";
// Page availability is separate from per-user authentication and entitlements.
export function accountPreviewAvailable() {
  return membershipEnabled() || process.env.NODE_ENV === "development" || process.env.AENURAL_ACCOUNT_QA === "1";
}
