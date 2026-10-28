import styles from "./studio.module.css";

const steps = [
  { number: "01", heading: "Choose your video", description: "Open an MP4, MOV or WebM. Your video remains on your device." },
  { number: "02", heading: "Generate or import", description: "Recognize speech locally, upload SRT/VTT subtitles, or write captions yourself." },
  { number: "03", heading: "Style and export", description: "Choose fonts, colors and motion. Review, then export captioned video or subtitle files." },
];
const faqs = [
  { question: "Is my video uploaded to a server?", answer: "On this device mode processes your video locally. The optional Private server transcription mode sends audio only after you explicitly choose it and approve upload." },
  { question: "Which files does Caption Studio support?", answer: "Import MP4, MOV or WebM video. You can import and download SRT/VTT captions and export captioned MP4 or WebM when your browser supports the encoder." },
  { question: "Can I correct a wrong word or timing?", answer: "Yes. Use the Captions tab to edit text and start/end times, split or merge captions, and undo changes." },
  { question: "Why is highlighted-word timing unavailable after editing?", answer: "Precise word highlighting uses measured speech timing. Editing text or timestamps pauses that effect for affected captions rather than inventing new word timings." },
  { question: "Are animated captions included in my downloaded video?", answer: "Yes. When you export a video, selected caption styles and animations are drawn into the video. Subtitle-only SRT/VTT downloads contain text and timing, not styling." },
  { question: "What are the video size limits?", answer: "The current development studio supports videos up to 2 minutes, 200 MiB and 1080p. Export also depends on your browser's available video encoders." },
];

export function StudioGuidance({ compact = false }: { compact?: boolean } = {}) {
  return <section aria-label="Caption Studio guide" className={styles.guide}>
    {!compact && <><div className={styles.guideIntro}><span className={styles.guideEyebrow}>HOW IT WORKS</span><h2>Great captions in three steps.</h2><p>Everything you need to move from raw video to readable, styled captions.</p></div>
    <div className={styles.guideSteps}>{steps.map(step => <article className={styles.guideStep} key={step.number}><span>{step.number}</span><span className={styles.guideStepMotif} aria-hidden="true"><i /><i /><i /><i /><i /></span><h3>{step.heading}</h3><p>{step.description}</p></article>)}</div></>}
    <div className={styles.guideFaq}><div><span className={styles.guideEyebrow}>NEED HELP?</span><h2>Frequently asked questions</h2><p>Helpful answers before you start exporting.</p></div><div className={styles.guideQuestions}>{faqs.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></div>
  </section>;
}
