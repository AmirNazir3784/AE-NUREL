import { STUDIO_LIMITS, validateStudioFile, validateStudioMedia, validateStudioStyle, studioIssues, studioFont, paintStudioCaptions, type StudioMedia, type StudioStyle } from "./studio-core";
import type { EditorDocument } from "@/lib/subtitle-editor";
import type { StudioAlignment } from "./studio-alignment";
import { paintStudioWatermark } from "./studio-watermark";

export async function inspectStudioVideo(file: File, signal: AbortSignal): Promise<StudioMedia> {
  validateStudioFile(file); signal.throwIfAborted();
  const { Input, BlobSource, ALL_FORMATS } = await import("mediabunny");
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const cancel = () => input.dispose(); signal.addEventListener("abort", cancel, { once: true });
  try {
    const videos = await input.getVideoTracks(), audio = await input.getAudioTracks();
    if (videos.length !== 1) throw new Error("Choose a file containing one video track.");
    const video = videos[0];
    const media = { width: video.displayWidth, height: video.displayHeight, duration: await input.computeDuration(), audioTracks: audio.length, videoCodec: video.codec ?? "unknown", audioCodec: audio[0]?.codec ?? null };
    validateStudioMedia(media);
    if (!await video.canDecode() || audio.some(track => !track.codec)) throw new Error("This video's codec is not supported by your browser.");
    for (const track of audio) if (!await track.canDecode()) throw new Error("Your browser cannot decode this video's audio. Choose a different encoding.");
    signal.throwIfAborted(); return media;
  } finally { signal.removeEventListener("abort", cancel); input.dispose(); }
}

export async function exportStudioVideo(file: File, media: StudioMedia, captions: EditorDocument, style: StudioStyle, format: "mp4" | "webm", signal: AbortSignal, onProgress: (value: number) => void, alignment: StudioAlignment = [], watermark = false): Promise<Blob> {
  const issues = studioIssues(captions, media.duration); if (issues.length) throw new Error(issues[0]);
  validateStudioFile(file); validateStudioMedia(media); validateStudioStyle(style); signal.throwIfAborted();
  const { Input, BlobSource, BufferSource, ALL_FORMATS, Output, BufferTarget, Mp4OutputFormat, WebMOutputFormat, Conversion, Quality, canEncodeVideo } = await import("mediabunny");
  const width = media.width, height = media.height, codec = format === "mp4" ? "avc" : "vp9", quality = new Quality({ bitrate: 5_000_000 });
  if (!await canEncodeVideo(codec, { width, height, quality })) throw new Error(`Your browser cannot encode ${format.toUpperCase()} at this size. Try the other video format, or download SRT/VTT.`);
  await document.fonts.load(`${style.italic ? "italic " : ""}${style.weight} 48px "${style.font}"`);
  await document.fonts.ready; signal.throwIfAborted();
  const font = studioFont(style), reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) { canvas.width = 0; canvas.height = 0; throw new Error("A video drawing surface could not be created."); }
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS }), target = new BufferTarget();
  const output = new Output({ target, format: format === "mp4" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat() });
  let conversion: Awaited<ReturnType<typeof Conversion.init>> | undefined;
  async function stop() {
    if (conversion) { if (!["canceled", "done"].includes(conversion.state)) await conversion.cancel(); }
    else await output.cancel();
  }
  const cancel = () => { void stop().catch(() => {}); input.dispose(); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    // Fail before allocating encoders when any speech interval cannot fit safely.
    for (let index = 0; index < captions.cues.length; index++) { const cue = captions.cues[index]; signal.throwIfAborted(); paintStudioCaptions(ctx, width, height, captions, cue.start! + Math.min(1, (cue.end! - cue.start!) / 2), style, font, reducedMotion, alignment); if (index % 16 === 15) await new Promise<void>(resolve => setTimeout(resolve, 0)); }
    target.on("write", ({ end }) => { if (end > STUDIO_LIMITS.outputBytes) throw new Error("Output exceeded the 256 MiB safety limit. Choose a shorter video."); });
    conversion = await Conversion.init({ input, output, tracks: "primary", trim: { start: 0 }, copy: { shiftTolerance: 0 }, showWarnings: false,
      video: { codec, quality, allowTransformationMetadata: false, forceTranscode: true, process: sample => {
        signal.throwIfAborted(); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, width, height); sample.draw(ctx, 0, 0, width, height);
        paintStudioCaptions(ctx, width, height, captions, sample.timestamp * 1000, style, font, reducedMotion, alignment); paintStudioWatermark(ctx,width,height,watermark); return canvas;
      } },
      // Preserve the original packets when compatible; otherwise transcode audio,
      // never silently discard it. Conversion performs runtime encoder checks.
      audio: track => ({ codec: output.format.getSupportedAudioCodecs().includes(track.codec!) ? track.codec! : format === "mp4" ? "aac" : "opus" }),
    });
    signal.throwIfAborted();
    if (!conversion.isValid || conversion.discardedTracks.length || conversion.utilizedTracks.length !== 1 + media.audioTracks) throw new Error("This browser cannot preserve all video/audio tracks in that format. Try the other format.");
    conversion.onProgress = value => onProgress(Math.min(99, Math.floor(value * 100)));
    await conversion.execute(); signal.throwIfAborted();
    if (!target.buffer?.byteLength) throw new Error("The encoder returned an empty video.");
    const check = new Input({ source: new BufferSource(target.buffer), formats: ALL_FORMATS });
    try {
      const video = await check.getPrimaryVideoTrack(), audio = await check.getAudioTracks();
      if (!video || video.displayWidth !== width || video.displayHeight !== height || audio.length !== media.audioTracks || Math.abs(await check.computeDuration() - media.duration) > .15) throw new Error("The exported video failed its dimension, audio or duration check. No successful export was reported.");
    } finally { check.dispose(); }
    onProgress(100); return new Blob([target.buffer], { type: format === "mp4" ? "video/mp4" : "video/webm" });
  } catch (error) { await stop().catch(() => {}); signal.throwIfAborted(); throw error; }
  finally { signal.removeEventListener("abort", cancel); input.dispose(); canvas.width = 0; canvas.height = 0; }
}
