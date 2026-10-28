import Link from "@/components/site/page-link";
import { ToolCard } from "@/components/home/tool-card";
import { audioToTextTool, autoCaptionTool } from "@/lib/ai-tools";
import { pageMetadata } from "@/lib/site-metadata";
import { autoCaptionReleased } from "@/lib/caption-release";

export const metadata = pageMetadata("AI Tools — Audio Transcription & Captions", "Explore AENural AI tools for turning recorded speech into text and creating video captions.", "/tools/ai-tools");

export default function AiToolsPage() {
  return <main id="main-content" className="aen-directory-page">
    <header className="aen-page-hero aen-wrap"><span className="aen-eyebrow"><i />Speech, text &amp; captions</span><h1>AI Tools</h1><p>Turn spoken ideas into text and captions you can edit, review, and reuse.</p></header>
    <section className="aen-wrap aen-directory-section" aria-label="AI tools"><div className="aen-tools-grid">
      <ToolCard tool={audioToTextTool} />
      {process.env.NODE_ENV === "development" || autoCaptionReleased() ? <ToolCard tool={autoCaptionTool} /> : <article className="aen-tool-card"><h2>Auto Caption Generator</h2><p>Generate, review, and style video captions. Caption Studio is currently available as a development preview.</p><span className="aen-free-tag">COMING SOON</span></article>}
    </div><div className="aen-section-link"><Link className="aen-btn aen-btn-ghost" href="/tools">Browse all free tools</Link></div></section>
  </main>;
}
