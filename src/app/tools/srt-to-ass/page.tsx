import { RelatedTools, ToolFaq, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SrtToAssConverter } from "@/features/srt-to-ass/srt-to-ass";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("SRT to ASS Converter — Convert SRT to ASS Subtitles", "Convert SRT subtitles to ASS format with a ready-to-use default style included, so the file is ready to use right away in ASS players. Free, no signup.", "/tools/srt-to-ass");
export default function ToolPage() {
  return <ToolLayout title="SRT to ASS Converter" category="Subtitle Tools" categoryHref="/tools/subtitle-tools">
    <ToolHeader title="SRT to ASS Converter" description="Convert SRT subtitles to ASS with a default style." toolIcon="srt-to-ass" />
    <ToolWorkspace label="SRT to ASS Converter"><SrtToAssConverter /></ToolWorkspace>
    <section className="v1-support"><h2>A clean default ASS style</h2><p>The output includes Script Info, a default style and timed Dialogue events. SRT does not contain rich ASS styling. ASS times use hundredths of a second, so millisecond times may be rounded. Cues too short for that precision, literal braces and ASS escape sequences are rejected rather than silently changing caption text.</p></section>
    <ToolFaq href="/tools/srt-to-ass" items={[{"q": "What do I get?", "a": "An ASS subtitle file built from your SRT, with a default style included so it is ready to use in players that support ASS."}, {"q": "Can I customise the style?", "a": "No — there are no style options. The file always uses one fixed default style: Arial, size 48, white text with a black outline, centred at the bottom of a 1920×1080 frame. For a different look, edit the style afterwards in an ASS editor such as Aegisub. (ASS stores hundredths of a second, so times are rounded to the nearest 10 milliseconds.)"}, {"q": "Is it free?", "a": "Yes — free, with no signup needed."}]} /><RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/srt-to-ass"].map(href => tools.find(tool => tool.href === href)!)} />
  </ToolLayout>;
}
