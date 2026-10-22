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
export function ToolHero({ title, description, ticks = [] }: { title: string; description: string; ticks?: readonly string[] }) {
  const words = title.split(" ");
  const last = words.length > 1 ? words[words.length - 1] : null;
  const head = last ? words.slice(0, -1).join(" ") : title;
  return <header className="aen-tool-hero">
    <span className="aen-hero-chip aen-hero-chip-a" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>Part 1.srt</span><span className="aen-hero-chip aen-hero-chip-b" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>Part 2.srt</span><span className="aen-hero-chip aen-hero-chip-c" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>Merged.srt</span><div className="aen-hero-merge" aria-hidden="true">
      <svg viewBox="0 0 220 64" role="presentation" focusable="false">
        <g className="aen-hero-doc aen-hero-doc-a"><rect x="6" y="8" width="40" height="48" rx="9" /><path d="M14 24h24M14 34h24M14 44h15" /></g>
        <g className="aen-hero-doc aen-hero-doc-b"><rect x="58" y="8" width="40" height="48" rx="9" /><path d="M66 24h24M66 34h24M66 44h15" /></g>
        <path className="aen-hero-arrow" d="M104 32h34m0 0-9-8m9 8-9 8" />
        <g className="aen-hero-doc aen-hero-doc-c"><rect x="146" y="4" width="46" height="56" rx="10" /><path d="M155 21h28M155 32h28M155 43h19" /></g>
      </svg>
    </div>
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
export function RelatedTools({ title, tools = [] }: { title: string; tools?: readonly Tool[] }) { if (!tools.length) return null; return <section className="related-section aen-related" aria-labelledby="related-title"><h2 id="related-title">{title}</h2><div className="v1-related-links">{tools.map((tool) => <Link key={tool.href} href={tool.href}><ToolIcon name={tool.icon} compact /><span className="aen-related-text"><span>{tool.title}</span><small>{tool.description}</small></span><Icon name="arrow" size={16} /></Link>)}</div></section>; }

export function ToolFaq({ href, items }: { href: string; items: readonly FaqItem[] }) { if (!items.length) return null; return <section className="v1-support tool-faq" aria-labelledby="tool-faq-title"><h2 id="tool-faq-title">Frequently asked questions</h2>{items.map((item) => <details className="tool-faq-item" key={item.q}><summary>{item.q}</summary><div className="tool-faq-answer"><p>{item.a}</p></div></details>)}<JsonLd data={faqJsonLd(href, items)} /></section>; }
