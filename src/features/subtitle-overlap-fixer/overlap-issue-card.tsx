import { Icon } from "@/components/ui/icon";
import { formatEditorTime, type EditorDocument } from "@/lib/subtitle-editor";
import type { OverlapIssue, OverlapRepair } from "@/lib/subtitle-overlap";
import { OverlapTimingVisual } from "./overlap-timing-visual";

export function OverlapIssueCard({ issue, number, source, result, excluded, generated = false, onToggle }: { issue: OverlapIssue; number: number; source: EditorDocument; result: OverlapRepair | null; excluded: boolean; generated?: boolean; onToggle: () => void }) {
  const { index } = issue;
  const earlier = source.cues[index], later = source.cues[index + 1];
  const fixedEarlier = result?.document.cues[index], fixedLater = result?.document.cues[index + 1];
  const remaining = result?.remaining.find((entry) => entry.index === index);
  const resolved = !!result && !remaining;
  const reason = result?.reasons[index];
  const start = Math.min(earlier.start!, fixedEarlier?.start ?? earlier.start!);
  const end = Math.max(earlier.end!, later.end!, fixedEarlier?.end ?? 0, fixedLater?.end ?? 0);
  function timing(after: boolean) {
    const first = after ? fixedEarlier! : earlier, second = after ? fixedLater! : later;
    const separated = first.end! <= second.start!;
    return <div className="overlap-comparison-side"><h4>{after ? "After fix" : "Before"}</h4><div className="overlap-time-pair"><div><strong>Subtitle {index + 1}</strong><span>Ends at</span><time>{formatEditorTime(first.end!, source.format)}</time></div><Icon name="arrow" size={18} /><div><strong>Subtitle {index + 2}</strong><span>Starts at</span><time>{formatEditorTime(second.start!, source.format)}</time></div></div><OverlapTimingVisual earlier={first} later={second} start={start} end={end} resolved={separated} /><p className={`overlap-pair-state ${after && resolved ? "is-resolved" : ""}`}><Icon name={separated ? "check" : "warning"} size={16} />{after ? resolved ? `Resolved · Gap: ${((second.start! - first.end!) / 1000).toFixed(3).replace(/\.?0+$/, "") || "0"}s` : `${remaining ? `${remaining.milliseconds / 1000}s overlap remains` : "Needs review"}` : separated ? `Original gap: ${(second.start! - first.end!) / 1000}s` : `${(first.end! - second.start!) / 1000}s overlap`}</p></div>;
  }
  return <article className={`overlap-issue ${resolved ? "is-resolved" : ""}`} id={`overlap-issue-${index}`} tabIndex={-1} aria-labelledby={`overlap-title-${index}`}><header><h3 id={`overlap-title-${index}`}>Overlap {number}{generated ? " · New conflict" : ""}</h3><span className={`overlap-state ${resolved ? "is-resolved" : ""}`}>{result ? resolved ? "Resolved" : excluded ? "Left unchanged" : "Needs review" : `${issue.milliseconds / 1000}s overlap`}</span></header>
    <div className={`overlap-before-after ${result ? "has-result" : ""}`}>{timing(false)}{result && <><div className="overlap-result-arrow"><Icon name="arrow" size={22} /></div>{timing(true)}</>}</div>
    {reason && <p className="overlap-review-reason"><Icon name="info" size={16} />{reason}</p>}
    <footer>{generated ? <p className="overlap-controls-note">A neighboring move created this conflict. Review exclusions or undo the fixes.</p> : <label className="overlap-include"><input type="checkbox" checked={!excluded} onChange={onToggle} aria-label={`Fix overlap ${number} between subtitles ${index + 1} and ${index + 2}`} />Fix this overlap</label>}<details><summary>Show subtitle text</summary><div><p><strong>Subtitle {index + 1}</strong></p><p dir="auto">{earlier.text}</p><p><strong>Subtitle {index + 2}</strong></p><p dir="auto">{later.text}</p></div></details></footer>
  </article>;
}
