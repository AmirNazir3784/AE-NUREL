import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SrtToAssConverter } from "@/features/srt-to-ass/srt-to-ass";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("SRT to ASS Converter", "Convert SRT subtitles to ASS with a default style. Free, browser-based conversion with no signup.", "/tools/srt-to-ass");
export default function ToolPage() {
  return <ToolLayout title="SRT to ASS Converter" category="Subtitle Tools" categoryHref="/tools/subtitle-tools">
    <ToolHeader title="SRT to ASS Converter" description="Convert SRT subtitles to ASS with a default style." toolIcon="srt-to-ass" />
    <ToolWorkspace label="SRT to ASS Converter"><SrtToAssConverter /></ToolWorkspace>
    <section className="v1-support"><h2>A clean default ASS style</h2><p>The output includes Script Info, a default style and timed Dialogue events. SRT does not contain rich ASS styling. ASS times use hundredths of a second, so millisecond times may be rounded. Cues too short for that precision, literal braces and ASS escape sequences are rejected rather than silently changing caption text.</p></section>
    <RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/srt-to-ass"].map(href => tools.find(tool => tool.href === href)!)} />
  </ToolLayout>;
}
