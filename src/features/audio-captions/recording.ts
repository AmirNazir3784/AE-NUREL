import { openSectionDecoder } from "../local-asr/section-decoder.ts";
import { runSubtitleJob } from "../local-asr/subtitle-job.ts";
import { browserCheckpoints, subtitleFileKey } from "../local-asr/subtitle-checkpoints.ts";
import type { AsrClient } from "../local-asr/asr-client.ts";
import type { AsrProgress } from "../local-asr/asr-core.ts";
import { accurateDeviceReason, type TranscriptionQuality } from "../local-asr/subtitle-capabilities.ts";

export const RECORDING_LIMITS = { seconds: 300, bytes: 30 * 1024 ** 2 };
export function validateRecording(file: Pick<File, "name" | "type" | "size">) {
  if (!/\.(mp3|wav)$/iu.test(file.name) || file.type && !["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav", "audio/vnd.wave", "application/octet-stream"].includes(file.type.toLowerCase())) throw new Error("Choose an MP3 or WAV recording.");
  if (!file.size) throw new Error("This file is empty. Choose another recording.");
  if (file.size > RECORDING_LIMITS.bytes) throw new Error("Choose a recording up to 30 MiB.");
}
export function recordingDuration(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0 || duration > RECORDING_LIMITS.seconds) throw new Error("Choose a recording up to five minutes.");
}
export async function prepareRecording(file: File, signal: AbortSignal) {
  validateRecording(file);
  const decoder = await openSectionDecoder(file, signal);
  try {
    recordingDuration(decoder.duration);
    const peaks = new Array<number>(600).fill(0);
    for (let start = 0; start < decoder.duration; start += 120) {
      const samples = await decoder.read(start, Math.min(start + 120, decoder.duration));
      for (let i = 0; i < samples.length; i += 8) { const bin = Math.min(peaks.length - 1, Math.floor((start + i / 16000) / decoder.duration * peaks.length)); peaks[bin] = Math.max(peaks[bin], Math.abs(samples[i])); }
      signal.throwIfAborted();
    }
    return { duration: decoder.duration, peaks };
  } finally { decoder.dispose(); }
}
export async function transcribeRecording(file: File, quality: TranscriptionQuality, asr: AsrClient, signal: AbortSignal, progress: (value: AsrProgress) => void, memoryGiB?: number, audioKind: "speech" | "music" = "speech") {
  validateRecording(file);
  const reason = quality === "accurate" && accurateDeviceReason(memoryGiB); if (reason) throw new Error(reason);
  progress({ stage: "preparing" });
  const key = await subtitleFileKey(file, signal), decoder = await openSectionDecoder(file, signal);
  try { recordingDuration(decoder.duration); }
  catch (error) { decoder.dispose(); throw error; }
  // The existing shared job owns section retries, stitching, checkpoints and
  // model lifecycle. Translation is not part of this English-only workflow.
  const result = await runSubtitleJob({ filename: file.name, fileKey: key, spoken: "en", target: "same", quality, audioKind, backend: "auto", signal, progress }, {
    decoder, asr, store: browserCheckpoints,
    translator: { cancel() {}, async translate() { throw new Error("Translation is unavailable in this workflow."); } },
  });
  if (!result.document.cues.length) throw new Error("No timed speech was found. Try a clearer recording, or import captions.");
  return result;
}
export function recordingStage(progress: AsrProgress | null) {
  if (!progress) return "Preparing recording";
  const names: Record<string, string> = { preparing: "Preparing recording", loading: "Loading speech model", download: "Downloading speech model", detecting: "Finding speech", transcribing: "Transcribing on your device", building: "Building captions" };
  return names[progress.stage] ?? "Processing recording";
}
