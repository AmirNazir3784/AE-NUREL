import { memo } from "react";
import { canNudge, formatEditorTime, type CueIssues, type EditorCue, type SubtitleFormat } from "@/lib/subtitle-editor";
import { Icon } from "@/components/ui/icon";

export const CueEditor = memo(function CueEditor({ cue, number, format, issues, busy, onEdit, onCommit, onNudge, onAdd, onDelete, onFocus, onLeave }: {
  cue: EditorCue; number: number; format: SubtitleFormat; issues: CueIssues; busy: boolean;
  onEdit: (id: string, field: "text" | "start" | "end", value: string) => void; onCommit: () => void;
  onNudge: (id: string, offset: number) => void; onAdd: (id: string) => void; onDelete: (id: string) => void; onFocus: (id: string) => void; onLeave: (id: string) => void;
}) {
  const errorId = `${cue.id}-issues`;
  return <article className={`editor-cue ${issues.errors.length ? "has-errors" : issues.warnings.length ? "has-warnings" : ""}`} aria-label={`Cue ${number}`} onFocus={() => onFocus(cue.id)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onLeave(cue.id); }}>
    <div className="editor-cue-heading"><h3>Subtitle {number}</h3><span className={`editor-cps speed-${issues.speed}`} title="Visible Unicode characters, with markup removed and whitespace collapsed, divided by duration in seconds.">{issues.cps === null ? "CPS: —" : `${issues.cps.toFixed(1)} CPS · ${issues.speed === "normal" ? "Comfortable" : issues.speed === "caution" ? "Caution" : "Fast"}`}</span></div>
    <div className="editor-cue-content"><div className="editor-cue-times">{(["start", "end"] as const).map((field) => <div key={field}><label htmlFor={`${cue.id}-${field}`}>{field === "start" ? "Start" : "End"}<span className="sr-only"> for subtitle {number}</span></label><input id={`${cue.id}-${field}`} type="text" spellCheck={false} autoComplete="off" disabled={busy} value={cue[`${field}Draft`] ?? (cue[field] === null ? "" : formatEditorTime(cue[field], format))} onChange={(event) => onEdit(cue.id, field, event.target.value)} onBlur={onCommit} aria-invalid={cue[field] === null || issues.errors.some((error) => error.startsWith("End must"))} aria-describedby={`${cue.id}-time-help ${errorId}`} /></div>)}<p id={`${cue.id}-time-help`} className="sr-only">{format === "srt" ? "HH:MM:SS,mmm" : "HH:MM:SS.mmm"}; hours, minutes, seconds and milliseconds.</p></div>
      <div className="editor-cue-text"><label htmlFor={`${cue.id}-text`}>Subtitle text<span className="sr-only"> for subtitle {number}</span></label><textarea id={`${cue.id}-text`} dir="auto" rows={3} disabled={busy} value={cue.text} onChange={(event) => onEdit(cue.id, "text", event.target.value)} onBlur={onCommit} aria-describedby={errorId} /></div>
    </div>
    <div className="editor-cue-actions"><div className="editor-nudges" role="group" aria-label={`Shift cue ${number}`}>{[-1000, -500, 500, 1000].map((offset) => <button key={offset} type="button" disabled={busy || !canNudge(cue, offset)} aria-label={`Shift cue ${number} ${Math.abs(offset) / 1000} seconds ${offset < 0 ? "earlier" : "later"}`} title={!canNudge(cue, offset) ? "Fix the timing, or choose a shift that stays within the timeline." : "Shift start and end together"} onClick={() => onNudge(cue.id, offset)}>{offset > 0 ? "+" : ""}{offset / 1000}s</button>)}</div><div className="editor-row-buttons"><button className="text-button" type="button" disabled={busy} aria-label={`Add subtitle below subtitle ${number}`} onClick={() => onAdd(cue.id)}>Add below</button><button className="text-button destructive-action" type="button" disabled={busy} aria-label={`Delete cue ${number}`} onClick={() => onDelete(cue.id)}><Icon name="close" size={14} />Delete</button></div></div>
    <div id={errorId} className="editor-cue-issues" aria-live="polite">{issues.errors.map((error) => <p className="editor-cue-error" key={error}><Icon name="close" size={14} />{error}</p>)}{issues.warnings.map((warning) => <p key={warning}><Icon name="warning" size={14} />{warning}</p>)}</div>
  </article>;
});

