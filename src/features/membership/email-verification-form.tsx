"use client";
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import { pendingVerification, requestVerificationRecovery } from "./member-client";
import { formatCountdown, maskEmail, sendVerificationOtp, verifyEmailOtp } from "./email-otp-client";

const CODE_LENGTH = 6;
const RESEND_DELAY_SECONDS = 60;
const REDIRECT_DELAY_MS = 900;

type Phase = "loading" | "code" | "recovery" | "done";

/**
 * Email verification by 6-digit code (Better Auth Email OTP).
 *
 * The email address is supplied by the server — never typed in the normal
 * flow. On mount the form asks GET /api/membership/pending-verification for
 * the address the user just registered with (see MANIFEST.md §Backend
 * contract: the backend keeps it server-side, keyed by a short-lived
 * httpOnly cookie set at sign-up). The address is kept only in component
 * state; only the masked form (jo••••@gmail.com) is rendered. It is never
 * put in a URL, browser storage or a log, and the code is
 * never logged.
 *
 * If no pending address exists (session expired, direct visit, stale tab)
 * the form shows a dedicated recovery step with its own email field instead
 * of silently re-asking inside the normal form.
 *
 * Delivery failures: Better Auth 1.7.14 swallows mail-send errors and
 * answers success, so after every send the form re-checks the delivery
 * status recorded server-side (GET /api/membership/pending-verification,
 * `delivery: "sent" | "failed" | "unknown"`) and shows an honest error
 * with retry guidance when the last send failed, instead of claiming a
 * code was sent. See server/membership/otp-delivery.mjs.
 */
