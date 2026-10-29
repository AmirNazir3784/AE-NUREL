"use client";
import { useEffect, useRef, useState } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { StatusMessage } from "@/components/ui/status-message";
import type { EditorDocument } from "@/lib/subtitle-editor";
import { ASR_CACHE, type AsrProgress, type Backend } from "./asr-core";
import { SUBTITLE_ACCEPT, SPOKEN_LANGUAGES, validateSubtitleFile, ACCURATE_CACHE, accurateDeviceReason, type TranscriptionQuality } from "./subtitle-capabilities";
import { SUBTITLE_LANGUAGES, TRANSLATION_CACHE, needsTranslation, validateTranslationPair } from "./translation-core";
import { CaptionReview } from "./caption-review";
import type { AsrClient } from "./asr-client";
import type { TranslationClient } from "./translation-client";
import styles from "./transcription.module.css";
import type { CoverageEntry } from "./semantic-localization";
import { processingReviewNotes } from "./caption-review-hints";

type Source = { file: File; duration: number; url: string };
type Review = { document: EditorDocument; key: number; coverage?: CoverageEntry[]; failed?: number };
const phaseNames: Record<AsrProgress["stage"], string> = { preparing: "Preparing audio", loading: "Preparing transcription", download: "Downloading processing files", detecting: "Checking for speech", transcribing: "Transcribing, please wait…", translating: "Translating, please wait…", building: "Building subtitles" };

