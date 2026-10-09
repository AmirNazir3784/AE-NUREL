// Canvas/WebCodecs boundary adapter for lifecycle tests and native packet replay.
// This does not perform browser drawing, H.264 encoding or playback.
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as planning from "../src/lib/subtitle-video.ts";

const source = readFileSync(new URL("../src/features/srt-to-mp4/render-mp4.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
export function rendererHarness(options = {}) {
  const canvases = [], outputs = [], frames = [];
  class Output {
    constructor(config) { this.config = config; this.state = "pending"; outputs.push(this); }
    addVideoTrack(source, metadata) { this.source = source; this.metadata = metadata; }
    async start() { this.state = "started"; }
    async finalize() { this.config.target.buffer = new ArrayBuffer(64); this.state = "finalized"; }
    async cancel() { this.state = "canceled"; }
  }
  class CanvasSource {
    constructor(canvas) { this.canvas = canvas; }
    async add(start, duration) { frames.push({ start, duration, text: this.canvas.lines.join("\n") }); options.onAdd?.(frames.length); }
    close() { this.closed = true; }
  }
  const runtime = options.runtime ?? {
    Output, BufferTarget: class {}, CanvasSource, canEncodeVideo: async () => true,
    Mp4OutputFormat: class { constructor(config) { Object.assign(this, config); } }, Quality: class {},
  };
  const document = {
    fonts: { ready: Promise.resolve() }, body: {},
    createElement: () => {
      const canvas = { width: 0, height: 0, lines: [] };
      canvas.getContext = () => options.noContext ? null : {
        fillRect: () => { canvas.lines = []; },
        measureText: text => ({ width: options.impossibleFit ? 100000 : [...text].length * 8 }),
        fillText: text => canvas.lines.push(text),
      };
      canvases.push(canvas); return canvas;
    },
  };
  const evaluated = { exports: {} };
  new Function("require", "module", "exports", "window", "document", "getComputedStyle", "setTimeout", compiled)(
    id => id === "mediabunny" ? runtime : planning, evaluated, evaluated.exports,
    { isSecureContext: true }, document, () => ({ fontFamily: "test-font" }),
    callback => { options.onYield?.(); queueMicrotask(callback); },
  );
  return { render: evaluated.exports.renderMp4, canvases, outputs, frames };
}
