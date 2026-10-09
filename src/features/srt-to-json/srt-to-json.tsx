"use client";
import { openSrtToJson } from "@/lib/srt-to-json";
import { useConversion } from "@/features/conversion/use-conversion";
import { ConversionInput, ConversionNotices, ConversionDownload, ConversionReset, CopyOutput } from "@/features/conversion/conversion-controls";
export function SrtToJsonConverter() {
  const tool = useConversion(["srt"], openSrtToJson), result = tool.state.result;
  return <div className="aen-file-converter aen-json-converter"><section className="aen-conversion-panel" aria-label="SRT to JSON conversion">
    <ConversionInput tool={tool} extensions={["srt"]} name="SRT" />
    {result && <><div className="aen-conversion-ready" role="status"><h2>JSON ready</h2><p>{result.cueCount} cue objects · {result.filename}</p></div>
      <label className="aen-output-label" htmlFor="json-output">JSON array</label><textarea id="json-output" className="aen-text-output aen-code-output" readOnly value={result.content} spellCheck={false} wrap="off" />
    </>}
    <ConversionNotices tool={tool} />
    {result && <div className="aen-conversion-actions"><CopyOutput key={tool.state.id} content={result.content} label="Copy JSON" onCopied={() => tool.feedback("JSON copied.")} onError={message => tool.feedback(message, true)} /><ConversionDownload tool={tool} format="JSON" mimeType="application/json;charset=utf-8" /></div>}
    <ConversionReset tool={tool} />
  </section></div>;
}
