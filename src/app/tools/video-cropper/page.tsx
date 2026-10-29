import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import { pageMetadata } from "@/lib/site-metadata";
import { VideoCropper } from "@/features/video-cropper/video-cropper";
import styles from "@/features/video-compressor/video-compressor.module.css";

export const metadata = {
  ...pageMetadata("Free Video Cropper — Precise Framing, No Upload", "Crop videos with exact pixel controls, aspect ratio presets and a live preview. Export MP4 or WebM, with optional audio. Free, no watermark or signup.", "/tools/video-cropper"),
  robots: { index: true, follow: true },
};
const questions = [
  ["Will cropping change my original file?", "No. Cropping creates a separate video file. Your original stays unchanged. Preview and download the result before closing or reloading the page."],
  ["What is the difference between cropping and resizing?", "Cropping removes the edges outside your chosen frame. Resizing changes the output dimensions. Use Crop pixels to keep the selected area's pixel dimensions, or choose a shorter-edge limit to make the export smaller. The tool never upscales."],
  ["How do I get an exact social media shape?", "Choose 9:16 for a vertical frame, 1:1 for a square, 4:5 for a portrait feed, or 16:9 for widescreen. Presets lock the exact ratio and use even pixel dimensions for video encoding. Drag the frame to your subject, or enter its X and Y position. Reset frame restores the whole source; Undo restores an earlier crop."],
  ["Can I keep the original sound and duration?", "Yes. Keep sound is on by default and the entire timeline is exported. Compatible AAC audio in MP4 and Opus audio in WebM can be copied; other supported audio is converted when needed. Export stops with a clear error if the chosen audio cannot be retained. Uncheck Keep sound for a silent result."],
  ["Which files and browsers are supported?", "Choose MP4, MOV, M4V, WebM or MKV containing a browser-decodable video codec. Updated desktop Chrome and Edge are good starting points. Input is limited to 500 MB, 20 minutes, one video track, at most one audio track and up to 4K pixels. Output is limited to 256 MB for browser memory safety. Unsupported codecs fail before a successful export is reported."],
  ["Is the export lossless?", "No. The cropped video is re-encoded with a detail-focused bitrate, so some quality loss is possible and the output may be larger than an efficiently encoded original. Preview the exported file before sharing it. Embedded subtitles, descriptive metadata and specialist HDR/color workflows are not preserved or guaranteed. There is no watermark, account requirement or paid tier for this tool."],
];
export default function VideoCropperPage() {
  return <main id="main-content" className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevron-right" size={12} /><Link href="/tools#video-tools">Video tools</Link><Icon name="chevron-right" size={12} /><span aria-current="page">Video cropper</span></nav>
    <header className={styles.hero}><div><span className={styles.eyebrow}>FREE VIDEO CROPPER</span><h1>A new frame.<br /><span>The same great story.</span></h1><p>Turn a wide shot into a vertical moment. Frame your subject precisely, preview what stays, and export a video made to fit.</p><div className={styles.trust}><span><Icon name="shield" size={15} /> Precise framing</span><span><Icon name="check" size={15} /> No watermark</span><span><Icon name="user" size={15} /> No sign-in</span></div></div><aside className={styles.heroNote}><Icon name="monitor" size={25} /><strong>Every pixel, intentional.</strong><p>Social presets meet precise controls. Your original stays untouched.</p></aside></header>
    <VideoCropper />
    <section className={styles.explainer} aria-label="How to crop a video"><article><span>01 / CHOOSE</span><h2>Start with your footage.</h2><p>Add a supported video and choose the part you want to keep. Your original file stays unchanged.</p></article><article><span>02 / FRAME</span><h2>Bring your subject forward.</h2><p>Choose a shape, drag its corners, or enter exact pixels. Watch the live preview to see what makes the cut.</p></article><article><span>03 / EXPORT</span><h2>Fit the moment.</h2><p>Keep sound or go silent. Export MP4 or WebM, play the actual result, and download without a watermark.</p></article></section>
    <section className={styles.faq} aria-labelledby="cropper-faq"><div><span className={styles.eyebrow}>BEFORE YOU HIT EXPORT</span><h2 id="cropper-faq">A better frame.<br />A clearer picture.</h2><p>Practical answers for a crop that feels right.</p></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
  </main>;
}
