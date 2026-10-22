import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SrtToJsonConverter } from "@/features/srt-to-json/srt-to-json";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("SRT to JSON Converter — Turn Subtitle Cues into JSON", "Convert SRT subtitle cues into a clean, structured JSON array — index, start and end times, and text — ready for apps and scripts. Free, no signup.", "/tools/srt-to-json");
export default function ToolPage() {
  return <ToolLayout title="SRT to JSON Converter" category="Subtitle Tools" categoryHref="/tools/subtitle-tools">
    <ToolHeader title="SRT to JSON Converter" description="Convert SRT cues into a structured JSON array." toolIcon="srt-to-json" />
    <ToolWorkspace label="SRT to JSON Converter"><SrtToJsonConverter /></ToolWorkspace>
    <section className="v1-support"><h2>A predictable cue schema</h2><p>Each object includes index, start, end, startMs, endMs and text. Indexes are generated in source order. Multiline text, Unicode and any SRT text markup are retained as JSON strings. The output is pretty-printed UTF-8 JSON; no schema options are needed.</p></section>
    <RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/srt-to-json"].map(href => tools.find(tool => tool.href === href)!)} />
  </ToolLayout>;
}
