// Observable preservation checks only. These do not certify meaning, pronouns,
// negation or idioms, and never label a fluent translation semantically correct.
function numericValues(text: string) {
  return new Set([...text.matchAll(/\p{Nd}+/gu)].map(match => [...match[0]].map(char => {
    const point = char.codePointAt(0)!; let first = point;
    while (first > 0 && /\p{Nd}/u.test(String.fromCodePoint(first - 1))) first--;
    return String((point - first) % 10);
  }).join("").replace(/^0+(?=\d)/u, "")));
}
export function preservationIssues(source: string, target: string): string[] {
  const original = numericValues(source), translated = numericValues(target), issues: string[] = [];
  if ([...original].some(value => !translated.has(value))) issues.push("Check numbers against the source: some numeric values were not found in the translated text. Written-out numbers or date formatting may account for this.");
  const identifiers = source.match(/https?:\/\/[^\s]+|[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}|\b\p{L}[\p{L}\p{N}_-]*\d[\p{L}\p{N}_.-]*\b/gu) ?? [];
  if (identifiers.some(value => !target.toLocaleLowerCase("und").includes(value.toLocaleLowerCase("und")))) issues.push("Check technical identifiers, links or addresses against the source; an original identifier was not retained verbatim.");
  return issues;
}
