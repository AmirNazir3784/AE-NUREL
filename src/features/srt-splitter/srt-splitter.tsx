"use client";

import { useMemo, useReducer, useRef } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { DownloadButton } from "@/components/tools/download-button";
import { StatusMessage } from "@/components/ui/status-message";
import { Icon } from "@/components/ui/icon";
import { formatTimestamp, validateSrtFile } from "@/lib/srt";
import { parseSplitSource, splitSrt } from "@/lib/srt-split";
import { createSplitZip, splitArchiveFilename } from "@/lib/srt-split-zip";
import { initialSplitSession, splitSessionReducer } from "./session";
import { SplitControls } from "./split-controls";
import { SplitResults } from "./split-results";

export function SrtSplitter() {
  const [session, dispatch] = useReducer(splitSessionReducer, initialSplitSession);
  const request = useRef(0);
  const workspace = useRef<HTMLDivElement>(null);
  const { source, busy, method, values, timestamps, error, message } = session;
  const calculation = useMemo(() => {
    if (!source || busy) return { result: null, error: "" };
    try { return { result: splitSrt(source.document, source.name, { method, value: values[method], timestamps }), error: "" }; }
    catch (error) { return { result: null, error: (error as Error).message }; }
  }, [source, busy, method, values, timestamps]);
  const result = calculation.result;
  const valid = !!result && !error && !busy;
  const timeline = source?.document.cues.reduce((max, cue) => Math.max(max, cue.end), 0);
  const archiveName = splitArchiveFilename(source?.name ?? "subtitles.srt");
  function showError(message: string) { dispatch({ type: "error", message }); }
  async function readFile(file: File) {
    const id = ++request.current;
    dispatch({ type: "read", id });
    try {
      validateSrtFile(file);
      const bytes = await file.arrayBuffer();
      if (request.current !== id) return;
      dispatch({ type: "ready", id, source: { name: file.name, size: file.size, document: parseSplitSource(file, bytes) } });
    } catch (error) { dispatch({ type: "failed", id, message: error instanceof Error ? error.message : `${file.name}: We could not read this file. Choose it again.` }); }
  }
  function reset() {
    dispatch({ type: "reset", id: ++request.current });
    requestAnimationFrame(() => workspace.current?.querySelector<HTMLButtonElement>(".upload-zone button")?.focus());
  }
  return <>
    <div className="tool-workspace split-workspace v1-split-workspace aen-splitter" ref={workspace}>
      <div className="editor-panel"><div className="editor-heading"><span className="section-label">Upload your subtitles</span><span className="badge accent">.SRT</span></div>
        <FileUpload accept=".srt" title="Add your SRT subtitles" buttonLabel="Choose SRT file" hint=".srt only · up to 10 MB" description="Choose one subtitle file to divide into smaller parts." filename={source?.name} detail={source ? `${source.document.cues.length} subtitles · ${(source.size / 1024).toFixed(1)} KB · Ready` : undefined} busy={busy} validateFile={validateSrtFile} onFile={readFile} onError={showError} />
        {source && <p className="split-timeline"><Icon name="clock" size={15} />Subtitle timeline: <strong>{formatTimestamp(timeline!)}</strong></p>}
        {error && <StatusMessage tone="error">{error}{source && <span className="retained-file-note">Your current file is still selected.</span>}</StatusMessage>}
        {source && <><SplitControls method={method} value={values[method]} timestamps={timestamps} disabled={!source || busy} error={calculation.error} onMethod={(method) => dispatch({ type: "method", method })} onValue={(value) => dispatch({ type: "value", value })} onTimestamps={(timestamps) => dispatch({ type: "timestamps", timestamps })} />
        <div className="download-section"><div className="download-heading"><span className="section-label">Download your parts</span>{(source || busy || error) && <button type="button" className="text-button" onClick={reset}><Icon name="reset" size={14} />Start over</button>}</div>
          {valid && <p className="adjustment-summary">{result.parts.length} files · {result.parts.length <= 6 ? `${result.parts.map((part) => part.cues.length).join(" / ")} cues` : `${result.cueCount} cues total`}</p>}
          <DownloadButton content={valid ? () => createSplitZip(result) : null} filename={archiveName} label="Download all parts (ZIP)" mimeType="application/zip" disabled={!valid} onDownloaded={() => dispatch({ type: "download", filename: archiveName, all: true })} onError={showError} />
          <p className="download-help">{source ? "One ZIP with every part. Individual files are available in the output list." : "Upload a file to get started."}</p>
          {message && <StatusMessage tone="success">{message}</StatusMessage>}
        </div></>}
        {!source && busy && <button type="button" className="text-button" onClick={reset}>Start over</button>}
      </div>
      <SplitResults result={valid ? result : null} busy={busy} blocked={!!calculation.error || !!error} onDownloaded={(filename) => dispatch({ type: "download", filename })} onError={showError} />
    </div>
  </>;
}
