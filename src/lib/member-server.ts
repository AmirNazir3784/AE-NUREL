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
  return createMemberService(db, { local: config.local, testMode: config.local || config.env.LEMONSQUEEZY_TEST_MODE === "1" });
}
