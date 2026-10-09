"use client";
import { openVttToSrt } from "@/lib/vtt-to-srt";
import { useConversion } from "@/features/conversion/use-conversion";
import { ConversionInput, ConversionNotices, ConversionDownload, ConversionReset } from "@/features/conversion/conversion-controls";
export function VttToSrtConverter() {
  const tool = useConversion(["vtt"], openVttToSrt), result = tool.state.result;
  return <div className="aen-file-converter aen-vtt-to-srt"><section className="aen-conversion-panel" aria-label="VTT to SRT conversion">
    <ConversionInput tool={tool} extensions={["vtt"]} name="VTT" />
    {result && <div className="aen-conversion-ready" role="status"><h2>SRT ready</h2><p>{result.cueCount} cues · {result.filename}</p></div>}
    <ConversionNotices tool={tool} />
    <ConversionDownload tool={tool} format="SRT" />
    <ConversionReset tool={tool} />
  </section></div>;
}
