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
export function ToolHero({ title, description, ticks = [], chipA = "Part 1.srt", chipB = "Part 2.srt", chipC = "Merged.srt", art = "merge", badgeFrom = "SRT", badgeTo = "VTT" }: { title: string; description: string; ticks?: readonly string[]; chipA?: string | null; chipB?: string | null; chipC?: string | null; art?: "merge" | "transform" | "split" | "edit" | "convert" | "shift" | "sync" | "overlap"; badgeFrom?: string; badgeTo?: string }) {
  const words = title.split(" ");
  const last = words.length > 1 ? words[words.length - 1] : null;
  const head = last ? words.slice(0, -1).join(" ") : title;
  return <header className={"aen-tool-hero art-" + art}>
    {chipA && <span className="aen-hero-chip aen-hero-chip-a" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>{chipA}</span>}{chipB && <span className="aen-hero-chip aen-hero-chip-b" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>{chipB}</span>}{chipC && <span className="aen-hero-chip aen-hero-chip-c" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>{chipC}</span>}{art === "split" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <g className="aen-hero-doc aen-split-src"><rect x="38" y="9" width="40" height="46" rx="9" /><path d="M46 25h24M46 35h24M46 45h15" /><path className="aen-split-cut" d="M58 13v38" /></g>
        <path className="aen-hero-arrow" d="M84 32h26m0 0-8-7m8 7-8 7" />
        <g className="aen-hero-doc aen-split-p1"><rect x="118" y="6" width="36" height="24" rx="7" /><path d="M125 15h22M125 22h14" /></g>
        <g className="aen-hero-doc aen-split-p2"><rect x="118" y="34" width="36" height="24" rx="7" /><path d="M125 43h22M125 50h14" /></g>
      </svg>
    </div>
    : art === "edit" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <g className="aen-hero-doc aen-edit-doc"><rect x="84" y="8" width="52" height="48" rx="9" /><path d="M92 22h36M92 42h24" /><path d="M92 32h13" /><path className="aen-edit-new" d="M107 32h21" /></g>
        <g className="aen-edit-pencil"><path d="M1 11 9 3l3 3-8 8-4 1z" /><path d="M8 4l3 3" /></g>
      </svg>
    </div>
    : art === "convert" ? <div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <g className="aen-hero-doc aen-convert-doc"><rect x="85" y="10" width="50" height="46" rx="9" /><path d="M93 28h34M93 38h34M93 48h20" /></g>
        <circle className="aen-badge-pulse" cx="135" cy="10" r="10" />
        <g className="aen-badge aen-badge-from"><rect x="118" y="2" width="34" height="16" rx="8" /><text x="135" y="13.5" textAnchor="middle">{badgeFrom}</text></g>
        <g className="aen-badge aen-badge-to"><rect x="118" y="2" width="34" height="16" rx="8" /><text x="135" y="13.5" textAnchor="middle">{badgeTo}</text></g>
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
