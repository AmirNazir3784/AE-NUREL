import { conversionFilename } from "../../lib/subtitle-conversion.ts";
import { emptyEditor, exportEditor, type EditorDocument, type SubtitleFormat } from "../../lib/subtitle-editor.ts";
import { VAD_URL, type SpeechActivity } from "./speech-activity.ts";

export const ASR_MODEL = "onnx-community/whisper-tiny.en";
export const ASR_REVISION = "2575352d61be1bf7225cf8f8b268a4678025fc58";
export const ASR_ORT_VERSION = "1.31.0-dev.20260914-8d85527a0";
export const ASR_CACHE = "aenural-whisper-tiny-en-v1";
export const ASR_SAMPLE_RATE = 16_000;
// Deliberately conservative until longer jobs pass measured device acceptance.
export const ASR_MAX_SECONDS = 60;
export const ASR_MAX_BYTES = 25 * 1024 * 1024;
export type Backend = "auto" | "wasm" | "webgpu";
export type TimedText = { text: string; timestamp: [number | null, number | null] };
export type AsrProgress = { stage: "loading" | "download" | "detecting" | "transcribing"; file?: string; loaded?: number; total?: number; backend?: string; warning?: string };
export type AsrResult = { chunks: TimedText[]; text: string; backend: string; loadMs: number; inferenceMs: number; cacheHits: number; downloadedBytes: number; speechActivity?: SpeechActivity & { elapsedMs: number }; requests: { method: string; url: string }[] };
export type WorkerReply = { id: number } & ({ type: "progress"; progress: AsrProgress } | { type: "result"; result: AsrResult } | { type: "error"; message: string });

export function validateAsrFile(file: Pick<File, "name" | "size">) {
  if (!/\.(mp3|wav)$/i.test(file.name)) throw new Error("Choose an MP3 or WAV recording.");
  if (!file.size) throw new Error("This file is empty. Choose a recording with speech.");
  if (file.size > ASR_MAX_BYTES) throw new Error("Choose a recording no larger than 25 MB.");
}
export function validateDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("The recording has no readable duration.");
  if (seconds > ASR_MAX_SECONDS) throw new Error("This preview supports recordings up to 60 seconds. Choose a shorter recording.");
}
export function isDigitalSilence(samples: Float32Array) {
  let silent = true;
  for (const value of samples) {
    if (!Number.isFinite(value)) throw new Error("The decoded audio contains invalid samples.");
    if (value !== 0) silent = false;
  }
  return silent;
}

export function permittedAssetRequest(url: URL, method: string, hasBody: boolean) {
  return !hasBody && ["GET", "HEAD"].includes(method.toUpperCase()) && !url.search && (
    url.href === VAD_URL ||
    url.origin === "https://huggingface.co" && url.pathname.startsWith("/" + ASR_MODEL + "/resolve/" + ASR_REVISION + "/") ||
    url.origin === "https://cdn.jsdelivr.net" && url.pathname.startsWith("/npm/onnxruntime-web@" + ASR_ORT_VERSION + "/dist/")
  );
}

// Use the model's actual segment intervals. No evenly distributed or fabricated timing.
export function captionDocument(chunks: readonly TimedText[], duration: number, filename: string): EditorDocument {
  validateDuration(duration);
  const document: EditorDocument = { ...emptyEditor(), filename: conversionFilename(filename, "srt") };
  let lastEnd = 0;
  for (const chunk of chunks) {
    const text = chunk.text.replace(/\s+/gu, " ").trim();
    if (!text) continue;
    const [start, end] = chunk.timestamp;
    if (start === null || end === null || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || start > duration || end > duration + 0.1) throw new Error("The model returned incomplete timing. No subtitle file was invented. Try a clearer, shorter recording.");
    const startMs = Math.round(start * 1000), endMs = Math.min(Math.round(duration * 1000), Math.round(end * 1000));
    if (startMs < lastEnd || endMs <= startMs) throw new Error("The model returned overlapping or invalid subtitle timings. Try a clearer recording.");
    const previous = document.cues.at(-1);
    const join = previous && previous.end !== null && previous.start !== null && startMs - previous.end < 700 && endMs - previous.start <= 6000 && (previous.text + " " + text).length <= 84 && !/[.!?][”’"']?$/.test(previous.text);
    if (join) { previous.text += " " + text; previous.end = endMs; }
    else document.cues.push({ id: "asr-" + document.cues.length, start: startMs, end: endMs, text, identifier: "", srtSettings: "", vttSettings: "" });
    lastEnd = endMs;
  }
  return document;
}

export function captionExport(document: EditorDocument, format: SubtitleFormat) {
  return { filename: conversionFilename(document.filename, format), content: exportEditor(document, format) };
}

// Bounded per-decoder-buffer resampling on the source's absolute timeline.
export function mixIntoMono(output: Float32Array, channels: readonly Float32Array[], rate: number, timestamp: number) {
  if (!channels.length || channels.length > 2 || rate < 8000 || rate > 48000 || !Number.isFinite(timestamp)) throw new Error("Use mono or stereo audio at 8–48 kHz.");
  const length = channels[0].length;
  if (channels.some(channel => channel.length !== length)) throw new Error("The audio channels have inconsistent lengths.");
  const from = Math.max(0, Math.ceil(timestamp * ASR_SAMPLE_RATE));
  const to = Math.min(output.length, Math.ceil((timestamp + length / rate) * ASR_SAMPLE_RATE));
  for (let i = from; i < to; i++) {
    const source = (i / ASR_SAMPLE_RATE - timestamp) * rate, left = Math.max(0, Math.floor(source)), right = Math.min(length - 1, left + 1), fraction = source - left;
    let value = 0;
    for (const channel of channels) value += (channel[left] ?? 0) * (1 - fraction) + (channel[right] ?? 0) * fraction;
    output[i] = value / channels.length;
  }
}
