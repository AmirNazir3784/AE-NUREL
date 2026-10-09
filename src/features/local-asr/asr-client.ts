import type { AsrProgress, AsrResult, Backend, WorkerReply } from "./asr-core";

type WorkerPort = Pick<Worker, "postMessage" | "terminate" | "onmessage" | "onerror">;
export class AsrClient {
  private job = 0;
  private active: { worker: WorkerPort; reject: (reason: Error) => void; cleanup: () => void } | null = null;
  private readonly createWorker: () => WorkerPort;
  constructor(createWorker: () => WorkerPort = () => new Worker(new URL("./asr.worker.ts", import.meta.url), { type: "module" })) { this.createWorker = createWorker; }
  cancel() {
    ++this.job;
    if (this.active) { const { worker, reject, cleanup } = this.active; this.active = null; cleanup(); worker.terminate(); reject(new DOMException("Cancelled", "AbortError")); }
  }
  run(samples: Float32Array, backend: Backend, signal: AbortSignal, progress: (value: AsrProgress) => void): Promise<AsrResult> {
    this.cancel();
    signal.throwIfAborted();
    const id = ++this.job;
    return new Promise((resolve, reject) => {
      const worker = this.createWorker();
      const abort = () => this.cancel();
      const cleanup = () => signal.removeEventListener("abort", abort);
      this.active = { worker, reject, cleanup };
      signal.addEventListener("abort", abort, { once: true });
      const finish = () => { cleanup(); worker.terminate(); this.active = null; };
      worker.onmessage = (event: MessageEvent<WorkerReply>) => {
        const reply = event.data;
        if (reply.id !== id || this.job !== id) return;
        if (reply.type === "progress") progress(reply.progress);
        else if (reply.type === "result") { finish(); resolve(reply.result); }
        else { finish(); reject(new Error(reply.message)); }
      };
      worker.onerror = () => { if (this.job !== id) return; finish(); reject(new Error("The local AI worker stopped. Try CPU mode, a shorter file, or an updated Chrome/Edge browser.")); };
      worker.postMessage({ id, samples, backend }, [samples.buffer]);
    });
  }
}
