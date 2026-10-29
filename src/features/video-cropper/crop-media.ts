import { COMPRESSION_LIMITS, validateCompressionFile, validateCompressionMedia, type CompressionMedia } from "../video-compressor/compression-core";
import { cropOutput, type Aspect, type Crop, type CropSettings } from "./crop-core";

export async function cropVideo(file: File, media: CompressionMedia, crop: Crop, aspect: Aspect, settings: CropSettings, signal: AbortSignal, progress: (percent: number | null) => void) {
  const started = performance.now();
  validateCompressionFile(file); validateCompressionMedia(media);
  const size = cropOutput(media, crop, aspect, settings);
  signal.throwIfAborted(); progress(null);
  const { Input, BlobSource, BufferSource, ALL_FORMATS, Output, BufferTarget, Mp4OutputFormat, WebMOutputFormat, Conversion, Quality, canEncodeVideo } = await import("mediabunny");
  const quality = new Quality({ bitrate: Math.round(Math.max(500_000, Math.min(12_000_000, media.videoBitrate * Math.sqrt(size.width * size.height / (media.width * media.height)) * 1.5))) });
  let codec: "avc" | "vp9" | "vp8" = settings.format === "mp4" ? "avc" : "vp9";
  if (!await canEncodeVideo(codec, { ...size, quality })) {
    if (settings.format === "webm" && await canEncodeVideo("vp8", { ...size, quality })) codec = "vp8";
    else throw new Error("This browser cannot encode that format and resolution. Try the other format or a smaller output.");
  }
  signal.throwIfAborted();
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const target = new BufferTarget();
  const output = new Output({ target, format: settings.format === "mp4" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat() });
  let conversion: Awaited<ReturnType<typeof Conversion.init>> | undefined;
  const stop = async () => { if (conversion) { if (!["done", "canceled"].includes(conversion.state)) await conversion.cancel(); } else await output.cancel(); };
  const cancel = () => { void stop().catch(() => {}); input.dispose(); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    signal.throwIfAborted();
    target.on("write", ({ end }) => { if (end > COMPRESSION_LIMITS.outputBytes) throw new Error("The output reached the 256 MB browser safety limit. Choose a smaller output resolution."); });
    conversion = await Conversion.init({
      input, output, tracks: "primary", trim: { start: 0 }, tags: {}, copy: { shiftTolerance: 0 }, showWarnings: false,
      video: { codec, quality, ...size, crop: { left: crop.x, top: crop.y, width: crop.width, height: crop.height }, fit: "contain", allowTransformationMetadata: false, forceTranscode: true },
      audio: track => {
        if (!settings.keepAudio) return { discard: true };
        const codec = settings.format === "mp4" ? "aac" : "opus";
        return track.codec === codec ? { codec } : { codec, quality: new Quality({ bitrate: 128_000 }), forceTranscode: true };
      },
    });
    signal.throwIfAborted();
    const expectedAudio = settings.keepAudio ? media.audioTracks : 0;
    if (!conversion.isValid || conversion.utilizedTracks.length !== 1 + expectedAudio || conversion.discardedTracks.some(item => item.track.isVideoTrack() || settings.keepAudio && item.track.isAudioTrack())) throw new Error("The selected video or audio cannot be preserved by this browser. Try WebM or intentionally switch off Keep sound.");
    conversion.onProgress = value => progress(Math.min(99, Math.floor(value * 100)));
    await conversion.execute(); signal.throwIfAborted(); progress(99);
    if (!target.buffer || target.buffer.byteLength < 32) throw new Error("No usable video was created. Try another output format.");
    const check = new Input({ source: new BufferSource(target.buffer), formats: ALL_FORMATS });
    try {
      const video = await check.getPrimaryVideoTrack();
      if (!video || video.displayWidth !== size.width || video.displayHeight !== size.height || (await check.getAudioTracks()).length !== expectedAudio || Math.abs(await check.computeDuration() - media.duration) > 0.25) throw new Error("The export failed its dimensions, duration or audio check. No successful result was reported.");
    } finally { check.dispose(); }
    return { ...size, blob: new Blob([target.buffer], { type: settings.format === "mp4" ? "video/mp4" : "video/webm" }), seconds: (performance.now() - started) / 1000 };
  } catch (error) { await stop().catch(() => {}); signal.throwIfAborted(); throw error; }
  finally { signal.removeEventListener("abort", cancel); input.dispose(); }
}
