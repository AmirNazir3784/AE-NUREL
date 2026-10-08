import Link from "next/link";
import { TaskLinks } from "@/components/tools/task-links";
import { ToolCard } from "@/components/home/tool-card";
import { tools } from "@/lib/tools";
import { toolGroups } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("Free Subtitle Tools", "Choose the right tool to edit SRT and VTT subtitles, correct timing, merge, split, or convert files.", "/tools/subtitle-tools");
export default function SubtitleToolsPage() { return <main id="main-content" className="container v1-directory-page"><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/tools">All Tools</Link><span>/</span><span aria-current="page">Subtitle Tools</span></nav><header className="v1-page-intro"><h1>Subtitle Tools</h1><p>Edit, fix, and convert subtitles in your browser. Free, with no signup.</p></header><section className="v1-task-section"><h2>What do you need to do?</h2><TaskLinks /></section>{toolGroups.map((group) => <section className="v1-directory-group" key={group}><h2>{group}</h2><div className="v1-tool-grid">{tools.filter((t) => t.group === group).map((tool) => <ToolCard key={tool.href} tool={tool} />)}</div></section>)}<section className="v1-support"><h2>Which formats work?</h2><p>The editor, sync fixer, and overlap fixer support SRT and VTT. Timing adjustment, merging, and splitting use SRT. The converter creates VTT from SRT.</p><Link className="inline-link" href="/tools">View all tools</Link></section></main>; }
