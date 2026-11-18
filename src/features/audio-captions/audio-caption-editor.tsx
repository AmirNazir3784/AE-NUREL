"use client";
import { memo, useEffect, useReducer, useRef, useState } from "react";
import { editorSessionReducer, initialEditorSession, editorIsDirty } from "../srt-editor/editor-session";
import { UnsavedNavigation } from "../srt-editor/unsaved-navigation";
import { addEditorCue, deleteEditorCue, editorExportErrors, exportEditor, formatEditorTime, type EditorDocument } from "@/lib/subtitle-editor";
import { DownloadButton } from "@/components/tools/download-button";
import styles from "./audio-captions.module.css";
import { stampPlaybackTime } from "./lyric-alignment";

export const AudioCaptionEditor = memo(function AudioCaptionEditor({ initialDocument, duration, onSeek, onChange, exportBlocked = false, getCurrentTime, onDocumentChange }: { initialDocument: EditorDocument; duration: number; onSeek: (seconds: number) => void; onChange?: () => void; exportBlocked?: boolean; getCurrentTime?: () => number; onDocumentChange?: (document: EditorDocument) => void }) {
  const [session, dispatch] = useReducer(editorSessionReducer, { ...initialEditorSession, document: initialDocument, saved: initialDocument });
  const count = useRef(0), document = session.document!;
  const [search, setSearch] = useState("");
  useEffect(() => { onDocumentChange?.(document); }, [document, onDocumentChange]);
  function stamp(id: string, field: "start" | "end") { if (!getCurrentTime) return; try { dispatch({ type: "apply", document: stampPlaybackTime(document, id, field, getCurrentTime(), duration) }); onChange?.(); } catch (error) { dispatch({ type: "error", message: error instanceof Error ? error.message : "Choose a position inside the recording." }); } }
  const errors = editorExportErrors(document), outside = document.cues.some(cue => cue.end !== null && cue.end > duration * 1000);
  const order = document.cues.some((cue, index) => index > 0 && cue.start !== null && document.cues[index - 1].end !== null && cue.start < document.cues[index - 1].end!);
  function add() { if (document.cues.length >= (getCurrentTime ? 2500 : 500)) { dispatch({ type: "error", message: getCurrentTime ? "Use 2,500 captions or fewer." : "Use 500 captions or fewer." }); return; } dispatch({ type: "apply", document: addEditorCue(document, `audio-new-${++count.current}`) }); onChange?.(); }
  return <section className={styles.card} aria-label="Caption results"><UnsavedNavigation dirty={editorIsDirty(session)} />
    <div className={styles.bar}><div><h2>Captions</h2><p className={styles.hint}>Review text and timing before downloading.</p></div><span className={styles.chip}>{document.cues.length} captions</span></div>
    <div className={styles.body}>
      <div className={styles.actions}><button type="button" className="button button-secondary" onClick={add}>Add caption</button><button type="button" className="text-button" disabled={!session.past.length && !session.pendingBase} onClick={() => { dispatch({ type: "undo" }); onChange?.(); }}>Undo</button><button type="button" className="text-button" disabled={!session.future.length} onClick={() => { dispatch({ type: "redo" }); onChange?.(); }}>Redo</button></div>
      {getCurrentTime && <label className={styles.search}>Find a caption<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search caption text" /></label>}
      <div className={styles.rows}>{document.cues.map((cue, index) => cue.text.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && <fieldset className={styles.cue} key={cue.id}><legend>Caption {index + 1}{cue.start === null || cue.end === null ? " · Needs timing" : ""}</legend><div className={styles.times}>{(["start", "end"] as const).map(field => <label key={field}>{field === "start" ? "Start" : "End"}<input value={cue[`${field}Draft`] ?? (cue[field] === null ? "" : formatEditorTime(cue[field], document.format))} aria-invalid={cue[field] === null || cue.start !== null && cue.end !== null && cue.end <= cue.start} onChange={event => { dispatch({ type: "draft", id: cue.id, field, value: event.target.value }); onChange?.(); }} onBlur={() => dispatch({ type: "commit" })} /></label>)}</div>
        <label>Caption text<textarea dir="auto" rows={2} maxLength={2000} value={cue.text} onChange={event => { dispatch({ type: "draft", id: cue.id, field: "text", value: event.target.value }); onChange?.(); }} onBlur={() => dispatch({ type: "commit" })} /></label>
        <div className={styles.actions}><button type="button" className="text-button" disabled={cue.start === null} onClick={() => onSeek(cue.start! / 1000)}>Play from here</button>{getCurrentTime && <><button type="button" className="text-button" onClick={() => stamp(cue.id, "start")}>Set start here</button><button type="button" className="text-button" onClick={() => stamp(cue.id, "end")}>Set end here</button></>}<button type="button" className="text-button destructive-action" aria-label={`Delete caption ${index + 1}`} onClick={() => { dispatch({ type: "apply", document: deleteEditorCue(document, cue.id) }); onChange?.(); }}>Delete</button></div>
      </fieldset>)}</div>
      {(errors.length > 0 || outside || order) && <p role="alert" className={styles.error}>Check text and timing. Use captions in time order, without overlaps, inside the recording.</p>}
      {session.error && <p role="alert" className={styles.error}>{session.error}</p>}
      <div className={styles.exports}>{(["srt", "vtt"] as const).map(format => <DownloadButton key={format} label={`Download ${format.toUpperCase()}`} filename={document.filename.replace(/\.[^.]+$/u, "") + "." + format} content={() => exportEditor(document, format)} mimeType={format === "srt" ? "application/x-subrip;charset=utf-8" : "text/vtt;charset=utf-8"} disabled={exportBlocked || !document.cues.length || editorExportErrors(document, format).length > 0 || outside || order} variant={format === "srt" ? "primary" : "secondary"} onDownloaded={() => dispatch({ type: "exported", filename: document.filename })} onError={message => dispatch({ type: "error", message })} />)}</div>
    </div>
  </section>;
});
