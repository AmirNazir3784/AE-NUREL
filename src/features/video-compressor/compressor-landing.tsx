import Link from "@/components/site/page-link";
import { VideoCompressor } from "./video-compressor";
import type { CompressorProfile } from "./compressor-profiles";
import styles from "./video-compressor.module.css";

export type CompressorEditorial = { name: string; eyebrow: string; headline: string; accent: string; intro: string; note: string; steps: readonly (readonly [string,string])[]; questions: readonly (readonly [string,string])[] };
export function CompressorLanding({ profile, content }: { profile: CompressorProfile; content: CompressorEditorial }) {
  return <main id="main-content" className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/tools#video-tools">Video tools</Link><span>/</span><span aria-current="page">{content.name}</span></nav>
    <header className={styles.hero}><div><span className={styles.eyebrow}>{content.eyebrow}</span><h1>{content.headline}<br /><span>{content.accent}</span></h1><p>{content.intro}</p><div className={styles.trust}><span>No watermark</span><span>No sign-in</span><span>Original preserved</span></div></div><aside className={styles.heroNote}><strong>Before you start</strong><p>{content.note}</p><Link href="/tools/video-compressor">Explore all compression options →</Link></aside></header>
    <VideoCompressor profile={profile} />
    <section className={styles.explainer} aria-label={`How to use ${content.name}`}>{content.steps.map(([title,text],i)=><article key={title}><span>0{i+1} / YOUR NEXT STEP</span><h2>{title}</h2><p>{text}</p></article>)}</section>
    <section className={styles.faq} aria-labelledby="compress-questions"><div><span className={styles.eyebrow}>PRACTICAL ANSWERS</span><h2>Know your output.</h2><p>Keep the result you need, and understand the trade-offs.</p><Link href="/tools/compress-video-to-10mb">Have a 10 MB limit?</Link></div><div>{content.questions.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
  </main>;
}
