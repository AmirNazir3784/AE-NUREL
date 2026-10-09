import { formatAssTime } from "./ass-subtitles.ts";
import { MAX_TIMESTAMP_MS } from "./srt.ts";
import { conversionFilename, conversionSrt, plainCaption, readConversionFile, type ConversionResult } from "./subtitle-conversion.ts";
const header = [
  "[Script Info]", "Title: Converted subtitles", "ScriptType: v4.00+", "PlayResX: 1920", "PlayResY: 1080", "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
  "[V4+ Styles]", "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
  "Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,40,40,40,1", "",
  "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
].join("\n");
export function convertSrtToAss(text: string, name = "subtitles.srt"): ConversionResult {
  const source = conversionSrt(text), warnings: string[] = ["A default ASS style is created. SRT does not contain rich ASS styling."];
  let rounded = false, formatting = false;
  const records = source.cues.map((cue, index) => {
    const start = Math.round(cue.start / 10) * 10, end = Math.round(cue.end / 10) * 10;
    if (end > MAX_TIMESTAMP_MS) throw new Error("Cue " + (index + 1) + " rounds beyond the supported timeline. Reduce its end time before converting.");
    if (end <= start) throw new Error("Cue " + (index + 1) + " is too short for ASS centisecond timing. Increase its duration in the Subtitle Editor.");
    rounded ||= start !== cue.start || end !== cue.end;
    const caption = plainCaption(cue.text);
    formatting ||= caption !== cue.text;
    if (!caption.trim()) throw new Error("Cue " + (index + 1) + " contains no useful subtitle text.");
    // These have no portable literal escape across ASS renderers. Reject rather
    // than hiding text or interpreting an SRT caption as an override command.
    if (/[{}]|\\[Nnh]/.test(caption)) throw new Error("Cue " + (index + 1) + " contains literal braces or ASS escape sequences that cannot be preserved safely. Edit that caption before converting.");
    return "Dialogue: 0," + formatAssTime(cue.start) + "," + formatAssTime(cue.end) + ",Default,,0,0,0,," + caption.replace(/\n/g, "\\N");
  });
  if (rounded) warnings.push("ASS stores hundredths of a second. Timestamps are rounded to the nearest 10 milliseconds.");
  if (formatting) warnings.push("SRT text formatting is removed. Caption words use the default ASS style.");
  if (/X1:\d+/.test(text)) warnings.push("SRT positioning information is omitted.");
  return { filename: conversionFilename(name, "ass"), content: header + "\n" + records.join("\n") + "\n", cueCount: source.cues.length, warnings };
}
export function openSrtToAss(file: Pick<File, "name" | "size">, bytes: ArrayBuffer) {
  return readConversionFile(file, bytes, ["srt"], text => convertSrtToAss(text, file.name));
}
