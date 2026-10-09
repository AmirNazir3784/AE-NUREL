import type { AsrProgress } from "./asr-core.ts";

// Measure bytes consumed from the network, never cache reads or an estimated percentage.
export function observeAsset(response: Response, file: string, report: (progress: AsrProgress) => void, count: (bytes: number) => void) {
  if (!response.ok || !response.body) return response;
  const reader = response.body.getReader();
  const header = Number(response.headers.get("content-length"));
  // Fetch exposes decompressed bytes; compressed content-length is not a usable denominator.
  const total = !response.headers.get("content-encoding") && header > 0 ? header : undefined;
  let loaded = 0;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await reader.read();
        if (next.done) { controller.close(); return; }
        loaded += next.value.byteLength; count(next.value.byteLength);
        report({ stage: "download", file, loaded, total }); controller.enqueue(next.value);
      } catch (error) { controller.error(error); }
    },
    cancel(reason) { return reader.cancel(reason); }
  });
  return new Response(stream, { status: response.status, statusText: response.statusText, headers: response.headers });
}
