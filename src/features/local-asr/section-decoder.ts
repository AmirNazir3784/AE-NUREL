import { ASR_SAMPLE_RATE, mixIntoMono } from "./asr-core.ts";
import { SECTION_MAX_SECONDS, validateSubtitleFile, validateSubtitleDuration } from "./subtitle-capabilities.ts";

// One demuxer per job; seek/decode only the current section. Never allocate a
// five-hour AudioBuffer or copy the original file into an upload request.
export async function openSectionDecoder(file: File, signal: AbortSignal) {
  validateSubtitleFile(file); signal.throwIfAborted();
  const { Input, BlobSource, MP3, WAVE, MP4, ADTS, FLAC, OGG, AudioBufferSink } = await import("mediabunny");
  const formats = /\.mp3$/i.test(file.name) ? [MP3] : /\.wav$/i.test(file.name) ? [WAVE] : /\.m4a$/i.test(file.name) ? [MP4] : /\.aac$/i.test(file.name) ? [ADTS] : /\.flac$/i.test(file.name) ? [FLAC] : [OGG];
  const input = new Input({ source: new BlobSource(file), formats });
  const dispose = () => { signal.removeEventListener("abort", dispose); input.dispose(); };
  signal.addEventListener("abort", dispose, { once: true });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track) throw new Error("No readable audio track was found. The file may be corrupt.");
    const duration = await input.computeDuration(); validateSubtitleDuration(duration);
    const sampleRate = await track.getSampleRate(), channels = await track.getNumberOfChannels();
    if (!await track.canDecode()) throw new Error("This browser cannot decode this audio codec. Try PCM WAV or MP3 in updated Chrome or Edge.");
    if (channels > 2 || sampleRate > 48000 || sampleRate < 8000) throw new Error("Use mono or stereo audio at 8–48 kHz.");
    const sink = new AudioBufferSink(track);
    return { duration, dispose, async read(start: number, end: number) {
      signal.throwIfAborted();
      if (start < 0 || end <= start || end > duration || end - start > SECTION_MAX_SECONDS + .001) throw new Error("Invalid audio section.");
      const samples = new Float32Array(Math.ceil((end - start) * ASR_SAMPLE_RATE));
      let decoded = 0;
      for await (const item of sink.buffers(start, end)) {
        signal.throwIfAborted();
        if (!Number.isFinite(item.timestamp) || item.timestamp + item.duration > duration + .15) throw new Error("The audio exceeds its declared timeline. The recording may be corrupt.");
        mixIntoMono(samples, Array.from({ length: item.buffer.numberOfChannels }, (_, i) => item.buffer.getChannelData(i)), item.buffer.sampleRate, item.timestamp - start);
        decoded += item.buffer.length;
      }
      signal.throwIfAborted();
      if (!decoded) throw new Error("This section has no readable audio samples. The recording may be corrupt.");
      return samples;
    } };
  } catch (error) { dispose(); throw error; }
}
