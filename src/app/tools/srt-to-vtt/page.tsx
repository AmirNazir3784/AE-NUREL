import { RelatedTools, ToolHeader, ToolLayout, ToolWorkspace } from "@/components/tools/tool-layout";
import { SrtToVttConverter } from "@/features/srt-to-vtt/srt-to-vtt";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import { pageMetadata } from "@/lib/site-metadata";
import "@/features/srt-to-vtt/srt-to-vtt.css";
export const metadata = pageMetadata("SRT to VTT Converter", "Convert an SRT file to VTT for web video players. Free to use, with no signup required.", "/tools/srt-to-vtt");
export default function ToolPage() { return <ToolLayout title="SRT to VTT Converter" category="Subtitle Tools" categoryHref="/tools/subtitle-tools"><ToolHeader title="SRT to VTT Converter" description="Convert an SRT file to VTT for web video players." toolIcon="srt-to-vtt" /><ToolWorkspace label="SRT to VTT Converter"><SrtToVttConverter /></ToolWorkspace><section className="v1-support"><h2>Only the format changes</h2><p>Subtitle wording, line breaks, timing, and order are kept. Unsupported formatting is shown as text with a warning. SRT positioning settings are omitted. VTT uses dots instead of commas in timestamps.</p></section><RelatedTools title="Useful next tools" tools={relevantRoutes["/tools/srt-to-vtt"].map((href) => tools.find((t) => t.href === href)!)} /></ToolLayout>; }
