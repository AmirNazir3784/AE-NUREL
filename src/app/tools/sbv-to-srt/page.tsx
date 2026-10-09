import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SbvToSrtConverter } from "@/features/sbv-to-srt/sbv-to-srt";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("SBV to SRT Converter", "Convert YouTube SBV caption files to numbered SRT subtitles. Free browser-local conversion, with no signup.", "/tools/sbv-to-srt");
export default function ToolPage() {
  return <ToolLayout title="SBV to SRT Converter" category="Subtitle Tools" categoryHref="/tools/subtitle-tools">
    <ToolHeader title="SBV to SRT Converter" description="Convert SBV captions to standard SRT subtitles." toolIcon="vtt-to-srt" />
    <ToolWorkspace label="SBV to SRT Converter"><SbvToSrtConverter /></ToolWorkspace>
    <section className="v1-support"><h2>From YouTube captions to SRT</h2><p>Open a basic SBV file with comma-separated start and end times. Caption words, line breaks and millisecond timing are kept, and SRT cue numbers are generated. Separate SBV captions with blank lines. SubViewer files with extra headers or advanced features are not supported.</p></section>
    <RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/sbv-to-srt"].map(href => tools.find(tool => tool.href === href)!)} />
  </ToolLayout>;
}
