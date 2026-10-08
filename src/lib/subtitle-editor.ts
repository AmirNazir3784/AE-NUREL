import { decodeSrt, formatTimestamp, MAX_FILE_BYTES, MAX_TIMESTAMP_MS, parseOffset, parseSrt, parseTimestamp } from "./srt.ts";

export type SubtitleFormat = "srt" | "vtt";
export type EditorCue = { id: string; start: number | null; end: number | null; text: string; startDraft?: string; endDraft?: string; srtSettings: string; vttSettings: string; identifier: string };
export type EditorDocument = { filename: string; format: SubtitleFormat; cues: EditorCue[]; lineEnding: "\n" | "\r\n"; vttHeader: string; vttBlocks: string[] };
export const MAX_EDITOR_CUES = 10_000;
export const EDITOR_PAGE_SIZE = 50;
export const CPS_CAUTION = 17;
export const CPS_FAST = 20;

export function emptyEditor(): EditorDocument { return { filename: "subtitles.srt", format: "srt", cues: [], lineEnding: "\n", vttHeader: "WEBVTT", vttBlocks: [] }; }
export function validateSubtitleFile(file: Pick<File, "name" | "size">) {
  if (!/\.(srt|vtt)$/i.test(file.name)) throw new Error("Choose an .srt or .vtt subtitle file. Other file types are not supported.");
  if (!file.size) throw new Error("This file is empty. Choose a subtitle file with cues in it.");
  if (file.size > MAX_FILE_BYTES) throw new Error("This file is too large. Choose a subtitle file smaller than 10 MB.");
}
export function formatEditorTime(value: number, format: SubtitleFormat) { return formatTimestamp(value).replace(",", format === "vtt" ? "." : ","); }
export function parseEditorTime(value: string, format: SubtitleFormat): number {
  let time = value.trim();
  if (format === "vtt") {
    if (/^\d{2}:\d{2}\.\d{3}$/.test(time)) time = "00:" + time;
    if (!/^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(time)) throw new Error("Use a time like 00:01:23.456, from 00:00:00.000 to 99:59:59.999.");
    time = time.replace(".", ",");
  }
  try { const result = parseTimestamp(time); formatTimestamp(result); return result; }
  catch { throw new Error(`Use a time like ${formatEditorTime(83456, format)}. Minutes and seconds must be 00–59; hours must be 00–99.`); }
}

function validVttSettings(settings: string): boolean {
  const seen = new Set<string>();
  const percentage = (value: string) => /^\d+(?:\.\d+)?%$/.test(value) && Number(value.slice(0, -1)) <= 100;
  return settings.split(/[\t ]+/).every((setting) => {
    const colon = setting.indexOf(":"), key = setting.slice(0, colon), value = setting.slice(colon + 1);
    if (colon < 1 || !value || seen.has(key)) return false;
    seen.add(key);
    if (key === "vertical") return value === "rl" || value === "lr";
    if (key === "align") return ["start", "center", "end", "left", "right"].includes(value);
    if (key === "size") return percentage(value);
    if (key === "region") return !/\s/.test(value);
    const [position, alignment, extra] = value.split(",");
    if (extra !== undefined || alignment === "") return false;
    if (key === "position") return percentage(position) && (!alignment || ["line-left", "center", "line-right", "auto"].includes(alignment));
    if (key === "line") return (position === "auto" || /^-?\d+$/.test(position) || percentage(position)) && (!alignment || ["start", "center", "end"].includes(alignment));
    return false;
  });
}

