import type { AsrProgress } from "./asr-core.ts";

type Reply = { id: number } & ({ type: "result"; text: string; audit?: { backend: string; loadMs: number; inferenceMs: number; requests: { method: string; url: string }[] } } | { type: "error"; message: string } | { type: "progress"; progress: AsrProgress });
export class TranslationClient {
  private worker: Worker | null = null;
  private active: (() => void) | null = null;
  private id = 0;
  cancel() { this.active?.(); this.worker?.terminate(); this.worker = null; this.active = null; ++this.id; }
  translate(text: string, source: string, target: string, signal: AbortSignal, progress: (value: AsrProgress) => void): Promise<string> {
    signal.throwIfAborted();
    if (this.active) throw new Error("A translation sentence is already being processed.");
    this.worker ??= new Worker(new URL("./translation.worker.ts", import.meta.url), { type: "module" });
    const worker = this.worker, id = ++this.id;
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;
      const cleanup = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); this.active = null; };
      const failed = (error: Error) => { cleanup(); worker.terminate(); this.worker = null; reject(error); };
      const abort = () => failed(new DOMException("Cancelled", "AbortError"));
      const armTimeout = () => { clearTimeout(timer); timer = setTimeout(() => failed(new Error("This translation sentence timed out. Completed sentences are kept; retry to continue.")), 20 * 60 * 1000); };
      armTimeout();
      this.active = abort; signal.addEventListener("abort", abort, { once: true });
      worker.onerror = () => failed(new Error("The local translation worker stopped. Your device may not have enough memory. Source captions and completed translations are kept."));
      worker.onmessage = (event: MessageEvent<Reply>) => {
        if (event.data.id !== id || this.id !== id) return;
        const reply = event.data;
        if (reply.type === "progress") {
          // Large public model downloads can legitimately exceed 20 minutes on
          // slow links. Count actual incoming bytes as activity, not fake ticks.
          if (reply.progress.stage === "download" && reply.progress.loaded) armTimeout();
          progress(reply.progress);
        }
        else if (reply.type === "error") failed(new Error(reply.message));
        else {
          if (process.env.NODE_ENV === "development" && reply.audit) console.debug("Local localization audit " + JSON.stringify(reply.audit));
          cleanup(); resolve(reply.text);
        }
      };
      worker.postMessage({ id, text, source, target });
    });
  }
}
