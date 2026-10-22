"use client";

import { useReducer, useRef } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { DownloadButton } from "@/components/tools/download-button";
import { StatusMessage } from "@/components/ui/status-message";
import { Icon } from "@/components/ui/icon";
import { validateSrtFile } from "@/lib/srt";
import { openSrtConversion } from "@/lib/srt-to-vtt";
import { conversionSessionReducer, initialConversionSession, serializeConversionSession } from "./session";

export function SrtToVttConverter() {
  const [state, dispatch] = useReducer(conversionSessionReducer, initialConversionSession);
  const request = useRef(0), root = useRef<HTMLDivElement>(null);
  const { conversion, busy } = state;
  async function readFile(file: File) {
    const id = ++request.current;
    dispatch({ type: "read", id });
    try {
      validateSrtFile(file);
      const bytes = await file.arrayBuffer();
      if (request.current !== id) return;
      dispatch({ type: "ready", id, conversion: openSrtConversion(file, bytes), size: file.size });
    } catch (error) {
      dispatch({ type: "failed", id, message: error instanceof Error ? error.message : `${file.name}: We could not read this file. Choose it again.` });
    }
  }
  function reset() {
    dispatch({ type: "reset", id: ++request.current });
    requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(".upload-zone button")?.focus());
  }
  return <div className="srt-converter aen-converter" ref={root}>
    <section className="conversion-station" aria-label="SRT to WebVTT conversion">
      {!conversion && <div className="conversion-format-label" aria-label="SRT to VTT">SRT<Icon name="arrow" size={18} />VTT</div>}
      <FileUpload accept=".srt" title="Add your SRT file" description="Choose a file or drop it here." buttonLabel="Choose SRT file" hint="SRT only · up to 10 MB · 10,000 subtitles" filename={conversion?.source.filename} detail={conversion ? `SRT · ${conversion.source.cues.length} subtitles · ${(state.size / 1024).toFixed(1)} KB · Ready` : undefined} busy={busy} validateFile={validateSrtFile} onFile={readFile} onError={(message) => dispatch({ type: "rejected", id: ++request.current, message })} />
      { /* This conversion goes straight to download. */ }
      {conversion && <>
        <section className="conversion-download" aria-label="Converted file download">
          <div role="status" aria-atomic="true"><span className="conversion-ready"><Icon name="check" size={18} />VTT ready</span><h2>{conversion.source.cues.length} {conversion.source.cues.length === 1 ? "subtitle" : "subtitles"} converted</h2><p>{conversion.filename}</p></div>
          <DownloadButton content={state.error ? null : () => serializeConversionSession(state)} filename={conversion.filename} label="Download VTT" mimeType="text/vtt;charset=utf-8" disabled={!!state.error || busy} onDownloaded={() => dispatch({ type: "download" })} onError={(message) => dispatch({ type: "error", message })} />
          {conversion.warnings.map((warning) => <StatusMessage tone="warning" key={warning}>{warning}</StatusMessage>)}
        </section>
        
      </>}
      {state.error && <StatusMessage tone="error">{state.error}</StatusMessage>}
      {(conversion || busy || state.error) && <div className="conversion-reset"><button className="text-button" type="button" onClick={reset}><Icon name="reset" size={16} />Start over</button></div>}
    </section>
  </div>;
}
