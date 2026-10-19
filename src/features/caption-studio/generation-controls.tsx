"use client";
import { useState } from "react";
import { SPOKEN_LANGUAGES, type TranscriptionQuality } from "../local-asr/subtitle-capabilities";
import type { AsrProgress } from "../local-asr/asr-core";
import styles from "./studio.module.css";

export type StudioGenerationSettings = { mode: "device" | "server"; language: string; quality: TranscriptionQuality; token: string; consent: boolean };
export function GenerationControls({ available, busy, transcribing, duration, hasAudio, stage, progress, onGenerate, onCancel }: { available: boolean; busy: boolean; transcribing: boolean; duration: number; hasAudio: boolean; stage: string; progress: AsrProgress | null; onGenerate: (settings: StudioGenerationSettings) => void; onCancel: () => void }) {
  const [mode, setMode] = useState<"device" | "server">("device"), [language, setLanguage] = useState("auto"), [quality, setQuality] = useState<TranscriptionQuality>("accurate");
  const [token, setToken] = useState(""), [consent, setConsent] = useState(false);
  return <div className={styles.auto}>
    <label>Processing<select value={mode} disabled={busy} onChange={event => { setMode(event.target.value as "device" | "server"); setConsent(false); }}><option value="device">On this device</option><option value="server" disabled={!available}>Private server{!available ? " — unavailable" : ""}</option></select></label>
    {mode === "device" ? <><div className={styles.times}><label>Spoken language<select value={language} disabled={busy} onChange={event => setLanguage(event.target.value)}><option value="auto">Auto detect</option>{SPOKEN_LANGUAGES.map(item => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label><label>Quality<select value={quality} disabled={busy} onChange={event => setQuality(event.target.value as TranscriptionQuality)}><option value="accurate">Accurate</option><option value="fast">Fast</option></select></label></div><p>Audio stays on your device. First use downloads a speech model; Accurate needs more memory and time. Choose Fast for smaller devices.</p></> : <><p>English, up to 60 seconds. Audio is uploaded to the private server and deleted after processing. Your video stays here.</p><label>Private processing access token<input type="password" autoComplete="off" maxLength={256} value={token} disabled={busy} onChange={event => setToken(event.target.value)} /></label><label className={styles.inline}><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />Allow audio upload for transcription.</label></>}
    <button type="button" className="button button-primary" disabled={busy || !hasAudio || mode === "server" && (!available || !consent || token.length < 32 || duration > 60)} onClick={() => onGenerate({ mode, language: mode === "server" ? "en" : language, quality, token, consent })}>Generate captions</button>
    {!hasAudio && <p>This video has no audio track. Import captions or add your own.</p>}
    {mode === "server" && duration > 60 && <p>Use On this device for videos longer than 60 seconds.</p>}
    {transcribing && <div role="status" aria-live="polite"><p>{stage}</p>{progress?.loaded !== undefined && <><span>{(progress.loaded / 1e6).toFixed(1)} MB{progress.total ? ` of ${(progress.total / 1e6).toFixed(1)} MB` : " downloaded"}</span>{!!progress.total && <progress aria-label="Current model file download" max={progress.total} value={progress.loaded} />}</>}<button type="button" className="text-button" onClick={onCancel}>Cancel transcription</button></div>}
  </div>;
}
