"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { Icon } from "@/components/ui/icon";
import { ToolIcon } from "@/components/ui/icon-tile";
import { tools, searchTools } from "@/lib/tools";
import { menuNames } from "@/lib/discovery";
export function Header() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null), mobile = useRef<HTMLDetailsElement>(null);
  const dialog = useRef<HTMLDialogElement>(null), searchInput = useRef<HTMLInputElement>(null), searchTrigger = useRef<HTMLButtonElement>(null);
  const menuPinned = useRef(false);
  const [query, setQuery] = useState("");
  const results = searchTools(query);
  function closeMenus() { menuPinned.current = false; if (menu.current) menu.current.open = false; if (mobile.current) mobile.current.open = false; }
  useEffect(() => {
    function outside(event: PointerEvent) { for (const el of [menu.current, mobile.current]) if (el?.open && event.target instanceof Node && !el.contains(event.target)) { el.open = false; if (el === menu.current) menuPinned.current = false; } }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  function escape(event: React.KeyboardEvent<HTMLDetailsElement>) { if (event.key === "Escape") { menuPinned.current = false; event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }
  function openSearch() { closeMenus(); setQuery(""); dialog.current?.showModal(); searchInput.current?.focus(); }
  return <>
    <div className="aen-topbar"><b>Source Window</b> — the flagship product from AENural. <Link href="/source-window">Explore →</Link></div>
    <header className="aen-nav"><div className="aen-wrap aen-nav-inner">
      <Link href="/" className="aen-brand" aria-label="AENural home" onClick={closeMenus}><Brand /></Link>
      <nav className="aen-nav-links" aria-label="Main navigation">
        <details ref={menu} data-site-menu className="aen-tools-menu" onKeyDown={escape} onMouseEnter={() => { if (menu.current) menu.current.open = true; }} onMouseLeave={() => { if (menu.current && !menuPinned.current && !menu.current.contains(document.activeElement)) menu.current.open = false; }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { menuPinned.current = false; event.currentTarget.open = false; } }}><summary onClick={event => { event.preventDefault(); menuPinned.current = !menuPinned.current; if (menu.current) menu.current.open = menuPinned.current; }}>Tools<Icon name="chevron" size={14} /></summary><div className="aen-mega"><div className="aen-mega-grid"><section><h2><i className="aen-orange-dot" />Flagship · After Effects</h2><Link href="/source-window" className="aen-mega-product" onClick={closeMenus}><span className="aen-menu-icon"><Icon name="video" size={17} /></span><span><b>Source Window</b><small>AENural’s main product</small></span></Link></section><section><h2><i />Free tools · In your browser</h2><Link href="/tools/subtitle-tools" onClick={closeMenus}><ToolIcon name={tools[3].icon} compact /><span><b>Subtitle Tools</b><small>Edit, merge &amp; retime</small></span></Link><Link href="/tools/srt-to-vtt" onClick={closeMenus}><ToolIcon name={tools[6].icon} compact /><span><b>SRT to VTT</b><small>Convert subtitle formats</small></span></Link></section></div><div className="aen-mega-footer"><Link href="/tools" onClick={closeMenus}>See all tools →</Link><span>Source Window + free utilities</span></div></div></details>
        <Link href="/source-window" onClick={closeMenus} aria-current={pathname === "/source-window" ? "page" : undefined}>Source Window</Link><Link href="/about" onClick={closeMenus} aria-current={pathname === "/about" ? "page" : undefined}>About</Link><Link href="/help" onClick={closeMenus} aria-current={pathname === "/help" ? "page" : undefined}>Help</Link>
      </nav>
      <div className="aen-nav-right"><button className="aen-utility-button" type="button" ref={searchTrigger} aria-label="Search tools" onClick={openSearch}><Icon name="search" size={19} /></button><Link className="aen-btn aen-btn-primary aen-nav-cta" href="/tools" onClick={closeMenus}>Explore tools</Link><details className="aen-mobile-menu" data-site-menu ref={mobile} onKeyDown={escape}><summary aria-label="Navigation menu"><Icon name="menu" size={22} /></summary><nav aria-label="Mobile navigation"><Link href="/source-window" onClick={closeMenus}>Source Window</Link><Link href="/tools" onClick={closeMenus}>All Tools</Link><Link href="/tools/subtitle-tools" onClick={closeMenus}>Subtitle Tools</Link>{tools.map(tool => <Link href={tool.href} key={tool.href} onClick={closeMenus}><ToolIcon name={tool.icon} compact />{menuNames[tool.href]}</Link>)}<Link href="/about" onClick={closeMenus}>About AENural</Link><Link href="/help" onClick={closeMenus}>Help</Link></nav></details></div>
    </div></header>
    <dialog ref={dialog} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); dialog.current?.close(); } }} className="search-dialog" aria-labelledby="search-title" onClose={() => searchTrigger.current?.focus()} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><div className="search-dialog-head"><h2 id="search-title">Find a free tool</h2><button className="icon-button" type="button" aria-label="Close search" onClick={() => dialog.current?.close()}><Icon name="close" /></button></div><label htmlFor="tool-search">Search by name or task</label><input ref={searchInput} id="tool-search" type="search" placeholder="Try timing, merge, or convert" value={query} onChange={event => setQuery(event.target.value)} /><div className="search-results" aria-live="polite">{results.length ? results.map(tool => <Link href={tool.href} key={tool.href} onClick={() => dialog.current?.close()}><ToolIcon name={tool.icon} compact /><div><strong>{menuNames[tool.href]}</strong><span>{tool.group}</span></div><Icon name="arrow" /></Link>) : <p>No tools found. Try “subtitle” or “timing”.</p>}</div></dialog>
  </>;
}
