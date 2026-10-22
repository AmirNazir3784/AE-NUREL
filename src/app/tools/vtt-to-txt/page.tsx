import { RelatedTools, ToolFaq, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { VttToTxtConverter } from "@/features/vtt-to-txt/vtt-to-txt";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("VTT to TXT Converter — Extract a WebVTT Transcript", "Extract readable transcript text from WebVTT subtitles, then copy it or download it as a UTF-8 TXT file to read, quote, or reuse. Free, no signup.", "/tools/vtt-to-txt");
export default function ToolPage() {
  return <ToolLayout title="VTT to TXT Converter" category="Subtitle Tools" categoryHref="/tools/subtitle-tools">
    <ToolHeader title="VTT to TXT Converter" description="Extract a readable transcript from VTT subtitles." toolIcon="srt-to-txt" />
    <ToolWorkspace label="VTT to TXT Converter"><VttToTxtConverter /></ToolWorkspace>
    <section className="v1-support"><h2>Just the subtitle words</h2><p>The WEBVTT header, cue identifiers, timestamps, positioning and metadata are removed. Caption words, including ruby annotations, are kept; styling and voice labels are removed. Choose one cue per line or paragraph text, then copy or download your transcript.</p></section>
    <ToolFaq href="/tools/vtt-to-txt" items={[{"q": "How is this different from the SRT to TXT tool?", "a": "This one starts from a WebVTT (.vtt) file; the result is the same kind of clean, readable transcript text."}, {"q": "How do I save the result?", "a": "You can copy the text, or download it as a UTF-8 TXT file."}, {"q": "Is it free?", "a": "Yes — free, with no signup needed."}]} /><RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/vtt-to-txt"].map(href => tools.find(tool => tool.href === href)!)} />
  </ToolLayout>;
}
