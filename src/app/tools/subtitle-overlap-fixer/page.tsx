import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SubtitleOverlapFixer } from "@/features/subtitle-overlap-fixer/subtitle-overlap-fixer";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
import "@/features/subtitle-overlap-fixer/subtitle-overlap.css";
export const metadata = pageMetadata("Subtitle Overlap Fixer — Find & Fix Overlapping Subtitles", "Find subtitles that overlap in SRT or VTT files, review each suggested timing repair, and save a clean, fixed file. Free online, no signup required.", "/tools/subtitle-overlap-fixer");
export default function ToolPage() { return <ToolLayout title="Subtitle Overlap Fixer" category="Subtitle Tools" categoryHref="/tools/subtitle-tools"><ToolHeader title="Subtitle Overlap Fixer" description="Find overlapping subtitles and review timing fixes in SRT or VTT files." toolIcon="subtitle-overlap" /><ToolWorkspace label="Subtitle Overlap Fixer"><SubtitleOverlapFixer /></ToolWorkspace><section className="v1-support"><h2>What gets repaired?</h2><p>The tool checks neighboring subtitles in file order. Shortening keeps at least 0.1 seconds of duration; moving keeps the subtitle’s duration. The gap applies to repaired overlaps. Anything that cannot be fixed safely stays flagged.</p></section><RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/subtitle-overlap-fixer"].map((href) => tools.find((t) => t.href === href)!)} /></ToolLayout>; }
