import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { membershipEnabled } from "./membership-config";
export async function memberFromHeaders(requestHeaders: Headers) {
  if (!membershipEnabled()) return null;
  if (!/\b(?:__Secure-)?better-auth\.session_token=/.test(requestHeaders.get('cookie')||'')) return null;
  const { verifiedMember } = await import("../../server/membership/auth.mjs");
  return verifiedMember(requestHeaders);
}
export async function requireMember() {
  const member = await memberFromHeaders(await headers());
  if (!member) redirect("/sign-in");
  return member;
}
export async function memberService() {
  const [{ membershipAuth }, { membershipDatabase }, { createMemberService }] = await Promise.all([import("../../server/membership/auth.mjs"), import("../../server/membership/database.mjs"), import("../../server/membership/service.mjs")]);
  await membershipAuth();
  const { db, config } = await membershipDatabase();
  // Development is the environment (NODE_ENV), not the database engine:
  // config.local is false for remote-MySQL development, but the
  // development-plan test toggle (route gates it on NODE_ENV ===
  // 'development', the dashboard shows it on the same flag) and
  // test-mode premium must still work there. Passing config.local
  // alone made the dashboard buttons visible but dead (service threw
  // 404) in MySQL dev, and test-mode orders never counted as premium.
  // Production (NODE_ENV !== 'development') is unchanged.
  const development = process.env.NODE_ENV === 'development';
  return createMemberService(db, { local: config.local || development, sqlite: config.sqlite, ownerEmail:config.ownerOnly?(await import('../../server/membership/owner-activation.mjs')).resolveOwnerEmail():undefined, testMode: config.local || development || config.env.LEMONSQUEEZY_TEST_MODE === "1" });
}
