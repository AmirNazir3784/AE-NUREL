import { ASR_SAMPLE_RATE, captionDocument, type TimedText } from "./asr-core.ts";
import type { SpeechRegion } from "./speech-activity.ts";
type Recognizer = (samples: Float32Array) => Promise<{ text: string; chunks?: TimedText[] }>;

export async function transcribeSpeech(samples: Float32Array, regions: readonly SpeechRegion[], recognize: Recognizer) {
  if (!regions.length) return { text: "", chunks: [] as TimedText[] };
  let previousEnd = 0;
  for (const region of regions) {
    if (!Number.isFinite(region.start) || !Number.isFinite(region.end) || region.start < previousEnd || region.end <= region.start || region.end > samples.length / ASR_SAMPLE_RATE) throw new Error("Invalid speech region timeline.");
    previousEnd = region.end;
  }
  // Preserve Whisper's full source context and timeline. Cropping to VAD edges can
  // cut phonemes or cause incomplete final timestamps; no silence is concatenated away.
  const output = await recognize(samples);
  const local = output.chunks ?? [];
  const document = captionDocument(local, samples.length / ASR_SAMPLE_RATE, "speech.wav");
  if (output.text.trim() && !document.cues.length) throw new Error("Speech was recognized without usable timestamps. No subtitle file was invented.");
  // A model segment entirely outside detected speech is unsupported. Never split
  // its text or invent new timings for a segment that spans speech and a pause.
  const chunks = local.filter(chunk => chunk.timestamp[0] !== null && chunk.timestamp[1] !== null && regions.some(region => chunk.timestamp[0]! < region.end && chunk.timestamp[1]! > region.start));
  return { text: chunks.map(chunk => chunk.text.trim()).filter(Boolean).join(" "), chunks };
}
