import { AudioCaptionWorkspace } from "@/features/audio-captions/podcast-workspace";
import { pageMetadata } from "@/lib/site-metadata";
import { ToolFaq, ToolHero, ToolLayout } from "@/components/tools/tool-layout";

export const metadata = {
  ...pageMetadata("Lyrics to Captions — Song to SRT or VTT", "Generate lyric captions from MP3 or WAV, add optional written lyrics, review synced timing and download SRT or VTT.", "/tools/lyrics-to-captions"),
};
export const dynamic = "force-dynamic";
const questions = [
  { q: "Do I need to paste the lyrics?", a: "No. Generate a draft from the recording, or paste your own lyrics with one line per caption. Supplied wording is preserved. Lines that cannot be matched stay untimed until you correct them." },
  { q: "How accurate are captions for singing?", a: "Clear lead vocals work best. Dense instruments, layered singers, accents and repeated choruses can cause missed words or incorrect timing. Select the song’s language, listen to the result and correct it before sharing. This tool does not separate vocals from music." },
  { q: "Can I correct timing manually?", a: "Yes. Play or seek the song and use Set start here and Set end here on a caption, or type exact timestamps. Import SRT/VTT, edit text, add/delete captions and undo changes. Downloads stay disabled while timing is incomplete, overlapping or outside the song." },
  { q: "What does per-word segmentation do?", a: "It keeps measured word intervals from recognition, including any word groups returned together. It does not invent individual timestamps inside a group. When you paste written lyrics, each supplied line becomes a caption instead." },
  { q: "Which files and clip lengths can I use?", a: "MP3 or PCM WAV, up to five minutes and 30 MiB, with mono or stereo audio at 8–48 kHz. Automatic recognition supports up to five minutes with compatible acceleration and sufficient memory; otherwise it is limited to 30 seconds, or unavailable if memory is insufficient. The current limit is shown above Generate lyrics. Imports and manual timing support five minutes." },
  { q: "Do the downloads include a video?", a: "SRT and VTT downloads contain timed text. They do not create a music video or remove instrumental audio. Use the captions in your video editor and review them against the original recording." },
];

export default function LyricsPage() {
  return <ToolLayout title="Lyrics to Captions" category="Caption Tools" categoryHref="/tools#caption-generation">
    <ToolHero title="Lyrics to Captions" description="Turn your song into timed lyrics. Review and download SRT or VTT." ticks={["MP3 / WAV", "Phrase or word timing", "Editable captions"]} chipA={null} chipB={null} chipC={null} art="plain" visual={<div className="aen-hero-merge" aria-hidden="true"><svg viewBox="0 0 320 140" fill="none"><path d="M68 78V38l38-8v40" stroke="var(--action)" strokeWidth="6" strokeLinecap="round"/><ellipse cx="58" cy="82" rx="13" ry="9" fill="var(--action)"/><ellipse cx="96" cy="74" rx="13" ry="9" fill="var(--action)"/><path d="M129 69h34m-8-8 8 8-8 8" stroke="var(--muted)" strokeWidth="2"/><rect x="180" y="36" width="94" height="65" rx="12" fill="var(--surface)" stroke="var(--border)" strokeWidth="2"/><path d="M195 55h45m-45 13h63m-63 13h32" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round"/><path d="M241 81h17" stroke="var(--action)" strokeWidth="5" strokeLinecap="round"/></svg></div>} />
    <AudioCaptionWorkspace kind="lyrics" />
    <ToolFaq href="/tools/lyrics-to-captions" items={questions} />
  </ToolLayout>;
}
