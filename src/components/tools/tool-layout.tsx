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
export function ToolHero({ title, description, ticks = [], chipA = "Part 1.srt", chipB = "Part 2.srt", chipC = "Merged.srt", art = "merge", badgeFrom = "SRT", badgeTo = "VTT" }: { title: string; description: string; ticks?: readonly string[]; chipA?: string | null; chipB?: string | null; chipC?: string | null; art?: "merge" | "transform" | "split" | "edit" | "web" | "list" | "plain" | "style" | "text" | "shift" | "sync" | "overlap" | "video"; badgeFrom?: string; badgeTo?: string }) {
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
    {chipA && <span className="aen-hero-chip aen-hero-chip-a" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>{chipA}</span>}{chipB && <span className="aen-hero-chip aen-hero-chip-b" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>{chipB}</span>}{chipC && <span className="aen-hero-chip aen-hero-chip-c" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>{chipC}</span>}{art === "split" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <path className="aen-cut-line" d="M12 48h196" />
        <path className="aen-cut-ticks" d="M32 44v8M57 44v8M82 44v8M107 44v8M132 44v8M157 44v8M182 44v8" />
        <g className="aen-cut3-p1"><rect x="34" y="27" width="48" height="14" rx="4" /></g>
        <g className="aen-cut3-p2"><rect x="84" y="27" width="48" height="14" rx="4" /></g>
        <g className="aen-cut3-p3"><rect x="134" y="27" width="48" height="14" rx="4" /></g>
        <path className="aen-cut3-mark" d="M83 13v28M133 13v28" />
        <text className="aen-cut3-label" x="58" y="59">Part 1</text>
        <text className="aen-cut3-label" x="108" y="59">Part 2</text>
        <text className="aen-cut3-label" x="158" y="59">Part 3</text>
      </svg>
    </div>
    : art === "edit" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <rect className="aen-fix-card" x="52" y="8" width="116" height="48" rx="10" />
        <g className="aen-fix-time"><text x="62" y="21">00:04 → 00:07</text></g>
        <rect className="aen-fix-line" x="62" y="27" width="34" height="5.5" rx="2.75" />
        <rect className="aen-fix-wrong" x="99" y="27" width="30" height="5.5" rx="2.75" />
        <rect className="aen-fix-under" x="99" y="34.5" width="30" height="2" rx="1" />
        <rect className="aen-fix-new" x="99" y="27" width="38" height="5.5" rx="2.75" />
        <g className="aen-fix-caret-wrap"><rect className="aen-fix-caret" x="66" y="24" width="2.6" height="11" rx="1.3" /></g>
        <g className="aen-fix-undo"><path d="M146 16h6M152 13l3 3-3 3" /><path d="M164 16h-6M158 13l-3 3 3 3" /></g>
      </svg>
    </div>
    : art === "web" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <rect className="aen-web-frame" x="45" y="6" width="130" height="52" rx="9" />
        <path className="aen-web-bar" d="M45 19h130" />
        <circle className="aen-web-dot" cx="55" cy="12.5" r="2.2" /><circle className="aen-web-dot" cx="64" cy="12.5" r="2.2" /><circle className="aen-web-dot" cx="73" cy="12.5" r="2.2" />
        <rect className="aen-web-url" x="83" y="9" width="56" height="7" rx="3.5" />
        <text className="aen-web-head" x="54" y="31">WEBVTT</text>
        <text className="aen-web-t1" x="166" y="31">00:01,000</text>
        <text className="aen-web-t2" x="166" y="31">00:01.000</text>
        <path className="aen-web-play" d="M104 34l13 7-13 7z" />
        <rect className="aen-web-band" x="53" y="45" width="114" height="9" rx="4.5" />
        <rect className="aen-web-cap" x="86" y="47.5" width="48" height="4.5" rx="2.25" />
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
    : art === "sync" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <path className="aen-tl-line" d="M12 22h196M12 48h196" />
        <path className="aen-sync-guide" d="M34 10v46M160 10v46" />
        <g className="aen-sync-pin"><circle cx="34" cy="8" r="3.5" /><circle cx="160" cy="8" r="3.5" /></g>
        <g className="aen-sync-top"><rect x="34" y="16" width="30" height="11" rx="3.5" /><rect x="78" y="16" width="40" height="11" rx="3.5" /><rect x="132" y="16" width="28" height="11" rx="3.5" /></g>
        <g className="aen-sync-low"><rect className="aen-sync-b1" x="34" y="42" width="30" height="11" rx="3.5" /><rect className="aen-sync-b2" x="78" y="42" width="40" height="11" rx="3.5" /><rect className="aen-sync-b3" x="132" y="42" width="28" height="11" rx="3.5" /></g>
        <path className="aen-sync-check" d="M186 30l5 5 9-10" />
      </svg>
    </div>
    : art === "overlap" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <path className="aen-ovl-line" d="M12 48h196" />
        <path className="aen-ovl-ticks" d="M32 44v8M57 44v8M82 44v8M107 44v8M132 44v8M157 44v8M182 44v8" />
        <rect className="aen-ovl-gap" x="101" y="27" width="12" height="14" rx="3" />
        <rect className="aen-ovl-a" x="46" y="27" width="54" height="14" rx="4" />
        <g className="aen-ovl-bwrap"><rect className="aen-ovl-b" x="84" y="27" width="54" height="14" rx="4" /></g>
        <rect className="aen-ovl-zone" x="84" y="27" width="16" height="14" rx="3" />
        <path className="aen-ovl-posts" d="M101 22v5M113 22v5" />
        <g className="aen-ovl-fixed"><circle cx="200" cy="13" r="7" /><path d="M196.5 13l2.5 2.5 4.5-5" /></g>
      </svg>
    </div>
    : art === "list" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <g className="aen-list-web">
          <rect className="aen-list-frame" x="12" y="13" width="58" height="38" rx="7" />
          <path className="aen-list-bar" d="M12 23h58" />
          <circle className="aen-list-dot" cx="19" cy="18" r="1.7" /><circle className="aen-list-dot" cx="26" cy="18" r="1.7" />
          <rect className="aen-list-extra" x="20" y="29" width="26" height="4.5" rx="2.25" />
          <rect className="aen-list-extra" x="20" y="38" width="18" height="4.5" rx="2.25" />
        </g>
        <g className="aen-list-row aen-list-r1"><text className="aen-list-num" x="94" y="21">1</text><rect className="aen-list-line" x="106" y="14" width="66" height="5.5" rx="2.75" /><text className="aen-list-time" x="106" y="30">00:01,000</text></g>
        <g className="aen-list-row aen-list-r2"><text className="aen-list-num" x="94" y="42">2</text><rect className="aen-list-line" x="106" y="35" width="52" height="5.5" rx="2.75" /></g>
        <g className="aen-list-row aen-list-r3"><text className="aen-list-num" x="94" y="58">3</text><rect className="aen-list-line" x="106" y="51" width="60" height="5.5" rx="2.75" /></g>
      </svg>
    </div>
    : art === "plain" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <g className="aen-plain-deco">
          <circle cx="80" cy="14" r="2.6" /><circle cx="94" cy="14" r="2.6" /><circle cx="108" cy="14" r="2.6" />
          <text x="56" y="33">{</text><text x="158" y="33">}</text><text x="64" y="49">{</text><text x="150" y="49">}</text>
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
        <rect className="aen-tx-frame" x="18" y="18" width="170" height="76" rx="8" />
        <g className="aen-tx-c1"><text className="aen-tx-num" x="28" y="30">1</text><text className="aen-tx-time" x="46" y="30">00:01,000</text></g>
        <g className="aen-tx-c2"><text className="aen-tx-num" x="28" y="65">2</text><text className="aen-tx-time" x="46" y="65">00:04,000</text></g>
        <g className="aen-tx-c3"><text className="aen-tx-num" x="28" y="100">3</text><text className="aen-tx-time" x="46" y="100">00:08,000</text></g>
        <rect className="aen-tx-b1" x="46" y="38" width="130" height="6" rx="3" />
        <rect className="aen-tx-b2" x="46" y="73" width="100" height="6" rx="3" />
        <rect className="aen-tx-b3" x="46" y="108" width="115" height="6" rx="3" />
        <rect className="aen-tx-scan" x="20" y="0" width="280" height="1.5" rx="0.75" />
      </svg>
    </div>
    : art === "video" ? <div key={playKey} className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 320 140" role="presentation" focusable="false">
        <g className="aen-vd-doc"><rect x="20" y="18" width="88" height="104" rx="8" /><rect x="32" y="36" width="64" height="6" rx="3" /><rect x="32" y="56" width="64" height="6" rx="3" /><rect x="32" y="76" width="64" height="6" rx="3" /></g>
        <rect className="aen-vd-canvas" x="132" y="18" width="168" height="88" rx="8" />
        <rect className="aen-vd-track" x="144" y="98" width="144" height="4" rx="2" />
        <rect className="aen-vd-fill" x="144" y="98" width="144" height="4" rx="2" />
        <rect className="aen-vd-cap1" x="172" y="88" width="88" height="7" rx="3.5" />
        <rect className="aen-vd-cap2" x="172" y="88" width="88" height="7" rx="3.5" />
        <g className="aen-vd-strip"><rect x="132" y="118" width="26" height="14" rx="3" /><rect x="166" y="118" width="26" height="14" rx="3" /><rect x="200" y="118" width="26" height="14" rx="3" /></g>
        <path className="aen-vd-play" d="M222 40l22 13-22 13z" />
        <g className="aen-vd-chip"><rect x="252" y="24" width="40" height="16" rx="8" /><text x="272" y="35">MP4</text></g>
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
