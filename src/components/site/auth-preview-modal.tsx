"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { validateAuthPreview, type AuthErrors, type AuthField, type AuthView } from "./auth-preview-validation";
import styles from "./auth-preview.module.css";

type Props = { onDismiss: () => void; returnFocus: HTMLElement | null };

export function AuthPreviewModal({ onDismiss, returnFocus }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const backdropStart = useRef(false);
  const previousView = useRef<AuthView>("login");
  const [view, setView] = useState<AuthView>("login");
  const [errors, setErrors] = useState<AuthErrors>({});
  const [notice, setNotice] = useState("");
  const [visible, setVisible] = useState({ password: false, confirmation: false });

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const root = document.documentElement, body = document.body;
    const rootOverflow = root.style.overflow, bodyOverflow = body.style.overflow;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    element.showModal();
    element.querySelector<HTMLInputElement>("input")?.focus();
    return () => {
      element.close();
      root.style.overflow = rootOverflow;
      body.style.overflow = bodyOverflow;
      // Strict Mode replays effects without removing the dialog. Restore only on unmount.
      queueMicrotask(() => {
        if (element.isConnected || document.querySelector("dialog[open]")) return;
        const menu = returnFocus?.closest("details");
        if (menu) menu.open = true;
        if (returnFocus?.getClientRects().length) returnFocus.focus();
        else {
          // A viewport change can hide the original desktop/mobile entry.
          const entries = document.querySelectorAll<HTMLElement>('.aen-sign-in-desktop, [aria-label="Navigation menu"]');
          Array.from(entries).find(entry => entry.getClientRects().length)?.focus();
        }
      });
    };
  }, [returnFocus]);

  useEffect(() => {
    if (view === "recovery") dialog.current?.querySelector<HTMLInputElement>("input")?.focus();
    else if (previousView.current === "recovery") dialog.current?.querySelector<HTMLButtonElement>(`#auth-tab-${view}`)?.focus();
    previousView.current = view;
  }, [view]);

  function changeView(next: AuthView) {
    setView(next);
    setErrors({});
    setNotice("");
    setVisible({ password: false, confirmation: false });
  }

  function tabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "login" : event.key === "End" ? "signup" : view === "login" ? "signup" : "login";
    changeView(next);
    dialog.current?.querySelector<HTMLButtonElement>(`#auth-tab-${next}`)?.focus();
  }

  function trapTab(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), [tabindex='0']"))
      .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form);
    const value = (field: AuthField) => String(data.get(field) ?? "");
    const next = validateAuthPreview(view, { name: value("name"), email: value("email"), password: value("password"), confirmation: value("confirmation") });
    setErrors(next);
    setNotice("");
    const firstError = Object.keys(next)[0];
    if (firstError) { form.querySelector<HTMLInputElement>(`[name="${firstError}"]`)?.focus(); return; }
    // Integration boundary: validation ends here. No network, persistence or session.
    setNotice("Account access is unavailable. Nothing was sent or saved.");
    form.querySelectorAll<HTMLInputElement>('input[name="password"], input[name="confirmation"]').forEach(input => { input.value = ""; });
    setVisible({ password: false, confirmation: false });
  }

  function field(name: AuthField, label: string) {
    const password = name === "password" || name === "confirmation";
    const shown = password && visible[name];
    return <div className={styles.field} key={name}>
      <label htmlFor={`auth-${name}`}>{label}</label>
      <div className={password ? styles.password : undefined}>
        <input id={`auth-${name}`} name={name} type={password ? shown ? "text" : "password" : name === "email" ? "email" : "text"}
          required autoComplete="off" spellCheck={false} autoCapitalize="none"
          maxLength={name === "name" ? 80 : name === "email" ? 254 : 128}
          aria-invalid={!!errors[name]} aria-describedby={[errors[name] ? `auth-${name}-error` : "", view === "signup" && name === "password" ? "auth-password-hint" : ""].filter(Boolean).join(" ") || undefined}
          onInput={() => { if (errors[name]) setErrors(previous => ({ ...previous, [name]: undefined })); if (notice) setNotice(""); }} />
        {password && <button type="button" className={styles.reveal} aria-label={`${shown ? "Hide" : "Show"} ${name === "confirmation" ? "confirm password" : "password"}`} aria-pressed={shown}
          onClick={() => setVisible(previous => ({ ...previous, [name]: !previous[name] }))}>{shown ? "Hide" : "Show"}</button>}
      </div>
      {view === "signup" && name === "password" && <p id="auth-password-hint" className={styles.hint}>Use at least 12 characters.</p>}
      {errors[name] && <p className={styles.error} id={`auth-${name}-error`}>{errors[name]}</p>}
    </div>;
  }

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="auth-title" aria-describedby="auth-subtitle auth-preview-note" onKeyDown={trapTab}
    onCancel={event => { event.preventDefault(); onDismiss(); }}
    onClose={() => { if (!dialog.current?.open) onDismiss(); }}
    onPointerDown={event => { backdropStart.current = event.target === event.currentTarget && outside(event.currentTarget, event.clientX, event.clientY); }}
    onClick={event => { if (backdropStart.current && event.target === event.currentTarget && outside(event.currentTarget, event.clientX, event.clientY)) onDismiss(); backdropStart.current = false; }}>
    <div className={styles.content}>
      <button type="button" className={styles.close} aria-label="Close account dialog" onClick={onDismiss}><Icon name="close" size={20} /></button>
      <h2 id="auth-title">Welcome to AENural</h2>
      <p id="auth-subtitle" className={styles.subtitle}>Sign in or create your account.</p>
      <p className={styles.footer}><a href="/sign-in" className={styles.textButton}>Open sign-in page</a> ? <a href="/account" className={styles.textButton}>Account preview</a></p>
      <p id="auth-preview-note" className={styles.note}>Use sample details only. Account access is unavailable.</p>
      {view !== "recovery" ? <div className={styles.tabs} role="tablist" aria-label="Account access">
        {(["login", "signup"] as const).map(tab => <button key={tab} id={`auth-tab-${tab}`} type="button" role="tab" aria-selected={view === tab} aria-controls="auth-panel" tabIndex={view === tab ? 0 : -1} onKeyDown={tabKey} onClick={() => changeView(tab)}>{tab === "login" ? "Log in" : "Sign up"}</button>)}
      </div> : <h3 className={styles.recoveryTitle}>Reset your password</h3>}
      <div id="auth-panel" role={view !== "recovery" ? "tabpanel" : undefined} aria-labelledby={view !== "recovery" ? `auth-tab-${view}` : undefined}>
        <form key={view} noValidate autoComplete="off" onSubmit={submit}>
          {view === "signup" && field("name", "Name")}
          {field("email", "Email")}
          {view !== "recovery" && field("password", "Password")}
          {view === "signup" && field("confirmation", "Confirm password")}
          {view === "login" && <button className={styles.textButton} type="button" onClick={() => changeView("recovery")}>Forgot password?</button>}
          <div role="status" aria-live="polite" aria-atomic="true" className={styles.status}>{notice || (Object.values(errors).some(Boolean) ? "Check the highlighted fields." : "")}</div>
          <button className={`aen-btn aen-btn-primary ${styles.submit}`} type="submit">{view === "signup" ? "Create account" : view === "recovery" ? "Reset password" : "Log in"}</button>
        </form>
      </div>
      <p className={styles.footer}>{view === "login" ? <>New here? <button type="button" className={styles.textButton} onClick={() => changeView("signup")}>Create an account</button></> : <button type="button" className={styles.textButton} onClick={() => changeView("login")}>Back to Log in</button>}</p>
    </div>
  </dialog>;
}

function outside(dialog: HTMLDialogElement, x: number, y: number) {
  const rect = dialog.getBoundingClientRect();
  return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
}
