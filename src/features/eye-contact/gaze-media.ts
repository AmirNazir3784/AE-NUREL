import { COMPRESSION_LIMITS, validateCompressionFile, validateCompressionMedia, type CompressionMedia } from "../video-compressor/compression-core";
import { outputSize, type KeyExport } from "../green-screen-remover/key-core";
import { validateGaze, type GazeSettings } from "./gaze-core";

export async function exportGazeVideo(file: File, media: CompressionMedia, gaze: GazeSettings, settings: KeyExport, signal: AbortSignal, progress: (value: number | null) => void) {
  validateCompressionFile(file); validateCompressionMedia(media); validateGaze(gaze);
  if (!gaze.strength) throw new Error("Increase correction strength before exporting.");
  if (!["mp4", "webm"].includes(settings.format) || typeof settings.keepAudio !== "boolean") throw new Error("Choose valid export settings.");
  const size = outputSize(media, settings.resolution);
  signal.throwIfAborted(); progress(null);
  const [{ Input, BlobSource, BufferSource, ALL_FORMATS, Output, BufferTarget, Mp4OutputFormat, WebMOutputFormat, Conversion, Quality, canEncodeVideo }, { createGazeEngine }] = await Promise.all([import("mediabunny"), import("./gaze-engine")]);
  const quality = new Quality({ bitrate: Math.round(Math.max(750_000, Math.min(15_000_000, media.videoBitrate * 1.5, size.width * size.height * 6))) });
  let codec: "avc" | "vp9" | "vp8" = settings.format === "mp4" ? "avc" : "vp9";
  if (!await canEncodeVideo(codec, { ...size, quality })) {
    if (settings.format === "webm" && await canEncodeVideo("vp8", { ...size, quality })) codec = "vp8";
    else throw new Error("The selected output cannot be encoded. Choose a smaller size or the other format.");
  }
  signal.throwIfAborted();
  const engine = await createGazeEngine(signal), canvas = document.createElement("canvas");
  canvas.width = size.width; canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) { await engine.dispose(); throw new Error("Video rendering is unavailable."); }
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS }), target = new BufferTarget();
  const output = new Output({ target, format: settings.format === "mp4" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat() });
  let conversion: Awaited<ReturnType<typeof Conversion.init>> | undefined, correctedFrames = 0, totalFrames = 0;
  const stop = async () => { if (conversion) { if (!["done", "canceled"].includes(conversion.state)) await conversion.cancel(); } else await output.cancel(); };
  const cancel = () => { void stop().catch(() => {}); input.dispose(); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    signal.throwIfAborted();
    target.on("write", ({ end }) => { if (end > COMPRESSION_LIMITS.outputBytes) throw new Error("The output reached the 256 MB limit. Choose a smaller resolution."); });
    conversion = await Conversion.init({
      input, output, tracks: "primary", trim: { start: 0 }, tags: {}, copy: { shiftTolerance: 0 }, showWarnings: false,
      video: { codec, quality, ...size, fit: "contain", forceTranscode: true, allowTransformationMetadata: false, alpha: "discard", process: async sample => {
        signal.throwIfAborted(); context.clearRect(0, 0, size.width, size.height); sample.drawWithFit(context, { fit: "fill" });
        const frame = await engine.render(context, gaze, sample.timestamp); totalFrames++; if (frame.eyes) correctedFrames++;
        // Give progress rendering and the Cancel action a task boundary even
        // when consecutive WASM inference promises resolve synchronously.
        await new Promise(resolve => setTimeout(resolve, 0));
        signal.throwIfAborted(); return canvas;
      } },
      audio: track => { if (!settings.keepAudio) return { discard: true }; const codec = settings.format === "mp4" ? "aac" : "opus"; return track.codec === codec ? { codec } : { codec, quality: new Quality({ bitrate: 128_000 }), forceTranscode: true }; },
    });
    const audioTracks = settings.keepAudio ? media.audioTracks : 0;
    if (!conversion.isValid || conversion.utilizedTracks.length !== audioTracks + 1 || conversion.discardedTracks.some(item => item.track.isVideoTrack() || settings.keepAudio && item.track.isAudioTrack())) throw new Error("The selected tracks cannot be retained. Try the other format or switch off Keep sound for a silent export.");
    conversion.onProgress = value => progress(Math.min(99, Math.floor(value * 100)));
    await conversion.execute(); signal.throwIfAborted();
    if (!correctedFrames) throw new Error("No frames received a usable correction. Check the preview and try a clear, front-facing clip or adjust the fine-tuning.");
    if (!target.buffer || target.buffer.byteLength < 32) throw new Error("No usable output was produced.");
    const check = new Input({ source: new BufferSource(target.buffer), formats: ALL_FORMATS });
    try {
      const video = await check.getPrimaryVideoTrack();
      if (!video || video.displayWidth !== size.width || video.displayHeight !== size.height || (await check.getAudioTracks()).length !== audioTracks || Math.abs(await check.computeDuration() - media.duration) > .25) throw new Error("The export failed its dimensions, duration or audio check. Try the other output format.");
    } finally { check.dispose(); }
    return { blob: new Blob([target.buffer], { type: settings.format === "mp4" ? "video/mp4" : "video/webm" }), ...size, correctedFrames, totalFrames };
  } catch (error) { await stop().catch(() => {}); signal.throwIfAborted(); throw error; }
  finally { signal.removeEventListener("abort", cancel); input.dispose(); await engine.dispose(); }
}
