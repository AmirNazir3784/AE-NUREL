import type * as Runtime from "onnxruntime-web/webgpu";

// Keep the small source graph for a single CPU retry after GPU initialization
// or device loss. Callers always receive real output from the same model.
export async function resilientSession(ort: Pick<typeof Runtime, "InferenceSession">, bytes: ArrayBuffer, signal: AbortSignal, accelerate: boolean) {
  let session: Runtime.InferenceSession | undefined, gpu = accelerate, closed = false;
  const create = () => ort.InferenceSession.create(bytes, { executionProviders: gpu ? ["webgpu", "wasm"] : ["wasm"], graphOptimizationLevel: "all" });
  try { session = await create(); }
  catch (failure) { signal.throwIfAborted(); if (!gpu) throw failure; gpu = false; session = await create(); }
  if (signal.aborted) { await session.release(); signal.throwIfAborted(); }
  return {
    get outputNames() { return session!.outputNames; },
    get accelerated() { return gpu; },
    async run(feeds: Parameters<Runtime.InferenceSession["run"]>[0]) {
      signal.throwIfAborted();
      if (closed) throw new Error("Correction was stopped. Choose the video again.");
      try { return await session!.run(feeds); }
      catch (failure) {
        signal.throwIfAborted();
        if (!gpu) throw failure;
        await session!.release().catch(() => {}); gpu = false;
        session = await create(); signal.throwIfAborted();
        return session.run(feeds);
      }
    },
    async release() { if (!closed) { closed = true; await session?.release(); session = undefined; } },
  };
}
export type ResilientSession = Awaited<ReturnType<typeof resilientSession>>;
