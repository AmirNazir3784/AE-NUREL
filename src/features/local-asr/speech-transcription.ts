import { ASR_SAMPLE_RATE, captionDocument, type TimedText } from "./asr-core.ts";
import type { SpeechRegion } from "./speech-activity.ts";
type Recognizer = (samples: Float32Array) => Promise<{ text: string; chunks?: TimedText[] }>;

export async function transcribeSpeech(samples: Float32Array, regions: readonly SpeechRegion[], recognize: Recognizer, longAudio = false) {
  if (!regions.length) return { text: "", chunks: [] as TimedText[] };
  let previousEnd = 0;
  for (const region of regions) {
    if (!Number.isFinite(region.start) || !Number.isFinite(region.end) || region.start < previousEnd || region.end <= region.start || region.end > samples.length / ASR_SAMPLE_RATE) throw new Error("Invalid speech region timeline.");
    previousEnd = region.end;
  }
  // Short-file behavior keeps the original full context. For long sections,
  // surround padded VAD regions with another second of real context. Decode
  // each disjoint context independently: never concatenate away silence. This
  // avoids Whisper hallucinating through minutes of silence between utterances.
  let output: Awaited<ReturnType<Recognizer>>;
  if (longAudio) {
    const contexts: SpeechRegion[] = [];
    for (const region of regions) {
      const context = { start: Math.max(0, region.start - 1), end: Math.min(samples.length / ASR_SAMPLE_RATE, region.end + 1) };
      const previous = contexts.at(-1);
      if (previous && context.start <= previous.end) previous.end = context.end;
      else contexts.push(context);
    }
    const local: TimedText[] = []; const texts: string[] = [];
    for (const context of contexts) {
      const from = Math.floor(context.start * ASR_SAMPLE_RATE), to = Math.ceil(context.end * ASR_SAMPLE_RATE);
      const result = await recognize(samples.subarray(from, to));
      texts.push(result.text);
      for (const chunk of result.chunks ?? []) local.push({ text: chunk.text, timestamp: [chunk.timestamp[0] === null ? null : chunk.timestamp[0] + from / ASR_SAMPLE_RATE, chunk.timestamp[1] === null ? null : chunk.timestamp[1] + from / ASR_SAMPLE_RATE] });
    }
    output = { text: texts.join(" "), chunks: local };
  } else output = await recognize(samples);
  const local = output.chunks ?? [];
  if (longAudio && local.some(chunk => chunk.text.trim() && (chunk.timestamp[0] === null || chunk.timestamp[1] === null || !Number.isFinite(chunk.timestamp[0]) || !Number.isFinite(chunk.timestamp[1]) || chunk.timestamp[0] < 0 || chunk.timestamp[1] <= chunk.timestamp[0]))) throw new Error("Speech was recognized with incomplete word timing. Retry this section; no timing was invented.");
  // A model segment entirely outside detected speech is unsupported. Never split
  // its text or invent new timings for a segment that spans speech and a pause.
  const chunks = local.filter(chunk => chunk.timestamp[0] !== null && chunk.timestamp[1] !== null && regions.some(region => chunk.timestamp[0]! < region.end && chunk.timestamp[1]! > region.start));
  const document = captionDocument(longAudio ? chunks : local, samples.length / ASR_SAMPLE_RATE, "speech.wav", longAudio);
  if (output.text.trim() && !local.length) throw new Error("Speech was recognized without usable timestamps. No subtitle file was invented.");
  if (!longAudio && output.text.trim() && !document.cues.length) throw new Error("Speech was recognized without usable timestamps. No subtitle file was invented.");
  return { text: chunks.map(chunk => chunk.text.trim()).filter(Boolean).join(" "), chunks };
}
