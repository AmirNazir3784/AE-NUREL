import Link from "@/components/site/page-link";
import { ToolDirectory } from "@/components/tools/tool-directory";
import { tools } from "@/lib/tools";
import { directoryTools } from "@/lib/tool-directory-catalog";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("All Tools — Free Video, Image & Subtitle Tools", "Explore " + tools.length + " free tools to compress videos and images, crop footage, and edit or convert subtitles — with no signup.", "/tools");
export default function ToolsPage() { const catalog = directoryTools(process.env.NODE_ENV); return <main id="main-content" className="aen-directory-page"><header className="aen-page-hero aen-wrap"><span className="aen-eyebrow"><i />Free tools</span><h1>All Tools</h1><p>Video and subtitle tools you can use with straightforward controls. No account required.</p><Link className="aen-btn aen-btn-ghost" href="/tools/ai-tools">Explore AI transcription &amp; caption tools →</Link></header><div className="aen-wrap"><ToolDirectory catalog={catalog} /></div></main>; }
