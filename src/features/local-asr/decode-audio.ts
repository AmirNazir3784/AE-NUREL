import { ASR_SAMPLE_RATE, mixIntoMono, validateAsrFile, validateDuration } from "./asr-core";

export type PreparedAudio = { samples: Float32Array; duration: number; codec: string; sampleRate: number; channels: number };
export async function decodeAudio(file: File, signal: AbortSignal): Promise<PreparedAudio> {
  validateAsrFile(file);
  signal.throwIfAborted();
  const { Input, BlobSource, MP3, WAVE, AudioBufferSink } = await import("mediabunny");
  signal.throwIfAborted();
  const input = new Input({ source: new BlobSource(file), formats: /\.wav$/i.test(file.name) ? [WAVE] : [MP3] });
  const abort = () => input.dispose();
  signal.addEventListener("abort", abort, { once: true });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track) throw new Error("No audio track was found. Choose a recording with speech.");
    const duration = await input.computeDuration();
    validateDuration(duration);
    const codec = await track.getCodec(), sampleRate = await track.getSampleRate(), channels = await track.getNumberOfChannels();
    if (!codec || !await track.canDecode()) throw new Error("This browser cannot decode this recording. Try PCM WAV or MP3 in an updated Chrome or Edge browser.");
    if (channels > 2 || sampleRate > 48000 || sampleRate < 8000) throw new Error("Use mono or stereo audio at 8–48 kHz.");
    // At most 3.84 MB of mono model input. The decoder holds only a few native buffers.
    const samples = new Float32Array(Math.ceil(duration * ASR_SAMPLE_RATE));
    let decoded = 0;
    for await (const item of new AudioBufferSink(track).buffers()) {
      signal.throwIfAborted();
      if (item.timestamp + item.duration > duration + 0.15) throw new Error("The recording's audio exceeds its declared duration.");
      mixIntoMono(samples, Array.from({ length: item.buffer.numberOfChannels }, (_, i) => item.buffer.getChannelData(i)), item.buffer.sampleRate, item.timestamp);
      decoded += item.buffer.length;
    }
    signal.throwIfAborted();
    if (!decoded) throw new Error("No readable audio samples were found.");
    return { samples, duration, codec, sampleRate, channels };
  } catch (error) {
    signal.throwIfAborted();
    throw new Error(error instanceof Error ? error.message : "This recording could not be decoded.");
  } finally { signal.removeEventListener("abort", abort); input.dispose(); }
}
