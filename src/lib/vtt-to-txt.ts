import { parseVtt, parseEditorTime } from "./subtitle-editor.ts";
import { conversionFilename, decodeCaptionEntities, readConversionFile, type ConversionResult } from "./subtitle-conversion.ts";
import type { TranscriptFormat } from "./srt-to-txt.ts";

export function convertVttToTxt(text: string, name = "subtitles.vtt", format: TranscriptFormat = "lines"): ConversionResult {
  if (format !== "lines" && format !== "paragraph") throw new Error("Choose one cue per line or paragraph text.");
  const source = parseVtt(text, name);
  const lines = source.cues.map((cue, index) => {
    if (cue.end! <= cue.start! || index > 0 && cue.start! < source.cues[index - 1].start!) throw new Error("Cue " + (index + 1) + " needs a positive duration and start-time order.");
    let previous = cue.start!;
    const words = cue.text.replace(/<([^<>]+)>/g, (tag, value: string) => {
      if (/^\d/.test(value)) {
        let timestamp: number;
        try { timestamp = parseEditorTime(value, "vtt"); }
        catch { throw new Error("Cue " + (index + 1) + " has an invalid inline timestamp."); }
        if (timestamp <= previous || timestamp >= cue.end!) throw new Error("Cue " + (index + 1) + " has an inline timestamp outside its cue or out of order.");
        previous = timestamp;
      }
      // Voice names/classes/languages are annotations; ruby words remain text.
      return "";
    });
    return decodeCaptionEntities(words).replace(/\s+/gu, " ").trim();
  }).filter(Boolean);
  if (!lines.length) throw new Error("No readable transcript text was found in this VTT file.");
  return { filename: conversionFilename(name, "txt"), content: lines.join(format === "lines" ? "\n" : " ") + "\n", cueCount: source.cues.length, warnings: [] };
}

export function openVttToTxt(file: Pick<File, "name" | "size">, bytes: ArrayBuffer) {
  return readConversionFile(file, bytes, ["vtt"], text => convertVttToTxt(text, file.name));
}
