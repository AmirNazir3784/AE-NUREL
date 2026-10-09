export type AssetCache = { match(key: string): Promise<Response | undefined>; put(key: string, response: Response): Promise<void> };
export async function cachedAsset(url: string, cache: AssetCache, fetcher: typeof fetch, sha256?: string): Promise<Uint8Array<ArrayBuffer>> {
  const cached = await cache.match(url);
  const response = cached ?? await fetcher(url);
  if (!response.ok) throw new Error("A local model asset could not load (HTTP " + response.status + "). Check your connection and retry.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (sha256) {
    const actual = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(value => value.toString(16).padStart(2, "0")).join("");
    if (actual !== sha256) throw new Error("The speech detector failed its integrity check. Clear the AENural model cache and retry.");
  }
  if (!cached) await cache.put(url, new Response(bytes, { headers: response.headers }));
  return bytes;
}
