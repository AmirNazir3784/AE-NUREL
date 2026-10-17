"use client";

import { useEffect, useRef, useState } from "react";
import { useHomeMedia } from "./home-video-modal";

type HomeVideoProps = { src: string; poster: string; label: string; hero?: boolean };

export function HomeVideo({ src, poster, label, hero = false }: HomeVideoProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const media = useHomeMedia();
  useEffect(() => {
    const player = video.current;
    if (!player || typeof IntersectionObserver === "undefined") return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const data = matchMedia("(prefers-reduced-data: reduce)");
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    let visible = false;
    const update = () => {
      if (visible && !media.expanded && !document.hidden && !motion.matches && !data.matches && !connection?.saveData) {
        player.muted = true;
        void player.play().catch(() => { /* The expand button remains usable if autoplay is denied. */ });
      } else player.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && entry.intersectionRatio >= 0.25; update(); }, { threshold: 0.25 });
    observer.observe(player);
    for (const preference of [motion, data]) preference.addEventListener("change", update);
    connection?.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      for (const preference of [motion, data]) preference.removeEventListener("change", update);
      connection?.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      player.pause();
    };
  }, [media.expanded]);

  return <figure className={`${hero ? "aen-preview" : "aen-feature-visual"} aen-video-frame`} aria-label={label}>
    <div className="aen-screen aen-video-screen">
      <video ref={video} data-home-preview src={src} poster={poster} playsInline muted loop preload="none" aria-hidden="true" onError={() => setFailed(true)} />
      <button className="aen-video-expand" type="button" aria-label={`Watch ${label}`} aria-haspopup="dialog" onClick={event => media.open({ src, poster, label, trigger: event.currentTarget })}>
        <span aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20"><path d="m8 5 11 7-11 7Z" fill="currentColor" /></svg></span>
      </button>
    </div>
    {failed && <p className="aen-video-load-note">Preview unavailable. Select the video to open it.</p>}
  </figure>;
}
