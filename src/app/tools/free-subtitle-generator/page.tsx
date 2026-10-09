import { notFound } from "next/navigation";
import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { TranscriptionWorkspace } from "@/features/local-asr/transcription-workspace";
import { tools } from "@/lib/tools";
export const metadata = { title: "Free Subtitle Generator — Development Preview", description: "Generate and edit English SRT or VTT subtitles from short audio recordings on your device. Development preview pending release verification.", robots: { index: false, follow: false } };
export default function SubtitleGeneratorPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ToolLayout title="Free Subtitle Generator" category="Subtitle Tools" categoryHref="/tools/subtitle-tools"><ToolHeader title="Free Subtitle Generator" description="Generate editable English subtitles from a short audio recording, on your device." /><p className="badge accent">Development preview · release verification pending</p><ToolWorkspace label="Free Subtitle Generator"><TranscriptionWorkspace kind="subtitle" /></ToolWorkspace><section className="v1-support"><h2>Supported input in this preview</h2><p>Choose MP3 or PCM WAV, up to 60 seconds and 25 MB. Review and correct the generated draft, then download SRT or VTT without running transcription again. Video input is held until local decoding and timeline checks pass. There is no URL downloader, translation or cloud processing.</p></section><RelatedTools title="Useful next tools" tools={tools.filter(tool => ["/tools/srt-editor", "/tools/srt-to-txt", "/tools/srt-to-sbv"].includes(tool.href))} /></ToolLayout>;
}
