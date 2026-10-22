import { Icon } from "@/components/ui/icon";
import { formatTimestamp } from "@/lib/srt";
import type { MergeResult } from "@/lib/srt-merge";
export function MergePreview({ result }: { result: MergeResult | null; busy: boolean; fileCount: number; blocked: boolean }) {
  if (!result) return null;
  return <section className="v1-join-inspection" aria-labelledby="merge-preview-title"><h2 id="merge-preview-title">Check the file joins</h2><div className="v1-join-list">{result.parts.slice(1).map((next,index) => <article className="v1-join" key={index} aria-label={"Join " + (index+1)}><div className="vj-row"><strong>{result.parts[index].name}</strong><span>Ends at <time>{formatTimestamp(result.parts[index].last.end)}</time></span></div><div className="vj-link"><span className="vj-arrow"><Icon name="arrow" size={16} /></span><span className="vj-gap">Added gap: {result.gap / 1000}s</span></div><div className="vj-row"><strong>{next.name}</strong><span>Starts at <time>{formatTimestamp(next.first.start)}</time></span></div></article>)}</div><p className="v1-join-note">Joins use the previous file’s last subtitle, plus the added gap, and its original lead-in is kept.<br />SRT files do not contain the full video-part duration.</p></section>;
}
