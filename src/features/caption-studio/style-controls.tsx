"use client";
import { useRef } from "react";
import { DownloadButton } from "@/components/tools/download-button";
import { STUDIO_FONTS, STUDIO_PRESETS, parseStudioStyle, type StudioStyle } from "./studio-core";
import styles from "./studio.module.css";
type NumericKey = { [K in keyof StudioStyle]: StudioStyle[K] extends number ? K : never }[keyof StudioStyle];
type ColorKey = "color" | "highlight" | "outlineColor" | "shadowColor" | "wordColor" | "wordBackgroundColor";

export function StyleControls({ style, disabled, wordTimingAvailable = false, onChange, onPreset, onError }: { style: StudioStyle; disabled: boolean; wordTimingAvailable?: boolean; onChange: (value: Partial<StudioStyle>) => void; onPreset: (value: StudioStyle) => void; onError: (message: string) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  function slider(label: string, key: NumericKey, min: number, max: number, step = 1, unit = "") {
    return <label>{label}<span className={styles.rangeRow}><input type="range" min={min} max={max} step={step} value={style[key]} onChange={event => onChange({ [key]: Number(event.target.value) })} /><output>{style[key]}{unit}</output></span></label>;
  }
  function color(label: string, key: ColorKey) { return <label>{label}<input type="color" value={style[key]} onChange={event => onChange({ [key]: event.target.value, ...(key === "highlight" ? { background: true } : {}) })} /></label>; }
  function choice(label: string, key: keyof StudioStyle, options: readonly (readonly [string,string])[]) { return <label>{label}<select value={String(style[key])} onChange={event => onChange({ [key]: event.target.value })}>{options.map(([value,text]) => <option key={value} value={value}>{text}</option>)}</select></label>; }
  function presetButton(preset: StudioStyle) { return <button type="button" key={preset.preset} aria-pressed={style.preset === preset.preset} disabled={disabled} className={styles.preset} onClick={() => onPreset(preset)}><span style={{ fontFamily: ["Inter", "Sora"].includes(preset.font) ? `var(--font-${preset.font === "Sora" ? "heading" : "platform"})` : preset.font, fontWeight: preset.weight, color: preset.color, textShadow: preset.shadow ? `0 1px ${preset.shadowBlur / 10}px ${preset.shadowColor}` : "none", WebkitTextStroke: preset.outline ? `${preset.outline / 10}px ${preset.outlineColor}` : undefined, textTransform: preset.textCase === "upper" ? "uppercase" : preset.textCase === "lower" ? "lowercase" : undefined }}><b style={{ background: preset.background ? preset.highlight : undefined, borderRadius: preset.radius / 5, padding: preset.background ? "3px 6px" : undefined }}>Make it yours</b></span><small>{preset.preset}</small></button>; }
  return <>
    <div className={styles.presets}>{STUDIO_PRESETS.slice(0,5).map(presetButton)}</div>
    <details className={styles.details}><summary>More styles · {STUDIO_PRESETS.length - 5}</summary><div className={styles.presets}>{STUDIO_PRESETS.slice(5).map(presetButton)}</div></details>
    <fieldset className={styles.customize} disabled={disabled}>
      {choice("Placement", "position", [["top","Top"],["middle","Center"],["bottom","Bottom"],["custom","Custom"]])}
      {slider("Text size", "size", 2.5, 12, .1, "%")}
      <label className={styles.inline}><input type="checkbox" checked={style.background} onChange={event => onChange({ background: event.target.checked })} />Highlight background</label>
      <div className={styles.colors}>{color("Text color", "color")}{color("Background color", "highlight")}</div>
      <label className={styles.inline}><input type="checkbox" checked={style.wordHighlight && wordTimingAvailable} disabled={!wordTimingAvailable} onChange={event => onChange({ wordHighlight: event.target.checked })} />Highlight spoken words</label>
      {wordTimingAvailable ? <>
        <div className={styles.colors}>{color("Active word color", "wordColor")}</div>
        <label className={styles.inline}><input type="checkbox" checked={style.wordBackground} disabled={!style.wordHighlight} onChange={event => onChange({ wordBackground: event.target.checked })} />Background behind active word only</label>
        {style.wordHighlight && style.wordBackground && <div className={styles.colors}>{color("Active word background color", "wordBackgroundColor")}</div>}
        <p className={styles.note}>Only the spoken word gets this background. Uses measured speech timing; editing text or timing pauses highlighting for that caption.</p>
      </> : <p className={styles.note}>Generate captions to get word timing. Imported SRT/VTT files support caption backgrounds, not precise word highlighting.</p>}
      <details className={styles.details}><summary>Typography and lines</summary>
        {choice("Font", "font", STUDIO_FONTS.map(font => [font,font] as const))}<p className={styles.note}>Inter and Sora are included. Other fonts use your device.</p>
        {slider("Font weight", "weight", 100, 900, 100)}
        {choice("Alignment", "align", [["left","Left"],["center","Center"],["right","Right"]])}
        {choice("Letter case", "textCase", [["original","Original"],["upper","UPPERCASE"],["lower","lowercase"]])}
        {slider("Letter spacing", "letterSpacing", -2, 12, .5, "%")}{slider("Word spacing", "wordSpacing", -2, 20, .5, "%")}
        {slider("Line spacing", "lineHeight", 1, 1.8, .05)}{slider("Caption width", "maxWidth", 40, 94, 1, "%")}{slider("Maximum lines", "maxLines", 1, 4)}
        <label className={styles.inline}><input type="checkbox" checked={style.fit} onChange={event => onChange({ fit: event.target.checked })} />Auto-fit long captions</label><p className={styles.note}>Auto-fit reduces text size within readable limits. Source text and timing stay unchanged.</p>
      </details>
      <details className={styles.details}><summary>Background and outline</summary>
        {slider("Caption opacity", "opacity", .1, 1, .05)}
        {slider("Background opacity", "backgroundOpacity", .05, 1, .05)}{slider("Horizontal padding", "paddingX", 0, 100, 5, "%")}{slider("Vertical padding", "paddingY", 0, 100, 5, "%")}{slider("Corner radius", "radius", 0, 100, 5, "%")}
        <div className={styles.colors}>{color("Outline color", "outlineColor")}</div>{slider("Outline width", "outline", 0, 20, 1, "%")}
      </details>
      <details className={styles.details}><summary>Shadow and glow</summary>
        <label className={styles.inline}><input type="checkbox" checked={style.shadow} onChange={event => onChange({ shadow: event.target.checked })} />Text shadow</label>
        <div className={styles.colors}>{color("Shadow color", "shadowColor")}</div>{slider("Shadow opacity", "shadowOpacity", 0, 1, .05)}{slider("Blur / glow", "shadowBlur", 0, 100, 5, "%")}{slider("Shadow horizontal", "shadowX", -50, 50, 1, "%")}{slider("Shadow vertical", "shadowY", -50, 50, 1, "%")}
      </details>
      <details className={styles.details}><summary>Precise position</summary>{slider("Horizontal position", "x", 0, 100, 1, "%")}{slider("Vertical position", "y", 0, 100, 1, "%")}{slider("Rotation", "rotation", -20, 20, 1, "°")}<p className={styles.note}>Placement stays inside the video. Layouts that cannot fit must be adjusted before export.</p></details>
      <details className={styles.details}><summary>Motion</summary>{choice("Animation", "animation", [["none","None"],["fade","Fade"],["pop","Pop"],["rise","Rise"]])}{slider("Entrance duration", "motionDuration", 80, 1000, 20, "ms")}<p className={styles.note}>Motion is disabled when your device requests reduced motion.</p></details>
    </fieldset>
    <details className={styles.details}><summary>Save or load your style</summary><div className={styles.actions}><DownloadButton label="Save style" filename="aenural-caption-style.json" content={() => JSON.stringify({ version: 1, style }, null, 2)} disabled={disabled} variant="secondary" onDownloaded={() => {}} onError={onError} /><button type="button" className="button button-secondary" disabled={disabled} onClick={() => fileInput.current?.click()}>Load style</button><input ref={fileInput} type="file" accept=".json" className="sr-only" aria-label="Load caption style" disabled={disabled} onChange={async event => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; try { if (file.size > 32_768) throw new Error("Choose a style file smaller than 32 KiB."); onPreset(parseStudioStyle(await file.text())); } catch (error) { onError(error instanceof Error ? error.message : "This style could not be loaded."); } }} /></div></details>
  </>;
}
