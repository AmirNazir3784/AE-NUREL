import { formatTimestamp } from "./srt.ts";
import { conversionFilename, conversionSrt, readConversionFile, type ConversionResult } from "./subtitle-conversion.ts";
export function convertSrtToJson(text: string, name = "subtitles.srt"): ConversionResult {
  const cues = conversionSrt(text).cues;
  const data = cues.map((cue, i) => ({ index: i + 1, start: formatTimestamp(cue.start), end: formatTimestamp(cue.end), startMs: cue.start, endMs: cue.end, text: cue.text }));
  return { filename: conversionFilename(name, "json"), content: JSON.stringify(data, null, 2) + "\n", cueCount: cues.length, warnings: [] };
}
export function openSrtToJson(file: Pick<File, "name" | "size">, bytes: ArrayBuffer) {
  return readConversionFile(file, bytes, ["srt"], text => convertSrtToJson(text, file.name));
}
