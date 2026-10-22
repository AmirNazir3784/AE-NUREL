import { RelatedTools, ToolFaq, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SbvToSrtConverter } from "@/features/sbv-to-srt/sbv-to-srt";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("SBV to SRT Converter — Convert YouTube Captions to SRT", "Convert YouTube SBV caption files into standard, numbered SRT subtitles that other players and editors accept, timings kept exactly. Free, no signup.", "/tools/sbv-to-srt");
export default function ToolPage() {
  return <ToolLayout title="SBV to SRT Converter" category="Subtitle Tools" categoryHref="/tools/subtitle-tools">
    <ToolHeader title="SBV to SRT Converter" description="Convert SBV captions to standard SRT subtitles." toolIcon="vtt-to-srt" />
    <ToolWorkspace label="SBV to SRT Converter"><SbvToSrtConverter /></ToolWorkspace>
    <section className="v1-support"><h2>From YouTube captions to SRT</h2><p>Open a basic SBV file with comma-separated start and end times. Caption words, line breaks and millisecond timing are kept, and SRT cue numbers are generated. Separate SBV captions with blank lines. SubViewer files with extra headers or advanced features are not supported.</p></section>
    <ToolFaq href="/tools/sbv-to-srt" items={[{"q": "What is an SBV file?", "a": "SBV is the caption format YouTube uses. Converting it to SRT gives you numbered subtitles in the standard format other players and editors accept."}, {"q": "Does the timing stay the same?", "a": "Yes — timings are transferred exactly, millisecond for millisecond, with no rounding or shifting. Only the formatting changes: hours are written with two digits and the decimal point becomes SRT's comma (so 0:01:23.450 becomes 00:01:23,450)."}, {"q": "Is it free?", "a": "Yes — free, with no signup needed."}]} /><RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/sbv-to-srt"].map(href => tools.find(tool => tool.href === href)!)} />
  </ToolLayout>;
}
