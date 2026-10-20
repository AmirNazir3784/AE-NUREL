import Link from "@/components/site/page-link";
import { ToolIcon } from "@/components/ui/icon-tile";
import type { Tool } from "@/lib/tools";
export function ToolCard({ tool }: { tool: Tool }) {
  return <Link href={tool.href} className="aen-tool-card"><ToolIcon name={tool.icon} /><h3>{tool.title}</h3><p>{tool.description}</p><span className="aen-free-tag">FREE</span><span className="aen-card-open" aria-hidden="true">Open tool <span>↗</span></span></Link>;
}
