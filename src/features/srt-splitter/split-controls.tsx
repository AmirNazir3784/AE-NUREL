import type { SplitMethod, TimestampMode } from "@/lib/srt-split";
import { Icon } from "@/components/ui/icon";

const methods: { id: SplitMethod; label: string; field: string; unit: string }[] = [
  { id: "parts", label: "Number of parts", field: "Number of parts", unit: "parts" },
  { id: "cues", label: "Subtitles per file", field: "Subtitles per file", unit: "subtitles" },
  { id: "time", label: "Time interval", field: "Split every", unit: "minutes" },
];

export function SplitControls({ method, value, timestamps, disabled, error, onMethod, onValue, onTimestamps }: {
  method: SplitMethod; value: string; timestamps: TimestampMode; disabled: boolean; error: string;
  onMethod: (method: SplitMethod) => void; onValue: (value: string) => void; onTimestamps: (value: TimestampMode) => void;
}) {
  const selected = methods.find((item) => item.id === method)!;
  return <fieldset className="offset-control split-controls" disabled={disabled}>
    <legend className="section-label">Choose how to split</legend>
    <div className="split-methods" role="group" aria-label="Split method">{methods.map((item) => <button key={item.id} type="button" aria-pressed={method === item.id} onClick={() => onMethod(item.id)}>{item.label}</button>)}</div>
    <label className="field-label" htmlFor="split-value">{selected.field}</label>
    <div className={`offset-input ${error ? "invalid" : ""}`}><Icon name={method === "time" ? "clock" : "srt-split"} /><input id="split-value" type="text" inputMode={method === "time" ? "decimal" : "numeric"} value={value} onChange={(event) => onValue(event.target.value)} aria-invalid={!!error} aria-describedby={`split-help${error ? " split-error" : ""}`} autoComplete="off" spellCheck={false} /><span>{selected.unit}</span></div>
    <p id="split-help" className="field-note">{method === "parts" ? "Balanced groups, with up to 100 non-empty parts." : method === "cues" ? "The last file may have fewer subtitles." : "A subtitle belongs to the interval where it starts. Empty intervals are skipped."}</p>
    {error && <p id="split-error" className="field-error" role="alert">{error}</p>}
    <fieldset className="split-timestamps"><legend className="field-label">Subtitle times</legend>
      <label><input type="radio" name="split-timestamps" value="original" checked={timestamps === "original"} onChange={() => onTimestamps("original")} />Keep original times</label>
      <label><input type="radio" name="split-timestamps" value="zero" checked={timestamps === "zero"} onChange={() => onTimestamps("zero")} />Reset times for each part</label>
    </fieldset>
    <p className="field-note">{method === "time" ? "Reset times uses each interval’s beginning, keeping the original lead-in." : "Reset times starts at each part’s first subtitle. This does not identify video cut points."}</p>
  </fieldset>;
}
