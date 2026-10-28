"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Icon } from "@/components/ui/icon";
import {
  DEFAULT_COMPRESSION_SETTINGS, compressionPlan, compressedFilename, formatVideoBytes, validateCompressionFile,
  type CompressionMedia, type CompressionMode, type CompressionSettings,
} from "./compression-core";
import type { CompressionProgress } from "./compression-media";
import styles from "./video-compressor.module.css";

type Result = { blob: Blob; url: string; filename: string; width: number; height: number; seconds: number };
const modes: { id: CompressionMode; title: string; description: string }[] = [
  { id: "balanced", title: "Balanced", description: "A good place to start" },
  { id: "small", title: "Smaller file", description: "More room to share" },
  { id: "quality", title: "Higher quality", description: "Keep more fine detail" },
  { id: "target", title: "Target a size", description: "Set your own MB budget" },
];

function durationLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

export function VideoCompressor() {
  const fileInput = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const urls = useRef({ source: "", result: "" });
  const [file, setFile] = useState<File | null>(null);
  const [media, setMedia] = useState<CompressionMedia | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [settings, setSettings] = useState<CompressionSettings>(DEFAULT_COMPRESSION_SETTINGS);
  const [result, setResult] = useState<Result | null>(null);
  const [preview, setPreview] = useState<"original" | "compressed">("original");
  const [busy, setBusy] = useState<"inspecting" | "compressing" | null>(null);
  const [progress, setProgress] = useState<CompressionProgress | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => {
    sequence.current++;
    controller.current?.abort();
    if (urls.current.source) URL.revokeObjectURL(urls.current.source);
    if (urls.current.result) URL.revokeObjectURL(urls.current.result);
  }, []);

  let plan: ReturnType<typeof compressionPlan> | null = null;
  let planError = "";
  if (media) {
    try { plan = compressionPlan(media, settings); }
    catch (failure) { planError = failure instanceof Error ? failure.message : "Check your settings."; }
  }

  function clearResult() {
    if (urls.current.result) URL.revokeObjectURL(urls.current.result);
    urls.current.result = "";
    setResult(null);
    setPreview("original");
  }

  function changeSettings(patch: Partial<CompressionSettings>) {
    clearResult();
    setSettings(previous => ({ ...previous, ...patch }));
    setError("");
    setNotice("");
  }

  async function chooseFile(candidate: File) {
    setDragging(false);
    try { validateCompressionFile(candidate); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Choose a supported video."); return; }
    const operation = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy("inspecting"); setError(""); setNotice(""); setProgress(null);
    try {
      const { inspectCompressionVideo } = await import("./compression-media");
      const inspected = await inspectCompressionVideo(candidate, abort.signal);
      if (operation !== sequence.current) return;
      clearResult();
      if (urls.current.source) URL.revokeObjectURL(urls.current.source);
      const url = URL.createObjectURL(candidate);
      urls.current.source = url;
      setFile(candidate); setMedia(inspected); setSourceUrl(url);
      setNotice("Video ready. Choose your settings, then compress.");
    } catch (failure) {
      if (!abort.signal.aborted && operation === sequence.current) setError(failure instanceof Error ? failure.message : "The video could not be opened. Try another browser-supported file.");
    } finally {
      if (operation === sequence.current) { setBusy(null); controller.current = null; }
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (selected) void chooseFile(selected);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDragging(false);
    const files = event.dataTransfer.files;
    if (files.length !== 1) { setError("Add one video at a time."); return; }
    void chooseFile(files[0]);
  }

  function cancel() {
    sequence.current++;
    controller.current?.abort(); controller.current = null;
    setBusy(null); setProgress(null); setError("");
    setNotice("Cancelled. Your original video has not changed.");
  }

  function reset() {
    cancel(); clearResult();
    if (urls.current.source) URL.revokeObjectURL(urls.current.source);
    urls.current.source = "";
    setFile(null); setMedia(null); setSourceUrl(""); setNotice("");
  }

  async function compress() {
    if (!file || !media || !plan || busy) return;
    const operation = ++sequence.current;
    const abort = new AbortController(); controller.current = abort;
    clearResult(); setBusy("compressing"); setError(""); setNotice("");
    setProgress({ pass: 1, percent: null, phase: "preparing" });
    try {
      const { compressVideo } = await import("./compression-media");
      const output = await compressVideo(file, media, settings, abort.signal, value => {
        if (operation === sequence.current) setProgress(previous => previous?.percent === value.percent && previous.phase === value.phase && previous.pass === value.pass ? previous : value);
      });
      if (operation !== sequence.current) return;
      const url = URL.createObjectURL(output.blob); urls.current.result = url;
      setResult({ ...output, url, filename: compressedFilename(file.name, settings.format) });
      setPreview("compressed"); setNotice("Compression complete. Preview and download your video.");
    } catch (failure) {
      if (!abort.signal.aborted && operation === sequence.current) setError(failure instanceof Error ? failure.message : "Compression could not finish in this browser. Try a smaller resolution.");
    } finally {
      if (operation === sequence.current) { setBusy(null); setProgress(null); controller.current = null; }
    }
  }

  const saved = file && result ? (1 - result.blob.size / file.size) * 100 : 0;
  const stage = busy === "inspecting" ? "Checking your video…" : progress?.phase === "preparing" ? "Preparing your browser…" : progress?.phase === "finishing" ? "Finishing and checking the file…" : "Compressing on your device…";

  return <section className={styles.workspace} aria-label="Video compressor workspace" aria-busy={!!busy}>
    <input ref={fileInput} className={styles.fileInput} type="file" accept=".mp4,.m4v,.mov,.webm,.mkv" aria-label="Choose video file" onChange={onFileChange} />
    <div className={styles.mainPanel}>
      <div className={styles.panelHead}><span><Icon name="video" size={18} /> Your video</span><span className={styles.localBadge}><i /> Stays on this device</span></div>
      {!file ? <div className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`} role="region" aria-label="Video file drop area" onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
        <span className={styles.uploadIcon}><Icon name="upload" size={29} /></span>
        <h2>Make room for a smaller video.</h2>
        <p>Drop a video here, or choose one from your device.</p>
        <button className={styles.primary} type="button" onClick={() => fileInput.current?.click()}><Icon name="plus" size={18} /> Choose video</button>
        <small>MP4, MOV, M4V, WebM or MKV<br />Up to 500 MB · 20 minutes · 4K input</small>
      </div> : <>
        <div className={styles.fileRow}><div><strong title={file.name}>{file.name}</strong><span>{formatVideoBytes(file.size)} · {media ? durationLabel(media.duration) : ""}</span></div><button type="button" className={styles.textButton} onClick={() => fileInput.current?.click()}>Change video</button><button type="button" className={styles.iconButton} aria-label="Remove video" onClick={reset}><Icon name="close" size={18} /></button></div>
        <div className={styles.previewToolbar}><div role="group" aria-label="Video preview"><button type="button" aria-pressed={preview === "original"} onClick={() => setPreview("original")}>Original</button><button type="button" disabled={!result} aria-pressed={preview === "compressed"} onClick={() => setPreview("compressed")}>Compressed</button></div><span>{preview === "compressed" && result ? `${result.width} × ${result.height}` : media ? `${media.width} × ${media.height}` : ""}</span></div>
        <div className={styles.videoStage}><video key={preview === "compressed" && result ? result.url : sourceUrl} src={preview === "compressed" && result ? result.url : sourceUrl} controls playsInline preload="metadata" aria-label={`${preview === "compressed" ? "Compressed" : "Original"} video preview`} /></div>
        <div className={styles.mediaFacts}><span><Icon name="clock" size={16} /> {media ? durationLabel(media.duration) : ""}</span><span><Icon name="monitor" size={16} /> {media?.videoCodec.toUpperCase()}</span><span><Icon name={media?.audioTracks ? "volume" : "volume-off"} size={16} /> {media?.audioCodec ? media.audioCodec.toUpperCase() + " audio" : "No audio track"}</span></div>
      </>}
      {busy && <div className={styles.progressPanel} role="status" aria-live="polite"><div><strong>{stage}</strong><span>{progress?.pass === 2 ? "Pass 2 · " : ""}{progress?.percent !== null && progress?.percent !== undefined ? `${progress.percent}%` : ""}</span></div><progress max={100} value={progress?.percent ?? undefined} aria-label={stage} /><button type="button" className={styles.textButton} onClick={cancel}>Cancel {busy === "inspecting" ? "loading" : "compression"}</button></div>}
      {error && <p className={styles.error} role="alert"><Icon name="warning" size={18} />{error}</p>}
      {!busy && notice && <p className={styles.notice} role="status">{notice}</p>}
      {result && file && <div className={styles.result}>
        <div className={styles.resultHeading}><div><span className={styles.eyebrow}>YOUR RESULT</span><h2>{saved > 0 ? "Ready to share." : "Your converted video is ready."}</h2></div><span className={saved > 0 ? styles.savings : styles.larger}>{saved > 0 ? `${saved.toFixed(0)}% smaller` : "Larger than original"}</span></div>
        <div className={styles.comparison}><div><span>Original <b>{formatVideoBytes(file.size)}</b></span><div><i style={{ width: `${file.size / Math.max(file.size, result.blob.size) * 100}%` }} /></div></div><div><span>Compressed <b>{formatVideoBytes(result.blob.size)}</b></span><div><i className={styles.resultBar} style={{ width: `${result.blob.size / Math.max(file.size, result.blob.size) * 100}%` }} /></div></div></div>
        {saved <= 0 && <p className={styles.notice}>This source was already efficiently encoded. Try Smaller file or a lower resolution to reduce it further.</p>}
        <div className={styles.downloadRow}><a className={styles.primary} href={result.url} download={result.filename}><Icon name="download" size={18} />Download {settings.format.toUpperCase()}</a><span>{result.width} × {result.height} · {result.seconds.toFixed(1)}s processing<br />{settings.keepAudio && media?.audioTracks ? "Audio retained" : "No audio"} · No watermark</span></div>
      </div>}
    </div>

    <aside className={styles.settingsPanel} aria-label="Compression settings">
      <div className={styles.settingsHeading}><span className={styles.eyebrow}>MAKE IT YOURS</span><h2>Smaller, your way.</h2><p>Start with a preset. Fine-tune the details.</p></div>
      <fieldset disabled={!!busy} className={styles.settingsFields}>
        <legend className={styles.srOnly}>Compression settings</legend>
        <span className={styles.label}>Compression mode</span>
        <div className={styles.modes} role="group" aria-label="Compression mode">{modes.map(mode => <button key={mode.id} type="button" aria-pressed={settings.mode === mode.id} onClick={() => changeSettings({ mode: mode.id })}><span>{mode.title}</span><small>{mode.description}</small><i aria-hidden="true">{settings.mode === mode.id ? <Icon name="check" size={13} /> : null}</i></button>)}</div>
        {settings.mode === "target" && <div className={styles.target}><label className={styles.label} htmlFor="compression-target">Target file size (MB)</label><div><input id="compression-target" type="number" min="0.1" max="250" step="0.1" value={settings.targetMB || ""} onChange={event => changeSettings({ targetMB: event.target.valueAsNumber || 0 })} /><span>MB</span></div><div className={styles.quickTargets}>{[5, 10, 25].map(size => <button key={size} type="button" aria-pressed={settings.targetMB === size} onClick={() => changeSettings({ targetMB: size })}>{size} MB</button>)}</div></div>}
        <div className={styles.selects}><label>Resolution<select aria-label="Resolution" value={settings.resolution} onChange={event => changeSettings({ resolution: event.target.value as CompressionSettings["resolution"] })}><option value="original">Keep source size</option><option value="1080">1080p · more detail</option><option value="720">720p · balanced</option><option value="480">480p · smaller</option></select></label><label>Output format<select aria-label="Output format" value={settings.format} onChange={event => changeSettings({ format: event.target.value as CompressionSettings["format"] })}><option value="mp4">MP4 · H.264</option><option value="webm">WebM</option></select></label></div>
        <small className={styles.hint}>Your video keeps its aspect ratio and is never upscaled.</small>
        <label className={styles.audio}><span><Icon name={settings.keepAudio ? "volume" : "volume-off"} size={19} /><span>Keep sound<small>{media && !media.audioTracks ? "This video has no audio track" : "Uncheck to create a silent video"}</small></span></span><input type="checkbox" checked={settings.keepAudio} disabled={!!media && !media.audioTracks} onChange={event => changeSettings({ keepAudio: event.target.checked })} /></label>
      </fieldset>
      <div className={styles.estimate}><span>ESTIMATED OUTPUT</span><strong>{plan ? `About ${formatVideoBytes(plan.estimatedBytes)}` : media ? "Adjust your settings" : "Choose a video"}</strong><small>{plan ? `${plan.width} × ${plan.height} · ${settings.format.toUpperCase()} · actual size checked after compression` : media ? "Check the message below to calculate a new estimate." : "See the estimated size before you start."}</small></div>
      {planError && <p className={styles.error} role="alert">{planError}</p>}
      <button className={`${styles.primary} ${styles.compressButton}`} type="button" disabled={!file || !plan || !!busy} onClick={() => void compress()}><Icon name="video" size={18} />{busy === "compressing" ? "Compressing…" : "Compress video"}<Icon name="arrow" size={18} /></button>
      <p className={styles.privateNote}><Icon name="shield" size={15} />Free to use. Your video is never uploaded.</p>
    </aside>
  </section>;
}
