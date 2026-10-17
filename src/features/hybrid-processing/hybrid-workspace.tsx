"use client";
import { useEffect, useRef, useState } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { CaptionReview } from "@/features/local-asr/caption-review";
import { captionDocument, type TimedText } from "@/features/local-asr/asr-core";
import type { EditorDocument } from "@/lib/subtitle-editor";
import styles from "@/features/local-asr/transcription.module.css";

const api = "/api/dev/hybrid/jobs";
type Job = { id: string; stage: string; error?: string; result?: { words: TimedText[]; duration: number; language: string } };
const stages: Record<string, string> = { uploading: "Uploading audio", loading: "Loading server model", transcribing: "Transcribing on the server", building: "Preparing captions", stopping: "Stopping processing" };

export function HybridWorkspace({ available }: { available: boolean }) {
  const [file, setFile] = useState<File | null>(null), [token, setToken] = useState(""), [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false), [stage, setStage] = useState(""), [error, setError] = useState("");
  const [document, setDocument] = useState<EditorDocument | null>(null);
  const controller = useRef<AbortController | null>(null), active = useRef<{ id: string; token: string } | null>(null);
  const run = useRef(0);
  useEffect(() => () => { controller.current?.abort(); const job = active.current; if (job) void fetch(`${api}/${job.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${job.token}` }, keepalive: true, credentials: "omit" }).catch(() => {}); }, []);

  async function cancel() {
    ++run.current; controller.current?.abort(); controller.current = null;
    const job = active.current; setStage("stopping");
    try {
      if (job) {
        const response = await fetch(`${api}/${job.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${job.token}` }, credentials: "omit", signal: AbortSignal.timeout(5000) });
        if (!response.ok && response.status !== 404) throw new Error("Cancellation could not be confirmed. The server timeout still applies.");
      }
      setStage(job ? "Cancellation requested" : "Upload stopped. Any accepted server job is bounded by its timeout.");
    } catch { setError("Cancellation could not be confirmed. The server timeout still applies."); }
    finally { active.current = null; setBusy(false); }
  }
  async function generate() {
    if (!file || !consent || busy || token.length < 32) return;
    if (document && !window.confirm("Replace these captions? Download any edits you want to keep first.")) return;
    const currentRun = ++run.current;
    const abort = new AbortController(); controller.current = abort; setBusy(true); setError(""); setDocument(null); setStage("uploading");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const response = await fetch(api, { method: "POST", body: file, signal: abort.signal, credentials: "omit", headers: { ...headers, "Content-Type": "audio/wav", "X-Upload-Consent": "yes", "X-Spoken-Language": "en", "X-Subtitle-Language": "same" } });
      const accepted = await response.json(); if (!response.ok) throw new Error(accepted.error ?? "Server processing is unavailable.");
      if (typeof accepted.id !== "string" || !/^[a-f0-9-]{36}$/.test(accepted.id)) throw new Error("The server returned an invalid job.");
      if (run.current !== currentRun) return;
      active.current = { id: accepted.id, token }; setStage(accepted.stage);
      while (!abort.signal.aborted) {
        const status = await fetch(`${api}/${accepted.id}`, { signal: abort.signal, credentials: "omit", headers, cache: "no-store" });
        const job = await status.json() as Job;
        if (!status.ok) throw new Error(job.error ?? "This job is unavailable or expired.");
        if (["failed", "cancelled"].includes(job.stage)) throw new Error(job.error ?? "Server processing stopped.");
        if (job.stage === "complete") {
          if (!job.result || job.result.language !== "en" || !Array.isArray(job.result.words)) throw new Error("The server returned incomplete captions.");
          setDocument(captionDocument(job.result.words, job.result.duration, file.name, true)); setStage("Captions ready");
          await fetch(`${api}/${accepted.id}`, { method: "DELETE", headers, credentials: "omit" }); active.current = null; break;
        }
        setStage(job.stage);
        await new Promise<void>((resolve, reject) => {
          const abortWait = () => { clearTimeout(timer); reject(abort.signal.reason); };
          const timer = setTimeout(() => { abort.signal.removeEventListener("abort", abortWait); resolve(); }, 1500);
          abort.signal.addEventListener("abort", abortWait, { once: true });
        });
      }
    } catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "Server processing failed."); }
    finally { if (controller.current === abort) { setBusy(false); controller.current = null; } }
  }
  if (!available) return <p role="status">Server processing is disabled. A developer must configure local access, model storage and a verified memory budget before using this workspace.</p>;
  return <div className={styles.workspace}>
    <p>This mode uploads your recording to the development server. CPU Whisper Small transcribes English; translation and video processing are unavailable here. There is no automatic browser fallback.</p>
    <FileUpload accept=".wav,audio/wav" title="Choose PCM WAV audio" buttonLabel="Choose audio" description="16-bit PCM WAV · mono/stereo · 8–48 kHz" hint="Up to 60 seconds and 8 MiB" filename={file?.name} busy={busy}
      validateFile={value => { if (!/\.wav$/i.test(value.name) || !value.size || value.size > 8 * 1024 ** 2) throw new Error("Choose a PCM WAV up to 8 MiB."); }}
      onFile={value => { setFile(value); setConsent(false); setError(""); }} onError={setError} />
    <label>Development access token<input type="password" value={token} autoComplete="off" disabled={busy} onChange={event => setToken(event.target.value)} /></label>
    <label><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} /> I agree to upload this recording for development server processing.</label>
    <p className={styles.hint}>Temporary audio is deleted after processing or cancellation. Results expire from server memory after 10 minutes and are removed when received. The access token is not saved.</p>
    <div className={styles.actions}><button type="button" className="button button-primary" disabled={!file || !consent || token.length < 32 || busy} onClick={() => void generate()}>{error ? "Retry server processing" : "Generate on server"}</button>{busy && <button type="button" className="button button-secondary" onClick={() => void cancel()}>Cancel server job</button>}</div>
    {stage && <p role="status" aria-live="polite">{stages[stage] ?? stage}</p>}{error && <p role="alert">{error}</p>}
    {document && <CaptionReview key={document.filename + document.cues[0]?.start} initialDocument={document} />}
  </div>;
}
