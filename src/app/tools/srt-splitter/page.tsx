import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SrtSplitter } from "@/features/srt-splitter/srt-splitter";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("SRT Splitter — Split SRT by Parts, Count or Time", "Split one SRT file into smaller files by number of parts, subtitles per file, or time interval — keeping or resetting each part's times. Free, no signup.", "/tools/srt-splitter");
export default function ToolPage() { return <ToolLayout title="SRT Splitter" category="Subtitle Tools" categoryHref="/tools/subtitle-tools"><ToolHeader title="SRT Splitter" description="Split one SRT into smaller files by parts, subtitle count, or time." toolIcon="srt-split" /><ToolWorkspace label="SRT Splitter"><SrtSplitter /></ToolWorkspace><section className="v1-support"><h2>About split timing</h2><p>Subtitles stay intact. Time intervals use subtitle start times and skip empty intervals. Reset times starts each part at its first subtitle, or at the interval boundary for time splits. Subtitle files do not describe video cut points.</p></section><RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/srt-splitter"].map((href) => tools.find((t) => t.href === href)!)} /></ToolLayout>; }
