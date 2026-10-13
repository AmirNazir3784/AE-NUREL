import { SECTION_MAX_SECONDS } from "./subtitle-capabilities.ts";
export const VAD_REVISION = "5cd7945676eb32225748052e2e6a0580e4686a08"; // Silero VAD 6.2.3
export const VAD_URL = "https://raw.githubusercontent.com/snakers4/silero-vad/" + VAD_REVISION + "/src/silero_vad/data/silero_vad.onnx";
export const VAD_SHA256 = "1a153a22f4509e292a94e67d6f9b85e8deb25b4988682b7e174c65279d8788e3";
export const VAD_FRAME = 512;
const SAMPLE_RATE = 16_000;
export type SpeechRegion = { start: number; end: number };
export type SpeechActivity = { regions: SpeechRegion[]; frames: number; peakProbability: number; speechSeconds: number };
export type VadRunner = (input: Float32Array, state: Float32Array) => Promise<{ probability: number; state: Float32Array }>;

// Hysteresis, minimum duration, hangover and padding operate on probabilities,
// never on recognized words or an amplitude cutoff. Times stay on the source timeline.
export function speechRegions(probabilities: readonly number[], samples: number): SpeechActivity {
  if (!Number.isInteger(samples) || samples <= 0 || samples > SAMPLE_RATE * SECTION_MAX_SECONDS || probabilities.length !== Math.ceil(samples / VAD_FRAME)) throw new Error("Invalid speech activity timeline.");
  const raw: SpeechRegion[] = [];
  let start = -1, negative = -1, peakProbability = 0;
  const finish = (end: number) => { if (start >= 0 && end - start >= SAMPLE_RATE * .25) raw.push({ start: start / SAMPLE_RATE, end: Math.min(end, samples) / SAMPLE_RATE }); start = -1; negative = -1; };
  probabilities.forEach((probability, index) => {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) throw new Error("The speech detector returned invalid confidence.");
    peakProbability = Math.max(peakProbability, probability);
    const position = index * VAD_FRAME;
    if (probability >= .5) { if (start < 0) start = position; negative = -1; }
    else if (probability < .35 && start >= 0) {
      if (negative < 0) negative = position;
      if (position - negative >= SAMPLE_RATE * .4) finish(negative);
    }
  });
  finish(negative >= 0 ? negative : samples);
  const regions: SpeechRegion[] = [];
  for (const region of raw) {
    const padded = { start: Math.max(0, region.start - .3), end: Math.min(samples / SAMPLE_RATE, region.end + .3) };
    const previous = regions.at(-1);
    // Keep short natural pauses in one Whisper context; never concatenate away a pause.
    if (previous && padded.start - previous.end <= .75) previous.end = padded.end;
    else regions.push(padded);
  }
  return { regions, frames: probabilities.length, peakProbability, speechSeconds: raw.reduce((sum, region) => sum + region.end - region.start, 0) };
}

export async function detectSpeech(samples: Float32Array, run: VadRunner, signal?: AbortSignal, onFrame?: (completed: number, total: number) => void): Promise<SpeechActivity> {
  if (!samples.length || samples.length > SAMPLE_RATE * SECTION_MAX_SECONDS || samples.some(value => !Number.isFinite(value))) throw new Error("Invalid audio for speech detection.");
  let state: Float32Array = new Float32Array(256);
  const context = new Float32Array(64), probabilities: number[] = [], total = Math.ceil(samples.length / VAD_FRAME);
  for (let offset = 0; offset < samples.length; offset += VAD_FRAME) {
    signal?.throwIfAborted();
    const input = new Float32Array(64 + VAD_FRAME);
    input.set(context); input.set(samples.subarray(offset, offset + VAD_FRAME), 64);
    const result = await run(input, state);
    if (!(result.state instanceof Float32Array) || result.state.length !== 256 || result.state.some(value => !Number.isFinite(value))) throw new Error("The speech detector returned invalid state.");
    state = result.state; context.set(input.subarray(input.length - 64)); probabilities.push(result.probability);
    onFrame?.(probabilities.length, total);
  }
  signal?.throwIfAborted();
  return speechRegions(probabilities, samples.length);
}
