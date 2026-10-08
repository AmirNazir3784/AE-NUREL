import { adjustCue, formatTimestamp, type SrtDocument } from "@/lib/srt";
export function SubtitlePreview({ document, offset, offsetError, loading }: { document: SrtDocument | null; offset: number; offsetError?: string; loading?: boolean }) {
  if (!document || loading) return null;
  return <section className="v1-timing-check" aria-labelledby="timing-check-title"><h2 id="timing-check-title">Check the timing change</h2>{document.cues.slice(0,2).map((subtitle,index) => { const adjusted = offsetError ? null : adjustCue(subtitle,offset); return <div key={index}><span>Subtitle {index+1}</span><div><span>Original</span><time>{formatTimestamp(subtitle.start)} → {formatTimestamp(subtitle.end)}</time></div><div><span>Adjusted</span><time>{adjusted ? formatTimestamp(adjusted.start)+" → "+formatTimestamp(adjusted.end) : "Enter valid seconds"}</time></div></div>; })}</section>;
}
