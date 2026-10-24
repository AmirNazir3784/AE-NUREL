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
export function ToolHero({ title, description, ticks = [], chipA = "Part 1.srt", chipB = "Part 2.srt", chipC = "Merged.srt", art = "merge", badgeFrom = "SRT", badgeTo = "VTT" }: { title: string; description: string; ticks?: readonly string[]; chipA?: string | null; chipB?: string | null; chipC?: string | null; art?: "merge" | "transform" | "split" | "edit" | "web" | "list" | "plain" | "style" | "shift" | "sync" | "overlap"; badgeFrom?: string; badgeTo?: string }) {
  const words = title.split(" ");
  const last = words.length > 1 ? words[words.length - 1] : null;
  const head = last ? words.slice(0, -1).join(" ") : title;
  return <header className={"aen-tool-hero art-" + art}>
    {chipA && <span className="aen-hero-chip aen-hero-chip-a" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>{chipA}</span>}{chipB && <span className="aen-hero-chip aen-hero-chip-b" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>{chipB}</span>}{chipC && <span className="aen-hero-chip aen-hero-chip-c" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>{chipC}</span>}{art === "split" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <path className="aen-cut-line" d="M12 48h196" />
        <path className="aen-cut-ticks" d="M32 44v8M57 44v8M82 44v8M107 44v8M132 44v8M157 44v8M182 44v8" />
        <rect className="aen-cut-l" x="42" y="27" width="55" height="14" rx="4" />
        <g className="aen-cut-rwrap"><rect className="aen-cut-r" x="99" y="27" width="55" height="14" rx="4" /></g>
        <path className="aen-cut-mark" d="M98 12v29" />
        <path className="aen-cut-chev" d="M93 6l5 5 5-5" />
      </svg>
    </div>
    : art === "edit" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <rect className="aen-type-card" x="52" y="8" width="116" height="48" rx="10" />
        <text className="aen-type-time" x="62" y="21">00:04 → 00:07</text>
        <rect className="aen-type-line" x="62" y="27" width="72" height="5.5" rx="2.75" />
        <rect className="aen-type-old" x="62" y="39" width="34" height="5.5" rx="2.75" />
        <rect className="aen-type-new" x="62" y="39" width="52" height="5.5" rx="2.75" />
        <rect className="aen-type-caret" x="99" y="36.5" width="2.6" height="11" rx="1.3" />
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
    : art === "shift" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <path className="aen-tl-line" d="M10 47h200" />
        <path className="aen-tl-ticks" d="M22 43v8M47 43v8M72 43v8M97 43v8M122 43v8M147 43v8M172 43v8M197 43v8" />
        <g className="aen-shift-blocks"><rect x="28" y="27" width="34" height="13" rx="4" /><rect className="aen-shift-mid" x="72" y="27" width="44" height="13" rx="4" /><rect x="126" y="27" width="30" height="13" rx="4" /></g>
        <text className="aen-shift-label" x="146" y="17">+2.0s</text>
        <circle className="aen-shift-ring" cx="94" cy="31" r="5" />
        <g className="aen-shift-cursor"><path d="M0 0v13l3.5-3 2 4.5 2.2-1-2-4.5H10z" /></g>
      </svg>
    </div>
    : art === "sync" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <path className="aen-tl-line" d="M12 22h196M12 48h196" />
        <path className="aen-sync-guide" d="M34 10v46M160 10v46" />
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
    : <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <g className="aen-hero-doc aen-hero-doc-a"><rect x="6" y="8" width="40" height="48" rx="9" /><path d="M14 24h24M14 34h24M14 44h15" /></g>
        <g className="aen-hero-doc aen-hero-doc-b"><rect x="58" y="8" width="40" height="48" rx="9" /><path d="M66 24h24M66 34h24M66 44h15" /></g>
        <path className="aen-hero-arrow" d="M104 32h34m0 0-9-8m9 8-9 8" />
        <g className="aen-hero-doc aen-hero-doc-c"><rect x="146" y="4" width="46" height="56" rx="10" /><path d="M155 21h28M155 32h28M155 43h19" /></g>
      <circle className="aen-hero-ripple" cx="169" cy="32" r="12" /><circle className="aen-hero-dot" cx="150" cy="32" r="3.5" /></svg>
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
