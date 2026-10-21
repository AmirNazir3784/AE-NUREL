import type { AsrProgress, AsrResult, Backend, WorkerReply } from "./asr-core";
import type { TranscriptionQuality } from "./subtitle-capabilities";

type WorkerPort = Pick<Worker, "postMessage" | "terminate" | "onmessage" | "onerror">;
export type AsrRunOptions = { language?: string; quality?: TranscriptionQuality; multilingual?: boolean; wordTimestamps?: boolean; hasFollowingSection?: boolean; keepAlive?: boolean; timeoutMs?: number; audioKind?: "speech" | "music" };
export class AsrClient {
  private job = 0;
  private active: { worker: WorkerPort; reject: (reason: Error) => void; cleanup: () => void } | null = null;
  private idle: { worker: WorkerPort; key: string } | null = null;
  private readonly createWorker: () => WorkerPort;
  constructor(createWorker: () => WorkerPort = () => new Worker(new URL("./asr.worker.ts", import.meta.url), { type: "module" })) { this.createWorker = createWorker; }
  cancel() {
    ++this.job;
    this.idle?.worker.terminate(); this.idle = null;
    if (this.active) { const { worker, reject, cleanup } = this.active; this.active = null; cleanup(); worker.terminate(); reject(new DOMException("Cancelled", "AbortError")); }
  }
  run(samples: Float32Array, backend: Backend, signal: AbortSignal, progress: (value: AsrProgress) => void, options: AsrRunOptions = {}): Promise<AsrResult> {
    if (this.active) this.cancel();
    signal.throwIfAborted();
    const id = ++this.job;
    // A warm worker owns one loaded model/runtime. Never report a new quality
    // while actually reusing the previous model or English-only tokenizer.
    const key = JSON.stringify([backend, options.quality ?? "fast", !!options.multilingual, !!options.wordTimestamps, options.audioKind ?? "speech"]);
    if (this.idle && this.idle.key !== key) { this.idle.worker.terminate(); this.idle = null; }
    return new Promise((resolve, reject) => {
      const worker = this.idle?.worker ?? this.createWorker(); this.idle = null;
      const abort = () => this.cancel();
      let timeout: ReturnType<typeof setTimeout>;
      const armTimeout = () => { clearTimeout(timeout); timeout = setTimeout(() => { if (this.job !== id) return; cleanup(); worker.terminate(); this.active = null; reject(new Error("This section timed out. Completed sections are kept; retry to continue.")); }, options.timeoutMs ?? 20 * 60 * 1000); };
      const cleanup = () => { clearTimeout(timeout); signal.removeEventListener("abort", abort); };
      armTimeout();
      this.active = { worker, reject, cleanup };
      signal.addEventListener("abort", abort, { once: true });
      const finish = (success = false) => { cleanup(); if (success && options.keepAlive) this.idle = { worker, key }; else worker.terminate(); this.active = null; };
      worker.onmessage = (event: MessageEvent<WorkerReply>) => {
        const reply = event.data;
        if (reply.id !== id || this.job !== id) return;
        if (reply.type === "progress") {
          if (reply.progress.stage === "download" && reply.progress.loaded) armTimeout();
          progress(reply.progress);
        }
        else if (reply.type === "result") {
          if (process.env.NODE_ENV === "development") console.debug("Local speech processing audit " + JSON.stringify({ quality: options.quality ?? "fast", backend: reply.result.backend, loadMs: reply.result.loadMs, inferenceMs: reply.result.inferenceMs, downloadedBytes: reply.result.downloadedBytes, cacheHits: reply.result.cacheHits, requests: reply.result.requests }));
          finish(true); resolve(reply.result);
        }
        else { finish(); reject(new Error(reply.message)); }
      };
      worker.onerror = () => { if (this.job !== id) return; finish(); reject(new Error("The local AI worker stopped. Try CPU mode, a shorter file, or an updated Chrome/Edge browser.")); };
      worker.postMessage({ id, samples, backend, ...options }, [samples.buffer]);
    });
  }
}
