import { parseVtt, parseEditorTime } from "./subtitle-editor.ts";
import { conversionFilename, decodeCaptionEntities, numberedSrt, readConversionFile, type ConversionResult } from "./subtitle-conversion.ts";
export function convertVttToSrt(text: string, name = "subtitles.vtt"): ConversionResult {
  const source = parseVtt(text, name);
  let dropped = source.vttHeader !== "WEBVTT" || !!source.vttBlocks.length;
  const cues = source.cues.map((cue, index) => {
    if (cue.end! <= cue.start! || index > 0 && cue.start! < source.cues[index - 1].start!) throw new Error("Cue " + (index + 1) + " needs a positive duration and start-time order.");
    dropped ||= !!cue.vttSettings || !!cue.identifier;
    let previous = cue.start!;
    let caption = cue.text.replace(/<((?:\d{2}:)?\d{2}:\d{2}\.\d{3})>/g, (_, value: string) => {
      const time = parseEditorTime(value, "vtt");
      if (time <= previous || time >= cue.end!) throw new Error("Cue " + (index + 1) + " has an inline timestamp outside its cue or out of order.");
      previous = time; dropped = true; return "";
    });
    caption = caption.replace(/<rt(?:\s[^>]*)?>[\s\S]*?<\/rt>/gi, () => { dropped = true; return ""; });
    caption = caption.replace(/<\/?(?:c(?:\.[\w-]+)*|v|lang|ruby|rt)(?:\s[^>]*)?>/gi, () => { dropped = true; return ""; });
    // Basic emphasis is portable to most SRT players. Other tags are omitted.
    caption = caption.replace(/<\/?([a-z][\w.-]*)(?:\s[^>]*)?>/gi, (tag, kind: string) => {
      if (/^[biu]$/i.test(kind) && /^<\/?[biu]>$/i.test(tag)) return tag.toLowerCase();
      dropped = true; return "";
    });
    const stack: string[] = [];
    caption.replace(/<(\/?)([biu])>/g, (_, close: string, kind: string) => {
      if (!close) stack.push(kind);
      else if (stack.pop() !== kind) throw new Error("Cue " + (index + 1) + " has mismatched formatting tags.");
      return "";
    });
    // WebVTT allows an emphasis span to end with its cue.
    caption += stack.reverse().map(kind => "</" + kind + ">").join("");
    caption = decodeCaptionEntities(caption, true);
    if (!caption.replace(/<\/?[biu]>/g, "").trim()) throw new Error("Cue " + (index + 1) + " has no useful subtitle text.");
    return { start: cue.start!, end: cue.end!, text: caption };
  });
  return { filename: conversionFilename(name, "srt"), content: numberedSrt(cues), cueCount: cues.length, warnings: dropped ? ["VTT metadata, cue identifiers, positioning and VTT-only text features are omitted. Caption words and cue timing are kept; ruby pronunciation annotations are omitted."] : [] };
}
export function openVttToSrt(file: Pick<File, "name" | "size">, bytes: ArrayBuffer) {
  return readConversionFile(file, bytes, ["vtt"], text => convertVttToSrt(text, file.name));
}
