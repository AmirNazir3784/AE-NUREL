import Link from "@/components/site/page-link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/site-metadata";
import { VideoCompressor } from "@/features/video-compressor/video-compressor";
import styles from "@/features/video-compressor/video-compressor.module.css";

export const metadata = {
  ...pageMetadata("Compress Video to 10MB — Free, No Watermark", "Make a video fit a 10 MB limit. Compress MP4, MOV or WebM, choose resolution, retain sound and download a size-checked result.", "/tools/compress-video-to-10mb"),
  robots: { index: false, follow: false },
};

const questions = [
  ["Does 10 MB mean exactly 10,000,000 bytes?", "Yes. This tool uses decimal megabytes: the output must be at most 10,000,000 bytes. That is also below a 10 MiB limit. A result can be substantially smaller; we do not add padding just to reach the limit."],
  ["What happens if my video is already under 10 MB?", "You can download the original without another compression pass. That preserves its existing quality and format. You can also create a compressed copy if you want it smaller."],
  ["Can every video fit without losing quality?", "No. Longer clips have fewer bits available per second under the same size limit. Compression can soften detail, especially with fast motion. Try 720p or 480p, remove sound when appropriate, or shorten the clip. If a usable size budget cannot be calculated, the tool explains rather than claiming success."],
  ["Can I upload a 4K video?", "Yes, supported videos up to 4K, 500 MB and 20 minutes are accepted. Choose Keep source size for the original dimensions, or a smaller resolution. Fitting a long 4K video into 10 MB may require reducing resolution; 4K output availability also depends on codec support."],
  ["Will it keep the complete video and its sound?", "The entire timeline is retained. Keep sound is selected by default, and the output is checked for duration, dimensions and selected audio. Compatible audio may be copied; other supported audio may be converted. Embedded subtitles, HDR and specialist color metadata are not preserved."],
  ["What if the first export is too large?", "The actual file size is checked, and the tool can retry once at a lower video bitrate. If it still exceeds 10 MB, no oversized download is presented as a successful result. Try a smaller resolution or remove sound. There is no watermark or sign-in requirement."],
];

export default function CompressToTenMBPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <main id="main-content" className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/tools#video-tools">Video tools</Link><span>/</span><span aria-current="page">Compress to 10MB</span></nav>
    <header className={styles.hero}><div><span className={styles.eyebrow}>FREE · COMPRESS VIDEO TO 10MB</span><h1>A smaller video.<br /><span>A limit you can meet.</span></h1><p>Turn a large video into a file that fits a 10 MB upload limit. Keep the full clip, choose your resolution, and check the actual result before sharing.</p><div className={styles.trust}><span>Size checked</span><span>No watermark</span><span>No sign-in</span></div></div><aside className={styles.heroNote}><strong>10 MB</strong><p>One fixed budget: 10,000,000 bytes.<br />Room for the video, sound and file information.</p><Link href="/tools/video-compressor">Need a different size? Open Video Compressor →</Link></aside></header>
    <VideoCompressor tenMB />
    <section className={styles.explainer} aria-label="How to fit a video into 10 MB"><article><span>01 / ADD</span><h2>Start with the full clip.</h2><p>Choose an MP4, MOV, M4V, WebM or MKV with a supported codec. Review its duration and dimensions before starting.</p></article><article><span>02 / BALANCE</span><h2>Spend the budget wisely.</h2><p>720p is a useful starting point. Try 480p for longer recordings, or keep the source dimensions when detail matters. Sound also uses part of the budget.</p></article><article><span>03 / CHECK</span><h2>Measured, then ready.</h2><p>Preview the output and check its byte count. Only an export that fits the limit is offered as successful. Your original is preserved.</p></article></section>
    <section className={styles.faq} aria-labelledby="tenmb-faq"><div><span className={styles.eyebrow}>UNDERSTAND YOUR LIMIT</span><h2>Less file size.<br />No guesswork.</h2><p>Practical answers before you compress.</p><p>Need a tighter frame? Use the <Link href="/tools/video-cropper">Video Cropper</Link> first.</p></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
  </main>;
}
