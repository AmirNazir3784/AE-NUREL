import { MAX_TIMESTAMP_MS, validateSrtFile } from "./srt.ts";
import { exportEditor, openSubtitle, parseVtt, type EditorDocument } from "./subtitle-editor.ts";

export type VttConversion = {
  source: EditorDocument;
  output: EditorDocument;
  content: string;
  filename: string;
  warnings: string[];
};

const namedReferences = new Set(["amp", "lt", "gt", "nbsp", "lrm", "rlm", "quot", "apos", "copy", "reg", "trade", "hellip", "ndash", "mdash", "laquo", "raquo", "bull", "euro", "pound", "yen", "cent", "deg"]);

// Preserve balanced basic styling. Other angle-bracket text is escaped rather
// than discarded or accidentally interpreted as WebVTT markup.
export function webVttText(text: string): { text: string; unsupportedMarkup: boolean } {
  const stack: string[] = [];
  let balanced = true;
  for (const match of text.matchAll(/<(\/?)([biu])>/g)) {
    if (!match[1]) stack.push(match[2]);
    else if (stack.pop() !== match[2]) balanced = false;
  }
  balanced &&= stack.length === 0;
  let unsupportedMarkup = !balanced;
  const escaped = text.replace(/<\/?[biu]>|&(?:[a-zA-Z][a-zA-Z\d]*|#\d+|#[xX][\da-fA-F]+);|[&<>]/g, (token) => {
    if (balanced && /^<\/?[biu]>$/.test(token)) return token;
    if (token.startsWith("&") && token.length > 1) {
      const name = token.slice(1, -1);
      if (namedReferences.has(name)) return token;
      if (/^#(?:\d+|[xX][\da-fA-F]+)$/.test(name)) {
        const value = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
        if (value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff)) return token;
      }
      unsupportedMarkup = true;
      return `&amp;${token.slice(1)}`;
    }
    if (token.startsWith("<")) {
      if (token.length > 1) unsupportedMarkup = true;
      return token.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    return token === "&" ? "&amp;" : "&gt;";
  });
  // Literal brackets are safe; an unsupported tag deserves a visible notice.
  unsupportedMarkup ||= /<(?!\/?[biu]>)[\/?a-zA-Z][^>]*>/.test(text);
  return { text: escaped, unsupportedMarkup };
}

export function vttFilename(filename: string): string {
  return `${filename.replace(/\.srt$/i, "") || "subtitles"}.vtt`;
}

export function convertSrtDocument(source: EditorDocument): VttConversion {
  if (source.format !== "srt") throw new Error("Choose an .srt subtitle file. This converter only accepts SRT.");
  if (!source.cues.length) throw new Error("No subtitle cues found. Choose an SRT file containing numbered cues, timestamps and text.");
  let unsupportedMarkup = false;
  const cues = source.cues.map((cue, index) => {
    if (!Number.isSafeInteger(cue.start) || !Number.isSafeInteger(cue.end) || cue.start === null || cue.end === null || cue.start < 0 || cue.end > MAX_TIMESTAMP_MS || cue.end <= cue.start) throw new Error(`Cue ${index + 1} needs an end later than its start, with valid times from 00:00:00,000 to 99:59:59,999.`);
    if (index > 0 && cue.start < source.cues[index - 1].start!) throw new Error(`Cue ${index + 1} starts before the previous cue. WebVTT requires cues in start-time order. Correct this in the Subtitle Editor; we do not reorder your subtitles.`);
    const converted = webVttText(cue.text);
    unsupportedMarkup ||= converted.unsupportedMarkup;
    return { ...cue, text: converted.text, identifier: "", srtSettings: "", vttSettings: "" };
  });
  const output: EditorDocument = { ...source, filename: vttFilename(source.filename), format: "vtt", cues, vttHeader: "WEBVTT", vttBlocks: [] };
  const warnings: string[] = [];
  if (source.cues.some((cue) => cue.srtSettings)) warnings.push("Some SRT positioning information is not supported in WebVTT and was omitted. Subtitle text and timing are kept.");
  if (unsupportedMarkup) warnings.push("Some markup or character references could not be carried over and are kept as literal text. Balanced bold, italic and underline tags are preserved.");
  const result = { source, output, content: exportEditor(output, "vtt"), filename: output.filename, warnings };
  validateVttConversion(result);
  return result;
}

export function openSrtConversion(file: Pick<File, "name" | "size">, bytes: ArrayBuffer): VttConversion {
  try {
    validateSrtFile(file);
    return convertSrtDocument(openSubtitle(file, bytes));
  } catch (error) {
    const message = error instanceof Error ? error.message.replace("This editor supports", "This converter supports") : "We could not read this file. Choose it again.";
    throw new Error(message.startsWith(`${file.name}:`) ? message : `${file.name}: ${message}`);
  }
}

export function validateVttConversion(result: VttConversion): void {
  const { source, output, content } = result;
  if (source.format !== "srt" || output.format !== "vtt" || output.vttHeader !== "WEBVTT" || output.vttBlocks.length || !source.cues.length || source.cues.length !== output.cues.length || result.filename !== vttFilename(source.filename) || output.filename !== result.filename) throw new Error("The conversion no longer matches this file. Choose the SRT again.");
  if (source.cues.some((cue, index) => {
    const converted = output.cues[index];
    return cue.start !== converted.start || cue.end !== converted.end || webVttText(cue.text).text !== converted.text || !!converted.identifier || !!converted.vttSettings || !!converted.srtSettings;
  })) throw new Error("The converted text or timing no longer matches this file. Choose the SRT again.");
  if (!content || content !== exportEditor(output, "vtt")) throw new Error("The download no longer matches the conversion. Choose the SRT again.");
  const parsed = parseVtt(content, result.filename);
  if (parsed.cues.length !== output.cues.length || parsed.cues.some((cue, index) => cue.start !== output.cues[index].start || cue.end !== output.cues[index].end || cue.text !== output.cues[index].text || !!cue.identifier)) throw new Error("We could not validate every converted cue. Choose the SRT again.");
}

export function serializeVttConversion(result: VttConversion): string {
  validateVttConversion(result);
  return result.content;
}
