import type { EditorCue } from "@/lib/subtitle-editor";

export function OverlapTimingVisual({ earlier, later, start, end, resolved }: { earlier: EditorCue; later: EditorCue; start: number; end: number; resolved: boolean }) {
  const span = Math.max(1, end - start);
  return <div className={`overlap-bars ${resolved ? "is-resolved" : ""}`} aria-hidden="true">{[earlier, later].map((cue, index) => <div className="overlap-bar-track" key={index}><span className={`overlap-bar overlap-bar-${index}`} style={{ left: `${Math.max(0, (cue.start! - start) / span * 100)}%`, width: `${Math.max(0.8, (cue.end! - cue.start!) / span * 100)}%` }} /></div>)}<span className="overlap-bar-caption">{resolved ? "Separated timing" : "Shared time"}</span></div>;
}