export function SubtitleWorkspace({ transcript = false }: { transcript?: boolean } = {}) {
  const [source, setSource] = useState<Source | null>(null), [review, setReview] = useState<Review | null>(null);
  const [spoken, setSpoken] = useState("auto"), [target, setTarget] = useState("same"), [backend, setBackend] = useState<Backend>("auto");
  const [quality, setQuality] = useState<TranscriptionQuality>("accurate");
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState<AsrProgress | null>(null), [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [warnings, setWarnings] = useState<string[]>([]);
  const [pending, setPending] = useState<File | "generate" | "reset" | null>(null);
  const request = useRef(0), working = useRef(false), abort = useRef<AbortController | null>(null);
  const asr = useRef<AsrClient | null>(null), translator = useRef<TranslationClient | null>(null), sourceUrl = useRef(""), started = useRef(0);
  useEffect(() => {
    const requestCounter = request;
    const clean = () => { void Promise.all([import("./subtitle-checkpoints"), import("./subtitle-job")]).then(([storage, jobs]) => { jobs.cleanSessionCheckpoints(); return storage.cleanSubtitleCheckpoints(); }).catch(() => {}); };
    clean(); const timer = setInterval(clean, 60 * 60 * 1000);
    return () => { clearInterval(timer); ++requestCounter.current; abort.current?.abort(); asr.current?.cancel(); translator.current?.cancel(); if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current); };
  }, []);
  useEffect(() => { if (!busy) return; const timer = setInterval(() => setElapsed(Math.floor((performance.now() - started.current) / 1000)), 1000); return () => clearInterval(timer); }, [busy]);
  function stop() { ++request.current; abort.current?.abort(); asr.current?.cancel(); translator.current?.cancel(); working.current = false; }
  function begin() {
    stop(); working.current = true; const id = ++request.current, controller = new AbortController(); abort.current = controller;
    started.current = performance.now(); setElapsed(0); setBusy(true); setError(""); setNotice(""); setWarnings([]); setProgress({ stage: "preparing" });
    return { id, controller };
  }
  function cancel() { stop(); setBusy(false); setProgress(null); setNotice("Cancelled. Generate again to resume."); }
  async function reset() {
    stop(); setBusy(false); setProgress(null); setReview(null); setSource(null); setPending(null); setError(""); setNotice("");
    if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current); sourceUrl.current = "";
    const { clearSessionCheckpoints } = await import("./subtitle-job"); clearSessionCheckpoints();
    try { await (await import("./subtitle-checkpoints")).browserCheckpoints.clear(); }
    catch { setError("Browser recovery data could not be cleared. Remove this site's stored data in browser settings."); }
  }
  async function choose(file: File) {
    const { id, controller } = begin(); setPending(null);
    try {
      const decoder = await (await import("./section-decoder")).openSectionDecoder(file, controller.signal);
      let duration: number;
      try { duration = decoder.duration; await decoder.read(0, Math.min(1, duration)); } finally { decoder.dispose(); }
      if (request.current !== id) return;
      const url = URL.createObjectURL(file); if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current); sourceUrl.current = url;
      setSource({ file, duration, url }); setReview(null); setNotice("Recording ready.");
    } catch (error) { if (request.current === id) setError(error instanceof Error ? error.message : "The recording could not be read. Try PCM WAV or MP3."); }
    finally { if (request.current === id) { working.current = false; setBusy(false); setProgress(null); } }
  }
  async function generate() {
    if (!source || working.current) return;
    if (quality === "accurate") {
      const reason = accurateDeviceReason((navigator as Navigator & { deviceMemory?: number }).deviceMemory);
      if (reason) { setError(reason); return; }
    }
    if (spoken !== "auto" && needsTranslation(spoken, target)) {
      try { validateTranslationPair(spoken, target); } catch (error) { setError((error as Error).message); return; }
    }
    const { id, controller } = begin(); setPending(null);
    let lastDownload = 0;
    const report = (value: AsrProgress) => {
      if (request.current !== id) return;
      const now = performance.now();
      if (value.stage === "download" && !value.warning && now - lastDownload < 100 && value.loaded !== value.total) return;
      if (value.stage === "download") lastDownload = now;
      setProgress(value);
      if (value.warning) setWarnings(previous => [...new Set([...previous, value.warning!])]);
    };
    try {
      const [{ AsrClient }, { TranslationClient }, { runSubtitleJob }, { openSectionDecoder }, { browserCheckpoints, subtitleFileKey }] = await Promise.all([
        import("./asr-client"), import("./translation-client"), import("./subtitle-job"), import("./section-decoder"), import("./subtitle-checkpoints"),
      ]);
      const fileKey = await subtitleFileKey(source.file, controller.signal);
      if (request.current !== id) return;
      asr.current ??= new AsrClient(); translator.current ??= new TranslationClient();
      const process = async () => {
        controller.signal.throwIfAborted();
        const decoder = await openSectionDecoder(source.file, controller.signal);
        return runSubtitleJob({ filename: source.file.name, fileKey, spoken, target, quality, backend, signal: controller.signal, progress: report }, { decoder, asr: asr.current!, translator: translator.current!, store: browserCheckpoints });
      };
      const result = navigator.locks ? await navigator.locks.request(`aenural-subtitles/${fileKey}/${spoken}${quality === "accurate" ? "/accurate" : ""}`, { ifAvailable: true }, lock => {
        if (!lock) throw new Error("This recording is already processing in another tab. Resume here after that job finishes or is cancelled.");
        return process();
      }) : await process();
      if (request.current !== id) return;
      const coverage = "coverage" in result ? result.coverage : undefined, failed = "failedTranslations" in result ? result.failedTranslations : 0;
      setReview(result.document.cues.length ? { document: result.document, key: id, coverage, failed } : null);
      const name = SPOKEN_LANGUAGES.find(item => item.code === result.language)?.name ?? result.language;
      setNotice(result.document.cues.length ? failed ? `${failed} sentences need a translation. Edit the blank captions or retry missing sentences.` : `Captions ready · ${name}` : "No speech detected. Try a recording with clearer speech.");
    } catch (error) {
      if (request.current === id) setError((error instanceof Error ? error.message : "Subtitle generation failed.") + " Completed sections are kept. Generate again to resume, or choose Same as spoken language to recover the source subtitles.");
    } finally { if (request.current === id) { working.current = false; setBusy(false); setProgress(null); } }
  }
  function action(next: File | "generate" | "reset") {
    if (review) setPending(next);
    else if (next === "generate") void generate(); else if (next === "reset") void reset(); else void choose(next);
  }
  async function clearModels() {
    try { await Promise.all([caches.delete(ASR_CACHE), caches.delete(ACCURATE_CACHE), caches.delete(TRANSLATION_CACHE)]); setNotice("Downloaded speech and translation model caches cleared. Browser HTTP caching is managed separately."); }
    catch { setError("This browser did not allow cache access. Manage site storage in browser settings."); }
  }
  const count = progress?.completed, total = progress?.sections;
  const notes = processingReviewNotes(warnings);
  return <div className={styles.workspace}>
    <FileUpload accept={SUBTITLE_ACCEPT} title={transcript ? "Drop your audio file here" : "Choose audio for subtitles"} buttonLabel={source ? "Replace recording" : transcript ? "Upload Audio" : "Choose audio"} description="MP3, PCM WAV, M4A, AAC, FLAC or OGG · supported browser codecs" hint="Up to 5 hours · 4 GiB · mono/stereo at 8–48 kHz" filename={source?.file.name} detail={source ? `${(source.duration / 60).toFixed(1)} minutes` : undefined} validateFile={validateSubtitleFile} onFile={file => action(file)} onError={setError} />
    <div className={styles.notes}><p>Review and edit your captions before downloading.</p><p className={styles.downloadNote}>First use downloads processing files, then reuses them. Translation adds about 650 MB and needs more free memory.</p></div>
    <div className={styles.actions}>
      <div className={styles.processing}><label htmlFor="subtitle-spoken">Spoken Language</label><select id="subtitle-spoken" value={spoken} disabled={busy} onChange={event => setSpoken(event.target.value)}><option value="auto">Auto Detect</option>{SPOKEN_LANGUAGES.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></div>
      <div className={styles.processing}><label htmlFor="subtitle-target">{transcript ? "Text Language" : "Subtitle Language"}</label><select id="subtitle-target" value={target} disabled={busy} aria-describedby={target !== "same" ? "subtitle-translation-note" : undefined} onChange={event => setTarget(event.target.value)}><option value="same">Same as spoken language</option>{SUBTITLE_LANGUAGES.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select>{target !== "same" && <p id="subtitle-translation-note" className={styles.downloadNote}>Translation is a draft. Review its meaning against the source.</p>}</div>
      <div className={styles.processing}><label htmlFor="subtitle-quality">Transcription Quality</label><select id="subtitle-quality" value={quality} disabled={busy} aria-describedby="subtitle-quality-note" onChange={event => setQuality(event.target.value as TranscriptionQuality)}><option value="fast">Fast</option><option value="accurate">Accurate</option></select><p id="subtitle-quality-note" className={styles.downloadNote}>{quality === "fast" ? "Faster, lower memory." : "Better recognition. About 250 MB on first use; slower and uses more memory."}</p></div>
    </div>
    <div className={styles.actions}><button type="button" className="button button-primary" disabled={!source || busy} onClick={() => action("generate")}>{error ? "Retry / Resume Subtitles" : review?.failed ? "Retry Missing Sentences" : transcript ? "Convert to Text" : "Generate Subtitles"}</button>{busy && <button type="button" className="button button-secondary" onClick={cancel}>Cancel</button>}{(source || busy) && <button type="button" className="button button-secondary" onClick={() => action("reset")}>Reset</button>}</div>
    {pending && <div className={styles.progress} role="alert"><strong>Replace the current captions?</strong><p>Download any corrections you want to keep before continuing.</p><div className={styles.actions}><button className="button button-secondary" onClick={() => setPending(null)}>Keep reviewing</button><button className="button button-primary" onClick={() => { const next = pending; setPending(null); if (next === "generate") void generate(); else if (next === "reset") void reset(); else void choose(next); }}>Continue</button></div></div>}
    {busy && <div className={styles.progress} aria-busy="true"><p role="status" aria-atomic="true">{progress ? phaseNames[progress.stage] : "Preparing audio"} · {elapsed} seconds elapsed</p>{count !== undefined && !!total && <><span>{count} of {total} {progress?.unit === "sentences" ? "sentences processed" : progress?.unit === "thoughts" ? "thoughts localized" : progress?.stage === "translating" || progress?.unit === "captions" ? "captions translated" : "sections processed"} · {Math.floor(count / total * 100)}%</span><progress aria-label="Completed processing units" value={count} max={total} /></>}{progress?.loaded !== undefined && <><span>Current download: {(progress.loaded / 1e6).toFixed(2)} MB{progress.total ? " of " + (progress.total / 1e6).toFixed(2) + " MB" : " (total unavailable)"}</span>{!!progress.total && <progress aria-label="Current model file download" value={progress.loaded} max={progress.total} />}</>}<p>Keep this tab open and your device awake. Large recordings can take longer than their playback time.</p></div>}
    {error && <StatusMessage tone="error">{error}</StatusMessage>}
    {notes.length > 0 && <details className={styles.suggestions}><summary>Processing notes</summary><ul>{notes.map(note => <li key={note}>{note}</li>)}</ul></details>}
    {!busy && notice && <p className={styles.ready} role="status">{review?.failed ? "Review captions" : notice}</p>}
    {source && <audio className={styles.audio} controls preload="metadata" src={source.url} aria-label="Review original recording" />}
    {review && <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><legend className="sr-only">Caption review and downloads</legend><CaptionReview key={review.key} initialDocument={review.document} coverage={review.coverage} transcript={transcript} /></fieldset>}
    <details className={styles.details}><summary>Advanced settings</summary><div className={styles.processing}><label htmlFor="subtitle-backend">Speech processing</label><select id="subtitle-backend" value={backend} disabled={busy} onChange={event => setBackend(event.target.value as Backend)}><option value="auto">{quality === "accurate" ? "Automatic — compatible CPU" : "Automatic — GPU when available"}</option><option value="wasm">CPU — compatible fallback</option><option value="webgpu">GPU — device-dependent performance</option></select></div><p>After a refresh, reselect the same file, spoken language and quality to resume. Recovery text stays in this browser for up to 24 hours. Audio is never saved. Reset clears recovery data.</p><p>Accuracy and codec support vary by language, recording and device. Translations may be rearranged inside the original sentence&apos;s speech interval for readability. Check the draft against your recording.</p><p><a href="/licenses/local-asr/README.txt">Model licenses and runtime notices</a></p><button type="button" className="text-button" disabled={busy} onClick={() => void clearModels()}>Clear downloaded processing files</button></details>
  </div>;
}
