"use client";
import Link from "@/components/site/page-link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { Icon } from "@/components/ui/icon";
import { ToolIcon } from "@/components/ui/icon-tile";
import { tools, searchTools } from "@/lib/tools";
import { menuNames, toolGroups } from "@/lib/discovery";
import { products } from "@/lib/products";
import { NavigationMenu } from "./navigation-menu";
import { AuthPreviewModal } from "./auth-preview-modal";
export function Header() {
  const pathname = usePathname();
  const mobile = useRef<HTMLDetailsElement>(null);
  const dialog = useRef<HTMLDialogElement>(null), searchInput = useRef<HTMLInputElement>(null), searchTrigger = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const results = searchTools(query);
  const [authOpen, setAuthOpen] = useState(false);
  const authOrigin = useRef<HTMLElement | null>(null);
  function openAuth(event: React.MouseEvent<HTMLButtonElement>) { authOrigin.current = event.currentTarget; closeMenus(); setAuthOpen(true); }
  function closeMenus() { document.querySelectorAll<HTMLDetailsElement>("details[data-site-menu]").forEach(element => { element.open = false; }); }
  useEffect(() => {
    function outside(event: PointerEvent) { document.querySelectorAll<HTMLDetailsElement>("details[data-site-menu]").forEach(element => { if (element.open && event.target instanceof Node && !element.contains(event.target)) element.open = false; }); }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  function escape(event: React.KeyboardEvent<HTMLDetailsElement>) { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }
  function openSearch() { closeMenus(); setQuery(""); dialog.current?.showModal(); searchInput.current?.focus(); }
  return <>
    <div className="aen-topbar"><b>Source Window</b> — the flagship product from AENural. <Link href="/source-window">Explore →</Link></div>
    <header className="aen-nav"><div className="aen-wrap aen-nav-inner">
      <Link href="/" className="aen-brand" aria-label="AENural home" onClick={closeMenus}><Brand /></Link>
      <nav className="aen-nav-links" aria-label="Main navigation">
        <NavigationMenu label="Tools" className="aen-product-menu"><section><h2>AENural products</h2>{products.map(product => <Link href={product.href} key={product.href} className="aen-mega-product" onClick={closeMenus}><span className="aen-menu-icon"><Icon name="video" size={17} /></span><span><b>{product.title}</b><small>{product.description}</small></span></Link>)}</section><div className="aen-mega-footer"><Link href="/premium-tools" onClick={closeMenus}>See all tools →</Link></div></NavigationMenu>
        <NavigationMenu label="Free Tools" className="aen-free-menu"><div className="aen-menu-intro"><strong>Free tools</strong><span>{tools.length} browser utilities</span></div><div className="aen-mega-grid">{toolGroups.map(group => <section key={group}><h2>{group}</h2>{tools.filter(tool => tool.group === group).map(tool => <Link href={tool.href} key={tool.href} onClick={closeMenus}><ToolIcon name={tool.icon} compact /><b>{tool.title}</b></Link>)}</section>)}</div><div className="aen-mega-footer"><Link href="/tools" onClick={closeMenus}>See all free tools →</Link></div></NavigationMenu>
        <Link href="/about" onClick={closeMenus} aria-current={pathname === "/about" ? "page" : undefined}>About</Link><Link href="/help" onClick={closeMenus} aria-current={pathname === "/help" ? "page" : undefined}>Help</Link>
      </nav>
      <div className="aen-nav-right"><button className="aen-utility-button" type="button" ref={searchTrigger} aria-label="Search tools" onClick={openSearch}><Icon name="search" size={19} /></button>{process.env.NODE_ENV === "development" && <button className="aen-sign-in aen-sign-in-desktop" type="button" aria-haspopup="dialog" onClick={openAuth}>Sign in</button>}<details className="aen-mobile-menu" data-site-menu ref={mobile} onKeyDown={escape}><summary aria-label="Navigation menu"><Icon name="menu" size={22} /></summary><nav aria-label="Mobile navigation">{process.env.NODE_ENV === "development" && <button className="aen-sign-in aen-sign-in-mobile" type="button" aria-haspopup="dialog" onClick={openAuth}>Sign in</button>}<section className="aen-mobile-products"><h2>Tools</h2>{products.map(product => <Link key={product.href} href={product.href} onClick={closeMenus}>{product.title}</Link>)}<Link href="/premium-tools" onClick={closeMenus}>See all tools →</Link></section><details className="aen-mobile-free"><summary>Free Tools</summary>{toolGroups.map(group => <section key={group}><h2>{group}</h2>{tools.filter(tool => tool.group === group).map(tool => <Link href={tool.href} key={tool.href} onClick={closeMenus}><ToolIcon name={tool.icon} compact />{menuNames[tool.href] ?? tool.title}</Link>)}</section>)}<Link href="/tools" onClick={closeMenus}>See all free tools →</Link></details><Link href="/about" onClick={closeMenus}>About AENural</Link><Link href="/help" onClick={closeMenus}>Help</Link></nav></details></div>
    </div></header>
    <dialog ref={dialog} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); dialog.current?.close(); } }} className="search-dialog" aria-labelledby="search-title" onClose={() => searchTrigger.current?.focus()} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><div className="search-dialog-head"><h2 id="search-title">Find a free tool</h2><button className="icon-button" type="button" aria-label="Close search" onClick={() => dialog.current?.close()}><Icon name="close" /></button></div><label htmlFor="tool-search">Search by name or task</label><input ref={searchInput} id="tool-search" type="search" placeholder="Try timing, merge, or convert" value={query} onChange={event => setQuery(event.target.value)} /><div className="search-results" aria-live="polite">{results.length ? results.map(tool => <Link href={tool.href} key={tool.href} onClick={() => dialog.current?.close()}><ToolIcon name={tool.icon} compact /><div><strong>{menuNames[tool.href]}</strong><span>{tool.group}</span></div><Icon name="arrow" /></Link>) : <p>No tools found. Try “subtitle” or “timing”.</p>}</div></dialog>
    {process.env.NODE_ENV === "development" && authOpen && <AuthPreviewModal returnFocus={authOrigin.current} onDismiss={() => setAuthOpen(false)} />}
  </>;
}
