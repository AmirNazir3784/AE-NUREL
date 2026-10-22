import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { VttToSrtConverter } from "@/features/vtt-to-srt/vtt-to-srt";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("VTT to SRT Converter — Convert WebVTT to SRT Online", "Convert VTT (WebVTT) subtitles to SRT for players, editors, and platforms that need standard SubRip files. Free online, with no signup required.", "/tools/vtt-to-srt");
export default function ToolPage() {
  return <ToolLayout title="VTT to SRT Converter" category="Subtitle Tools" categoryHref="/tools/subtitle-tools">
    <ToolHeader title="VTT to SRT Converter" description="Convert VTT subtitles to SRT." toolIcon="vtt-to-srt" />
    <ToolWorkspace label="VTT to SRT Converter"><VttToSrtConverter /></ToolWorkspace>
    <section className="v1-support"><h2>VTT features in SRT</h2><p>Cue times and caption words are kept, and SRT numbering is generated. VTT notes, styles, regions, voice/class/language wrappers and inline timestamps are omitted. Basic bold, italic and underline are kept where practical; ruby pronunciation annotations are omitted.</p></section>
    <RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/vtt-to-srt"].map(href => tools.find(tool => tool.href === href)!)} />
  </ToolLayout>;
}
