"use client";
import Link from "next/link";
import { useState } from "react";
import { ToolCard } from "@/components/home/tool-card";
import { searchTools, tools } from "@/lib/tools";
import { toolGroups } from "@/lib/discovery";
export function ToolDirectory() {
  const [query, setQuery] = useState("");
  const results = searchTools(query);
  return <div className="v1-directory"><div className="v1-directory-search"><label htmlFor="directory-search">Search by name or task</label><input id="directory-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try timing, merge, or convert" autoComplete="off" /><span role="status">{results.length} of {tools.length} tools · 1 category</span></div><nav className="v1-group-links" aria-label="Tool groups"><Link href="/tools/subtitle-tools">Subtitle Tools</Link>{toolGroups.map((group,i) => <a key={group} href={"#directory-group-"+i}>{group}</a>)}</nav>{results.length ? toolGroups.map((group,i) => { const members = results.filter((t) => t.group === group); return members.length ? <section key={group} id={"directory-group-"+i} className="v1-directory-group"><h2>{group}<span>{members.length}</span></h2><div className="v1-tool-grid">{members.map((tool) => <ToolCard key={tool.href} tool={tool} />)}</div></section> : null; }) : <div className="v1-zero"><h2>No tools found</h2><p>Try “subtitle”, “timing”, or “convert”.</p><button className="button button-secondary" onClick={() => setQuery("")} type="button">Clear search</button></div>}</div>;
}
