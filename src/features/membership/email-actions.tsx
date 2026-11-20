"use client";
import { useState, type FormEvent } from "react";
import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import { authRequest } from "./member-client";

// Password reset only. Email verification moved to the 6-digit code form in
// email-verification-form.tsx — this component no longer asks for an email
// address or sends verification links.
//
// Reset branch verified against the branch original: token from the reset
// link's query string, POST /api/auth/reset-password with { newPassword,
// token }, token stripped from the URL on success.
export function EmailActions({ reset = false, connected = true }: { reset?: boolean; connected?: boolean }) {
  const [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState(""), [notice, setNotice] = useState(""), [pending, setPending] = useState(false), [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setNotice("");
    if (!connected) { setPassword(""); setConfirmation(""); setNotice("Password recovery is currently unavailable. Nothing was sent or saved."); return; }
    if (!reset) { setNotice("Email verification now uses a 6-digit code. Visit the verification page to continue."); return; }
    if (password.length < 12 || password.length > 128 || password !== confirmation) { setNotice("Use 12–128 characters and make sure both passwords match."); return; }
    const token = new URLSearchParams(location.search).get("token");
    if (!token || token.length > 1024) { setNotice("This reset link is invalid. Request a new one."); return; }
    setPending(true);
    try {
      await authRequest("reset-password", { newPassword: password, token });
      setPassword(""); setConfirmation(""); history.replaceState(null, "", "/reset-password"); setDone(true); setNotice("Your password has been reset. Sign in with your new password.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The link could not be processed. Request a new one.");
    } finally { setPending(false); }
  }
  return <form className="cm-access-form" onSubmit={submit}>
    {!done && reset && <>
      <label>New password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={pending} /></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" maxLength={128} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required disabled={pending} /></label>
    </>}
    {!done && <button className="aen-btn aen-btn-primary" disabled={pending}>{pending ? "Please wait…" : reset ? "Reset password" : "Continue"} <Icon name="arrow" size={16} /></button>}
    {notice && <p role="status" className="cm-form-notice">{notice}</p>}
    {done && <Link href="/sign-in" className="cm-text-link">Sign in <Icon name="arrow" size={16} /></Link>}
    {reset && !done && <Link href="/forgot-password" className="cm-text-link">Request a new reset link</Link>}
  </form>;
}
