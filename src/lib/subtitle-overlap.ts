import { MAX_TIMESTAMP_MS } from "./srt.ts";
import { editorExportErrors, exportEditor, openSubtitle, parseEditorTime, type EditorCue, type EditorDocument } from "./subtitle-editor.ts";

export const MIN_REPAIR_DURATION_MS = 100;
export const MAX_OVERLAP_GAP_MS = 10_000;
export type OverlapMode = "shorten" | "move";
export type OverlapIssue = { index: number; milliseconds: number };
export type OverlapRepair = { document: EditorDocument; original: OverlapIssue[]; remaining: OverlapIssue[]; reasons: Record<number, string>; excluded: number[]; fixed: number; changedCues: number; gap: number; mode: OverlapMode };

export function validateOverlapDocument(document: EditorDocument): void {
  if (!document.cues.length) throw new Error("Choose a subtitle file containing at least one cue.");
  const invalid = editorExportErrors(document, document.format);
  if (invalid.length) throw new Error(`Cue ${invalid[0]} needs valid text and an end later than its start. Correct it in the Subtitle Editor first.`);
  const invalidInline = document.cues.findIndex((cue) => !inlineTimesFit(cue, document.format));
  if (invalidInline >= 0) throw new Error(`Cue ${invalidInline + 1} has inline VTT timing outside its duration. Correct it in the Subtitle Editor first.`);
  for (let index = 1; index < document.cues.length; index++) {
    if (document.cues[index].start! < document.cues[index - 1].start!) throw new Error(`Cue ${index + 1} starts before the previous cue. Put cues in timeline order in the Subtitle Editor before fixing overlaps. We do not reorder your subtitles.`);
  }
}

export function openOverlapSubtitle(file: Pick<File, "name" | "size">, bytes: ArrayBuffer): EditorDocument {
  try {
    const document = openSubtitle(file, bytes);
    validateOverlapDocument(document);
    return document;
  } catch (error) {
    const message = (error as Error).message.replace("This editor supports", "This tool supports").replace(", or start from scratch", "");
    throw new Error(message.startsWith(`${file.name}:`) ? message : `${file.name}: ${message}`);
  }
}

// Like the Editor, an issue is an overlapping adjacent pair in source order.
// Exact touching timestamps are not overlaps. No text or order is normalized.
export function detectOverlaps(document: EditorDocument): OverlapIssue[] {
  validateOverlapDocument(document);
  return document.cues.flatMap((cue, index) => index < document.cues.length - 1 && cue.end! > document.cues[index + 1].start! ? [{ index, milliseconds: cue.end! - document.cues[index + 1].start! }] : []);
}

export function parseOverlapGap(value: string): number {
  if (!/^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(value.trim())) throw new Error("Enter a gap from 0 to 10 seconds, with up to three decimal places.");
  const milliseconds = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0 || milliseconds > MAX_OVERLAP_GAP_MS) throw new Error("Choose a minimum gap from 0 to 10 seconds.");
  return milliseconds;
}

function inlineTimesFit(cue: EditorCue, format: EditorDocument["format"]): boolean {
  if (format !== "vtt") return true;
  let previous = cue.start!;
  for (const match of cue.text.matchAll(/<((?:\d{2}:)?\d{2}:\d{2}\.\d{3})>/g)) {
    const time = parseEditorTime(match[1], "vtt");
    if (time <= previous || time >= cue.end!) return false;
    previous = time;
  }
  return true;
}

