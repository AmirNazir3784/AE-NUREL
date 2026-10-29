import { COMPRESSION_LIMITS, validateCompressionFile, validateCompressionMedia, type CompressionMedia } from "../video-compressor/compression-core";
import { outputSize, validateKey, rgb, type KeySettings, type Background, type KeyExport } from "./key-core";
import { finishFrame } from "./key-renderer";
import { createGpuKey } from "./key-gpu";

export async function removeScreen(file: File, media: CompressionMedia, key: KeySettings, background: Background, image: ImageBitmap | null, settings: KeyExport, signal: AbortSignal, progress: (value: number | null) => void) {
  const started = performance.now();
  validateCompressionFile(file); validateCompressionMedia(media); validateKey(key); rgb(background.color); rgb(background.second);
  if (!["mp4", "webm"].includes(settings.format) || typeof settings.keepAudio !== "boolean" || typeof background.animated !== "boolean" || !["solid", "gradient", "image"].includes(background.type) || !["cover", "contain"].includes(background.fit)) throw new Error("Choose valid export and background settings.");
  if (background.type === "image" && !image) throw new Error("Choose a background image before exporting.");
  const size = outputSize(media, settings.resolution);
  signal.throwIfAborted(); progress(null);
  const { Input, BlobSource, BufferSource, ALL_FORMATS, Output, BufferTarget, Mp4OutputFormat, WebMOutputFormat, Conversion, Quality, canEncodeVideo } = await import("mediabunny");
  const quality = new Quality({ bitrate: Math.round(Math.max(750_000, Math.min(10_000_000, media.videoBitrate * 1.5, size.width * size.height * 6))) });
  let codec: "avc" | "vp9" | "vp8" = settings.format === "mp4" ? "avc" : "vp9";
  if (!await canEncodeVideo(codec, { ...size, quality })) {
    if (settings.format === "webm" && await canEncodeVideo("vp8", { ...size, quality })) codec = "vp8";
    else throw new Error("This browser cannot encode the selected format. Choose a smaller output or the other format.");
  }
  signal.throwIfAborted();
  const gpu = createGpuKey(size.width, size.height, key, background, image);
  const canvas = new OffscreenCanvas(size.width, size.height), context = canvas.getContext("2d", { willReadFrequently: !gpu });
  if (!context) { gpu?.dispose(); throw new Error("Video rendering is unavailable. Try an updated Chrome or Edge browser."); }
  if (process.env.NODE_ENV === "development") console.debug("Green screen export renderer:", gpu ? "WebGL" : "2D fallback");
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS }), target = new BufferTarget();
  const output = new Output({ target, format: settings.format === "mp4" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat() });
  let conversion: Awaited<ReturnType<typeof Conversion.init>> | undefined;
  const stop = async () => { if (conversion) { if (!["done", "canceled"].includes(conversion.state)) await conversion.cancel(); } else await output.cancel(); };
  const cancel = () => { void stop().catch(() => {}); input.dispose(); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    signal.throwIfAborted();
    target.on("write", ({ end }) => { if (end > COMPRESSION_LIMITS.outputBytes) throw new Error("The output reached the 256 MB limit. Choose a smaller resolution."); });
    conversion = await Conversion.init({
      input, output, tracks: "primary", trim: { start: 0 }, tags: {}, copy: { shiftTolerance: 0 }, showWarnings: false,
      video: { codec, quality, ...size, fit: "contain", forceTranscode: true, allowTransformationMetadata: false, alpha: "discard", process: sample => {
        signal.throwIfAborted(); context.clearRect(0, 0, size.width, size.height); sample.drawWithFit(context, { fit: "fill" });
        if (gpu) return gpu.render(canvas, sample.timestamp);
        finishFrame(context, key, background, image, "composite", sample.timestamp); return canvas;
      } },
      audio: track => { if (!settings.keepAudio) return { discard: true }; const codec = settings.format === "mp4" ? "aac" : "opus"; return track.codec === codec ? { codec } : { codec, quality: new Quality({ bitrate: 128_000 }), forceTranscode: true }; },
    });
    signal.throwIfAborted();
    const audio = settings.keepAudio ? media.audioTracks : 0;
    if (!conversion.isValid || conversion.utilizedTracks.length !== audio + 1 || conversion.discardedTracks.some(item => item.track.isVideoTrack() || settings.keepAudio && item.track.isAudioTrack())) throw new Error("The selected video or audio cannot be exported. Try WebM, or switch off Keep sound for a silent video.");
    conversion.onProgress = value => progress(Math.min(99, Math.floor(value * 100)));
    await conversion.execute(); signal.throwIfAborted(); progress(99);
    if (!target.buffer || target.buffer.byteLength < 32) throw new Error("No usable video was produced. Try another format.");
    const check = new Input({ source: new BufferSource(target.buffer), formats: ALL_FORMATS });
    try { const video = await check.getPrimaryVideoTrack(); if (!video || video.displayWidth !== size.width || video.displayHeight !== size.height || (await check.getAudioTracks()).length !== audio || Math.abs(await check.computeDuration() - media.duration) > 0.25) throw new Error("The export failed its dimensions, duration or audio check. Please try another format."); }
    finally { check.dispose(); }
    return { ...size, blob: new Blob([target.buffer], { type: settings.format === "mp4" ? "video/mp4" : "video/webm" }), seconds: (performance.now() - started) / 1000 };
  } catch (error) { await stop().catch(() => {}); signal.throwIfAborted(); throw error; }
  finally { signal.removeEventListener("abort", cancel); input.dispose(); gpu?.dispose(); }
}

