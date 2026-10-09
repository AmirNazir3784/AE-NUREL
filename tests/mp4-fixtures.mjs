import { conversionSrt, numberedSrt } from "../src/lib/subtitle-conversion.ts";
import { fixture } from "./conversion-helpers.mjs";
const captions = conversionSrt(fixture("video.srt")).cues.map(cue => cue.text);
export function videoFixture(count, durationMs) {
  const slot = Math.floor(durationMs / count);
  return numberedSrt(Array.from({ length: count }, (_, index) => ({
    start: count === 1 ? durationMs - 1000 : index * slot,
    end: index === count - 1 ? durationMs : index * slot + Math.floor(slot / 2),
    text: captions[index % captions.length],
  })));
}
// Explicitly bypasses the public duration gate for native muxing probes only.
// These probes cannot establish browser encoding, playback or release readiness.
export function probePlan(text) {
  const cues = conversionSrt(text).cues;
  const durationMs = Math.max(...cues.map(cue => cue.end));
  const boundaries = new Set([0, durationMs, ...cues.flatMap(cue => [cue.start, cue.end])]);
  for (let ms = 1000; ms < durationMs; ms += 1000) boundaries.add(ms);
  return { cues, durationMs, boundaries: [...boundaries].sort((a, b) => a - b), warnings: [] };
}
