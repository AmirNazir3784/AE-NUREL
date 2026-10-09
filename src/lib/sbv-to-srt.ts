import { parseSbv } from "./sbv.ts";
import { conversionFilename, numberedSrt, readConversionFile, type ConversionResult } from "./subtitle-conversion.ts";
export function convertSbvToSrt(text: string, name = "subtitles.sbv"): ConversionResult {
  const cues = parseSbv(text);
  return { filename: conversionFilename(name, "srt"), content: numberedSrt(cues), cueCount: cues.length, warnings: [] };
}
export function openSbvToSrt(file: Pick<File, "name" | "size">, bytes: ArrayBuffer) {
  return readConversionFile(file, bytes, ["sbv"], text => convertSbvToSrt(text, file.name));
}
