import {
  COMPRESSION_LIMITS, compressionPlan, smallerTargetBitrate,
  validateCompressionFile, validateCompressionMedia,
  type CompressionMedia, type CompressionSettings,
} from "./compression-core";

export type CompressionProgress = { pass: number; percent: number | null; phase: "preparing" | "compressing" | "finishing" };

export async function inspectCompressionVideo(file: File, signal: AbortSignal): Promise<CompressionMedia> {
  validateCompressionFile(file);
  signal.throwIfAborted();
  if (!window.isSecureContext || !("VideoDecoder" in window) || !("VideoEncoder" in window)) throw new Error("This browser needs WebCodecs video support. Try an updated Chrome or Edge browser on HTTPS or localhost.");
  const { Input, BlobSource, ALL_FORMATS } = await import("mediabunny");
  signal.throwIfAborted();
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const cancel = () => input.dispose();
  signal.addEventListener("abort", cancel, { once: true });
  try {
    const videos = await input.getVideoTracks(), audio = await input.getAudioTracks();
    if (videos.length !== 1 || audio.length > 1) throw new Error("Choose a video with one video track and at most one audio track. No tracks will be silently removed.");
    const video = videos[0];
    if (!await video.canDecode()) throw new Error("Your browser cannot decode this video's codec. Choose an H.264 MP4 or another browser-supported video.");
    const duration = await input.computeDuration();
    const stats = await video.computePacketStats(120);
    const audioStats = audio[0] ? await audio[0].computePacketStats(300) : null;
    signal.throwIfAborted();
    const media: CompressionMedia = {
      width: video.displayWidth, height: video.displayHeight, duration,
      videoBitrate: stats.averageBitrate || file.size * 8 / duration,
      audioBitrate: audioStats?.averageBitrate || 0,
      frameRate: stats.averagePacketRate || 30,
      audioTracks: audio.length, videoCodec: video.codec ?? "unknown", audioCodec: audio[0]?.codec ?? null,
    };
    validateCompressionMedia(media);
    return media;
  } finally { signal.removeEventListener("abort", cancel); input.dispose(); }
}

export async function compressVideo(
  file: File, media: CompressionMedia, settings: CompressionSettings,
  signal: AbortSignal, onProgress: (progress: CompressionProgress) => void,
) {
  const started = performance.now();
  validateCompressionFile(file);
  const plan = compressionPlan(media, settings);
  signal.throwIfAborted();
  const {
    Input, BlobSource, BufferSource, ALL_FORMATS, Output, BufferTarget,
    Mp4OutputFormat, WebMOutputFormat, Conversion, Quality, canEncodeVideo,
  } = await import("mediabunny");
  let videoBitrate = plan.videoBitrate;
  for (let pass = 1; pass <= 2; pass++) {
    signal.throwIfAborted();
    onProgress({ pass, percent: null, phase: "preparing" });
    const quality = new Quality({ bitrate: videoBitrate });
    let codec: "avc" | "vp9" | "vp8" = settings.format === "mp4" ? "avc" : "vp9";
    const configuration = { width: plan.width, height: plan.height, quality };
    if (!await canEncodeVideo(codec, configuration)) {
      if (settings.format === "webm" && await canEncodeVideo("vp8", configuration)) codec = "vp8";
      else throw new Error("This browser cannot encode the selected video format and resolution. Try a smaller resolution or the other output format.");
    }
    signal.throwIfAborted();
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    const target = new BufferTarget();
    const output = new Output({ target, format: settings.format === "mp4" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat() });
    let conversion: Awaited<ReturnType<typeof Conversion.init>> | undefined;
    const stop = async () => {
      if (conversion) { if (!["canceled", "done"].includes(conversion.state)) await conversion.cancel(); }
      else await output.cancel();
    };
    const cancel = () => { void stop().catch(() => {}); input.dispose(); };
    signal.addEventListener("abort", cancel, { once: true });
    try {
      target.on("write", ({ end }) => {
        if (end > COMPRESSION_LIMITS.outputBytes) throw new Error("The output reached the 256 MB browser safety limit. Choose a smaller resolution or size target.");
      });
      conversion = await Conversion.init({
        input, output, tracks: "primary", trim: { start: 0 }, tags: {},
        copy: { shiftTolerance: 0 }, showWarnings: false,
        video: { codec, quality, width: plan.width, height: plan.height, fit: "contain", allowTransformationMetadata: false, forceTranscode: true },
        audio: track => {
          if (!settings.keepAudio) return { discard: true };
          const codec = settings.format === "mp4" ? "aac" : "opus";
          return track.codec === codec ? { codec } : { codec, quality: new Quality({ bitrate: 128_000 }), forceTranscode: true };
        },
      });
      signal.throwIfAborted();
      const expectedAudio = settings.keepAudio ? media.audioTracks : 0;
      if (!conversion.isValid || conversion.utilizedTracks.length !== 1 + expectedAudio || conversion.discardedTracks.some(track => track.track.isVideoTrack() || settings.keepAudio && track.track.isAudioTrack())) throw new Error("This browser cannot preserve the selected video/audio in that format. Try WebM, a different input codec, or remove audio.");
      conversion.onProgress = value => onProgress({ pass, percent: Math.min(99, Math.floor(value * 100)), phase: value >= 1 ? "finishing" : "compressing" });
      await conversion.execute();
      signal.throwIfAborted();
      if (!target.buffer || target.buffer.byteLength < 32) throw new Error("No usable output video was created. Try another format or a smaller resolution.");

      const bytes = target.buffer.byteLength;
      if (plan.targetBytes && bytes > plan.targetBytes) {
        if (pass === 2) throw new Error("The result could not fit your size target. Increase the target, choose a smaller resolution, or remove audio. No oversized result was marked successful.");
        videoBitrate = smallerTargetBitrate(videoBitrate, bytes, plan.targetBytes, plan.audioBitrate * media.duration / 8);
        continue;
      }
      onProgress({ pass, percent: 99, phase: "finishing" });
      const check = new Input({ source: new BufferSource(target.buffer), formats: ALL_FORMATS });
      try {
        const video = await check.getPrimaryVideoTrack(), audio = await check.getAudioTracks();
        if (!video || video.displayWidth !== plan.width || video.displayHeight !== plan.height || audio.length !== expectedAudio || Math.abs(await check.computeDuration() - media.duration) > 0.25) throw new Error("The output failed its dimension, audio or duration check. Try a different format; no successful export was reported.");
      } finally { check.dispose(); }
      return { blob: new Blob([target.buffer], { type: settings.format === "mp4" ? "video/mp4" : "video/webm" }), width: plan.width, height: plan.height, pass, seconds: (performance.now() - started) / 1000 };
    } catch (error) {
      await stop().catch(() => {});
      signal.throwIfAborted();
      throw error;
    } finally { signal.removeEventListener("abort", cancel); input.dispose(); }
  }
  throw new Error("The output could not be completed with these settings.");
}
