import { conversionFilename, conversionSrt, plainCaption, readConversionFile, type ConversionResult } from "./subtitle-conversion.ts";
export type TranscriptFormat = "lines" | "paragraph";
export function convertSrtToTxt(text: string, name = "subtitles.srt", format: TranscriptFormat = "lines"): ConversionResult {
  if (format !== "lines" && format !== "paragraph") throw new Error("Choose one cue per line or paragraph text.");
  const source = conversionSrt(text);
  const lines = source.cues.map(cue => plainCaption(cue.text).replace(/\s+/gu, " ").trim()).filter(Boolean);
  if (!lines.length) throw new Error("No readable transcript text was found.");
  return { filename: conversionFilename(name, "txt"), content: lines.join(format === "lines" ? "\n" : " ") + "\n", cueCount: source.cues.length, warnings: source.cues.some(c => plainCaption(c.text) !== c.text) ? ["Subtitle formatting is removed and whitespace is cleaned up for readable text."] : [] };
}
export function openSrtToTxt(file: Pick<File, "name" | "size">, bytes: ArrayBuffer) {
  return readConversionFile(file, bytes, ["srt"], text => convertSrtToTxt(text, file.name));
}