export function parseVtt(source: string, filename = "subtitles.vtt"): EditorDocument {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?|\n/g, "\n");
  if (!text.trim()) throw new Error("This file is empty. Choose a subtitle file with cues in it.");
  if (text.includes("\0")) throw new Error("This file could not be read as text. Save it as UTF-8 subtitles and try again.");
  const blocks = text.split(/\n(?:[\t ]*\n)+/).filter((block) => block.trim());
  const header = blocks.shift() ?? "";
  if (!/^WEBVTT(?:[ \t][^\n]*)?(?:\n[^\n]*)*$/.test(header) || header.includes("-->")) throw new Error("A VTT file must begin with WEBVTT, followed by a blank line before its cues.");
  const result: EditorDocument = { ...emptyEditor(), filename, format: "vtt", lineEnding: source.includes("\r\n") ? "\r\n" : "\n", vttHeader: header, vttBlocks: [] };
  for (const block of blocks) {
    if (/^NOTE(?:[ \t\n]|$)/.test(block)) { result.vttBlocks.push(block.trimEnd()); continue; }
    if (/^(STYLE|REGION)(?:\n|$)/.test(block)) {
      if (result.cues.length || block.includes("-->")) throw new Error("VTT STYLE and REGION blocks must appear before the first cue.");
      result.vttBlocks.push(block.trimEnd()); continue;
    }
    const lines = block.replace(/\n$/, "").split("\n");
    const timingIndex = lines[0].includes("-->") ? 0 : 1;
    const number = result.cues.length + 1;
    const match = /^(\S+)[ \t]+-->[ \t]+(\S+)(?:[ \t]+(.*))?$/.exec(lines[timingIndex] ?? "");
    if (!match) throw new Error(`Cue ${number} has an invalid VTT timestamp line. Use 00:00:01.000 --> 00:00:03.000.`);
    let start: number, end: number;
    try { start = parseEditorTime(match[1], "vtt"); end = parseEditorTime(match[2], "vtt"); }
    catch { throw new Error(`Cue ${number} has an invalid VTT time. Use HH:MM:SS.mmm (or MM:SS.mmm), with minutes and seconds from 00 to 59.`); }
    if (end < start) throw new Error(`Cue ${number} ends before it starts. Correct its timestamps and try again.`);
    const settings = match[3] ?? "";
    if (settings && !validVttSettings(settings)) throw new Error(`Cue ${number} contains an invalid VTT cue setting.`);
    const payload = lines.slice(timingIndex + 1).join("\n");
    if (!payload.trim() || payload.includes("-->")) throw new Error(`Cue ${number} has missing text or a missing blank line between cues.`);
    result.cues.push({ id: `loaded-${number}`, start, end, text: payload, identifier: timingIndex === 1 ? lines[0] : "", vttSettings: settings, srtSettings: "" });
    if (result.cues.length > MAX_EDITOR_CUES) throw new Error("This editor supports up to 10,000 cues. Split this file first.");
  }
  if (!result.cues.length) throw new Error("No subtitle cues found in this VTT file. Add timestamp lines and subtitle text, or start from scratch.");
  return result;
}

export function openSubtitle(file: Pick<File, "name" | "size">, bytes: ArrayBuffer): EditorDocument {
  try {
    validateSubtitleFile(file);
    const text = decodeSrt(bytes);
    if (/\.vtt$/i.test(file.name)) return parseVtt(text, file.name);
    const parsed = parseSrt(text);
    if (parsed.cues.length > MAX_EDITOR_CUES) throw new Error("This editor supports up to 10,000 cues. Split this file first.");
    return { ...emptyEditor(), filename: file.name, lineEnding: text.includes("\r\n") ? "\r\n" : "\n", cues: parsed.cues.map((cue, index) => ({ id: `loaded-${index + 1}`, start: cue.start, end: cue.end, text: cue.text, srtSettings: text.slice(cue.endPosition + 12).split(/[\r\n]/, 1)[0].trim(), vttSettings: "", identifier: "" })) };
  } catch (error) { throw new Error(`${file.name}: ${error instanceof Error ? error.message : "This file could not be read. Choose it again."}`); }
}

export function updateEditorCue(document: EditorDocument, id: string, field: "text" | "start" | "end", value: string): EditorDocument {
  const cues = document.cues.map((cue) => {
    if (cue.id !== id) return cue;
    if (field === "text") return cue.text === value ? cue : { ...cue, text: value };
    let time: number | null = null;
    try { time = parseEditorTime(value, document.format); } catch { /* Keep invalid drafts editable; export validation catches them. */ }
    if (cue[field] === time && cue[`${field}Draft`] === value) return cue;
    return { ...cue, [field]: time, [`${field}Draft`]: value };
  });
  return cues.every((cue, index) => cue === document.cues[index]) ? document : { ...document, cues };
}

