"use client";
import { useEffect, useRef, useState } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { DownloadButton } from "@/components/tools/download-button";
import { StatusMessage } from "@/components/ui/status-message";
import { exportEditor, type EditorDocument } from "@/lib/subtitle-editor";
import { captionDocument, validateAsrFile, ASR_MODEL, ASR_REVISION, type Backend, type AsrResult, type AsrProgress } from "./asr-core";
import type { AsrClient } from "./asr-client";
import type { PreparedAudio } from "./decode-audio";

export function EngineLab() {
  const [file, setFile] = useState<File | null>(null), [audio, setAudio] = useState<PreparedAudio | null>(null);
  const [backend, setBackend] = useState<Backend>("wasm"), [busy, setBusy] = useState(false), [status, setStatus] = useState("Choose owned test audio."), [error, setError] = useState("");
  const [document, setDocument] = useState<EditorDocument | null>(null), [result, setResult] = useState<AsrResult | null>(null), [progress, setProgress] = useState<AsrProgress | null>(null);
  const request = useRef(0), abort = useRef<AbortController | null>(null), client = useRef<AsrClient | null>(null);
  useEffect(() => () => { abort.current?.abort(); client.current?.cancel(); }, []);
  function cancel() { ++request.current; abort.current?.abort(); client.current?.cancel(); setBusy(false); setStatus("Cancelled. No audio was uploaded."); }
  async function choose(next: File) {
    cancel(); const id = ++request.current, controller = new AbortController(); abort.current = controller;
    setBusy(true); setError(""); setStatus("Checking and decoding audio…"); setDocument(null); setResult(null); setAudio(null); setFile(next);
    try {
      const decoded = await (await import("./decode-audio")).decodeAudio(next, controller.signal);
      if (request.current !== id) return;
      setAudio(decoded); setStatus("Audio ready: " + decoded.duration.toFixed(3) + " seconds · " + decoded.codec);
    } catch (e) { if (request.current === id) setError(e instanceof Error ? e.message : "Decode failed."); }
    finally { if (request.current === id) setBusy(false); }
  }
  async function generate() {
    if (!audio || !file) return;
    const id = ++request.current, controller = new AbortController(); abort.current = controller;
    setBusy(true); setError(""); setStatus("Loading local engine…"); setDocument(null); setResult(null);
    try {
      const { AsrClient } = await import("./asr-client");
      if (request.current !== id) return;
      client.current ??= new AsrClient();
      const value = await client.current.run(audio.samples.slice(), backend, controller.signal, value => { if (request.current === id) { setProgress(value); setStatus(value.stage + (value.backend ? " · " + value.backend : "")); } });
      if (request.current !== id) return;
      const captions = captionDocument(value.chunks, audio.duration, file.name);
      setDocument(captions); setResult(value); setStatus(captions.cues.length ? "Local captions ready." : "No speech detected.");
    } catch (e) { if (request.current === id) setError(e instanceof Error ? e.message : "Transcription failed."); }
    finally { if (request.current === id) setBusy(false); }
  }
  return <div>
    <p>Development engine verification only · English · 60 seconds / 25 MB maximum. Model assets download after Generate; audio stays local.</p>
    <FileUpload accept=".mp3,.wav" title="Choose test audio" buttonLabel={file ? "Replace audio" : "Choose audio"} description="Owned MP3 or PCM WAV speech" hint="English · up to 60 seconds · mono/stereo 8–48 kHz" filename={file?.name} validateFile={validateAsrFile} onFile={next => void choose(next)} onError={setError} />
    <label htmlFor="lab-backend">Execution backend</label><select id="lab-backend" value={backend} disabled={busy} onChange={e => setBackend(e.target.value as Backend)}><option value="wasm">CPU / WASM</option><option value="webgpu">WebGPU</option><option value="auto">Automatic</option></select>
    <div className="action-row"><button className="button button-primary" disabled={busy || !audio} onClick={() => void generate()}>Generate test captions</button><button className="button button-secondary" disabled={!busy} onClick={cancel}>Cancel</button><button className="button button-secondary" onClick={() => { cancel(); setFile(null); setAudio(null); setDocument(null); setResult(null); setError(""); }}>Reset</button></div>
    <StatusMessage>{status}</StatusMessage>{error && <StatusMessage tone="error">{error}</StatusMessage>}
    {busy && progress?.loaded !== undefined && <p>{progress.file}: {progress.loaded} / {progress.total || "unknown"} bytes</p>}
    {document && document.cues.length > 0 && <><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{exportEditor(document, "srt")}</pre>{(["srt", "vtt"] as const).map(format => <DownloadButton key={format} content={() => exportEditor(document, format)} filename={document.filename.replace(/\.srt$/, "." + format)} label={"Download " + format.toUpperCase()} onDownloaded={() => setStatus("Download started.")} onError={setError} />)}</>}
    <details><summary>Model and run evidence</summary><p>{ASR_MODEL} · {ASR_REVISION}</p><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(result, null, 2)}</pre></details>
  </div>;
}
