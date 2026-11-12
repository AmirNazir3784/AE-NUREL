import { notFound } from "next/navigation";
import { configuration } from "../../../../server/hybrid/config.mjs";
import { HybridWorkspace } from "@/features/hybrid-processing/hybrid-workspace";
import { ToolLayout, ToolHeader, ToolWorkspace } from "@/components/tools/tool-layout";
export const metadata = { title: "Server processing verification | AENural", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function HybridProcessingPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ToolLayout title="Server processing verification" category="Subtitle Tools" categoryHref="/tools/subtitle-tools"><ToolHeader title="Server processing verification" description="Development-only upload, CPU transcription and caption review." /><ToolWorkspace label="Server transcription verification"><HybridWorkspace available={!!configuration()} /></ToolWorkspace></ToolLayout>;
}
