// Restore tokenizer subwords/punctuation without altering recognized words.
// This applies to all text; it is not a vocabulary or phrase replacement list.
export function textSeparator(left: string, right: string) {
  if (/^[\p{Pe}\p{Pf}.,!?;:،؛。！？、؟]/u.test(right) || /^[-‐‑’']/u.test(right) && /\p{L}$/u.test(left) || /[\p{Ps}\p{Pi}]$/u.test(left)) return "";
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]$/u.test(left) && /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(right)) return "";
  return " ";
}
