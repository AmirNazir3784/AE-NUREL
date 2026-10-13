/// <reference lib="webworker" />
import { ASR_ORT_VERSION, type AsrProgress } from "./asr-core";
import { TRANSLATION_MODEL, TRANSLATION_REVISION, TRANSLATION_CACHE, TRANSLATION_FILE_BYTES, validateTranslationPair, permittedTranslationAsset } from "./translation-core";
import { downloadModel, clearModelParts } from "./model-download";
import { observeAsset } from "./asset-progress";
import { cachedAsset, type AssetCache } from "./cached-asset";
import type { TranslationPipeline } from "@huggingface/transformers";
import { generateLocalTranslation } from "./translation-generation";

const scope = self as unknown as DedicatedWorkerGlobalScope;
let translator: TranslationPipeline | undefined, factoryUrl = "", busy = false;
const runtimeBase = "https://cdn.jsdelivr.net/npm/onnxruntime-web@" + ASR_ORT_VERSION + "/dist/";
const nativeFetch = scope.fetch.bind(scope);
scope.onmessage = async (event: MessageEvent<{ id: number; source: string; target: string; text: string }>) => {
  if (busy) return; busy = true;
  const { id, source, target, text } = event.data;
  const started = performance.now(), requests: { method: string; url: string }[] = [];
  let rangeCache: AssetCache | undefined;
  const progress = (progress: AsrProgress) => scope.postMessage({ id, type: "progress", progress });
  try {
    validateTranslationPair(source, target);
    if (typeof text !== "string" || !text.trim() || text.length > 1200) throw new Error("This sentence is too long for safe local translation.");
    if (!translator) {
      progress({ stage: "loading" });
      scope.fetch = async (resource, options) => {
        const url = new URL(typeof resource === "string" ? resource : resource instanceof URL ? resource.href : resource.url, scope.location.href);
        const method = options?.method ?? (resource instanceof Request ? resource.method : "GET");
        if (!permittedTranslationAsset(url, method, !!(options?.body || (resource instanceof Request && resource.body)))) throw new Error("Local translation blocked an unexpected network request.");
        requests.push({ method, url: url.origin + url.pathname });
        if (method.toUpperCase() === "GET" && rangeCache && TRANSLATION_FILE_BYTES[url.href]) return downloadModel(url.href, TRANSLATION_FILE_BYTES[url.href], rangeCache, nativeFetch, progress, () => {});
        return observeAsset(await nativeFetch(resource, options), url.pathname.split("/").at(-1) ?? "asset", progress, () => {});
      };
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false; env.useFSCache = false; env.useBrowserCache = false;
      env.remoteHost = "https://huggingface.co/"; env.remotePathTemplate = "{model}/resolve/" + TRANSLATION_REVISION + "/"; env.fetch = scope.fetch;
      const cache: AssetCache = {
        async match(key) { try { return await (await caches.open(TRANSLATION_CACHE)).match(key); } catch { return undefined; } },
        async put(key, value) { try {
          const cache = await caches.open(TRANSLATION_CACHE); await cache.put(key, value);
          if (TRANSLATION_FILE_BYTES[key]) await clearModelParts(key, TRANSLATION_FILE_BYTES[key], part => cache.delete(part));
        } catch { progress({ stage: "loading", warning: "Translation model caching is unavailable; future runs may download it again." }); } },
      };
      rangeCache = cache;
      env.useCustomCache = true; env.customCache = cache; env.cacheKey = TRANSLATION_CACHE;
      const wasm = env.backends.onnx.wasm!; wasm.numThreads = 1; wasm.proxy = false;
      const [binary, factory] = await Promise.all([cachedAsset(runtimeBase + "ort-wasm-simd-threaded.asyncify.wasm", cache, scope.fetch), cachedAsset(runtimeBase + "ort-wasm-simd-threaded.asyncify.mjs", cache, scope.fetch)]);
      wasm.wasmBinary = binary.buffer;
      factoryUrl = URL.createObjectURL(new Blob([factory], { type: "text/javascript" }));
      wasm.wasmPaths = { mjs: factoryUrl, wasm: runtimeBase + "ort-wasm-simd-threaded.asyncify.wasm" };
      const create = pipeline as (task: "translation", model: string, options: Parameters<typeof pipeline>[2]) => Promise<TranslationPipeline>;
      translator = await create("translation", TRANSLATION_MODEL, { revision: TRANSLATION_REVISION, device: "wasm", dtype: "q8" });
    }
    progress({ stage: "translating" });
    const inferenceStarted = performance.now();
    // Only the active sentence enters M2M100. It has no separate context channel;
    // prepending other sentences would undermine source/target correspondence.
    const translated = await generateLocalTranslation(translator, text, source, target);
    scope.postMessage({ id, type: "result", text: translated, ...(process.env.NODE_ENV === "development" ? { audit: { backend: "wasm", loadMs: inferenceStarted - started, inferenceMs: performance.now() - inferenceStarted, requests } } : {}) });
  } catch (error) { scope.postMessage({ id, type: "error", message: error instanceof Error ? error.message : "Local translation failed. Completed cues are kept for retry." }); }
  finally { busy = false; }
};
