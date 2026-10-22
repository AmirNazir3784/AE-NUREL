import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SrtMerger } from "@/features/srt-merger/srt-merger";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("SRT Merger — Combine SRT Files Online", "Combine up to 10 SRT files into one, in the order you choose, and check the timing at each join before you save. Free online, no signup required.", "/tools/srt-merger");
export default function ToolPage() { return <ToolLayout title="SRT Merger" category="Subtitle Tools" categoryHref="/tools/subtitle-tools"><ToolHeader title="SRT Merger" description="Combine SRT files in order and check where they join." toolIcon="srt-merge" /><ToolWorkspace label="SRT Merger"><SrtMerger /></ToolWorkspace><section className="v1-support"><h2>How merge timing works</h2><p>The next file is placed after the previous file’s last subtitle, plus the added gap. Its original lead-in is kept. SRT files do not contain the full video-part duration. If parts have different trailing pauses, adjust their source timings first.</p></section><RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/srt-merger"].map((href) => tools.find((t) => t.href === href)!)} /></ToolLayout>; }
