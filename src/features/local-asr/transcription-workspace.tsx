"use client";
import { useEffect, useReducer, useRef, useState } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { StatusMessage } from "@/components/ui/status-message";
import type { EditorDocument } from "@/lib/subtitle-editor";
import { ASR_CACHE, captionDocument, validateAsrFile, type Backend } from "./asr-core";
import { asrBusy, asrSessionReducer, initialAsrSession } from "./asr-session";
import type { AsrClient } from "./asr-client";
import type { PreparedAudio } from "./decode-audio";
import { CaptionReview } from "./caption-review";
import styles from "./transcription.module.css";

type Source = PreparedAudio & { file: File; url: string };
export function TranscriptionWorkspace({ kind }: { kind: "podcast" | "subtitle" }) {
  const [session, dispatch] = useReducer(asrSessionReducer, initialAsrSession);
  const [source, setSource] = useState<Source | null>(null), [captions, setCaptions] = useState<{ document: EditorDocument; key: number } | null>(null);
  const [backend, setBackend] = useState<Backend>("auto"), [elapsed, setElapsed] = useState(0), [pending, setPending] = useState<File | "reset" | "generate" | null>(null);
  const request = useRef(0), abort = useRef<AbortController | null>(null), client = useRef<AsrClient | null>(null), sourceUrl = useRef(""), started = useRef(0), root = useRef<HTMLDivElement>(null);
  const busy = asrBusy(session);
  useEffect(() => () => { ++request.current; abort.current?.abort(); client.current?.cancel(); if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current); }, []);
  useEffect(() => { if (!busy) return; const timer = setInterval(() => setElapsed(Math.floor((performance.now() - started.current) / 1000)), 1000); return () => clearInterval(timer); }, [busy]);
  function stopWork() { ++request.current; abort.current?.abort(); client.current?.cancel(); }
  function cancel() { stopWork(); dispatch({ type: "cancel", id: request.current }); }
  function reset() {
    stopWork(); if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current); sourceUrl.current = "";
    setSource(null); setCaptions(null); setPending(null); dispatch({ type: "reset", id: request.current });
    requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(".upload-zone button")?.focus());
  }
  async function choose(file: File) {
    stopWork(); const id = ++request.current, controller = new AbortController(); abort.current = controller;
    started.current = performance.now(); setElapsed(0); setPending(null); dispatch({ type: "check", id });
    try {
      const decoded = await (await import("./decode-audio")).decodeAudio(file, controller.signal);
      if (request.current !== id) return;
      const url = URL.createObjectURL(file);
      if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current); sourceUrl.current = url;
      setSource({ ...decoded, file, url }); setCaptions(null);
      dispatch({ type: "ready", id, filename: file.name, duration: decoded.duration });
    } catch (error) { if (request.current === id) dispatch({ type: "failed", id, message: error instanceof Error ? error.message : "This recording could not be decoded. Try PCM WAV or MP3." }); }
  }
  async function generate() {
    if (!source || busy) return;
    stopWork(); const id = ++request.current, controller = new AbortController(); abort.current = controller;
    started.current = performance.now(); setElapsed(0); setPending(null); dispatch({ type: "generate", id });
    try {
      const { AsrClient } = await import("./asr-client");
      if (request.current !== id) return;
      client.current ??= new AsrClient(); let updated = 0;
      const result = await client.current.run(source.samples.slice(), backend, controller.signal, progress => {
        const now = performance.now();
        if (request.current === id && (progress.stage !== "download" || progress.warning || now - updated > 100 || progress.loaded === progress.total)) { dispatch({ type: "progress", id, progress }); updated = now; }
      });
      if (request.current !== id) return;
      const document = captionDocument(result.chunks, source.duration, source.file.name);
      if (result.text.trim() && !document.cues.length) throw new Error("Speech was recognized without usable timestamps. No subtitle file was invented. Try a clearer recording.");
      setCaptions(document.cues.length ? { document, key: id } : null);
      dispatch({ type: "complete", id, result });
    } catch (error) { if (request.current === id) dispatch({ type: "failed", id, message: (error instanceof Error ? error.message : "Local transcription failed.") + " Try CPU mode or a shorter recording. No recording was uploaded." }); }
  }
  function requestAction(action: File | "reset" | "generate") {
    if (captions) setPending(action);
    else if (action === "reset") reset();
    else if (action === "generate") void generate();
    else void choose(action);
  }
  async function clearCache() {
    try { await caches.delete(ASR_CACHE); dispatch({ type: "notice", message: "The saved AENural model cache was cleared. Browser HTTP caching is managed separately by your browser." }); }
    catch { dispatch({ type: "error", message: "This browser did not allow cache access. You can manage site storage in browser settings." }); }
  }
  const progress = session.progress;
  const phase = session.stage === "checking" ? "Checking your recording" : session.stage === "download" ? "Downloading processing files" : session.stage === "loading" ? "Preparing caption generation" : session.stage === "detecting" ? "Checking for speech on your device" : session.stage === "transcribing" ? "Transcribing on your device" : "";
  return <div ref={root} className={styles.workspace}>
    <FileUpload accept=".mp3,.wav" title={kind === "podcast" ? "Choose your speech recording" : "Choose audio for subtitles"} buttonLabel={source ? "Replace recording" : "Choose audio"} description="MP3 or PCM WAV · English speech" hint="Up to 60 seconds · 25 MB" filename={source?.file.name} detail={source ? source.duration.toFixed(1) + " seconds" : undefined} validateFile={validateAsrFile} onFile={file => requestAction(file)} onError={message => dispatch({ type: "error", message })} />
    <div><p>Your recording stays on your device and is processed in your browser.</p><p className={styles.downloadNote}>First use downloads about 95 MB of processing files; saved files are reused when available.</p></div>
    <div className={styles.actions}><button type="button" className="button button-primary" disabled={!source || busy} onClick={() => requestAction("generate")}>{kind === "podcast" ? "Generate Captions" : "Generate Subtitles"}</button>{busy && <button type="button" className="button button-secondary" onClick={cancel}>Cancel</button>}{(source || busy) && <button type="button" className="button button-secondary" onClick={() => requestAction("reset")}>Reset</button>}</div>
    {pending && <div className={styles.progress} role="alert"><strong>Replace the current captions?</strong><p>Download any corrections you want to keep before continuing.</p><div className={styles.actions}><button className="button button-secondary" onClick={() => setPending(null)}>Keep reviewing</button><button className="button button-primary" onClick={() => { const action = pending; setPending(null); if (action === "reset") reset(); else if (action === "generate") void generate(); else void choose(action); }}>Continue</button></div></div>}
    {busy && <div className={styles.progress} aria-busy="true"><p role="status" aria-atomic="true">{phase} · {elapsed} seconds elapsed</p>{progress?.loaded !== undefined && <><span>Current download: {(progress.loaded / 1e6).toFixed(2)} MB{progress.total ? " of " + (progress.total / 1e6).toFixed(2) + " MB" : " (total unavailable)"}</span>{!!progress.total && <progress aria-label="Current processing file download" max={progress.total} value={progress.loaded} />}</>}</div>}
    {session.error && <StatusMessage tone="error">{session.error}{source && " Your previous recording and review remain available."}</StatusMessage>}
    {session.warnings.map(warning => <StatusMessage key={warning} tone="warning">{warning}</StatusMessage>)}
    {!busy && session.notice && <StatusMessage tone={session.stage === "complete" && session.result?.chunks.length ? "success" : "info"}>{session.notice}</StatusMessage>}
    {source && <audio className={styles.audio} controls preload="metadata" src={source.url} aria-label="Review original recording" />}
    {captions && <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><legend className="sr-only">Caption review and downloads</legend><CaptionReview key={captions.key} initialDocument={captions.document} /></fieldset>}
    <details className={styles.details}><summary>Advanced options and model information</summary><div className={styles.processing}><label htmlFor="asr-backend">Processing</label><select id="asr-backend" value={backend} disabled={busy} onChange={event => setBackend(event.target.value as Backend)}><option value="auto">Automatic — GPU when available</option><option value="wasm">CPU — compatible fallback</option></select></div><p>Whisper tiny.en and Silero speech detection produce draft English captions. Review words and timing; speech detection can miss short utterances or confuse music with speech.</p><p>Downloads include about 64 MB of speech model weights, a 2.33 MB speech detector, runtime and tokenizer files from Hugging Face, GitHub and jsDelivr. Download size and processing speed vary by device and saved files. PCM WAV supports mono/stereo at 8–48 kHz.</p><p><a href="/licenses/local-asr/README.txt">Model licenses and runtime notices</a></p><button type="button" className="text-button" disabled={busy} onClick={() => void clearCache()}>Clear downloaded model cache</button></details>
  </div>;
}

