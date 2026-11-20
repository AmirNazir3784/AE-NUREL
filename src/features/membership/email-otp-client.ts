// Email OTP client — AENural membership.
//
// Verified against the Better Auth Email OTP plugin docs
// (https://better-auth.com/docs/plugins/email-otp, read 2026-11-18) and the
// plugin's published type definitions. The typed client calls are:
//
//   authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" })
//   authClient.emailOtp.verifyEmail({ email, otp })
//   authClient.emailOtp.checkVerificationOtp({ email, otp, type: "email-verification" })
//
// Those methods POST to /email-otp/send-verification-otp,
// /email-otp/verify-email and /email-otp/check-verification-otp under the
// auth base path. This module calls the same REST endpoints with plain fetch
// because this codebase has no typed `better-auth/client` yet (see Phase 1
// report §1.9: the client uses raw fetch to /api/auth/*). Swapping to the
// typed client is a one-line change per call once src/lib/auth-client.ts
// exists — the request shapes below already match it exactly.
//
// BACKEND CONTRACT (backend worker): the emailOTP plugin must be registered
// server-side with `overrideDefaultEmailVerification: true`, `otpLength: 6`
// and `expiresIn: 300` (5 minutes), and its sendVerificationOTP must send
// the code with the branded template built by buildOtpEmail() in
// server/membership/email-otp.mjs. Until the plugin is
// registered these endpoints return 404 and the form shows its
// "unavailable" state instead of failing silently.
//
// Privacy: the full email address lives only in component state (memory).
// It is never written to browser storage, a URL or a log, and
// the OTP is never logged. Only the masked form is ever rendered.
import { MemberRequestError } from "./member-client";

export type OtpType = "email-verification" | "sign-in" | "forget-password";

/** Show the first 2 characters of the local part, then bullets, then the domain. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "••••••";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.length >= 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}••••@${domain}`;
}

/** "00:59" style countdown text. */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

async function otpRequest(path: string, body: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({ message: "Account services are unavailable. Try again." }));
  if (!response.ok) {
    throw new MemberRequestError(
      response.status === 429
        ? "Too many attempts. Please wait a minute and try again."
        : result.code === "TOO_MANY_ATTEMPTS"
          ? "Too many incorrect attempts. Request a new code."
          // S5-26: expired and invalid codes share ONE generic message.
          // Better Auth distinguishes them (OTP_EXPIRED means a code
          // was issued for this address and expired; INVALID_OTP means
          // no live code matched), and surfacing the distinction would
          // let anyone probe whether an unverified sign-up ever
          // happened for an address. The raw code still differs in
          // the API response; the client-visible message does not.
          : result.code === "OTP_EXPIRED" || result.code === "EXPIRED_OTP" || result.code === "INVALID_OTP"
            ? "That code didn't match or has expired. Check the code and try again."
            : result.message || "This request could not be completed.",
      response.status,
      result.code,
    );
  }
  return result;
}

/**
 * Send a 6-digit email-verification code.
 * Typed-client equivalent:
 *   authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" })
 */
export async function sendVerificationOtp(email: string): Promise<void> {
  await otpRequest("email-otp/send-verification-otp", { email: email.trim(), type: "email-verification" satisfies OtpType });
}

/**
 * Verify the email with the 6-digit code. On success the backend establishes
 * the session (see MANIFEST.md §Backend contract); the caller then redirects
 * to /account. Throws MemberRequestError with a customer-safe message.
 * Typed-client equivalent:
 *   authClient.emailOtp.verifyEmail({ email, otp })
 */
export async function verifyEmailOtp(email: string, otp: string): Promise<unknown> {
  return otpRequest("email-otp/verify-email", { email: email.trim(), otp });
}
