"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { Icon } from "@/components/ui/icon";
import { emptyEditor, openSubtitle, validateSubtitleFile, type EditorDocument } from "@/lib/subtitle-editor";
import type { AsrProgress } from "../local-asr/asr-core";
import type { AsrClient } from "../local-asr/asr-client";
import { SPOKEN_LANGUAGES, type TranscriptionQuality } from "../local-asr/subtitle-capabilities";
import { LYRIC_RECOGNIZER } from "./lyric-model";
import { hardwareGpu, lyricCapacity } from "../local-asr/browser-capability";
import { withProcessingLease } from "../local-asr/processing-lease";
import { ReplaceWorkDialog } from "../caption-studio/replace-work-dialog";
import { AudioCaptionEditor } from "./audio-caption-editor";
import { LyricPreview } from "./lyric-preview";
import { prepareRecording, transcribeRecording, recordingStage } from "./recording";
import styles from "./audio-captions.module.css";
import { alignProvidedLyrics, lyricLines, measuredWordDocument, untimedLyricDocument, LYRIC_TEXT_LIMIT } from "./lyric-alignment";

type Recording = { file: File; url: string; duration: number; peaks: number[] };
export function AudioCaptionWorkspace({ kind = "podcast" }: { kind?: "podcast" | "lyrics" }) {
  const [source, setSource] = useState<Recording | null>(null), [result, setResult] = useState<EditorDocument | null>(null), [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState<AsrProgress | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [quality, setQuality] = useState<TranscriptionQuality>("accurate"), [time, setTime] = useState(0), [pending, setPending] = useState<(() => void) | null>(null);
  const [lyrics, setLyrics] = useState("");
  const [recognitionLimit, setRecognitionLimit] = useState<number | null>(null);
  const [language, setLanguage] = useState("en"), [segmentation, setSegmentation] = useState("phrase");
  const [previewDocument, setPreviewDocument] = useState<EditorDocument | null>(null);
  const [generatedSettings, setGeneratedSettings] = useState<{ language: string; segmentation: string } | null>(null);
  const [alignedLyrics, setAlignedLyrics] = useState<string | null>(null);
  const [recognized, setRecognized] = useState<EditorDocument | null>(null);
  const staleLyrics = kind === "lyrics" && alignedLyrics !== null && lyrics !== alignedLyrics;
  const staleSettings = kind === "lyrics" && generatedSettings !== null && (generatedSettings.language !== language || generatedSettings.segmentation !== segmentation);
  const audio = useRef<HTMLAudioElement>(null), importInput = useRef<HTMLInputElement>(null), job = useRef<AbortController | null>(null), client = useRef<Pick<AsrClient, "run" | "cancel"> | null>(null), run = useRef(0);
  const getCurrentTime = useCallback(() => audio.current?.currentTime ?? 0, []);
  const preparationPercent = progress?.preparation && progress.preparation.total > 0 && progress.preparation.loaded < progress.preparation.total ? Math.floor(progress.preparation.loaded / progress.preparation.total * 100) : undefined;
  const phase = progress?.stage === "building" ? 2 : progress && ["transcribing", "detecting"].includes(progress.stage) ? 1 : 0;
  useEffect(() => () => { ++run.current; job.current?.abort(); client.current?.cancel(); }, []);
  useEffect(() => { let active = true; if (kind === "lyrics") void hardwareGpu(navigator).then(gpu => { if (active) setRecognitionLimit(lyricCapacity((navigator as Navigator & { deviceMemory?: number }).deviceMemory, gpu).seconds); }); return () => { active = false; }; }, [kind]);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);
  function replace(action: () => void) { if (result) setPending(() => action); else action(); }
  function stop() { ++run.current; job.current?.abort(); client.current?.cancel(); setBusy(false); setNotice(result ? "Processing cancelled. Your previous captions are kept." : "Processing cancelled. You can try again."); }
  function showResult(document: EditorDocument) { setResult(document); setPreviewDocument(document); setGeneratedSettings(null); setRecognized(null); setAlignedLyrics(null); setVersion(value => value + 1); setNotice("Captions ready. Review the words and timing."); }
  async function choose(file: File) {
    if (busy) return;
    const controller = new AbortController(), id = ++run.current; job.current = controller; setBusy(true); setError(""); setNotice(""); setProgress(null);
    try { const prepared = await prepareRecording(file, controller.signal); if (id !== run.current) return; audio.current?.pause(); setSource({ ...prepared, file, url: URL.createObjectURL(file) }); setResult(null); setPreviewDocument(null); setRecognized(null); setAlignedLyrics(null); setTime(0); }
    catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "This recording could not be opened."); }
    finally { if (id === run.current) { job.current = null; setBusy(false); } }
  }
  async function generate() {
    if (!source || busy) return;
    if (kind === "lyrics") { try { if (lyrics.trim()) lyricLines(lyrics); if (quality !== "accurate") throw new Error("Lyric alignment requires Accurate word timestamps."); } catch (failure) { setError(failure instanceof Error ? failure.message : "Check your written lyrics."); return; } }
    const controller = new AbortController(), id = ++run.current; job.current = controller; setBusy(true); setProgress(null); setError(""); setNotice(""); audio.current?.pause();
    try {
      client.current ??= kind === "lyrics" ? new (await import("./lyrics-browser-client")).LyricsBrowserClient() : new (await import("../local-asr/asr-client")).AsrClient();
      const recognize = () => transcribeRecording(source.file, quality, client.current!, controller.signal, setProgress, (navigator as Navigator & { deviceMemory?: number }).deviceMemory, kind === "lyrics" ? "music" : "speech", kind === "lyrics" ? language : "en", kind === "lyrics" ? LYRIC_RECOGNIZER : undefined);
      const output = await (kind === "lyrics" ? withProcessingLease(controller.signal, recognize) : recognize());
      if (id !== run.current) return;
      if (kind === "lyrics") {
        if (lyrics.trim()) {
          const aligned = alignProvidedLyrics(lyrics, output.words, source.duration, source.file.name); showResult(aligned.document); setAlignedLyrics(lyrics); setRecognized(output.document);
          setNotice(aligned.missing.length ? `${aligned.missing.length} lines need timing.` : "Lyrics matched. Review the timing.");
        } else {
          showResult(segmentation === "word" ? measuredWordDocument(output.words, source.duration, source.file.name) : { ...output.document, filename: source.file.name.replace(/\.[^.]+$/u, "") + "-lyrics.srt" });
          setAlignedLyrics(lyrics); setNotice("Captions ready. Review before exporting.");
        }
        setGeneratedSettings({ language, segmentation });
      } else showResult(output.document);
    }
    catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Transcription failed. Try again."); }
    finally { if (id === run.current) { job.current = null; setBusy(false); } }
  }
  async function importFile(file: File) {
    if (!source || busy) return;
    const controller = new AbortController(), id = ++run.current; job.current = controller; setBusy(true); setProgress({ stage: "building" }); setError("");
    try { validateSubtitleFile(file); const bytes = await file.arrayBuffer(); controller.signal.throwIfAborted(); if (id !== run.current) return; const data = openSubtitle(file, bytes); if (data.cues.length > (kind === "lyrics" ? 2500 : 500)) throw new Error(kind === "lyrics" ? "Import up to 2,500 captions." : "Import up to 500 captions."); showResult(data); }
    catch (failure) { if (!controller.signal.aborted && id === run.current) setError(failure instanceof Error ? failure.message : "These captions could not be read."); }
    finally { if (id === run.current) { job.current = null; setBusy(false); } }
  }
  const duration = source?.duration;
  const seek = useCallback((value: number) => { if (audio.current && duration !== undefined) { audio.current.currentTime = Math.max(0, Math.min(duration, value)); setTime(audio.current.currentTime); } }, [duration]);
  const playFrom = useCallback((value: number) => { seek(value); void audio.current?.play().catch(() => setError("Use the audio Play button to listen.")); }, [seek]);
  function timeManually() { if (!source) return; try { showResult(untimedLyricDocument(lyrics, source.file.name)); setAlignedLyrics(lyrics); setError(""); setNotice("Play the song, then set each line’s start and end."); } catch (failure) { setError(failure instanceof Error ? failure.message : "Add your lyrics first."); } }
  return <div id={kind === "lyrics" ? "lyrics-workspace" : undefined} data-empty={!source || undefined} className={`${styles.workspace} ${kind === "lyrics" ? styles.lyricsWorkspace : ""}`}>
    {pending && <ReplaceWorkDialog message="Download any caption edits before replacing them." onCancel={() => setPending(null)} onConfirm={() => { const action = pending; setPending(null); action(); }} />}
    {kind !== "lyrics" && <header className={styles.intro}><span className={styles.icon}><Icon name="subtitle" size={25} /></span><div><h1>Podcast to Captions</h1><p>Turn English podcast recordings into timed captions. Review and download SRT or VTT.</p><div className={styles.actions}><span className={styles.chip}>Ready to transcribe</span><span className={styles.chip}>English · MP3 / WAV</span></div></div></header>}
    <section className={styles.card} aria-label="Your recording"><div className={styles.bar}><h2>{kind === "lyrics" ? "Your song" : "Your recording"}</h2><span className={styles.hint}>Up to 5 minutes · 30 MiB</span></div><div className={styles.body}>
      {!source ? <FileUpload accept=".mp3,.wav,audio/mpeg,audio/wav" busy={busy} title={kind === "lyrics" ? "Add your song" : "Drop your audio here"} description="Choose an MP3 or WAV recording." buttonLabel="Choose audio" hint={kind === "lyrics" ? "MP3 / WAV · Up to 5 minutes · 30 MiB" : "Nothing is uploaded to AENural's servers."} onFile={file => replace(() => { void choose(file); })} onError={setError} /> : <>
        <div className={styles.bar}><strong className={styles.filename}>{source.file.name}</strong><button type="button" className="text-button" disabled={busy} onClick={() => importInput.current?.ownerDocument.getElementById("podcast-change-file")?.click()}>Change file</button><input id="podcast-change-file" type="file" accept=".mp3,.wav" className="sr-only" disabled={busy} aria-label="Change recording" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) replace(() => { void choose(file); }); }} /></div>
        <svg className={styles.waveform} viewBox="0 0 600 64" preserveAspectRatio="none" role="img" aria-label="Recording waveform"><path d={source.peaks.map((value, i) => `M${i},${32 - value * 30}v${Math.max(1, value * 60)}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="1" /></svg>
        {kind !== "lyrics" && <label className={styles.seek}>Seek recording<input type="range" min={0} max={source.duration} step={.01} value={time} disabled={busy} onChange={event => seek(Number(event.target.value))} /></label>}
        <audio ref={audio} controls preload="metadata" src={source.url} aria-label={kind === "lyrics" ? "Song recording" : "Podcast recording"} onTimeUpdate={kind === "lyrics" ? undefined : event => setTime(event.currentTarget.currentTime)} onSeeked={kind === "lyrics" ? undefined : event => setTime(event.currentTarget.currentTime)} onError={() => setError("This recording cannot be played. Try PCM WAV or another MP3.")} />
        {kind !== "lyrics" && <p className={styles.hint}>{time.toFixed(1)} / {source.duration.toFixed(1)} seconds</p>}
        {kind === "lyrics" && result && <LyricPreview audio={audio} document={previewDocument} stale={staleLyrics || staleSettings} />}
      </>}
      {kind === "lyrics" && <div className={styles.lyricOptions}><label>Language<select value={language} disabled={busy} onChange={event => setLanguage(event.target.value)}><option value="auto">Auto detect</option>{SPOKEN_LANGUAGES.map(option => <option value={option.code} key={option.code}>{option.name}</option>)}</select></label>{!lyrics.trim() && <label>Caption length<select value={segmentation} disabled={busy} onChange={event => setSegmentation(event.target.value)}><option value="phrase">Phrases</option><option value="word">Words</option></select></label>}<label className={styles.lyricsInput}><span>Lyrics <small>(optional)</small></span><textarea rows={3} disabled={busy} maxLength={LYRIC_TEXT_LIMIT} value={lyrics} onChange={event => setLyrics(event.target.value)} placeholder="Paste lyrics, one line per caption." /></label>{staleLyrics && <p role="status" className={styles.hint}>Lyrics changed. Generate again or set timing.</p>}</div>}
      {kind === "lyrics" && recognitionLimit !== 300 && <p className={styles.hint}>{recognitionLimit === null ? "Checking…" : recognitionLimit === 0 ? "Auto captions unavailable. Import captions or set timing." : "Auto captions · up to 30 seconds"}</p>}
      <div className={styles.actions}><button type="button" className="button button-primary" disabled={!source || busy || kind === "lyrics" && (recognitionLimit === null || recognitionLimit === 0)} onClick={() => replace(() => { void generate(); })}>{kind === "lyrics" ? "Generate lyrics" : "Generate captions"}</button><button type="button" className="button button-secondary" disabled={!source || busy} onClick={() => importInput.current?.click()}>{kind === "lyrics" ? "Import captions" : "Import SRT / VTT"}</button><button type="button" className="text-button" disabled={!source || busy || kind === "lyrics" && !lyrics.trim()} onClick={() => replace(() => kind === "lyrics" ? timeManually() : showResult(emptyEditor()))}>{kind === "lyrics" ? "Set timing" : "Add manually"}</button><input ref={importInput} type="file" accept=".srt,.vtt" className="sr-only" aria-label="Import captions" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) replace(() => { void importFile(file); }); }} /></div>
      {kind !== "lyrics" && <details className={styles.details}><summary>Quality and privacy</summary><label>Transcription quality<select value={quality} disabled={busy} onChange={event => setQuality(event.target.value as TranscriptionQuality)}><option value="accurate">Accurate — better recognition</option><option value="fast">Fast — less memory</option></select></label><p>The first use downloads processing files (Accurate: about 249 MB of weights, plus runtime files). Cached files are reused. Completed sections can resume when you select the same recording again. Draft captions need review.</p></details>}
      {busy && <div role="status" className={styles.processing}>{kind === "lyrics" ? <><div className={styles.progressHeading}><strong>{!source ? "Opening song…" : phase === 0 ? "Preparing…" : phase === 1 ? "Listening…" : "Creating captions…"}</strong>{phase === 0 && preparationPercent !== undefined && <span>{preparationPercent}%</span>}</div><progress max={100} value={phase === 0 ? preparationPercent : undefined} aria-label={phase === 0 ? "Preparation progress" : phase === 1 ? "Recognizing lyrics" : "Creating captions"} /></> : <><strong>{recordingStage(progress)}</strong>{progress?.loaded !== undefined && <span>{progress.file ?? "Model file"}: {(progress.loaded / 1e6).toFixed(1)} MB</span>}</>}{kind !== "lyrics" && progress?.sections !== undefined && <span>{progress.completed ?? 0} of {progress.sections} sections</span>}{progress?.warning && <p className={styles.hint}>{kind !== "lyrics" ? progress.warning : /storage|cach/i.test(progress.warning) ? "Keep this tab open until captions are ready." : /retry/i.test(progress.warning) ? "Trying again…" : "Review captions before sharing."}</p>}<button type="button" className="button button-secondary" aria-label="Cancel processing" onClick={stop}>{kind === "lyrics" ? "Cancel" : "Cancel processing"}</button></div>}
      {error && <p role="alert" className={styles.error}>{error}</p>}{notice && <p role="status" className={styles.hint}>{notice}</p>}
      {staleSettings && <p role="status" className={styles.hint}>Options changed. Generate again.</p>}
    </div></section>
    {source && result && <fieldset disabled={busy} className={styles.editor}><legend className="sr-only">Caption editing and downloads</legend><AudioCaptionEditor key={version} initialDocument={result} duration={source.duration} exportBlocked={staleLyrics || staleSettings} getCurrentTime={kind === "lyrics" ? getCurrentTime : undefined} onDocumentChange={kind === "lyrics" ? setPreviewDocument : undefined} onSeek={playFrom} /></fieldset>}
    {kind === "lyrics" && source && result && recognized && <details className={styles.details}><summary>Compare recognized words</summary><p>Listen to check what the model heard. Recognition can miss or change sung words.</p><div className={styles.rows}>{recognized.cues.map((cue, index) => <div key={cue.id}><button type="button" className="text-button" disabled={busy || cue.start === null} onClick={() => { seek(cue.start! / 1000); void audio.current?.play().catch(() => setError("Use the audio Play button to listen.")); }}>Listen to section {index + 1}</button><p dir="auto">{cue.text}</p></div>)}</div></details>}
  </div>;
}
export function PodcastWorkspace() { return <AudioCaptionWorkspace />; }
