"use client";
import { useEffect, useRef, useState } from "react";
import { emptyEditor } from "@/lib/subtitle-editor";
import { paintStudioCaptions, STUDIO_PRESETS, studioFont } from "@/features/caption-studio/studio-core";
import { STUDIO_ANIMATIONS, type StudioAnimation } from "@/features/caption-studio/studio-motion";

const sample = { ...emptyEditor(), filename: "style-preview.srt", cues: [{ id: "sample", text: "Every word.\nIn your style.", start: 0, end: 3000, identifier: "", srtSettings: "", vttSettings: "" }] };

export function CaptionStyleShowcase() {
  const [preset, setPreset] = useState("Bold"), [animation, setAnimation] = useState<StudioAnimation>("pop"), [replay, setReplay] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current, ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    let frame = 0, stopped = false;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const chosen = STUDIO_PRESETS.find(item => item.preset === preset)!;
    const style = { ...chosen, position: "middle" as const, x: 50, y: 50, size: 8, animation, motionDuration: 700 };
    function render(time: number) {
      ctx!.clearRect(0, 0, 960, 600);
      try { paintStudioCaptions(ctx!, 960, 600, sample, time, style, studioFont(style), preference.matches); }
      catch { /* The readable sample remains available as canvas fallback text. */ }
    }
    function start() {
      cancelAnimationFrame(frame);
      if (preference.matches) { render(1000); return; }
      const begin = performance.now();
      const tick = () => { if (stopped) return; const time = Math.min(performance.now() - begin, 1000); render(time); if (time < 1000) frame = requestAnimationFrame(tick); };
      tick();
    }
    void document.fonts.ready.then(() => { if (!stopped) start(); });
    preference.addEventListener("change", start);
    return () => { stopped = true; cancelAnimationFrame(frame); preference.removeEventListener("change", start); };
  }, [preset, animation, replay]);
  return <section className="cap-style-showcase aen-wrap cap-reveal" id="caption-styles">
    <div className="cap-showcase-copy"><span className="cap-label">STYLE WITH A POINT OF VIEW</span><h2>A caption should feel<br /><span>like your video.</span></h2><p>Explore the actual caption renderer. Pick a style and replay an entrance effect—then bring your own footage into Caption Studio.</p><div className="cap-showcase-chips">{["Clean", "Bold", "Outline", "Highlight", "Pop", "Editorial"].map(name => <button key={name} type="button" aria-pressed={preset === name} onClick={() => setPreset(name)}>{name}</button>)}</div><div className="cap-showcase-facts"><span><b>{STUDIO_PRESETS.length}</b>real presets</span><span><b>{STUDIO_ANIMATIONS.length - 1}</b>motion effects</span><span><b>SRT + VTT</b>subtitle exports</span></div><a className="cap-text-link" href="#caption-studio">Try your own video ↗</a></div>
    <div className="cap-style-demo"><div className="cap-demo-heading"><span>LIVE STYLE PREVIEW</span><span>Sample text · no video upload</span></div><div className="cap-demo-stage"><div className="cap-demo-orbit" aria-hidden="true" /><canvas ref={canvas} width={960} height={600} role="img" aria-label={`${preset} caption style with ${animation} motion. Sample text: Every word. In your style.`}>Every word. In your style.</canvas></div><div className="cap-demo-controls"><label>All caption styles<select value={preset} onChange={e => setPreset(e.target.value)}>{STUDIO_PRESETS.map(item => <option key={item.preset}>{item.preset}</option>)}</select></label><label>Entrance motion<select value={animation} onChange={e => setAnimation(e.target.value as StudioAnimation)}>{STUDIO_ANIMATIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><button type="button" onClick={() => setReplay(n => n + 1)} aria-label="Replay caption style preview">↻<span>Replay</span></button></div><p>Preview a caption style and replay its animation before choosing. Font availability can vary.</p></div>
  </section>;
}
