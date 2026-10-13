import type { AssetCache } from "./cached-asset.ts";
import type { AsrProgress } from "./asr-core.ts";

export const MODEL_RANGE_BYTES = 8 * 1024 * 1024;
// These keys are only used by Cache Storage. They are NEVER network URLs.
export const modelPartKey = (url: string, start: number) => url + "?aenural-model-part=" + start;

export async function clearModelParts(url: string, size: number, remove: (key: string) => Promise<unknown>) {
  for (let start = 0; start < size; start += MODEL_RANGE_BYTES) await remove(modelPartKey(url, start));
}

// Immutable, size-verified static weights can resume an interrupted download
// without repeating a several-hundred-MB request. Only one 8 MiB range is held
// here at a time; the inference runtime still needs the complete model in RAM.
export function downloadModel(url: string, size: number, cache: AssetCache, fetcher: typeof fetch, progress: (value: AsrProgress) => void, received: (bytes: number) => void) {
  let start = 0;
  return new Response(new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (start >= size) { controller.close(); return; }
      const end = Math.min(size - 1, start + MODEL_RANGE_BYTES - 1), key = modelPartKey(url, start);
      try {
        const cached = await cache.match(key);
        let bytes = cached ? new Uint8Array(await cached.arrayBuffer()) : undefined;
        if (bytes?.length !== end - start + 1) bytes = undefined;
        if (!bytes) {
          for (let attempt = 0; ; attempt++) {
            const network = new AbortController();
            let timer: ReturnType<typeof setTimeout>;
            const armTimeout = () => { clearTimeout(timer); timer = setTimeout(() => network.abort(new Error("The model download stopped receiving data.")), 180000); };
            armTimeout();
            try {
              const response = await fetcher(url, { method: "GET", headers: { Range: `bytes=${start}-${end}` }, signal: network.signal });
              if (response.status !== 206 || response.headers.get("content-range") !== `bytes ${start}-${end}/${size}`) {
                void response.body?.cancel().catch(() => {});
                throw new Error("The model host did not return the requested static file section.");
              }
              bytes = new Uint8Array(end - start + 1);
              let offset = 0;
              const reader = response.body?.getReader();
              if (!reader) throw new Error("A model file section was incomplete.");
              try {
                while (true) {
                  const chunk = await reader.read(); if (chunk.done) break;
                  armTimeout();
                  if (offset + chunk.value.length > bytes.length) throw new Error("A model file section had an invalid size.");
                  bytes.set(chunk.value, offset); offset += chunk.value.length; received(chunk.value.length);
                  progress({ stage: "download", file: url.split("/").at(-1), loaded: start + offset, total: size });
                }
              } catch (error) { void reader.cancel().catch(() => {}); throw error; }
              finally { reader.releaseLock(); }
              if (offset !== bytes.length) throw new Error("A model file section was incomplete.");
              await cache.put(key, new Response(bytes));
              break;
            } catch (error) {
              if (attempt >= 2) throw error;
              progress({ stage: "loading", warning: "Retrying an interrupted model download section. Completed model sections are kept." });
            } finally { clearTimeout(timer!); }
          }
        }
        start = end + 1;
        progress({ stage: "download", file: url.split("/").at(-1), loaded: start, total: size });
        controller.enqueue(bytes!);
      } catch (error) { controller.error(error); }
    },
  }), { headers: { "Content-Length": String(size), "Content-Type": "application/octet-stream" } });
}
