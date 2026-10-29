"use client";
import { useEffect, useRef, useState } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { DownloadButton } from "@/components/tools/download-button";
import { StatusMessage } from "@/components/ui/status-message";
import { validateConversionFile } from "@/lib/subtitle-conversion";
import type { ConversionSession } from "./use-conversion";

export function ConversionInput({ tool, extensions, name, onFile }: { tool: ConversionSession; extensions: readonly string[]; name: string; onFile?: (file: File) => void }) {
  const { state } = tool;
  return <><FileUpload accept={extensions.map(e => "." + e).join(",")} title={"Add your " + name + " file"} description="Choose a file or drop it here." buttonLabel={"Choose " + name + " file"} hint={name + " · up to 10 MB · 10,000 cues"} filename={state.file?.name} detail={state.result ? state.result.cueCount + " cues · Ready" : undefined} busy={state.busy} validateFile={file => validateConversionFile(file, extensions)} onFile={onFile ?? tool.readFile} onError={tool.reject} />
    <p className="aen-local-note">Your original file stays unchanged. No signup required.</p></>;
}
export function ConversionNotices({ tool }: { tool: ConversionSession }) {
  return <>{tool.state.result?.warnings.map(warning => <StatusMessage key={warning} tone="warning">{warning}</StatusMessage>)}{tool.state.error && <StatusMessage tone="error">{tool.state.error}</StatusMessage>}{tool.state.message && <StatusMessage tone="success">{tool.state.message}</StatusMessage>}</>;
}
export function ConversionDownload({ tool, format, content, mimeType }: { tool: ConversionSession; format: string; content?: string; mimeType?: string }) {
  const result = tool.state.result;
  if (!result) return null;
  return <DownloadButton label={"Download " + format} filename={result.filename} content={content ?? result.content} mimeType={mimeType} disabled={tool.state.busy} onDownloaded={() => tool.feedback("Download started: " + result.filename)} onError={message => tool.feedback(message, true)} />;
}
export function ConversionReset({ tool, onReset }: { tool: ConversionSession; onReset?: () => void }) {
  return (tool.state.result || tool.state.busy || tool.state.error) ? <div className="aen-conversion-reset"><button type="button" className="text-button" onClick={event => {
    const container = event.currentTarget.closest(".aen-file-converter");
    (onReset ?? tool.reset)();
    requestAnimationFrame(() => container?.querySelector<HTMLButtonElement>(".upload-zone button")?.focus());
  }}>Start over</button></div> : null;
}
export function CopyOutput({ content, label, onCopied, onError }: { content: string; label: string; onCopied: () => void; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const current = useRef({ content, mounted: true });
  useEffect(() => { current.current = { content, mounted: true }; return () => { current.current.mounted = false; }; }, [content]);
  async function copy() {
    setBusy(true);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(content);
      if (current.current.mounted && current.current.content === content) onCopied();
    } catch { if (current.current.mounted && current.current.content === content) onError("Copy is unavailable. Select the output text to copy it, or download the file."); }
    finally { if (current.current.mounted) setBusy(false); }
  }
  return <button type="button" className="button button-secondary" onClick={copy} disabled={busy || !content}>{busy ? "Copying…" : label}</button>;
}
