"use client";
import { useEffect, useState, type RefObject } from "react";
import type { EditorDocument } from "@/lib/subtitle-editor";
import styles from "./audio-captions.module.css";

export function LyricPreview({ audio, document, stale }: { audio: RefObject<HTMLAudioElement | null>; document: EditorDocument | null; stale: boolean }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    let frame = 0;
    function update() {
      const time = player!.currentTime * 1000;
      setText(document?.cues.find(cue => cue.start !== null && cue.end !== null && cue.start <= time && cue.end > time)?.text ?? "");
      if (!player!.paused && !player!.ended) frame = requestAnimationFrame(update);
    }
    function refresh() { cancelAnimationFrame(frame); update(); }
    for (const event of ["play", "pause", "seeked", "ended", "loadedmetadata"]) player.addEventListener(event, refresh);
    refresh();
    return () => { cancelAnimationFrame(frame); for (const event of ["play", "pause", "seeked", "ended", "loadedmetadata"]) player.removeEventListener(event, refresh); };
  }, [audio, document]);
  return <div className={styles.lyricPreview} aria-label="Synced lyric preview"><span>Caption preview</span><p dir="auto">{text || "♪"}</p>{stale && <small>Inputs changed. Generate again to update this preview.</small>}</div>;
}
