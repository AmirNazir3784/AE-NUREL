import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SrtToMp4Converter } from "@/features/srt-to-mp4/srt-to-mp4";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("SRT to MP4 Converter — Turn an SRT File into a Caption Video", "Turn an SRT file into a new silent MP4 caption video — subtitle text on a black or white background, up to 500 cues and 2 minutes. Free, no signup.", "/tools/srt-to-mp4");
export default function ToolPage() {
  return <ToolLayout title="SRT to MP4 Converter" category="Subtitle Tools" categoryHref="/tools/subtitle-tools">
    <ToolHeader title="SRT to MP4 Converter" description="Create a silent video of your subtitle text." toolIcon="video" />
    <ToolWorkspace label="SRT to MP4 Converter"><SrtToMp4Converter /></ToolWorkspace>
    <section className="v1-support"><h2>A caption video, rendered locally</h2><p>This creates a new MP4 with caption words on a black or white background. It does not add subtitles to an existing video or generate audio. Choose 480p or 720p; text wraps to fit and uses a readable default style. Timelines start at zero and end at the last subtitle’s end, including gaps. V1 supports up to 500 cues and two minutes. Rendering requires browser H.264 encoding support and HTTPS (localhost also works); unsupported browsers show a clear error. Installed fonts determine which Unicode glyphs can be displayed.</p></section>
    <RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/srt-to-mp4"].map(href => tools.find(tool => tool.href === href)!)} />
  </ToolLayout>;
}
