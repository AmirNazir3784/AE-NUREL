import { ToolDirectory } from "@/components/tools/tool-directory";
import { tools } from "@/lib/tools";
import { directoryTools } from "@/lib/tool-directory-catalog";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("All Tools — Free Subtitle Tools Online", "Explore " + tools.length + " free subtitle tools for editing, timing, merging, splitting, and converting subtitle files — with no signup.", "/tools");
export default function ToolsPage() { const catalog = directoryTools(process.env.NODE_ENV); return <main id="main-content" className="aen-directory-page"><header className="aen-page-hero aen-wrap"><span className="aen-eyebrow"><i />Free tools</span><h1>All Tools</h1><p>Subtitle tools you can use in your browser. No account required.</p></header><div className="aen-wrap"><ToolDirectory catalog={catalog} /></div></main>; }
