import { MAX_TIMESTAMP_MS } from "./srt.ts";
import { editorExportErrors, exportEditor, formatEditorTime, openSubtitle, parseEditorTime, type EditorDocument, type SubtitleFormat } from "./subtitle-editor.ts";

export type SyncPoint = { current: string; correct: string; cueId: string };
export type SyncPoints = readonly [SyncPoint, SyncPoint];
export type SyncField = "first-current" | "first-correct" | "second-current" | "second-correct";
export type SyncTimes = { sourceFirst: number; targetFirst: number; sourceSecond: number; targetSecond: number };
export type SyncResult = { document: EditorDocument; times: SyncTimes; clampedCues: number; significantChange: boolean; samples: number[] };
// A product review prompt, not a scientific limit. Valid outputs remain downloadable.
export const SIGNIFICANT_SYNC_CHANGE = 0.1;

export class SyncValidationError extends Error {
  fields: Partial<Record<SyncField, string>>;
  constructor(message: string, fields: Partial<Record<SyncField, string>> = {}) { super(message); this.name = "SyncValidationError"; this.fields = fields; }
}

export function openSyncSubtitle(file: Pick<File, "name" | "size">, bytes: ArrayBuffer): EditorDocument {
  try {
    const document = openSubtitle(file, bytes);
    const errors = editorExportErrors(document, document.format);
    if (errors.length) throw new Error(`${file.name}: Cue ${errors[0]} needs valid text and an end later than its start${document.format === "vtt" ? ", with cues in start-time order" : ""}. Correct this file in the Subtitle Editor first.`);
    return document;
  } catch (error) {
    throw new Error((error as Error).message.replace("This editor supports", "This tool supports").replace(", or start from scratch", ""));
  }
}

export function initialSyncPoints(document: EditorDocument): [SyncPoint, SyncPoint] {
  if (!document.cues.length) return [{ current: "", correct: "", cueId: "" }, { current: "", correct: "", cueId: "" }];
  let first = document.cues[0], last = first;
  for (const cue of document.cues) { if (cue.start! < first.start!) first = cue; if (cue.start! > last.start!) last = cue; }
  return [
    { current: formatEditorTime(first.start!, document.format), correct: "", cueId: first.id },
    { current: formatEditorTime(last.start! > first.start! ? last.start! : last.end!, document.format), correct: "", cueId: last.start! > first.start! ? last.id : "" },
  ];
}

export function parseSyncPoints(points: SyncPoints, format: SubtitleFormat): SyncTimes {
  const values: number[] = [], fields: Partial<Record<SyncField, string>> = {};
  for (const [index, point] of points.entries()) {
    for (const field of ["current", "correct"] as const) {
      const key: SyncField = `${index === 0 ? "first" : "second"}-${field}`;
      const value = point[field];
      if (!value.trim()) fields[key] = `Enter the ${field === "current" ? "current subtitle" : "correct video"} time for the ${index === 0 ? "first" : "second"} sync point.`;
      else { try { values.push(parseEditorTime(value, format)); } catch { fields[key] = `Use a time like ${formatEditorTime(83456, format)}, from zero to ${formatEditorTime(MAX_TIMESTAMP_MS, format)}.`; } }
    }
  }
  if (Object.keys(fields).length) throw new SyncValidationError("Check the highlighted sync-point times.", fields);
  return { sourceFirst: values[0], targetFirst: values[1], sourceSecond: values[2], targetSecond: values[3] };
}

function validateTimes(times: SyncTimes) {
  if (Object.values(times).some((time) => !Number.isSafeInteger(time) || time < 0 || time > MAX_TIMESTAMP_MS)) throw new SyncValidationError("Enter valid sync-point times from zero to 99:59:59,999.");
  if (times.sourceSecond <= times.sourceFirst) throw new SyncValidationError("Choose a second current subtitle time later than the first. The two times must be different.", { "second-current": "The second subtitle time must be later than the first." });
  if (times.targetSecond <= times.targetFirst) throw new SyncValidationError("The second correct video time must be later than the first. Check both video times.", { "second-correct": "The second video time must be later than the first." });
}

/** Exact rational evaluation avoids precision loss for large millisecond products.
 * Equivalent to scale * time + offset; each timestamp rounds independently to
 * nearest millisecond (positive half-milliseconds round up). No cumulative drift.
 */
