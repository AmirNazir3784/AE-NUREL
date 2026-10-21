import { emptyEditor, type EditorDocument } from "../../lib/subtitle-editor.ts";
import type { TimedText } from "../local-asr/asr-core.ts";

export const LYRIC_TEXT_LIMIT = 10000;
const tokens = (text: string) => (text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}\p{M}]+(?:['’][\p{L}\p{N}\p{M}]+)*/gu) ?? []).map(word => word.replace(/[^\p{L}\p{N}\p{M}]/gu, ""));
export function lyricLines(text: string) {
  if (text.length > LYRIC_TEXT_LIMIT) throw new Error("Use up to 10,000 characters of lyrics.");
  const lines = text.replace(/\r\n?/gu, "\n").split("\n").map(line => line.trim()).filter(Boolean);
  if (!lines.length || lines.length > 250 || lines.some(line => !tokens(line).length || line.length > 2000) || tokens(text).length > 2500) throw new Error("Enter up to 250 lyric lines, with words on each line.");
  return lines;
}

/** Conservative ASR-assisted correspondence, not a singing forced aligner.
 * Every timed line must exactly match a chronological sequence of acoustically
 * measured model spans. Missing words/line boundaries remain explicitly untimed.
 * Never distribute lines or words evenly over the song or instrumental gaps.
 */
export function alignProvidedLyrics(text: string, words: readonly TimedText[], duration: number, filename: string) {
  const lines = lyricLines(text);
  if (!Number.isFinite(duration) || duration <= 0 || words.length > 10000) throw new Error("Invalid recording or word alignment.");
  const observed: { text: string; start: number; end: number; first: boolean; last: boolean }[] = [];
  let previous = 0;
  for (const word of words) {
    const [start, end] = word.timestamp;
    if (start === null || end === null || !Number.isFinite(start) || !Number.isFinite(end) || start < previous || end <= start || end > duration + .001) throw new Error("The recording did not return valid measured word timing.");
    previous = end;
    const parts = tokens(word.text);
    for (const [index, part] of parts.entries()) observed.push({ text: part, start: Math.round(start * 1000), end: Math.round(end * 1000), first: index === 0, last: index === parts.length - 1 });
  }
  if (observed.length > 10000) throw new Error("Too many recognized words. Use a shorter recording.");
  let cursor = 0, endTime = 0;
  const missing: number[] = [];
  const document: EditorDocument = { ...emptyEditor(), filename: filename.replace(/\.[^.]+$/u, "") + "-lyrics.srt", cues: lines.map((line, index) => {
    const expected = tokens(line); let found = -1;
    for (let start = cursor; start + expected.length <= observed.length; start++) {
      const last = observed[start + expected.length - 1];
      if (!observed[start].first || !last.last || observed[start].start < endTime) continue;
      if (!expected.every((token, offset) => token === observed[start + offset].text)) continue;
      let gap = false;
      for (let offset = 1; offset < expected.length; offset++) if (observed[start + offset].start - observed[start + offset - 1].end > 1500) { gap = true; break; }
      if (!gap) { found = start; break; }
    }
    if (found < 0) { missing.push(index + 1); return { id: `lyric-${index + 1}`, text: line, start: null, end: null, srtSettings: "", vttSettings: "", identifier: "" }; }
    const start = observed[found].start, end = observed[found + expected.length - 1].end;
    cursor = found + expected.length; endTime = end;
    return { id: `lyric-${index + 1}`, text: line, start, end, srtSettings: "", vttSettings: "", identifier: "" };
  }) };
  // An untimed earlier line cannot be silently replaced by a later occurrence.
  // All supplied lines remain in order; the editor blocks export until fixed.
  return { document, missing, matched: lines.length - missing.length };
}
