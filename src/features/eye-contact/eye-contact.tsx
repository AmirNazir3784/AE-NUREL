"use client";

import Link from "@/components/site/page-link";
import { useEffect, useRef, useState } from "react";
import { inspectCompressionVideo } from "../video-compressor/compression-media";
import { formatVideoBytes, type CompressionMedia } from "../video-compressor/compression-core";
import { DEFAULT_GAZE, type GazeSettings } from "./gaze-core";
import type { GazeEngine } from "./gaze-engine";
import { DEFAULT_EXPORT as DEFAULT_KEY_EXPORT, type KeyExport } from "../green-screen-remover/key-core";
import styles from "./eye-contact.module.css";

type Source = { file: File; url: string; media: CompressionMedia };
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
export function EyeContact() {
  const [source, setSource] = useState<Source | null>(null), [settings, setSettings] = useState(DEFAULT_GAZE);
  const [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState("");
  const [status, setStatus] = useState("Choose a talking-head video to begin."), [position, setPosition] = useState(0), [playing, setPlaying] = useState(false);
  const [exportSettings, setExportSettings] = useState<KeyExport>(DEFAULT_KEY_EXPORT), [exporting, setExporting] = useState(false), [percent, setPercent] = useState<number | null>(null);
  const [download, setDownload] = useState<{ url: string; name: string; corrected: number; total: number; width: number; height: number; bytes: number } | null>(null);
  const [exportNotice, setExportNotice] = useState("");
  const exportController = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null), video = useRef<HTMLVideoElement>(null), original = useRef<HTMLCanvasElement>(null), result = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef(settings), redraw = useRef<() => void>(() => {}), upload = useRef<AbortController | null>(null);
  useEffect(() => { settingsRef.current = settings; redraw.current(); }, [settings]);
  useEffect(() => () => { upload.current?.abort(); exportController.current?.abort(); }, []);
  useEffect(() => { if (download) return () => URL.revokeObjectURL(download.url); }, [download]);
  useEffect(() => {
    if (!source) return;
    return () => URL.revokeObjectURL(source.url);
  }, [source]);
  useEffect(() => {
    if (!source) return;
    const controller = new AbortController(); let engine: GazeEngine | undefined, running = false, pending = false, animation = 0;
    const input = video.current, before = original.current, after = result.current;
    if (!input || !before || !after) return;
    const scale = Math.min(1, 960 / Math.max(source.media.width, source.media.height));
    before.width = after.width = Math.round(source.media.width * scale); before.height = after.height = Math.round(source.media.height * scale);
    const bc = before.getContext("2d"), rc = after.getContext("2d");
    async function draw() {
      if (controller.signal.aborted || input!.readyState < 2 || !bc || !rc) return;
      if (running) { pending = true; return; }
      running = true; pending = false;
      try {
        bc.drawImage(input!, 0, 0, before!.width, before!.height); rc.drawImage(before!, 0, 0);
        if (engine) { const frame = await engine.render(rc, settingsRef.current, input!.currentTime); if (!controller.signal.aborted) setStatus(frame.reason); }
      } catch (failure) { if (!controller.signal.aborted) { input!.pause(); setError((failure as Error).message); } }
      finally { running = false; if (controller.signal.aborted) { await engine?.dispose(); engine = undefined; } else if (pending || !input!.paused) animation = requestAnimationFrame(() => void draw()); }
    }
    redraw.current = () => { void draw(); };
    async function prepare() {
      try {
        const { createGazeEngine } = await import("./gaze-engine");
        engine = await createGazeEngine(controller.signal);
        if (controller.signal.aborted) { await engine.dispose(); engine = undefined; return; }
        setReady(true); setStatus("Ready. Play or seek to inspect the correction."); void draw();
      } catch (failure) { if (!controller.signal.aborted) { setStatus("Correction could not be prepared."); setError((failure as Error).message); } }
    }
    void prepare();
    return () => { controller.abort(); cancelAnimationFrame(animation); redraw.current = () => {}; input.pause(); if (!running) { void engine?.dispose(); engine = undefined; } };
  }, [source]);
  async function choose(file?: File) {
    if (!file) return;
    upload.current?.abort(); const controller = new AbortController(); upload.current = controller;
    setBusy(true); setError("");
    try {
      const media = await inspectCompressionVideo(file, controller.signal); controller.signal.throwIfAborted();
      setReady(false); setDownload(null); setExportNotice(""); setPosition(0); setPlaying(false); setSettings(DEFAULT_GAZE); setStatus("Preparing eye correction, please wait…");
      setSource({ file, url: URL.createObjectURL(file), media });
    } catch (failure) { if (!controller.signal.aborted) setError((failure as Error).message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function change<K extends keyof GazeSettings>(key: K, value: GazeSettings[K]) { setDownload(null); setSettings(current => ({ ...current, [key]: value })); }
  async function exportVideo() {
    if (!source || exporting || busy) return;
    video.current?.pause(); setExporting(true); setError(""); setExportNotice(""); setDownload(null); setPercent(null);
    const controller = new AbortController(); exportController.current = controller;
    try {
      const { exportGazeVideo } = await import("./gaze-media");
      const output = await exportGazeVideo(source.file, source.media, settings, exportSettings, controller.signal, setPercent);
      controller.signal.throwIfAborted();
      setDownload({ url: URL.createObjectURL(output.blob), name: `${source.file.name.replace(/\.[^.]+$/, "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").slice(0, 120) || "video"}-eye-contact.${exportSettings.format}`, corrected: output.correctedFrames, total: output.totalFrames, width: output.width, height: output.height, bytes: output.blob.size });
    } catch (failure) { if (!controller.signal.aborted) setError((failure as Error).message); else setExportNotice("Correction canceled. Your settings are ready for another try."); }
    finally { if (exportController.current === controller) { exportController.current = null; setExporting(false); } }
  }
  async function loadSample() {
    setError(""); setBusy(true);
    try {
      const response = await fetch("/api/development/eye-contact-sample");
      if (!response.ok) throw new Error("The development sample is unavailable. Choose a video instead.");
      await choose(new File([await response.blob()], "public-motion-test.mp4", { type: "video/mp4" }));
    } catch (failure) { setError((failure as Error).message); setBusy(false); }
  }
  return <main id="main-content" className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/tools">Video tools</Link><span>/</span><span aria-current="page">AI Eye Contact</span></nav>
    <header className={styles.hero}><div><span className={styles.eyebrow}>AI EYE CONTACT · DEVELOPMENT PREVIEW</span><h1>A little adjustment.<br /><em>A stronger connection.</em></h1><p>Explore subtle gaze corrections for talking-head footage. Compare the same frame, tune the result, and keep the expression that feels like you.</p></div><aside><span className={styles.eye} aria-hidden="true"><i /></span><strong>Keep it natural.</strong><p>Start gently. Review blinks and movement. Small corrections work best.</p></aside></header>
    <section className={styles.workspace} aria-label="Eye contact workspace">
      <div className={styles.workspaceHeader}><div><span className={styles.eyebrow}>01 / YOUR FOOTAGE</span><h2>Bring the focus back.</h2></div><button type="button" disabled={busy || exporting} onClick={() => fileInput.current?.click()}>{busy ? "Opening, please wait…" : source ? "Change video" : "Choose video"}</button><input ref={fileInput} type="file" accept=".mp4,.mov,.m4v,.webm,.mkv" hidden onChange={event => { void choose(event.target.files?.[0]); event.target.value = ""; }} /></div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {!source ? <div className={styles.empty}><span className={styles.reticle} aria-hidden="true">+</span><h3>One speaker. A clear view.</h3><p>Choose a well-lit, front-facing clip. Keep both eyes visible and avoid strong glasses glare.</p><button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>Select a video</button>{process.env.NODE_ENV === "development" && <button type="button" disabled={busy} onClick={() => void loadSample()}>Load development test sample</button>}<small>MP4, MOV, M4V, WebM or MKV · Up to 500 MB, 20 minutes and 4K input. Codec support varies.</small></div> : <>
        <div className={styles.fileInfo}><strong>{source.file.name}</strong><span>{source.media.width} × {source.media.height} · {clock(source.media.duration)}</span></div>
        <video className={styles.sourceVideo} aria-hidden="true" ref={video} src={source.url} muted playsInline preload="auto" onLoadedData={() => redraw.current()} onSeeked={() => redraw.current()} onPlay={() => { setPlaying(true); redraw.current(); }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={event => setPosition(event.currentTarget.currentTime)} onError={() => setError("This video could not be previewed. Try an H.264 MP4.")} />
        <div className={styles.editor}><div><div className={styles.comparison}><figure><figcaption>Original</figcaption><canvas ref={original} aria-label="Original video frame" /></figure><figure><figcaption>Correction preview <span>Experimental</span></figcaption><canvas ref={result} aria-label="Eye contact correction preview" /></figure></div>
          <div className={styles.transport}><button type="button" disabled={!ready || exporting || busy} aria-label={playing ? "Pause preview" : "Play preview"} onClick={() => { const v = video.current; if (v?.paused) void v.play().catch(() => setError("Playback failed. Try a different video.")); else v?.pause(); }}>{playing ? "Pause" : "Play"}</button><input type="range" disabled={exporting || busy} aria-label="Video position" min={0} max={source.media.duration} step={.01} value={position} onChange={event => { const time = Number(event.target.value); video.current?.pause(); if (video.current) video.current.currentTime = time; setPosition(time); }} /><span>{clock(position)} / {clock(source.media.duration)}</span></div>
          <p role="status" className={styles.status}>{status}</p><p className={styles.note}>Preview playback is silent and reduced in size. Choose Original to export at the source resolution, up to 4K. Review the exported video for blinks, movement and natural-looking eyes.</p>
          <div className={styles.export}><h3>03 / Export your video</h3><fieldset disabled={!ready || exporting || busy}>
            <label>Format<select value={exportSettings.format} onChange={e => { setDownload(null); setExportSettings(s => ({ ...s, format: e.target.value as KeyExport["format"] })); }}><option value="mp4">MP4</option><option value="webm">WebM</option></select></label>
            <label>Output size<select value={exportSettings.resolution} onChange={e => { setDownload(null); setExportSettings(s => ({ ...s, resolution: e.target.value as KeyExport["resolution"] })); }}><option value="original">Original (up to 4K)</option><option value="1080">1080p</option><option value="720">720p</option><option value="480">480p</option></select></label>
            <label className={styles.toggle}><input type="checkbox" checked={exportSettings.keepAudio} onChange={e => { setDownload(null); setExportSettings(s => ({ ...s, keepAudio: e.target.checked })); }} /> Keep sound</label>
            <button type="button" disabled={!settings.strength} onClick={() => void exportVideo()}>Prepare corrected video</button>
          </fieldset>{exporting && <div role="status"><p>{percent === null ? "Preparing correction, please wait…" : `Correcting, please wait… ${percent}%`}</p><progress max={100} value={percent ?? undefined} aria-label="Correction progress" /><button type="button" onClick={() => exportController.current?.abort()}>Cancel correction</button></div>}
          {exportNotice && <p role="status" className={styles.note}>{exportNotice}</p>}
          {download && <div className={styles.result}><h3>Review your export</h3><video controls playsInline preload="metadata" src={download.url} aria-label="Exported video preview" /><p className={styles.note}>{download.width} × {download.height} · {formatVideoBytes(download.bytes)}</p><a download={download.name} href={download.url}>Download corrected video</a><p className={styles.note}>{download.corrected} of {download.total} frames received an eye adjustment. Uncorrected frames retain the original image. Review the complete video before sharing.</p></div>}
          <p className={styles.note}>No upscaling. Maximum output 256 MB. The correction preserves source eye texture, but large adjustments, glare and motion blur can still distort detail. Sound is retained when compatible; embedded subtitles, HDR and specialist color metadata are not preserved.</p></div>
        </div><aside className={styles.controls}><span className={styles.eyebrow}>02 / REFINE YOUR GAZE</span><h3>Subtle looks better.</h3><fieldset disabled={!ready || exporting || busy}><label className={styles.toggle}><input type="checkbox" checked={settings.automatic} onChange={e => change("automatic", e.target.checked)} /> Automatic adjustment</label><p>Estimates a correction from gaze and head position. Use fine-tuning when the estimate needs help.</p>
          {([['strength', 'Correction strength', 0, 100, '%'], ['vertical', 'Vertical fine-tuning', -25, 25, '°'], ['horizontal', 'Horizontal fine-tuning', -30, 30, '°']] as const).map(([key, label, min, max, unit]) => <label className={styles.slider} key={key}><span>{label}<output>{settings[key]}{unit}</output></span><input type="range" aria-label={label} aria-valuetext={`${settings[key]}${unit}`} min={min} max={max} step={1} value={settings[key]} onChange={e => change(key, Number(e.target.value))} /></label>)}
          <button type="button" onClick={() => { setDownload(null); setSettings(DEFAULT_GAZE); }}>Reset adjustments</button></fieldset><p className={styles.note}>Closed eyes, tilted heads, small faces and multiple speakers are left unchanged. This does not turn a side-facing head toward the camera.</p></aside></div>
      </>}
    </section>
    <section className={styles.guidance} aria-label="Get a useful preview"><article><span>01</span><h2>Start with the right shot.</h2><p>Use a single speaker facing forward, with enough light to see the eyes. Large head turns and reflections can prevent a useful correction.</p></article><article><span>02</span><h2>Compare, then adjust.</h2><p>Pause on an off-camera glance. Compare both frames, then reduce the strength if the correction changes the expression too much.</p></article><article><span>03</span><h2>Review the difficult moments.</h2><p>Scrub across blinks and movement. This early model is designed for small corrections and can soften detail or produce artifacts.</p></article></section>
    <section className={styles.faq} aria-labelledby="eye-contact-questions"><h2 id="eye-contact-questions">Before you export</h2>
      <details><summary>Which clips work best?</summary><p>Use a single, front-facing speaker with both eyes clearly visible. Small off-camera glances are easier to correct than large head turns. For side-by-side footage, isolate one speaker with the <Link href="/tools/video-cropper">Video Cropper</Link> first.</p></details>
      <details><summary>Can I keep my 4K resolution and sound?</summary><p>Choose Original (up to 4K) and leave Keep sound selected. MP4 and WebM availability depends on codec support. Smaller source videos are never enlarged. HDR, embedded subtitles and specialist color metadata are not retained.</p></details>
      <details><summary>Why are some frames left unchanged?</summary><p>Frames without a usable view of one face and both open eyes keep the original image. Blinks, small faces, steep head angles and multiple speakers can prevent an adjustment. A frame count confirms processing, not visual quality.</p></details>
      <details><summary>What if the correction looks too strong?</summary><p>Lower Correction strength, then adjust the vertical and horizontal controls on a paused frame. Review several moments before exporting. Turn off Automatic adjustment to use only your manual offsets.</p></details>
    </section>
  </main>;
}
