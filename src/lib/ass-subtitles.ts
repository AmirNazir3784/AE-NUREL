import { MAX_EDITOR_CUES } from "./subtitle-editor.ts";
import { MAX_TIMESTAMP_MS } from "./srt.ts";
import { type ConversionCue } from "./subtitle-conversion.ts";
export type AssDocument = { cues: ConversionCue[]; styled: boolean; omitted: number; reordered: boolean };
export function parseAssTime(value: string): number {
  const match = /^(\d{1,2}):([0-5]\d):([0-5]\d)\.(\d{2})$/.exec(value.trim());
  if (!match) throw new Error("Use ASS times such as 0:01:23.45.");
  const ms = Number(match[1]) * 3600000 + Number(match[2]) * 60000 + Number(match[3]) * 1000 + Number(match[4]) * 10;
  if (ms > MAX_TIMESTAMP_MS) throw new Error("The subtitle time is outside the supported timeline.");
  return ms;
}
export function formatAssTime(ms: number): string {
  const cs = Math.round(ms / 10);
  return Math.floor(cs / 360000) + ":" + String(Math.floor(cs / 6000) % 60).padStart(2, "0") + ":" + String(Math.floor(cs / 100) % 60).padStart(2, "0") + "." + String(cs % 100).padStart(2, "0");
}
// Text may contain commas even if Format puts Text before other fields.
function eventFields(record: string, fields: readonly string[]): string[] {
  const textIndex = fields.indexOf("text"), tokens = record.split(",");
  if (tokens.length < fields.length) throw new Error("A Dialogue record has missing fields.");
  const rightCount = fields.length - textIndex - 1;
  return [...tokens.slice(0, textIndex), tokens.slice(textIndex, tokens.length - rightCount).join(","), ...tokens.slice(tokens.length - rightCount)];
}
function dialogueText(value: string): { text: string; styled: boolean } {
  let drawing = false, styled = false, output = "", cursor = 0;
  for (const block of value.matchAll(/\{[^}]*\}/g)) {
    if (!drawing) output += value.slice(cursor, block.index);
    styled = true;
    for (const mode of block[0].matchAll(/\\p(\d+)(?=\\|}|[^a-z\d])/gi)) drawing = Number(mode[1]) > 0;
    cursor = block.index! + block[0].length;
  }
  if (!drawing) output += value.slice(cursor);
  if (/[{}]/.test(output)) throw new Error("A Dialogue record has an unmatched override block.");
  return { text: output.replace(/\\N|\\n/g, "\n").replace(/\\h/g, "\u00a0").split("\n").map(line => line.trim()).filter(Boolean).join("\n"), styled };
}
export function parseAss(source: string): AssDocument {
  if (!source.trim() || source.includes("\0")) throw new Error("This subtitle file is empty or is not readable text.");
  let section = "", fields: string[] | null = null, events = false, script = false, styled = false, omitted = 0, dialogueCount = 0;
  const cues: ConversionCue[] = [];
  for (const [lineIndex, raw] of source.replace(/^\uFEFF/, "").split(/\r\n?|\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith(";")) continue;
    const heading = /^\[([^\]]+)\]$/.exec(line);
    if (heading) {
      section = heading[1].toLowerCase();
      if (section === "script info") script = true;
      if (section === "events") { events = true; fields = null; }
      continue;
    }
    if (/^(v4\+? styles|fonts|graphics)$/.test(section)) { styled = true; continue; }
    if (section !== "events") continue;
    const format = /^Format\s*:\s*(.+)$/i.exec(line);
    if (format) {
      fields = format[1].split(",").map(field => field.trim().toLowerCase());
      if (fields.length > 32 || new Set(fields).size !== fields.length || !["start", "end", "text"].every(field => fields!.includes(field))) throw new Error("Events Format must define unique Start, End and Text fields.");
      continue;
    }
    if (/^Comment\s*:/i.test(line)) { omitted++; continue; }
    const dialogue = /^Dialogue\s*:\s*(.*)$/i.exec(line);
    if (!dialogue) throw new Error("Unsupported Events record on line " + (lineIndex + 1) + ". Only Dialogue and Comment records are supported.");
    if (!fields) throw new Error("The Events section needs a Format line before Dialogue records.");
    dialogueCount++;
    if (dialogueCount > MAX_EDITOR_CUES) throw new Error("Use no more than 10,000 dialogue records. Split this file first.");
    try {
      const values = eventFields(dialogue[1], fields);
      const start = parseAssTime(values[fields.indexOf("start")]), end = parseAssTime(values[fields.indexOf("end")]);
      if (end <= start) throw new Error("Dialogue needs an end later than its start.");
      const caption = dialogueText(values[fields.indexOf("text")]);
      styled ||= caption.styled || ["style", "effect", "layer", "marginl", "marginr", "marginv"].some(field => fields!.includes(field) && !!values[fields!.indexOf(field)].trim().replace(/^0+$/, ""));
      if (!caption.text.trim()) { omitted++; continue; }
      cues.push({ start, end, text: caption.text });
    } catch (error) { throw new Error("Dialogue on line " + (lineIndex + 1) + ": " + (error as Error).message); }
  }
  if (!script || !events || !fields) throw new Error("Expected ASS/SSA Script Info and Events sections with a valid Format line.");
  if (!cues.length) throw new Error("No useful dialogue cues found. Drawing-only, empty and comment events cannot become SRT captions.");
  const reordered = cues.some((cue, i) => i > 0 && cue.start < cues[i - 1].start);
  return { cues: cues.toSorted((a, b) => a.start - b.start), styled, omitted, reordered };
}
