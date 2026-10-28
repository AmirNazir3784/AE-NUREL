"use client";
import Link from "@/components/site/page-link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
const pages = [["/account", "Overview", "grid"], ["/account/projects", "Projects", "file"], ["/account/history", "Tool history", "clock"], ["/account/subscription", "Plan & access", "spark"], ["/account/billing", "Billing & purchases", "shield"], ["/account/settings", "Settings", "user"]] as const;
export function AccountNavigation() { const path = usePathname(); return <aside className="cm-account-nav"><Link href="/account" className="cm-workspace-name"><Icon name="user" size={23} />Your workspace</Link><nav aria-label="Account pages">{pages.map(([href, title, icon]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}><Icon name={icon} size={18} />{title}<Icon name="chevron-right" size={14} /></Link>)}</nav><div className="cm-nav-foot"><p>Keep the work.<br /><strong>Bring your own footage.</strong></p><Link href="/pricing">Explore the plans <Icon name="arrow" size={15} /></Link></div></aside>; }
