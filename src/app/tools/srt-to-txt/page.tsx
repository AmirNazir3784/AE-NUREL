import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SrtToTxtConverter } from "@/features/srt-to-txt/srt-to-txt";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("SRT to TXT Converter — Extract a Clean Transcript", "Turn an SRT file into a readable plain-text transcript — one subtitle per line, or joined as paragraphs — no timestamps or cue numbers. Free, no signup.", "/tools/srt-to-txt");
export default function ToolPage() {
  return <ToolLayout title="SRT to TXT Converter" category="Subtitle Tools" categoryHref="/tools/subtitle-tools">
    <ToolHeader title="SRT to TXT Converter" description="Extract a readable transcript from SRT subtitles." toolIcon="srt-to-txt" />
    <ToolWorkspace label="SRT to TXT Converter"><SrtToTxtConverter /></ToolWorkspace>
    <section className="v1-support"><h2>Transcript output</h2><p>Cue numbers and timestamps are removed. Choose one cue per line or paragraph text. Known subtitle formatting is removed and whitespace is cleaned up. Copy the resulting text or download a UTF-8 TXT file.</p></section>
    <RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/srt-to-txt"].map(href => tools.find(tool => tool.href === href)!)} />
  </ToolLayout>;
}
