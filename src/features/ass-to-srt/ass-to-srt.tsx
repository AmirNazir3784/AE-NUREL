"use client";
import { openAssToSrt } from "@/lib/ass-to-srt";
import { useConversion } from "@/features/conversion/use-conversion";
import { ConversionInput, ConversionNotices, ConversionDownload, ConversionReset } from "@/features/conversion/conversion-controls";
export function AssToSrtConverter() {
  const tool = useConversion(["ass", "ssa"], openAssToSrt), result = tool.state.result;
  return <div className="aen-file-converter aen-ass-to-srt"><section className="aen-conversion-panel" aria-label="ASS and SSA compatibility and conversion">
    <ConversionInput tool={tool} extensions={["ass", "ssa"]} name="ASS / SSA" />
    {result && <><div className="aen-conversion-ready" role="status"><h2>SRT ready</h2><p>{result.cueCount} dialogue cues · {result.filename}</p></div><h3 className="aen-compatibility-label">Compatibility check</h3></>}
    <ConversionNotices tool={tool} />
    {result && !result.warnings.length && <p>Dialogue text and timing can be stored in SRT.</p>}
    <ConversionDownload tool={tool} format="SRT" />
    <ConversionReset tool={tool} />
  </section></div>;
}
