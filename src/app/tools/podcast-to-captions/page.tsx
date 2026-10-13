import { notFound } from "next/navigation";
import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { TranscriptionWorkspace } from "@/features/local-asr/transcription-workspace";
import { tools } from "@/lib/tools";
export const metadata = { title: "Speech to Captions — Development Preview", description: "Generate and review English subtitles from short recordings locally. Development preview pending release verification.", robots: { index: false, follow: false } };
export default function PodcastCaptionsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ToolLayout title="Speech to Captions" category="Subtitle Tools" categoryHref="/tools/subtitle-tools"><ToolHeader title="Speech to Captions" description="Turn a short English speech recording into editable SRT or VTT captions." /><p className="badge accent">Development preview · release verification pending</p><ToolWorkspace label="Speech to Captions"><TranscriptionWorkspace kind="podcast" /></ToolWorkspace><section className="v1-support"><h2>Short recordings, local processing</h2><p>This preview supports MP3 and PCM WAV up to 60 seconds and 25 MB. Review recognition and timing errors before exporting. Full podcast episodes, translation and speaker labels are outside this version.</p></section><RelatedTools title="Useful next tools" tools={tools.filter(tool => ["/tools/srt-editor", "/tools/srt-to-txt", "/tools/srt-to-vtt"].includes(tool.href))} /></ToolLayout>;
}
