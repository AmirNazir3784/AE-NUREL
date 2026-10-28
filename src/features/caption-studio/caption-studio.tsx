"use client";
import { useEffect, useEffectEvent, useMemo, useReducer, useRef, useState, type CSSProperties } from "react";
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
import { clearStudioTextRangeCache } from "./studio-text-ranges";
import { ReplaceWorkDialog } from "./replace-work-dialog";
import { captionAccess, type CaptionAccess } from "../membership/caption-policy";
import { memberRequest, type MemberStatus } from "../membership/member-client";
import { accessibleStyle, type CaptionProjectData } from "../membership/project-validation";
import { paintStudioWatermark } from "./studio-watermark";

type Source = { file: File; url: string; media: StudioMedia };
function initialSession() { const document = emptyEditor(); return { ...initialEditorSession, document, saved: document }; }
function timeLabel(seconds: number) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`; }
async function sourceFingerprint(file:File){
  // A bounded fingerprint for reattachment; no video is read into one large
  // allocation or uploaded. It is a matching aid, not a whole-file checksum.
  const bytes=await new Blob([String(file.size),file.slice(0,65536),file.slice(Math.max(0,file.size-65536))]).arrayBuffer();
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
}

export function CaptionStudio({ transcriptionAvailable = false, embedded = false, initialFile, accessEnabled = false, initialProjectId }: { transcriptionAvailable?: boolean; embedded?: boolean; initialFile?: File; accessEnabled?:boolean;initialProjectId?:string }) {
  const [source, setSource] = useState<Source | null>(null), [chosenStyle, setStyle] = useState<StudioStyle>(STUDIO_PRESETS[0]);
  const [access,setAccess]=useState<CaptionAccess>(()=>({...captionAccess(!accessEnabled,!accessEnabled),enabled:accessEnabled}));
  const [accessLoading,setAccessLoading]=useState(accessEnabled),[accessError,setAccessError]=useState('');
  const style=useMemo(()=>accessEnabled?accessibleStyle(chosenStyle,access.premium):chosenStyle,[chosenStyle,accessEnabled,access.premium]);
  const videoIdentity=useRef(''),projectRestored=useRef(false);
  const [project,setProject]=useState<{id:string;revision:number;title:string}|null>(null),[projectBusy,setProjectBusy]=useState(false),[projectNotice,setProjectNotice]=useState('');
  const [cloudSaved,setCloudSaved]=useState<{document:EditorDocument;styleSignature:string}|null>(null);
  const [session, dispatch] = useReducer(editorSessionReducer, undefined, initialSession);
  const [shift, setShift] = useState("0"), [query, setQuery] = useState("");
  const textSelection = useRef<HTMLTextAreaElement>(null);
  const [selected, setSelected] = useState(""), [time, setTime] = useState(0), [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState<"loading" | "exporting" | "transcribing" | null>(null), [error, setError] = useState(""), [layoutHint, setLayoutHint] = useState("");
  const [transcriptionStage, setTranscriptionStage] = useState(""), [transcriptionProgress, setTranscriptionProgress] = useState<AsrProgress | null>(null);
  const asr = useRef<AsrClient | null>(null);
  const [alignment, setAlignment] = useState<StudioAlignment>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [replacement, setReplacement] = useState<{ message: string; action: () => void } | null>(null);
  const [format, setFormat] = useState<"mp4" | "webm">("mp4"), [progress, setProgress] = useState(0);
  const [output, setOutput] = useState<{ url: string; name: string } | null>(null);
  const exportedVideo = useRef<HTMLVideoElement>(null);
  const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null), player = useRef<HTMLDivElement>(null), subtitleInput = useRef<HTMLInputElement>(null), videoInput = useRef<HTMLInputElement>(null);
  const job = useRef<AbortController | null>(null), generation = useRef(0), cueId = useRef(0), importId = useRef(0), revision = useRef(0);
  const document = session.document!, cue = document.cues.find(item => item.id === selected);
  const usableAlignment = useMemo(() => currentStudioAlignment(document, alignment), [document, alignment]);
  const issues = useMemo(() => studioIssues(document, source?.media.duration ?? 0), [document, source]);
  const dirty = cloudSaved ? cloudSaved.document!==document || cloudSaved.styleSignature!==JSON.stringify(style) : editorIsDirty(session);
  async function refreshAccess(signal?:AbortSignal){
    try{const status=await memberRequest<MemberStatus>('access',{signal});setAccess(status.access);setAccessError('');}
    catch(failure){if(!signal?.aborted)setAccessError(failure instanceof Error?failure.message:'Your account could not be checked.');}
    finally{if(!signal?.aborted)setAccessLoading(false);}
  }
  const refreshMember = useEffectEvent((signal?:AbortSignal)=>{void refreshAccess(signal);});
  useEffect(()=>{if(!accessEnabled)return;const abort=new AbortController();queueMicrotask(()=>{if(!abort.signal.aborted)refreshMember(abort.signal);});const focus=()=>refreshMember(abort.signal);window.addEventListener('focus',focus);return()=>{abort.abort();window.removeEventListener('focus',focus);};},[accessEnabled]);
  const openInitial = useEffectEvent((file: File) => { void loadVideo(file); });
  useEffect(() => { if (!initialFile) return; const timer = setTimeout(() => openInitial(initialFile), 0); return () => clearTimeout(timer); }, [initialFile]);
  useEffect(() => () => { ++generation.current; job.current?.abort(); asr.current?.cancel(); }, []);
  useEffect(() => { const update = () => setFullscreen(window.document.fullscreenElement === player.current); window.document.addEventListener("fullscreenchange", update); return () => window.document.removeEventListener("fullscreenchange", update); }, []);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);
  useEffect(() => () => clearStudioTextRangeCache(), [source?.url]);
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
      try { paintStudioCaptions(ctx!, overlay!.width, overlay!.height, document, element!.currentTime * 1000, style, studioFont(style), preference.matches, usableAlignment); paintStudioWatermark(ctx!,overlay!.width,overlay!.height,accessEnabled&&access.watermark); setLayoutHint(previous => previous ? "" : previous); }
      catch (failure) { setLayoutHint(failure instanceof Error ? failure.message : "Review this caption's layout."); }
    }
    function tick() { draw(); if (!element!.paused && !element!.ended) frame = requestAnimationFrame(tick); }
    function start() { cancelAnimationFrame(frame); tick(); }
    function stop() { cancelAnimationFrame(frame); draw(); }
    for (const event of ["loadeddata", "seeked", "timeupdate"]) element.addEventListener(event, draw);
    element.addEventListener("play", start); element.addEventListener("pause", stop); preference.addEventListener("change", draw);
    void window.document.fonts.ready.then(() => { if (!stopped) { lastKey = ""; start(); } }); draw();
    return () => { stopped = true; cancelAnimationFrame(frame); for (const event of ["loadeddata", "seeked", "timeupdate"]) element.removeEventListener(event, draw); element.removeEventListener("play", start); element.removeEventListener("pause", stop); preference.removeEventListener("change", draw); };
  }, [source, document, style, usableAlignment, accessEnabled, access.watermark]);

  function invalidate() { ++revision.current; exportedVideo.current?.pause(); setOutput(null); setError(""); }
  async function toggleFullscreen() {
    setError("");
    try { if (!player.current?.requestFullscreen || !window.document.exitFullscreen) throw new Error("Fullscreen is unavailable in this browser."); if (window.document.fullscreenElement === player.current) await window.document.exitFullscreen(); else await player.current.requestFullscreen(); }
    catch { setError("Fullscreen is unavailable in this browser."); }
  }
  function seek(value: number) {
    // Chromium may quantize a requested seek one microsecond early. Nudge the
    // preview two microseconds forward; subtitle/export timestamps never change.
    if (video.current && source) { video.current.currentTime = Math.min(source.media.duration, Math.max(0, value) + .000002); setTime(video.current.currentTime); }
  }
  async function loadVideo(file: File, confirmed = false) {
    if (busy) return;
    if (dirty && !confirmed) { setReplacement({ message: "This replaces the video and its captions. Download your edits first.", action: () => { void loadVideo(file, true); } }); return; }
    video.current?.pause();
    job.current?.abort(); const abort = new AbortController(), run = ++generation.current; job.current = abort;
    setBusy("loading"); setError("");
    try { const media = await inspectStudioVideo(file, abort.signal); abort.signal.throwIfAborted(); if (run !== generation.current) return;
      let restored:(CaptionProjectData&{id:string;revision:number})|null=null;
      if(initialProjectId&&!projectRestored.current){
        restored=await memberRequest<CaptionProjectData&{id:string;revision:number}>('projects/'+initialProjectId,{signal:abort.signal});
        if(restored.source.filename!==file.name||Math.abs(restored.source.durationSeconds-media.duration)>.05||restored.source.width!==media.width||restored.source.height!==media.height||restored.source.fingerprint&&restored.source.fingerprint!==await sourceFingerprint(file))throw new Error('Choose the original video used in this project. Its name, size fingerprint and video details must match.');
        projectRestored.current=true;
      }
      abort.signal.throwIfAborted();if(run!==generation.current)return;
      videoIdentity.current=crypto.randomUUID();setProject(restored?{id:restored.id,revision:restored.revision,title:restored.title}:null);setCloudSaved(restored?{document:restored.captions,styleSignature:JSON.stringify(restored.style)}:null);setProjectNotice('');
      setSource({ file, media, url: URL.createObjectURL(file) }); dispatch({ type: "scratch", id: ++importId.current }); setSelected(""); setTime(0); setPlaying(false); setAlignment([]); setLayoutHint(""); setTranscriptionStage(""); setTranscriptionProgress(null); setQuery(""); setShift("0"); if (source) setStyle(STUDIO_PRESETS[0]); invalidate();
      if(restored){dispatch({type:'apply',document:restored.captions,notice:'Your saved caption project is open.'});setStyle(restored.style);setAlignment(restored.alignment);setSelected(restored.captions.cues[0]?.id||'');}
    } catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "This video could not be opened."); }
    finally { if (job.current === abort) { job.current = null; setBusy(null); } }
  }
  async function importCaptions(file?: File, confirmed = false) {
    if (!file || busy || !source) return;
    if (dirty && !confirmed) { setReplacement({ message: "This replaces your captions. Download your edits first.", action: () => { void importCaptions(file, true); } }); return; }
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
    try { const policy=accessEnabled?(await memberRequest<{access:CaptionAccess}>('exports',{method:'POST',body:'{}',signal:abort.signal})).access:access;setAccess(policy);if(accessEnabled&&source.media.duration>policy.maxSeconds)throw new Error(`Your plan supports videos up to ${policy.maxSeconds} seconds.`);const exportStyle=accessEnabled?accessibleStyle(style,policy.premium):style;const blob = await exportStudioVideo(source.file, source.media, document, exportStyle, format, abort.signal, setProgress, usableAlignment, accessEnabled&&policy.watermark); abort.signal.throwIfAborted(); if (version !== revision.current) throw new Error("Captions or style changed during export. Export again to include your changes."); setOutput({ url: URL.createObjectURL(blob), name: studioFilename(source.file.name, format) }); }
    catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "Video export failed. Try another format."); }
    finally { if (job.current === abort) { job.current = null; setBusy(null); } }
  }
  async function generateCaptions(settings: StudioGenerationSettings, confirmed = false) {
    if (!source || busy || !source.media.audioTracks) return;
    if (settings.mode === "server" && (!transcriptionAvailable || !settings.consent || settings.token.length < 32)) return;
    if (document.cues.length && !confirmed) { setReplacement({ message: "Generating again replaces these captions. Download your edits first.", action: () => { void generateCaptions(settings, true); } }); return; }
    const abort = new AbortController(); job.current = abort; setBusy("transcribing"); setError(""); dispatch({ type: "apply", document }); setTranscriptionProgress(null); video.current?.pause();
    try {
      let jobId:string|undefined;
      if(accessEnabled){const permission=await memberRequest<{jobId:string;access:CaptionAccess}>('jobs',{method:'POST',body:JSON.stringify({videoId:videoIdentity.current,duration:source.media.duration,quality:settings.quality}),signal:abort.signal});jobId=permission.jobId;setAccess(permission.access);}
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
        const result = await transcribeStudioOnDevice(source.file, source.media.duration, settings, asr.current, abort.signal, value => { setTranscriptionStage(labels[value.stage]); setTranscriptionProgress(previous => ({ ...value, warning: value.warning ?? previous?.warning })); }, (navigator as Navigator & { deviceMemory?: number }).deviceMemory);
        captions = result.document; words = result.words;
      }
      abort.signal.throwIfAborted();
      dispatch({ type: "apply", document: captions, notice: "Your captions are ready to edit." });
      setAlignment(buildStudioAlignment(captions, words));
      if(jobId)void memberRequest('jobs/'+jobId+'/complete',{method:'POST',body:'{}'}).catch(()=>{});
      setSelected(captions.cues[0]?.id ?? ""); setTranscriptionStage(previous => previous.startsWith("Server cleanup") ? previous : "Captions ready"); invalidate();
    } catch (failure) { setTranscriptionStage(previous => previous.startsWith("Server cleanup") ? previous : abort.signal.aborted ? "Transcription stopped" : "Transcription failed"); if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "Transcription failed. Try again."); }
    finally { if (job.current === abort) { job.current = null; setBusy(null); } }
  }
  function cancel() { ++generation.current; if (job.current) job.current.abort(); else setBusy(null); asr.current?.cancel(); setError(""); dispatch({ type: "apply", document, notice: busy === "exporting" ? "Video export cancelled." : busy === "transcribing" ? "Transcription cancellation requested." : "File check cancelled." }); }
  async function saveProject(){
    if(!source||busy||projectBusy)return;setProjectBusy(true);setProjectNotice('');
    try{const saved=await memberRequest<{id:string;revision:number;title:string}>(project?'projects/'+project.id:'projects',{method:project?'PUT':'POST',body:JSON.stringify({schemaVersion:1,title:project?.title||source.file.name.slice(0,100),revision:project?.revision,source:{filename:source.file.name,durationSeconds:source.media.duration,width:source.media.width,height:source.media.height,fingerprint:await sourceFingerprint(source.file)},captions:document,style,alignment:usableAlignment})});setProject(saved);setCloudSaved({document,styleSignature:JSON.stringify(style)});setProjectNotice('Project saved. Your original video stays on this device.');}
    catch(failure){setProjectNotice(failure instanceof Error?failure.message:'Your project could not be saved.');}
    finally{setProjectBusy(false);}
  }
  const captionDownloads = source && (["srt", "vtt"] as const).map(extension => <DownloadButton key={extension} label={`Download ${extension.toUpperCase()}`} filename={studioFilename(source.file.name, extension)} content={() => exportEditor(document, extension)} mimeType={extension === "vtt" ? "text/vtt;charset=utf-8" : "application/x-subrip;charset=utf-8"} variant="secondary" disabled={!!busy || !document.cues.length || !!editorExportErrors(document, extension).length} onDownloaded={() => dispatch({ type: "exported", filename: studioFilename(source.file.name, extension) })} onError={setError} />);

  return <section className={styles.studio} aria-label="Caption Studio" data-empty={!source || undefined} onKeyDown={event => { if (!busy && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); dispatch({ type: event.shiftKey ? "redo" : "undo" }); invalidate(); } }}>
    <UnsavedNavigation dirty={dirty} />
    {replacement && <ReplaceWorkDialog message={replacement.message} onCancel={() => setReplacement(null)} onConfirm={() => { const action = replacement.action; setReplacement(null); action(); }} />}
    {!embedded && <header className={styles.heading}><div><Link href="/tools" className={styles.back}>Free tools <span aria-hidden="true">/</span> Video captions</Link><h1>Auto Caption Generator</h1><p>Create, edit and style captions directly in your browser.</p></div></header>}
      <div className={styles.workspace}>
        <section className={styles.previewPanel} aria-label={source ? "Video preview" : "Upload video"}>
          {source ? <>
          <div className={styles.sourceBar}><span title={source.file.name}>{source.file.name}</span><button type="button" className="button button-secondary" disabled={!!busy} onClick={() => videoInput.current?.click()}><Icon name="upload" size={16} />Change video</button><input ref={videoInput} type="file" className="sr-only" tabIndex={-1} aria-label="Change video file" accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" disabled={!!busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) { try { validateStudioFile(file); void loadVideo(file); } catch (failure) { setError(failure instanceof Error ? failure.message : "Choose a supported video."); } } }} /></div>
          <div ref={player} className={styles.player} style={{ "--video-ratio": source.media.width / source.media.height } as CSSProperties}>
          <div className={styles.stage} style={{ aspectRatio: `${source.media.width}/${source.media.height}`, width: `min(100%, ${source.media.width / source.media.height * 52}vh)` }}>
            <video ref={video} src={source.url} playsInline preload="metadata" onPlay={() => { exportedVideo.current?.pause(); setPlaying(true); }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={event => setTime(event.currentTarget.currentTime)} onError={() => setError("The browser could not play this video. Choose a different encoding.")} />
            <canvas ref={canvas} width={source.media.width} height={source.media.height} aria-hidden="true" />
          </div>
          <div className={styles.transport}>
            <button type="button" aria-label={playing ? "Pause video" : "Play video"} disabled={!!busy} onClick={() => { if (video.current?.paused) void video.current.play().catch(() => setError("Playback could not start.")); else video.current?.pause(); }}>{playing ? "Ⅱ" : "▶"}</button>
            <div className={styles.transportNudge} role="group" aria-label="Frame stepping">
              <button type="button" title="Back 0.1 seconds" aria-label="Back 0.1 seconds" disabled={!!busy} onClick={() => seek(time - .1)}><Icon name="reset" size={16} /></button>
              <button type="button" title="Forward 0.1 seconds" aria-label="Forward 0.1 seconds" disabled={!!busy} onClick={() => seek(time + .1)}><Icon name="arrow" size={16} /></button>
            </div>
            <span>{timeLabel(time)}</span>
            <input aria-label="Video timeline" type="range" min={0} max={source.media.duration} step={.01} value={time} style={{ "--range-fill": `${source.media.duration > 0 ? Math.min(100, Math.max(0, time / source.media.duration * 100)) : 0}%` } as CSSProperties} onChange={event => seek(Number(event.target.value))} disabled={!!busy} />
            <span>{timeLabel(source.media.duration)}</span>
            <PreviewSpeedControls key={`speed-${source.url}`} videoRef={video} disabled={!!busy} />
            <PreviewAudioControls key={`audio-${source.url}`} videoRef={video} hasAudio={!!source.media.audioTracks} disabled={!!busy} />
            <button type="button" aria-label={fullscreen ? "Exit fullscreen preview" : "Fullscreen preview"} onClick={() => void toggleFullscreen()}><Icon name="expand" size={17} /></button>
            </div>
          </div>
          {style.wordHighlight && alignment.length > usableAlignment.length && <p className={styles.note} role="status">Word highlighting is paused for changed captions. Undo your edits or generate captions again to restore alignment.</p>}
          {layoutHint && <p className={styles.note} role="status">{layoutHint}</p>}
          
          <div className={styles.processingArea} aria-label="Video processing and downloads">
            <h2 className={styles.centerTaskTitle}>{document.cues.length ? "Export your captions" : "Create captions"}</h2>
            <details className={styles.workflowSection} open={!document.cues.length || busy === "transcribing" ? true : undefined}>
              <summary><span>Generate / import</span><small>{document.cues.length ? "Replace or add captions" : "Start with your video"}</small></summary>
              <div className={styles.workflowBody}>
                <div className={styles.actions}><button type="button" className="button button-secondary" disabled={!!busy} onClick={() => subtitleInput.current?.click()}><Icon name="upload" size={16} />Import SRT / VTT</button>{!document.cues.length && <button type="button" className="button button-secondary" disabled={!!busy} onClick={addCaption}>Add caption</button>}<input ref={subtitleInput} className="sr-only" type="file" accept=".srt,.vtt" aria-label="Import captions" disabled={!!busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void importCaptions(file); }} /></div>
                {accessEnabled&&<div className={styles.membershipStatus} aria-live="polite">{accessLoading?<p>Checking your account…</p>:accessError?<p>{accessError} <button type="button" className="text-button" onClick={()=>void refreshAccess()}>Try again</button></p>:<><strong>{access.premium?'Source Window package · premium captions':'Free · 3 caption videos per day'}</strong><p>{access.signedIn?access.premium?'All caption styles, Accurate processing and watermark-free video export are unlocked.':`${access.remaining} of 3 available today · up to 60 seconds · AENural watermark on video exports.`:'Sign in with a verified email to use your daily allowance and save projects.'}</p>{!access.premium&&<p>Resets at {new Date(access.resetsAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',timeZoneName:'short'})}. Retries for the same video in this session use the same daily slot.</p>}<a href={access.signedIn?'/pricing#plans':'/sign-in'} className="text-button">{access.signedIn?'Unlock with the $20 package':'Sign in or create a free account'}</a></>}</div>}
                <GenerationControls key={source.url} available={transcriptionAvailable} busy={!!busy||accessEnabled&&(accessLoading||!!accessError||!access.signedIn)} transcribing={busy === "transcribing"} duration={source.media.duration} hasAudio={!!source.media.audioTracks} stage={transcriptionStage} progress={transcriptionProgress} access={accessEnabled?access:undefined} onGenerate={settings => void generateCaptions(settings)} onCancel={cancel} />
              </div>
            </details>
          </div>
          {!!document.cues.length && <div className={styles.exportBar}><label className={styles.inline}>Video format<select value={format} disabled={!!busy} onChange={event => { setFormat(event.target.value as "mp4" | "webm"); setOutput(null); }}><option value="mp4">MP4</option><option value="webm">WebM</option></select></label><button type="button" className="button button-primary" disabled={!!busy || !!issues.length} onClick={() => void render()}><Icon name="download" size={17} />Export video</button></div>}
          {busy === "exporting" && <div className={styles.progress} role="status"><progress max={100} value={progress} /><span>Exporting · {progress}%</span><button type="button" className="text-button" onClick={cancel}>Cancel export</button></div>}
          {output && <div className={styles.result}><video ref={exportedVideo} src={output.url} controls playsInline preload="metadata" aria-label="Exported captioned video" onPlay={() => video.current?.pause()} /><a className="button button-primary" href={output.url} download={output.name}>Download captioned video</a></div>}
          {!!document.cues.length && <div className={styles.subtitleDownloads}>{captionDownloads}</div>}
          {accessEnabled&&!!document.cues.length&&<div className={styles.membershipStatus}><button type="button" className="button button-secondary" onClick={()=>void saveProject()} disabled={!!busy||projectBusy||!access.signedIn}>{projectBusy?'Saving project…':project?'Save project changes':'Save caption project'}</button><a href="/account/projects" className="text-button">Your saved projects</a><p>Captions, timing and styles are saved. Reattach the original video when reopening.</p>{projectNotice&&<p role="status">{projectNotice}</p>}</div>}
          {!!issues.length && <p className={styles.note}>{issues[0]}</p>}
          {!!document.cues.length && <details className={styles.details}><summary>Video and export details</summary><p>{source.media.width} × {source.media.height} · {source.media.audioTracks ? "Original audio included in video export" : "This source has no audio track"}. Encoding support is checked on export. The video includes your styles; SRT/VTT contain only text and timing.</p><p>Your work stays in this session—download before leaving. Use Change video to start another project.</p></details>}
          </> : <div className={styles.emptyPreview}>
            <div className={styles.emptyPreviewHeader}><span>VIDEO</span><span>Ready for your footage</span></div>
            <div className={styles.upload}><FileUpload accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" title="Start with your video" description="MP4, MOV or WebM with a codec your browser can decode." buttonLabel="Choose video" hint="Up to 2 minutes · 200 MiB · 1080p" busy={!!busy} validateFile={validateStudioFile} onFile={file => void loadVideo(file)} onError={setError} /></div>
            <div className={styles.localSetupNote}><Icon name="volume" size={16} /><p>Generate captions when you’re ready. Your video stays on this device.</p></div>
          </div>}
        </section>
        <aside className={`${styles.controls} ${styles.captionSide}`} aria-label="Caption controls">
          <div className={styles.sideHeading}><strong>Captions</strong><span>Transcript &amp; timing</span></div>

          <section id="studio-captions" aria-label="Caption timeline and editing">
            {document.cues.length ? <>
            <div className={styles.captionWorkspace}>
              <div className={styles.captionToolbar}>
                <div><strong>Captions</strong><small>{document.cues.length} in timeline</small></div>
                <button type="button" className={styles.captionAdd} disabled={!!busy} onClick={addCaption} aria-label="Add caption"><Icon name="plus" size={17} /> Add</button>
                <div className={styles.history}><button type="button" disabled={!!busy || !session.past.length && !session.pendingBase} onClick={() => { dispatch({ type: "undo" }); invalidate(); }}>Undo</button><button type="button" disabled={!!busy || !session.future.length} onClick={() => { dispatch({ type: "redo" }); invalidate(); }}>Redo</button></div>
              </div>
              <label className={styles.captionSearch}><span className="sr-only">Search caption text</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a caption…" /></label>

              <div className={styles.cueList} aria-label="Caption timeline">{document.cues.map((item, index) => !item.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ? null : <button key={item.id} type="button" className={selected === item.id ? styles.selectedCue : ""} title={item.text} aria-current={selected === item.id ? "true" : undefined} disabled={!!busy} onClick={() => { setSelected(item.id); if (item.start !== null) seek(item.start / 1000); }}><span className={styles.cueNumber}>{index + 1}</span><div><small>{item.start === null ? "Check timing" : formatEditorTime(item.start, "vtt")}</small><p dir="auto">{item.text || "Empty caption"}</p></div></button>)}</div>
              {query && !document.cues.some(item => item.text.toLocaleLowerCase().includes(query.toLocaleLowerCase())) && <p className={styles.emptySearch}>No captions match. Try a shorter search.</p>}
              {cue && <fieldset className={styles.cueEditor} disabled={!!busy}><legend>Edit caption {document.cues.indexOf(cue) + 1}</legend><div className={styles.times}>{(["start", "end"] as const).map(field => <label key={field}>{field === "start" ? "Start" : "End"}<input value={cue[`${field}Draft`] ?? (cue[field] === null ? "" : formatEditorTime(cue[field], document.format))} onChange={event => { dispatch({ type: "draft", id: cue.id, field, value: event.target.value }); invalidate(); }} onBlur={() => dispatch({ type: "commit" })} aria-invalid={cue[field] === null || cue.start !== null && cue.end !== null && cue.end <= cue.start} /></label>)}</div><label>Caption text<textarea ref={textSelection} rows={3} dir="auto" value={cue.text} maxLength={2000} onChange={event => { dispatch({ type: "draft", id: cue.id, field: "text", value: event.target.value }); invalidate(); }} onBlur={() => dispatch({ type: "commit" })} /></label><details className={styles.details}><summary>Edit tools</summary><div className={styles.actions}><button type="button" className="button button-secondary" onClick={() => applyEdit(() => splitStudioCue(document, cue.id, Math.round(time * 1000), textSelection.current?.selectionStart ?? 0, `studio-${++cueId.current}`))}>Split at playhead</button><button type="button" className="button button-secondary" onClick={() => applyEdit(() => mergeStudioCue(document, cue.id))}>Merge with next</button><button type="button" className="button button-secondary" onClick={() => applyEdit(() => ({ ...document, cues: [...document.cues].sort((a,b) => (a.start ?? Infinity) - (b.start ?? Infinity)) }))}>Sort by time</button></div><p className={styles.note}>Split at the playhead and text cursor.</p><label>Shift all (seconds)<input type="text" inputMode="decimal" value={shift} onChange={event => setShift(event.target.value)} /></label><button type="button" className="button button-secondary" onClick={() => applyEdit(() => shiftEditorCues(document, shift).document)}>Apply shift</button></details><button type="button" className="text-button destructive-action" onClick={() => { dispatch({ type: "apply", document: deleteEditorCue(document, cue.id) }); setSelected(""); invalidate(); }}>Delete caption</button></fieldset>}
              {!cue && !!document.cues.length && <p className={styles.selectHelp}>Select a caption above to edit its text and timing.</p>}
            </div>
            </> : <div className={styles.emptyTranscript}><span className={styles.emptyTranscriptIcon} aria-hidden="true"><Icon name="subtitle" size={24} /></span><h3>Your words start here</h3><p>Generate or import captions beneath the video; your transcript and editing tools will appear here.</p><div className={styles.transcriptSkeleton} aria-hidden="true"><i /><i /><i /></div><span>Text · timing · search · undo</span></div>}
          </section>
        </aside>
        <aside className={`${styles.controls} ${styles.styleSide}`} aria-label="Caption style controls">
          <div className={styles.sideHeading}><strong>Style</strong><span>Fonts, color &amp; motion</span></div>
          <section id="studio-style" aria-label="Style presets and customization">
            <StyleControls style={style} access={accessEnabled?access:undefined} disabled={!!busy||accessEnabled&&accessLoading} wordTimingAvailable={!!usableAlignment.length} onChange={changeStyle} onPreset={value => { setStyle(accessEnabled?accessibleStyle(value,access.premium):value); invalidate(); }} onError={setError} />
          </section>
        </aside>
      </div>
    {busy === "loading" && <div role="status" className={styles.note}>Checking your file… <button type="button" className="text-button" onClick={cancel}>Cancel</button></div>}
    {(error || session.error) && <p role="alert" className={styles.error}>{error || session.error}</p>}
    {session.notice && <p role="status" className={styles.note}>{session.notice}</p>}
  </section>;
}
