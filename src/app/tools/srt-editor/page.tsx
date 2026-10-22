import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SrtEditor } from "@/features/srt-editor/srt-editor";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = pageMetadata("Subtitle Editor — Edit SRT & VTT Subtitles Online", "Edit subtitle text and timing in SRT or VTT files, fixing words and timestamps cue by cue, with undo and redo. Free online editor, no signup required.", "/tools/srt-editor");
export default function ToolPage() { return <ToolLayout title="Subtitle Editor" category="Subtitle Tools" categoryHref="/tools/subtitle-tools"><ToolHeader title="Subtitle Editor" description="Edit subtitle text and timing in SRT or VTT files." toolIcon="srt-editor" /><ToolWorkspace label="Subtitle Editor"><SrtEditor /></ToolWorkspace><section className="v1-support"><h2>Keep a copy of your edits</h2><p>Download before you leave. Changes stay in memory and are not saved automatically. Invalid text or timing must be fixed before export; overlap and reading-speed warnings help you review your file.</p></section><RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/srt-editor"].map((href) => tools.find((t) => t.href === href)!)} /></ToolLayout>; }
