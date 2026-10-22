import { Icon } from "@/components/ui/icon";
import { formatTimestamp } from "@/lib/srt";
import type { MergeResult } from "@/lib/srt-merge";
export function MergePreview({ result }: { result: MergeResult | null; busy: boolean; fileCount: number; blocked: boolean }) {
  if (!result) return null;
  return <section className="v1-join-inspection" aria-labelledby="merge-preview-title"><h2 id="merge-preview-title">Check the file joins</h2><div className="v1-join-list">{result.parts.slice(1).map((next,index) => <article className="v1-join" key={index} aria-label={"Join " + (index+1)}><strong className="vj-name">{result.parts[index].name}</strong><div className="vj-line"><span>Ends at <time>{formatTimestamp(result.parts[index].last.end)}</time></span><span className="vj-pill">Gap {result.gap / 1000}s</span></div><strong className="vj-name">{next.name}</strong><div className="vj-line"><span className="vj-arrow"><Icon name="arrow" size={14} /></span><span>Starts at <time>{formatTimestamp(next.first.start)}</time></span></div></article>)}</div></section>;
}
