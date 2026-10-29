"use client";
import { useEffect, useRef, useState } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { Icon } from "@/components/ui/icon";
import { emptyEditor, openSubtitle, validateSubtitleFile, type EditorDocument } from "@/lib/subtitle-editor";
import type { AsrProgress } from "../local-asr/asr-core";
import type { AsrClient } from "../local-asr/asr-client";
import type { TranscriptionQuality } from "../local-asr/subtitle-capabilities";
import { ReplaceWorkDialog } from "../caption-studio/replace-work-dialog";
import { AudioCaptionEditor } from "./audio-caption-editor";
import { prepareRecording, transcribeRecording, recordingStage } from "./recording";
import styles from "./audio-captions.module.css";
import { alignProvidedLyrics, lyricLines, LYRIC_TEXT_LIMIT } from "./lyric-alignment";

type Recording = { file: File; url: string; duration: number; peaks: number[] };
export function AudioCaptionWorkspace({ kind = "podcast" }: { kind?: "podcast" | "lyrics" }) {
  const [source, setSource] = useState<Recording | null>(null), [result, setResult] = useState<EditorDocument | null>(null), [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState<AsrProgress | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [quality, setQuality] = useState<TranscriptionQuality>("accurate"), [time, setTime] = useState(0), [pending, setPending] = useState<(() => void) | null>(null);
  const [lyrics, setLyrics] = useState("");
  const [alignedLyrics, setAlignedLyrics] = useState<string | null>(null);
  const [recognized, setRecognized] = useState<EditorDocument | null>(null);
  const staleLyrics = kind === "lyrics" && alignedLyrics !== null && lyrics !== alignedLyrics;
  const audio = useRef<HTMLAudioElement>(null), importInput = useRef<HTMLInputElement>(null), job = useRef<AbortController | null>(null), client = useRef<AsrClient | null>(null), run = useRef(0);
  useEffect(() => () => { ++run.current; job.current?.abort(); client.current?.cancel(); }, []);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);
  function replace(action: () => void) { if (result) setPending(() => action); else action(); }
  function stop() { ++run.current; job.current?.abort(); client.current?.cancel(); setBusy(false); setNotice("Processing cancelled. Your previous captions are kept."); }
  function showResult(document: EditorDocument) { setResult(document); setRecognized(null); setAlignedLyrics(null); setVersion(value => value + 1); setNotice("Captions ready. Review the words and timing."); }
  async function choose(file: File) {
    if (busy) return;
    const controller = new AbortController(), id = ++run.current; job.current = controller; setBusy(true); setError(""); setNotice(""); setProgress(null);
    try { const prepared = await prepareRecording(file, controller.signal); if (id !== run.current) return; audio.current?.pause(); setSource({ ...prepared, file, url: URL.createObjectURL(file) }); setResult(null); setAlignedLyrics(null); setTime(0); }
    catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "This recording could not be opened."); }
    finally { if (id === run.current) { job.current = null; setBusy(false); } }
  }
  async function generate() {
    if (!source || busy) return;
    if (kind === "lyrics") { try { lyricLines(lyrics); if (quality !== "accurate") throw new Error("Lyric alignment requires Accurate word timestamps."); } catch (failure) { setError(failure instanceof Error ? failure.message : "Add your written lyrics first."); return; } }
    const controller = new AbortController(), id = ++run.current; job.current = controller; setBusy(true); setProgress(null); setError(""); setNotice(""); audio.current?.pause();
    try {
      client.current ??= new (await import("../local-asr/asr-client")).AsrClient();
      const output = await transcribeRecording(source.file, quality, client.current, controller.signal, setProgress, (navigator as Navigator & { deviceMemory?: number }).deviceMemory, kind === "lyrics" ? "music" : "speech");
      if (id !== run.current) return;
      if (kind === "lyrics") {
        const aligned = alignProvidedLyrics(lyrics, output.words, source.duration, source.file.name); showResult(aligned.document); setAlignedLyrics(lyrics); setRecognized(output.document);
        setNotice(aligned.missing.length ? `Matched ${aligned.matched} of ${aligned.document.cues.length} lyric lines. Add timing for unmatched lines in the editor before downloading.` : "Lyrics matched to recognized words. Listen and review singing timing before downloading.");
      } else showResult(output.document);
    }
    catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Transcription failed. Try again."); }
    finally { if (id === run.current) { job.current = null; setBusy(false); } }
  }
  async function importFile(file: File) {
    if (!source || busy) return;
    const controller = new AbortController(), id = ++run.current; job.current = controller; setBusy(true); setProgress({ stage: "building" }); setError("");
    try { validateSubtitleFile(file); const bytes = await file.arrayBuffer(); controller.signal.throwIfAborted(); if (id !== run.current) return; const data = openSubtitle(file, bytes); if (data.cues.length > 500) throw new Error("Import up to 500 captions."); showResult(data); }
    catch (failure) { if (!controller.signal.aborted && id === run.current) setError(failure instanceof Error ? failure.message : "These captions could not be read."); }
    finally { if (id === run.current) { job.current = null; setBusy(false); } }
  }
  function seek(value: number) { if (audio.current && source) { audio.current.currentTime = Math.max(0, Math.min(source.duration, value)); setTime(audio.current.currentTime); } }
  return <div className={styles.workspace}>
    {pending && <ReplaceWorkDialog message="Download any caption edits before replacing them." onCancel={() => setPending(null)} onConfirm={() => { const action = pending; setPending(null); action(); }} />}
    <header className={styles.intro}><span className={styles.icon}><Icon name="subtitle" size={25} /></span><div><h1>{kind === "lyrics" ? "Lyrics to Captions" : "Podcast to Captions"}</h1><p>{kind === "lyrics" ? "Match written English lyrics to recognized words, review timing and download SRT or VTT." : "Turn English podcast recordings into timed captions. Review and download SRT or VTT."}</p><div className={styles.actions}><span className={styles.chip}>Ready to transcribe</span><span className={styles.chip}>English · MP3 / WAV</span></div></div></header>
    <section className={styles.card} aria-label="Your recording"><div className={styles.bar}><h2>Your recording</h2><span className={styles.hint}>Up to 5 minutes · 30 MiB</span></div><div className={styles.body}>
      {!source ? <FileUpload accept=".mp3,.wav,audio/mpeg,audio/wav" busy={busy} title="Drop your audio here" description="Or choose an MP3 or WAV recording." buttonLabel="Choose audio" hint="Nothing is uploaded to AENural's servers." onFile={file => replace(() => { void choose(file); })} onError={setError} /> : <>
        <div className={styles.bar}><strong className={styles.filename}>{source.file.name}</strong><button type="button" className="text-button" disabled={busy} onClick={() => importInput.current?.ownerDocument.getElementById("podcast-change-file")?.click()}>Change file</button><input id="podcast-change-file" type="file" accept=".mp3,.wav" className="sr-only" disabled={busy} aria-label="Change recording" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) replace(() => { void choose(file); }); }} /></div>
        <svg className={styles.waveform} viewBox="0 0 600 64" preserveAspectRatio="none" role="img" aria-label="Recording waveform"><path d={source.peaks.map((value, i) => `M${i},${32 - value * 30}v${Math.max(1, value * 60)}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="1" /></svg>
        <label className={styles.seek}>Seek recording<input type="range" min={0} max={source.duration} step={.01} value={time} disabled={busy} onChange={event => seek(Number(event.target.value))} /></label>
        <audio ref={audio} controls preload="metadata" src={source.url} aria-label={kind === "lyrics" ? "Song recording" : "Podcast recording"} onTimeUpdate={event => setTime(event.currentTarget.currentTime)} />
        <p className={styles.hint}>{time.toFixed(1)} / {source.duration.toFixed(1)} seconds</p>
      </>}
      {kind === "lyrics" && <details className={styles.details} open><summary>Add written lyrics</summary><label>Song lyrics<textarea rows={5} disabled={busy} maxLength={LYRIC_TEXT_LIMIT} value={lyrics} onChange={event => setLyrics(event.target.value)} placeholder="Paste your lyrics, one line per phrase…" /></label><p>Matched lines use measured audio timing. Unmatched lines need manual timing. Without written lyrics, import captions or add them manually; automatic singing recognition is not enabled.</p>{staleLyrics && <p role="status">Written lyrics changed. Align again before downloading.</p>}</details>}
      <div className={styles.actions}><button type="button" className="button button-primary" disabled={!source || busy || kind === "lyrics" && !lyrics.trim()} onClick={() => replace(() => { void generate(); })}>{kind === "lyrics" ? "Align lyrics" : "Generate captions"}</button><button type="button" className="button button-secondary" disabled={!source || busy} onClick={() => importInput.current?.click()}>Import SRT / VTT</button><button type="button" className="text-button" disabled={!source || busy} onClick={() => replace(() => showResult(emptyEditor()))}>Add manually</button><input ref={importInput} type="file" accept=".srt,.vtt" className="sr-only" aria-label="Import captions" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) replace(() => { void importFile(file); }); }} /></div>
      <details className={styles.details}><summary>Quality and privacy</summary><label>Transcription quality<select value={quality} disabled={busy || kind === "lyrics"} onChange={event => setQuality(event.target.value as TranscriptionQuality)}><option value="accurate">Accurate — better recognition</option><option value="fast">Fast — less memory</option></select></label><p>The first use downloads processing files (Accurate: about 249 MB of weights, plus runtime files). Cached files are reused. Completed sections can resume when you select the same recording again. Draft captions need review.</p></details>
      {busy && <div role="status" className={styles.processing}><strong>{recordingStage(progress)}</strong>{progress?.sections !== undefined && <span>{progress.completed ?? 0} of {progress.sections} sections</span>}{progress?.loaded !== undefined && <><span>{progress.file ?? "Model file"}: {(progress.loaded / 1e6).toFixed(1)} MB{progress.total ? ` / ${(progress.total / 1e6).toFixed(1)} MB` : ""}</span>{!!progress.total && <progress aria-label="Current model file download" max={progress.total} value={progress.loaded} />}</>}{progress?.warning && <p className={styles.hint}>{progress.warning}</p>}<button type="button" className="button button-secondary" onClick={stop}>Cancel processing</button></div>}
      {error && <p role="alert" className={styles.error}>{error}</p>}{notice && <p role="status" className={styles.hint}>{notice}</p>}
    </div></section>
    {source && result && <fieldset disabled={busy} className={styles.editor}><legend className="sr-only">Caption editing and downloads</legend><AudioCaptionEditor key={version} initialDocument={result} duration={source.duration} exportBlocked={staleLyrics} onSeek={value => { seek(value); void audio.current?.play().catch(() => setError("Use the audio Play button to listen.")); }} /></fieldset>}
    {kind === "lyrics" && source && result && recognized && <details className={styles.details}><summary>Compare recognized words</summary><p>Listen to check what the model heard. Recognition can miss or change sung words.</p><div className={styles.rows}>{recognized.cues.map((cue, index) => <div key={cue.id}><button type="button" className="text-button" disabled={busy || cue.start === null} onClick={() => { seek(cue.start! / 1000); void audio.current?.play().catch(() => setError("Use the audio Play button to listen.")); }}>Listen to section {index + 1}</button><p dir="auto">{cue.text}</p></div>)}</div></details>}
  </div>;
}
export function PodcastWorkspace() { return <AudioCaptionWorkspace />; }