function validTimes(cue: EditorCue): cue is EditorCue & { start: number; end: number } {
  return Number.isSafeInteger(cue.start) && Number.isSafeInteger(cue.end) && cue.start !== null && cue.end !== null && cue.start >= 0 && cue.end <= MAX_TIMESTAMP_MS && cue.end > cue.start;
}
export function canNudge(cue: EditorCue, offset: number): boolean { return validTimes(cue) && Number.isSafeInteger(offset) && cue.start + offset >= 0 && cue.end + offset <= MAX_TIMESTAMP_MS; }
export function nudgeEditorCue(document: EditorDocument, id: string, offset: number): EditorDocument {
  const target = document.cues.find((cue) => cue.id === id);
  if (!target || !canNudge(target, offset)) throw new Error("This nudge would go before zero or beyond 99:59:59,999. Correct the timing or use a smaller shift.");
  if (!offset) return document;
  return { ...document, cues: document.cues.map((cue) => cue.id === id ? { ...cue, start: cue.start! + offset, end: cue.end! + offset, startDraft: undefined, endDraft: undefined } : cue) };
}
export function shiftEditorCues(document: EditorDocument, value: string): { document: EditorDocument; clamped: number } {
  const offset = parseOffset(value);
  if (!document.cues.length) throw new Error("Add a cue before shifting subtitles.");
  if (document.cues.some((cue) => !validTimes(cue))) throw new Error("Fix invalid cue timestamps before shifting all cues.");
  if (!offset) return { document, clamped: 0 };
  let clamped = 0;
  const cues = document.cues.map((cue) => {
    // Stop the whole cue at zero rather than shortening its duration.
    const applied = Math.max(offset, -cue.start!);
    if (applied !== offset) clamped++;
    if (cue.end! + applied > MAX_TIMESTAMP_MS) throw new Error("This shift would go beyond 99:59:59,999. Use a smaller positive shift.");
    return { ...cue, start: cue.start! + applied, end: cue.end! + applied, startDraft: undefined, endDraft: undefined };
  });
  return { document: { ...document, cues }, clamped };
}
export function addEditorCue(document: EditorDocument, id: string, afterId?: string): EditorDocument {
  if (document.cues.length >= MAX_EDITOR_CUES) throw new Error("You can edit up to 10,000 cues. Delete a cue or split the file first.");
  const index = afterId ? document.cues.findIndex((cue) => cue.id === afterId) : document.cues.length - 1;
  if (afterId && index < 0) throw new Error("This cue is no longer available. Try adding again.");
  const previous = document.cues[index], next = document.cues[index + 1];
  if ((previous && !validTimes(previous)) || (next && !validTimes(next))) throw new Error("Fix the neighboring timestamps before adding a cue here.");
  const start = previous?.end ?? 0;
  const available = Math.min(2000, (next?.start ?? MAX_TIMESTAMP_MS) - start);
  if (available <= 0) throw new Error("There is no room between these cues. Adjust the neighboring times before adding here.");
  const cue: EditorCue = { id, start, end: start + available, text: "", srtSettings: "", vttSettings: "", identifier: "" };
  return { ...document, cues: [...document.cues.slice(0, index + 1), cue, ...document.cues.slice(index + 1)] };
}
export function deleteEditorCue(document: EditorDocument, id: string): EditorDocument { return { ...document, cues: document.cues.filter((cue) => cue.id !== id) }; }

