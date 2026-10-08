import { useMemo, useState } from "react";
import type { EditorDocument } from "@/lib/subtitle-editor";
import type { OverlapIssue, OverlapRepair } from "@/lib/subtitle-overlap";
import { OverlapIssueCard } from "./overlap-issue-card";

export function OverlapIssueList({ source, issues, result, excluded, onToggle }: { source: EditorDocument; issues: OverlapIssue[]; result: OverlapRepair | null; excluded: number[]; onToggle: (index: number) => void }) {
  const [all, setAll] = useState(false), [unresolved, setUnresolved] = useState(false), [focus, setFocus] = useState(0);
  const originalPairs = useMemo(() => new Set(issues.map((issue) => issue.index)), [issues]);
  const remainingPairs = useMemo(() => new Set(result?.remaining.map((issue) => issue.index)), [result]);
  const entries = useMemo(() => [...issues, ...(result?.remaining.filter((issue) => !originalPairs.has(issue.index)) ?? [])], [issues, result, originalPairs]);
  const filtered = unresolved && result ? entries.filter((issue) => remainingPairs.has(issue.index)) : entries;
  const current = Math.min(focus, Math.max(0, filtered.length - 1));
  const perPage = all ? 25 : 5, page = Math.floor(current / perPage);
  const visible = filtered.slice(page * perPage, (page + 1) * perPage);
  function navigate(next: number) { setFocus(next); requestAnimationFrame(() => window.document.getElementById(`overlap-issue-${filtered[next]?.index}`)?.focus()); }
  return <section className="overlap-review" aria-labelledby="overlap-review-title"><div className="overlap-review-heading"><div><h2 id="overlap-review-title">Review overlaps</h2></div>{result && <label className="overlap-filter"><input type="checkbox" checked={unresolved} onChange={(event) => { setUnresolved(event.target.checked); setFocus(0); }} />Show only unresolved</label>}</div>
    <nav className="overlap-issue-nav" aria-label="Overlap issue navigation"><button className="button button-secondary" type="button" disabled={!current} onClick={() => navigate(current - 1)}>Previous issue</button><span role="status">{filtered.length ? `Issue ${current + 1} of ${filtered.length}` : "No unresolved overlaps"}</span><button className="button button-secondary" type="button" disabled={current >= filtered.length - 1} onClick={() => navigate(current + 1)}>Next issue</button></nav>
    {visible.map((issue) => <OverlapIssueCard key={issue.index} issue={issue} number={entries.findIndex((entry) => entry.index === issue.index) + 1} source={source} result={result} excluded={excluded.includes(issue.index)} generated={!originalPairs.has(issue.index)} onToggle={() => onToggle(issue.index)} />)}
    {!filtered.length && <p className="overlap-all-clear">Every detected overlap has been resolved.</p>}
    {!all && filtered.length > 5 && <button className="button button-secondary overlap-show-all" type="button" onClick={() => setAll(true)}>Show all {filtered.length} overlaps</button>}
    {all && filtered.length > 25 && <p className="overlap-list-note">Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)}. Use issue navigation to review every overlap.</p>}
  </section>;
}
