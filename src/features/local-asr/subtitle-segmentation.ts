import { cleanText } from "./source-sentences.ts";
import { translationCode } from "./translation-core.ts";

type Atom = { text: string; width: number; letters: number };
const wide = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}]/u;
export function displayWidth(text: string, language: string) {
  return [...new Intl.Segmenter(translationCode(language), { granularity: "grapheme" }).segment(text)].reduce((sum, part) => sum + (wide.test(part.segment) ? 2 : 1), 0);
}
function atoms(text: string, language: string): Atom[] {
  // Typography protection, not translation replacements. Preserve identifiers,
  // technical hyphens, numeric notation and common contiguous capitalized names.
  const protectedPattern = /(?:https?:\/\/[^\s]+|[\p{L}\p{N}]+(?:[-‑'’][\p{L}\p{N}]+)+|\d+(?:[.,:/]\d+)+|\b\p{Lu}[\p{L}\p{N}.]*(?: \p{Lu}[\p{L}\p{N}.]*){1,4}\b|\b\p{L}[\p{L}\p{N}]*(?:\+\+|#))/gu;
  const protectedRanges = new Map([...text.matchAll(protectedPattern)].map(match => [match.index!, match[0]]));
  const parts = [...new Intl.Segmenter(translationCode(language), { granularity: "word" }).segment(text)];
  const values: string[] = [];
  let pending = "", until = -1;
  for (const part of parts) {
    if (part.index < until) continue;
    const protectedText = protectedRanges.get(part.index), value = protectedText ?? part.segment;
    if (protectedText) until = part.index + value.length;
    if (/^\s+$/u.test(value)) { pending += value; continue; }
    if (/^[\p{Ps}\p{Pi}"«“]+$/u.test(value)) { pending += value; continue; }
    if (!/[\p{L}\p{N}]/u.test(value)) {
      if (values.length) { values[values.length - 1] += pending + value; pending = ""; }
      else pending += value; // Leading ellipses/dashes belong to the next word.
      continue;
    }
    values.push(pending + value); pending = "";
  }
  if (pending.trim() && values.length) values[values.length - 1] += pending;
  return values.map(value => ({ text: value, width: displayWidth(value, language), letters: [...value.matchAll(/[\p{L}\p{N}]/gu)].length }));
}
// Small grammatical classes, never translations or phrase replacements. These
// are soft layout preferences: they neither alter text nor claim full parsing.
const grammar: Record<string, { attachNext: string; attachPrevious: string; clauses: string; genitive?: string }> = {
  en: { attachNext: "a an the this that these those my your our their of to in with for from is are was were has have had", attachPrevious: "is are was were", clauses: "although because whereas while where which that when if but" },
  de: { attachNext: "der die das den dem des ein eine einer einem einen eines mein meine dein seine ihre mit von zu für im am", attachPrevious: "", clauses: "weil obwohl während aber" },
  es: { attachNext: "el la los las un una unos unas de del al en con por para mi tu su", attachPrevious: "", clauses: "aunque porque pero mientras" },
  ar: { attachNext: "في من إلى على عن مع هذا هذه ذلك تلك", attachPrevious: "", clauses: "لكن بينما عندما" },
  ur: { attachNext: "اس یہ وہ ایک ان اُن اِس", attachPrevious: "کا کی کے کو میں سے تک پر نے لیے لئے ہے ہیں تھا تھے تھی گا گی گے", clauses: "جو جہاں لیکن جبکہ کیونکہ", genitive: "کا کی کے" },
  ja: { attachNext: "", attachPrevious: "は が を に の と で へ も から まで です ます", clauses: "しかし でも" },
};
const word = (atom?: Atom) => atom?.text.trim().replace(/[^\p{L}\p{M}]/gu, "").toLocaleLowerCase() ?? "";
const contains = (list: string | undefined, value: string) => !!value && !!list?.split(" ").includes(value);
function boundaryCost(parts: Atom[], at: number, language: string) {
  if (at === parts.length) return 0;
  const left = parts[at - 1], right = parts[at];
  if (/[.!?。！？؟۔।][\p{Pe}\p{Pf}"']*\s*$/u.test(left.text)) return -30;
  if (/[,;:،؛、]\s*$/u.test(left.text)) return -18;
  const profile = grammar[language], l = word(left), r = word(right);
  let cost = /^(ja|zh|ko)$/.test(language) ? 0 : left.letters <= 2 || right.letters <= 2 ? 90 : 0;
  if (profile) {
    if (contains(profile.attachNext, l) || contains(profile.attachPrevious, r)) cost += 220;
    // A genitive marker followed by a short noun chain is a likely attachment,
    // including unseen compounds. Prefer an earlier clause break, not a split
    // between the first two content words of that chain.
    if (contains(profile.genitive, word(parts[at - 2])) && /\p{Script=Arabic}/u.test(l + r)) cost += 220;
    if (contains(profile.clauses, r)) cost -= 35;
  }
  return cost;
}

export function segmentSubtitleText(raw: string, target: string, durationMs: number, options: { maxCues?: number; cueBreakOffsets?: ReadonlySet<number> } = {}) {
  const text = cleanText(raw), language = translationCode(target), parts = atoms(text, target), cjk = /^(ja|zh|ko)$/.test(language);
  const lineWidth = 42, prefix = [0];
  for (const part of parts) prefix.push(prefix.at(-1)! + part.width);
  const n = parts.length, width = prefix[n];
  const offsets = [0]; for (const part of parts) offsets.push(offsets.at(-1)! + part.text.replace(/\s/gu, "").length);
  const breakCosts = Array.from({ length: n + 1 }, (_, at) => at ? boundaryCost(parts, at, language) : 0);
  const join = (start: number, end: number) => parts.slice(start, end).map(part => part.text).join("").trim();
  const rangeWidth = (start: number, end: number) => prefix[end] - prefix[start] - (parts[start]?.text.match(/^\s*/u)?.[0].length ?? 0);
  const layouts = new Map<string, { text: string; score: number }>();
  function layout(start: number, end: number) {
    const key = `${start}/${end}`, cached = layouts.get(key); if (cached) return cached;
    const total = rangeWidth(start, end);
    let best = { text: join(start, end), score: Math.max(0, total - lineWidth) ** 2 * 6 };
    if (total > lineWidth) for (let at = start + 1; at < end; at++) {
      const a = rangeWidth(start, at), b = rangeWidth(at, end);
      const score = (Math.max(0, a - lineWidth) ** 2 + Math.max(0, b - lineWidth) ** 2) * 6
        + (a - b) ** 2 / 160 + breakCosts[at]
        + (Math.min(a, b) < (cjk ? 8 : 10) ? 500 : 0);
      if (score < best.score) best = { text: join(start, at) + "\n" + join(at, end), score };
    }
    layouts.set(key, best); return best;
  }
  // Jointly optimize cue count, cue boundaries and their best one/two-line
  // layout. Duration alone no longer forces a readable sentence into fragments.
  // Pathological output takes a bounded fallback, preserves text and is flagged.
  const fitsOne = width <= 84 && durationMs <= 8000;
  const maxCount = fitsOne ? 1 : Math.max(1, Math.min(options.maxCues ?? 32, 32, Math.floor(durationMs / 900), Math.floor(n / (cjk ? 4 : 3))));
  const scores = Array.from({ length: maxCount + 1 }, () => new Float64Array(n + 1).fill(Infinity));
  const previous = Array.from({ length: maxCount + 1 }, () => new Int32Array(n + 1).fill(-1));
  scores[0][0] = 0;
  if (n <= 512 && width <= 32 * 110) for (let k = 1; k <= maxCount; k++) for (let end = k; end <= n; end++) {
    if (end !== n && options.cueBreakOffsets && !options.cueBreakOffsets.has(offsets[end])) continue;
    for (let start = end - 1; start >= k - 1; start--) {
      const size = rangeWidth(start, end);
      if (end - start > 128 || size > 110 && end - start > 1) break;
      if (!Number.isFinite(scores[k - 1][start])) continue;
      const seconds = durationMs / 1000 * size / Math.max(1, width);
      const score = scores[k - 1][start] + 45 + layout(start, end).score + breakCosts[end] * 1.4
        + Math.max(0, size - 84) ** 2 * 3 + (size < (cjk ? 12 : 24) && k > 1 ? 400 : 0)
        + Math.max(0, seconds - 8) ** 2 * 12;
      if (score < scores[k][end]) { scores[k][end] = score; previous[k][end] = start; }
    }
  }
  let bestCount = 0;
  for (let k = 1; k <= maxCount; k++) if (Number.isFinite(scores[k][n]) && (!bestCount || scores[k][n] < scores[bestCount][n])) bestCount = k;
  const groups: { start: number; end: number }[] = [];
  if (bestCount) { let end = n; for (let k = bestCount; k > 0; k--) { const start = previous[k][end]; groups.unshift({ start, end }); end = start; } }
  else groups.push({ start: 0, end: n });
  let layoutDense = false;
  const texts = groups.map(group => {
    const lines = layout(group.start, group.end).text.split("\n");
    if (lines.some(line => displayWidth(line, target) > lineWidth + 4) || lines.some(line => !/[\p{L}\p{N}]/u.test(line))) layoutDense = true;
    return lines.join("\n");
  });
  // Normalized character coverage is an invariant; spacing/line breaks are the
  // only permitted layout edits. No orphan fix may remove punctuation or text.
  if (texts.join("").replace(/\s/gu, "") !== text.replace(/\s/gu, "")) throw new Error("Subtitle segmentation changed translated content.");
  return { texts, layoutDense };
}
