import type { TimedText } from "./asr-core.ts";

export class UnreliableMusicRecognition extends Error {
  constructor() { super("Timing could not be matched. Try a clearer clip or use Set timing."); this.name = "UnreliableMusicRecognition"; }
}

// Reject an observed aligner collapse: many words attached to a tiny interval.
// This is a timing sanity check, not a claim to verify the meaning of lyrics.
// Repeated choruses and long sung notes are deliberately not rejected by text.
export function assertMusicTiming(chunks: readonly TimedText[]) {
  for (const chunk of chunks) {
    const [start, end] = chunk.timestamp;
    const count = chunk.text.trim().split(/\s+/u).filter(Boolean).length;
    if (start !== null && end !== null && count >= 8 && end - start < count * .04) throw new UnreliableMusicRecognition();
  }
}