export function visibleCharacterCount(text: string): number {
  const visible = text.replace(/<[^>]*>/gu, "").replace(/&(amp|lt|gt|nbsp|quot|apos);/g, (_, entity) => ({ amp: "&", lt: "<", gt: ">", nbsp: " ", quot: '"', apos: "'" })[entity as "amp"]).replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, decimal) => {
    const code = parseInt(hex ?? decimal, hex ? 16 : 10); return code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "�";
  }).replace(/\s+/gu, " ").trim();
  return Array.from(visible).length;
}
export type CueIssues = { errors: string[]; warnings: string[]; cps: number | null; speed: "normal" | "caution" | "fast" };
export function analyzeEditor(cues: readonly EditorCue[]): CueIssues[] {
  return cues.map((cue, index) => {
    const errors: string[] = [], warnings: string[] = [];
    if (!validTimes(cue)) errors.push(cue.start === null || cue.end === null ? "Enter valid start and end timestamps." : "End must be later than start, with times from zero to 99:59:59,999.");
    if (!cue.text.trim()) errors.push("Add subtitle text before exporting this cue.");
    if (/(?:\r?\n)[\t ]*(?:\r?\n)/.test(cue.text) || cue.text.includes("\0")) errors.push("Remove empty lines or unreadable characters inside this caption. Single line breaks are supported.");
    if (/(?:^|\n)\d+\n[^\n]*-->/.test(cue.text)) errors.push("This caption contains another cue number and timestamp line. Keep only its subtitle text.");
    const previous = cues[index - 1], next = cues[index + 1];
    if (validTimes(cue)) {
      if (next && validTimes(next) && cue.end > next.start) warnings.push(`Overlaps next cue by ${(cue.end - next.start) / 1000}s.`);
      if (previous && validTimes(previous) && previous.end > cue.start) warnings.push(`Overlaps previous cue by ${(previous.end - cue.start) / 1000}s.`);
      if (previous && validTimes(previous) && cue.start < previous.start) warnings.push("Starts before the previous cue. Source order is kept.");
    }
    const cps = validTimes(cue) ? visibleCharacterCount(cue.text) / ((cue.end - cue.start) / 1000) : null;
    const speed = cps !== null && cps > CPS_FAST ? "fast" : cps !== null && cps > CPS_CAUTION ? "caution" : "normal";
    if (speed !== "normal") warnings.push(`${speed === "fast" ? "Fast" : "Consider a little more time"}: ${cps!.toFixed(1)} characters per second. This is a readability guide.`);
    return { errors, warnings, cps, speed };
  });
}
export function filterEditorCues(cues: readonly EditorCue[], issues: readonly CueIssues[], query: string, issuesOnly: boolean, editingId?: string): number[] {
  const find = query.toLocaleLowerCase();
  // Keep a focused cue mounted while the user edits away its last issue or search match.
  return cues.flatMap((cue, index) => cue.id === editingId || (!find || cue.text.toLocaleLowerCase().includes(find)) && (!issuesOnly || issues[index].errors.length + issues[index].warnings.length > 0) ? [index] : []);
}
export function editorPage(indices: readonly number[], page: number) { const pages = Math.max(1, Math.ceil(indices.length / EDITOR_PAGE_SIZE)); const current = Math.max(0, Math.min(Math.floor(page), pages - 1)); return { page: current, pages, indices: indices.slice(current * EDITOR_PAGE_SIZE, (current + 1) * EDITOR_PAGE_SIZE) }; }
export function nextEditorIssue(indices: readonly number[], current: number, direction: -1 | 1): number | undefined { return direction === 1 ? indices.find((index) => index > current) ?? indices[0] : [...indices].reverse().find((index) => index < current) ?? indices.at(-1); }
export function replaceEditorText(document: EditorDocument, find: string, replacement: string, all: boolean): { document: EditorDocument; count: number } {
  if (!find) throw new Error("Enter the text you want to find first.");
  if (find === replacement) return { document, count: 0 };
  let count = 0;
  const cues = document.cues.map((cue) => {
    if (!all && count || !cue.text.includes(find)) return cue;
    if (!all) { count++; return { ...cue, text: cue.text.replace(find, () => replacement) }; }
    const segments = cue.text.split(find); count += segments.length - 1;
    return { ...cue, text: segments.join(replacement) };
  });
  return { document: count ? { ...document, cues } : document, count };
}
export function editorExportErrors(document: EditorDocument, format?: SubtitleFormat, issues: readonly CueIssues[] = analyzeEditor(document.cues)): number[] {
  return document.cues.flatMap((cue, index) => issues[index].errors.length || (format === "vtt" && (cue.text.includes("-->") || index > 0 && cue.start! < document.cues[index - 1].start!)) ? [index + 1] : []);
}
export function exportEditor(document: EditorDocument, format: SubtitleFormat): string {
  if (!document.cues.length) throw new Error("Add at least one subtitle cue before exporting.");
  const errors = editorExportErrors(document, format);
  if (errors.length) throw new Error(`Fix cue ${errors.slice(0, 5).join(", ")}${errors.length > 5 ? ` and ${errors.length - 5} more` : ""} before exporting${format === "vtt" ? ". VTT requires cues in start-time order and text without -->." : "."}`);
  const eol = document.lineEnding;
  const blocks = document.cues.map((cue, index) => {
    const prefix = format === "srt" ? String(index + 1) : cue.identifier;
    const settings = format === "srt" ? cue.srtSettings : cue.vttSettings;
    return [prefix, `${formatEditorTime(cue.start!, format)} --> ${formatEditorTime(cue.end!, format)}${settings ? ` ${settings}` : ""}`, cue.text.replace(/\r\n?|\n/g, eol)].filter((_, i) => i !== 0 || prefix).join(eol);
  });
  return (format === "vtt" ? [document.vttHeader.replace(/\n/g, eol), ...document.vttBlocks.map((block) => block.replace(/\n/g, eol)), ...blocks].join(eol + eol) : blocks.join(eol + eol)) + eol;
}
export function editorFilename(document: EditorDocument, format: SubtitleFormat): string { return `${document.filename.replace(/\.(srt|vtt)$/i, "") || "subtitles"}-edited.${format}`; }
