import { decodeSrt, formatTimestamp, MAX_TIMESTAMP_MS, parseSrt, validateSrtFile, type SrtCue, type SrtDocument } from "./srt.ts";

export const MAX_SPLIT_PARTS = 100;
export type SplitMethod = "parts" | "cues" | "time";
export type TimestampMode = "original" | "zero";
export type SplitOptions = { method: SplitMethod; value: string; timestamps: TimestampMode };
export type SplitCue = { start: number; end: number; text: string; settings: string };
export type SplitPart = { number: number; filename: string; cues: SplitCue[]; start: number; end: number; boundary: number; content: string };
export type SplitResult = { sourceName: string; cueCount: number; timeline: number; parts: SplitPart[]; options: SplitOptions; skippedWindows: number };

export function parseSplitSource(file: Pick<File, "name" | "size">, bytes: ArrayBuffer): SrtDocument {
  try { validateSrtFile(file); return parseSrt(decodeSrt(bytes)); }
  catch (error) { throw new Error(`${file.name}: ${error instanceof Error ? error.message : "This file could not be read. Choose it again."}`); }
}

export function parseSplitValue(method: SplitMethod, value: string): number {
  const normalized = value.trim();
  if (method === "time") {
    if (!/^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(normalized)) throw new Error("Enter a positive number of minutes, like 10 or 0.5. Use up to three decimal places.");
    const milliseconds = Math.round(Number(normalized) * 60_000);
    if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0 || milliseconds > MAX_TIMESTAMP_MS) throw new Error("Choose an interval above 0 and no longer than 5999.999 minutes.");
    return milliseconds;
  }
  if (method !== "parts" && method !== "cues") throw new Error("Choose one of the three split methods.");
  if (!/^\d+$/.test(normalized) || !Number.isSafeInteger(Number(normalized))) throw new Error(`Enter a whole number of ${method === "parts" ? "parts" : "cues"}. Decimals are not supported here.`);
  const count = Number(normalized);
  if (method === "parts" && (count < 2 || count > MAX_SPLIT_PARTS)) throw new Error("Choose between 2 and 100 parts.");
  if (method === "cues" && (count < 1 || count > 1_000_000)) throw new Error("Choose between 1 and 1,000,000 cues per file.");
  return count;
}

export function splitFilename(sourceName: string, number: number, total: number): string {
  // ZIP paths must be filenames, even if a caller supplies a path-like name.
  const stem = sourceName.replace(/^.*[\\/]/, "").replace(/\.srt$/i, "").replace(/[\u0000-\u001f]/g, "").trim() || "subtitles";
  return `${stem}-part-${String(number).padStart(Math.max(2, String(total).length), "0")}.srt`;
}

export function serializeSplitPart(cues: readonly SplitCue[], lineEnding: "\n" | "\r\n"): string {
  return cues.map((cue, index) => [String(index + 1), `${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}${cue.settings ? ` ${cue.settings}` : ""}`, cue.text.replace(/\n/g, lineEnding)].join(lineEnding)).join(lineEnding + lineEnding) + lineEnding;
}

export function splitSrt(document: SrtDocument, sourceName: string, options: SplitOptions): SplitResult {
  if (document.cues.length < 2) throw new Error("This file has only one subtitle cue. You need at least two cues to make two non-empty parts.");
  if (options.timestamps !== "original" && options.timestamps !== "zero") throw new Error("Choose how output timestamps should be handled.");
  const value = parseSplitValue(options.method, options.value);
  const groups: { cues: SrtCue[]; boundary: number }[] = [];
  let skippedWindows = 0;
  if (options.method === "parts") {
    if (value > document.cues.length) throw new Error(`This file has ${document.cues.length} cues. Choose no more than ${document.cues.length} parts.`);
    const base = Math.floor(document.cues.length / value), extra = document.cues.length % value;
    let cursor = 0;
    for (let index = 0; index < value; index++) {
      const size = base + (index < extra ? 1 : 0);
      groups.push({ cues: document.cues.slice(cursor, cursor + size), boundary: document.cues[cursor].start });
      cursor += size;
    }
  } else if (options.method === "cues") {
    if (Math.ceil(document.cues.length / value) > MAX_SPLIT_PARTS) throw new Error("That would create more than 100 files. Use more cues per file.");
    for (let cursor = 0; cursor < document.cues.length; cursor += value) groups.push({ cues: document.cues.slice(cursor, cursor + value), boundary: document.cues[cursor].start });
  } else {
    const windows = new Map<number, SrtCue[]>();
    for (const cue of document.cues) {
      // Cues are atomic: START chooses the interval, even when END crosses it.
      const window = Math.floor(cue.start / value);
      if (!windows.has(window)) {
        if (windows.size === MAX_SPLIT_PARTS) throw new Error("That interval would create more than 100 files. Choose a longer interval.");
        windows.set(window, []);
      }
      windows.get(window)!.push(cue);
    }
    const ordered = [...windows.entries()].sort(([a], [b]) => a - b);
    skippedWindows = ordered[ordered.length - 1][0] + 1 - ordered.length;
    // Windows are chronological; cues inside each window retain their source order.
    for (const [window, cues] of ordered) groups.push({ cues, boundary: window * value });
  }
  if (groups.length < 2) throw new Error(options.method === "time" ? "All cues fall in one interval. Choose a shorter interval to make at least two parts." : "That puts every cue in one file. Use fewer cues per file to make at least two parts.");
  const eol = document.source.includes("\r\n") ? "\r\n" : "\n";
  const parts = groups.map((group, index): SplitPart => {
    const offset = options.timestamps === "zero" ? group.boundary : 0;
    const cues = group.cues.map((cue) => {
      if (cue.start < offset) throw new Error("Some cues are out of time order. Keep original timestamps, or use time intervals, to avoid negative times.");
      return { start: cue.start - offset, end: cue.end - offset, text: cue.text, settings: document.source.slice(cue.endPosition + 12).split(/[\r\n]/, 1)[0].trim() };
    });
    return { number: index + 1, filename: splitFilename(sourceName, index + 1, groups.length), cues, start: cues[0].start, end: cues.reduce((max, cue) => Math.max(max, cue.end), 0), boundary: group.boundary, content: serializeSplitPart(cues, eol) };
  });
  return { sourceName, cueCount: document.cues.length, timeline: document.cues.reduce((max, cue) => Math.max(max, cue.end), 0), parts, options: { ...options }, skippedWindows };
}
