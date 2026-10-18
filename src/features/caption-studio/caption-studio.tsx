"use client";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { FileUpload } from "@/components/tools/file-upload";
import { DownloadButton } from "@/components/tools/download-button";
import { UnsavedNavigation } from "@/features/srt-editor/unsaved-navigation";
import { editorSessionReducer, initialEditorSession, editorIsDirty } from "@/features/srt-editor/editor-session";
import { emptyEditor, openSubtitle, validateSubtitleFile, formatEditorTime, editorExportErrors, exportEditor, addEditorCue, deleteEditorCue, shiftEditorCues, type EditorDocument } from "@/lib/subtitle-editor";
import { STUDIO_PRESETS, STUDIO_LIMITS, studioIssues, studioFilename, studioFont, paintStudioCaptions, activeStudioCues, splitStudioCue, mergeStudioCue, validateStudioFile, type StudioMedia, type StudioStyle } from "./studio-core";
import { inspectStudioVideo, exportStudioVideo } from "./studio-media";
import styles from "./studio.module.css";
import { StyleControls } from "./style-controls";

type Source = { file: File; url: string; media: StudioMedia };
function initialSession() { const document = emptyEditor(); return { ...initialEditorSession, document, saved: document }; }
function timeLabel(seconds: number) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`; }

export function CaptionStudio() {
  const [source, setSource] = useState<Source | null>(null), [style, setStyle] = useState<StudioStyle>(STUDIO_PRESETS[0]);
  const [session, dispatch] = useReducer(editorSessionReducer, undefined, initialSession);
  const [shift, setShift] = useState("0"), [query, setQuery] = useState("");
  const textSelection = useRef<HTMLTextAreaElement>(null);
  const [selected, setSelected] = useState(""), [time, setTime] = useState(0), [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState<"loading" | "exporting" | null>(null), [error, setError] = useState(""), [layoutHint, setLayoutHint] = useState("");
  const [format, setFormat] = useState<"mp4" | "webm">("mp4"), [progress, setProgress] = useState(0);
  const [output, setOutput] = useState<{ url: string; name: string } | null>(null), [panel, setPanel] = useState<"captions" | "style">("captions");
  const exportedVideo = useRef<HTMLVideoElement>(null);
  const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null), stage = useRef<HTMLDivElement>(null), subtitleInput = useRef<HTMLInputElement>(null);
  const job = useRef<AbortController | null>(null), generation = useRef(0), cueId = useRef(0), importId = useRef(0), revision = useRef(0);
  const document = session.document!, cue = document.cues.find(item => item.id === selected);
  const issues = useMemo(() => studioIssues(document, source?.media.duration ?? 0), [document, source]);
  const dirty = editorIsDirty(session);
  useEffect(() => () => { ++generation.current; job.current?.abort(); }, []);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);
  useEffect(() => { const element = exportedVideo.current; return () => { element?.pause(); if (output) URL.revokeObjectURL(output.url); }; }, [output]);

  useEffect(() => {
    const element = video.current, overlay = canvas.current;
    if (!element || !overlay || !source) return;
    let frame = 0, stopped = false, lastKey = "";
    const ctx = overlay.getContext("2d"); if (!ctx) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    function draw() {
      if (stopped) return;
      const active = activeStudioCues(document, element!.currentTime * 1000);
      const animated = !preference.matches && style.animation !== "none" && active.some(c => element!.currentTime * 1000 - c.start! < style.motionDuration);
      const key = active.map(c => c.id).join("|") + preference.matches + (animated ? Math.floor(element!.currentTime * 60) : "");
      if (key === lastKey) return; lastKey = key;
      ctx!.clearRect(0, 0, overlay!.width, overlay!.height);
      try { paintStudioCaptions(ctx!, overlay!.width, overlay!.height, document, element!.currentTime * 1000, style, studioFont(style), preference.matches); setLayoutHint(previous => previous ? "" : previous); }
      catch (failure) { setLayoutHint(failure instanceof Error ? failure.message : "Review this caption's layout."); }
    }
    function tick() { draw(); if (!element!.paused && !element!.ended) frame = requestAnimationFrame(tick); }
    function start() { cancelAnimationFrame(frame); tick(); }
    function stop() { cancelAnimationFrame(frame); draw(); }
    for (const event of ["loadeddata", "seeked", "timeupdate"]) element.addEventListener(event, draw);
    element.addEventListener("play", start); element.addEventListener("pause", stop); preference.addEventListener("change", draw);
    void window.document.fonts.ready.then(() => { if (!stopped) { lastKey = ""; start(); } }); draw();
    return () => { stopped = true; cancelAnimationFrame(frame); for (const event of ["loadeddata", "seeked", "timeupdate"]) element.removeEventListener(event, draw); element.removeEventListener("play", start); element.removeEventListener("pause", stop); preference.removeEventListener("change", draw); };
  }, [source, document, style]);

  function invalidate() { ++revision.current; exportedVideo.current?.pause(); setOutput(null); setError(""); }
  function seek(value: number) {
    // Chromium may quantize a requested seek one microsecond early. Nudge the
    // preview two microseconds forward; subtitle/export timestamps never change.
    if (video.current && source) { video.current.currentTime = Math.min(source.media.duration, Math.max(0, value) + .000002); setTime(video.current.currentTime); }
  }
  async function loadVideo(file: File) {
    if (busy || (dirty && !window.confirm("Replace this video and its captions? Download your edits first."))) return;
    video.current?.pause();
    job.current?.abort(); const abort = new AbortController(), run = ++generation.current; job.current = abort;
    setBusy("loading"); setError("");
    try { const media = await inspectStudioVideo(file, abort.signal); abort.signal.throwIfAborted(); if (run !== generation.current) return;
      setSource({ file, media, url: URL.createObjectURL(file) }); dispatch({ type: "scratch", id: ++importId.current }); setSelected(""); setTime(0); setPlaying(false); setLayoutHint(""); invalidate();
    } catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "This video could not be opened."); }
    finally { if (job.current === abort) { job.current = null; setBusy(null); } }
  }
  async function importCaptions(file?: File) {
    if (!file || busy || !source) return;
    if (dirty && !window.confirm("Replace these captions? Download your edits first.")) return;
    const run = ++generation.current; setBusy("loading"); setError("");
    try { validateSubtitleFile(file); const bytes = await file.arrayBuffer(); if (run !== generation.current) return;
      const loaded = openSubtitle(file, bytes); if (loaded.cues.length > STUDIO_LIMITS.cues) throw new Error("Import up to 500 captions.");
      dispatch({ type: "apply", document: loaded }); setSelected(loaded.cues[0]?.id ?? ""); invalidate();
    } catch (failure) { if (run === generation.current) setError(failure instanceof Error ? failure.message : "These captions could not be read."); }
    finally { if (run === generation.current) setBusy(null); }
  }
  function applyEdit(operation: () => EditorDocument) { try { dispatch({ type: "apply", document: operation() }); invalidate(); } catch (failure) { setError(failure instanceof Error ? failure.message : "This edit could not be applied."); } }
  function addCaption() {
    if (!source || busy) return;
    if (document.cues.length >= STUDIO_LIMITS.cues) { setError("Use 500 captions or fewer."); return; }
    try {
      const id = `studio-${++cueId.current}`, added = addEditorCue(document, id).cues.find(item => item.id === id)!;
      const start = Math.min(Math.round(time * 1000), Math.max(0, Math.floor(source.media.duration * 1000) - 1));
      const next = { ...added, start, end: Math.min(start + 2000, Math.floor(source.media.duration * 1000)) };
      const index = document.cues.findIndex(item => item.start !== null && item.start > start), cues = [...document.cues]; cues.splice(index < 0 ? cues.length : index, 0, next);
      dispatch({ type: "apply", document: { ...document, cues } }); setSelected(id); setPanel("captions"); invalidate();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "A caption could not be added."); }
  }
  function changeStyle(value: Partial<StudioStyle>) { setStyle(previous => ({ ...previous, preset: "Custom", ...value, ...(value.position && value.position !== "custom" ? { y: { top: 18, middle: 50, bottom: 84 }[value.position] } : value.x !== undefined || value.y !== undefined ? { position: "custom" as const } : {}) })); invalidate(); }
  async function render() {
    if (!source || busy) return;
    const abort = new AbortController(); job.current = abort; setBusy("exporting"); setProgress(0); invalidate(); const version = revision.current; video.current?.pause();
    try { const blob = await exportStudioVideo(source.file, source.media, document, style, format, abort.signal, setProgress); abort.signal.throwIfAborted(); if (version !== revision.current) throw new Error("Captions or style changed during export. Export again to include your changes."); setOutput({ url: URL.createObjectURL(blob), name: studioFilename(source.file.name, format) }); }
    catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "Video export failed. Try another format."); }
    finally { if (job.current === abort) { job.current = null; setBusy(null); } }
  }
  function cancel() { ++generation.current; if (job.current) job.current.abort(); else setBusy(null); setError(""); dispatch({ type: "apply", document, notice: busy === "exporting" ? "Video export cancelled." : "File check cancelled." }); }
  const captionDownloads = source && (["srt", "vtt"] as const).map(extension => <DownloadButton key={extension} label={`Download ${extension.toUpperCase()}`} filename={studioFilename(source.file.name, extension)} content={() => exportEditor(document, extension)} mimeType={extension === "vtt" ? "text/vtt;charset=utf-8" : "application/x-subrip;charset=utf-8"} variant="secondary" disabled={!!busy || !document.cues.length || !!editorExportErrors(document, extension).length} onDownloaded={() => dispatch({ type: "exported", filename: studioFilename(source.file.name, extension) })} onError={setError} />);

  return <section className={styles.studio} aria-label="Caption Studio" onKeyDown={event => { if (!busy && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); dispatch({ type: event.shiftKey ? "redo" : "undo" }); invalidate(); } }}>
    <UnsavedNavigation dirty={dirty} />
    <header className={styles.heading}><div><Link href="/tools" className={styles.back}>Free tools</Link><h1><Icon name="subtitle" size={25} />Auto Caption Generator</h1><p>Your video. Your captions. Styled on your device.</p></div>{source && <span className={styles.fileName}>{source.file.name}</span>}</header>
    {!source ? <div className={styles.upload}><FileUpload accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" title="Start with your video" description="MP4, MOV or WebM with a codec your browser can decode." buttonLabel="Choose video" hint="Up to 2 minutes · 200 MiB · 1080p" busy={!!busy} validateFile={validateStudioFile} onFile={file => void loadVideo(file)} onError={setError} /><p className={styles.note}>Import SRT/VTT captions or add your own. Video editing and export stay on this device.</p></div> : <>
      <div className={styles.workspace}>
        <section className={styles.previewPanel} aria-label="Video preview">
          <div ref={stage} className={styles.stage} style={{ aspectRatio: `${source.media.width}/${source.media.height}`, width: `min(100%, ${source.media.width / source.media.height * 52}vh)` }}>
            <video ref={video} src={source.url} playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={event => setTime(event.currentTarget.currentTime)} onError={() => setError("The browser could not play this video. Choose a different encoding.")} />
            <canvas ref={canvas} width={source.media.width} height={source.media.height} aria-hidden="true" />
          </div>
          <div className={styles.transport}><button type="button" aria-label={playing ? "Pause video" : "Play video"} disabled={!!busy} onClick={() => { if (video.current?.paused) void video.current.play().catch(() => setError("Playback could not start.")); else video.current?.pause(); }}>{playing ? "Ⅱ" : "▶"}</button><span>{timeLabel(time)}</span><input aria-label="Video timeline" type="range" min={0} max={source.media.duration} step={.01} value={time} onChange={event => seek(Number(event.target.value))} disabled={!!busy} /><span>{timeLabel(source.media.duration)}</span><button type="button" aria-label="Fullscreen preview" onClick={() => void stage.current?.requestFullscreen().catch(() => setError("Fullscreen is unavailable in this browser."))}><Icon name="expand" size={17} /></button></div>
          {layoutHint && <p className={styles.note} role="status">{layoutHint}</p>}
          <details className={styles.details} key={source.url}><summary>Playback controls</summary><div className={styles.actions}><button type="button" className="button button-secondary" disabled={!!busy} onClick={() => seek(time - .1)}>Back 0.1s</button><button type="button" className="button button-secondary" disabled={!!busy} onClick={() => seek(time + .1)}>Forward 0.1s</button></div><label>Preview speed<select defaultValue="1" onChange={event => { if (video.current) video.current.playbackRate = Number(event.target.value); }}>{[.5,.75,1,1.25,1.5,2].map(value => <option key={value} value={value}>{value}?</option>)}</select></label><label>Preview volume<input type="range" min={0} max={1} step={.05} defaultValue={1} onChange={event => { if (video.current) video.current.volume = Number(event.target.value); }} /></label><p className={styles.note}>Preview speed and volume do not change the exported video.</p></details>
          <div className={styles.exportBar}><label className={styles.inline}>Video format<select value={format} disabled={!!busy} onChange={event => { setFormat(event.target.value as "mp4" | "webm"); setOutput(null); }}><option value="mp4">MP4</option><option value="webm">WebM</option></select></label><button type="button" className="button button-primary" disabled={!!busy || !!issues.length} onClick={() => void render()}><Icon name="download" size={17} />Export video</button></div>
          {busy === "exporting" && <div className={styles.progress} role="status"><progress max={100} value={progress} /><span>Exporting · {progress}%</span><button type="button" className="text-button" onClick={cancel}>Cancel export</button></div>}
          {output && <div className={styles.result}><video ref={exportedVideo} src={output.url} controls playsInline preload="metadata" aria-label="Exported captioned video" /><a className="button button-primary" href={output.url} download={output.name}>Download captioned video</a></div>}
          <div className={styles.subtitleDownloads}>{captionDownloads}</div>
          {!!issues.length && <p className={styles.note}>{issues[0]}</p>}
          <details className={styles.details}><summary>Video and export details</summary><p>{source.media.width} × {source.media.height} · {source.media.audioTracks ? "Original audio included in video export" : "This source has no audio track"}. Encoding support is checked on export. Styling is burned into video; SRT/VTT contain text and timing.</p><p>Keep your downloads before leaving. This session is not saved.</p><button type="button" className="text-button" disabled={!!busy} onClick={() => { if (!dirty || window.confirm("Remove this video and captions? Download your edits first.")) { video.current?.pause(); setSource(null); dispatch({ type: "scratch", id: ++importId.current }); invalidate(); } }}>Choose another video</button></details>
        </section>
        <aside className={styles.controls} aria-label="Caption controls">
          <div className={styles.tabs} role="tablist" aria-label="Studio panels">{(["captions", "style"] as const).map(value => <button key={value} type="button" role="tab" aria-selected={panel === value} aria-controls={`studio-${value}`} id={`tab-${value}`} tabIndex={panel === value ? 0 : -1} onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? "captions" : event.key === "End" ? "style" : panel === "captions" ? "style" : "captions"; setPanel(next); event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#tab-${next}`)?.focus(); } }} onClick={() => setPanel(value)}>{value === "captions" ? "Captions" : "Style"}</button>)}</div>
          <section id="studio-captions" role="tabpanel" aria-labelledby="tab-captions" hidden={panel !== "captions"}>
            <div className={styles.actions}><button type="button" className="button button-secondary" disabled={!!busy} onClick={() => subtitleInput.current?.click()}><Icon name="upload" size={16} />Import SRT / VTT</button><button type="button" className="button button-secondary" disabled={!!busy} onClick={addCaption}>Add caption</button><input ref={subtitleInput} className="sr-only" type="file" accept=".srt,.vtt" aria-label="Import captions" disabled={!!busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void importCaptions(file); }} /></div>
            <div className={styles.auto}><button type="button" className="button button-secondary" disabled>Generate captions</button><p>Automatic transcription needs the private processing service. Import captions or add your own for now.</p></div>
            <div className={styles.history}><span>{document.cues.length} captions</span><button type="button" disabled={!!busy || !session.past.length && !session.pendingBase} onClick={() => { dispatch({ type: "undo" }); invalidate(); }}>Undo</button><button type="button" disabled={!!busy || !session.future.length} onClick={() => { dispatch({ type: "redo" }); invalidate(); }}>Redo</button></div>
            <label className={styles.captionSearch}>Find a caption<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search caption text" /></label>
            <div className={styles.cueList} aria-label="Caption timeline">{document.cues.map((item, index) => !item.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ? null : <button key={item.id} type="button" className={selected === item.id ? styles.selectedCue : ""} aria-current={selected === item.id ? "true" : undefined} disabled={!!busy} onClick={() => { setSelected(item.id); if (item.start !== null) seek(item.start / 1000); }}><span>{index + 1}</span><div><small>{item.start === null ? "Check timing" : formatEditorTime(item.start, "vtt")}</small><p dir="auto">{item.text || "Empty caption"}</p></div></button>)}</div>
            {cue && <fieldset className={styles.cueEditor} disabled={!!busy}><legend>Edit caption {document.cues.indexOf(cue) + 1}</legend><div className={styles.times}>{(["start", "end"] as const).map(field => <label key={field}>{field === "start" ? "Start" : "End"}<input value={cue[`${field}Draft`] ?? (cue[field] === null ? "" : formatEditorTime(cue[field], document.format))} onChange={event => { dispatch({ type: "draft", id: cue.id, field, value: event.target.value }); invalidate(); }} onBlur={() => dispatch({ type: "commit" })} aria-invalid={cue[field] === null || cue.start !== null && cue.end !== null && cue.end <= cue.start} /></label>)}</div><label>Caption text<textarea ref={textSelection} rows={3} dir="auto" value={cue.text} maxLength={2000} onChange={event => { dispatch({ type: "draft", id: cue.id, field: "text", value: event.target.value }); invalidate(); }} onBlur={() => dispatch({ type: "commit" })} /></label><details className={styles.details}><summary>Caption editing tools</summary><div className={styles.actions}><button type="button" className="button button-secondary" onClick={() => applyEdit(() => splitStudioCue(document, cue.id, Math.round(time * 1000), textSelection.current?.selectionStart ?? 0, `studio-${++cueId.current}`))}>Split at playhead</button><button type="button" className="button button-secondary" onClick={() => applyEdit(() => mergeStudioCue(document, cue.id))}>Merge with next</button><button type="button" className="button button-secondary" onClick={() => applyEdit(() => ({ ...document, cues: [...document.cues].sort((a,b) => (a.start ?? Infinity) - (b.start ?? Infinity)) }))}>Sort by start time</button></div><p className={styles.note}>To split, place the playhead inside the caption and the text cursor between words. Word timings are never estimated.</p><label>Shift all captions (seconds)<input type="text" inputMode="decimal" value={shift} onChange={event => setShift(event.target.value)} /></label><button type="button" className="button button-secondary" onClick={() => applyEdit(() => shiftEditorCues(document, shift).document)}>Apply time shift</button></details><button type="button" className="text-button destructive-action" onClick={() => { dispatch({ type: "apply", document: deleteEditorCue(document, cue.id) }); setSelected(""); invalidate(); }}>Delete caption</button></fieldset>}
          </section>
          <section id="studio-style" role="tabpanel" aria-labelledby="tab-style" hidden={panel !== "style"}>
            <StyleControls style={style} disabled={!!busy} onChange={changeStyle} onPreset={value => { setStyle(value); invalidate(); }} onError={setError} />
          </section>
        </aside>
      </div>
    </>}
    {busy === "loading" && <div role="status" className={styles.note}>Checking your file… <button type="button" className="text-button" onClick={cancel}>Cancel</button></div>}
    {(error || session.error) && <p role="alert" className={styles.error}>{error || session.error}</p>}
    {session.notice && <p role="status" className={styles.note}>{session.notice}</p>}
  </section>;
}
