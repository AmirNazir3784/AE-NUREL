import { decodeSrt, formatTimestamp, MAX_TIMESTAMP_MS, parseOffset, parseSrt, validateSrtFile, type SrtDocument } from "./srt.ts";

export const MAX_MERGE_FILES = 10;
export const MAX_MERGE_BYTES = 50 * 1024 * 1024;
export type MergeSource = { name: string; document: SrtDocument };
export type MergedCue = { number: string; start: number; end: number; text: string; settings: string };
export type MergedPart = { name: string; offset: number; first: MergedCue; last: MergedCue; cueCount: number };
export type MergeResult = { cues: MergedCue[]; parts: MergedPart[]; gap: number; lineEnding: "\n" | "\r\n" };

export function parseMergeGap(value: string): number {
  let milliseconds: number;
  try { milliseconds = parseOffset(value); }
  catch { throw new Error("Enter a gap from 0 to 359999.999 seconds, using up to three decimal places. For example, 0.5."); }
  if (milliseconds < 0) throw new Error("The gap cannot be negative. Enter 0 for no extra gap, or a positive number of seconds.");
  return milliseconds;
}

export function validateMergeSelection(existing: readonly Pick<File, "size">[], incoming: readonly Pick<File, "size">[]): void {
  if (existing.length + incoming.length > MAX_MERGE_FILES) {
    throw new Error("You can merge up to 10 files. No files were added. Choose fewer files or remove a file first.");
  }
  if ([...existing, ...incoming].reduce((sum, file) => sum + file.size, 0) > MAX_MERGE_BYTES) {
    throw new Error("Keep the combined file size under 50 MB. No files were added. Choose smaller files or remove a file first.");
  }
}

export function parseMergeSource(file: Pick<File, "name" | "size">, bytes: ArrayBuffer): MergeSource {
  try {
    validateSrtFile(file);
    return { name: file.name, document: parseSrt(decodeSrt(bytes)) };
  } catch (error) {
    throw new Error(`${file.name}: ${error instanceof Error ? error.message : "This file could not be read. Please choose it again."}`);
  }
}

export function mergeSrt(files: readonly MergeSource[], gap: number): MergeResult {
  if (files.length < 2 || files.length > MAX_MERGE_FILES) throw new Error("Add between 2 and 10 valid SRT files to merge.");
  if (!Number.isSafeInteger(gap) || gap < 0 || gap > MAX_TIMESTAMP_MS) throw new Error("Enter a valid, non-negative gap in seconds.");
  const cues: MergedCue[] = [];
  const parts: MergedPart[] = [];
  let previousEnd = 0;
  for (const [index, file] of files.entries()) {
    if (!file.document.cues.length) throw new Error(`${file.name}: No valid subtitle cues were found.`);
    const offset = index === 0 ? 0 : previousEnd + gap;
    let last: MergedCue | undefined;
    const firstIndex = cues.length;
    for (const cue of file.document.cues) {
      const start = cue.start + offset;
      const end = cue.end + offset;
      if (end > MAX_TIMESTAMP_MS) throw new Error(`${file.name} would go past 99:59:59,999. Use a smaller gap or shorter subtitle files.`);
      // Preserve optional SRT positioning settings as well as caption text.
      const settings = file.document.source.slice(cue.endPosition + 12).split(/[\r\n]/, 1)[0].trim();
      const merged = { number: String(cues.length + 1), start, end, text: cue.text, settings };
      cues.push(merged);
      if (!last || end > last.end) last = merged;
    }
    const part = { name: file.name, offset, first: cues[firstIndex], last: last!, cueCount: cues.length - firstIndex };
    parts.push(part);
    // SRT has no source-video duration. Only the maximum subtitle END is known;
    // retain the next file's original lead-in instead of subtracting its first start.
    previousEnd = part.last.end;
  }
  return { cues, parts, gap, lineEnding: files[0].document.source.includes("\r\n") ? "\r\n" : "\n" };
}

export function serializeMergedSrt(result: MergeResult): string {
  const eol = result.lineEnding;
  return result.cues.map((cue) => [
    cue.number,
    `${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}${cue.settings ? ` ${cue.settings}` : ""}`,
    cue.text.replace(/\n/g, eol),
  ].join(eol)).join(eol + eol) + eol;
}
