import type { EditorCue } from "../../lib/subtitle-editor.ts";
import { displayWidth } from "./subtitle-segmentation.ts";

// Advisory only. Export blockers remain the editor and source-coverage checks.
export function captionReviewHints(cue: EditorCue): string[] {
  const hints: string[] = [], lines = cue.text.split(/\r?\n/u);
  if (lines.length > 2 || lines.some(line => displayWidth(line, "en") > 46)) hints.push("This caption is long. Try a shorter line break.");
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(cue.text);
  const letters = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(cue.text.replace(/\s/gu, ""))].length;
  if (cue.start !== null && cue.end !== null && cue.end > cue.start && letters / ((cue.end - cue.start) / 1000) > (cjk ? 12 : 20)) hints.push("Check reading time against the recording.");
  return hints;
}

export function processingReviewNotes(warnings: readonly string[]): string[] {
  return [...new Set(warnings.flatMap(warning => {
    if (warning.includes("captions are too dense")) return []; // Current caption hints cover this.
    if (/recovery storage/i.test(warning)) return ["Keep this tab open. Recovery after a refresh is unavailable in this browser."];
    if (/cach/i.test(warning)) return ["Processing files may need to be downloaded again next time."];
    if (/GPU|CPU/u.test(warning)) return ["Processing switched to a compatible mode."];
    if (/alignment|context edge/i.test(warning)) return ["Check caption timing against the recording."];
    if (/retrying/i.test(warning)) return ["An interrupted section was retried. Completed work was kept."];
    return ["Check the captions against your recording."];
  }))];
}
