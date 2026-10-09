import { parseAss } from "./ass-subtitles.ts";
import { conversionFilename, numberedSrt, readConversionFile, type ConversionResult } from "./subtitle-conversion.ts";
export function convertAssToSrt(text: string, name = "subtitles.ass"): ConversionResult {
  const source = parseAss(text), warnings: string[] = [];
  if (source.styled) warnings.push("ASS/SSA styling cannot be stored in SRT. Fonts, colours, positioning, karaoke and effects are omitted; dialogue words and timing are kept.");
  if (source.omitted) warnings.push(source.omitted + " comment, empty or drawing-only events were omitted.");
  if (source.reordered) warnings.push("Dialogue is sorted by start time. Cues with the same start keep their source order.");
  return { filename: conversionFilename(name, "srt"), content: numberedSrt(source.cues), cueCount: source.cues.length, warnings };
}
export function openAssToSrt(file: Pick<File, "name" | "size">, bytes: ArrayBuffer) {
  return readConversionFile(file, bytes, ["ass", "ssa"], text => convertAssToSrt(text, file.name));
}
