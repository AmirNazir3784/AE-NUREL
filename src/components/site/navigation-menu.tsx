"use client";
import { useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export function NavigationMenu({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  const element = useRef<HTMLDetailsElement>(null), pinned = useRef(false), closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function cancelClose() { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } }
  function scheduleClose() {
    cancelClose();
    if (!element.current || pinned.current || element.current.contains(document.activeElement)) return;
    closeTimer.current = setTimeout(() => { closeTimer.current = null; if (element.current && !pinned.current && !element.current.contains(document.activeElement)) element.current.open = false; }, 300);
  }
  function open() {
    for (const other of document.querySelectorAll<HTMLDetailsElement>("details[data-desktop-menu]")) if (other !== element.current) other.open = false;
    if (element.current) element.current.open = true;
  }
  return <details ref={element} data-site-menu data-desktop-menu className={`aen-tools-menu ${className}`}
    onToggle={() => { if (!element.current?.open) { pinned.current = false; cancelClose(); } }}
    onMouseEnter={() => { cancelClose(); open(); }}
    onMouseLeave={scheduleClose}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { pinned.current = false; event.currentTarget.open = false; } }}
    onKeyDown={event => {
      const menu = event.currentTarget, summary = menu.querySelector("summary");
      if (event.key === "Escape") { event.preventDefault(); pinned.current = false; menu.open = false; summary?.focus(); return; }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); open();
      const links = Array.from(menu.querySelectorAll<HTMLAnchorElement>("a[href]"));
      const index = links.indexOf(document.activeElement as HTMLAnchorElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : event.key === "ArrowDown" ? (index + 1) % links.length : index <= 0 ? links.length - 1 : index - 1;
      links[next]?.focus();
    }}>
    <summary onClick={event => { event.preventDefault(); const next = !element.current?.open || !pinned.current; pinned.current = next; if (next) open(); else if (element.current) element.current.open = false; }}>{label}<Icon name="chevron" size={14} /></summary>
    <div className="aen-mega">{children}</div>
  </details>;
}