export function repairOverlaps(document: EditorDocument, mode: OverlapMode, gap: number, excluded: readonly number[] = []): OverlapRepair {
  validateOverlapDocument(document);
  if (mode !== "shorten" && mode !== "move") throw new Error("Choose how the overlaps should be fixed.");
  if (!Number.isSafeInteger(gap) || gap < 0 || gap > MAX_OVERLAP_GAP_MS) throw new Error("Choose a minimum gap from 0 to 10 seconds.");
  const original = detectOverlaps(document), originalPairs = new Set(original.map((issue) => issue.index));
  if (excluded.some((index) => !originalPairs.has(index))) throw new Error("An overlap selection is no longer available. Review this file again.");
  const excludedSet = new Set(excluded);
  // Protect both cues of an excluded pair, even when a neighboring cascade
  // would otherwise modify one. Exclusion always means unchanged timing.
  const protectedCues = new Set(excluded.flatMap((index) => [index, index + 1]));
  const cues = document.cues.map((cue) => ({ ...cue })), reasons: Record<number, string> = {};
  for (let index = 0; index < cues.length - 1; index++) {
    const earlier = cues[index], later = cues[index + 1];
    if (excludedSet.has(index)) { reasons[index] = "Left unchanged by your choice."; continue; }
    // Include newly introduced overlaps using UPDATED timing in a forward pass.
    if (earlier.end! <= later.start! && !originalPairs.has(index)) continue;
    if (later.start! - earlier.end! >= gap) continue;
    const changedIndex = mode === "shorten" ? index : index + 1;
    if (protectedCues.has(changedIndex)) { reasons[index] = "This cue is also part of an excluded overlap. Its timing was left unchanged."; continue; }
    const candidate = { ...cues[changedIndex], startDraft: undefined, endDraft: undefined };
    if (mode === "shorten") {
      candidate.end = later.start! - gap;
      if (candidate.end - candidate.start! < MIN_REPAIR_DURATION_MS) { reasons[index] = `Cue ${index + 1} is too short to safely shorten. At least 0.1s must remain.`; continue; }
    } else {
      const shift = earlier.end! + gap - later.start!;
      candidate.start = later.start! + shift;
      candidate.end = later.end! + shift;
      if (candidate.end > MAX_TIMESTAMP_MS) { reasons[index] = `Moving cue ${index + 2} would go beyond 99:59:59,999. Edit this timing manually.`; continue; }
    }
    if (!inlineTimesFit(candidate, document.format)) { reasons[index] = `Cue ${changedIndex + 1} contains inline VTT timing that would fall outside the new cue. Review it in the Subtitle Editor; caption content was kept unchanged.`; continue; }
    cues[changedIndex] = candidate;
  }
  // A blocked cascade must not leave a moved start past an unchanged following
  // start. Restore preceding moves backwards, retaining source order and valid VTT.
  if (mode === "move") {
    for (let index = cues.length - 1; index > 0; index--) {
      if (cues[index - 1].start! > cues[index].start!) {
        cues[index - 1] = { ...document.cues[index - 1] };
        reasons[index - 2] = "A following cue could not be moved safely. This move was undone to keep the timeline in order. Review the remaining conflict.";
      }
    }
  }
  const fixedDocument = { ...document, cues };
  validateOverlapDocument(fixedDocument);
  const remaining = detectOverlaps(fixedDocument), remainingPairs = new Set(remaining.map((issue) => issue.index));
  return { document: fixedDocument, original, remaining, reasons, excluded: [...excludedSet], fixed: original.filter((issue) => !remainingPairs.has(issue.index)).length, changedCues: cues.filter((cue, index) => cue.start !== document.cues[index].start || cue.end !== document.cues[index].end).length, mode, gap };
}

export function overlapFilename(document: EditorDocument): string { return `${document.filename.replace(/\.(srt|vtt)$/i, "") || "subtitles"}-fixed.${document.format}`; }
export function serializeOverlapRepair(source: EditorDocument, result: OverlapRepair): string {
  validateOverlapDocument(result.document);
  if (source.format !== result.document.format || source.cues.length !== result.document.cues.length || source.cues.some((cue, index) => cue.text !== result.document.cues[index].text || cue.id !== result.document.cues[index].id)) throw new Error("Subtitle content or format changed unexpectedly. Choose the file again before downloading.");
  const actual = detectOverlaps(result.document);
  if (JSON.stringify(actual) !== JSON.stringify(result.remaining)) throw new Error("The overlap summary no longer matches this output. Run the fix again.");
  return exportEditor(result.document, source.format);
}
