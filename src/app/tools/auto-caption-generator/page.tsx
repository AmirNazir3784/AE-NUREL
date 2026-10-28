import { notFound } from "next/navigation";
import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import { CaptionEntry } from "@/features/caption-studio/caption-entry";
import { CaptionEditorial } from "@/features/caption-page/caption-editorial";
import { CaptionHeroFilm } from "@/features/caption-page/caption-imagery";
import { CaptionMotion } from "@/features/caption-page/caption-motion";
import { configuration } from "../../../../server/hybrid/config.mjs";
import "@/features/caption-page/caption-website.css";
import "@/features/caption-page/caption-editorial-visuals.css";
import { autoCaptionAvailable, autoCaptionReleased } from "@/lib/caption-release";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = {
  ...pageMetadata("Auto Caption Generator — Create Styled Video Captions", "Generate timed captions from video speech, edit text and timing, customize the style, and export captioned video or SRT/VTT subtitles.", "/tools/auto-caption-generator"),
  robots: { index: autoCaptionReleased(), follow: autoCaptionReleased() },
};
export const dynamic = "force-dynamic";

export default async function AutoCaptionGeneratorPage({searchParams}:{searchParams:Promise<{project?:string}>}) {
  if (!autoCaptionAvailable()) notFound();
  const {project}=await searchParams;
  const projectId=project&&/^[a-f0-9-]{36}$/i.test(project)?project:undefined;
  return <main id="main-content" className="cap-page">
    <CaptionMotion />
    <div className="cap-website-top">
      <nav className="cap-breadcrumb aen-wrap" aria-label="Breadcrumb"><Link href="/tools/ai-tools">AI Tools</Link><span>/</span><span aria-current="page">Auto Caption Generator</span></nav>
      <div className="cap-tool-hero aen-wrap">
        <header className="cap-website-intro"><h1>Auto Caption<br /><span>Generator</span></h1><p className="cap-website-lede">Let every word be seen.</p><p>Turn spoken audio into captions, shape their style, and export a video that feels like yours.</p><div className="cap-website-links"><a className="cap-text-link" href="#caption-guide">Read the caption guide ↓</a></div><div className="cap-website-trust"><span><Icon name="check" size={14} />On-device transcription</span><span><Icon name="check" size={14} />Real word timing</span><span><Icon name="check" size={14} />Video + subtitle exports</span></div></header>
        <div className="cap-hero-stage"><CaptionHeroFilm /><section id="caption-studio" className="cap-workbench" aria-label="Video caption workspace"><div className="cap-workbench-bar"><span><i />START WITH YOUR VIDEO</span><span>MP4 · MOV · WebM</span></div><CaptionEntry transcriptionAvailable={!!configuration()} projectId={projectId} accessEnabled /></section></div>
      </div>
      <div className="cap-website-footnote aen-wrap"><span>Up to 2 minutes · 200 MiB · 1080p</span><span>Generate, edit and style captions on your device.</span></div>
    </div>
    <CaptionEditorial />
  </main>;
}
