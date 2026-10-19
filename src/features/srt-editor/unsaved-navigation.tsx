"use client";
import { useEffect, useRef, useState } from "react";
import { guardedDestination } from "@/lib/editor-navigation";
import { initializeHistory } from "@/lib/history-navigation";
export function UnsavedNavigation({ dirty }: { dirty: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null), previousFocus = useRef<HTMLElement | null>(null), leaving = useRef(false);
  const [destination, setDestination] = useState<string | null>(null);
  const historyResume = useRef<(() => void) | null>(null), prompted = useRef(false);
  function rememberFocus() { previousFocus.current = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null; }
  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) { if (leaving.current) return; event.preventDefault(); event.returnValue = ""; }
    function click(event: MouseEvent) {
      if (leaving.current || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;
      const next = guardedDestination({ href: link.href, currentHref: window.location.href, target: link.target, download: link.hasAttribute("download"), button: event.button, modified: event.metaKey || event.ctrlKey || event.shiftKey || event.altKey, prevented: event.defaultPrevented });
      if (!next) return;
      event.preventDefault(); event.stopPropagation();
      if (prompted.current) return;
      prompted.current = true;
      previousFocus.current = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
      setDestination(next);
    }
    window.addEventListener("beforeunload", beforeUnload);
    window.document.addEventListener("click", click, true);
    const unblock = initializeHistory().block((resume) => {
      if (leaving.current || prompted.current) return;
      prompted.current = true; rememberFocus(); historyResume.current = resume;
      setDestination("history");
    });
    return () => { unblock(); window.removeEventListener("beforeunload", beforeUnload); window.document.removeEventListener("click", click, true); };
  }, [dirty]);
  useEffect(() => { if (destination && !dialog.current?.open) dialog.current?.showModal(); }, [destination]);
  function keepEditing() { initializeHistory().cancel(); historyResume.current = null; prompted.current = false; dialog.current?.close(); setDestination(null); previousFocus.current?.focus(); }
  function leave() {
    if (!destination) return;
    leaving.current = true; dialog.current?.close();
    // Dismiss site overlays before the approved document navigation.
    window.document.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach((el) => el.close());
    window.document.querySelectorAll<HTMLDetailsElement>("details[data-site-menu][open]").forEach((el) => { el.open = false; });
    if (historyResume.current) { historyResume.current(); historyResume.current = null; return; }
    window.location.assign(destination);
  }
  return <dialog ref={dialog} className="v1-leave-dialog" aria-labelledby="leave-title" aria-describedby="leave-description" onCancel={(e) => { e.preventDefault(); keepEditing(); }}><h2 id="leave-title">You have unsaved edits.</h2><p id="leave-description">Download your subtitles to keep a copy before leaving.</p><div><button className="button button-secondary" type="button" onClick={keepEditing}>Keep editing</button><button className="button button-danger" type="button" onClick={leave}>Leave and discard</button></div></dialog>;
}