export function mapSyncTime(time: number, times: SyncTimes): { time: number; negative: boolean } {
  validateTimes(times);
  if (!Number.isSafeInteger(time) || time < 0 || time > MAX_TIMESTAMP_MS) throw new Error("This subtitle has a timestamp outside the supported timeline.");
  const sourceSpan = BigInt(times.sourceSecond - times.sourceFirst);
  const targetSpan = BigInt(times.targetSecond - times.targetFirst);
  const numerator = BigInt(times.targetFirst) * sourceSpan + BigInt(time - times.sourceFirst) * targetSpan;
  if (numerator < BigInt(0)) return { time: 0, negative: true };
  const rounded = Number((BigInt(2) * numerator + sourceSpan) / (BigInt(2) * sourceSpan));
  if (rounded > MAX_TIMESTAMP_MS) throw new Error("The correction would go beyond 99:59:59,999. Check your sync points or use a smaller correction.");
  return { time: rounded, negative: false };
}

export function fixSubtitleSync(document: EditorDocument, times: SyncTimes): SyncResult {
  validateTimes(times);
  if (!document.cues.length) throw new Error("Upload a subtitle file with at least one cue.");
  let clampedCues = 0;
  const cues = document.cues.map((cue, index) => {
    if (cue.start === null || cue.end === null || cue.end <= cue.start) throw new Error(`Cue ${index + 1} has invalid timing. Correct the source file in the Subtitle Editor first.`);
    let start: ReturnType<typeof mapSyncTime>, end: ReturnType<typeof mapSyncTime>;
    try { start = mapSyncTime(cue.start, times); end = mapSyncTime(cue.end, times); }
    catch (error) { throw new Error(`Cue ${index + 1}: ${(error as Error).message}`); }
    if (end.time <= start.time) throw new Error(`Cue ${index + 1} would have no valid duration${start.negative || end.negative ? " after stopping at 00:00:00,000" : " after rounding"}. Check your sync points. Download is blocked to keep the subtitles valid.`);
    if (start.negative || end.negative) clampedCues++;
    // WebVTT inline timestamp tags are timing metadata, not visible caption text.
    let previousInlineTime = start.time;
    const text = document.format === "vtt" ? cue.text.replace(/<((?:\d{2}:)?\d{2}:\d{2}\.\d{3})>/g, (_, value: string) => {
      const corrected = mapSyncTime(parseEditorTime(value, "vtt"), times).time;
      if (corrected <= previousInlineTime || corrected >= end.time) throw new Error(`Cue ${index + 1} has an inline VTT time that would fall outside its corrected duration. Check your sync points.`);
      previousInlineTime = corrected;
      return `<${formatEditorTime(corrected, "vtt")}>`;
    }) : cue.text;
    return { ...cue, text, start: start.time, end: end.time, startDraft: undefined, endDraft: undefined };
  });
  const fixed = { ...document, cues };
  const errors = editorExportErrors(fixed, fixed.format);
  if (errors.length) throw new Error(`Cue ${errors[0]} cannot be exported safely. Check the source file in the Subtitle Editor.`);
  const ordered = document.cues.map((cue, index) => ({ index, start: cue.start! })).sort((a, b) => a.start - b.start || a.index - b.index);
  const middle = (ordered[0].start + ordered.at(-1)!.start) / 2;
  const middleCue = ordered.reduce((best, cue) => Math.abs(cue.start - middle) < Math.abs(best.start - middle) ? cue : best);
  return { document: fixed, times, clampedCues, significantChange: Math.abs((times.targetSecond - times.targetFirst) - (times.sourceSecond - times.sourceFirst)) > (times.sourceSecond - times.sourceFirst) * SIGNIFICANT_SYNC_CHANGE, samples: [...new Set([ordered[0].index, middleCue.index, ordered.at(-1)!.index])] };
}

export function serializeSyncResult(result: SyncResult): string { return exportEditor(result.document, result.document.format); }
export function syncFilename(document: EditorDocument): string { return `${document.filename.replace(/\.(srt|vtt)$/i, "") || "subtitles"}-fixed.${document.format}`; }
export function correctionLabel(milliseconds: number): string { return `${milliseconds < 0 ? "−" : milliseconds > 0 ? "+" : ""}${(Math.abs(milliseconds) / 1000).toFixed(1)}s`; }
