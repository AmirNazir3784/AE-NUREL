"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { Icon } from "@/components/ui/icon";

type Props = {
  accept: string;
  description: string;
  title: string;
  buttonLabel: string;
  hint: string;
  filename?: string;
  detail?: string;
  busy?: boolean;
  validateFile?: (file: File) => void;
  onFile: (file: File) => void;
  onError: (message: string) => void;
};

type UploadProps = Omit<Props, "onFile"> & (
  | { multiple?: false; onFile: (file: File) => void; onFiles?: never }
  | { multiple: true; onFiles: (files: File[]) => void; onFile?: never }
);

type DragFeedback = { state: "ready" | "invalid"; message: string } | null;

export function FileUpload({ accept, description, title, buttonLabel, hint, filename, detail, busy, validateFile, onFile, onFiles, onError, multiple = false }: UploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const id = useId();
  const [drag, setDrag] = useState<DragFeedback>(null);

  function select(files: FileList | null) {
    if (!files?.length) return;
    if (!multiple && files.length !== 1) {
      onError("Choose one file at a time.");
      return;
    }
    try {
      if (multiple) onFiles?.(Array.from(files));
      else {
        validateFile?.(files[0]);
        onFile?.(files[0]);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "This file could not be selected. Please try again.");
    }
  }

  function feedback(event: DragEvent<HTMLDivElement>): DragFeedback {
    const transfer = event.dataTransfer;
    const fileItems = Array.from(transfer.items).filter((item) => item.kind === "file");
    if (!transfer.types.includes("Files")) return { state: "invalid", message: "Drop a file from your device." };
    if (!multiple && (fileItems.length > 1 || transfer.files.length > 1)) return { state: "invalid", message: "Choose one file at a time." };
    // Browsers often hide filenames until drop. Validate when exposed, and always on drop.
    if (transfer.files.length >= 1) {
      try { for (const file of Array.from(transfer.files)) validateFile?.(file); }
      catch (error) { return { state: "invalid", message: error instanceof Error ? error.message : "This file is not supported." }; }
    }
    return { state: "ready", message: title };
  }

  function clearDrag() {
    dragDepth.current = 0;
    setDrag(null);
  }

  return (
    <div
      className={`upload-zone ${filename ? "has-file" : ""} ${drag?.state === "ready" ? "dragging" : ""} ${drag?.state === "invalid" ? "drag-invalid" : ""}`}
      aria-busy={busy}
      onDragEnter={(event) => {
        event.preventDefault();
        if (busy) return;
        dragDepth.current++;
        setDrag(feedback(event));
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (busy) { event.dataTransfer.dropEffect = "none"; return; }
        const next = feedback(event);
        event.dataTransfer.dropEffect = next?.state === "invalid" ? "none" : "copy";
        setDrag((current) => current?.state === next?.state && current?.message === next?.message ? current : next);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDrag(null);
      }}
      onDragEnd={clearDrag}
      onDrop={(event) => {
        event.preventDefault();
        clearDrag();
        if (!busy) select(event.dataTransfer.files);
      }}
    >
      <input
        ref={input}
        id={id}
        aria-label={buttonLabel}
        aria-describedby={`${id}-hint`}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={busy}
        onChange={(event) => { select(event.target.files); event.target.value = ""; }}
      />
      <div className="upload-icon"><Icon name={drag?.state === "invalid" ? "close" : drag ? "upload" : filename ? "file" : "upload"} size={27} /></div>
      <div aria-live="polite" aria-atomic="true">
        <p className="upload-title">{busy ? multiple ? "Reading your files…" : "Reading your file…" : drag?.message || filename || title}</p>
        <p className="upload-description">{busy ? "Checking your file. Please wait a moment." : drag ? drag.state === "ready" ? multiple ? "Release to add these files." : "Release to use this file." : "Choose a supported file to continue." : filename ? detail : description}</p>
      </div>
      <button
        type="button"
        className={`button ${filename ? "button-secondary" : "button-primary"}`}
        aria-controls={id}
        aria-describedby={`${id}-hint`}
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {filename && !multiple ? "Replace file" : buttonLabel}
        <Icon name={filename ? "reset" : "upload"} size={16} />
      </button>
      <span id={`${id}-hint`} className="upload-note">{filename ? multiple ? hint : "Or drop another file to replace it" : hint}</span>
    </div>
  );
}
