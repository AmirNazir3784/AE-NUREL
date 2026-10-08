"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { UnsavedNavigation } from "./unsaved-navigation";
import { StatusMessage } from "@/components/ui/status-message";
import { Icon } from "@/components/ui/icon";
import { formatTimestamp } from "@/lib/srt";
import { addEditorCue, analyzeEditor, deleteEditorCue, editorPage, EDITOR_PAGE_SIZE, filterEditorCues, nextEditorIssue, nudgeEditorCue, openSubtitle, replaceEditorText, shiftEditorCues, validateSubtitleFile, type EditorDocument } from "@/lib/subtitle-editor";
import { editorIsDirty, editorSessionReducer, initialEditorSession } from "./editor-session";
import { CueEditor } from "./cue-editor";
import { EditorToolbar } from "./editor-toolbar";
import { ExportControls } from "./export-controls";

export function SrtEditor() {
  const [session, dispatch] = useReducer(editorSessionReducer, initialEditorSession);
  const [find, setFind] = useState("");
  const [replacement, setReplacement] = useState("");
  const [shift, setShift] = useState("0");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [activeId, setActiveId] = useState("");
  const [focusId, setFocusId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [pending, setPending] = useState<File | "reset" | null>(null);
  const [dragging, setDragging] = useState(false);
  const request = useRef(0), nextId = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const document = session.document;
  const dirty = editorIsDirty(session);
  const issues = useMemo(() => analyzeEditor(document?.cues ?? []), [document?.cues]);
  const issueIndices = useMemo(() => issues.flatMap((issue, index) => issue.errors.length || issue.warnings.length ? [index] : []), [issues]);
  const filtered = useMemo(() => filterEditorCues(document?.cues ?? [], issues, find, issuesOnly, editingId), [document?.cues, issues, find, issuesOnly, editingId]);
  const pagination = editorPage(filtered, page);
  const timeline = document?.cues.reduce((max, cue) => Math.max(max, cue.end ?? 0), 0) ?? 0;
  useEffect(() => { if (focusId) window.document.getElementById(`${focusId}-text`)?.focus(); }, [focusId, pagination.page, document?.cues.length]);

  function clearView() { setFind(""); setReplacement(""); setShift("0"); setIssuesOnly(false); setPage(0); setActiveId(""); setFocusId(""); setEditingId(""); setPending(null); }
  const showError = useCallback((message: string) => dispatch({ type: "error", message }), []);
  async function readFile(file: File) {
    const id = ++request.current;
    dispatch({ type: "read", id }); setPending(null);
    try {
      validateSubtitleFile(file);
      const bytes = await file.arrayBuffer();
      if (request.current !== id) return;
      const loaded = openSubtitle(file, bytes);
      dispatch({ type: "loaded", id, document: loaded }); clearView();
    } catch (error) { dispatch({ type: "failed", id, message: error instanceof Error ? error.message : `${file.name}: We could not read this file. Choose it again.` }); }
  }
  function requestFile(file: File) { try { validateSubtitleFile(file); if (dirty) setPending(file); else void readFile(file); } catch (error) { showError((error as Error).message); } }
  function reset() { dispatch({ type: "reset", id: ++request.current }); clearView(); requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(".upload-zone button")?.focus()); }
  function startScratch() { dispatch({ type: "scratch", id: ++request.current }); clearView(); }
  function apply(operation: (document: EditorDocument) => EditorDocument, notice?: string) {
    if (!document) return;
    try { dispatch({ type: "apply", document: operation(document), notice }); } catch (error) { showError((error as Error).message); }
  }
  function add(afterId?: string) {
    if (!document) return;
    try {
      const id = `new-${++nextId.current}`, next = addEditorCue(document, id, afterId);
      dispatch({ type: "apply", document: next }); setFind(""); setIssuesOnly(false); setPage(Math.floor(next.cues.findIndex((cue) => cue.id === id) / EDITOR_PAGE_SIZE)); setFocusId(id);
    } catch (error) { showError((error as Error).message); }
  }
  function navigateIssue(direction: -1 | 1) {
    if (!document) return;
    const current = document.cues.findIndex((cue) => cue.id === activeId);
    const index = nextEditorIssue(issueIndices, current, direction);
    if (index === undefined) return;
    setFind(""); setIssuesOnly(true); setPage(Math.floor(issueIndices.indexOf(index) / EDITOR_PAGE_SIZE)); setFocusId(document.cues[index].id);
  }
  function replace(all: boolean) {
    if (!document) return;
    try { const result = replaceEditorText(document, find, replacement, all); dispatch({ type: "apply", document: result.document, notice: result.count ? `${result.count} ${result.count === 1 ? "match" : "matches"} replaced. Undo is available.` : "No matching text was changed." }); }
    catch (error) { showError((error as Error).message); }
  }
  function bulkShift() {
    if (!document) return;
    try { const result = shiftEditorCues(document, shift); dispatch({ type: "apply", document: result.document, tone: result.clamped ? "warning" : "info", notice: result.clamped ? `${result.clamped} ${result.clamped === 1 ? "cue reached" : "cues reached"} 00:00:00,000. Both timestamps moved together; durations were preserved.` : Number(shift) === 0 ? "No timing change." : "All subtitle times shifted. Undo is available." }); }
    catch (error) { showError((error as Error).message); }
  }
  const edit = useCallback((id: string, field: "text" | "start" | "end", value: string) => dispatch({ type: "draft", id, field, value }), []);
  const commit = useCallback(() => dispatch({ type: "commit" }), []);

  return <div className="subtitle-editor aen-editor" ref={root} onKeyDown={(event) => {
    if ((event.target as HTMLElement).closest(".editor-tools")) return;
    if ((event.ctrlKey || event.metaKey) && !event.altKey && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) { event.preventDefault(); dispatch({ type: event.shiftKey || event.key.toLowerCase() === "y" ? "redo" : "undo" }); }
  }}>
    <UnsavedNavigation dirty={dirty} />
    {!document ? <div className="editor-start"><FileUpload accept=".srt,.vtt" title="Drop your subtitle file here" buttonLabel="Upload subtitle file" description="Open SRT or VTT subtitles to correct their text and timing." hint="SRT or VTT · up to 10 MB · 10,000 subtitles" busy={session.busy} validateFile={validateSubtitleFile} onFile={requestFile} onError={showError} /><div className="editor-scratch"><Icon name="srt-editor" size={32} /><h2>Create your own subtitles</h2><p>Start with an empty file and add subtitles as you go.</p><button className="button button-secondary" type="button" disabled={session.busy} onClick={startScratch}>Start from scratch<Icon name="plus" size={16} /></button></div></div> : <>
      <div className={`editor-session-summary ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); if (!session.busy) { setDragging(true); event.dataTransfer.dropEffect = "copy"; } }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (session.busy) return; if (event.dataTransfer.files.length !== 1) showError("Drop one SRT or VTT file at a time."); else requestFile(event.dataTransfer.files[0]); }}>
        <div><strong>{session.busy ? "Reading your subtitles…" : dragging ? "Drop to replace this file" : document.filename}</strong><p><span className="badge accent">{document.format.toUpperCase()}</span>{document.cues.length} subtitles · {formatTimestamp(timeline)} timeline{dirty && <span className="editor-unsaved">Unsaved changes</span>}</p></div><div><input ref={fileInput} className="sr-only" type="file" accept=".srt,.vtt" tabIndex={-1} aria-label="Choose replacement subtitle file" disabled={session.busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) requestFile(file); }} /><button className="button button-secondary" type="button" disabled={session.busy} onClick={() => fileInput.current?.click()}>Replace file</button><button className="text-button" type="button" onClick={() => dirty ? setPending("reset") : reset()}><Icon name="reset" size={14} />Start over</button></div>
      </div>
      {pending && <div className="editor-discard" role="alert"><strong>You have unsaved changes.</strong><p>{pending === "reset" ? "Starting over will discard these edits." : `Opening ${pending.name} will replace this session.`}</p><div><button className="button button-secondary" type="button" onClick={() => setPending(null)}>Keep editing</button><button className="button button-primary" type="button" onClick={() => pending === "reset" ? reset() : void readFile(pending)}>Discard & {pending === "reset" ? "start over" : "replace file"}</button></div></div>}
      <ExportControls compact document={document} issues={issues} busy={session.busy} dirty={dirty} onExported={(filename) => dispatch({ type: "exported", filename })} onError={showError} onIssues={() => { setFind(""); setIssuesOnly(true); setPage(0); }} />
      <EditorToolbar cueCount={document.cues.length} issueCount={issueIndices.length} busy={session.busy} undo={!!session.past.length || !!session.pendingBase} redo={!!session.future.length} issuesOnly={issuesOnly} find={find} replacement={replacement} shift={shift} onUndo={() => dispatch({ type: "undo" })} onRedo={() => dispatch({ type: "redo" })} onAdd={() => add()} onFilter={(value) => { setIssuesOnly(value); setPage(0); }} onIssue={navigateIssue} onFind={(value) => { setFind(value); setPage(0); }} onReplacement={setReplacement} onReplace={replace} onShift={setShift} onApplyShift={bulkShift} />
    </>}
    {session.error && <StatusMessage tone="error">{session.error}{document && <span className="retained-file-note">Your current session is still here.</span>}</StatusMessage>}
    {session.notice && <StatusMessage tone={session.noticeTone}>{session.notice}</StatusMessage>}
    {document && <>
      <div className="editor-cue-list" aria-label="Subtitles" aria-busy={session.busy}>
        {!document.cues.length ? <div className="editor-no-cues"><h2>No subtitles yet</h2><p>Add your first caption, then set its text and timing.</p><button className="button button-primary" type="button" onClick={() => add()}>Add first subtitle</button></div> : !filtered.length ? <div className="editor-no-cues"><h2>No matching subtitles</h2><p>{issuesOnly ? "There are no issues matching this view." : "Try another word or clear Find to see all subtitles."}</p><button className="button button-secondary" type="button" onClick={() => { setFind(""); setIssuesOnly(false); setPage(0); }}>Show all subtitles</button></div> : pagination.indices.map((index) => <CueEditor key={document.cues[index].id} cue={document.cues[index]} number={index + 1} format={document.format} issues={issues[index]} busy={session.busy} onEdit={edit} onCommit={commit} onNudge={(id, offset) => apply((doc) => nudgeEditorCue(doc, id, offset))} onAdd={add} onDelete={(id) => apply((doc) => deleteEditorCue(doc, id), "Subtitle deleted. Undo is available.")} onFocus={(id) => { setActiveId(id); setEditingId(id); }} onLeave={(id) => setEditingId((current) => current === id ? "" : current)} />)}
      </div>
      {filtered.length > 0 && <nav className="editor-pagination" aria-label="Subtitle cue pages"><button className="button button-secondary" type="button" disabled={pagination.page === 0 || session.busy} onClick={() => setPage(pagination.page - 1)}>Previous</button><span role="status">Page {pagination.page + 1} / {pagination.pages}<small>{filtered.length} {filtered.length === 1 ? "subtitle" : "subtitles"} · {EDITOR_PAGE_SIZE} per page</small></span><button className="button button-secondary" type="button" disabled={pagination.page >= pagination.pages - 1 || session.busy} onClick={() => setPage(pagination.page + 1)}>Next</button></nav>}
      <details className="editor-disclosure editor-reading-note"><summary>About reading speed</summary><p>Characters per second is a guide: above 17 may be hard to read; above 20 is fast. It counts visible text, including Unicode characters. Subtitle order is kept.</p></details>
      {(document.vttBlocks.length > 0 || document.cues.some((cue) => cue.vttSettings || cue.srtSettings || cue.identifier)) && <p className="editor-reading-note">Format-specific settings and VTT notes are kept when exporting that format. The other format keeps your subtitle text and timing.</p>}
      <ExportControls document={document} issues={issues} busy={session.busy} dirty={dirty} onExported={(filename) => dispatch({ type: "exported", filename })} onError={showError} onIssues={() => { setFind(""); setIssuesOnly(true); setPage(0); }} />
    </>}
  </div>;
}

