"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { MergeFile } from "./session";

export function MergeFileList({ files, onMove, onReorder, onRemove, onReplace, busy }: {
  files: readonly MergeFile[];
  onMove: (id: number, direction: -1 | 1) => void;
  onReorder: (source: number, target: number) => void;
  onRemove: (id: number) => void;
  onReplace: (id: number) => void;
  busy: boolean;
}) {
  const [dragged, setDragged] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  if (!files.length) return null;
  return <div className="merge-list-section"><div className="merge-list-heading"><h3>Merge order</h3><span>{files.length} / 10 files</span></div>
    <p className="field-note">Drag a row, or use the arrows to change the order.</p>
    <ol className="merge-file-list" aria-label="Subtitle files in merge order">{files.map((file, index) => <li key={file.id}
      className={`merge-file-row ${file.status === "invalid" ? "is-invalid" : ""} ${over === file.id ? "drop-target" : ""}`}
      draggable={!busy}
      onDragStart={(event) => { event.dataTransfer.setData("text/plain", String(file.id)); event.dataTransfer.effectAllowed = "move"; setDragged(file.id); }}
      onDragOver={(event) => { if (dragged === null || dragged === file.id) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setOver(file.id); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null); }}
      onDrop={(event) => { if (dragged === null) return; event.preventDefault(); onReorder(dragged, file.id); setDragged(null); setOver(null); }}
      onDragEnd={() => { setDragged(null); setOver(null); }}
    >
      <span className="merge-order" aria-label={`File ${index + 1}`}>{index + 1}</span>
      <div className="merge-file-detail"><strong className="merge-filename">{file.name}</strong>
        <span className="merge-file-meta">{file.status === "ready" ? `${file.document.cues.length} ${file.document.cues.length === 1 ? "subtitle" : "subtitles"} · ` : ""}{file.size < 1024 ? `${file.size} B` : file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB`}<span className={`merge-file-status status-${file.status}`}>{file.status === "ready" ? <><Icon name="check" size={12} />Ready</> : file.status === "reading" ? "Reading…" : "Needs attention"}</span></span>
      </div>
      <div className="merge-row-actions">
        <button type="button" className="merge-icon-button" title="Move up" disabled={index === 0 || busy} aria-label={`Move file ${index + 1}, ${file.name}, up`} onClick={() => onMove(file.id, -1)}><Icon name="chevron" className="point-up" size={17} /></button>
        <button type="button" className="merge-icon-button" title="Move down" disabled={index === files.length - 1 || busy} aria-label={`Move file ${index + 1}, ${file.name}, down`} onClick={() => onMove(file.id, 1)}><Icon name="chevron" size={17} /></button>
        <button type="button" className="merge-icon-button" title="Replace file" disabled={busy} aria-label={`Replace file ${index + 1}, ${file.name}`} onClick={() => onReplace(file.id)}><Icon name="reset" size={16} /></button>
        <button type="button" className="merge-icon-button destructive-action" title="Remove file" aria-label={`Remove file ${index + 1}, ${file.name}`} onClick={() => onRemove(file.id)}><Icon name="close" size={17} /></button>
      </div>
      {file.status === "invalid" && <p className="merge-file-error" role="alert">{file.error}</p>}
    </li>)}</ol>
  </div>;
}
