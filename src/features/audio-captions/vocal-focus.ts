import { LYRIC_SAMPLE_RATE } from "./lyric-model";
// Frequency emphasis and compression, not learned source separation.
export async function focusVocals(samples: Float32Array, signal: AbortSignal) {
  signal.throwIfAborted();
  if (typeof OfflineAudioContext === "undefined") throw new Error("Audio preparation is unavailable. Try updated Chrome or Edge, or time written lyrics manually.");
  const context = new OfflineAudioContext(1, samples.length, LYRIC_SAMPLE_RATE), source = context.createBufferSource();
  const buffer = context.createBuffer(1, samples.length, LYRIC_SAMPLE_RATE); buffer.copyToChannel(Float32Array.from(samples), 0); source.buffer = buffer;
  const high = context.createBiquadFilter(), low = context.createBiquadFilter(), compressor = context.createDynamicsCompressor(), gain = context.createGain();
  high.type = "highpass"; high.frequency.value = 180; low.type = "lowpass"; low.frequency.value = 4000;
  compressor.threshold.value = -28; compressor.knee.value = 15; compressor.ratio.value = 4; gain.gain.value = 3;
  source.connect(high).connect(low).connect(compressor).connect(gain).connect(context.destination); source.start();
  const rendered = await context.startRendering(); signal.throwIfAborted();
  return Float32Array.from(rendered.getChannelData(0));
}
