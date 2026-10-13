import type { EditorCue, EditorDocument } from "../../lib/subtitle-editor.ts";
import { languageFilename, translationCode } from "./translation-core.ts";
import { assertSourceCoverage, type SemanticUnit } from "./source-sentences.ts";
export { semanticUnits } from "./source-sentences.ts";
export type { SemanticUnit } from "./source-sentences.ts";
import { segmentSubtitleText } from "./subtitle-segmentation.ts";
import { preservationIssues } from "./translation-integrity.ts";
export const LOCALIZATION_VERSION = "sentence-v2";
const locale = (code: string) => translationCode(code);
const graphemes = (text: string, language: string) => [...new Intl.Segmenter(locale(language), { granularity: "grapheme" }).segment(text)].length;
export function localizeUnit(unit: SemanticUnit, translated: string, target: string) {
  if (typeof translated !== "string" || !translated.trim() || !/[\p{L}\p{N}]/u.test(translated) || translated.length > 8000 || /\u0000|-->|\n\s*\n|[<>]/u.test(translated)) throw new Error("Localization returned invalid subtitle text.");
  const cjk = /^(ja|zh|ko)$/.test(target), duration = unit.end - unit.start;
  const { texts, layoutDense } = segmentSubtitleText(translated, target, duration);
  const weights = texts.map(value => Math.max(1, graphemes(value, target))), sum = weights.reduce((a, b) => a + b, 0);
  const canRetain = texts.length === unit.cues.length && unit.cues.every((cue, i) => weights[i] / ((cue.end! - cue.start!) / 1000) <= (cjk ? 12 : 24));
  const minimum = Math.min(900, Math.floor(duration / texts.length)), remaining = duration - minimum * texts.length;
  let consumed = 0, previous = unit.start;
  const cues = texts.map((value, index): EditorCue => {
    consumed += weights[index];
    const start = canRetain ? unit.cues[index].start! : previous;
    const end = canRetain ? unit.cues[index].end! : index === texts.length - 1 ? unit.end : Math.round(unit.start + minimum * (index + 1) + remaining * consumed / sum);
    if (start < unit.start || end > unit.end || end <= start || start < previous) throw new Error("Localized subtitles exceed their source sentence's time envelope.");
    previous = end;
    return { ...unit.cues[0], id: canRetain ? unit.cues[index].id : `${unit.id}-${index}`, start, end, startDraft: undefined, endDraft: undefined, text: value, identifier: "", srtSettings: "", vttSettings: "" };
  });
  const fast = layoutDense || cues.some(cue => graphemes(cue.text.replace(/\s/gu, ""), target) / ((cue.end! - cue.start!) / 1000) > (cjk ? 12 : 20));
  return { cues, fast };
}
export type UnitTranslation = { id: string; text?: string; error?: string };
export type CoverageEntry = { id: string; sourceCueIds: string[]; sourceText: string; start: number; end: number; status: "translated" | "needs-review" | "failed"; issues: string[]; outputCueIds: string[]; semanticVerified: false };
export type LocalizationDiagnostic = { stage: "source" | "raw" | "coverage"; unit: SemanticUnit; translation?: UnitTranslation; coverage?: CoverageEntry; cues?: EditorCue[] };

export function localizedDocument(source: EditorDocument, units: SemanticUnit[], translations: readonly UnitTranslation[], target: string) {
  assertSourceCoverage(source, units);
  const byId = new Map<string, UnitTranslation>(), ids = new Set(units.map(unit => unit.id));
  for (const item of translations) {
    if (!ids.has(item.id) || byId.has(item.id)) throw new Error("Translation returned duplicate or unknown sentence identities.");
    byId.set(item.id, item);
  }
  const ledger: CoverageEntry[] = [], cues: EditorCue[] = [];
  let fast = false;
  for (const unit of units) {
    const item = byId.get(unit.id), issues: string[] = [];
    let result: ReturnType<typeof localizeUnit> | undefined;
    try {
      if (!unit.timingReliable) throw new Error("This source cue contains multiple sentences without measured interior word timing. Review sentence boundaries and timing.");
      if (!item || item.error || !item.text) throw new Error(item?.error ?? "This source sentence has no translated text. Retry or enter a translation.");
      result = localizeUnit(unit, item.text, target);
    } catch (error) { issues.push(error instanceof Error ? error.message : "This sentence could not be translated."); }
    const output = result?.cues ?? [{ ...unit.cues[0], id: `${unit.id}-missing`, start: unit.start, end: unit.end, text: "", identifier: "", srtSettings: "", vttSettings: "" }];
    if (result?.fast) issues.push("The sentence is too dense for a comfortable layout inside its speech interval. Review text and timing.");
    if (result && item?.text) issues.push(...preservationIssues(unit.text, item.text));
    fast ||= result?.fast ?? false;
    ledger.push({ id: unit.id, sourceCueIds: [...new Set(unit.fragments.map(fragment => fragment.cueId))], sourceText: unit.text, start: unit.start, end: unit.end, status: !result ? "failed" : issues.length ? "needs-review" : "translated", issues, outputCueIds: output.map(cue => cue.id), semanticVerified: false });
    cues.push(...output);
  }
  return { document: { ...source, filename: languageFilename(source.filename, target), cues }, ledger, fast, failed: ledger.filter(entry => entry.status === "failed").length };
}

// Editing can fill a failed sentence, but cannot erase its identity or move its
// dialogue into a different sentence. Semantic correctness remains unverified.
export function coverageExportIssues(document: EditorDocument, ledger: readonly CoverageEntry[]): string[] {
  const byId = new Map(document.cues.map(cue => [cue.id, cue]));
  const allowed = new Set(ledger.flatMap(entry => entry.outputCueIds));
  const errors: string[] = [];
  for (const entry of ledger) {
    const cues = entry.outputCueIds.map(id => byId.get(id));
    if (cues.some(cue => !cue || !cue.text.trim())) errors.push("A source sentence still needs translated text.");
    if (cues.some(cue => cue && (cue.start === null || cue.end === null || cue.start < entry.start || cue.end > entry.end))) errors.push("A translated caption is outside its source sentence's speech interval.");
  }
  if (document.cues.some(cue => !allowed.has(cue.id)) || byId.size !== document.cues.length) errors.push("Translated caption identities no longer match the source coverage ledger.");
  return [...new Set(errors)];
}
