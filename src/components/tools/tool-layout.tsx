import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { ToolIcon } from "@/components/ui/icon-tile";
import type { ProductIconName } from "@/lib/icons";
import type { Tool } from "@/lib/tools";
export function ToolLayout({ children, title, category, categoryHref }: { children: ReactNode; title: string; category: string; categoryHref: string }) { return <main id="main-content" className="container tool-page aen-tool-page"><nav aria-label="Breadcrumb" className="breadcrumb"><Link href="/tools">All Tools</Link><span>/</span><Link href={categoryHref}>{category}</Link><span>/</span><span aria-current="page">{title}</span></nav>{children}</main>; }
export function ToolHeader({ title, description, toolIcon }: { title: string; description: string; category?: string; categoryIcon?: ComponentProps<typeof Icon>["name"]; toolIcon?: ProductIconName }) { return <header className="tool-header aen-tool-heading">{toolIcon ? <div className="tool-title-line"><ToolIcon name={toolIcon} /><h1>{title}</h1></div> : <h1>{title}</h1>}<p>{description}</p></header>; }
export function ToolWorkspace({ children, label }: { children: ReactNode; label: string }) { return <section className="tool-frame aen-workspace" aria-label={label}>{children}</section>; }
export function RelatedTools({ title, tools = [] }: { title: string; tools?: readonly Tool[] }) { if (!tools.length) return null; return <section className="related-section aen-related" aria-labelledby="related-title"><h2 id="related-title">{title}</h2><div className="v1-related-links">{tools.map((tool) => <Link key={tool.href} href={tool.href}><ToolIcon name={tool.icon} compact /><span>{tool.title}</span><Icon name="arrow" size={16} /></Link>)}</div></section>; }
