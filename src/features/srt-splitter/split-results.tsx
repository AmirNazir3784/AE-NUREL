import { DownloadButton } from "@/components/tools/download-button";
import { formatTimestamp } from "@/lib/srt";
import type { SplitResult } from "@/lib/srt-split";
export function SplitResults({ result, onDownloaded, onError }: { result: SplitResult | null; busy: boolean; blocked: boolean; onDownloaded: (filename: string) => void; onError: (message: string) => void }) {
  if (!result) return null;
  return <section className="v1-split-manifest" aria-labelledby="split-results-title"><h2 id="split-results-title">Your output files</h2><p role="status">{result.parts.length} parts · {result.cueCount} subtitles{result.skippedWindows ? " · " + result.skippedWindows + " empty intervals skipped" : ""}</p><ol>{result.parts.map((part) => <li key={part.number}><div><h3>Part {String(part.number).padStart(2,"0")}</h3><span>{part.cues.length} subtitles</span><time>{formatTimestamp(part.start)} → {formatTimestamp(part.end)}</time><small>{part.filename}</small></div><DownloadButton content={part.content} filename={part.filename} label={"Download part " + String(part.number).padStart(2,"0")} mimeType="application/x-subrip;charset=utf-8" variant="secondary" onDownloaded={() => onDownloaded(part.filename)} onError={onError} /></li>)}</ol></section>;
}
