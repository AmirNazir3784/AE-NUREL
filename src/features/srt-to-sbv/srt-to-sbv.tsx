"use client";
import { openSrtToSbv } from "@/lib/srt-to-sbv";
import { useConversion } from "@/features/conversion/use-conversion";
import { ConversionInput, ConversionNotices, ConversionDownload, ConversionReset } from "@/features/conversion/conversion-controls";
export function SrtToSbvConverter() {
  const tool = useConversion(["srt"], openSrtToSbv), result = tool.state.result;
  return <div className="aen-file-converter"><section className="aen-conversion-panel" aria-label="SRT to SBV conversion">
    <ConversionInput tool={tool} extensions={["srt"]} name="SRT" />
    {result && <div className="aen-conversion-ready" role="status"><h2>SBV ready</h2><p>{result.cueCount} cues · {result.filename}</p></div>}
    <ConversionNotices tool={tool} /><ConversionDownload tool={tool} format="SBV" /><ConversionReset tool={tool} />
  </section></div>;
}
