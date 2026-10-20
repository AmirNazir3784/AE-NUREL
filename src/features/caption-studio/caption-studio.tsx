"use client";
import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from "react";
import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import { FileUpload } from "@/components/tools/file-upload";
import { DownloadButton } from "@/components/tools/download-button";
import { UnsavedNavigation } from "@/features/srt-editor/unsaved-navigation";
import { editorSessionReducer, initialEditorSession, editorIsDirty } from "@/features/srt-editor/editor-session";
import { emptyEditor, openSubtitle, validateSubtitleFile, formatEditorTime, editorExportErrors, exportEditor, addEditorCue, deleteEditorCue, shiftEditorCues, type EditorDocument } from "@/lib/subtitle-editor";
import { STUDIO_PRESETS, STUDIO_LIMITS, studioIssues, studioFilename, studioFont, studioPlacement, paintStudioCaptions, activeStudioCues, splitStudioCue, mergeStudioCue, validateStudioFile, type StudioMedia, type StudioStyle } from "./studio-core";
import { inspectStudioVideo, exportStudioVideo } from "./studio-media";
import styles from "./studio.module.css";
import { StyleControls } from "./style-controls";
import { captionDocument, type AsrProgress, type TimedText } from "../local-asr/asr-core";
import { requestHybridTranscript } from "../hybrid-processing/client";
import { extractStudioAudio } from "./studio-audio";
import { GenerationControls, type StudioGenerationSettings } from "./generation-controls";
import type { AsrClient } from "../local-asr/asr-client";
import { PreviewAudioControls } from "./preview-audio-controls";
import { buildStudioAlignment, currentStudioAlignment, studioWordSpans, type StudioAlignment } from "./studio-alignment";
import { PreviewSpeedControls } from "./preview-speed-controls";

