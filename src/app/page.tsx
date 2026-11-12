import { autoCaptionVisible } from "@/lib/caption-release";
import { accountPreviewAvailable } from "@/lib/account-preview";
import Link from "@/components/site/page-link";
import { HomeVideo } from "@/components/home/home-video";
import { HomeVideoProvider } from "@/components/home/home-video-modal";
import { LowerHomepage } from "@/components/home/lower-homepage";
import { pageMetadata } from "@/lib/site-metadata";
const homepageMetadata = pageMetadata("Free Subtitle Tools & Source Window for Editors", "Free online subtitle tools to edit, fix timing, merge, split, and convert SRT and VTT files — with no signup. Plus Source Window, AENural's upcoming tool for After Effects.", "/");
const homepageTitle = "AENural | Free Subtitle Tools & Source Window for Editors";
export const metadata = {
  ...homepageMetadata,
  title: { absolute: homepageTitle },
  openGraph: { ...homepageMetadata.openGraph, title: homepageTitle },
  twitter: { ...homepageMetadata.twitter, title: homepageTitle },
};
export default function Home() {
  return <HomeVideoProvider><main id="main-content" className="aen-home">
    <section className="aen-hero"><div className="aen-wrap aen-hero-inner"><p className="aen-hero-audience">Built for editors &amp; motion designers</p><h1>Finally, someone heard editors’ pain<br /><span>and built a toolkit.</span></h1><p className="aen-lede">AENural builds focused tools that take the friction out of editing in After Effects — plus free online utilities anyone can use. One home for all of it.</p><div className="aen-hero-actions"><Link className="aen-btn aen-btn-primary aen-btn-lg" href={autoCaptionVisible() ? "/tools/auto-caption-generator" : "/tools/ai-tools"}>Try Auto Caption Generator <span aria-hidden="true">↗</span></Link><Link className="aen-btn aen-btn-ghost aen-btn-lg" href="/tools">Browse free tools</Link></div><p className="aen-hero-sub">Browser-first caption editing　 Styled video + SRT / VTT</p><p className="aen-hero-sub"><Link href="/source-window">Working in After Effects? Meet Source Window ↗</Link></p>{accountPreviewAvailable() && <p className="aen-hero-sub"><Link href="/pricing">Compare plans &amp; pricing</Link></p>}<HomeVideo hero src="/videos/source-window.mp4" poster="/videos/source-window-poster.jpg" label="Source Window overview" /></div></section>
    <section className="aen-band aen-alt"><div className="aen-wrap"><article className="aen-feature"><div className="aen-feature-copy"><span className="aen-tag">Upcoming · After Effects</span><h2>Source Window</h2><p>AENural’s main product for After Effects. Source Window sits at the heart of AENural, alongside a collection of focused online tools for everyday editing tasks.</p><Link className="aen-btn aen-btn-primary" href="/source-window">Meet Source Window</Link></div><HomeVideo src="/videos/source-window-feature.mp4" poster="/videos/source-window-feature-poster.jpg" label="Source Window features" /></article></div></section>
    <LowerHomepage />
  </main></HomeVideoProvider>;
}