export function EmailVerificationForm({ connected = true }: { connected?: boolean }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  // True when the server recorded that the last OTP send for this address
  // failed (see member-client.ts: Better Auth 1.7.14 swallows send
  // failures and answers success, so the send endpoint cannot be trusted
  // on this — the pending-verification status is the source of truth).
  // The banner below tells the user honestly instead of leaving them
  // waiting for a code that never left the server. Resend still obeys
  // the 60s cooldown and the rate limits: a failed send created a code
  // row, so the cooldown applies until it expires.
  const [deliveryFailed, setDeliveryFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_DELAY_SECONDS);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const submittedCodeRef = useRef("");
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const code = digits.join("");

  useEffect(() => () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);

  // Resend countdown. Starts when the code step first appears (the code was
  // just sent at sign-up, or just re-sent) and ticks down once a second.
  useEffect(() => {
    if (phase !== "code" || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  // Load the pending-verification address from the server.
  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    pendingVerification()
      .then((result) => {
        if (cancelled) return;
        if (result.email) {
          setEmail(result.email);
          setMaskedEmail(result.maskedEmail || maskEmail(result.email));
          setDeliveryFailed(result.delivery === "failed");
          setPhase("code");
          setCountdown(RESEND_DELAY_SECONDS);
        } else {
          setPhase("recovery");
        }
      })
      .catch(() => {
        if (!cancelled) setPhase("recovery");
      });
    return () => { cancelled = true; };
  }, [connected]);

  // Focus the first code box once the code step appears.
  useEffect(() => {
    if (phase === "code") inputsRef.current[0]?.focus();
  }, [phase]);

  const verify = useCallback(async (value: string) => {
    if (pending || submittedCodeRef.current === value) return;
    submittedCodeRef.current = value;
    setPending(true);
    setError("");
    setNotice("");
    try {
      await verifyEmailOtp(email, value);
      setPhase("done");
      setNotice("Email verified. Taking you to your account…");
      // The backend establishes the session on verification; /account then
      // renders the signed-in workspace. If no session exists, /account
      // redirects to sign-in, where the verified user can sign in normally.
      redirectTimerRef.current = setTimeout(() => {
        location.assign(new URL("/account", location.origin).href);
      }, REDIRECT_DELAY_MS);
    } catch (failure) {
      // Do NOT clear submittedCodeRef here: auto-submit runs from the
      // input handlers, and the guard at the top of verify() must stop a
      // second submit of the same failed code while the boxes still hold
      // it. The ref is cleared when the user edits a digit, pastes,
      // resends, or presses Verify again manually (see submit()).
      setError(failure instanceof Error ? failure.message : "That code didn't match. Check the code and try again.");
    } finally {
      setPending(false);
    }
  }, [email, pending]);

  function setDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    const nextCode = next.join("");
    submittedCodeRef.current = "";
    setDigits(next);
    setError("");
    if (digit && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
    // Auto-submit once all six boxes are filled. This runs in the input
    // handler — a direct result of the user's keystroke — instead of an
    // effect, so no setState runs inside an effect
    // (react-hooks/set-state-in-effect). The `pending` check and the
    // submittedCodeRef guard in verify() stop double-submits.
    if (nextCode.length === CODE_LENGTH && !pending) void verify(nextCode);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        setDigits((previous) => {
          const next = [...previous];
          next[index] = "";
          return next;
        });
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        setDigits((previous) => {
          const next = [...previous];
          next[index - 1] = "";
          return next;
        });
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
    setDigits(next);
    submittedCodeRef.current = "";
    setError("");
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    // A full pasted code auto-submits, same as typing the sixth digit.
    if (pasted.length === CODE_LENGTH && !pending) void verify(pasted);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== CODE_LENGTH) {
      setError("Enter the 6-digit code sent to your email.");
      inputsRef.current[code.length]?.focus();
      return;
    }
    submittedCodeRef.current = ""; // Manual retry of the same code is allowed.
    await verify(code);
  }

  async function resend() {
    if (resending || countdown > 0 || !email) return;
    setResending(true);
    setError("");
    setNotice("");
    try {
      await sendVerificationOtp(email);
      // The send endpoint answers success even when mail fails (Better
      // Auth 1.7.14 swallows send errors), so re-check the recorded
      // delivery status: if this resend failed, say so instead of
      // claiming a new code was sent.
      const status = await pendingVerification().catch(() => null);
      if (status?.delivery === "failed") {
        setDeliveryFailed(true);
        setError("");
      } else {
        setDeliveryFailed(false);
        setNotice(`A new code was sent to ${maskedEmail}. It expires in 5 minutes.`);
      }
      setDigits(Array(CODE_LENGTH).fill(""));
      submittedCodeRef.current = "";
      setCountdown(RESEND_DELAY_SECONDS);
      inputsRef.current[0]?.focus();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The code could not be sent. Please try again.");
    } finally {
      setResending(false);
    }
  }

  async function submitRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = recoveryEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Enter a valid email address.");
      return;
    }
    if (resending) return;
    setResending(true);
    setError("");
    setNotice("");
    try {
      await requestVerificationRecovery(address);
      setEmail(address);
      setMaskedEmail(maskEmail(address));
      // The recovery route answers generically in every case (unknown /
      // verified / unverified), and a transport failure there is a 503 —
      // but a send can still fail after the pre-check. Re-check the
      // recorded delivery status before claiming a code was sent.
      const status = await pendingVerification().catch(() => null);
      setDeliveryFailed(status?.delivery === "failed");
      setDigits(Array(CODE_LENGTH).fill(""));
      submittedCodeRef.current = "";
      setCountdown(RESEND_DELAY_SECONDS);
      setPhase("code");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The code could not be sent. Please try again.");
    } finally {
      setResending(false);
    }
  }

  if (!connected) {
    return (
      <div className="cm-verification">
        <Icon name="shield" size={42} />
        <p>Email verification is currently unavailable. You can still use the caption tools without an account.</p>
        <button disabled className="aen-btn aen-btn-primary">Resend verification code</button>
        <Link href="/sign-in" className="cm-text-link">Back to sign in <Icon name="arrow" size={16} /></Link>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="cm-verification" role="status">
        <p>Checking your verification…</p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="cm-verification" role="status">
        <span className="cm-verify-icon" aria-hidden="true"><Icon name="check" size={26} /></span>
        <p><strong>Email verified.</strong></p>
        <p>Taking you to your account…</p>
        {notice && <p className="cm-form-notice">{notice}</p>}
        <Link href="/account" className="cm-text-link">Continue to your account <Icon name="arrow" size={16} /></Link>
      </div>
    );
  }

  if (phase === "recovery") {
    return (
      <form className="cm-access-form cm-verify-form" noValidate onSubmit={submitRecovery}>
        <span className="cm-verify-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m3.5 6 8.5 6.5L20.5 6" /></svg>
        </span>
        <p className="cm-verify-text">We couldn&rsquo;t find an email to verify. Your verification may have expired — enter your email and we&rsquo;ll send a fresh code.</p>
        <label>Email address
          <input type="email" autoComplete="email" maxLength={254} value={recoveryEmail} onChange={(event) => { setRecoveryEmail(event.target.value); setError(""); }} disabled={resending} aria-invalid={!!error} aria-describedby={error ? "cm-verify-error" : undefined} />
        </label>
        {error && <p id="cm-verify-error" className="cm-form-notice cm-form-notice--error" role="alert">{error}</p>}
        <button type="submit" className="aen-btn aen-btn-primary" disabled={resending}>{resending ? "Please wait…" : "Send a new code"} <Icon name="arrow" size={16} /></button>
        <Link href="/sign-up" className="cm-text-link">← Back to sign up</Link>
      </form>
    );
  }

  return (
    <form className="cm-access-form cm-verify-form" noValidate onSubmit={submit}>
      <span className="cm-verify-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m3.5 6 8.5 6.5L20.5 6" /></svg>
      </span>
      <p className="cm-verify-text">Enter the 6-digit verification code sent to your email address.</p>
      <p className="cm-verify-email" aria-label={`Code sent to ${maskedEmail}`}>{maskedEmail}</p>
      {deliveryFailed && (
        <p className="cm-form-notice cm-form-notice--error" role="alert">
          We couldn&rsquo;t send the verification code. Please try resending once the timer below ends — if it still doesn&rsquo;t arrive, check your spam folder or contact support@aenural.com.
        </p>
      )}
      <div className="cm-otp-group" role="group" aria-label="6-digit verification code" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => { inputsRef.current[index] = element; }}
            className="cm-otp-box"
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
            aria-invalid={!!error}
            aria-describedby={error ? "cm-verify-error" : undefined}
            disabled={pending}
            onChange={(event) => setDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onFocus={(event) => event.target.select()}
          />
        ))}
      </div>
      {error && <p id="cm-verify-error" className="cm-form-notice cm-form-notice--error" role="alert">{error}</p>}
      {notice && <p className="cm-form-notice" role="status">{notice}</p>}
      <button type="submit" className="aen-btn aen-btn-primary" disabled={pending || code.length !== CODE_LENGTH}>
        {pending ? "Verifying…" : "Verify email"} <Icon name="arrow" size={16} />
      </button>
      <p className="cm-verify-resend">
        Didn&rsquo;t receive the code?{" "}
        {countdown > 0 ? (
          <span>Resend code in {formatCountdown(countdown)}</span>
        ) : (
          <button type="button" className="cm-text-link cm-verify-resend-button" onClick={() => void resend()} disabled={resending}>
            {resending ? "Sending…" : "Resend code"}
          </button>
        )}
      </p>
      <p className="cm-verify-hint">The code expires in 5 minutes. Never share it with anyone — AENural will never ask for it.</p>
      <Link href="/sign-up" className="cm-text-link">← Back to sign up</Link>
    </form>
  );
}
