"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { formatVideoBytes, validateCompressionFile, type CompressionMedia } from "../video-compressor/compression-core";
import { DEFAULT_BACKGROUND, DEFAULT_EXPORT, DEFAULT_KEY, outputSize, validHex, type Background, type KeySettings, type KeyExport } from "./key-core";
import { loadBackgroundImage } from "./key-renderer";
import { KeyPreview, type PreviewHandle } from "./key-preview";
import base from "../video-compressor/video-compressor.module.css";
import styles from "./green-screen-remover.module.css";

type Result = { blob: Blob; url: string; width: number; height: number; seconds: number; filename: string };
const filename = (name: string, suffix: string) => (name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "video") + suffix;
function ColorField({ label, value, disabled, change }: { label: string; value: string; disabled?: boolean; change: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  return <label className={styles.colorField}><span>{label}</span><div><input type="color" aria-label={`${label} picker`} value={value} disabled={disabled} onChange={event => change(event.target.value)} /><input type="text" aria-label={label} value={draft} disabled={disabled} maxLength={7} spellCheck={false} onChange={event => { setDraft(event.target.value); if (validHex(event.target.value)) change(event.target.value); }} onBlur={() => setDraft(value)} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") setDraft(value); }} /></div></label>;
}
export function GreenScreenRemover() {
  const fileInput = useRef<HTMLInputElement>(null), imageInput = useRef<HTMLInputElement>(null), preview = useRef<PreviewHandle>(null);
  const sequence = useRef(0), controller = useRef<AbortController | null>(null), imageSequence = useRef(0), imageController = useRef<AbortController | null>(null), bitmap = useRef<ImageBitmap | null>(null), urls = useRef({ source: "", result: "", png: "" });
  const [file, setFile] = useState<File | null>(null), [media, setMedia] = useState<CompressionMedia | null>(null), [source, setSource] = useState("");
  const [key, setKey] = useState(DEFAULT_KEY), [background, setBackground] = useState(DEFAULT_BACKGROUND), [settings, setSettings] = useState(DEFAULT_EXPORT), [image, setImage] = useState<ImageBitmap | null>(null), [imageName, setImageName] = useState("");
  const [busy, setBusy] = useState<"loading" | "sample" | "exporting" | null>(null), [imageBusy, setImageBusy] = useState(false), [pngBusy, setPngBusy] = useState(false), [result, setResult] = useState<Result | null>(null), [png, setPng] = useState<{ url: string; filename: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState(""), [dragging, setDragging] = useState(false), [transparentPng, setTransparentPng] = useState(true);
  useEffect(() => () => { sequence.current++; imageSequence.current++; controller.current?.abort(); imageController.current?.abort(); bitmap.current?.close(); Object.values(urls.current).forEach(url => { if (url) URL.revokeObjectURL(url); }); }, []);
  const locked = !!busy || imageBusy || pngBusy, size = media ? outputSize(media, settings.resolution) : null;
  function clearResult() { if (urls.current.result) URL.revokeObjectURL(urls.current.result); urls.current.result = ""; setResult(null); }
  function clearPng() { if (urls.current.png) URL.revokeObjectURL(urls.current.png); urls.current.png = ""; setPng(null); }
  function edit() { clearResult(); clearPng(); setError(""); setNotice(""); }
  function changeKey(patch: Partial<KeySettings>) { edit(); setKey(previous => ({ ...previous, ...patch })); }
  function changeBackground(patch: Partial<Background>) { edit(); setBackground(previous => ({ ...previous, ...patch })); }
  function changeSettings(patch: Partial<KeyExport>) { edit(); setSettings(previous => ({ ...previous, ...patch })); }
  function cancel() { sequence.current++; controller.current?.abort(); controller.current = null; setBusy(null); setProgress(null); setError(""); setNotice("Cancelled. Your original and settings are unchanged."); }
  async function openFile(candidate?: File, fourK = false) {
    setDragging(false);
    if (candidate) { try { validateCompressionFile(candidate); } catch (failure) { setError((failure as Error).message); return; } }
    const operation = ++sequence.current; controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setBusy(candidate ? "loading" : "sample"); setError(""); setNotice("");
    try {
      const selected = candidate ?? await (await import("./key-media")).createScreenDemo(abort.signal, fourK);
      const inspected = await (await import("../video-compressor/compression-media")).inspectCompressionVideo(selected, abort.signal);
      if (operation !== sequence.current) return;
      edit(); if (urls.current.source) URL.revokeObjectURL(urls.current.source);
      const url = URL.createObjectURL(selected); urls.current.source = url; setSource(url); setFile(selected); setMedia(inspected); setKey(DEFAULT_KEY); setNotice("Video ready. Check the screen color and refine the edges.");
    } catch (failure) { if (!abort.signal.aborted && operation === sequence.current) setError(failure instanceof Error ? failure.message : "The video could not be opened."); }
    finally { if (operation === sequence.current) { setBusy(null); controller.current = null; } }
  }
  function chooseFile(event: ChangeEvent<HTMLInputElement>) { const selected = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (selected) void openFile(selected); }
  function drop(event: DragEvent) { event.preventDefault(); setDragging(false); if (locked) return; if (event.dataTransfer.files.length !== 1) { setError("Choose one video at a time."); return; } void openFile(event.dataTransfer.files[0]); }
  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (!selected) return;
    const operation = ++imageSequence.current; imageController.current?.abort(); const abort = new AbortController(); imageController.current = abort; setImageBusy(true); setError("");
    try {
      const next = await loadBackgroundImage(selected, abort.signal);
      if (operation !== imageSequence.current) { next.close(); return; }
      edit(); bitmap.current?.close(); bitmap.current = next; setImage(next); setImageName(selected.name); setBackground(previous => ({ ...previous, type: "image" }));
    } catch (failure) { if (!abort.signal.aborted && operation === imageSequence.current) setError(failure instanceof Error ? failure.message : "The background could not be opened."); }
    finally { if (operation === imageSequence.current) { setImageBusy(false); imageController.current = null; } }
  }
  function remove() { cancel(); edit(); if (urls.current.source) URL.revokeObjectURL(urls.current.source); urls.current.source = ""; setFile(null); setSource(""); setMedia(null); setNotice(""); }
  async function exportVideo() {
    if (!file || !media || locked) return;
    const operation = ++sequence.current, abort = new AbortController(); controller.current = abort;
    edit(); setBusy("exporting"); setProgress(null);
    try {
      const output = await (await import("./key-media")).removeScreen(file, media, key, background, image, settings, abort.signal, value => { if (operation === sequence.current) setProgress(value); });
      if (operation !== sequence.current) return;
      const url = URL.createObjectURL(output.blob); urls.current.result = url; setResult({ ...output, url, filename: filename(file.name, `-screen-removed.${settings.format}`) }); setNotice("Your video is ready. Preview the export and download it below.");
    } catch (failure) { if (!abort.signal.aborted && operation === sequence.current) setError(failure instanceof Error ? failure.message : "Export could not finish. Try a smaller resolution."); }
    finally { if (operation === sequence.current) { setBusy(null); setProgress(null); controller.current = null; } }
  }
  async function saveFrame() {
    if (!file || !size || locked) return; const operation = sequence.current;
    clearPng(); setPngBusy(true); setError("");
    try {
      if (!preview.current) throw new Error("Wait for the preview to load.");
      const blob = await preview.current.png(transparentPng, size.width, size.height);
      if (operation !== sequence.current) return;
      const url = URL.createObjectURL(blob); urls.current.png = url; setPng({ url, filename: filename(file.name, transparentPng ? "-transparent-frame.png" : "-composite-frame.png") });
    } catch (failure) { if (operation === sequence.current) setError((failure as Error).message); }
    finally { setPngBusy(false); }
  }
  return <section className={base.workspace} aria-label="Green screen workspace" aria-busy={locked}>
    <input ref={fileInput} type="file" className={base.fileInput} accept=".mp4,.mov,.m4v,.webm,.mkv" aria-label="Choose video file" onChange={chooseFile} /><input ref={imageInput} type="file" className={base.fileInput} accept=".jpg,.jpeg,.png,.webp" aria-label="Choose background image" onChange={chooseImage} />
    <div className={base.mainPanel}><div className={base.panelHead}><span><Icon name="video" size={18} /> Your scene studio</span><span className={base.localBadge}><i /> Original preserved</span></div>
      {!file ? <div className={`${base.dropzone} ${dragging ? base.dragging : ""}`} role="region" aria-label="Video file drop area" onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}><span className={base.uploadIcon}><Icon name="video" size={29} /></span><h2>Keep the subject. Change the scene.</h2><p>Drop a green or blue screen video here to begin.</p><button className={base.primary} type="button" disabled={locked} onClick={() => fileInput.current?.click()}><Icon name="plus" size={18} />Choose video</button><button className={base.textButton} type="button" disabled={locked} onClick={() => void openFile()}>Try sample video</button><button className={base.textButton} type="button" disabled={locked} onClick={() => void openFile(undefined, true)}>Try 4K sample</button><small>MP4, MOV, M4V, WebM or MKV<br />Up to 500 MB · 20 minutes · 4K input</small></div> : <><div className={base.fileRow}><div><strong>{file.name}</strong><span>{formatVideoBytes(file.size)} · {media?.width} × {media?.height} original</span></div><button className={base.textButton} type="button" disabled={pngBusy || imageBusy} onClick={() => fileInput.current?.click()}>Change video</button><button className={base.iconButton} type="button" disabled={pngBusy || imageBusy} aria-label="Remove video" onClick={remove}><Icon name="close" size={18} /></button></div>{media && <KeyPreview key={source} ref={preview} url={source} width={media.width} height={media.height} duration={media.duration} settings={key} background={background} image={image} disabled={locked} onColor={color => changeKey({ color })} onError={setError} />}</>}
      {file?.name.startsWith("aenural-green-screen-demo") && <p className={base.notice}><a href={source} download={file.name} className={base.textButton}>Download sample video</a></p>}
      {busy && <div className={base.progressPanel} role="status"><div><strong>{busy === "loading" ? "Checking your video…" : busy === "sample" ? "Preparing the sample…" : progress === null ? "Preparing your video…" : progress === 99 ? "Finishing your video…" : "Removing screen, please wait…"}</strong><span>{busy === "exporting" && progress !== null ? `${progress}%` : ""}</span></div><progress max={100} value={busy === "exporting" ? progress ?? undefined : undefined} aria-label="Video progress" /><button className={base.textButton} type="button" onClick={cancel}>Cancel {busy === "exporting" ? "export" : "loading"}</button></div>}
      {error && <p className={base.error} role="alert">{error}</p>}{!busy && notice && <p className={base.notice} role="status">{notice}</p>}
      {file && <div className={styles.frameDownload}><div><strong>Save this moment</strong><p>A PNG frame can keep the transparent cutout.</p></div><label><input type="checkbox" checked={transparentPng} disabled={locked} onChange={event => { clearPng(); setTransparentPng(event.target.checked); }} />Transparent PNG</label><button type="button" disabled={locked} onClick={() => void saveFrame()}>{pngBusy ? "Preparing frame…" : "Prepare PNG frame"}</button>{png && <a href={png.url} download={png.filename}>Download PNG</a>}</div>}
      {result && <div className={base.result}><div className={base.resultHeading}><div><span className={base.eyebrow}>YOUR NEW SCENE</span><h2>Ready for the spotlight.</h2></div><span className={base.savings}>{result.width} × {result.height}</span></div><video className={styles.resultVideo} src={result.url} controls playsInline preload="metadata" aria-label="Exported screen removed video" /><div className={base.downloadRow}><a className={base.primary} href={result.url} download={result.filename}><Icon name="download" size={18} />Download {settings.format.toUpperCase()}</a><span>{formatVideoBytes(result.blob.size)} · Completed in {result.seconds.toFixed(1)}s<br />{settings.keepAudio && media?.audioTracks ? "Audio retained" : "No audio"} · No watermark</span></div></div>}
    </div>
    <aside className={base.settingsPanel} aria-label="Screen removal settings"><div className={base.settingsHeading}><span className={base.eyebrow}>A FRESH BACKDROP</span><h2>Make a clean entrance.</h2><p>Refine the key. Set the scene. Make it yours.</p></div>
      <fieldset disabled={locked} className={base.settingsFields}><legend className={base.srOnly}>Key, background and export settings</legend><span className={styles.step}>01 / REMOVE THE SCREEN</span><div className={styles.keyPresets}><button type="button" aria-pressed={key.color === "#00c853"} onClick={() => changeKey({ color: "#00c853" })}><i style={{ background: "#00c853" }} />Green</button><button type="button" aria-pressed={key.color === "#0047ff"} onClick={() => changeKey({ color: "#0047ff" })}><i style={{ background: "#0047ff" }} />Blue</button><button type="button" disabled={!file || locked} onClick={() => { try { const color = preview.current?.detect(); if (color) changeKey({ color }); else setError("No clear green or blue screen was found at the edges. Pick a screen area or enter its color."); } catch (failure) { setError((failure as Error).message); } }}>Auto-detect</button></div><ColorField key={`screen-${key.color}`} label="Screen color" value={key.color} change={color => changeKey({ color })} />
      {([['strength','Removal strength'],['softness','Edge softness'],['spill','Spill removal']] as const).map(([field,label]) => <label className={styles.range} key={field}><span>{label}<output>{key[field]}%</output></span><input type="range" aria-label={label} min={0} max={100} value={key[field]} onChange={event => changeKey({ [field]: Number(event.target.value) })} /></label>)}<div className={styles.resetRow}><small>Use Matte preview to check your edges.</small><button type="button" onClick={() => { edit(); setKey(DEFAULT_KEY); }}>Reset key</button></div>
      <span className={styles.step}>02 / SET THE BACKGROUND</span><div className={styles.backgroundTabs} role="group" aria-label="Background type">{(["solid", "gradient", "image"] as const).map(type => <button type="button" key={type} aria-pressed={background.type === type} onClick={() => changeBackground({ type })}>{type === "solid" ? "Color" : type === "gradient" ? "Gradient" : "Image"}</button>)}</div>
      <div className={styles.colors}><ColorField key={`first-${background.color}`} label={background.type === "image" ? "Padding color" : "Background color"} value={background.color} change={color => changeBackground({ color })} />{background.type === "gradient" && <ColorField key={`second-${background.second}`} label="Second color" value={background.second} change={second => changeBackground({ second })} />}</div>
      {background.type === "gradient" && <div className={styles.swatches} aria-label="Gradient presets">{[["#182b4d","#8b5cf6"],["#102e2c","#59ac83"],["#f8bb80","#a54d66"]].map(([color,second],index) => <button type="button" key={color} aria-label={`Gradient preset ${index + 1}`} style={{ background: `linear-gradient(135deg,${color},${second})` }} onClick={() => changeBackground({ color, second })} />)}</div>}
      {background.type === "gradient" && <label className={styles.animate}><input type="checkbox" checked={background.animated} onChange={event => changeBackground({ animated: event.target.checked })} />Animate gradient</label>}
      {background.type === "image" && <div className={styles.imageControls}><button type="button" onClick={() => imageInput.current?.click()}>{imageBusy ? "Opening image…" : image ? "Change background image" : "Choose background image"}</button><small title={imageName}>{imageName || "PNG, JPG or WebP · up to 20 MB"}</small><label>Image fit<select aria-label="Background image fit" value={background.fit} onChange={event => changeBackground({ fit: event.target.value as Background["fit"] })}><option value="cover">Fill frame · crop edges</option><option value="contain">Fit entire image</option></select></label></div>}
      <span className={styles.step}>03 / EXPORT YOUR VIDEO</span><div className={base.selects}><label>Output size<select aria-label="Output size" value={settings.resolution} onChange={event => changeSettings({ resolution: event.target.value as KeyExport["resolution"] })}><option value="original">Original size (up to 4K)</option><option value="2160">4K (up to 2160p)</option><option value="1080">Up to 1080p</option><option value="720">Up to 720p</option><option value="480">Up to 480p</option></select></label><label>Output format<select aria-label="Output format" value={settings.format} onChange={event => changeSettings({ format: event.target.value as KeyExport["format"] })}><option value="mp4">MP4 · H.264</option><option value="webm">WebM</option></select></label></div><small className={base.hint}>Video includes the chosen background. PNG frames support transparency.</small><label className={base.audio}><span><Icon name={settings.keepAudio ? "volume" : "volume-off"} size={18} /><span>Keep sound<small>{media && !media.audioTracks ? "This video has no audio track" : "Uncheck for a silent export"}</small></span></span><input type="checkbox" checked={settings.keepAudio} disabled={!!media && !media.audioTracks} onChange={event => changeSettings({ keepAudio: event.target.checked })} /></label></fieldset>
      <div className={base.estimate}><span>YOUR OUTPUT VIDEO</span><strong>{size ? `${size.width} × ${size.height}` : "Choose a video"}</strong><small>{size ? `${settings.format.toUpperCase()} · full duration · never upscaled` : "Add your footage or try the sample."}</small></div><button type="button" className={`${base.primary} ${base.compressButton}`} disabled={!file || locked || background.type === "image" && !image} onClick={() => void exportVideo()}><Icon name="video" size={18} />{busy === "exporting" ? "Removing screen…" : "Remove screen & export"}<Icon name="arrow" size={18} /></button><p className={base.privateNote}><Icon name="check" size={15} />Free to use. No account or watermark.</p>
    </aside>
  </section>;
}
