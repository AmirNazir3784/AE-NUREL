import type { EditorCue, EditorDocument } from "../../lib/subtitle-editor.ts";
import type { TimedText } from "./asr-core.ts";
import { translationCode } from "./translation-core.ts";

export const cleanText = (text: string) => text.normalize("NFC").replace(/\s+/gu, " ").trim();
const compact = (text: string) => cleanText(text).replace(/\s/gu, "");
const sentenceEnd = /[.!?。！？؟۔।][\p{Pe}\p{Pf}"']*$/u;
export type SourceFragment = { cueId: string; from: number; to: number; text: string; start: number; end: number };
export type SemanticUnit = { id: string; text: string; start: number; end: number; cues: EditorCue[]; fragments: SourceFragment[]; timingReliable: boolean; complete: boolean; continuation: boolean };

// A cue containing multiple sentences requires measured interior boundaries.
// Character proportions are NOT speech alignment. If word timing cannot supply
// that boundary, keep each sentence visible in the ledger and require review.
function measuredPieces(cue: EditorCue, pieces: { text: string; from: number; to: number }[], words: readonly TimedText[]) {
  if (pieces.length === 1) return [{ start: cue.start!, end: cue.end! }];
  let lo = 0, hi = words.length;
  while (lo < hi) { const middle = (lo + hi) >>> 1; if (Math.round((words[middle].timestamp[0] ?? -1) * 1000) < cue.start!) lo = middle + 1; else hi = middle; }
  const selected: TimedText[] = [];
  for (let index = lo; index < words.length; index++) {
    const word = words[index];
    if (word.timestamp[0] !== null && Math.round(word.timestamp[0] * 1000) >= cue.end!) break;
    if (word.timestamp[0] !== null && word.timestamp[1] !== null && Math.round(word.timestamp[1] * 1000) <= cue.end!) selected.push(word);
  }
  if (selected.map(word => compact(word.text)).join("") !== compact(cue.text)) return undefined;
  let offset = 0;
  const spans = selected.map(word => { const from = offset; offset += compact(word.text).length; return { from, to: offset, start: Math.round(word.timestamp[0]! * 1000), end: Math.round(word.timestamp[1]! * 1000) }; });
  offset = 0;
  const result: { start: number; end: number }[] = [];
  for (const piece of pieces) {
    const from = offset; offset += compact(piece.text).length;
    const first = spans.find(span => span.from === from), last = spans.find(span => span.to === offset);
    if (!first || !last || last.end <= first.start) return undefined;
    result.push({ start: first.start, end: last.end });
  }
  return result;
}

export function semanticUnits(document: EditorDocument, language = "en", words: readonly TimedText[] = []): SemanticUnit[] {
  const segmenter = new Intl.Segmenter(translationCode(language), { granularity: "sentence" });
  const units: SemanticUnit[] = [], ids = new Set<string>();
  let current: SemanticUnit | undefined, previousEnd = 0;
  for (const cue of document.cues) {
    if (ids.has(cue.id) || cue.start === null || cue.end === null || !Number.isInteger(cue.start) || !Number.isInteger(cue.end) || cue.start < previousEnd || cue.end <= cue.start) throw new Error("Source subtitles have invalid timing or duplicate cue IDs.");
    ids.add(cue.id); previousEnd = cue.end;
    const text = cleanText(cue.text);
    if (!text || text.length > 1200) throw new Error("A source cue is empty or too large for bounded localization.");
    const pieces = [...segmenter.segment(text)].map(part => ({ text: part.segment.trim(), from: part.index + part.segment.length - part.segment.trimStart().length, to: part.index + part.segment.trimEnd().length })).filter(part => part.text);
    const measured = measuredPieces(cue, pieces, words);
    for (let index = 0; index < pieces.length; index++) {
      const piece = pieces[index], timing = measured?.[index] ?? { start: cue.start, end: cue.end };
      const part = { ...cue, ...timing, text: piece.text, id: pieces.length === 1 ? cue.id : `${cue.id}:sentence-${index}` };
      const fragment = { cueId: cue.id, from: piece.from, to: piece.to, text: piece.text, ...timing };
      const complete = sentenceEnd.test(piece.text);
      const bounded = current && (part.start - current.end > 1200 || part.end - current.start > 20000 || current.cues.length >= 4 || current.text.length + piece.text.length + 1 > 480);
      if (!current || bounded || !measured || !current.timingReliable) {
        const continuation = !!current && !current.complete;
        if (continuation) current!.continuation = true;
        current = { id: `unit-${cue.id}-${piece.from}`, text: piece.text, start: part.start, end: part.end, cues: [part], fragments: [fragment], timingReliable: !!measured, complete, continuation };
        units.push(current);
      } else {
        const cjkJoin = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]$/u.test(current.text) && /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(piece.text);
        current.text += (cjkJoin ? "" : " ") + piece.text; current.end = part.end; current.complete = complete;
        current.cues.push(part); current.fragments.push(fragment);
      }
      // Every complete sentence closes its own envelope, regardless of length.
      if (complete || !measured) current = undefined;
    }
  }
  assertSourceCoverage(document, units);
  return units;
}

export function assertSourceCoverage(source: EditorDocument, units: readonly SemanticUnit[]) {
  const fragments = new Map<string, SourceFragment[]>(), ids = new Set<string>();
  const order = new Map(source.cues.map((cue, index) => [cue.id, index]));
  let previousCue = -1, previousOffset = -1;
  for (const unit of units) {
    if (ids.has(unit.id) || !unit.fragments.length) throw new Error("Source sentence identities are invalid.");
    if (compact(unit.text) !== unit.fragments.map(fragment => compact(fragment.text)).join("") || unit.start !== unit.fragments[0].start || unit.end !== unit.fragments.at(-1)!.end) throw new Error("A source sentence's text or timing no longer matches its identity.");
    ids.add(unit.id);
    for (const fragment of unit.fragments) {
      const index = order.get(fragment.cueId);
      if (index === undefined || index < previousCue || (index === previousCue && fragment.from <= previousOffset)) throw new Error("Source sentence coverage is reordered or refers to an unknown cue.");
      previousCue = index; previousOffset = fragment.from;
      const list = fragments.get(fragment.cueId) ?? []; list.push(fragment); fragments.set(fragment.cueId, list);
    }
  }
  for (const cue of source.cues) {
    const text = cleanText(cue.text), parts = fragments.get(cue.id) ?? [];
    let end = 0;
    for (const part of parts) {
      if (!Number.isInteger(part.start) || !Number.isInteger(part.end) || part.end <= part.start || part.from < end || text.slice(end, part.from).trim() || text.slice(part.from, part.to) !== part.text || part.start < cue.start! || part.end > cue.end!) throw new Error("A source sentence was omitted, duplicated or assigned to the wrong cue.");
      end = part.to;
    }
    if (!parts.length || text.slice(end).trim()) throw new Error("A source sentence has no coverage entry.");
    fragments.delete(cue.id);
  }
  if (fragments.size) throw new Error("A source sentence refers to an unknown cue.");
}
