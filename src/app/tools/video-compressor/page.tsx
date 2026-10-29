import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import { pageMetadata } from "@/lib/site-metadata";
import { VideoCompressor } from "@/features/video-compressor/video-compressor";
import styles from "@/features/video-compressor/video-compressor.module.css";

export const metadata = {
  ...pageMetadata("Free Video Compressor — Smaller Videos, More Control", "Compress video with clear quality and size controls. Choose MP4 or WebM, set a file-size target, keep or remove audio, and preview the result. Free, no watermark or signup.", "/tools/video-compressor"),
  robots: { index: true, follow: true },
};

const questions = [
  ["Will compression change my original file?", "Compression creates a separate file without overwriting your original. Preview and download your result before leaving; reloading clears the workspace."],
  ["Can I compress a video to an exact size?", "Choose Target a size and enter your budget in MB. The tool reserves space for audio and container information, then checks the actual output. It can make a second pass at a lower bitrate. If it still cannot fit, it explains what to change instead of presenting an oversized result as success."],
  ["Which formats and browsers work?", "You can select MP4, MOV, M4V, WebM and MKV files containing a video codec supported by your browser. The tool checks decoding and encoding support before processing. Updated desktop Chrome or Edge is a good starting point. An extension alone does not guarantee codec support; AVI and ProRes are not promised."],
  ["Will the compressed video keep its sound?", "Keep sound is selected by default. Compatible AAC audio in MP4, or Opus in WebM, is copied without re-encoding. Other supported audio may be converted to the output codec. If the browser cannot retain it, the tool stops and suggests a different format or intentional muting."],
  ["Why can a compressed file sometimes be larger?", "An already efficient source may have little room to shrink. A new encoder, codec or resolution can produce a larger file. The comparison shows the measured result honestly. Try Smaller file, a lower resolution or a smaller size budget; compression can trade fine detail for size."],
  ["What are the limits and what is preserved?", "Input is limited to 500 MB, 20 minutes, one video track, at most one audio track, and up to 4K pixels. Output is limited to 256 MB for browser memory safety. Aspect ratio, timeline and the selected audio track are checked after export. Embedded subtitles, descriptive metadata and specialist color/HDR workflows are not preserved or guaranteed. There is no watermark, daily allowance or paid tier for this tool."],
];

export default function VideoCompressorPage() {
  return <main id="main-content" className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevron-right" size={12} /><Link href="/tools#video-tools">Video tools</Link><Icon name="chevron-right" size={12} /><span aria-current="page">Video compressor</span></nav>
    <header className={styles.hero}>
      <div><span className={styles.eyebrow}>FREE VIDEO COMPRESSOR</span><h1>Video compressor,<br /><span>ready to share.</span></h1><p>Make a video easier to share. Pick a quality preset or a file-size target, preview the result, and download a separate copy.</p><div className={styles.trust}><span><Icon name="shield" size={15} /> Preview before download</span><span><Icon name="check" size={15} /> No watermark</span><span><Icon name="user" size={15} /> No sign-in</span></div></div>
      <aside className={styles.heroNote}><Icon name="shield" size={25} /><strong>Your footage is yours.</strong><p>Choose your settings, preview the result, and download when ready.</p></aside>
    </header>
    <VideoCompressor />
    <section className={styles.explainer} aria-label="How to compress a video">
      <article><span>01 / CHOOSE</span><h2>Start with your original.</h2><p>Add a browser-supported video. Its size, resolution, duration and audio details appear beside a playable preview.</p></article>
      <article><span>02 / FINE-TUNE</span><h2>Keep what matters.</h2><p>Balance detail and file size, choose a resolution, or set a specific size budget. Your aspect ratio stays intact.</p></article>
      <article><span>03 / COMPARE</span><h2>See it. Then share it.</h2><p>Preview the actual result and compare measured sizes before downloading. The original file is never overwritten.</p></article>
    </section>
    <section className={styles.faq} aria-labelledby="compressor-faq"><div><span className={styles.eyebrow}>BEFORE YOU HIT COMPRESS</span><h2>A smaller file.<br />A clearer idea.</h2><p>What changes, what stays, and how to get a useful result.</p></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
  </main>;
}
