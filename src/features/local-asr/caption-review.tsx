"use client";
import { useMemo, useReducer, useState } from "react";
import { analyzeEditor, editorExportErrors, editorPage, formatEditorTime, type EditorDocument } from "@/lib/subtitle-editor";
import { editorIsDirty, editorSessionReducer, initialEditorSession } from "@/features/srt-editor/editor-session";
import { DownloadButton } from "@/components/tools/download-button";
import { UnsavedNavigation } from "@/features/srt-editor/unsaved-navigation";
import { StatusMessage } from "@/components/ui/status-message";
import styles from "./transcription.module.css";
import { captionExport } from "./asr-core";

export function CaptionReview({ initialDocument }: { initialDocument: EditorDocument }) {
  const [session, dispatch] = useReducer(editorSessionReducer, { ...initialEditorSession, document: initialDocument, saved: initialDocument });
  const [page, setPage] = useState(0);
  const document = session.document!;
  const issues = useMemo(() => analyzeEditor(document.cues), [document.cues]);
  const pagination = editorPage(document.cues.map((_, i) => i), page);
  const dirty = editorIsDirty(session);
  const errors = editorExportErrors(document, undefined, issues);
  const downloads = <div className={styles.actions}>{(["srt", "vtt"] as const).map(format => <DownloadButton key={format} content={() => captionExport(document, format).content} filename={captionExportFilename(document.filename, format)} label={"Download " + format.toUpperCase()} mimeType={format === "srt" ? "application/x-subrip;charset=utf-8" : "text/vtt;charset=utf-8"} variant={format === "srt" ? "primary" : "secondary"} disabled={editorExportErrors(document, format, issues).length > 0} onDownloaded={() => dispatch({ type: "exported", filename: captionExportFilename(document.filename, format) })} onError={message => dispatch({ type: "error", message })} />)}</div>;
  return <section className={styles.review} aria-label="Review generated captions">
    <UnsavedNavigation dirty={dirty} />
    <div className={styles.row}><h2>Review captions</h2><div className={styles.actions}><button type="button" className="button button-secondary" disabled={!session.past.length && !session.pendingBase} onClick={() => dispatch({ type: "undo" })}>Undo</button><button type="button" className="button button-secondary" disabled={!session.future.length} onClick={() => dispatch({ type: "redo" })}>Redo</button></div></div>
    <p>Correct recognition errors and check the timing against your recording. Timing comes from model segments; word-level precision is not claimed.</p>
    {errors.length > 0 && <StatusMessage tone="error">Fix caption {errors.join(", ")} before downloading. Use HH:MM:SS,mmm times with an end later than the start.</StatusMessage>}
    {downloads}
    {session.error && <StatusMessage tone="error">{session.error}</StatusMessage>}
    {session.notice && <StatusMessage tone={session.noticeTone}>{session.notice}</StatusMessage>}
    {pagination.indices.map(index => {
      const cue = document.cues[index], errorId = "caption-" + index + "-error";
      return <article className={styles.cue} key={cue.id} aria-label={"Caption " + (index + 1)}>
        <div className={styles.times}>{(["start", "end"] as const).map(field => <div key={field}><label htmlFor={cue.id + "-" + field}>{field === "start" ? "Start" : "End"}<span className="sr-only"> for caption {index + 1}</span></label><input id={cue.id + "-" + field} value={cue[field + "Draft" as "startDraft" | "endDraft"] ?? (cue[field] === null ? "" : formatEditorTime(cue[field], "srt"))} spellCheck={false} onChange={e => dispatch({ type: "draft", id: cue.id, field, value: e.target.value })} onBlur={() => dispatch({ type: "commit" })} aria-describedby={errorId} aria-invalid={cue[field] === null || (cue.start !== null && cue.end !== null && cue.end <= cue.start)} /></div>)}</div>
        <label htmlFor={"caption-" + index + "-text"}>Caption {index + 1}</label><textarea id={"caption-" + index + "-text"} dir="auto" rows={2} value={cue.text} onChange={e => dispatch({ type: "draft", id: cue.id, field: "text", value: e.target.value })} onBlur={() => dispatch({ type: "commit" })} aria-describedby={errorId} aria-invalid={issues[index].errors.length > 0} />
        <div id={errorId} className={styles.cueErrors} aria-live="polite">{issues[index].errors.map(error => <p key={error}>{error}</p>)}</div>
      </article>;
    })}
    {pagination.pages > 1 && <nav className={styles.row} aria-label="Caption pages"><button className="button button-secondary" disabled={pagination.page === 0} onClick={() => setPage(pagination.page - 1)}>Previous</button><span>Page {pagination.page + 1} of {pagination.pages}</span><button className="button button-secondary" disabled={pagination.page + 1 === pagination.pages} onClick={() => setPage(pagination.page + 1)}>Next</button></nav>}
    {downloads}
    <p>For additional editing, download your reviewed file and open it in the <a href="/tools/srt-editor">Subtitle Editor</a>.</p>
  </section>;
}

function captionExportFilename(filename: string, format: "srt" | "vtt") { return filename.replace(/\.srt$/i, "." + format); }

