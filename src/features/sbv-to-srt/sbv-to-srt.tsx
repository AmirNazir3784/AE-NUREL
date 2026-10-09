"use client";
import { openSbvToSrt } from "@/lib/sbv-to-srt";
import { useConversion } from "@/features/conversion/use-conversion";
import { ConversionInput, ConversionNotices, ConversionDownload, ConversionReset } from "@/features/conversion/conversion-controls";
export function SbvToSrtConverter() {
  const tool = useConversion(["sbv"], openSbvToSrt), result = tool.state.result;
  return <div className="aen-file-converter"><section className="aen-conversion-panel" aria-label="SBV to SRT conversion">
    <ConversionInput tool={tool} extensions={["sbv"]} name="SBV" />
    {result && <div className="aen-conversion-ready" role="status"><h2>SRT ready</h2><p>{result.cueCount} cues · {result.filename}</p></div>}
    <ConversionNotices tool={tool} /><ConversionDownload tool={tool} format="SRT" /><ConversionReset tool={tool} />
  </section></div>;
}
