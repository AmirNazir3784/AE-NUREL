import { RelatedTools, ToolFaq, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
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
    <ToolFaq href="/tools/srt-to-json" items={[{"q": "Who is this for?", "a": "Developers and anyone feeding subtitle data into an app, script, or another tool — the output is a structured JSON array of the SRT cues."}, {"q": "What does each item in the array contain?", "a": "Exactly six fields: index (cue number, from 1), start and end (timestamp strings like “00:01:23,456”), startMs and endMs (the same times in whole milliseconds), and text (line breaks kept). The JSON is pretty-printed with two-space indentation."}, {"q": "Is it free?", "a": "Yes — free, with no signup needed."}]} /><RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/srt-to-json"].map(href => tools.find(tool => tool.href === href)!)} />
  </ToolLayout>;
}
