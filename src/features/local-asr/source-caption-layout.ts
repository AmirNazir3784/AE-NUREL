import type { EditorDocument } from "../../lib/subtitle-editor.ts";
import type { TimedText } from "./asr-core.ts";
import { cleanText, semanticUnits } from "./source-sentences.ts";
import { segmentSubtitleText } from "./subtitle-segmentation.ts";

const compact = (text: string) => cleanText(text).replace(/\s/gu, "");
// Source breaks MUST be measured speech boundaries. Character-weighted timing
// remains translation redistribution only, never invented source alignment.
export function readableSourceDocument(source: EditorDocument, language: string, words: readonly TimedText[] = []): EditorDocument {
  const units = semanticUnits(source, language, words);
  if (units.some(unit => !unit.timingReliable)) return { ...source, cues: source.cues.map(cue => ({ ...cue, text: segmentSubtitleText(cue.text, language, cue.end! - cue.start!, { maxCues: 1 }).texts[0] })) };
  return { ...source, cues: units.flatMap(unit => {
    // Binary-search the absolute timeline instead of scanning hours of words
    // for every sentence. Coarse cue intervals remain fallback boundaries.
    let lo = 0, hi = words.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (Math.round((words[mid].timestamp[0] ?? -1) * 1000) < unit.start) lo = mid + 1; else hi = mid; }
    const selected: { text: string; start: number; end: number }[] = [];
    for (let i = lo; i < words.length; i++) {
      const word = words[i], [start, end] = word.timestamp;
      if (start !== null && Math.round(start * 1000) >= unit.end) break;
      if (start !== null && end !== null && Math.round(end * 1000) <= unit.end) selected.push({ text: word.text, start: Math.round(start * 1000), end: Math.round(end * 1000) });
    }
    const pieces = selected.map(word => compact(word.text)).join("") === compact(unit.text) ? selected : unit.cues;
    const boundaries = new Map<number, { start: number; end: number }>();
    let offset = 0;
    for (const piece of pieces) {
      const start = offset; offset += compact(piece.text).length;
      boundaries.set(start, { start: piece.start!, end: boundaries.get(start)?.end ?? piece.start! });
      boundaries.set(offset, { start: piece.end!, end: piece.end! });
    }
    const { texts } = segmentSubtitleText(unit.text, language, unit.end - unit.start, { cueBreakOffsets: new Set(boundaries.keys()) });
    offset = 0;
    return texts.map((text, i) => {
      const from = offset; offset += compact(text).length;
      const start = boundaries.get(from)?.start, end = boundaries.get(offset)?.end;
      if (start === undefined || end === undefined || start < unit.start || end > unit.end || end <= start) throw new Error("Caption layout has no measured speech boundary.");
      return { ...unit.cues[0], id: `${unit.id}-source-${i}`, start, end, text, startDraft: undefined, endDraft: undefined };
    });
  }) };
}
