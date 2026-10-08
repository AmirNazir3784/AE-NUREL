import { correctionLabel, mapSyncTime, type SyncResult } from "@/lib/subtitle-sync";
import type { EditorDocument } from "@/lib/subtitle-editor";
export function SyncPreview({ source, result }: { source: EditorDocument | null; result: SyncResult | null; busy: boolean }) {
  if (!source || !result) return null;
  const positions=[result.times.sourceFirst,Math.round((result.times.sourceFirst+result.times.sourceSecond)/2),result.times.sourceSecond];
  return <section className="v1-sync-summary" aria-labelledby="sync-preview-title"><h2 id="sync-preview-title">Timing correction</h2><div className="sync-correction-strip">{positions.map((time,index) => <div key={index}><span>{["Early reference","Between references","Late reference"][index]}</span><strong>{correctionLabel(mapSyncTime(time,result.times).time-time)}</strong></div>)}</div><p>{source.cues.length} subtitles corrected. Check the result in your video player.</p></section>;
}
