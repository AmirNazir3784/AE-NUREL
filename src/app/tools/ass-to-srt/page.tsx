import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { AssToSrtConverter } from "@/features/ass-to-srt/ass-to-srt";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("ASS / SSA to SRT Converter — Convert Subtitles Online", "Convert ASS or SSA subtitle dialogue into widely supported SRT files that play almost anywhere, keeping the words and timing. Free, no signup.", "/tools/ass-to-srt");
export default function ToolPage() {
  return <ToolLayout title="ASS / SSA to SRT Converter" category="Subtitle Tools" categoryHref="/tools/subtitle-tools">
    <ToolHeader title="ASS / SSA to SRT Converter" description="Convert ASS or SSA dialogue into SRT subtitles." toolIcon="ass-to-srt" />
    <ToolWorkspace label="ASS / SSA to SRT Converter"><AssToSrtConverter /></ToolWorkspace>
    <section className="v1-support"><h2>What SRT cannot store</h2><p>ASS fonts, colours, screen positioning, karaoke, animations and complex styles cannot be stored in SRT. Dialogue words and cue times are kept. Drawing-only and comment events are omitted; the compatibility check explains any loss before download.</p></section>
    <RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/ass-to-srt"].map(href => tools.find(tool => tool.href === href)!)} />
  </ToolLayout>;
}
