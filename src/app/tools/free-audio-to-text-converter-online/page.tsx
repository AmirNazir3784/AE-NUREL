import Link from "@/components/site/page-link";
import { RelatedTools } from "@/components/tools/tool-layout";
import { SubtitleWorkspace } from "@/features/local-asr/subtitle-workspace";
import { AudioBenefits, AudioEditorial, AudioHero } from "@/features/audio-to-text/audio-editorial";
import { pageMetadata } from "@/lib/site-metadata";
import { tools } from "@/lib/tools";
import "@/features/audio-to-text/audio-page.css";

export const metadata = { ...pageMetadata(
  "Free Audio to Text Converter Online | AI Transcription",
  "Convert MP3 recordings and spoken audio into editable text online. Explore free AI transcription, video-to-text options, language support, and easy downloads.",
  "/tools/free-audio-to-text-converter-online",
), title: { absolute: "Free Audio to Text Converter Online | AI Transcription" } };

export default function AudioToTextPage() {
  return <main id="main-content" className="aen-audio-page">
    <section className="tool-area" id="top">
      <div className="narrow">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/tools/ai-tools">AI Tools</Link><span>/</span><strong aria-current="page">Audio to Text</strong></nav>
        <AudioHero />
        <section className="upload-panel live-transcription" id="tool" aria-label="Audio to text converter"><SubtitleWorkspace transcript /></section>
      </div>
      <AudioBenefits />
    </section>
    <AudioEditorial />
    <div className="wide audio-related"><RelatedTools title="More subtitle tools" tools={tools.filter(tool => ["/tools/srt-editor", "/tools/srt-to-txt", "/tools/srt-to-sbv"].includes(tool.href))} /></div>
  </main>;
}
