"use client";
import { useEffect, useRef, useState } from "react";
import Link from "@/components/site/page-link";
import type { ComponentProps, ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { ToolIcon } from "@/components/ui/icon-tile";
import type { ProductIconName } from "@/lib/icons";
import { tools, type Tool } from "@/lib/tools";
import { JsonLd } from "@/components/site/json-ld";
import { faqJsonLd, toolJsonLd, type FaqItem } from "@/lib/structured-data";
export function ToolLayout({ children, title, category, categoryHref }: { children: ReactNode; title: string; category: string; categoryHref: string }) { const tool = tools.find((t) => t.title === title); return <main id="main-content" className="container tool-page aen-tool-page">{tool ? <JsonLd data={toolJsonLd(tool)} /> : null}<nav aria-label="Breadcrumb" className="breadcrumb"><Link href="/tools">All Tools</Link><span>/</span><Link href={categoryHref}>{category}</Link><span>/</span><span aria-current="page">{title}</span></nav>{children}</main>; }
export function ToolHeader({ title, description, toolIcon }: { title: string; description: string; category?: string; categoryIcon?: ComponentProps<typeof Icon>["name"]; toolIcon?: ProductIconName }) {
  const icon = toolIcon ?? tools.find(tool => tool.title === title)?.icon;
  return <header className="tool-header aen-tool-heading">{icon ? <div className="tool-title-line"><ToolIcon name={icon} /><h1>{title}</h1></div> : <h1>{title}</h1>}<p>{description}</p></header>;
}
export function ToolHero({ title, description, ticks = [], chipA = "Part 1.srt", chipB = "Part 2.srt", chipC = "Merged.srt", art = "merge", badgeFrom = "SRT", badgeTo = "VTT" }: { title: string; description: string; ticks?: readonly string[]; chipA?: string | null; chipB?: string | null; chipC?: string | null; art?: "merge" | "transform" | "split" | "edit" | "web" | "list" | "plain" | "style" | "text" | "shift" | "sync" | "overlap"; badgeFrom?: string; badgeTo?: string }) {
  const heroRef = useRef<HTMLElement | null>(null);
  const [entered, setEntered] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [rev, setRev] = useState(false);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setEntered(true); return; }
    const ob = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setEntered(true); ob.disconnect(); }
    }, { threshold: 0.2 });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  const replay = () => { if (art === "shift") { setRev(true); } else { setPlayKey((k) => k + 1); } };
  const unreplay = () => { if (art === "shift") setRev(false); };
  const words = title.split(" ");
  const last = words.length > 1 ? words[words.length - 1] : null;
  const head = last ? words.slice(0, -1).join(" ") : title;
  return <header ref={heroRef} className={"aen-tool-hero art-" + art + (entered ? " aen-hero-entered" : "") + (rev ? " aen-shift-rev" : "")} onMouseEnter={replay} onMouseLeave={unreplay} onFocus={replay} onBlur={unreplay}>
    {chipA && <span className="aen-hero-chip aen-hero-chip-a" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>{chipA}</span>}{chipB && <span className="aen-hero-chip aen-hero-chip-b" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>{chipB}</span>}{chipC && <span className="aen-hero-chip aen-hero-chip-c" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>{chipC}</span>}{art === "split" ? <div key={playKey} className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 320 140" role="presentation" focusable="false">
        <g className="aen-sp-p1"><rect x="110" y="12" width="100" height="34" rx="7" /><rect x="122" y="22" width="76" height="5" rx="2.5" /><rect x="122" y="32" width="60" height="5" rx="2.5" /></g>
        <g className="aen-sp-p2"><rect x="110" y="52" width="100" height="34" rx="7" /><rect x="122" y="62" width="76" height="5" rx="2.5" /><rect x="122" y="72" width="60" height="5" rx="2.5" /></g>
        <g className="aen-sp-p3"><rect x="110" y="92" width="100" height="34" rx="7" /><rect x="122" y="102" width="76" height="5" rx="2.5" /><rect x="122" y="112" width="60" height="5" rx="2.5" /></g>
        <path className="aen-sp-cut" d="M104 46h112M104 80h112" />
        <text className="aen-sp-label" x="232" y="30">Part 1</text>
        <text className="aen-sp-label" x="232" y="74">Part 2</text>
        <text className="aen-sp-label" x="232" y="118">Part 3</text>
      </svg>
    </div>
    : art === "edit" ? <div key={playKey} className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 320 140" role="presentation" focusable="false">
        <rect className="aen-ed-card" x="60" y="12" width="200" height="56" rx="10" />
        <text className="aen-ed-time-old" x="72" y="30">00:04 → 00:07</text>
        <text className="aen-ed-time-new" x="72" y="30">00:04 → 00:09</text>
        <text className="aen-ed-t1" x="72" y="52">I lov</text>
        <text className="aen-ed-te" x="107" y="52">e</text>
        <text className="aen-ed-t2" x="117" y="52">this video</text>
        <rect className="aen-ed-under" x="84" y="58" width="22" height="2" rx="1" />
        <g className="aen-ed-caret-wrap"><rect className="aen-ed-caret" x="106" y="40" width="2.5" height="16" rx="1.25" /></g>
        <line className="aen-ed-ruler" x1="60" y1="104" x2="260" y2="104" />
        <path className="aen-ed-ticks" d="M60 100v8M100 100v8M140 100v8M180 100v8M220 100v8M260 100v8" />
        <rect className="aen-ed-cue" x="80" y="92" width="90" height="14" rx="4" />
        <rect className="aen-ed-handle" x="168" y="90" width="6" height="18" rx="3" />
      </svg>
    </div>
    : art === "web" ? <div key={playKey} className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 320 140" role="presentation" focusable="false">
        <text className="aen-vt-header" x="160" y="22">WEBVTT</text>
        <rect className="aen-vt-card" x="70" y="30" width="180" height="80" rx="10" />
        <text className="aen-vt-num" x="82" y="52">1</text>
        <text className="aen-vt-ts" x="82" y="76">00:01</text>
        <text className="aen-vt-c1" x="115" y="76">,</text>
        <text className="aen-vt-d1" x="116" y="76">.</text>
        <text className="aen-vt-ts" x="121" y="76">500</text>
        <text className="aen-vt-ts" x="141" y="76">--&gt;</text>
        <text className="aen-vt-ts" x="174" y="76">00:04</text>
        <text className="aen-vt-c2" x="207" y="76">,</text>
        <text className="aen-vt-d2" x="208" y="76">.</text>
        <text className="aen-vt-ts" x="213" y="76">200</text>
        <text className="aen-vt-line" x="82" y="98">Hello, welcome!</text>
        <circle className="aen-vt-p1" cx="117" cy="72" r="6" />
        <circle className="aen-vt-p2" cx="209" cy="72" r="6" />
      </svg>
    </div>
    : art === "shift" ? <div key={playKey} className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 320 140" role="presentation" focusable="false">
        <line className="aen-sh-ruler" x1="20" y1="108" x2="300" y2="108" />
        <path className="aen-sh-ticks" d="M20 104v8M40 104v8M60 104v8M80 104v8M100 104v8M120 104v8M140 104v8M160 104v8M180 104v8M200 104v8M220 104v8M240 104v8M260 104v8M280 104v8M300 104v8" />
        <g className="aen-sh-ghost"><rect x="40" y="55" width="60" height="18" rx="5" /><rect x="120" y="55" width="60" height="18" rx="5" /><rect x="200" y="55" width="60" height="18" rx="5" /></g>
        <g className="aen-sh-blocks"><rect x="40" y="55" width="60" height="18" rx="5" /><rect x="120" y="55" width="60" height="18" rx="5" /><rect x="200" y="55" width="60" height="18" rx="5" /></g>
        <g className="aen-sh-chip"><rect x="130" y="12" width="60" height="20" rx="10" /><text className="aen-sh-plus" x="160" y="26">+2.0s</text><text className="aen-sh-minus" x="160" y="26">−2.0s</text></g>
        <text className="aen-sh-old" x="70" y="92">00:01</text><text className="aen-sh-old" x="150" y="92">00:05</text><text className="aen-sh-old" x="230" y="92">00:09</text>
        <text className="aen-sh-new" x="110" y="92">00:03</text><text className="aen-sh-new" x="190" y="92">00:07</text><text className="aen-sh-new" x="270" y="92">00:11</text>
      </svg>
    </div>
    : art === "sync" ? <div key={playKey} className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 320 140" role="presentation" focusable="false">
        <line className="aen-sy-ruler" x1="30" y1="40" x2="290" y2="40" />
        <line className="aen-sy-ruler" x1="30" y1="92" x2="290" y2="92" />
        <path className="aen-sy-guide" d="M50 24v76M230 24v76" />
        <g className="aen-sy-top"><rect x="50" y="32" width="12" height="16" rx="3" /><rect x="110" y="32" width="12" height="16" rx="3" /><rect x="170" y="32" width="12" height="16" rx="3" /><rect x="230" y="32" width="12" height="16" rx="3" /></g>
        <g className="aen-sy-pin"><circle cx="50" cy="18" r="5" /><path d="M50 23v9" /><circle cx="230" cy="18" r="5" /><path d="M230 23v9" /></g>
        <rect className="aen-sy-b1" x="50" y="84" width="12" height="16" rx="3" />
        <rect className="aen-sy-b2" x="110" y="84" width="12" height="16" rx="3" />
        <rect className="aen-sy-b3" x="170" y="84" width="12" height="16" rx="3" />
        <rect className="aen-sy-b4" x="230" y="84" width="12" height="16" rx="3" />
        <g className="aen-sy-check"><circle cx="296" cy="64" r="8" /><path d="M292.5 64l2.5 2.5 5-5" /></g>
      </svg>
    </div>
    : art === "overlap" ? <div key={playKey} className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 320 140" role="presentation" focusable="false">
        <defs><pattern id="aen-ov-cross" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--action)" strokeWidth="2" /></pattern></defs>
        <rect className="aen-ov-a" x="70" y="52" width="100" height="22" rx="5" />
        <g className="aen-ov-b"><rect x="140" y="52" width="100" height="22" rx="5" /></g>
        <g className="aen-ov-zone"><rect x="140" y="52" width="30" height="22" fill="var(--action)" opacity=".25" /><rect x="140" y="52" width="30" height="22" fill="url(#aen-ov-cross)" /></g>
        <rect className="aen-ov-gap" x="170" y="52" width="8" height="22" rx="2" />
        <line className="aen-ov-ruler" x1="30" y1="92" x2="290" y2="92" />
        <path className="aen-ov-ticks" d="M30 88v8M70 88v8M110 88v8M150 88v8M190 88v8M230 88v8M270 88v8" />
        <g className="aen-ov-check"><circle cx="278" cy="30" r="8" /><path d="M274.5 30l2.5 2.5 5-5" /></g>
      </svg>
    </div>
    : art === "list" ? <div key={playKey} className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 320 140" role="presentation" focusable="false">
        <text className="aen-ls-header" x="160" y="18">WEBVTT</text>
        <rect className="aen-ls-card" x="70" y="26" width="180" height="88" rx="10" />
        <g className="aen-ls-t1"><rect x="82" y="36" width="16" height="16" rx="4" /><text x="90" y="48">1</text></g>
        <text className="aen-ls-ts" x="106" y="48">00:01</text>
        <text className="aen-ls-d1" x="136" y="48">.</text>
        <text className="aen-ls-c1" x="135" y="48">,</text>
        <text className="aen-ls-ts" x="141" y="48">000</text>
        <text className="aen-ls-line" x="106" y="64">Hello, welcome!</text>
        <g className="aen-ls-t2"><rect x="82" y="72" width="16" height="16" rx="4" /><text x="90" y="84">2</text></g>
        <text className="aen-ls-ts" x="106" y="84">00:05</text>
        <text className="aen-ls-d2" x="136" y="84">.</text>
        <text className="aen-ls-c2" x="135" y="84">,</text>
        <text className="aen-ls-ts" x="141" y="84">000</text>
        <text className="aen-ls-line" x="106" y="100">Thanks for watching.</text>
      </svg>
    </div>
    : art === "plain" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <g className="aen-plain-deco">
          <circle cx="80" cy="14" r="2.6" /><circle cx="94" cy="14" r="2.6" /><circle cx="108" cy="14" r="2.6" />
          <text x="56" y="33">{"{"}</text><text x="158" y="33">{"}"}</text><text x="64" y="49">{"{"}</text><text x="150" y="49">{"}"}</text>
        </g>
        <rect className="aen-plain-line" x="70" y="26" width="80" height="6" rx="3" />
        <rect className="aen-plain-line" x="78" y="42" width="64" height="6" rx="3" />
      </svg>
    </div>
    : art === "style" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <rect className="aen-style-frame" x="45" y="9" width="130" height="46" rx="8" />
        <path className="aen-style-play" d="M104 20l12 7-12 7z" />
        <g className="aen-style-chip"><rect x="128" y="13" width="41" height="13" rx="6.5" /><text x="148.5" y="22">Arial 48</text></g>
        <rect className="aen-style-band" x="76" y="40" width="68" height="11" rx="5.5" />
        <rect className="aen-style-line" x="86" y="22" width="48" height="5.5" rx="2.75" />
      </svg>
    </div>
    : art === "text" ? <div key={playKey} className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 320 140" role="presentation" focusable="false">
        <rect className="aen-tx-frame" x="70" y="16" width="180" height="108" rx="10" />
        <g className="aen-tx-r1"><text x="82" y="44">1</text><text className="aen-tx-time" x="98" y="44">00:01,000</text></g>
        <text className="aen-tx-d1" x="154" y="44">Hello, welcome!</text>
        <g className="aen-tx-r2"><text x="82" y="72">2</text><text className="aen-tx-time" x="98" y="72">00:05,000</text></g>
        <text className="aen-tx-d2" x="154" y="72">Thanks, everyone!</text>
        <g className="aen-tx-r3"><text x="82" y="100">3</text><text className="aen-tx-time" x="98" y="100">00:09,000</text></g>
        <text className="aen-tx-d3" x="154" y="100">See you soon!</text>
        <line className="aen-tx-scan" x1="70" y1="20" x2="250" y2="20" />
      </svg>
    </div>
    : <div key={playKey} className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 320 140" role="presentation" focusable="false">
        <line className="aen-mg-beam" x1="160" y1="18" x2="160" y2="122" />
        <g className="aen-mg-s1"><rect x="20" y="35" width="70" height="70" rx="8" /><rect x="30" y="47" width="50" height="6" rx="3" /><rect x="30" y="60" width="50" height="6" rx="3" /><rect x="30" y="73" width="36" height="6" rx="3" /></g>
        <g className="aen-mg-s2"><rect x="125" y="35" width="70" height="70" rx="8" /><rect x="135" y="47" width="50" height="6" rx="3" /><rect x="135" y="60" width="50" height="6" rx="3" /><rect x="135" y="73" width="36" height="6" rx="3" /></g>
        <g className="aen-mg-s3"><rect x="230" y="35" width="70" height="70" rx="8" /><rect x="240" y="47" width="50" height="6" rx="3" /><rect x="240" y="60" width="50" height="6" rx="3" /><rect x="240" y="73" width="36" height="6" rx="3" /></g>
        <g className="aen-mg-doc"><rect x="110" y="20" width="100" height="100" rx="8" /><rect x="126" y="32" width="68" height="6" rx="3" /><rect x="126" y="45" width="68" height="6" rx="3" /><rect x="126" y="58" width="68" height="6" rx="3" /><rect x="126" y="71" width="68" height="6" rx="3" /><rect x="126" y="84" width="68" height="6" rx="3" /><rect x="126" y="97" width="50" height="6" rx="3" /><text x="116" y="38">1</text><text x="116" y="51">2</text><text x="116" y="64">3</text><text x="116" y="77">4</text><text x="116" y="90">5</text><text x="116" y="103">6</text></g>
      </svg>
    </div>}
    <h1>{head}{last ? <> <span className="aen-hero-accent">{last}</span></> : null}</h1>
    <p>{description}</p>
    {ticks.length ? <ul className="aen-hero-ticks">{ticks.map((tick) => <li key={tick}><span className="aen-tick"><Icon name="check" size={11} /></span>{tick}</li>)}</ul> : null}
  </header>;
}
export function ToolBenefits({ items }: { items: readonly { icon: ReactNode; title: string; text: string }[] }) {
  if (!items.length) return null;
  return <section className="aen-tool-benefits" aria-label="Benefits"><div className="aen-benefits-grid">{items.map((item) => <article className="aen-benefit" key={item.title}><span className="aen-benefit-icon">{item.icon}</span><h2>{item.title}</h2><p>{item.text}</p></article>)}</div></section>;
}
export function ToolWorkspace({ children, label }: { children: ReactNode; label: string }) { return <section className="tool-frame aen-workspace" aria-label={label}>{children}</section>; }
export function RelatedTools({ title, tools = [] }: { title: string; tools?: readonly Tool[] }) { if (!tools.length) return null; return <section className="related-section aen-related" aria-labelledby="related-title"><div className="aen-related-head"><h2 id="related-title">{title}</h2><Link href="/tools">View all tools<Icon name="arrow" size={15} /></Link></div><div className="v1-related-links">{tools.map((tool) => <Link key={tool.href} href={tool.href}><ToolIcon name={tool.icon} compact /><span className="aen-related-text"><span>{tool.title}</span><small>{tool.description}</small></span><Icon name="arrow" size={16} /></Link>)}</div></section>; }

export function ToolFaq({ href, items }: { href: string; items: readonly FaqItem[] }) { if (!items.length) return null; return <section className="v1-support tool-faq" aria-labelledby="tool-faq-title"><h2 id="tool-faq-title">Frequently asked questions</h2>{items.map((item) => <details className="tool-faq-item" key={item.q}><summary>{item.q}</summary><div className="tool-faq-answer"><p>{item.a}</p></div></details>)}<JsonLd data={faqJsonLd(href, items)} /></section>; }
