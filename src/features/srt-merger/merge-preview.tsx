import { Icon } from "@/components/ui/icon";
import { formatTimestamp } from "@/lib/srt";
import type { MergeResult } from "@/lib/srt-merge";
export function MergePreview({ result }: { result: MergeResult | null; busy: boolean; fileCount: number; blocked: boolean }) {
  if (!result) return null;
  return <section className="v1-join-inspection" aria-labelledby="merge-preview-title"><h2 id="merge-preview-title">Check the file joins</h2><div className="v1-join-list">{result.parts.slice(1).map((next,index) => <article className="v1-join" key={index} aria-label={"Join " + (index+1)}><div><strong>{result.parts[index].name}</strong><span>Ends at <time>{formatTimestamp(result.parts[index].last.end)}</time></span></div><Icon name="arrow" size={20} /><div><strong>{next.name}</strong><span>Starts at <time>{formatTimestamp(next.first.start)}</time></span></div><p>Added gap: {result.gap / 1000}s</p></article>)}</div></section>;
}
