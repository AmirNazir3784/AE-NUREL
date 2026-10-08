"use client";

import Link from "next/link";
import { useReducer, useRef } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { DownloadButton } from "@/components/tools/download-button";
import { StatusMessage } from "@/components/ui/status-message";
import { Icon } from "@/components/ui/icon";
import { formatEditorTime, validateSubtitleFile } from "@/lib/subtitle-editor";
import { openSyncSubtitle, serializeSyncResult, syncFilename } from "@/lib/subtitle-sync";
import { tools } from "@/lib/tools";
import { initialSyncSession, syncSessionReducer } from "./session";
import { SyncPointControl } from "./sync-point-control";
import { SyncPreview } from "./sync-preview";

const timingAdjuster = tools.find((tool) => tool.href === "/tools/srt-timing-adjuster")!;
export function SubtitleSyncFixer() {
  const [session, dispatch] = useReducer(syncSessionReducer, initialSyncSession);
  const request = useRef(0);
  const workspace = useRef<HTMLDivElement>(null);
  const { source, result, busy } = session;
  const document = source?.document ?? null;
  const valid = !!result && !busy && !session.error;
  const timeline = document?.cues.reduce((max, cue) => Math.max(max, cue.end!), 0) ?? 0;
  const filename = document ? syncFilename(document) : "subtitles-fixed.srt";
  function showError(message: string) { dispatch({ type: "error", message }); }
  async function readFile(file: File) {
    const id = ++request.current;
    dispatch({ type: "read", id });
    try {
      validateSubtitleFile(file);
      const bytes = await file.arrayBuffer();
      if (request.current !== id) return;
      dispatch({ type: "ready", id, source: { document: openSyncSubtitle(file, bytes), size: file.size } });
    } catch (error) { dispatch({ type: "failed", id, message: (error as Error).message || `${file.name}: We could not read this file. Choose it again.` }); }
  }
  function reset() { dispatch({ type: "reset", id: ++request.current }); requestAnimationFrame(() => workspace.current?.querySelector<HTMLButtonElement>(".upload-zone button")?.focus()); }
  return <div className="subtitle-sync-tool aen-sync" ref={workspace}>
    <div className="tool-workspace sync-workspace v1-sync-workspace"><div className="editor-panel"><div className="editor-heading"><span className="section-label">Upload your subtitles</span><span className="badge accent">SRT / VTT</span></div>
      <FileUpload accept=".srt,.vtt" title="Drop your subtitle file here" buttonLabel="Choose subtitle file" hint="SRT or VTT · up to 10 MB · 10,000 subtitles" description="Fix subtitles that drift out of sync as the video plays." filename={document?.filename} detail={source ? `${document!.format.toUpperCase()} · ${document!.cues.length} subtitles · ${(source.size / 1024).toFixed(1)} KB · Ready` : undefined} busy={busy} validateFile={validateSubtitleFile} onFile={readFile} onError={showError} />
      {document && <p className="sync-timeline"><Icon name="clock" size={15} />Subtitle timeline: <strong>{formatEditorTime(timeline, document.format)}</strong></p>}
      {document && <form className="sync-setup" onSubmit={(event) => { event.preventDefault(); dispatch({ type: "fix" }); }}><h2 className="section-label">Set two reference times</h2><p className="sync-guidance">Choose one subtitle near the beginning and another near the end. Enter when each subtitle should actually appear in the video.</p>
        {document && !busy ? <>{([0, 1] as const).map((index) => <SyncPointControl key={`${session.requestId}-${index}`} index={index} document={document} point={session.points[index]} errors={session.fields} onChange={(field, value) => dispatch({ type: "point", index, field, value })} onCue={(cueId, current) => dispatch({ type: "cue", index, cueId, current })} />)}<button className="button button-primary sync-fix-button" type="submit"><Icon name="subtitle-sync" size={18} />Fix sync</button><p className="field-note">Use two reliable moments as far apart as practical. A gradual correction changes subtitle durations slightly, too.</p></> : <p className="sync-setup-empty">{busy ? "Your sync controls will appear once the file is ready." : "Upload a file to choose your two points."}</p>}
      </form>}
      {session.error && <StatusMessage tone="error">{session.error}</StatusMessage>}
      {result?.clampedCues ? <StatusMessage tone="warning">{result.clampedCues} {result.clampedCues === 1 ? "cue had" : "cues had"} timestamps before zero. Affected timestamps were clamped to 00:00:00,000; every cue still has a valid duration.</StatusMessage> : null}
      {result?.significantChange && <StatusMessage tone="warning">This correction changes subtitle timing significantly. Check the correction summary before downloading.</StatusMessage>}
      <SyncPreview source={document} result={valid ? result : null} busy={busy} />
      {(source || busy || session.error) && <div className="download-section"><div className="download-heading"><span className="section-label">Save fixed subtitles</span>{(source || busy || session.error) && <button className="text-button" type="button" onClick={reset}><Icon name="reset" size={14} />Start over</button>}</div>
        <DownloadButton content={valid ? () => serializeSyncResult(result) : null} filename={filename} label={`Download corrected ${document?.format.toUpperCase() ?? "subtitles"}`} mimeType={document?.format === "vtt" ? "text/vtt;charset=utf-8" : "application/x-subrip;charset=utf-8"} disabled={!valid} onDownloaded={() => dispatch({ type: "download", filename })} onError={showError} />
        <p className="download-help">{valid ? "Download in your original format." : document ? "Set both sync points and choose Fix sync first." : "Upload subtitles to get started."}</p>{session.message && <StatusMessage tone="success">{session.message}</StatusMessage>}
      </div>}<p className="sync-constant-help">Are all subtitles early or late by the same amount? <Link href={timingAdjuster.href}>Use {timingAdjuster.title}.</Link></p>
    </div></div>
  </div>;
}
