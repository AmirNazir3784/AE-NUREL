"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { formatVideoBytes, validateCompressionFile, type CompressionMedia } from "../video-compressor/compression-core";
import { ASPECTS, DEFAULT_CROP_SETTINGS, cropOutput, croppedFilename, editCrop, fullCrop, moveCrop, presetCrop, type Aspect, type Crop, type CropSettings } from "./crop-core";
import { CropStage } from "./crop-stage";
import base from "../video-compressor/video-compressor.module.css";
import styles from "./video-cropper.module.css";

type Snapshot = { crop: Crop; aspect: Aspect };
type Result = { blob: Blob; url: string; filename: string; width: number; height: number; seconds: number };
function PixelInput({ field, value, onCommit }: { field: keyof Crop; value: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  return <label>{field === "x" || field === "y" ? `${field.toUpperCase()} position` : field[0].toUpperCase() + field.slice(1)}<span><input type="number" aria-label={`Crop ${field}`} min={field === "x" || field === "y" ? 0 : 2} step={field === "x" || field === "y" ? 1 : 2} value={draft} onChange={event => setDraft(event.target.value)} onBlur={() => { if (draft !== "" && Number.isFinite(Number(draft)) && Number(draft) !== value) onCommit(Number(draft)); setDraft(String(value)); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") setDraft(String(value)); }} /><small>px</small></span></label>;
}
export function VideoCropper() {
  const input = useRef<HTMLInputElement>(null), sequence = useRef(0), controller = useRef<AbortController | null>(null), urls = useRef({ source: "", result: "" });
  const [file, setFile] = useState<File | null>(null), [media, setMedia] = useState<CompressionMedia | null>(null), [source, setSource] = useState("");
  const [crop, setCrop] = useState<Crop | null>(null), [aspect, setAspect] = useState<Aspect>("9:16"), [history, setHistory] = useState<Snapshot[]>([]);
  const [settings, setSettings] = useState(DEFAULT_CROP_SETTINGS), [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState<"loading" | "cropping" | null>(null), [progress, setProgress] = useState<number | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState(""), [dragging, setDragging] = useState(false);
  useEffect(() => () => { sequence.current++; controller.current?.abort(); Object.values(urls.current).forEach(url => { if (url) URL.revokeObjectURL(url); }); }, []);
  let output: ReturnType<typeof cropOutput> | null = null, planError = "";
  if (media && crop) { try { output = cropOutput(media, crop, aspect, settings); } catch (failure) { planError = failure instanceof Error ? failure.message : "Check the crop settings."; } }
  function clearResult() { if (urls.current.result) URL.revokeObjectURL(urls.current.result); urls.current.result = ""; setResult(null); }
  function remember() { if (crop) setHistory(previous => [...previous.slice(-19), { crop, aspect }]); }
  function updateCrop(value: Crop) { setCrop(value); clearResult(); setNotice(""); setError(""); }
  function changeAspect(value: Aspect) {
    if (!media || !crop) { setAspect(value); return; }
    try { const next = presetCrop(media, value, crop); remember(); setAspect(value); updateCrop(next); } catch (failure) { setError((failure as Error).message); }
  }
  function changeSettings(patch: Partial<CropSettings>) { setSettings(previous => ({ ...previous, ...patch })); clearResult(); setError(""); setNotice(""); }
  function cancel() { sequence.current++; controller.current?.abort(); controller.current = null; setBusy(null); setProgress(null); setError(""); setNotice("Cancelled. Your original video and crop are still here."); }
  async function chooseFile(candidate: File) {
    setDragging(false);
    try { validateCompressionFile(candidate); } catch (failure) { setError((failure as Error).message); return; }
    const operation = ++sequence.current; controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setBusy("loading"); setError(""); setNotice("");
    try {
      const { inspectCompressionVideo } = await import("../video-compressor/compression-media");
      const inspected = await inspectCompressionVideo(candidate, abort.signal);
      let initial: Crop, initialAspect = aspect;
      try { initial = presetCrop(inspected, aspect); } catch { initial = fullCrop(inspected); initialAspect = "free"; }
      if (operation !== sequence.current) return;
      clearResult(); if (urls.current.source) URL.revokeObjectURL(urls.current.source);
      const url = URL.createObjectURL(candidate); urls.current.source = url;
      setFile(candidate); setMedia(inspected); setSource(url); setCrop(initial); setAspect(initialAspect); setHistory([]); setNotice("Video ready. Position your frame, then export the crop.");
    } catch (failure) { if (!abort.signal.aborted && operation === sequence.current) setError(failure instanceof Error ? failure.message : "This video could not be opened."); }
    finally { if (operation === sequence.current) { setBusy(null); controller.current = null; } }
  }
  function fileChanged(event: ChangeEvent<HTMLInputElement>) { const selected = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (selected) void chooseFile(selected); }
  function drop(event: DragEvent) { event.preventDefault(); setDragging(false); if (event.dataTransfer.files.length !== 1) { setError("Add one video at a time."); return; } void chooseFile(event.dataTransfer.files[0]); }
  function remove() { cancel(); clearResult(); if (urls.current.source) URL.revokeObjectURL(urls.current.source); urls.current.source = ""; setFile(null); setMedia(null); setSource(""); setCrop(null); setHistory([]); setNotice(""); }
  async function exportCrop() {
    if (!file || !media || !crop || !output || busy) return;
    const operation = ++sequence.current, abort = new AbortController(); controller.current = abort;
    clearResult(); setBusy("cropping"); setProgress(null); setError(""); setNotice("");
    try {
      const { cropVideo } = await import("./crop-media");
      const exported = await cropVideo(file, media, crop, aspect, settings, abort.signal, value => { if (operation === sequence.current) setProgress(value); });
      if (operation !== sequence.current) return;
      const url = URL.createObjectURL(exported.blob); urls.current.result = url;
      setResult({ ...exported, url, filename: croppedFilename(file.name, exported, settings.format) }); setNotice("Crop complete. Preview the actual export and download it below.");
    } catch (failure) { if (!abort.signal.aborted && operation === sequence.current) setError(failure instanceof Error ? failure.message : "The video could not be cropped in this browser."); }
    finally { if (operation === sequence.current) { setBusy(null); setProgress(null); controller.current = null; } }
  }
  return <section className={base.workspace} aria-label="Video cropper workspace" aria-busy={!!busy}>
    <input ref={input} className={base.fileInput} type="file" accept=".mp4,.mov,.m4v,.webm,.mkv" aria-label="Choose video file" onChange={fileChanged} />
    <div className={base.mainPanel}>
      <div className={base.panelHead}><span><Icon name="video" size={18} /> Your framing studio</span><span className={base.localBadge}><i /> Original preserved</span></div>
      {!file ? <div className={`${base.dropzone} ${dragging ? base.dragging : ""}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop} role="region" aria-label="Video file drop area"><span className={base.uploadIcon}><Icon name="video" size={29} /></span><h2>Give your video a new perspective.</h2><p>Drop a video here, or choose a video file.</p><button type="button" className={base.primary} onClick={() => input.current?.click()}><Icon name="plus" size={18} />Choose video</button><small>MP4, MOV, M4V, WebM or MKV<br />Up to 500 MB · 20 minutes · 4K input</small></div> : <>
        <div className={base.fileRow}><div><strong>{file.name}</strong><span>{formatVideoBytes(file.size)} · {media?.width} × {media?.height} original</span></div><button type="button" className={base.textButton} onClick={() => input.current?.click()}>Change video</button><button type="button" className={base.iconButton} aria-label="Remove video" onClick={remove}><Icon name="close" size={18} /></button></div>
        {media && crop && <CropStage key={source} url={source} frame={media} crop={crop} aspect={aspect} duration={media.duration} disabled={!!busy} onStart={remember} onChange={updateCrop} />}
      </>}
      {busy && <div className={base.progressPanel} role="status"><div><strong>{busy === "loading" ? "Checking your video…" : progress === null ? "Preparing your video…" : progress === 99 ? "Finishing your video…" : "Cropping, please wait…"}</strong><span>{progress !== null && busy === "cropping" ? `${progress}%` : ""}</span></div><progress max={100} value={busy === "cropping" ? progress ?? undefined : undefined} aria-label="Video processing progress" /><button type="button" className={base.textButton} onClick={cancel}>Cancel {busy === "loading" ? "loading" : "crop"}</button></div>}
      {error && <p className={base.error} role="alert">{error}</p>}{!busy && notice && <p className={base.notice} role="status">{notice}</p>}
      {result && <div className={base.result}><div className={base.resultHeading}><div><span className={base.eyebrow}>YOUR NEW PERSPECTIVE</span><h2>Your crop is ready.</h2></div><span className={base.savings}>{result.width} × {result.height}</span></div><video className={styles.resultVideo} src={result.url} controls playsInline preload="metadata" aria-label="Exported cropped video preview" /><div className={base.downloadRow}><a className={base.primary} href={result.url} download={result.filename}><Icon name="download" size={18} />Download {settings.format.toUpperCase()}</a><span>{formatVideoBytes(result.blob.size)} · Completed in {result.seconds.toFixed(1)}s<br />{settings.keepAudio && media?.audioTracks ? "Audio retained" : "No audio"} · No watermark</span></div></div>}
    </div>
    <aside className={base.settingsPanel} aria-label="Crop and export settings"><div className={base.settingsHeading}><span className={base.eyebrow}>FRAME WHAT MATTERS</span><h2>A perfect fit.</h2><p>Choose a shape. Keep the part you love.</p></div>
      <fieldset className={base.settingsFields} disabled={!!busy}><legend className={base.srOnly}>Crop and export settings</legend><span className={base.label}>Aspect ratio</span><div className={styles.aspects} role="group" aria-label="Aspect ratio">{(Object.keys(ASPECTS) as Aspect[]).map(value => <button type="button" key={value} aria-pressed={aspect === value} onClick={() => changeAspect(value)}><i style={{ aspectRatio: value === "free" ? "1.25" : value.replace(":", "/") }} />{value === "free" ? "Free" : value}</button>)}</div>
      {crop && media && <><div className={styles.pixelFields}>{(["x", "y", "width", "height"] as const).map(field => <PixelInput key={`${field}-${crop[field]}`} field={field} value={crop[field]} onCommit={value => { try { const next = editCrop(crop, media, aspect, field, value); remember(); updateCrop(next); } catch (failure) { setError((failure as Error).message); } }} />)}</div><small className={base.hint}>Source pixels. Width and height use even pixels for video encoding. Presets keep an exact ratio.</small><div className={styles.actions}><button type="button" onClick={() => { remember(); updateCrop(moveCrop(crop, media, (media.width - crop.width) / 2, (media.height - crop.height) / 2)); }}>Center</button><button type="button" disabled={!history.length} onClick={() => { const previous = history.at(-1); if (previous) { setHistory(history.slice(0, -1)); setAspect(previous.aspect); updateCrop(previous.crop); } }}>Undo</button><button type="button" onClick={() => { remember(); setAspect("free"); updateCrop(fullCrop(media)); }}>Reset frame</button></div></>}
      <div className={base.selects}><label>Output size<select aria-label="Output size" value={settings.resolution} onChange={event => changeSettings({ resolution: event.target.value as CropSettings["resolution"] })}><option value="original">Crop pixels</option><option value="1080">Up to 1080p</option><option value="720">Up to 720p</option><option value="480">Up to 480p</option></select></label><label>Output format<select aria-label="Output format" value={settings.format} onChange={event => changeSettings({ format: event.target.value as CropSettings["format"] })}><option value="mp4">MP4 · H.264</option><option value="webm">WebM</option></select></label></div><small className={base.hint}>Resolution limits the shorter edge. Never upscaled.</small><label className={base.audio}><span><Icon name={settings.keepAudio ? "volume" : "volume-off"} size={18} /><span>Keep sound<small>{media && !media.audioTracks ? "This video has no audio track" : "Uncheck for a silent export"}</small></span></span><input type="checkbox" checked={settings.keepAudio} disabled={!!media && !media.audioTracks} onChange={event => changeSettings({ keepAudio: event.target.checked })} /></label></fieldset>
      <div className={base.estimate}><span>YOUR OUTPUT FRAME</span><strong>{output ? `${output.width} × ${output.height}` : "Choose a video"}</strong><small>{output ? `${settings.format.toUpperCase()} · full duration · ${aspect === "free" ? "custom crop" : aspect + " exact ratio"}` : "See your crop dimensions before exporting."}</small></div>{planError && <p className={base.error} role="alert">{planError}</p>}<button type="button" className={`${base.primary} ${base.compressButton}`} disabled={!output || !!busy} onClick={() => void exportCrop()}><Icon name="video" size={18} />{busy === "cropping" ? "Cropping…" : "Export cropped video"}<Icon name="arrow" size={18} /></button><p className={base.privateNote}><Icon name="shield" size={15} />Free to use. No account or watermark.</p>
    </aside>
  </section>;
}
