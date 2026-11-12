import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import styles from "./lower-homepage.module.css";

// Illustrative editing requests, not customer quotations or endorsements.
const notes = [
  { task: "Subtitle timing", text: "The words are right. They just arrive a second late.", action: "Adjust the timing", href: "/tools/srt-timing-adjuster", icon: "clock" as const },
  { task: "Interview notes", text: "There’s a useful idea in this recording. I need it in writing.", action: "Convert audio to text", href: "/tools/free-audio-to-text-converter-online", icon: "audio" as const },
  { task: "A different frame", text: "This landscape clip needs to fit a vertical post.", action: "Crop the video", href: "/tools/video-cropper", icon: "video" as const },
  { task: "The final handoff", text: "The player needs VTT. My subtitles are in SRT.", action: "Convert SRT to VTT", href: "/tools/srt-to-vtt", icon: "subtitle" as const },
];

export function EditingNotes() {
  return <section className={styles.notesSection} aria-labelledby="home-notes-heading">
    <header className={styles.compactHead}>
      <div><span className={styles.eyebrow}>FAMILIAR EDITING MOMENTS</span><h2 id="home-notes-heading">Sounds like your next task?</h2><p>Example editing requests, with a tool to help you move forward.</p></div>
    </header>
    <div className={styles.notesViewport} id="home-editing-notes" tabIndex={0} role="region" aria-label="Example editing requests">
        <div className={styles.notesGroup}>
          {notes.map(note => <article className={styles.noteCard} key={note.task}>
            <div className={styles.noteLabel}><Icon name={note.icon} size={18} /><span>{note.task}</span><span>Example</span></div>
            <p>“{note.text}”</p>
            <Link className={styles.textLink} href={note.href}>{note.action}<span aria-hidden="true">↗</span></Link>
          </article>)}
        </div>
    </div>
  </section>;
}
