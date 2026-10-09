import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SrtToSbvConverter } from "@/features/srt-to-sbv/srt-to-sbv";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("SRT to SBV Converter", "Convert SRT subtitles to basic YouTube SBV captions. Keep words, line breaks and timing, with free browser-local processing.", "/tools/srt-to-sbv");
export default function ToolPage() {
  return <ToolLayout title="SRT to SBV Converter" category="Subtitle Tools" categoryHref="/tools/subtitle-tools">
    <ToolHeader title="SRT to SBV Converter" description="Convert SRT subtitles to SBV captions." toolIcon="srt-to-vtt" />
    <ToolWorkspace label="SRT to SBV Converter"><SrtToSbvConverter /></ToolWorkspace>
    <section className="v1-support"><h2>Basic SBV output</h2><p>Cue numbers are removed and times use SBV’s comma-separated format. Caption words, single line breaks and millisecond timing are kept. Basic SBV cannot store SRT styling or positioning, so those features are omitted with a warning.</p></section>
    <RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/srt-to-sbv"].map(href => tools.find(tool => tool.href === href)!)} />
  </ToolLayout>;
}
