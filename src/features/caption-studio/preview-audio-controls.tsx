"use client";
import { useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Icon } from "@/components/ui/icon";
import styles from "./studio.module.css";

// Preview only: exporter reads original audio packets, never element volume.
export function PreviewAudioControls({ videoRef, hasAudio, disabled }: { videoRef: RefObject<HTMLVideoElement | null>; hasAudio: boolean; disabled: boolean }) {
  const [audio, setAudio] = useState({ volume: 1, muted: false }), audible = useRef(1), id = useId();
  useEffect(() => {
    const element = videoRef.current; if (!element) return;
    const update = () => { if (element.volume > 0) audible.current = element.volume; setAudio({ volume: element.volume, muted: element.muted }); };
    element.addEventListener("volumechange", update);
    element.volume = 1; element.muted = false;
    return () => element.removeEventListener("volumechange", update);
  }, [videoRef]);
  const silent = audio.muted || audio.volume === 0;
  function toggle() {
    const element = videoRef.current; if (!element) return;
    if (silent) { if (!element.volume) element.volume = audible.current; element.muted = false; }
    else element.muted = true;
  }
  return <div className={styles.previewAudio} role="group" aria-label="Preview audio">
    <button type="button" aria-label={silent ? "Unmute preview" : "Mute preview"} aria-pressed={silent} disabled={disabled || !hasAudio} onClick={toggle}><Icon name={silent ? "volume-off" : "volume"} size={18} /></button>
    <label htmlFor={id} className="sr-only">Volume</label><input id={id} aria-label="Preview volume" type="range" min={0} max={1} step={.05} value={audio.volume} style={{ "--range-fill": `${audio.volume * 100}%` } as CSSProperties} aria-valuetext={silent ? "Muted" : `${Math.round(audio.volume * 100)} percent`} disabled={disabled || !hasAudio} onChange={event => { if (videoRef.current) { videoRef.current.volume = Number(event.target.value); videoRef.current.muted = false; } }} />
    <output htmlFor={id}>{!hasAudio ? "No audio" : silent ? "Muted" : `${Math.round(audio.volume * 100)}%`}</output>
  </div>;
}
