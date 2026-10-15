import { ToolCard } from "@/components/home/tool-card";
import type { Tool } from "@/lib/tools";
import { toolGroups } from "@/lib/discovery";
export function ToolDirectory({ catalog }: { catalog: readonly Tool[] }) {
  const groups = catalog.some(tool => tool.group === "Caption Generation") ? ["Caption Generation", ...toolGroups] : toolGroups;
  return <div className="v1-directory" id="free-tools">{groups.map((group,i) => { const members = catalog.filter((t) => t.group === group); return members.length ? <section key={group} id={"directory-group-"+i} className="v1-directory-group"><h2>{group}<span>{members.length}</span></h2><div className="v1-tool-grid">{members.map((tool) => <ToolCard key={tool.href} tool={tool} />)}</div></section> : null; })}</div>;
}
