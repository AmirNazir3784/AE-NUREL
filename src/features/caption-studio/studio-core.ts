import { editorExportErrors, type EditorDocument } from "../../lib/subtitle-editor.ts";
import { plainCaption } from "../../lib/subtitle-conversion.ts";
import { wrapCaption } from "../../lib/subtitle-video.ts";

export const STUDIO_LIMITS = { bytes: 200 * 1024 ** 2, seconds: 120, pixels: 1920 * 1080, cues: 500, outputBytes: 256 * 1024 ** 2 } as const;
export const STUDIO_FONTS = ["Inter", "Sora", "Arial", "Georgia", "Times New Roman", "Verdana", "Courier New"] as const;
export type StudioStyle = {
  preset: string; font: typeof STUDIO_FONTS[number]; size: number; weight: number;
  color: string; opacity: number; highlight: string; background: boolean; backgroundOpacity: number; paddingX: number; paddingY: number; radius: number;
  outline: number; outlineColor: string; shadow: boolean; shadowColor: string; shadowOpacity: number; shadowBlur: number; shadowX: number; shadowY: number;
  position: "top" | "middle" | "bottom" | "custom"; x: number; y: number; rotation: number; align: "left" | "center" | "right";
  maxWidth: number; maxLines: number; lineHeight: number; letterSpacing: number; wordSpacing: number; fit: boolean; textCase: "original" | "upper" | "lower";
  animation: "none" | "fade" | "pop" | "rise"; motionDuration: number;
};
const baseStyle: StudioStyle = { preset: "Clean", font: "Inter", size: 4.8, weight: 600, color: "#ffffff", opacity: 1, highlight: "#187e70", background: false, backgroundOpacity: .95, paddingX: 40, paddingY: 10, radius: 18, outline: 0, outlineColor: "#101716", shadow: true, shadowColor: "#000000", shadowOpacity: .7, shadowBlur: 14, shadowX: 0, shadowY: 4, position: "bottom", x: 50, y: 84, rotation: 0, align: "center", maxWidth: 86, maxLines: 2, lineHeight: 1.3, letterSpacing: 0, wordSpacing: 0, fit: true, textCase: "original", animation: "none", motionDuration: 180 };
function preset(name: string, changes: Partial<StudioStyle> = {}): StudioStyle { return { ...baseStyle, preset: name, ...changes }; }
export const STUDIO_PRESETS: readonly StudioStyle[] = [
  preset("Clean"), preset("Bold", { font: "Sora", weight: 800, size: 6.2, color: "#ffae58" }),
  preset("Outline", { weight: 800, size: 5.5, outline: 8 }),
  preset("Highlight", { weight: 800, size: 5, background: true }),
  preset("Pop", { font: "Sora", weight: 800, size: 5.8, highlight: "#d66b12", outline: 5, position: "middle", y: 50, animation: "pop" }),
  preset("Editorial", { font: "Georgia", weight: 400, size: 5.6, background: true, highlight: "#14201f", radius: 0, paddingX: 50 }),
  preset("Minimal", { weight: 400, size: 4, shadow: false, color: "#f4f8f7", maxWidth: 75 }),
  preset("Cinema", { font: "Georgia", weight: 600, size: 4.8, outline: 4, textCase: "upper", letterSpacing: 2 }),
  preset("Glass", { background: true, highlight: "#14201f", backgroundOpacity: .6, paddingX: 65, paddingY: 35, radius: 40 }),
  preset("Neon", { color: "#a4f4dc", shadowColor: "#28ad91", shadowOpacity: 1, shadowBlur: 60, shadowY: 0, outline: 2, outlineColor: "#187e70" }),
  preset("Marker", { color: "#17221f", background: true, highlight: "#ffbf72", shadow: false, radius: 0, weight: 800, textCase: "upper" }),
  preset("Mono", { font: "Courier New", weight: 700, background: true, highlight: "#111b1a", paddingX: 35, radius: 6 }),
  preset("Paper", { font: "Georgia", weight: 400, color: "#17221f", highlight: "#f7f4eb", background: true, shadow: false, radius: 10, paddingX: 60, paddingY: 30 }),
  preset("Broadcast", { font: "Arial", weight: 700, background: true, highlight: "#154a68", radius: 0, align: "left", x: 0, maxWidth: 78 }),
  preset("Lift", { font: "Sora", weight: 700, size: 5.4, animation: "rise", motionDuration: 300, outline: 3 }),
];
export function validateStudioStyle(style: StudioStyle) {
  if (!style || typeof style.preset !== "string" || style.preset.length > 40 || !["top", "middle", "bottom", "custom"].includes(style.position) || [style.background, style.shadow, style.fit].some(value => typeof value !== "boolean")) throw new Error("This caption style is not valid.");
  if (!STUDIO_FONTS.includes(style.font) || !["left", "center", "right"].includes(style.align) || !["none", "fade", "pop", "rise"].includes(style.animation) || !["original", "upper", "lower"].includes(style.textCase)) throw new Error("Choose supported caption style settings.");
  for (const color of [style.color, style.highlight, style.outlineColor, style.shadowColor]) if (!/^#[\da-f]{6}$/i.test(color)) throw new Error("Use a valid caption color.");
  const ranges: [number, number, number][] = [[style.size,2.5,12],[style.weight,100,900],[style.opacity,.1,1],[style.backgroundOpacity,.05,1],[style.paddingX,0,100],[style.paddingY,0,100],[style.radius,0,100],[style.outline,0,20],[style.shadowOpacity,0,1],[style.shadowBlur,0,100],[style.shadowX,-50,50],[style.shadowY,-50,50],[style.x,0,100],[style.y,0,100],[style.rotation,-20,20],[style.maxWidth,40,94],[style.maxLines,1,4],[style.lineHeight,1,1.8],[style.letterSpacing,-2,12],[style.wordSpacing,-2,20],[style.motionDuration,80,1000]];
  if (ranges.some(([value,min,max]) => !Number.isFinite(value) || value < min || value > max) || !Number.isInteger(style.maxLines)) throw new Error("A caption style value is outside its supported range.");
}
export function parseStudioStyle(text: string): StudioStyle {
  if (text.length > 32_768) throw new Error("Choose a style file smaller than 32 KiB.");
  let parsed; try { parsed = JSON.parse(text); } catch { throw new Error("This is not a valid caption style file."); }
  if (!parsed || parsed.version !== 1 || !parsed.style || typeof parsed.style !== "object") throw new Error("Choose an AENural caption style file.");
  const style = Object.fromEntries(Object.keys(baseStyle).map(key => [key, parsed.style[key]])) as StudioStyle;
  validateStudioStyle(style); return style;
}
export type StudioMedia = { width: number; height: number; duration: number; audioTracks: number; videoCodec: string; audioCodec: string | null };
export function validateStudioFile(file: Pick<File, "size" | "name" | "type">) {
  if (!file.size) throw new Error("This video is empty.");
  if (file.size > STUDIO_LIMITS.bytes) throw new Error("Choose a video smaller than 200 MiB.");
  if (!/\.(mp4|mov|webm)$/i.test(file.name) || (file.type && !/^(video\/|application\/octet-stream$)/.test(file.type))) throw new Error("Choose an MP4, MOV or WebM video. Codec support is checked on your device.");
}
export function validateStudioMedia(media: StudioMedia) {
  if (![media.width, media.height, media.duration].every(Number.isFinite) || media.duration <= 0 || media.width <= 0 || media.height <= 0) throw new Error("This video has invalid dimensions or duration.");
  if (media.duration > STUDIO_LIMITS.seconds) throw new Error("This studio currently supports videos up to 2 minutes.");
  if (media.width * media.height > STUDIO_LIMITS.pixels || Math.max(media.width, media.height) > 1920) throw new Error("Choose a video up to 1080p, including portrait video.");
  if (media.audioTracks > 1) throw new Error("Choose a video with one audio track. Multiple audio tracks are not supported yet.");
}
export function studioIssues(document: EditorDocument, duration: number): string[] {
  const issues: string[] = [];
  if (!document.cues.length) issues.push("Import captions or add your first caption.");
  if (document.cues.length > STUDIO_LIMITS.cues) issues.push("Use 500 captions or fewer.");
  const errors = editorExportErrors(document, "vtt");
  if (errors.length) issues.push(`Check text and timing in caption ${errors.slice(0, 5).join(", ")}.`);
  if (document.cues.some(cue => cue.end !== null && cue.end > duration * 1000 + 1)) issues.push("Some captions end after your video. Adjust their timing before video export.");
  if (document.cues.some(cue => cue.text.length > 2000)) issues.push("A caption is too long. Split it before video export.");
  return issues;
}
export function activeStudioCues(document: EditorDocument, time: number) {
  // Seconds-to-milliseconds conversion can put an exact seek a fraction of a
  // nanosecond before its integer cue boundary (e.g. 1.003 * 1000).
  const at = time + 1e-6;
  return document.cues.filter(cue => cue.start !== null && cue.end !== null && cue.start <= at && at < cue.end);
}
export function studioFilename(name: string, extension: string) { return `${name.replace(/\.[^.]+$/, "") || "video"}-captioned.${extension}`; }
// Explicit editor operations only. No words are assigned guessed timestamps:
// the user chooses both the cursor boundary and video playhead for a split.
export function splitStudioCue(document: EditorDocument, id: string, at: number, cursor: number, newId: string): EditorDocument {
  const index = document.cues.findIndex(cue => cue.id === id), cue = document.cues[index];
  if (!cue || cue.start === null || cue.end === null || !Number.isFinite(at) || at <= cue.start || at >= cue.end) throw new Error("Place the playhead inside this caption before splitting.");
  const boundaries = new Set([...new Intl.Segmenter(undefined, { granularity: "word" }).segment(cue.text)].map(part => part.index));
  const left = cue.text.slice(0, cursor).trimEnd(), right = cue.text.slice(cursor).trimStart();
  if (!Number.isInteger(cursor) || !boundaries.has(cursor) || !left || !right) throw new Error("Place the text cursor between words where you want the caption to split.");
  const cues = [...document.cues]; cues.splice(index, 1, { ...cue, text: left, end: at, endDraft: undefined }, { ...cue, id: newId, text: right, start: at, startDraft: undefined, endDraft: undefined, identifier: "" });
  return { ...document, cues };
}
export function mergeStudioCue(document: EditorDocument, id: string): EditorDocument {
  const index = document.cues.findIndex(cue => cue.id === id), cue = document.cues[index], next = document.cues[index + 1];
  if (!cue || !next || cue.start === null || cue.end === null || next.start === null || next.end === null) throw new Error("Select a caption with a valid next caption to merge.");
  const cues = [...document.cues]; cues.splice(index, 2, { ...cue, start: Math.min(cue.start, next.start), end: Math.max(cue.end, next.end), text: `${cue.text}\n${next.text}`, startDraft: undefined, endDraft: undefined });
  return { ...document, cues };
}
export function studioFont(style: StudioStyle): string {
  return !["Inter", "Sora"].includes(style.font) ? `"${style.font}", ${style.font === "Courier New" ? "monospace" : ["Georgia", "Times New Roman"].includes(style.font) ? "serif" : "sans-serif"}` : getComputedStyle(document.documentElement).getPropertyValue(style.font === "Sora" ? "--font-heading" : "--font-platform").trim() || "Arial, sans-serif";
}

// The preview and exporter call this same painter at original video dimensions.
// Captions are drawn as text, never interpreted as HTML. Time is in milliseconds.
export function paintStudioCaptions(ctx: CanvasRenderingContext2D, width: number, height: number, document: EditorDocument, time: number, style: StudioStyle, font: string, reducedMotion: boolean) {
  const active = activeStudioCues(document, time);
  if (!active.length) return;
  const original = active.map(cue => plainCaption(cue.text)).join("\n");
  const text = style.textCase === "upper" ? original.toLocaleUpperCase() : style.textCase === "lower" ? original.toLocaleLowerCase() : original;
  const base = Math.min(width, height), minimum = Math.max(10, base * .025);
  let size = Math.max(minimum, base * style.size / 100), lines: string[] = [];
  ctx.save();
  try {
    for (; size >= minimum; size -= 1) {
      ctx.font = `${style.weight} ${size}px ${font}`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${size * style.letterSpacing / 100}px`;
      else if (style.letterSpacing) throw new Error("Letter spacing is not supported by this browser's video canvas.");
      if ("wordSpacing" in ctx) ctx.wordSpacing = `${size * style.wordSpacing / 100}px`;
      else if (style.wordSpacing) throw new Error("Word spacing is not supported by this browser's video canvas.");
      lines = wrapCaption(text, width * style.maxWidth / 100 - size * style.paddingX / 50, value => ctx.measureText(value).width);
      if (lines.length <= style.maxLines || !style.fit) break;
    }
    if (size < minimum || lines.length > style.maxLines) throw new Error(`This caption cannot fit in ${style.maxLines} readable lines. Shorten or split it, or adjust text size and layout.`);
    const elapsed = Math.max(0, (time - Math.min(...active.map(c => c.start!))) / 1000);
    const motion = reducedMotion ? 1 : Math.min(1, elapsed / (style.motionDuration / 1000));
    const scale = style.animation === "pop" ? .94 + .06 * Math.sin(motion * Math.PI / 2) : 1;
    ctx.globalAlpha = style.opacity * (style.animation === "fade" || style.animation === "rise" ? motion : 1);
    const lineHeight = size * style.lineHeight, widest = Math.max(...lines.map(line => ctx.measureText(line).width));
    const boxWidth = widest + size * style.paddingX / 50, boxHeight = lineHeight * lines.length + size * style.paddingY / 50;
    const angle = style.rotation * Math.PI / 180, boundWidth = Math.abs(boxWidth * Math.cos(angle)) + Math.abs(boxHeight * Math.sin(angle)), boundHeight = Math.abs(boxWidth * Math.sin(angle)) + Math.abs(boxHeight * Math.cos(angle));
    const margin = base * .03;
    if (boundWidth > width - margin * 2 || boundHeight > height - margin * 2) throw new Error("This layout extends beyond the video. Reduce size, padding or rotation.");
    const x = margin + boundWidth / 2 + (width - margin * 2 - boundWidth) * style.x / 100;
    const y = Math.min(height - margin - boundHeight / 2, Math.max(margin + boundHeight / 2, height * style.y / 100 + (style.animation === "rise" ? (1 - motion) * size * .6 : 0)));
    ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
    ctx.direction = /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(text.match(/\p{L}/u)?.[0] ?? "") ? "rtl" : "ltr";
    ctx.textAlign = style.align; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    if (style.background) { ctx.fillStyle = style.highlight + Math.round(style.backgroundOpacity * 255).toString(16).padStart(2,"0"); ctx.beginPath(); ctx.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, Math.min(size * style.radius / 100, boxHeight / 2)); ctx.fill(); }
    ctx.shadowColor = style.shadow ? style.shadowColor + Math.round(style.shadowOpacity * 255).toString(16).padStart(2,"0") : "transparent"; ctx.shadowBlur = size * style.shadowBlur / 100; ctx.shadowOffsetX = size * style.shadowX / 100; ctx.shadowOffsetY = size * style.shadowY / 100;
    const textX = style.align === "left" ? -widest / 2 : style.align === "right" ? widest / 2 : 0;
    lines.forEach((line, index) => {
      const y = (index - (lines.length - 1) / 2) * lineHeight;
      if (style.outline) { ctx.strokeStyle = style.outlineColor; ctx.lineWidth = size * style.outline / 100; ctx.strokeText(line, textX, y); }
      ctx.fillStyle = style.color; ctx.fillText(line, textX, y);
    });
  } finally { ctx.restore(); }
}
