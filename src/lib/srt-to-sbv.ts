import { formatSbvTime, parseSbv } from "./sbv.ts";
import { conversionFilename, conversionSrt, plainCaption, readConversionFile, type ConversionResult } from "./subtitle-conversion.ts";
export function convertSrtToSbv(text: string, name = "subtitles.srt"): ConversionResult {
  const source = conversionSrt(text);
  let formatting = false;
  const records = source.cues.map((cue, index) => {
    const caption = plainCaption(cue.text).trimEnd();
    formatting ||= caption !== cue.text;
    if (!caption.trim()) throw new Error("Cue " + (index + 1) + " contains no readable subtitle text.");
    if (/\n[ \t]*\n/.test(caption)) throw new Error("Cue " + (index + 1) + " contains a blank line after formatting is removed. Remove that blank line before converting to SBV.");
    if (caption.split("\n").some(line => /^\s*\d+:\d{2}:\d{2}\.\d+,\s*\d+:\d{2}:\d{2}\.\d+\s*$/.test(line))) throw new Error("Cue " + (index + 1) + " contains text that looks like an SBV timing line. Edit that line before converting.");
    return formatSbvTime(cue.start) + "," + formatSbvTime(cue.end) + "\n" + caption;
  });
  const content = records.join("\n\n") + "\n";
  // Never offer a file that cannot reopen as the supported SBV dialect.
  const output = parseSbv(content);
  if (output.length !== source.cues.length) throw new Error("The output could not be validated. Check the caption text and try again.");
  const warnings = formatting ? ["SRT text formatting is removed. SBV keeps caption words, line breaks and timing."] : [];
  if (source.cues.some(cue => text.slice(cue.endPosition + 12).split(/[\r\n]/, 1)[0].trim())) warnings.push("SRT positioning information is omitted because basic SBV does not store it.");
  return { filename: conversionFilename(name, "sbv"), content, cueCount: output.length, warnings };
}
export function openSrtToSbv(file: Pick<File, "name" | "size">, bytes: ArrayBuffer) {
  return readConversionFile(file, bytes, ["srt"], text => convertSrtToSbv(text, file.name));
}
