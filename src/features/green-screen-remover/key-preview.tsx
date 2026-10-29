"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type MouseEvent } from "react";
import { detectScreen, hex, type RGB, type Background, type KeySettings } from "./key-core";
import { finishFrame, type KeyView } from "./key-renderer";
import styles from "./green-screen-remover.module.css";

export type PreviewHandle = { detect: () => string | null; png: (transparent: boolean, width: number, height: number) => Promise<Blob> };
type Props = { url: string; width: number; height: number; duration: number; settings: KeySettings; background: Background; image: ImageBitmap | null; disabled: boolean; onColor: (color: string) => void; onError: (message: string) => void };
const clock = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;
export const KeyPreview = forwardRef<PreviewHandle, Props>(function KeyPreview({ url, width, height, duration, settings, background, image, disabled, onColor, onError }, ref) {
  const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<KeyView>("composite"), [picking, setPicking] = useState(false), [playing, setPlaying] = useState(false), [position, setPosition] = useState(0), [muted, setMuted] = useState(true);
  const scale = Math.min(1, 640 / width, 360 / height), pw = Math.max(2, Math.round(width * scale)), ph = Math.max(2, Math.round(height * scale));
  function sourceFrame(w = pw, h = ph) {
    if (!video.current || video.current.readyState < 2) throw new Error("Wait for the preview to load, then try again.");
    const frame = document.createElement("canvas"); frame.width = w; frame.height = h;
    const context = frame.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Preview rendering is unavailable.");
    context.drawImage(video.current, 0, 0, w, h); return { frame, context };
  }
  useImperativeHandle(ref, () => ({
    detect() {
      const { context } = sourceFrame();
      return detectScreen([[.05,.05],[.5,.05],[.95,.05],[.05,.5],[.95,.5],[.05,.95],[.95,.95]].map(([x,y]) => Array.from(context.getImageData(Math.floor(x * pw), Math.floor(y * ph), 1, 1).data).slice(0, 3) as unknown as RGB));
    },
    async png(transparent, w, h) {
      const { frame, context } = sourceFrame(w, h);
      finishFrame(context, settings, background, image, transparent ? "cutout" : "composite", video.current?.currentTime ?? 0);
      return new Promise((resolve, reject) => frame.toBlob(blob => blob ? resolve(blob) : reject(new Error("The PNG frame could not be saved.")), "image/png"));
    },
  }));
  useEffect(() => {
    const source = video.current, output = canvas.current;
    if (!source || !output) return;
    const context = output.getContext("2d", { willReadFrequently: true });
    let animation = 0, last = 0, failed = false;
    const draw = () => {
      if (source.readyState < 2 || !context || failed) return;
      try { context.clearRect(0, 0, pw, ph); context.drawImage(source, 0, 0, pw, ph); finishFrame(context, settings, background, image, picking ? "original" : view, source.currentTime); }
      catch { failed = true; onError("The video preview could not be rendered. Try another supported video."); }
    };
    const tick = (time: number) => { if (time - last > 65) { draw(); last = time; } if (!source.paused && !source.ended) animation = requestAnimationFrame(tick); };
    const start = () => { cancelAnimationFrame(animation); animation = requestAnimationFrame(tick); };
    const ready = () => { draw(); cancelAnimationFrame(animation); animation = requestAnimationFrame(() => { draw(); if (!source.paused) start(); }); };
    ready(); source.addEventListener("loadeddata", ready); source.addEventListener("seeked", ready); source.addEventListener("play", start); source.addEventListener("pause", ready);
    return () => { cancelAnimationFrame(animation); source.removeEventListener("loadeddata", ready); source.removeEventListener("seeked", ready); source.removeEventListener("play", start); source.removeEventListener("pause", ready); };
  }, [url, pw, ph, settings, background, image, view, picking, onError]);
  function pick(event: MouseEvent<HTMLCanvasElement>) {
    if (!picking || disabled) return;
    try {
      const box = event.currentTarget.getBoundingClientRect(), { context } = sourceFrame();
      const x = Math.min(pw - 1, Math.max(0, Math.floor((event.clientX - box.left) / box.width * pw))), y = Math.min(ph - 1, Math.max(0, Math.floor((event.clientY - box.top) / box.height * ph)));
      onColor(hex(Array.from(context.getImageData(x, y, 1, 1).data).slice(0, 3) as unknown as RGB)); setPicking(false);
    } catch (failure) { onError((failure as Error).message); }
  }
  return <>
    <div className={styles.previewToolbar}><div role="group" aria-label="Preview mode">{(["composite", "original", "matte", "cutout"] as const).map(mode => <button type="button" key={mode} aria-pressed={view === mode && !picking} onClick={() => { setView(mode); setPicking(false); }}>{mode === "composite" ? "Result" : mode === "original" ? "Original" : mode === "matte" ? "Matte" : "Cutout"}</button>)}</div><span>{width} × {height}</span></div>
    <div className={`${styles.stage} ${picking ? styles.picking : ""}`}><video ref={video} src={url} muted={muted} playsInline preload="auto" aria-hidden="true" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={event => setPosition(event.currentTarget.currentTime)} onError={() => onError("This video cannot play in the preview. Try H.264 MP4 or another browser-supported codec.")} /><canvas ref={canvas} width={pw} height={ph} style={{ width: `min(100%, ${420 * width / height}px)` }} onClick={pick} aria-label={picking ? "Click a screen area to sample its color" : `${view} video preview`} /></div>
    <div className={styles.transport}><button type="button" aria-label={playing ? "Pause preview" : "Play preview"} onClick={() => { if (video.current?.paused) void video.current.play().catch(() => onError("The preview cannot play this codec. Try another video.")); else video.current?.pause(); }}>{playing ? "Pause" : "Play"}</button><input type="range" aria-label="Preview position" min={0} max={duration} step={.01} value={position} onChange={event => { const time = Number(event.target.value); if (video.current) video.current.currentTime = time; setPosition(time); }} /><span>{clock(position)} / {clock(duration)}</span><button type="button" aria-label={muted ? "Unmute preview" : "Mute preview"} onClick={() => setMuted(!muted)}>{muted ? "Sound off" : "Sound on"}</button></div>
    <div className={styles.previewActions}><button type="button" aria-pressed={picking} disabled={disabled} onClick={() => { video.current?.pause(); setPicking(!picking); }}> {picking ? "Cancel color pick" : "Pick from preview"}</button><p>{picking ? "Click the screen behind your subject. You can also use the Screen color field." : view === "matte" ? "White stays. Black is removed. Gray marks soft edges." : view === "cutout" ? "Checkerboard shows transparency. Use PNG frame to save this cutout." : "Play or seek through your footage to check the edges."}</p></div>
  </>;
});
