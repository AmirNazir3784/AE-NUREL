"use client";
import { useEffect, useId, useRef } from "react";

/** App dialog keeps file/model work asynchronous instead of blocking Chrome. */
export function ReplaceWorkDialog({ message, onCancel, onConfirm }: { message: string; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), cancel = useRef<HTMLButtonElement>(null), id = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    element.showModal(); cancel.current?.focus();
    return () => {
      element.close(); document.documentElement.style.overflow = overflow;
      queueMicrotask(() => { if (previous?.isConnected && !document.querySelector("dialog[open]")) previous.focus(); });
    };
  }, []);
  return <dialog ref={dialog} className="v1-leave-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => { event.preventDefault(); onCancel(); }}>
    <h2 id={`${id}-title`}>Replace your current work?</h2>
    <p id={`${id}-description`}>{message}</p>
    <div><button ref={cancel} type="button" className="button button-secondary" onClick={onCancel}>Keep editing</button><button type="button" className="button button-danger" onClick={onConfirm}>Replace</button></div>
  </dialog>;
}
