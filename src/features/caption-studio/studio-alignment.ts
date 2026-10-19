import type { EditorCue, EditorDocument } from "../../lib/subtitle-editor.ts";
import type { TimedText } from "../local-asr/asr-core.ts";
import { textSeparator } from "../local-asr/text-boundaries.ts";
import { plainCaption } from "../../lib/subtitle-conversion.ts";

export type StudioAlignedCue = { id: string; text: string; start: number; end: number; words: { from: number; to: number; start: number; end: number }[] };
export type StudioAlignment = readonly StudioAlignedCue[];

/** Associate actual model spans with the exact generated cue, never estimated words. */
export function buildStudioAlignment(document: EditorDocument, chunks: readonly TimedText[]): StudioAlignment {
  const aligned: StudioAlignedCue[] = []; let index = 0;
  for (const cue of document.cues) {
    if (cue.start === null || cue.end === null) continue;
    const words: StudioAlignedCue["words"] = []; let text = "";
    while (index < chunks.length) {
      const chunk = chunks[index], [start, end] = chunk.timestamp;
      if (start === null || end === null || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
      const begin = Math.round(start * 1000), finish = Math.round(end * 1000);
      if (begin >= cue.end) break;
      index++;
      const word = chunk.text.replace(/\s+/gu, " ").trim();
      if (!word || begin < cue.start || finish > cue.end + 1) continue;
      const separator = text ? textSeparator(text, word) : "", from = text.length + separator.length;
      text += separator + word;
      words.push({ from, to: text.length, start: begin, end: Math.min(finish, cue.end) });
    }
    if (text === cue.text && plainCaption(text) === text && words.length) aligned.push({ id: cue.id, text, start: cue.start, end: cue.end, words });
  }
  return aligned;
}

// Editing text/timing invalidates only that cue. Undo can restore the exact
// source snapshot; imported/manual cues never acquire synthetic word timings.
export function currentStudioAlignment(document: EditorDocument, source: StudioAlignment): StudioAlignment {
  const cues = new Map(document.cues.map(cue => [cue.id, cue]));
  return source.filter(entry => { const cue = cues.get(entry.id); return cue && cue.text === entry.text && cue.start === entry.start && cue.end === entry.end; });
}
export function studioWordSpans(cues: readonly EditorCue[], source: StudioAlignment, time: number): { from: number; to: number }[] {
  const spans: { from: number; to: number }[] = []; let offset = 0;
  for (const cue of cues) {
    const match = source.find(entry => entry.id === cue.id && entry.text === cue.text && entry.start === cue.start && entry.end === cue.end);
    for (const word of match?.words ?? []) if (word.start <= time + 1e-6 && time + 1e-6 < word.end) spans.push({ from: offset + word.from, to: offset + word.to });
    offset += plainCaption(cue.text).length + 1;
  }
  return spans;
}
