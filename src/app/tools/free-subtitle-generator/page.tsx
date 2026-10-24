import { notFound } from "next/navigation";
import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SubtitleWorkspace } from "@/features/local-asr/subtitle-workspace";
import { tools } from "@/lib/tools";
export const metadata = { title: "Audio to SRT / VTT", description: "Generate editable SRT or VTT subtitles from audio with local transcription and optional local translation in supported languages.", robots: { index: false, follow: false } };
export default function SubtitleGeneratorPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ToolLayout title="Audio to SRT / VTT" category="Subtitle Tools" categoryHref="/tools/subtitle-tools"><ToolHeader title="Audio to SRT / VTT" description="Generate editable subtitles in supported languages from audio, on your device." /><ToolWorkspace label="Audio to SRT / VTT"><SubtitleWorkspace /></ToolWorkspace><section className="v1-support"><h2>Supported audio</h2><p>Choose supported audio up to 5 hours and 4 GiB. Browser codec support and available device memory determine which files can be processed. Audio is decoded in manageable sections; optional translation changes cue text while preserving timing. Review and correct the draft, then download SRT or VTT. Audio, transcripts and subtitle text stay on your device.</p></section><RelatedTools title="Useful next tools" tools={tools.filter(tool => ["/tools/srt-editor", "/tools/srt-to-txt", "/tools/srt-to-sbv"].includes(tool.href))} /></ToolLayout>;
}
