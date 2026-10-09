import { conversionFilename, conversionSrt, plainCaption, readConversionFile, type ConversionCue, type ConversionResult } from "./subtitle-conversion.ts";
export const MAX_VIDEO_CUES = 500;
// Conservative release policy, not a WebCodecs/MP4 format limit. Increase only
// after end-to-end encoding, playback and resource checks on longer timelines.
export const MAX_VIDEO_DURATION_MS = 120000;
export function videoTimelineLabel(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000), fraction = ms % 1000;
  return Math.floor(totalSeconds / 60) + ":" + String(totalSeconds % 60).padStart(2, "0") + (fraction ? "." + String(fraction).padStart(3, "0") : "");
}
export type VideoPlan = { cues: ConversionCue[]; durationMs: number; boundaries: number[]; warnings: string[] };
export type VideoSettings = { resolution: "480" | "720"; background: "black" | "white" };
export function videoDimensions(settings: VideoSettings) {
  if (!["480", "720"].includes(settings.resolution) || !["black", "white"].includes(settings.background)) throw new Error("Choose a supported resolution and background.");
  return settings.resolution === "720" ? { width: 1280, height: 720 } : { width: 854, height: 480 };
}
export function prepareSubtitleVideo(text: string): VideoPlan {
  const source = conversionSrt(text);
  if (source.cues.length > MAX_VIDEO_CUES) throw new Error("This SRT contains " + source.cues.length + " cues; the supported maximum is " + MAX_VIDEO_CUES + " cues. Split the SRT into smaller files.");
  const durationMs = Math.max(...source.cues.map(cue => cue.end));
  if (durationMs > MAX_VIDEO_DURATION_MS) throw new Error("This SRT timeline ends at " + videoTimelineLabel(durationMs) + "; the supported maximum is " + videoTimelineLabel(MAX_VIDEO_DURATION_MS) + " (2 minutes), measured from zero to the last cue's end, including gaps. Its " + source.cues.length + (source.cues.length === 1 ? " cue is" : " cues are") + " within the " + MAX_VIDEO_CUES + "-cue limit. Split the file into shorter timelines; captions are never shortened or retimed automatically.");
  let formatting = false;
  const cues = source.cues.map((cue, index) => {
    const caption = plainCaption(cue.text).trim();
    if (!caption) throw new Error("Cue " + (index + 1) + " contains no readable subtitle text.");
    if (caption.length > 2000) throw new Error("Cue " + (index + 1) + " has too much text for a caption video. Shorten or split it.");
    formatting ||= caption !== cue.text;
    return { start: cue.start, end: cue.end, text: caption };
  });
  const boundaries = new Set([0, durationMs, ...cues.flatMap(cue => [cue.start, cue.end])]);
  // Keep gaps seekable while retaining exact millisecond cue boundaries.
  for (let ms = 1000; ms < durationMs; ms += 1000) boundaries.add(ms);
  const warnings = ["Creates a silent video containing caption text on a solid background. No original video or audio is included."];
  if (formatting || source.cues.some(cue => text.slice(cue.endPosition + 12).split(/[\r\n]/, 1)[0].trim())) warnings.push("SRT styling and positioning are replaced by the video's readable default style.");
  return { cues, durationMs, boundaries: [...boundaries].sort((a, b) => a - b), warnings };
}
export function activeCaption(plan: VideoPlan, ms: number): string {
  return plan.cues.filter(cue => cue.start <= ms && cue.end > ms).map(cue => cue.text).join("\n");
}
export function wrapCaption(text: string, maxWidth: number, measure: (text: string) => number): string[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return text.split(/\r?\n/).flatMap(paragraph => {
    const lines: string[] = [];
    let line = "";
    for (const word of paragraph.trim().split(/\s+/u).filter(Boolean)) {
      const candidate = line ? line + " " + word : word;
      if (measure(candidate) <= maxWidth) { line = candidate; continue; }
      if (line) { lines.push(line); line = ""; }
      // Long unbroken words/CJK wrap by grapheme, never splitting surrogate pairs.
      for (const { segment } of segmenter.segment(word)) {
        if (line && measure(line + segment) > maxWidth) { lines.push(line); line = ""; }
        if (measure(segment) > maxWidth) throw new Error("A caption character cannot fit the selected output size.");
        line += segment;
      }
    }
    lines.push(line);
    return lines;
  });
}
export function openSrtForMp4(file: Pick<File, "name" | "size">, bytes: ArrayBuffer): ConversionResult {
  return readConversionFile(file, bytes, ["srt"], text => {
    const plan = prepareSubtitleVideo(text);
    return { filename: conversionFilename(file.name, "mp4"), content: text, cueCount: plan.cues.length, warnings: plan.warnings };
  });
}
