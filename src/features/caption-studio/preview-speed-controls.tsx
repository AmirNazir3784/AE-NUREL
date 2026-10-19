"use client";
import { useEffect, useState, type RefObject } from "react";
export function PreviewSpeedControls({ videoRef, disabled }: { videoRef: RefObject<HTMLVideoElement | null>; disabled: boolean }) {
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    const element = videoRef.current; if (!element) return;
    const update = () => setSpeed(element.playbackRate);
    element.addEventListener("ratechange", update); element.playbackRate = 1;
    return () => element.removeEventListener("ratechange", update);
  }, [videoRef]);
  return <label>Preview speed<select value={speed} disabled={disabled} onChange={event => { if (videoRef.current) videoRef.current.playbackRate = Number(event.target.value); }}>{[.5,.75,1,1.25,1.5,2].map(value => <option key={value} value={value}>{value}&times;</option>)}</select></label>;
}
