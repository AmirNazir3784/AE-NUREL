import { useMemo, useRef, useState } from "react";
import { formatEditorTime, type EditorDocument } from "@/lib/subtitle-editor";
import type { SyncField, SyncPoint } from "@/lib/subtitle-sync";
import { Icon } from "@/components/ui/icon";

const CUES_PER_PICKER_PAGE = 8;
export function SyncPointControl({ index, document, point, errors, onChange, onCue }: {
  index: 0 | 1; document: EditorDocument; point: SyncPoint; errors: Partial<Record<SyncField, string>>;
  onChange: (field: "current" | "correct", value: string) => void; onCue: (id: string, current: string) => void;
}) {
  const name = index === 0 ? "first" : "second";
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const disclosure = useRef<HTMLDetailsElement>(null);
  const records = useMemo(() => document.cues.map((cue, i) => ({ id: cue.id, number: i + 1, time: formatEditorTime(cue.start!, document.format), text: cue.text, search: `${i + 1} ${cue.text}`.toLocaleLowerCase() })), [document.cues, document.format]);
  const matches = useMemo(() => records.filter((cue) => cue.search.includes(query.toLocaleLowerCase()) || cue.time.includes(query)), [records, query]);
  const pages = Math.max(1, Math.ceil(matches.length / CUES_PER_PICKER_PAGE)), current = Math.min(page, pages - 1);
  const selected = records.find((cue) => cue.id === point.cueId);
  return <fieldset className="sync-point"><legend><span className="step-number">{index + 1}</span>{index === 0 ? "Early reference" : "Late reference"}</legend>
    <details className="sync-cue-picker" ref={disclosure}><summary><Icon name="subtitle" size={17} /><span>{selected ? `Subtitle ${selected.number} — ${selected.text.replace(/\s+/g, " ").slice(0, 70)}` : "Choose a subtitle"}</span><Icon name="chevron" size={16} /></summary>
      <div className="sync-picker-body"><label htmlFor={`${name}-cue-find`}>Find a subtitle for the {name} point</label><input id={`${name}-cue-find`} type="search" value={query} placeholder="Search text, subtitle number or time" onChange={(event) => { setQuery(event.target.value); setPage(0); }} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} />
        <div className="sync-picker-results">{matches.slice(current * CUES_PER_PICKER_PAGE, (current + 1) * CUES_PER_PICKER_PAGE).map((cue) => <button key={cue.id} type="button" aria-pressed={cue.id === point.cueId} onClick={() => { onCue(cue.id, cue.time); if (disclosure.current) { disclosure.current.open = false; disclosure.current.querySelector("summary")?.focus(); } }}><span><strong>Subtitle {cue.number}</strong><time>{cue.time}</time></span><span>{cue.text.replace(/\s+/g, " ").slice(0, 100)}</span></button>)}{!matches.length && <p role="status">No matching subtitles. Try another word, or enter the current time below.</p>}</div>
        <div className="sync-picker-pages"><button type="button" disabled={!current} onClick={() => setPage(current - 1)} aria-label={`Previous subtitles for ${name} point`}>Previous</button><span role="status">{matches.length} matches · {current + 1} / {pages}</span><button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label={`Next subtitles for ${name} point`}>Next</button></div>
      </div>
    </details>
    <div className="sync-time-fields">{(["current", "correct"] as const).map((field) => {
      const id: SyncField = `${name}-${field}`;
      return <div key={field}><label htmlFor={id}>{field === "current" ? "Subtitle time" : "Should appear at"}<span className="sr-only"> for {name} sync point</span></label><input id={id} type="text" spellCheck={false} autoComplete="off" value={point[field]} placeholder={formatEditorTime(0, document.format)} onChange={(event) => onChange(field, event.target.value)} aria-invalid={!!errors[id]} aria-describedby={`${id}-help${errors[id] ? ` ${id}-error` : ""}`} /><p className="field-note" id={`${id}-help`}>{field === "current" ? "Choose a subtitle above, or enter its time." : "When this subtitle should appear in your video."}</p>{errors[id] && <p className="field-error" id={`${id}-error`}>{errors[id]}</p>}</div>;
    })}</div>
  </fieldset>;
}
