import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SubtitleSyncFixer } from "@/features/subtitle-sync-fixer/subtitle-sync-fixer";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
import "@/features/subtitle-sync-fixer/subtitle-sync.css";
export const metadata = pageMetadata("Subtitle Sync Fixer — Fix Subtitles That Drift Out of Sync", "Fix subtitles that gradually drift out of sync using two reference times — one near the start, one near the end. Free online, no signup required.", "/tools/subtitle-sync-fixer");
export default function ToolPage() { return <ToolLayout title="Subtitle Sync Fixer" category="Subtitle Tools" categoryHref="/tools/subtitle-tools"><ToolHeader title="Subtitle Sync Fixer" description="Fix subtitles that gradually go out of sync using two reference times." toolIcon="subtitle-sync" /><ToolWorkspace label="Subtitle Sync Fixer"><SubtitleSyncFixer /></ToolWorkspace><section className="v1-support"><h2>Choose reliable reference times</h2><p>Use one moment near the beginning and another near the end. A gradual correction changes subtitle durations slightly. This cannot fix sudden jumps in timing; review the result in your video player.</p></section><RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/subtitle-sync-fixer"].map((href) => tools.find((t) => t.href === href)!)} /></ToolLayout>; }
