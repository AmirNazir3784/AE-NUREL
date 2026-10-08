export const MAX_TIMESTAMP_MS = 359_999_999;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type SrtCue = {
  number: string;
  start: number;
  end: number;
  text: string;
  startPosition: number;
  endPosition: number;
};

export type SrtDocument = { source: string; cues: SrtCue[] };
export type ShiftResult = { content: string; clampedCues: number };

const timestampPattern = "\\d{2}:\\d{2}:\\d{2},\\d{3}";
const timingPattern = new RegExp(
  `^([ \\t]*)(${timestampPattern})([ \\t]+-->[ \\t]+)(${timestampPattern})([ \\t]*(?:X1:\\d+[ \\t]+X2:\\d+[ \\t]+Y1:\\d+[ \\t]+Y2:\\d+[ \\t]*)?)$`,
);

export function parseTimestamp(value: string): number {
  const match = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/.exec(value);
  if (!match || Number(match[2]) > 59 || Number(match[3]) > 59) {
    throw new Error("A timestamp is invalid. SRT times must look like 00:01:23,456.");
  }
  return Number(match[1]) * 3_600_000 + Number(match[2]) * 60_000 + Number(match[3]) * 1000 + Number(match[4]);
}

export function formatTimestamp(milliseconds: number): string {
  if (!Number.isInteger(milliseconds) || milliseconds < 0 || milliseconds > MAX_TIMESTAMP_MS) {
    throw new Error("The adjusted time is too large. Use a smaller timing offset.");
  }
  const pad = (value: number, length = 2) => String(value).padStart(length, "0");
  return `${pad(Math.floor(milliseconds / 3_600_000))}:${pad(Math.floor(milliseconds / 60_000) % 60)}:${pad(Math.floor(milliseconds / 1000) % 60)},${pad(milliseconds % 1000, 3)}`;
}

export function parseSrt(source: string): SrtDocument {
  if (!source.replace(/^\uFEFF/, "").trim()) throw new Error("This file is empty. Choose an SRT file with subtitles in it.");
  if (source.includes("\0")) throw new Error("This file could not be read as text. Save it as UTF-8 SRT and try again.");

  // Keep character positions in the original source so only timestamp characters change.
  // This also preserves mixed line endings, spacing, numbering, and subtitle markup.
  const lines = Array.from(source.matchAll(/([^\r\n]*)(\r\n|\r|\n|$)/g))
    .filter((match) => match[0].length > 0)
    .map((match) => ({ text: match[1], position: match.index }));
  const cues: SrtCue[] = [];
  let index = 0;
  while (index < lines.length) {
    if (!lines[index].text.replace(/^\uFEFF/, "").trim()) { index++; continue; }
    const number = lines[index].text.replace(/^\uFEFF/, "").trim();
    if (!/^\d+$/.test(number)) {
      throw new Error(cues.length === 0
        ? "No valid subtitles found. Choose an SRT file with numbered cues and timestamp lines."
        : `The subtitle after cue ${cues[cues.length - 1].number} is missing a valid cue number. Check the file and try again.`);
    }
    const timingLine = lines[index + 1];
    const timing = timingLine && timingPattern.exec(timingLine.text);
    if (!timing) throw new Error(`Cue ${number} has an invalid timestamp line. Use times like 00:00:01,000 --> 00:00:03,000.`);
    let start: number, end: number;
    try { start = parseTimestamp(timing[2]); end = parseTimestamp(timing[4]); }
    catch { throw new Error(`Cue ${number} has an invalid time. Minutes and seconds must be between 00 and 59.`); }
    if (end < start) throw new Error(`Cue ${number} ends before it starts. Correct its timestamps and try again.`);
    const textStart = index + 2;
    index = textStart;
    while (index < lines.length && lines[index].text.trim()) {
      if (/^\d+$/.test(lines[index].text.trim()) && lines[index + 1]?.text.includes("-->")) {
        throw new Error(`A blank line is missing between cues near line ${index + 1}. Add it and try again.`);
      }
      index++;
    }
    if (index === textStart) throw new Error(`Cue ${number} has no subtitle text. Check the file and try again.`);
    cues.push({
      number, start, end,
      text: lines.slice(textStart, index).map((line) => line.text).join("\n"),
      startPosition: timingLine.position + timing[1].length,
      endPosition: timingLine.position + timing[1].length + timing[2].length + timing[3].length,
    });
  }
  if (!cues.length) throw new Error("No valid subtitles found. Choose an SRT file with numbered cues and timestamp lines.");
  return { source, cues };
}

export function parseOffset(value: string): number {
  const normalized = value.trim();
  if (!/^[+-]?(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(normalized)) {
    throw new Error("Enter a number of seconds, like 1.25 or -2.5. Use up to three decimal places.");
  }
  const milliseconds = Math.round(Number(normalized) * 1000);
  if (!Number.isSafeInteger(milliseconds) || Math.abs(milliseconds) > MAX_TIMESTAMP_MS) {
    throw new Error("That offset is too large. Enter a value between -359999.999 and 359999.999 seconds.");
  }
  return milliseconds;
}

export function adjustCue(cue: SrtCue, offset: number) {
  const start = Math.max(0, cue.start + offset);
  const end = Math.max(0, cue.end + offset);
  if (end > MAX_TIMESTAMP_MS) throw new Error("This offset would move subtitles past 99:59:59,999. Use a smaller positive offset.");
  return { start, end, clamped: cue.start + offset < 0 || cue.end + offset < 0 };
}

export function shiftSrt(document: SrtDocument, offset: number): ShiftResult {
  if (!Number.isSafeInteger(offset) || Math.abs(offset) > MAX_TIMESTAMP_MS) throw new Error("Enter a valid timing offset within the supported range.");
  let cursor = 0;
  let clampedCues = 0;
  const parts: string[] = [];
  for (const cue of document.cues) {
    const adjusted = adjustCue(cue, offset);
    if (adjusted.clamped) clampedCues++;
    parts.push(document.source.slice(cursor, cue.startPosition), formatTimestamp(adjusted.start));
    cursor = cue.startPosition + 12;
    parts.push(document.source.slice(cursor, cue.endPosition), formatTimestamp(adjusted.end));
    cursor = cue.endPosition + 12;
  }
  parts.push(document.source.slice(cursor));
  return { content: parts.join(""), clampedCues };
}

export function adjustedFilename(filename: string, offset: number): string {
  const stem = filename.replace(/\.srt$/i, "");
  const suffix = offset === 0 ? "adjusted" : `${offset > 0 ? "later" : "earlier"}-${Math.abs(offset) / 1000}s`;
  return `${stem}-${suffix}.srt`;
}

export function validateSrtFile(file: Pick<File, "name" | "size">): void {
  if (!/\.srt$/i.test(file.name)) throw new Error("Choose an .srt subtitle file. Other file types are not supported.");
  if (file.size === 0) throw new Error("This file is empty. Choose an SRT file with subtitles in it.");
  if (file.size > MAX_FILE_BYTES) throw new Error("This file is too large. Choose an SRT file smaller than 10 MB.");
}

export function decodeSrt(bytes: ArrayBuffer): string {
  const prefix = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 2));
  const encoding = prefix[0] === 0xff && prefix[1] === 0xfe ? "utf-16le"
    : prefix[0] === 0xfe && prefix[1] === 0xff ? "utf-16be" : "utf-8";
  try { return new TextDecoder(encoding, { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { throw new Error("This file uses an unsupported text encoding. Save it as UTF-8 SRT and try again."); }
}
