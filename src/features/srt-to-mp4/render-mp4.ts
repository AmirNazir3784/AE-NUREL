import { activeCaption, videoDimensions, wrapCaption, type VideoPlan, type VideoSettings } from "@/lib/subtitle-video";

export async function renderMp4(plan: VideoPlan, settings: VideoSettings, signal: AbortSignal, progress: (percent: number) => void): Promise<ArrayBuffer> {
  const { Output, BufferTarget, Mp4OutputFormat, CanvasSource, Quality, canEncodeVideo } = await import("mediabunny");
  const { width, height } = videoDimensions(settings), quality = new Quality({ bitrate: settings.resolution === "720" ? 2000000 : 1200000 });
  signal.throwIfAborted();
  if (!window.isSecureContext || !await canEncodeVideo("avc", { width, height, quality })) throw new Error("This browser cannot encode H.264 MP4 at this size. Try an updated Chrome or Edge browser on HTTPS, or choose 480p. No file was uploaded.");
  await document.fonts.ready;
  signal.throwIfAborted();
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) { canvas.width = 0; canvas.height = 0; throw new Error("This browser could not create the caption canvas."); }
  const font = getComputedStyle(document.body).fontFamily, baseSize = Math.round(height / 16);
  function draw(text: string) {
    ctx!.fillStyle = settings.background === "black" ? "#000000" : "#ffffff";
    ctx!.fillRect(0, 0, width, height);
    if (!text) return;
    let size = baseSize, lines: string[] = [];
    for (; size >= Math.round(height / 30); size--) {
      ctx!.font = size + "px " + font;
      lines = wrapCaption(text, width * .86, words => ctx!.measureText(words).width);
      if (lines.length * size * 1.4 <= height * .8) break;
    }
    if (size < Math.round(height / 30)) throw new Error("Overlapping captions contain too much text to fit. Shorten the captions or reduce overlaps before rendering.");
    ctx!.fillStyle = settings.background === "black" ? "#ffffff" : "#111111";
    ctx!.textAlign = "center"; ctx!.textBaseline = "middle";
    const lineHeight = size * 1.4, top = height / 2 - (lines.length - 1) * lineHeight / 2;
    lines.forEach((line, index) => ctx!.fillText(line, width / 2, top + index * lineHeight));
  }
  let output: InstanceType<typeof Output> | undefined;
  const abort = () => { void output?.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    // Validate fit before allocating an encoder. Yield during large preflights,
    // and release the canvas even if a caption cannot fit or work is cancelled.
    for (let index = 0; index < plan.boundaries.length - 1; index++) {
      signal.throwIfAborted();
      draw(activeCaption(plan, plan.boundaries[index]));
      if (index % 32 === 31) await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    signal.throwIfAborted();
    // The packet count is known, so reserve the front metadata rather than
    // retaining a second collection of all encoded media until finalization.
    // BufferTarget still retains the completed file for preview/download.
    const target = new BufferTarget();
    output = new Output({ format: new Mp4OutputFormat({ fastStart: "reserve" }), target });
    const source = new CanvasSource(canvas, { codec: "avc", quality, latencyMode: "realtime", keyFrameInterval: 1 });
    output.addVideoTrack(source, { maximumPacketCount: plan.boundaries.length - 1 });
    await output.start();
    for (let index = 0; index < plan.boundaries.length - 1; index++) {
      signal.throwIfAborted();
      const ms = plan.boundaries[index], end = plan.boundaries[index + 1];
      draw(activeCaption(plan, ms));
      await source.add(ms / 1000, (end - ms) / 1000, { keyFrame: true });
      progress(Math.round((index + 1) / (plan.boundaries.length - 1) * 95));
      // Yield to input, progress painting and cancellation.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    source.close();
    await output.finalize();
    signal.throwIfAborted();
    if (!target.buffer || target.buffer.byteLength < 32) throw new Error("The encoder did not create a usable MP4. Try again.");
    progress(100);
    return target.buffer;
  } catch (error) {
    await output?.cancel().catch(() => {});
    if (signal.aborted) throw new DOMException("Rendering cancelled", "AbortError");
    if (error instanceof Error && /fit|caption|usable MP4/.test(error.message)) throw error;
    throw new Error("MP4 rendering failed in this browser. Try 480p in an updated Chrome or Edge browser.");
  } finally {
    signal.removeEventListener("abort", abort);
    canvas.width = 0; canvas.height = 0;
  }
}
