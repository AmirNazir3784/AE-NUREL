import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { VttToTxtConverter } from "@/features/vtt-to-txt/vtt-to-txt";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("VTT to TXT Converter", "Extract readable transcript text from WebVTT subtitles. Copy text or download UTF-8 TXT, in your browser without signup.", "/tools/vtt-to-txt");
export default function ToolPage() {
  return <ToolLayout title="VTT to TXT Converter" category="Subtitle Tools" categoryHref="/tools/subtitle-tools">
    <ToolHeader title="VTT to TXT Converter" description="Extract a readable transcript from VTT subtitles." toolIcon="srt-to-txt" />
    <ToolWorkspace label="VTT to TXT Converter"><VttToTxtConverter /></ToolWorkspace>
    <section className="v1-support"><h2>Just the subtitle words</h2><p>The WEBVTT header, cue identifiers, timestamps, positioning and metadata are removed. Caption words, including ruby annotations, are kept; styling and voice labels are removed. Choose one cue per line or paragraph text, then copy or download your transcript.</p></section>
    <RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/vtt-to-txt"].map(href => tools.find(tool => tool.href === href)!)} />
  </ToolLayout>;
}
