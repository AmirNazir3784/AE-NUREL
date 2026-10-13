import Link from "next/link";
import { ToolCard } from "@/components/home/tool-card";
import type { Tool } from "@/lib/tools";
import { toolGroups } from "@/lib/discovery";
export function ToolDirectory({ catalog }: { catalog: readonly Tool[] }) {
  const groups = catalog.some(tool => tool.group === "Caption Generation") ? ["Caption Generation", ...toolGroups] : toolGroups;
  return <div className="v1-directory"><nav className="v1-group-links" aria-label="Tool groups"><Link href="/tools/subtitle-tools">Subtitle Tools</Link>{groups.map((group,i) => <a key={group} href={"#directory-group-"+i}>{group}</a>)}</nav>{groups.map((group,i) => { const members = catalog.filter((t) => t.group === group); return members.length ? <section key={group} id={"directory-group-"+i} className="v1-directory-group"><h2>{group}<span>{members.length}</span></h2><div className="v1-tool-grid">{members.map((tool) => <ToolCard key={tool.href} tool={tool} />)}</div></section> : null; })}</div>;
}
