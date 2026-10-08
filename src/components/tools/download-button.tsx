"use client";

import { Icon } from "@/components/ui/icon";

export function DownloadButton({ content, filename, label = "Download file", mimeType = "text/plain;charset=utf-8", disabled, onDownloaded, onError, variant = "primary" }: { content: string | ArrayBuffer | (() => string | ArrayBuffer) | null; filename: string; label?: string; mimeType?: string; disabled?: boolean; onDownloaded: () => void; onError: (message: string) => void; variant?: "primary" | "secondary" }) {
  function download() {
    if (content === null) { onError("Choose a file and enter valid settings first."); return; }
    let url: string | undefined;
    let link: HTMLAnchorElement | undefined;
    try {
      url = URL.createObjectURL(new Blob([typeof content === "function" ? content() : content], { type: mimeType }));
      link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      onDownloaded();
    } catch { onError("The download could not start. Please try again."); }
    finally {
      link?.remove();
      if (url) { const downloadUrl = url; setTimeout(() => URL.revokeObjectURL(downloadUrl), 30_000); }
    }
  }
  return <button type="button" className={`button button-${variant} download-button`} disabled={disabled} onClick={download}><Icon name="download" />{label}</button>;
}
