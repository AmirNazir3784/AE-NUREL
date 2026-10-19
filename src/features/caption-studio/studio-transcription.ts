import { captionDocument, type AsrProgress } from "../local-asr/asr-core.ts";
import { validateSpokenLanguage, validateTranscriptionQuality, accurateDeviceReason, type TranscriptionQuality } from "../local-asr/subtitle-capabilities.ts";
import type { AsrClient } from "../local-asr/asr-client.ts";
import { extractStudioSamples } from "./studio-audio.ts";

export type DeviceTranscription = { language: string; quality: TranscriptionQuality };
export function validateDeviceTranscription(options: DeviceTranscription, duration: number, memoryGiB?: number) {
  validateSpokenLanguage(options.language); validateTranscriptionQuality(options.quality);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 120) throw new Error("Choose a video up to two minutes.");
  const reason = options.quality === "accurate" && accurateDeviceReason(memoryGiB);
  if (reason) throw new Error(reason);
}

// Explicit device mode only. Reuses the existing pinned worker/cache/decoding;
// server mode never calls this as a fallback. No recognition substitutions.
export async function transcribeStudioOnDevice(file: File, duration: number, options: DeviceTranscription, client: AsrClient, signal: AbortSignal, progress: (value: AsrProgress) => void, memoryGiB?: number) {
  validateDeviceTranscription(options, duration, memoryGiB); signal.throwIfAborted();
  progress({ stage: "preparing" });
  const samples = await extractStudioSamples(file, duration, signal);
  const result = await client.run(samples, "auto", signal, progress, { language: options.language, quality: options.quality, multilingual: options.language !== "en", wordTimestamps: true });
  signal.throwIfAborted(); progress({ stage: "building" });
  const document = captionDocument(result.chunks, duration, file.name, true);
  if (!document.cues.length) throw new Error("No timed speech was found. Try a clearer recording or select the spoken language.");
  return { document, words: result.chunks };
}
