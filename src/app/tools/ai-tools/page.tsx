import Link from "@/components/site/page-link";
import { ToolCard } from "@/components/home/tool-card";
import { audioToTextTool, autoCaptionTool } from "@/lib/ai-tools";
import { pageMetadata } from "@/lib/site-metadata";
import { autoCaptionVisible } from "@/lib/caption-release";
import { mediaTools } from "@/lib/media-tools";

export const metadata = pageMetadata("AI Tools — Video, Audio & Captions", "Explore AENural AI tools for speech transcription, video eye contact and editable captions.", "/tools/ai-tools");

export default function AiToolsPage() {
  return <main id="main-content" className="aen-directory-page">
    <header className="aen-page-hero aen-wrap"><span className="aen-eyebrow"><i />Video, audio &amp; captions</span><h1>AI Tools</h1><p>Transcribe speech, create timed captions and refine eye contact in your videos.</p></header>
    <section className="aen-wrap aen-directory-section" aria-label="AI tools"><div className="aen-tools-grid">
      <ToolCard tool={audioToTextTool} />
      {autoCaptionVisible() ? <ToolCard tool={autoCaptionTool} /> : <article className="aen-tool-card"><h2>Auto Caption Generator</h2><p>Generate, review, and style video captions. Caption Studio is currently available as a development preview.</p><span className="aen-free-tag">COMING SOON</span></article>}
      {mediaTools.map(tool => <ToolCard key={tool.href} tool={tool} />)}
    </div><div className="aen-section-link"><Link className="aen-btn aen-btn-ghost" href="/tools">Browse all free tools</Link></div></section>
  </main>;
}
