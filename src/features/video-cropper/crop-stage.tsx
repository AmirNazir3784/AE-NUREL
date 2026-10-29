"use client";

import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { ASPECTS, moveCrop, resizeCrop, type Aspect, type Crop, type Corner, type Frame } from "./crop-core";
import styles from "./video-cropper.module.css";

const corners: Corner[] = ["nw", "ne", "sw", "se"];
const names = { nw: "top left", ne: "top right", sw: "bottom left", se: "bottom right" };
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function CropStage({ url, frame, crop, aspect, duration, disabled, onStart, onChange }: { url: string; frame: Frame; crop: Crop; aspect: Aspect; duration: number; disabled: boolean; onStart: () => void; onChange: (crop: Crop) => void }) {
  const stage = useRef<HTMLDivElement>(null), video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ crop: Crop; x: number; y: number; corner: Corner | "move"; id: number } | null>(null);
  const [playing, setPlaying] = useState(false), [muted, setMuted] = useState(true), [position, setPosition] = useState(0);

  useEffect(() => {
    const source = video.current, preview = canvas.current;
    if (!source || !preview) return;
    const context = preview.getContext("2d");
    let animation = 0;
    const draw = () => {
      if (source.readyState >= 2 && context) context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, preview.width, preview.height);
    };
    const animate = () => { draw(); if (!source.paused && !source.ended) animation = requestAnimationFrame(animate); };
    const start = () => { cancelAnimationFrame(animation); animate(); };
    draw(); if (!source.paused) start();
    source.addEventListener("loadeddata", draw); source.addEventListener("seeked", draw); source.addEventListener("play", start);
    return () => { cancelAnimationFrame(animation); source.removeEventListener("loadeddata", draw); source.removeEventListener("seeked", draw); source.removeEventListener("play", start); };
  }, [url, crop]);

  function point(event: PointerEvent) {
    const box = stage.current!.getBoundingClientRect();
    return { x: (event.clientX - box.left) * frame.width / box.width, y: (event.clientY - box.top) * frame.height / box.height };
  }
  function start(event: PointerEvent<HTMLButtonElement>, corner: Corner | "move") {
    if (disabled || event.button !== 0) return;
    event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { ...point(event), crop, corner, id: event.pointerId }; onStart();
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const initial = drag.current;
    if (!initial || disabled || initial.id !== event.pointerId) return;
    const current = point(event);
    if (initial.corner === "move") onChange(moveCrop(initial.crop, frame, initial.crop.x + current.x - initial.x, initial.crop.y + current.y - initial.y));
    else {
      const x = initial.crop.x + (initial.corner.includes("e") ? initial.crop.width : 0) + current.x - initial.x;
      const y = initial.crop.y + (initial.corner.includes("s") ? initial.crop.height : 0) + current.y - initial.y;
      onChange(resizeCrop(initial.crop, frame, aspect, initial.corner, x, y));
    }
  }
  function key(event: KeyboardEvent<HTMLButtonElement>, corner: Corner | "move") {
    const directions: Record<string, number[]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key]; if (!direction || disabled) return;
    event.preventDefault(); onStart();
    const amount = event.shiftKey ? 10 : 1;
    if (corner === "move") onChange(moveCrop(crop, frame, crop.x + direction[0] * amount, crop.y + direction[1] * amount));
    else {
      const pair = ASPECTS[aspect];
      // A locked ratio must change both axes together; keep the opposite corner fixed.
      const sign = direction[0] ? direction[0] * (corner.includes("e") ? 1 : -1) : direction[1] * (corner.includes("s") ? 1 : -1);
      const dx = pair ? sign * pair[0] * 2 * amount * (corner.includes("e") ? 1 : -1) : direction[0] * 2 * amount;
      const dy = pair ? sign * pair[1] * 2 * amount * (corner.includes("s") ? 1 : -1) : direction[1] * 2 * amount;
      onChange(resizeCrop(crop, frame, aspect, corner, crop.x + (corner.includes("e") ? crop.width : 0) + dx, crop.y + (corner.includes("s") ? crop.height : 0) + dy));
    }
  }
  const left = crop.x / frame.width * 100, top = crop.y / frame.height * 100, width = crop.width / frame.width * 100, height = crop.height / frame.height * 100;
  const pointer = { onPointerMove: move, onPointerUp: () => { drag.current = null; }, onPointerCancel: () => { drag.current = null; }, onLostPointerCapture: () => { drag.current = null; } };
  return <>
    <div className={styles.stageWrap}>
      <div ref={stage} className={styles.stage} style={{ aspectRatio: `${frame.width}/${frame.height}`, width: `min(100%, ${400 * frame.width / frame.height}px)` }}>
        <video ref={video} src={url} muted={muted} playsInline preload="auto" aria-label="Original video" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={event => setPosition(event.currentTarget.currentTime)} />
        <div className={styles.shade} style={{ left: 0, top: 0, width: "100%", height: `${top}%` }} />
        <div className={styles.shade} style={{ left: 0, top: `${top + height}%`, width: "100%", bottom: 0 }} />
        <div className={styles.shade} style={{ left: 0, top: `${top}%`, width: `${left}%`, height: `${height}%` }} />
        <div className={styles.shade} style={{ left: `${left + width}%`, top: `${top}%`, right: 0, height: `${height}%` }} />
        <div className={styles.selection} style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}>
          <button type="button" className={styles.move} aria-label="Move crop frame" aria-describedby="crop-keyboard-help" disabled={disabled} onPointerDown={event => start(event, "move")} onKeyDown={event => key(event, "move")} {...pointer}><span className={styles.grid} aria-hidden="true" /><span className={styles.cropLabel}>{crop.width} × {crop.height}</span></button>
          {corners.map(corner => <button type="button" key={corner} className={`${styles.handle} ${styles[corner]}`} aria-label={`Resize ${names[corner]} corner`} disabled={disabled} onPointerDown={event => start(event, corner)} onKeyDown={event => key(event, corner)} {...pointer}><span /></button>)}
        </div>
      </div>
    </div>
    <div className={styles.transport}>
      <button type="button" onClick={() => { if (video.current?.paused) void video.current.play().catch(() => {}); else video.current?.pause(); }} aria-label={playing ? "Pause preview" : "Play preview"}>{playing ? "Pause" : "Play"}</button>
      <input type="range" aria-label="Preview position" min={0} max={duration} step={0.01} value={position} onChange={event => { if (video.current) video.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); }} />
      <span>{time(position)} / {time(duration)}</span><button type="button" onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute preview" : "Mute preview"}>{muted ? "Sound off" : "Sound on"}</button>
    </div>
    <p className={styles.keyboardHelp} id="crop-keyboard-help">Drag the frame or its corners. Focus a handle and use arrow keys; Shift moves faster.</p>
    <div className={styles.livePreview}><div><strong>Live crop preview</strong><span>Only this area will be exported.</span></div><canvas ref={canvas} width={Math.max(2, Math.round(260 * Math.min(1, crop.width / crop.height)))} height={Math.max(2, Math.round(260 * Math.min(1, crop.height / crop.width)))} aria-label="Live cropped frame preview" /></div>
  </>;
}
