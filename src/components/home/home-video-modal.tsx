"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

type Selection = { src: string; poster: string; label: string; trigger: HTMLButtonElement };
const MediaContext = createContext<{ expanded: boolean; open: (selection: Selection) => void } | null>(null);

export function HomeVideoProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const dismiss = useCallback(() => setSelection(null), []);
  return <MediaContext.Provider value={{ expanded: !!selection, open: setSelection }}>
    {children}
    {selection && <HomeVideoModal selection={selection} onDismiss={dismiss} />}
  </MediaContext.Provider>;
}

export function useHomeMedia() {
  const media = useContext(MediaContext);
  if (!media) throw new Error("Homepage videos need their shared media provider.");
  return media;
}

function outside(element: HTMLDialogElement, x: number, y: number) {
  const box = element.getBoundingClientRect();
  return x < box.left || x > box.right || y < box.top || y > box.bottom;
}

function HomeVideoModal({ selection, onDismiss }: { selection: Selection; onDismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const backdrop = useRef(false);
  useEffect(() => {
    const element = dialog.current, player = video.current;
    if (!element || !player) return;
    const root = document.documentElement, body = document.body;
    const rootOverflow = root.style.overflow, bodyOverflow = body.style.overflow;
    root.style.overflow = body.style.overflow = "hidden";
    element.showModal();
    element.querySelector<HTMLButtonElement>("button")?.focus();
    void player.play().catch(() => { /* Visitors can use the native Play control. */ });
    return () => {
      player.pause();
      element.close();
      root.style.overflow = rootOverflow;
      body.style.overflow = bodyOverflow;
      queueMicrotask(() => { if (!element.isConnected && !document.querySelector("dialog[open]")) selection.trigger.focus(); });
    };
  }, [selection]);

  return <dialog ref={dialog} className="aen-video-dialog" aria-labelledby="home-video-title"
    onCancel={event => { event.preventDefault(); onDismiss(); }}
    onClose={() => { if (!dialog.current?.open) onDismiss(); }}
    onPointerDown={event => { backdrop.current = event.target === event.currentTarget && outside(event.currentTarget, event.clientX, event.clientY); }}
    onClick={event => { if (backdrop.current && event.target === event.currentTarget && outside(event.currentTarget, event.clientX, event.clientY)) onDismiss(); backdrop.current = false; }}>
    <div className="aen-video-dialog-head"><h2 id="home-video-title">{selection.label}</h2><button className="icon-button" type="button" aria-label="Close video" onClick={onDismiss}><Icon name="close" size={22} /></button></div>
    <video ref={video} src={selection.src} poster={selection.poster} controls playsInline preload="none" aria-label={selection.label}>
      <a href={selection.src}>Open video</a>
    </video>
  </dialog>;
}
