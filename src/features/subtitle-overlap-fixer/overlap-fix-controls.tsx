import type { OverlapMode } from "@/lib/subtitle-overlap";
import { Icon } from "@/components/ui/icon";

export function OverlapFixControls({ mode, gap, count, applied, onMode, onGap, onFix }: { mode: OverlapMode; gap: string; count: number; applied: boolean; onMode: (mode: OverlapMode) => void; onGap: (gap: string) => void; onFix: () => void }) {
  return <section className="overlap-controls" aria-labelledby="overlap-controls-title"><h2 id="overlap-controls-title">Choose a repair</h2><form onSubmit={(event) => { event.preventDefault(); onFix(); }}>
    <fieldset className="overlap-modes"><legend className="sr-only">Fix strategy</legend>{([
      ["shorten", "Shorten earlier subtitle", "Ends the earlier subtitle before the next one begins."],
      ["move", "Move later subtitle", "Moves the later subtitle forward while keeping its duration."],
    ] as const).map(([value, title, description]) => <label key={value} className={mode === value ? "is-selected" : ""}><input type="radio" name="overlap-mode" value={value} checked={mode === value} onChange={() => onMode(value)} /><span><strong>{title}</strong><small>{description}</small></span></label>)}</fieldset>
    <div className="overlap-gap-action"><div className="overlap-gap"><label htmlFor="overlap-gap">Minimum gap</label><div className="overlap-gap-input"><input id="overlap-gap" type="text" inputMode="decimal" value={gap} onChange={(event) => onGap(event.target.value)} aria-describedby="overlap-gap-help" /><span>seconds</span></div><p id="overlap-gap-help">Space left between adjacent subtitles. Up to 10s.</p><div className="overlap-gap-presets" aria-label="Quick minimum gaps">{["0", "0.1", "0.2", "0.5"].map((value) => <button type="button" key={value} aria-pressed={gap === value} onClick={() => onGap(value)}>{value}s</button>)}</div></div>
      <div><button type="submit" className={`button ${applied ? "button-secondary" : "button-primary"}`} disabled={!count || applied}><Icon name="subtitle-overlap" />{applied ? "Fixes applied" : `Fix selected overlaps (${count})`}</button><p className="overlap-controls-note">{applied ? "Review the result below. Undo restores the original timing." : "Uncheck any overlaps you want to leave unchanged."}</p></div>
    </div>
  </form></section>;
}
