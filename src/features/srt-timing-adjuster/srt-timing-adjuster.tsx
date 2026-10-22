"use client";

import { useMemo, useReducer, useRef } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { DownloadButton } from "@/components/tools/download-button";
import { StatusMessage } from "@/components/ui/status-message";
import { Icon } from "@/components/ui/icon";
import {
  adjustedFilename,
  decodeSrt,
  parseOffset,
  parseSrt,
  shiftSrt,
  validateSrtFile,
} from "@/lib/srt";
import { OffsetControl } from "./offset-control";
import { SubtitlePreview } from "./subtitle-preview";
import { initialSession, sessionReducer } from "./session";


export function SrtTimingAdjuster() {
  const [session, dispatch] = useReducer(sessionReducer, initialSession);
  const { uploaded, value, busy, fileError } = session;
  const request = useRef(0);
  const workspace = useRef<HTMLDivElement>(null);

  const calculation = useMemo(() => {
    let offset: number;
    try {
      offset = parseOffset(value);
    } catch (error) {
      return { offset: 0, error: (error as Error).message, result: null };
    }
    try {
      return {
        offset,
        error: "",
        result: uploaded ? shiftSrt(uploaded.document, offset) : null,
      };
    } catch (error) {
      return { offset, error: (error as Error).message, result: null };
    }
  }, [uploaded, value]);

  async function readFile(file: File) {
    const currentRequest = ++request.current;
    dispatch({ type: "upload-started" });
    try {
      validateSrtFile(file);
      const bytes = await file.arrayBuffer();
      // Ignore a pending read after Start over or a newer file selection.
      if (currentRequest !== request.current) return;
      const document = parseSrt(decodeSrt(bytes));
      dispatch({ type: "upload-succeeded", uploaded: { name: file.name, size: file.size, document } });
    } catch (error) {
      if (currentRequest === request.current) {
        dispatch({ type: "upload-failed", message: error instanceof Error ? error.message : "We could not read this file. Please choose it again." });
      }
    }
  }

  function reset() {
    request.current++;
    dispatch({ type: "reset" });
    // The reset button disappears; return keyboard focus to the next available action.
    requestAnimationFrame(() => workspace.current?.querySelector<HTMLButtonElement>(".upload-zone button")?.focus());
  }

  function changeOffset(next: string) {
    dispatch({ type: "offset-changed", value: next });
  }

  const filename = uploaded ? adjustedFilename(uploaded.name, calculation.offset) : "adjusted.srt";
  const valid = !!calculation.result && !busy;
  const clamped = valid ? calculation.result?.clampedCues ?? 0 : 0;
  function showError(message: string) { dispatch({ type: "error", message }); }

  return <div className="tool-workspace v1-timing-workspace aen-timing" ref={workspace}><div className="editor-panel">
    <FileUpload accept=".srt" title="Add your SRT subtitles" buttonLabel="Choose SRT file" hint="SRT · up to 10 MB" description="Choose a file or drop it here." filename={uploaded?.name} detail={uploaded ? uploaded.document.cues.length + " subtitles · " + (uploaded.size / 1024).toFixed(1) + " KB" : undefined} busy={busy} validateFile={validateSrtFile} onFile={readFile} onError={showError} />
    {fileError && <StatusMessage tone="error">{fileError}{uploaded && <span className="retained-file-note">Your current file is still selected.</span>}</StatusMessage>}
    {uploaded && <><OffsetControl value={value} onChange={changeOffset} error={!busy ? calculation.error || undefined : undefined} disabled={busy} /><SubtitlePreview document={uploaded.document} offset={calculation.offset} offsetError={calculation.error} loading={busy} />
    {valid && <p className="adjustment-summary" role="status">{calculation.offset === 0 ? "Original timing kept." : "All subtitles move " + Math.abs(calculation.offset) / 1000 + " seconds " + (calculation.offset > 0 ? "later." : "earlier.")}</p>}
    {clamped > 0 && <StatusMessage tone="warning">{clamped} {clamped === 1 ? "subtitle reaches" : "subtitles reach"} before zero. Affected timestamps stop at 00:00:00,000; some subtitles may have no duration.</StatusMessage>}
    <div className="v1-result-actions"><DownloadButton content={calculation.result?.content ?? null} filename={filename} label="Download adjusted SRT" mimeType="application/x-subrip;charset=utf-8" disabled={!valid || busy} onDownloaded={() => dispatch({ type: "download-started", message: "Download started: " + filename })} onError={showError} /><button className="text-button" type="button" onClick={reset}><Icon name="reset" size={16} />Start over</button></div></>}
  </div></div>;
}
