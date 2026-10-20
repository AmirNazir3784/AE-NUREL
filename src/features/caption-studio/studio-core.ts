import { editorExportErrors, type EditorDocument } from "../../lib/subtitle-editor.ts";
import { plainCaption } from "../../lib/subtitle-conversion.ts";
import { wrapCaption } from "../../lib/subtitle-video.ts";
import { studioWordSpans, type StudioAlignment } from "./studio-alignment.ts";
import { measureStudioTextRange, drawStudioHighlightedLine, drawStudioWordBackground, type StudioRangeMeasurer } from "./studio-text-ranges.ts";
import { STUDIO_ANIMATIONS, studioMotionFrame, type StudioAnimation } from "./studio-motion.ts";

export const STUDIO_LIMITS = { bytes: 200 * 1024 ** 2, seconds: 120, pixels: 1920 * 1080, cues: 500, outputBytes: 256 * 1024 ** 2 } as const;
// Inter/Sora are bundled. Other fonts rely on locally installed device fonts.
export const STUDIO_FONTS = ["Inter", "Sora", "Arial", "Georgia", "Times New Roman", "Verdana", "Courier New", "Trebuchet MS", "Segoe UI", "Tahoma", "Impact", "Arial Black", "Palatino Linotype", "Cambria", "Consolas", "Franklin Gothic Medium", "Anton", "Bebas Neue", "Oswald", "Playfair Display", "DM Sans"] as const;
export type StudioStyle = {
  preset: string; font: typeof STUDIO_FONTS[number]; size: number; weight: number;
  color: string; opacity: number; highlight: string; background: boolean; backgroundOpacity: number; paddingX: number; paddingY: number; radius: number;
  outline: number; outlineColor: string; shadow: boolean; shadowColor: string; shadowOpacity: number; shadowBlur: number; shadowX: number; shadowY: number;
  position: "top" | "middle" | "bottom" | "custom"; x: number; y: number; rotation: number; align: "left" | "center" | "right";
  maxWidth: number; maxLines: number; lineHeight: number; letterSpacing: number; wordSpacing: number; fit: boolean; textCase: "original" | "upper" | "lower";
  animation: StudioAnimation; motionDuration: number;
  wordHighlight: boolean; wordColor: string; wordBackground: boolean; wordBackgroundColor: string; wordBackgroundOpacity: number;
  italic: boolean; underline: boolean; strikethrough: boolean;
};
const baseStyle: StudioStyle = { preset: "Clean", font: "Inter", size: 4.8, weight: 600, color: "#ffffff", opacity: 1, highlight: "#187e70", background: false, backgroundOpacity: .95, paddingX: 40, paddingY: 10, radius: 18, outline: 0, outlineColor: "#101716", shadow: true, shadowColor: "#000000", shadowOpacity: .7, shadowBlur: 14, shadowX: 0, shadowY: 4, position: "bottom", x: 50, y: 84, rotation: 0, align: "center", maxWidth: 86, maxLines: 2, lineHeight: 1.3, letterSpacing: 0, wordSpacing: 0, fit: true, textCase: "original", animation: "none", motionDuration: 180, wordHighlight: false, wordColor: "#ffae58", wordBackground: false, wordBackgroundColor: "#243f36", wordBackgroundOpacity: .9, italic: false, underline: false, strikethrough: false };
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
  preset("Broadcast", { font: "Arial", weight: 700, background: true, highlight: "#154a68", radius: 0, align: "left", x: 50, maxWidth: 78 }),
  preset("Lift", { font: "Sora", weight: 700, size: 5.4, animation: "rise", motionDuration: 300, outline: 3 }),
  preset("Creator", { font: "Sora", weight: 800, size: 5.7, background: true, highlight: "#242a45", backgroundOpacity: .85, radius: 14, paddingX: 38, paddingY: 20 }),
  preset("Studio", { font: "Inter", weight: 750, size: 5.1, background: true, highlight: "#152a26", backgroundOpacity: .82, radius: 20, paddingX: 55, paddingY: 26, shadow: false }),
  preset("Headline", { font: "Arial Black", weight: 900, size: 5.7, outline: 3, outlineColor: "#1b2020", textCase: "upper", lineHeight: 1.12 }),
  preset("Documentary", { font: "Georgia", weight: 500, size: 4.8, background: true, highlight: "#15201e", backgroundOpacity: .8, radius: 10, paddingX: 45, paddingY: 22, shadow: false }),
  preset("Podcast", { font: "Trebuchet MS", weight: 700, size: 5.3, background: true, highlight: "#30314b", backgroundOpacity: .86, radius: 12, paddingX: 40 }),
  preset("Signal", { font: "Sora", weight: 800, size: 5.4, color: "#fff9e8", background: true, highlight: "#95500f", radius: 12, shadow: false, textCase: "upper" }),
  preset("Slate", { font: "Segoe UI", weight: 700, size: 5.2, color: "#f4f7ff", background: true, highlight: "#263c51", radius: 22, paddingX: 50, paddingY: 24 }),
  preset("Pulse", { font: "Inter", weight: 800, size: 5.4, color: "#9fffe5", outline: 3, outlineColor: "#123e37", shadowColor: "#20ab8b", shadowBlur: 30 }),
  preset("Atlas", { font: "Impact", weight: 800, size: 6.3, textCase: "upper", letterSpacing: 1.5, outline: 6, outlineColor: "#15201f", lineHeight: 1.15 }),
  preset("Gold Serif", { font: "Palatino Linotype", weight: 700, size: 5.2, color: "#fbe7b3", background: true, highlight: "#2b2520", backgroundOpacity: .84, radius: 8, paddingX: 55, paddingY: 30, shadow: false }),
  preset("Viral Bold", { font: "Anton", weight: 400, size: 6.1, textCase: "upper", outline: 6, outlineColor: "#101716", shadow: true, lineHeight: 1.13, animation: "pop", motionDuration: 420 }),
  preset("Modern Clean", { font: "DM Sans", weight: 700, size: 5.2, background: true, highlight: "#1a3040", backgroundOpacity: .88, radius: 14, paddingX: 48, paddingY: 25, animation: "rise", motionDuration: 420 }),
  preset("Film Title", { font: "Bebas Neue", weight: 400, size: 7.0, textCase: "upper", letterSpacing: 3, outline: 2, shadow: true, lineHeight: 1.1, animation: "zoom-in", motionDuration: 520 }),
  preset("Luxe Serif", { font: "Playfair Display", weight: 600, italic: true, size: 5.1, background: true, highlight: "#322326", color: "#fff0e8", radius: 9, paddingX: 58, paddingY: 30, shadow: false, animation: "fade", motionDuration: 600 }),
  preset("News Condensed", { font: "Oswald", weight: 650, size: 5.5, background: true, highlight: "#17415d", color: "#ffffff", radius: 6, textCase: "upper", paddingX: 48, paddingY: 18, animation: "slide-left", motionDuration: 360 }),
];
export function studioPlacement(style: StudioStyle, position: StudioStyle["position"]): StudioStyle {
  if (position === "custom") return { ...style, position };
  return { ...style, position, x: 50, y: { top: 18, middle: 50, bottom: 84 }[position] };
}
export function validateStudioStyle(style: StudioStyle) {
  if (!style || typeof style.preset !== "string" || style.preset.length > 40 || !["top", "middle", "bottom", "custom"].includes(style.position) || [style.background, style.shadow, style.fit, style.wordHighlight, style.wordBackground, style.italic, style.underline, style.strikethrough].some(value => typeof value !== "boolean")) throw new Error("This caption style is not valid.");
  if (!STUDIO_FONTS.includes(style.font) || !["left", "center", "right"].includes(style.align) || !STUDIO_ANIMATIONS.some(([value]) => value === style.animation) || !["original", "upper", "lower"].includes(style.textCase)) throw new Error("Choose supported caption style settings.");
  for (const color of [style.color, style.highlight, style.outlineColor, style.shadowColor, style.wordColor, style.wordBackgroundColor]) if (!/^#[\da-f]{6}$/i.test(color)) throw new Error("Use a valid caption color.");
  const ranges: [number, number, number][] = [[style.size,2.5,12],[style.weight,100,900],[style.wordBackgroundOpacity,0,1],[style.opacity,.1,1],[style.backgroundOpacity,.05,1],[style.paddingX,0,100],[style.paddingY,0,100],[style.radius,0,100],[style.outline,0,20],[style.shadowOpacity,0,1],[style.shadowBlur,0,100],[style.shadowX,-50,50],[style.shadowY,-50,50],[style.x,0,100],[style.y,0,100],[style.rotation,-20,20],[style.maxWidth,40,94],[style.maxLines,1,4],[style.lineHeight,1,1.8],[style.letterSpacing,-2,12],[style.wordSpacing,-2,20],[style.motionDuration,80,1000]];
  if (ranges.some(([value,min,max]) => !Number.isFinite(value) || value < min || value > max) || !Number.isInteger(style.maxLines)) throw new Error("A caption style value is outside its supported range.");
}
export function parseStudioStyle(text: string): StudioStyle {
  if (text.length > 32_768) throw new Error("Choose a style file smaller than 32 KiB.");
  let parsed; try { parsed = JSON.parse(text); } catch { throw new Error("This is not a valid caption style file."); }
  if (!parsed || parsed.version !== 1 || !parsed.style || typeof parsed.style !== "object") throw new Error("Choose an AENural caption style file.");
  const style = Object.fromEntries(Object.keys(baseStyle).map(key => [key, Object.hasOwn(parsed.style, key) ? parsed.style[key] : key === "wordHighlight" || key === "wordColor" || key === "wordBackground" || key === "wordBackgroundColor" || key === "wordBackgroundOpacity" || key === "italic" || key === "underline" || key === "strikethrough" ? baseStyle[key] : undefined])) as StudioStyle;
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
  return !["Inter", "Sora"].includes(style.font) ? `"${style.font}", ${["Courier New", "Consolas"].includes(style.font) ? "monospace" : ["Georgia", "Times New Roman", "Palatino Linotype", "Cambria", "Playfair Display"].includes(style.font) ? "serif" : "sans-serif"}` : getComputedStyle(document.documentElement).getPropertyValue(style.font === "Sora" ? "--font-heading" : "--font-platform").trim() || "Arial, sans-serif";
}

// The preview and exporter call this same painter at original video dimensions.
// Captions are drawn as text, never interpreted as HTML. Time is in milliseconds.
export function paintStudioCaptions(ctx: CanvasRenderingContext2D, width: number, height: number, document: EditorDocument, time: number, style: StudioStyle, font: string, reducedMotion: boolean, alignment: StudioAlignment = [], measureRange: StudioRangeMeasurer = measureStudioTextRange) {
  const active = activeStudioCues(document, time);
  if (!active.length) return;
  const original = active.map(cue => plainCaption(cue.text)).join("\n");
  const transform = (value: string) => style.textCase === "upper" ? value.toLocaleUpperCase() : style.textCase === "lower" ? value.toLocaleLowerCase() : value;
  const text = transform(original);
  const highlights = style.wordHighlight ? studioWordSpans(active, alignment, time).map(span => ({ from: transform(original.slice(0, span.from)).length, to: transform(original.slice(0, span.to)).length })) : [];
  const base = Math.min(width, height), minimum = Math.max(10, base * .025);
  let size = Math.max(minimum, base * style.size / 100), lines: string[] = [];
  ctx.save();
  try {
    for (; size >= minimum; size -= 1) {
      ctx.font = `${style.italic ? "italic " : ""}${style.weight} ${size}px ${font}`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${size * style.letterSpacing / 100}px`;
      else if (style.letterSpacing) throw new Error("Letter spacing is not supported by this browser's video canvas.");
      if ("wordSpacing" in ctx) ctx.wordSpacing = `${size * style.wordSpacing / 100}px`;
      else if (style.wordSpacing) throw new Error("Word spacing is not supported by this browser's video canvas.");
      lines = wrapCaption(text, width * style.maxWidth / 100 - size * style.paddingX / 50, value => ctx.measureText(value).width);
      if (lines.length <= style.maxLines || !style.fit) break;
    }
    if (size < minimum || lines.length > style.maxLines) throw new Error(`This caption cannot fit in ${style.maxLines} readable lines. Shorten or split it, or adjust text size and layout.`);
    const elapsedMs = Math.max(0, time - Math.min(...active.map(c => c.start!)));
    const motion = studioMotionFrame(style.animation, elapsedMs, style.motionDuration, reducedMotion);
    ctx.globalAlpha = style.opacity * motion.opacity;
    const lineHeight = size * style.lineHeight, widest = Math.max(...lines.map(line => ctx.measureText(line).width));
    const boxWidth = widest + size * style.paddingX / 50, boxHeight = lineHeight * lines.length + size * style.paddingY / 50;
    const angle = style.rotation * Math.PI / 180, boundWidth = Math.abs(boxWidth * Math.cos(angle)) + Math.abs(boxHeight * Math.sin(angle)), boundHeight = Math.abs(boxWidth * Math.sin(angle)) + Math.abs(boxHeight * Math.cos(angle));
    const margin = base * .03;
    if (boundWidth > width - margin * 2 || boundHeight > height - margin * 2) throw new Error("This layout extends beyond the video. Reduce size, padding or rotation.");
    const x = margin + boundWidth / 2 + (width - margin * 2 - boundWidth) * style.x / 100;
    const y = Math.min(height - margin - boundHeight / 2, Math.max(margin + boundHeight / 2, height * style.y / 100));
    ctx.translate(x + motion.x * size, y + motion.y * size);
    ctx.rotate(angle + motion.rotation);
    ctx.scale(motion.scale, motion.scale);
    if (motion.blur) ctx.filter = `blur(${(motion.blur * size).toFixed(2)}px)`;
    ctx.direction = /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(text.match(/\p{L}/u)?.[0] ?? "") ? "rtl" : "ltr";
    const effectProgress = reducedMotion ? 1 : Math.min(1, elapsedMs / style.motionDuration);
    // True progressive reveal of the entire composed caption (including
    // background), using a clip rather than shortening source text or timing.
    if (style.animation === "typewriter" && effectProgress < 1) {
      ctx.beginPath();
      const revealed = boxWidth * Math.max(0, effectProgress);
      ctx.rect(ctx.direction === "rtl" ? boxWidth / 2 - revealed : -boxWidth / 2, -boxHeight / 2, revealed, boxHeight);
      ctx.clip();
    }
    ctx.textAlign = style.align; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    if (style.background) { ctx.fillStyle = style.highlight + Math.round(style.backgroundOpacity * 255).toString(16).padStart(2,"0"); ctx.beginPath(); ctx.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, Math.min(size * style.radius / 100, boxHeight / 2)); ctx.fill(); }
    ctx.shadowColor = style.shadow ? style.shadowColor + Math.round(style.shadowOpacity * 255).toString(16).padStart(2,"0") : "transparent"; ctx.shadowBlur = size * style.shadowBlur / 100; ctx.shadowOffsetX = size * style.shadowX / 100; ctx.shadowOffsetY = size * style.shadowY / 100;
    const textX = style.align === "left" ? -widest / 2 : style.align === "right" ? widest / 2 : 0;
    let scan = 0;
    lines.forEach((line, index) => {
      const y = (index - (lines.length - 1) / 2) * lineHeight;
      const begin = text.indexOf(line, scan), end = begin + line.length; scan = begin < 0 ? text.length : end;
      const ranges = begin < 0 ? [] : highlights.filter(span => span.from < end && span.to > begin).flatMap(span => measureRange(ctx, line, Math.max(0, span.from - begin), Math.min(line.length, span.to - begin)));
      // Draw only the measured active glyph ranges, before the outline and
      // the fully-shaped text. Preview and encoded frames share this painter.
      if (style.wordHighlight && style.wordBackground && ranges.length) {
        const lineWidth = ctx.measureText(line).width;
        const left = textX - (style.align === "center" ? lineWidth / 2 : style.align === "right" ? lineWidth : 0);
        drawStudioWordBackground(ctx, left, y, size, lineHeight, style.wordBackgroundColor, ranges, style.wordBackgroundOpacity);
      }
      // Chromatic ghosting draws shaped full lines; no word-width guesses,
      // strobing, or edits to cue text. It settles before the caption ends.
      if (!reducedMotion && (style.animation === "glitch" || style.animation === "rgb-split") && effectProgress < .65) {
        const displacement = (1 - effectProgress / .65) * size * (style.animation === "glitch" ? .14 : .075);
        const side = style.animation === "glitch" && effectProgress > .22 && effectProgress < .43 ? -1 : 1;
        ctx.save();
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
        ctx.globalAlpha = style.opacity * motion.opacity * Math.min(.55, 1 - effectProgress);
        ctx.fillStyle = "#ff4a89"; ctx.fillText(line, textX + displacement * side, y);
        ctx.fillStyle = "#42edff"; ctx.fillText(line, textX - displacement * side, y);
        ctx.restore();
      }
      if (style.outline) { ctx.strokeStyle = style.outlineColor; ctx.lineWidth = size * style.outline / 100; ctx.strokeText(line, textX, y); }
      if (begin < 0 || !ranges.length) { ctx.fillStyle = style.color; ctx.fillText(line, textX, y); }
      else {
        const lineWidth = ctx.measureText(line).width, left = textX - (style.align === "center" ? lineWidth / 2 : style.align === "right" ? lineWidth : 0);
        drawStudioHighlightedLine(ctx, line, left, y, size, lineHeight, style.color, style.wordColor, ranges);
      }
      if (style.underline || style.strikethrough) {
        const lineWidth = ctx.measureText(line).width;
        const left = textX - (style.align === "center" ? lineWidth / 2 : style.align === "right" ? lineWidth : 0);
        ctx.save();
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
        ctx.fillStyle = style.color;
        const thickness = Math.max(1, size * .045);
        if (style.underline) ctx.fillRect(left, y + size * .38, lineWidth, thickness);
        if (style.strikethrough) ctx.fillRect(left, y - size * .08, lineWidth, thickness);
        ctx.restore();
      }
    });
  } finally { ctx.restore(); }
}
