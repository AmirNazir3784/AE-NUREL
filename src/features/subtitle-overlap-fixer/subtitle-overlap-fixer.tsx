"use client";

import { useReducer, useRef } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { DownloadButton } from "@/components/tools/download-button";
import { StatusMessage } from "@/components/ui/status-message";
import { Icon } from "@/components/ui/icon";
import { formatEditorTime, validateSubtitleFile } from "@/lib/subtitle-editor";
import { openOverlapSubtitle, overlapFilename } from "@/lib/subtitle-overlap";
import { activeOverlapDocument, initialOverlapSession, overlapSessionReducer, serializeOverlapSession } from "./session";
import { OverlapFixControls } from "./overlap-fix-controls";
import { OverlapIssueList } from "./overlap-issue-list";


export function SubtitleOverlapFixer() {
  const [state, dispatch] = useReducer(overlapSessionReducer, initialOverlapSession);
  const request = useRef(0), root = useRef<HTMLDivElement>(null);
  const { source, issues, result, busy } = state;
  const document = source?.document;
  const currentDocument = activeOverlapDocument(state);
  const currentIssues = result?.remaining ?? issues;
  const filename = currentDocument ? overlapFilename(currentDocument) : "subtitles-fixed.srt";
  const timeline = currentDocument?.cues.reduce((end, cue) => Math.max(end, cue.end!), 0) ?? 0;
  const selected = issues.length - state.excluded.length;
  async function readFile(file: File) {
    const id = ++request.current;
    dispatch({ type: "read", id });
    try {
      validateSubtitleFile(file);
      const bytes = await file.arrayBuffer();
      if (request.current !== id) return;
      dispatch({ type: "ready", id, source: { document: openOverlapSubtitle(file, bytes), size: file.size } });
    } catch (error) { dispatch({ type: "failed", id, message: (error as Error).message || `${file.name}: We could not read this file. Try again.` }); }
  }
  function reset() { dispatch({ type: "reset", id: ++request.current }); requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(".upload-zone button")?.focus()); }
  return <div className="overlap-tool aen-overlap" ref={root}>
    <section className="overlap-analysis" aria-label="File and overlap analysis"><div className="overlap-analysis-heading"><div><h2>{document ? "Subtitle timing" : "Add your subtitles"}</h2></div>{(source || busy || state.error) && <button className="text-button" type="button" onClick={reset}><Icon name="reset" size={16} />Start over</button>}</div>
      <FileUpload accept=".srt,.vtt" title="Choose subtitles to check" buttonLabel="Choose subtitle file" description="Find timing conflicts before making any changes." hint="SRT or VTT · up to 10 MB · 10,000 subtitles" filename={document?.filename} detail={source ? `${document!.format.toUpperCase()} · ${document!.cues.length} subtitles · ${(source.size / 1024).toFixed(1)} KB · Ready` : undefined} busy={busy} onFile={readFile} validateFile={validateSubtitleFile} onError={(message) => dispatch({ type: "upload-error", id: ++request.current, message })} />
      {currentDocument && <div className="overlap-analysis-metrics" role="status"><div className={currentIssues.length ? "has-overlaps" : "no-overlaps"}><Icon name={currentIssues.length ? "warning" : "check"} /><strong>{result ? `${currentIssues.length} ${currentIssues.length === 1 ? "overlap" : "overlaps"} remaining` : currentIssues.length ? `${currentIssues.length} ${currentIssues.length === 1 ? "overlap" : "overlaps"} found` : "No overlaps found"}</strong></div><span>{currentDocument.cues.length} subtitles checked</span><span>Timeline: <strong>{formatEditorTime(timeline, currentDocument.format)}</strong></span></div>}
    </section>
    {state.error && <StatusMessage tone="error">{state.error}</StatusMessage>}
    {document && !issues.length ? <section className="overlap-clean" aria-labelledby="overlap-clean-title"><div><Icon name="check" size={30} /></div><h2 id="overlap-clean-title">No subtitle overlaps found</h2><p>No overlapping timing in your {document.cues.length} subtitles. No changes are needed.</p><button className="button button-primary" type="button" onClick={reset}>Choose another file</button></section> : document && <>
      <OverlapFixControls mode={state.mode} gap={state.gap} count={selected} applied={!!result} onMode={(mode) => dispatch({ type: "mode", mode })} onGap={(value) => dispatch({ type: "gap", value })} onFix={() => dispatch({ type: "fix" })} />
      {result && <section className="overlap-verification" aria-label="Repair results"><div role="status"><Icon name={result.remaining.length ? "warning" : "check"} size={24} /><div><h2>{result.fixed} {result.fixed === 1 ? "overlap" : "overlaps"} fixed · {result.remaining.length} remaining</h2><p>{result.remaining.length ? `${result.remaining.length} ${result.remaining.length === 1 ? "overlap needs" : "overlaps need"} review before you use this file.` : "Timing checked again. No adjacent overlaps remain."}{result.excluded.length > 0 ? ` ${result.excluded.length} ${result.excluded.length === 1 ? "overlap was" : "overlaps were"} left unchanged by your choice.` : ""}</p></div></div><div className="overlap-result-actions"><button className="button button-secondary" type="button" onClick={() => dispatch({ type: "undo" })}><Icon name="reset" size={16} />Undo fixes</button><DownloadButton content={!state.error ? () => serializeOverlapSession(state) : null} filename={filename} label={`Download fixed ${document.format.toUpperCase()}`} mimeType={document.format === "vtt" ? "text/vtt;charset=utf-8" : "application/x-subrip;charset=utf-8"} disabled={!!state.error || busy} onDownloaded={() => dispatch({ type: "download", filename })} onError={(message) => dispatch({ type: "error", message })} /></div></section>}
      {state.message && <StatusMessage tone={state.downloaded ? "success" : "info"}>{state.message}</StatusMessage>}
      <OverlapIssueList key={`${state.requestId}-${result ? "fixed" : "original"}`} source={document} issues={issues} result={result} excluded={state.excluded} onToggle={(index) => dispatch({ type: "exclude", index })} />
    </>}
  </div>;
}