type Source = { file: File; url: string; media: StudioMedia };
function initialSession() { const document = emptyEditor(); return { ...initialEditorSession, document, saved: document }; }
function timeLabel(seconds: number) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`; }

export function CaptionStudio({ transcriptionAvailable = false }: { transcriptionAvailable?: boolean }) {
  const [source, setSource] = useState<Source | null>(null), [style, setStyle] = useState<StudioStyle>(STUDIO_PRESETS[0]);
  const [session, dispatch] = useReducer(editorSessionReducer, undefined, initialSession);
  const [shift, setShift] = useState("0"), [query, setQuery] = useState("");
  const textSelection = useRef<HTMLTextAreaElement>(null);
  const [selected, setSelected] = useState(""), [time, setTime] = useState(0), [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState<"loading" | "exporting" | "transcribing" | null>(null), [error, setError] = useState(""), [layoutHint, setLayoutHint] = useState("");
  const [transcriptionStage, setTranscriptionStage] = useState(""), [transcriptionProgress, setTranscriptionProgress] = useState<AsrProgress | null>(null);
  const asr = useRef<AsrClient | null>(null);
  const [alignment, setAlignment] = useState<StudioAlignment>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [format, setFormat] = useState<"mp4" | "webm">("mp4"), [progress, setProgress] = useState(0);
  const [output, setOutput] = useState<{ url: string; name: string } | null>(null);
  const exportedVideo = useRef<HTMLVideoElement>(null);
  const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null), player = useRef<HTMLDivElement>(null), subtitleInput = useRef<HTMLInputElement>(null), videoInput = useRef<HTMLInputElement>(null);
  const job = useRef<AbortController | null>(null), generation = useRef(0), cueId = useRef(0), importId = useRef(0), revision = useRef(0);
  const document = session.document!, cue = document.cues.find(item => item.id === selected);
  const usableAlignment = useMemo(() => currentStudioAlignment(document, alignment), [document, alignment]);
  const issues = useMemo(() => studioIssues(document, source?.media.duration ?? 0), [document, source]);
  const dirty = editorIsDirty(session);
  useEffect(() => () => { ++generation.current; job.current?.abort(); asr.current?.cancel(); }, []);
  useEffect(() => { const update = () => setFullscreen(window.document.fullscreenElement === player.current); window.document.addEventListener("fullscreenchange", update); return () => window.document.removeEventListener("fullscreenchange", update); }, []);
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
      const wordKey = style.wordHighlight ? JSON.stringify(studioWordSpans(active, usableAlignment, element!.currentTime * 1000)) : "";
      const key = active.map(c => c.id).join("|") + preference.matches + wordKey + (animated ? Math.floor(element!.currentTime * 60) : "");
      if (key === lastKey) return; lastKey = key;
      ctx!.clearRect(0, 0, overlay!.width, overlay!.height);
      try { paintStudioCaptions(ctx!, overlay!.width, overlay!.height, document, element!.currentTime * 1000, style, studioFont(style), preference.matches, usableAlignment); setLayoutHint(previous => previous ? "" : previous); }
      catch (failure) { setLayoutHint(failure instanceof Error ? failure.message : "Review this caption's layout."); }
    }
    function tick() { draw(); if (!element!.paused && !element!.ended) frame = requestAnimationFrame(tick); }
    function start() { cancelAnimationFrame(frame); tick(); }
    function stop() { cancelAnimationFrame(frame); draw(); }
    for (const event of ["loadeddata", "seeked", "timeupdate"]) element.addEventListener(event, draw);
    element.addEventListener("play", start); element.addEventListener("pause", stop); preference.addEventListener("change", draw);
    void window.document.fonts.ready.then(() => { if (!stopped) { lastKey = ""; start(); } }); draw();
    return () => { stopped = true; cancelAnimationFrame(frame); for (const event of ["loadeddata", "seeked", "timeupdate"]) element.removeEventListener(event, draw); element.removeEventListener("play", start); element.removeEventListener("pause", stop); preference.removeEventListener("change", draw); };
  }, [source, document, style, usableAlignment]);

  function invalidate() { ++revision.current; exportedVideo.current?.pause(); setOutput(null); setError(""); }
  async function toggleFullscreen() {
    try { if (!player.current?.requestFullscreen || !window.document.exitFullscreen) throw new Error("Fullscreen is unavailable in this browser."); if (window.document.fullscreenElement === player.current) await window.document.exitFullscreen(); else await player.current.requestFullscreen(); }
    catch { setError("Fullscreen is unavailable in this browser."); }
  }
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
      setSource({ file, media, url: URL.createObjectURL(file) }); dispatch({ type: "scratch", id: ++importId.current }); setSelected(""); setTime(0); setPlaying(false); setAlignment([]); setLayoutHint(""); setTranscriptionStage(""); setTranscriptionProgress(null); setQuery(""); setShift("0"); setStyle(STUDIO_PRESETS[0]); invalidate();
    } catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "This video could not be opened."); }
    finally { if (job.current === abort) { job.current = null; setBusy(null); } }
  }
  async function importCaptions(file?: File) {
    if (!file || busy || !source) return;
    if (dirty && !window.confirm("Replace these captions? Download your edits first.")) return;
    const run = ++generation.current; setBusy("loading"); setError("");
    try { validateSubtitleFile(file); const bytes = await file.arrayBuffer(); if (run !== generation.current) return;
      const loaded = openSubtitle(file, bytes); if (loaded.cues.length > STUDIO_LIMITS.cues) throw new Error("Import up to 500 captions.");
      dispatch({ type: "apply", document: loaded }); setAlignment([]); setSelected(loaded.cues[0]?.id ?? ""); invalidate();
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
      dispatch({ type: "apply", document: { ...document, cues } }); setSelected(id); invalidate();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "A caption could not be added."); }
  }
  function changeStyle(value: Partial<StudioStyle>) {
    setStyle(previous => {
      const next = { ...previous, preset: "Custom", ...value };
      if (value.position && value.position !== "custom") return studioPlacement(next, value.position);
      return value.y !== undefined ? { ...next, position: "custom" } : next;
    });
    invalidate();
  }
  async function render() {
    if (!source || busy) return;
    const abort = new AbortController(); job.current = abort; setBusy("exporting"); setProgress(0); invalidate(); const version = revision.current; video.current?.pause();
    try { const blob = await exportStudioVideo(source.file, source.media, document, style, format, abort.signal, setProgress, usableAlignment); abort.signal.throwIfAborted(); if (version !== revision.current) throw new Error("Captions or style changed during export. Export again to include your changes."); setOutput({ url: URL.createObjectURL(blob), name: studioFilename(source.file.name, format) }); }
    catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "Video export failed. Try another format."); }
    finally { if (job.current === abort) { job.current = null; setBusy(null); } }
  }
  async function generateCaptions(settings: StudioGenerationSettings) {
    if (!source || busy || !source.media.audioTracks) return;
    if (settings.mode === "server" && (!transcriptionAvailable || !settings.consent || settings.token.length < 32)) return;
    if (document.cues.length && !window.confirm("Replace these captions? Download your edits first.")) return;
    const abort = new AbortController(); job.current = abort; setBusy("transcribing"); setError(""); setTranscriptionProgress(null); video.current?.pause();
    try {
      setTranscriptionStage("Preparing audio on your device");
      let captions: EditorDocument, words: TimedText[];
      if (settings.mode === "server") {
        const audio = await extractStudioAudio(source.file, source.media.duration, abort.signal);
        const result = await requestHybridTranscript(audio, source.media.duration, settings.token, abort.signal, setTranscriptionStage);
        captions = captionDocument(result.words, result.duration, source.file.name, true);
        words = result.words;
      } else {
        const [{ AsrClient }, { transcribeStudioOnDevice }] = await Promise.all([import("../local-asr/asr-client"), import("./studio-transcription")]);
        abort.signal.throwIfAborted(); asr.current ??= new AsrClient();
        const labels: Record<AsrProgress["stage"], string> = { preparing: "Preparing audio on your device", loading: "Loading speech model", download: "Downloading speech model", detecting: "Checking for speech", transcribing: "Transcribing on your device", translating: "Translating", building: "Preparing captions" };
        const result = await transcribeStudioOnDevice(source.file, source.media.duration, settings, asr.current, abort.signal, value => { setTranscriptionStage(labels[value.stage]); setTranscriptionProgress(value); }, (navigator as Navigator & { deviceMemory?: number }).deviceMemory);
        captions = result.document; words = result.words;
      }
      abort.signal.throwIfAborted();
      dispatch({ type: "apply", document: captions, notice: "Captions ready. Review the text before exporting." });
      setAlignment(buildStudioAlignment(captions, words));
      setSelected(captions.cues[0]?.id ?? ""); setTranscriptionStage(previous => previous.startsWith("Server cleanup") ? previous : "Captions ready"); invalidate();
    } catch (failure) { setTranscriptionStage(previous => previous.startsWith("Server cleanup") ? previous : abort.signal.aborted ? "Transcription stopped" : "Transcription failed"); if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "Transcription failed. Try again."); }
    finally { if (job.current === abort) { job.current = null; setBusy(null); } }
  }
  function cancel() { ++generation.current; if (job.current) job.current.abort(); else setBusy(null); asr.current?.cancel(); setError(""); dispatch({ type: "apply", document, notice: busy === "exporting" ? "Video export cancelled." : busy === "transcribing" ? "Transcription cancellation requested." : "File check cancelled." }); }
  const captionDownloads = source && (["srt", "vtt"] as const).map(extension => <DownloadButton key={extension} label={`Download ${extension.toUpperCase()}`} filename={studioFilename(source.file.name, extension)} content={() => exportEditor(document, extension)} mimeType={extension === "vtt" ? "text/vtt;charset=utf-8" : "application/x-subrip;charset=utf-8"} variant="secondary" disabled={!!busy || !document.cues.length || !!editorExportErrors(document, extension).length} onDownloaded={() => dispatch({ type: "exported", filename: studioFilename(source.file.name, extension) })} onError={setError} />);

  return <section className={styles.studio} aria-label="Caption Studio" onKeyDown={event => { if (!busy && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); dispatch({ type: event.shiftKey ? "redo" : "undo" }); invalidate(); } }}>
    <UnsavedNavigation dirty={dirty} />
    <header className={styles.heading}><div><Link href="/tools" className={styles.back}>Free tools <span aria-hidden="true">/</span> Video captions</Link><h1>Auto Caption Generator</h1><p>Create, edit and style captions directly in your browser.</p></div></header>
    {!source ? <div className={styles.upload}><FileUpload accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" title="Start with your video" description="MP4, MOV or WebM with a codec your browser can decode." buttonLabel="Choose video" hint="Up to 2 minutes · 200 MiB · 1080p" busy={!!busy} validateFile={validateStudioFile} onFile={file => void loadVideo(file)} onError={setError} /><p className={styles.note}>Generate captions, import SRT/VTT, or add your own. Video editing and export stay on this device.</p></div> : <>
      <div className={styles.workspace}>
        <section className={styles.previewPanel} aria-label="Video preview">
          <div className={styles.sourceBar}><span title={source.file.name}>{source.file.name}</span><button type="button" className="button button-secondary" disabled={!!busy} onClick={() => videoInput.current?.click()}><Icon name="upload" size={16} />Change video</button><input ref={videoInput} type="file" className="sr-only" tabIndex={-1} aria-label="Change video file" accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" disabled={!!busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) { try { validateStudioFile(file); void loadVideo(file); } catch (failure) { setError(failure instanceof Error ? failure.message : "Choose a supported video."); } } }} /></div>
          <div ref={player} className={styles.player} style={{ "--video-ratio": source.media.width / source.media.height } as CSSProperties}>
          <div className={styles.stage} style={{ aspectRatio: `${source.media.width}/${source.media.height}`, width: `min(100%, ${source.media.width / source.media.height * 52}vh)` }}>
            <video ref={video} src={source.url} playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={event => setTime(event.currentTarget.currentTime)} onError={() => setError("The browser could not play this video. Choose a different encoding.")} />
            <canvas ref={canvas} width={source.media.width} height={source.media.height} aria-hidden="true" />
          </div>
          <div className={styles.transport}>
              <button type="button" aria-label={playing ? "Pause video" : "Play video"} disabled={!!busy} onClick={() => { if (video.current?.paused) void video.current.play().catch(() => setError("Playback could not start.")); else video.current?.pause(); }}>{playing ? "Ⅱ" : "▶"}</button>
              <span>{timeLabel(time)}</span>
              <input aria-label="Video timeline" type="range" min={0} max={source.media.duration} step={.01} value={time} style={{ "--range-fill": `${source.media.duration > 0 ? Math.min(100, Math.max(0, time / source.media.duration * 100)) : 0}%` } as CSSProperties} onChange={event => seek(Number(event.target.value))} disabled={!!busy} />
              <span>{timeLabel(source.media.duration)}</span>
              <PreviewAudioControls key={source.url} videoRef={video} hasAudio={!!source.media.audioTracks} disabled={!!busy} />
              <button type="button" aria-label={fullscreen ? "Exit fullscreen preview" : "Fullscreen preview"} onClick={() => void toggleFullscreen()}><Icon name="expand" size={17} /></button>
            </div>
          </div>
          {style.wordHighlight && alignment.length > usableAlignment.length && <p className={styles.note} role="status">Word highlighting is paused for changed captions. Undo your edits or generate captions again to restore alignment.</p>}
          {layoutHint && <p className={styles.note} role="status">{layoutHint}</p>}
          <details className={styles.details} key={source.url}><summary>Playback controls</summary><div className={styles.actions}><button type="button" className="button button-secondary" disabled={!!busy} onClick={() => seek(time - .1)}>Back 0.1s</button><button type="button" className="button button-secondary" disabled={!!busy} onClick={() => seek(time + .1)}>Forward 0.1s</button></div><PreviewSpeedControls key={source.url} videoRef={video} disabled={!!busy} /><p className={styles.note}>Preview speed and volume do not change the exported video.</p></details>
          <div className={styles.exportBar}><label className={styles.inline}>Video format<select value={format} disabled={!!busy} onChange={event => { setFormat(event.target.value as "mp4" | "webm"); setOutput(null); }}><option value="mp4">MP4</option><option value="webm">WebM</option></select></label><button type="button" className="button button-primary" disabled={!!busy || !!issues.length} onClick={() => void render()}><Icon name="download" size={17} />Export video</button></div>
          {busy === "exporting" && <div className={styles.progress} role="status"><progress max={100} value={progress} /><span>Exporting · {progress}%</span><button type="button" className="text-button" onClick={cancel}>Cancel export</button></div>}
          {output && <div className={styles.result}><video ref={exportedVideo} src={output.url} controls playsInline preload="metadata" aria-label="Exported captioned video" /><a className="button button-primary" href={output.url} download={output.name}>Download captioned video</a></div>}
          <div className={styles.subtitleDownloads}>{captionDownloads}</div>
          {!!issues.length && <p className={styles.note}>{issues[0]}</p>}
          <details className={styles.details}><summary>Video and export details</summary><p>{source.media.width} × {source.media.height} · {source.media.audioTracks ? "Original audio included in video export" : "This source has no audio track"}. Encoding support is checked on export. The video includes your styles; SRT/VTT contain only text and timing.</p><p>Your work stays in this session—download before leaving. Use Change video to start another project.</p></details>
        </section>
        <aside className={`${styles.controls} ${styles.captionSide}`} aria-label="Caption controls">
          <div className={styles.sideHeading}><strong>Captions</strong><span>Transcript &amp; timing</span></div>

          <section id="studio-captions" aria-label="Caption timeline and editing">
            <details className={styles.workflowSection} key={document.cues.length ? "captions-ready" : "captions-empty"} open={!document.cues.length ? true : undefined}>
              <summary><span>Generate / import</span><small>{document.cues.length ? "Replace or add captions" : "Start with your video"}</small></summary>
              <div className={styles.workflowBody}>
                <div className={styles.actions}><button type="button" className="button button-secondary" disabled={!!busy} onClick={() => subtitleInput.current?.click()}><Icon name="upload" size={16} />Import SRT / VTT</button><button type="button" className="button button-secondary" disabled={!!busy} onClick={addCaption}>Add caption</button><input ref={subtitleInput} className="sr-only" type="file" accept=".srt,.vtt" aria-label="Import captions" disabled={!!busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void importCaptions(file); }} /></div>
                <GenerationControls key={source.url} available={transcriptionAvailable} busy={!!busy} transcribing={busy === "transcribing"} duration={source.media.duration} hasAudio={!!source.media.audioTracks} stage={transcriptionStage} progress={transcriptionProgress} onGenerate={settings => void generateCaptions(settings)} onCancel={cancel} />
              </div>
            </details>
            <div className={styles.captionWorkspace}>
              <div className={styles.captionToolbar}>
                <div><strong>Captions</strong><small>{document.cues.length} in timeline</small></div>
                <div className={styles.history}><button type="button" disabled={!!busy || !session.past.length && !session.pendingBase} onClick={() => { dispatch({ type: "undo" }); invalidate(); }}>Undo</button><button type="button" disabled={!!busy || !session.future.length} onClick={() => { dispatch({ type: "redo" }); invalidate(); }}>Redo</button></div>
              </div>
              <label className={styles.captionSearch}><span className="sr-only">Search caption text</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a caption…" /></label>

              <div className={styles.cueList} aria-label="Caption timeline">{document.cues.map((item, index) => !item.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ? null : <button key={item.id} type="button" className={selected === item.id ? styles.selectedCue : ""} title={item.text} aria-current={selected === item.id ? "true" : undefined} disabled={!!busy} onClick={() => { setSelected(item.id); if (item.start !== null) seek(item.start / 1000); }}><span className={styles.cueNumber}>{index + 1}</span><div><small>{item.start === null ? "Check timing" : formatEditorTime(item.start, "vtt")}</small><p dir="auto">{item.text || "Empty caption"}</p></div></button>)}</div>
              {query && !document.cues.some(item => item.text.toLocaleLowerCase().includes(query.toLocaleLowerCase())) && <p className={styles.emptySearch}>No captions match. Try a shorter search.</p>}
              {cue && <fieldset className={styles.cueEditor} disabled={!!busy}><legend>Edit caption {document.cues.indexOf(cue) + 1}</legend><div className={styles.times}>{(["start", "end"] as const).map(field => <label key={field}>{field === "start" ? "Start" : "End"}<input value={cue[`${field}Draft`] ?? (cue[field] === null ? "" : formatEditorTime(cue[field], document.format))} onChange={event => { dispatch({ type: "draft", id: cue.id, field, value: event.target.value }); invalidate(); }} onBlur={() => dispatch({ type: "commit" })} aria-invalid={cue[field] === null || cue.start !== null && cue.end !== null && cue.end <= cue.start} /></label>)}</div><label>Caption text<textarea ref={textSelection} rows={3} dir="auto" value={cue.text} maxLength={2000} onChange={event => { dispatch({ type: "draft", id: cue.id, field: "text", value: event.target.value }); invalidate(); }} onBlur={() => dispatch({ type: "commit" })} /></label><details className={styles.details}><summary>Edit tools</summary><div className={styles.actions}><button type="button" className="button button-secondary" onClick={() => applyEdit(() => splitStudioCue(document, cue.id, Math.round(time * 1000), textSelection.current?.selectionStart ?? 0, `studio-${++cueId.current}`))}>Split at playhead</button><button type="button" className="button button-secondary" onClick={() => applyEdit(() => mergeStudioCue(document, cue.id))}>Merge with next</button><button type="button" className="button button-secondary" onClick={() => applyEdit(() => ({ ...document, cues: [...document.cues].sort((a,b) => (a.start ?? Infinity) - (b.start ?? Infinity)) }))}>Sort by time</button></div><p className={styles.note}>Split at the playhead and text cursor.</p><label>Shift all (seconds)<input type="text" inputMode="decimal" value={shift} onChange={event => setShift(event.target.value)} /></label><button type="button" className="button button-secondary" onClick={() => applyEdit(() => shiftEditorCues(document, shift).document)}>Apply shift</button></details><button type="button" className="text-button destructive-action" onClick={() => { dispatch({ type: "apply", document: deleteEditorCue(document, cue.id) }); setSelected(""); invalidate(); }}>Delete caption</button></fieldset>}
              {!cue && !!document.cues.length && <p className={styles.selectHelp}>Select a caption above to edit its text and timing.</p>}
            </div>
          </section>
        </aside>
        <aside className={`${styles.controls} ${styles.styleSide}`} aria-label="Caption style controls">
          <div className={styles.sideHeading}><strong>Style</strong><span>Fonts, color &amp; motion</span></div>
          <section id="studio-style" aria-label="Style presets and customization">
            <StyleControls style={style} disabled={!!busy} wordTimingAvailable={!!usableAlignment.length} onChange={changeStyle} onPreset={value => { setStyle(value); invalidate(); }} onError={setError} />
          </section>
        </aside>
      </div>
    </>}
    {busy === "loading" && <div role="status" className={styles.note}>Checking your file… <button type="button" className="text-button" onClick={cancel}>Cancel</button></div>}
    {(error || session.error) && <p role="alert" className={styles.error}>{error || session.error}</p>}
    {session.notice && <p role="status" className={styles.note}>{session.notice}</p>}
  </section>;
}
