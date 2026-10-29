"use client";
import { useState } from "react";
import { SPOKEN_LANGUAGES, type TranscriptionQuality } from "../local-asr/subtitle-capabilities";
import type { AsrProgress } from "../local-asr/asr-core";
import { captionGenerationDisplay } from "./generation-progress";
import styles from "./studio.module.css";
import type { CaptionAccess } from "../membership/caption-policy";

export type StudioGenerationSettings = { mode: "device" | "server"; language: string; quality: TranscriptionQuality; token: string; consent: boolean };
export function GenerationControls({ available, busy, transcribing, duration, hasAudio, stage, progress, access, onGenerate, onCancel }: { available: boolean; busy: boolean; transcribing: boolean; duration: number; hasAudio: boolean; stage: string; progress: AsrProgress | null; access?:CaptionAccess; onGenerate: (settings: StudioGenerationSettings) => void; onCancel: () => void }) {
  const [mode, setMode] = useState<"device" | "server">("device"), [language, setLanguage] = useState("auto"), [quality, setQuality] = useState<TranscriptionQuality>(access&&!access.accurate?"fast":"accurate");
  const chosenQuality=access&&!access.accurate?'fast':quality;
  const [token, setToken] = useState(""), [consent, setConsent] = useState(false);
  const indicator = captionGenerationDisplay(progress);
  const percent = indicator.phase === 0 ? indicator.preparationValue : indicator.kind === "sections" ? indicator.value : null;
  return <div className={styles.auto}>
    <label>Processing<select value={mode} disabled={busy} onChange={event => { setMode(event.target.value as "device" | "server"); setConsent(false); }}><option value="device">Standard transcription</option><option value="server" disabled={!available}>Private server{!available ? " — unavailable" : ""}</option></select></label>
    {mode === "device" ? <><div className={styles.times}><label>Spoken language<select value={language} disabled={busy} onChange={event => setLanguage(event.target.value)}><option value="auto">Auto detect</option>{SPOKEN_LANGUAGES.map(item => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label><label>Quality<select value={chosenQuality} disabled={busy} onChange={event => setQuality(event.target.value as TranscriptionQuality)}><option value="accurate" disabled={!!access&&!access.accurate}>Accurate{access&&!access.accurate?" ? Premium":""}</option><option value="fast">Fast</option></select></label></div></> : <><p>Private audio processing: English, up to 60 seconds. Your video stays here.</p><label>Private processing access token<input type="password" autoComplete="off" maxLength={256} value={token} disabled={busy} onChange={event => setToken(event.target.value)} /></label><label className={styles.inline}><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />Allow audio upload for transcription.</label></>}
    <button type="button" className="button button-primary" disabled={busy || !hasAudio || !!access && duration > access.maxSeconds || mode === "server" && (!available || !consent || token.length < 32 || duration > 60)} onClick={() => onGenerate({ mode, language: mode === "server" ? "en" : language, quality: chosenQuality, token, consent })}>{transcribing ? mode === "device" ? indicator.button : "Generating captions…" : "Generate captions"}</button>
    {access&&duration>access.maxSeconds&&<p>Your plan supports videos up to {access.maxSeconds} seconds. Choose a shorter video or unlock the Source Window package.</p>}
    {!hasAudio && <p>This video has no audio track. Import captions or add your own.</p>}
    {mode === "server" && duration > 60 && <p>Use Standard transcription for videos longer than 60 seconds.</p>}
    {transcribing && <section className={styles.generationStatus} aria-label="Caption generation progress">
      {mode === "device" && <ol className={styles.generationPhases} aria-label="Caption generation stages">{["Prepare AI", "Recognize Speech", "Create Captions"].map((label, index) => <li key={label} aria-current={indicator.phase === index ? "step" : undefined} data-complete={index < indicator.phase || undefined}><span aria-hidden="true">{index < indicator.phase ? "✓" : "0" + (index + 1)}</span>{label}</li>)}</ol>}
      <div className={styles.generationStatusHeader}><strong role="status" aria-live="polite">{mode === "device" ? indicator.title : stage || "Preparing your captions..."}</strong>{mode === "device" && percent !== null && <span className={styles.generationPercent}>{percent}%</span>}</div>
      <div className={styles.generationMeter} role="progressbar" aria-label={indicator.phase === 0 ? "AI resource preparation" : "Speech recognition progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={mode === "device" ? percent ?? undefined : undefined} aria-valuetext={mode === "device" ? indicator.title : "Processing your audio"}><span className={percent === null || mode !== "device" ? styles.generationMeterBusy : styles.generationMeterFill} style={percent === null || mode !== "device" ? undefined : {width:`${percent}%`}} /></div>
      {mode === "device" && <p className={styles.generationDetail}>{indicator.phase === 0 ? percent !== null ? "AI resource preparation" : "Getting speech recognition ready. First-time preparation may take a little longer." : indicator.phase === 1 ? percent !== null ? "Speech sections completed" : "Finding the words and their timing in your video." : "Turning recognized words into editable captions."}</p>}
      <button type="button" className="text-button" onClick={onCancel}>Cancel transcription</button>
    </section>}
  </div>;
}
