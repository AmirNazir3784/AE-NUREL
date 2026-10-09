import { notFound } from "next/navigation";
import { EngineLab } from "@/features/local-asr/engine-lab";
import { ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
export const metadata = { title: "Local transcription verification | AENural", robots: { index: false, follow: false } };
export default function EngineLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ToolLayout title="Local transcription verification" category="Subtitle Tools" categoryHref="/tools/subtitle-tools"><ToolHeader title="Local transcription verification" description="Development verification; not a released tool." /><ToolWorkspace label="Local AI engine verification"><EngineLab /></ToolWorkspace></ToolLayout>;
}
