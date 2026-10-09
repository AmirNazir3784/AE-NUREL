"use client";
import { useState } from "react";
import { openVttToTxt } from "@/lib/vtt-to-txt";
import type { TranscriptFormat } from "@/lib/srt-to-txt";
import { useConversion } from "@/features/conversion/use-conversion";
import { ConversionInput, ConversionNotices, ConversionDownload, ConversionReset, CopyOutput } from "@/features/conversion/conversion-controls";

export function VttToTxtConverter() {
  const tool = useConversion(["vtt"], openVttToTxt);
  const [format, setFormat] = useState<TranscriptFormat>("lines"), result = tool.state.result;
  const content = result ? format === "lines" ? result.content : result.content.trim().split("\n").join(" ") + "\n" : "";
  function reset() { setFormat("lines"); tool.reset(); }
  return <div className="aen-file-converter aen-transcript"><section className="aen-conversion-panel" aria-label="VTT transcript extraction">
    <ConversionInput tool={tool} extensions={["vtt"]} name="VTT" onFile={file => { setFormat("lines"); tool.readFile(file); }} />
    {result && <><div className="aen-conversion-ready" role="status"><h2>Text ready</h2><p>{result.cueCount} cues · {result.filename}</p></div>
      <fieldset className="aen-output-format"><legend>Output format</legend><label><input type="radio" name="vtt-transcript-format" checked={format === "lines"} onChange={() => { setFormat("lines"); tool.feedback(""); }} />One cue per line</label><label><input type="radio" name="vtt-transcript-format" checked={format === "paragraph"} onChange={() => { setFormat("paragraph"); tool.feedback(""); }} />Paragraph text</label></fieldset>
      <label className="aen-output-label" htmlFor="vtt-transcript-output">Transcript text</label><textarea id="vtt-transcript-output" className="aen-text-output" readOnly value={content} spellCheck={false} />
    </>}
    <ConversionNotices tool={tool} />
    {result && <div className="aen-conversion-actions"><CopyOutput key={tool.state.id} content={content} label="Copy text" onCopied={() => tool.feedback("Transcript copied.")} onError={message => tool.feedback(message, true)} /><ConversionDownload tool={tool} format="TXT" content={content} /></div>}
    <ConversionReset tool={tool} onReset={reset} />
  </section></div>;
}
