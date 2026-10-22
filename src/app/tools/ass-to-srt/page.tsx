import { RelatedTools, ToolFaq, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
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
    <ToolFaq href="/tools/ass-to-srt" items={[{"q": "Why convert ASS/SSA to SRT?", "a": "SRT plays almost everywhere; ASS/SSA files (often from anime and fansub workflows) are not accepted by many players and platforms."}, {"q": "What happens to ASS styling and effects?", "a": "Everything visual is dropped — the tool warns you when styling was present. All override tags are removed (positioning, karaoke timing, colours, fonts, borders, shadows, fades), named styles are ignored, and text drawn with drawing commands, Comment lines and empty lines are left out. Only the dialogue words and their timing are kept; \\N line breaks and \\h hard spaces become ordinary breaks and spaces."}, {"q": "Do I need an account?", "a": "No — it is free and no signup is needed."}]} /><RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/ass-to-srt"].map(href => tools.find(tool => tool.href === href)!)} />
  </ToolLayout>;
}