export async function createScreenDemo(signal: AbortSignal, fourK = false) {
  const { CanvasSource, Output, BufferTarget, Mp4OutputFormat } = await import("mediabunny");
  const canvas = document.createElement("canvas"); canvas.width = fourK ? 3840 : 640; canvas.height = fourK ? 2160 : 360;
  const context = canvas.getContext("2d")!;
  if (fourK) context.scale(6, 6);
  const target = new BufferTarget(), output = new Output({ target, format: new Mp4OutputFormat() }), source = new CanvasSource(canvas, { codec: "avc", bitrate: fourK ? 8_000_000 : 1_000_000 });
  output.addVideoTrack(source, { frameRate: 24 });
  try {
    await output.start();
    for (let frame = 0; frame < 72; frame++) {
      signal.throwIfAborted();
      const x = 320 + Math.sin(frame / 15) * 30;
      const shade = context.createLinearGradient(0, 0, 640, 360); shade.addColorStop(0, "#00c853"); shade.addColorStop(1, "#008738"); context.fillStyle = shade; context.fillRect(0, 0, 640, 360);
      context.fillStyle = "#263c72"; context.beginPath(); context.ellipse(x, 350, 95, 130, 0, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#ffd1ae"; context.fillRect(x - 21, 205, 42, 42); context.beginPath(); context.ellipse(x, 159, 59, 76, 0, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#33283f"; context.beginPath(); context.ellipse(x, 112, 62, 38, -.1, Math.PI, Math.PI * 2); context.fill(); context.fillRect(x - 61, 108, 12, 56);
      context.fillStyle = "#33283f"; for (const side of [-1, 1]) { context.beginPath(); context.arc(x + side * 22, 157, 4, 0, Math.PI * 2); context.fill(); }
      context.strokeStyle = "#b76559"; context.lineWidth = 3; context.beginPath(); context.arc(x, 185, 15, .1, Math.PI - .1); context.stroke();
      context.fillStyle = "#ffffff"; context.font = "600 13px sans-serif"; context.textAlign = "center"; context.fillText("AENURAL", x, 294);
      await source.add(frame / 24, 1 / 24);
    }
    source.close(); await output.finalize(); signal.throwIfAborted();
    if (!target.buffer) throw new Error("The sample could not be created.");
    return new File([target.buffer], fourK ? "aenural-green-screen-demo-4k.mp4" : "aenural-green-screen-demo.mp4", { type: "video/mp4" });
  } catch (error) { await output.cancel().catch(() => {}); throw error; }
}
