import { ASR_SAMPLE_RATE, mixIntoMono } from "../local-asr/asr-core.ts";

export function pcmWave(samples: Float32Array): Blob {
  if (!samples.length || samples.length > 60 * ASR_SAMPLE_RATE) throw new Error("Use audio up to 60 seconds.");
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer);
  function text(offset: number, value: string) { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); }
  text(0, "RIFF"); view.setUint32(4, buffer.byteLength - 8, true); text(8, "WAVE"); text(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, ASR_SAMPLE_RATE, true); view.setUint32(28, ASR_SAMPLE_RATE * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) { if (!Number.isFinite(samples[i])) throw new Error("The audio contains invalid samples."); const value = Math.max(-1, Math.min(1, samples[i])); view.setInt16(44 + i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true); }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Decode audio buffers, never video frames or the complete compressed file. */
export async function extractStudioSamples(file: File, duration: number, signal: AbortSignal, maxSeconds = 120): Promise<Float32Array> {
  if (!Number.isFinite(duration) || duration <= 0 || duration > Math.min(120, maxSeconds)) throw new Error(`Choose a video up to ${Math.min(120, maxSeconds)} seconds for this processing mode.`);
  signal.throwIfAborted();
  const { Input, BlobSource, ALL_FORMATS, AudioBufferSink } = await import("mediabunny");
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const abort = () => input.dispose(); signal.addEventListener("abort", abort, { once: true });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || !await track.canDecode()) throw new Error("This video has no supported audio track.");
    const samples = new Float32Array(Math.ceil(duration * ASR_SAMPLE_RATE)); let decoded = 0;
    for await (const item of new AudioBufferSink(track).buffers()) {
      signal.throwIfAborted();
      if (!Number.isFinite(item.timestamp) || item.timestamp + item.duration > duration + .15) throw new Error("The audio exceeds the video's timeline.");
      mixIntoMono(samples, Array.from({ length: item.buffer.numberOfChannels }, (_, i) => item.buffer.getChannelData(i)), item.buffer.sampleRate, item.timestamp);
      decoded += item.buffer.length;
    }
    signal.throwIfAborted(); if (!decoded) throw new Error("No readable audio was found.");
    return samples;
  } finally { signal.removeEventListener("abort", abort); input.dispose(); }
}

export async function extractStudioAudio(file: File, duration: number, signal: AbortSignal): Promise<Blob> {
  return pcmWave(await extractStudioSamples(file, duration, signal, 60));
}
