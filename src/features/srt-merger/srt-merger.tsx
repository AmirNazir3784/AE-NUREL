"use client";

import { useMemo, useReducer, useRef } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { DownloadButton } from "@/components/tools/download-button";
import { Icon } from "@/components/ui/icon";
import { StatusMessage } from "@/components/ui/status-message";
import { validateSrtFile } from "@/lib/srt";
import { mergeSrt, parseMergeGap, parseMergeSource, serializeMergedSrt, validateMergeSelection } from "@/lib/srt-merge";
import { MergeFileList } from "./file-list";
import { GapControl } from "./gap-control";
import { MergePreview } from "./merge-preview";
import { initialMergeSession, mergeSessionReducer, type MergeFile } from "./session";

export function SrtMerger() {
  const [session, dispatch] = useReducer(mergeSessionReducer, initialMergeSession);
  const nextId = useRef(0);
  const generation = useRef(0);
  const replaceId = useRef<number | null>(null);
  const replacement = useRef<HTMLInputElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const busy = session.files.some((file) => file.status === "reading");
  const invalid = session.files.some((file) => file.status === "invalid");
  const calculation = useMemo(() => {
    try {
      const gap = parseMergeGap(session.gap);
      const ready = session.files.filter((file) => file.status === "ready");
      if (ready.length !== session.files.length || ready.length < 2) return { result: null, content: null, gapError: "", mergeError: "" };
      try {
        const result = mergeSrt(ready.map((file) => ({ name: file.name, document: file.document })), gap);
        return { result, content: serializeMergedSrt(result), gapError: "", mergeError: "" };
      } catch (error) { return { result: null, content: null, gapError: "", mergeError: (error as Error).message }; }
    } catch (error) { return { result: null, content: null, gapError: (error as Error).message, mergeError: "" }; }
  }, [session.files, session.gap]);
  const valid = !!calculation.result && !session.error;
  const duplicateNames = session.files.some((file, index, files) => files.findIndex((other) => other.name.toLowerCase() === file.name.toLowerCase()) !== index);

  async function readFiles(files: File[], rows: MergeFile[]) {
    const currentGeneration = generation.current;
    // Read sequentially to avoid holding ten file buffers at once.
    for (const [index, file] of files.entries()) {
      if (generation.current !== currentGeneration) return;
      try {
        validateSrtFile(file);
        const bytes = await file.arrayBuffer();
        if (generation.current !== currentGeneration) return;
        const parsed = parseMergeSource(file, bytes);
        dispatch({ type: "resolve", file: { ...rows[index], status: "ready", document: parsed.document } });
      } catch (error) {
        if (generation.current !== currentGeneration) return;
        const message = error instanceof Error ? error.message : "This file could not be read. Please choose it again.";
        dispatch({ type: "resolve", file: { ...rows[index], status: "invalid", error: message.startsWith(`${file.name}:`) ? message : `${file.name}: ${message}` } });
      }
    }
  }

  function addFiles(files: File[], replacing?: number) {
    try {
      const existing = session.files.filter((file) => file.id !== replacing);
      validateMergeSelection(existing, files);
      const rows: MergeFile[] = files.map((file) => ({ id: ++nextId.current, name: file.name, size: file.size, status: "reading" }));
      if (replacing !== undefined) dispatch({ type: "replace", id: replacing, file: rows[0] });
      else dispatch({ type: "add", files: rows });
      void readFiles(files, rows);
    } catch (error) { dispatch({ type: "error", message: (error as Error).message }); }
  }

  function reset() {
    generation.current++;
    replaceId.current = null;
    if (replacement.current) replacement.current.value = "";
    dispatch({ type: "reset" });
    requestAnimationFrame(() => workspace.current?.querySelector<HTMLButtonElement>(".upload-zone button")?.focus());
  }

  function removeFile(id: number) {
    const index = session.files.findIndex((file) => file.id === id);
    dispatch({ type: "remove", id });
    requestAnimationFrame(() => {
      const rows = workspace.current?.querySelectorAll<HTMLLIElement>(".merge-file-row");
      const nextRow = rows?.[Math.min(index, rows.length - 1)];
      (nextRow?.querySelector<HTMLButtonElement>("button:not(:disabled)") ?? workspace.current?.querySelector<HTMLButtonElement>(".upload-zone button"))?.focus();
    });
  }

  const progress = session.downloaded && valid ? 3 : valid ? 2 : session.files.length >= 2 ? 1 : 0;
  return <>
    <div className="tool-workspace v1-merge-workspace aen-merger" ref={workspace}><div className={`editor-panel aen-merger-layout${session.files.length ? "" : " is-empty"}`}><ol className="aen-merger-steps" aria-label="Merge progress">{["Add files", "Check the joins", "Download"].map((label, i) => <li key={label} className={i < progress ? "is-done" : i === progress ? "is-current" : ""} aria-current={i === progress && progress < 3 ? "step" : undefined}><span className="aen-step-dot">{i < progress ? <Icon name="check" size={13} /> : i + 1}</span><span className="aen-step-label">{label}</span></li>)}</ol><div className="aen-merger-main">
      <div className="editor-heading"><span className="section-label">Add your subtitle files</span><span className="badge accent">2–10 files</span></div>
      <FileUpload multiple accept=".srt" title="Add your SRT files" filename={session.files.length ? `${session.files.length} files selected` : undefined} detail="Add more files or drop them here." buttonLabel={session.files.length ? "Add more SRT files" : "Choose SRT files"} description="Choose the SRT files you want to combine." hint=".srt only · 10 MB per file · 50 MB total" busy={busy} validateFile={validateSrtFile} onFiles={addFiles} onError={(message) => dispatch({ type: "error", message })} />
      <input ref={replacement} className="sr-only" tabIndex={-1} type="file" accept=".srt" aria-label="Choose replacement SRT file" disabled={busy} onChange={(event) => {
        const file = event.target.files?.[0];
        if (file && replaceId.current !== null) addFiles([file], replaceId.current);
        replaceId.current = null;
        event.target.value = "";
      }} />
      {session.error && <StatusMessage tone="error">{session.error}{session.files.length > 0 && <button type="button" className="text-button" onClick={() => dispatch({ type: "dismiss-error" })}>Keep current files</button>}</StatusMessage>}
      <MergeFileList files={session.files} busy={busy} onRemove={removeFile} onMove={(id, direction) => dispatch({ type: "move", id, direction })} onReorder={(source, target) => dispatch({ type: "reorder", source, target })} onReplace={(id) => { replaceId.current = id; replacement.current?.click(); }} />
      {duplicateNames && <StatusMessage tone="warning">Some files share the same name. They are kept as separate files. Check the order and remove any unintended copies.</StatusMessage>}
      {session.files.length > 0 && <GapControl value={session.gap} onChange={(value) => dispatch({ type: "gap", value })} error={calculation.gapError || undefined} disabled={!session.files.length || busy} />}
      </div>{session.files.length > 0 && <aside className="aen-merger-side"><MergePreview result={valid ? calculation.result : null} busy={busy} fileCount={session.files.length} blocked={invalid || !!session.error || !!calculation.gapError || !!calculation.mergeError} /></aside>}
        {session.files.length > 0 && <div className="download-section"><div className="download-heading"><span className="section-label">Download</span></div>{(session.files.length > 0 || session.error) && <button type="button" className="text-button" onClick={reset}><Icon name="reset" size={14} />Start over</button>}</div>
        {calculation.mergeError && <StatusMessage tone="error">{calculation.mergeError}</StatusMessage>}
        {invalid && <p className="download-help">Remove or replace the files marked “Needs attention” before downloading.</p>}
        {valid && <p className="aen-dl-summary">{calculation.result!.parts.length} files · {calculation.result!.cues.length} subtitles</p>}
        
        <DownloadButton label="Download merged SRT" content={valid ? calculation.content : null} filename="merged-subtitles.srt" mimeType="application/x-subrip;charset=utf-8" disabled={!valid || busy} onDownloaded={() => dispatch({ type: "download" })} onError={(message) => dispatch({ type: "error", message })} />
        {session.files.length < 2 && <p className="download-help">{session.files.length ? "Add one more file to merge." : "Add at least two SRT files to get started."}</p>}
        
      </div>}
    </div></div>
  </>;
}
