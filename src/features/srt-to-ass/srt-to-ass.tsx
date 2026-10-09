"use client";
import { openSrtToAss } from "@/lib/srt-to-ass";
import { useConversion } from "@/features/conversion/use-conversion";
import { ConversionInput, ConversionNotices, ConversionDownload, ConversionReset } from "@/features/conversion/conversion-controls";
export function SrtToAssConverter() {
  const tool = useConversion(["srt"], openSrtToAss), result = tool.state.result;
  return <div className="aen-file-converter aen-srt-to-ass"><section className="aen-conversion-panel" aria-label="SRT to ASS conversion">
    <ConversionInput tool={tool} extensions={["srt"]} name="SRT" />
    {result && <div className="aen-conversion-ready" role="status"><h2>ASS ready</h2><p>{result.cueCount} cues · {result.filename}</p></div>}
    <ConversionNotices tool={tool} />
    <ConversionDownload tool={tool} format="ASS" />
    <ConversionReset tool={tool} />
  </section></div>;
}
