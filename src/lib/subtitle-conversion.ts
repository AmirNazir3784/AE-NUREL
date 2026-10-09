import { decodeSrt, formatTimestamp, MAX_FILE_BYTES, parseSrt } from "./srt.ts";
import { MAX_EDITOR_CUES } from "./subtitle-editor.ts";
export type ConversionCue = { start: number; end: number; text: string };
export type ConversionResult = { filename: string; content: string; cueCount: number; warnings: string[] };
export function validateConversionFile(file: Pick<File, "name" | "size">, extensions: readonly string[]) {
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (!extension || !extensions.includes(extension)) throw new Error("Choose " + extensions.map(e => "." + e).join(" or ") + " subtitles.");
  if (!file.size) throw new Error("This file is empty. Choose a subtitle file with cues in it.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Choose a subtitle file no larger than 10 MB.");
}
export function conversionFilename(name: string, extension: string) {
  const stem = name.replace(/^.*[\\/]/, "").replace(/\.[^.]*$/, "").replace(/[\u0000-\u001f]/g, "").trim();
  return (stem || "subtitles") + "." + extension;
}
export function readConversionFile<T>(file: Pick<File, "name" | "size">, bytes: ArrayBuffer, extensions: readonly string[], convert: (text: string) => T): T {
  try {
    validateConversionFile(file, extensions);
    if (bytes.byteLength !== file.size) throw new Error("The file could not be read completely. Choose it again.");
    return convert(decodeSrt(bytes).replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(file.name + ": " + (error instanceof Error ? error.message.replace("This editor supports", "This converter supports").replace(", or start from scratch", "").replace("UTF-8 SRT", "UTF-8 subtitles") : "Conversion failed. Choose the file again."));
  }
}
export function conversionSrt(text: string) {
  const document = parseSrt(text);
  if (document.cues.length > MAX_EDITOR_CUES) throw new Error("Use no more than 10,000 subtitle cues. Split this file first.");
  document.cues.forEach((cue, i) => { if (cue.end <= cue.start) throw new Error("Cue " + (i + 1) + " needs an end later than its start."); });
  return document;
}
export function numberedSrt(cues: readonly ConversionCue[]): string {
  return cues.map((cue, i) => String(i + 1) + "\n" + formatTimestamp(cue.start) + " --> " + formatTimestamp(cue.end) + "\n" + cue.text).join("\n\n") + "\n";
}
const entities: Record<string, string> = { amp:"&", lt:"<", gt:">", quot:'"', apos:"'", nbsp:"\u00a0", lrm:"\u200e", rlm:"\u200f" };
export function decodeCaptionEntities(text: string, preserveAngles = false): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (all, name: string) => {
    if (name[0] !== "#") return preserveAngles && (name === "lt" || name === "gt") ? all : entities[name] ?? all;
    const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return preserveAngles && (code === 60 || code === 62) ? all : code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : all;
  });
}
// Only known subtitle styling is removed. Literal angle-bracket text is retained.
export function plainCaption(text: string): string {
  return decodeCaptionEntities(text.replace(/<br\s*\/?>/gi, "\n").replace(/<\/?(?:b|i|u|s|font|span)(?:\s[^>]*)?>/gi, ""));
}
