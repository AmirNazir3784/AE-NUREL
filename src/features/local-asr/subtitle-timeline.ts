import type { TimedText } from "./asr-core.ts";
import { SECTION_SECONDS, SECTION_OVERLAP, validateSubtitleDuration } from "./subtitle-capabilities.ts";
import { textSeparator } from "./text-boundaries.ts";

export type AudioSection = { index: number; start: number; end: number; coreStart: number; coreEnd: number };
export function audioSections(duration: number): AudioSection[] {
  validateSubtitleDuration(duration);
  return Array.from({ length: Math.ceil(duration / SECTION_SECONDS) }, (_, index) => ({
    index, coreStart: index * SECTION_SECONDS, coreEnd: Math.min(duration, (index + 1) * SECTION_SECONDS),
    start: Math.max(0, index * SECTION_SECONDS - SECTION_OVERLAP), end: Math.min(duration, (index + 1) * SECTION_SECONDS + SECTION_OVERLAP),
  }));
}
const normalized = (text: string) => text.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{Z}\s]/gu, "");
export function absoluteWords(words: readonly TimedText[], section: AudioSection): TimedText[] {
  let previous = 0;
  return words.filter(word => word.text.trim()).map(word => {
    const [start, end] = word.timestamp;
    if (start === null || end === null || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || start < previous || end > section.end - section.start + .1) throw new Error(`Section ${section.index + 1} returned invalid word timing. Retry this section; no timing was invented.`);
    previous = end;
    return { text: word.text, timestamp: [start + section.start, Math.min(section.end, end + section.start)] };
  });
}

// Stitch at a word recognized by both windows, near the ownership boundary.
// Keep one copy of the shared context. No sentence is split on estimated timings.
export function mergeSection(previous: readonly TimedText[], incoming: readonly TimedText[], section: AudioSection): TimedText[] {
  const current = absoluteWords(incoming, section);
  if (!previous.length || !current.length) return [...previous, ...current];
  const candidates: { left: number; right: number; score: number }[] = [];
  for (let left = previous.length - 1; left >= 0 && previous[left].timestamp[1]! >= section.start; left--) {
    for (let right = 0; right < current.length && current[right].timestamp[0]! <= section.coreStart + SECTION_OVERLAP; right++) {
      if (!normalized(previous[left].text) || normalized(previous[left].text) !== normalized(current[right].text) || Math.abs(previous[left].timestamp[0]! - current[right].timestamp[0]!) > 1) continue;
      // Prefer a phrase match; a single repeated word should not swallow a sentence.
      let matches = 1;
      for (let n = 1; n <= 4 && left + n < previous.length && right + n < current.length; n++) {
        if (normalized(previous[left + n].text) !== normalized(current[right + n].text) || Math.abs(previous[left + n].timestamp[0]! - current[right + n].timestamp[0]!) > 1) break;
        matches++;
      }
      if (matches >= 2 || Math.abs(previous[left].timestamp[0]! - current[right].timestamp[0]!) <= .15) candidates.push({ left, right, score: matches * 10 - Math.abs(current[right].timestamp[0]! - section.coreStart) });
    }
  }
  // Two windows can align the same phrase slightly differently. Prefer a
  // shared word whose preceding measured span already ends before it starts.
  const cleanSeam = (candidate: typeof candidates[number]) => candidate.left === 0 || previous[candidate.left - 1].timestamp[1]! <= current[candidate.right].timestamp[0]!;
  candidates.sort((a, b) => Number(cleanSeam(b)) - Number(cleanSeam(a)) || b.score - a.score);
  let merged: TimedText[];
  if (candidates.length) {
    const anchor = candidates[0];
    merged = [...previous.slice(0, anchor.left), ...current.slice(anchor.right)];
  } else {
    // With no shared words, disjoint speech can be safely joined. Conflicting
    // hypotheses are surfaced, never silently dropped using a midpoint filter.
    if (current[0].timestamp[0]! < previous.at(-1)!.timestamp[1]!) throw new Error(`Speech disagrees at section ${section.index + 1}'s boundary. Retry or use a clearer recording; completed sections are kept.`);
    merged = [...previous, ...current];
  }
  // Apply the same conservative measured-span grouping at the seam as inside
  // a section. Both words remain; no timestamp boundary is fabricated.
  merged = normalizeWordAlignment(merged, section.end).chunks;
  for (let i = 1; i < merged.length; i++) {
    if (merged[i].timestamp[0]! < merged[i - 1].timestamp[1]!) throw new Error(`Overlapping word timings at section ${section.index + 1} (${merged[i - 1].timestamp[1]!.toFixed(3)}s / ${merged[i].timestamp[0]!.toFixed(3)}s). Completed sections are kept for retry.`);
  }
  return merged;
}

// Word aligners can put punctuation or a subword at a zero-length interval.
// Attach it to an adjacent measured word instead of inventing a duration.
export function coalesceWordTimings(words: readonly TimedText[]): TimedText[] {
  const output: TimedText[] = [];
  let prefix = "";
  for (const word of words) {
    const [start, end] = word.timestamp;
    if (start !== null && end !== null && Number.isFinite(start) && start === end && start >= 0) {
      const last = output.at(-1);
      if (last && Math.abs(last.timestamp[1]! - start) <= .02) last.text += word.text;
      else prefix += word.text;
    } else { output.push({ text: prefix + word.text, timestamp: [...word.timestamp] }); prefix = ""; }
  }
  if (prefix) throw new Error("The final word has no usable timing. Retry this section.");
  return output;
}

export function normalizeWordAlignment(words: readonly TimedText[], duration: number, allowTruncatedContext = false) {
  let joined = 0, clipped = 0;
  const bounded: TimedText[] = [];
  for (const word of words) {
    const [start, end] = word.timestamp;
    // A partial word at a non-final context edge is owned by the following
    // overlapping section, which has the complete phoneme and its timing.
    if (allowTruncatedContext && start !== null && Number.isFinite(start) && start >= duration - 1.5 && (end === null || start === end)) { clipped++; continue; }
    // Whisper pads its last context window. Tokens wholly in that padding have
    // no supporting audio; never include them in an original-media subtitle.
    if (start !== null && Number.isFinite(start) && start >= duration) { clipped++; continue; }
    if (end !== null && Number.isFinite(end) && end > duration) {
      if (end > duration + 1.5) throw new Error("Word alignment extends too far beyond this audio section. Retry this section.");
      bounded.push({ ...word, timestamp: [start, duration] }); clipped++;
    } else bounded.push(word);
  }
  const output: TimedText[] = [];
  for (const word of coalesceWordTimings(bounded)) {
    const previous = output.at(-1);
    const [start, end] = word.timestamp;
    if (previous && start !== null && end !== null && previous.timestamp[1] !== null && start < previous.timestamp[1] && previous.timestamp[1] - start <= .12 && start >= previous.timestamp[0]! && end > previous.timestamp[1]) {
      // Adjacent alignments can overlap by a few 20 ms frames. Keep both words
      // in one measured span, rather than fabricating a new boundary between them.
      previous.text += textSeparator(previous.text, word.text.trimStart()) + word.text.trimStart();
      previous.timestamp[1] = end; joined++;
    } else output.push({ text: word.text, timestamp: [...word.timestamp] });
  }
  return { chunks: output, joined, clipped };
}
