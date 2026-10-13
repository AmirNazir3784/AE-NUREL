"use client";
import { useMemo, useReducer, useState } from "react";
import { analyzeEditor, editorExportErrors, editorPage, formatEditorTime, EDITOR_PAGE_SIZE, type EditorDocument } from "@/lib/subtitle-editor";
import { editorIsDirty, editorSessionReducer, initialEditorSession } from "@/features/srt-editor/editor-session";
import { DownloadButton } from "@/components/tools/download-button";
import { UnsavedNavigation } from "@/features/srt-editor/unsaved-navigation";
import { StatusMessage } from "@/components/ui/status-message";
import styles from "./transcription.module.css";
import { captionExport } from "./asr-core";
import { coverageExportIssues, type CoverageEntry } from "./semantic-localization";
import { captionReviewHints } from "./caption-review-hints";
import { preservationIssues } from "./translation-integrity";

export function CaptionReview({ initialDocument, coverage }: { initialDocument: EditorDocument; coverage?: CoverageEntry[] }) {
  const [session, dispatch] = useReducer(editorSessionReducer, { ...initialEditorSession, document: initialDocument, saved: initialDocument });
  const [page, setPage] = useState(0);
  const [compareSource, setCompareSource] = useState(false);
  const document = session.document!;
  const issues = useMemo(() => analyzeEditor(document.cues), [document.cues]);
  const pagination = editorPage(document.cues.map((_, i) => i), page);
  const dirty = editorIsDirty(session);
  const errors = editorExportErrors(document, undefined, issues);
  const coverageErrors = useMemo(() => coverage ? coverageExportIssues(document, coverage) : [], [document, coverage]);
  const references = useMemo(() => new Map(coverage?.flatMap((entry, index) => entry.outputCueIds.map(id => [id, { entry, number: index + 1 }] as const))), [coverage]);
  const hints = useMemo(() => {
    const byId = new Map(document.cues.map(cue => [cue.id, cue])), compare = new Set<string>();
    for (const entry of coverage ?? []) {
      const text = entry.outputCueIds.map(id => byId.get(id)?.text ?? "").join(" ");
      if (text.trim() && preservationIssues(entry.sourceText, text).length) compare.add(entry.outputCueIds[0]);
    }
    return document.cues.map(cue => [...captionReviewHints(cue), ...(compare.has(cue.id) ? ["Compare numbers and identifiers with the source."] : [])]);
  }, [document.cues, coverage]);
  const suggestions = hints.flatMap((items, index) => items.length ? [index] : []);
  const downloads = <div className={styles.actions}>{(["srt", "vtt"] as const).map(format => <DownloadButton key={format} content={() => { if (coverageErrors.length) throw new Error(coverageErrors.join(" ")); return captionExport(document, format).content; }} filename={captionExportFilename(document.filename, format)} label={"Download " + format.toUpperCase()} mimeType={format === "srt" ? "application/x-subrip;charset=utf-8" : "text/vtt;charset=utf-8"} variant={format === "srt" ? "primary" : "secondary"} disabled={coverageErrors.length > 0 || editorExportErrors(document, format, issues).length > 0} onDownloaded={() => dispatch({ type: "exported", filename: captionExportFilename(document.filename, format) })} onError={message => dispatch({ type: "error", message })} />)}</div>;
  return <section className={styles.review} aria-label="Review generated captions">
    <UnsavedNavigation dirty={dirty} />
    <div className={styles.row}><h2>Review captions</h2><div className={styles.actions}><button type="button" className="button button-secondary" disabled={!session.past.length && !session.pendingBase} onClick={() => dispatch({ type: "undo" })}>Undo</button><button type="button" className="button button-secondary" disabled={!session.future.length} onClick={() => dispatch({ type: "redo" })}>Redo</button></div></div>
    <p>Edit the text and check it against your recording.{coverage && " Translations are drafts; compare with the source when needed."}</p>
    {coverage && <button type="button" className="text-button" aria-pressed={compareSource} onClick={() => setCompareSource(value => !value)}>{compareSource ? "Hide source comparison" : "Compare with source"}</button>}
    {coverageErrors.length > 0 && <StatusMessage tone="error">Some captions need text or corrected timing. Edit them below or retry missing sentences before downloading.</StatusMessage>}
    {errors.length > 0 && coverageErrors.length === 0 && <StatusMessage tone="error">Fix the text or timing in caption {errors.join(", ")} before downloading.</StatusMessage>}
    {downloads}
    {suggestions.length > 0 && <details className={styles.suggestions}><summary>Review suggestions ({suggestions.length})</summary><p>Optional readability checks. Your text and speech timing have been kept.</p><ul>{suggestions.slice(0, EDITOR_PAGE_SIZE).map(index => <li key={document.cues[index].id}><a href={"#review-caption-" + index} onClick={() => setPage(Math.floor(index / EDITOR_PAGE_SIZE))}>Caption {index + 1}</a>: {hints[index].join(" ")}</li>)}</ul>{suggestions.length > EDITOR_PAGE_SIZE && <p>Showing the first {EDITOR_PAGE_SIZE} suggestions. Further captions have their own review hints.</p>}</details>}
    {session.error && <StatusMessage tone="error">{session.error}</StatusMessage>}
    {session.notice && <p className={styles.hint} role="status">{session.notice}</p>}
    {pagination.indices.map(index => {
      const cue = document.cues[index], errorId = "caption-" + index + "-error", reference = references.get(cue.id);
      return <article id={"review-caption-" + index} className={styles.cue} key={cue.id} aria-label={"Caption " + (index + 1)}>
        {compareSource && reference && <details className={styles.sourceComparison}><summary>Source sentence {reference.number}</summary><p dir="auto">{reference.entry.sourceText}</p></details>}
        <div className={styles.times}>{(["start", "end"] as const).map(field => <div key={field}><label htmlFor={cue.id + "-" + field}>{field === "start" ? "Start" : "End"}<span className="sr-only"> for caption {index + 1}</span></label><input id={cue.id + "-" + field} value={cue[field + "Draft" as "startDraft" | "endDraft"] ?? (cue[field] === null ? "" : formatEditorTime(cue[field], "srt"))} spellCheck={false} onChange={e => dispatch({ type: "draft", id: cue.id, field, value: e.target.value })} onBlur={() => dispatch({ type: "commit" })} aria-describedby={errorId} aria-invalid={cue[field] === null || (cue.start !== null && cue.end !== null && cue.end <= cue.start)} /></div>)}</div>
        <label htmlFor={"caption-" + index + "-text"}>Caption {index + 1}</label><textarea id={"caption-" + index + "-text"} dir="auto" rows={2} value={cue.text} onChange={e => dispatch({ type: "draft", id: cue.id, field: "text", value: e.target.value })} onBlur={() => dispatch({ type: "commit" })} aria-describedby={errorId + (hints[index].length ? " caption-hint-" + index : "")} aria-invalid={issues[index].errors.length > 0} />
        {hints[index].length > 0 && <p id={"caption-hint-" + index} className={styles.hint}>{hints[index].join(" ")}</p>}
        <div id={errorId} className={styles.cueErrors} aria-live="polite">{issues[index].errors.map(error => <p key={error}>{error}</p>)}</div>
      </article>;
    })}
    {pagination.pages > 1 && <nav className={styles.row} aria-label="Caption pages"><button className="button button-secondary" disabled={pagination.page === 0} onClick={() => setPage(pagination.page - 1)}>Previous</button><span>Page {pagination.page + 1} of {pagination.pages}</span><button className="button button-secondary" disabled={pagination.page + 1 === pagination.pages} onClick={() => setPage(pagination.page + 1)}>Next</button></nav>}
    {downloads}
    <p>For additional editing, download your reviewed file and open it in the <a href="/tools/srt-editor">Subtitle Editor</a>.</p>
  </section>;
}

function captionExportFilename(filename: string, format: "srt" | "vtt") { return filename.replace(/\.srt$/i, "." + format); }

