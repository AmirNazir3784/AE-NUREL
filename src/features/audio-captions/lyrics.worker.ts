/// <reference lib="webworker" />
import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import type { AsrRunOptions } from "../local-asr/asr-client";
import type { AsrProgress, Backend, WorkerReply } from "../local-asr/asr-core";
import { modelPreparation } from "../local-asr/model-preparation";
import { downloadModel, clearModelParts } from "../local-asr/model-download";
import { cachedAsset, type AssetCache } from "../local-asr/cached-asset";
import { observeAsset } from "../local-asr/asset-progress";
import { SPOKEN_LANGUAGES, validateSpokenLanguage } from "../local-asr/subtitle-capabilities";
import { LYRIC_MODEL, LYRIC_REVISION, LYRIC_WEIGHTS, LYRIC_CACHE, LYRIC_SAMPLE_RATE, LYRIC_MAX_SECTION, LYRIC_RUNTIME, permittedLyricAsset } from "./lyric-model";

const scope = self as unknown as DedicatedWorkerGlobalScope;
let busy = false, transcriber: AutomaticSpeechRecognitionPipeline | undefined, factoryUrl = "";
scope.onmessage = async (event: MessageEvent<{ id: number; samples: Float32Array; backend: Backend } & AsrRunOptions>) => {
  if (busy) return;
  busy = true;
  const { id, samples, backend } = event.data;
  const send = (message: Omit<Extract<WorkerReply, { type: "progress" }>, "id"> | Omit<Extract<WorkerReply, { type: "result" }>, "id"> | Omit<Extract<WorkerReply, { type: "error" }>, "id">) => scope.postMessage({ id, ...message });
  const preparation = modelPreparation(Object.fromEntries(Object.entries(LYRIC_WEIGHTS).map(([url, size]) => [url.split("/").at(-1)!, size])));
  if (transcriber) for (const [url, size] of Object.entries(LYRIC_WEIGHTS)) preparation.update(url.split("/").at(-1)!, size, size);
  const progress = (value: AsrProgress) => send({ type: "progress", progress: preparation.progress(value) });
  const nativeFetch = scope.fetch.bind(scope), requests: { method: string; url: string }[] = [];
  let downloadedBytes = 0, cacheHits = 0, warned = false;
  const warn = () => { if (!warned) { warned = true; progress({ stage: "loading", warning: "Recovery storage is unavailable. Keep this tab open to finish your captions." }); } };
  const cache: AssetCache = {
    async match(key) {
      try {
        const response = await (await caches.open(LYRIC_CACHE)).match(key);
        if (response) { cacheHits++; const size = LYRIC_WEIGHTS[key]; if (size) { preparation.update(key.split("/").at(-1)!, size, size); progress({ stage: "loading" }); } }
        return response;
      } catch { warn(); return undefined; }
    },
    async put(key, response) {
      try { const storage = await caches.open(LYRIC_CACHE); await storage.put(key, response); if (LYRIC_WEIGHTS[key]) await clearModelParts(key, LYRIC_WEIGHTS[key], part => storage.delete(part)); }
      catch { warn(); }
    },
  };
  scope.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, scope.location.href);
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    if (!permittedLyricAsset(url, method, !!(init?.body || input instanceof Request && input.body))) throw new Error("Recognition blocked an unexpected network request.");
    requests.push({ method, url: url.href });
    if (method === "GET") {
      const saved = await cache.match(url.href);
      if (saved) return saved;
      if (LYRIC_WEIGHTS[url.href]) return downloadModel(url.href, LYRIC_WEIGHTS[url.href], cache, nativeFetch, progress, bytes => { downloadedBytes += bytes; });
    }
    const response = await nativeFetch(input, init);
    // Metadata/runtime resources are small. Large model bodies stay in bounded
    // range entries; never duplicate a complete 645 MB buffer for cache writes.
    if (method === "GET" && response.ok) await cache.put(url.href, response.clone());
    return observeAsset(response, url.pathname.split("/").at(-1)!, progress, bytes => { downloadedBytes += bytes; });
  };
  try {
    if (!(samples instanceof Float32Array) || !samples.length || samples.length > LYRIC_SAMPLE_RATE * LYRIC_MAX_SECTION || samples.some(value => !Number.isFinite(value))) throw new Error("Choose a shorter, readable vocal passage.");
    if (backend !== "wasm" && backend !== "webgpu") throw new Error("Choose a supported recognition mode.");
    let language = event.data.language ?? "en"; validateSpokenLanguage(language);
    const started = performance.now(); progress({ stage: "loading", backend });
    const { pipeline, env, Tensor } = await import("@huggingface/transformers");
    env.allowLocalModels = false; env.allowRemoteModels = true; env.remoteHost = "https://huggingface.co/";
    env.remotePathTemplate = "{model}/resolve/" + LYRIC_REVISION + "/"; env.fetch = scope.fetch;
    // Transformers.js reconstructs a Response from the complete model buffer
    // when its own cache is enabled, adding a second huge allocation and write.
    // The fetch layer above owns caching, including interrupted range recovery.
    env.useBrowserCache = false; env.useFSCache = false; env.useCustomCache = false; env.useWasmCache = false;
    const wasm = env.backends.onnx.wasm!; wasm.numThreads = 1; wasm.proxy = false;
    wasm.wasmPaths = { mjs: LYRIC_RUNTIME + "ort-wasm-simd-threaded.asyncify.mjs", wasm: LYRIC_RUNTIME + "ort-wasm-simd-threaded.asyncify.wasm" };
    if (!factoryUrl) {
      const [binary, factory] = await Promise.all([cachedAsset(LYRIC_RUNTIME + "ort-wasm-simd-threaded.asyncify.wasm", cache, scope.fetch), cachedAsset(LYRIC_RUNTIME + "ort-wasm-simd-threaded.asyncify.mjs", cache, scope.fetch)]);
      wasm.wasmBinary = binary.buffer; factoryUrl = URL.createObjectURL(new Blob([factory], { type: "text/javascript" }));
    }
    wasm.wasmPaths = { mjs: factoryUrl, wasm: LYRIC_RUNTIME + "ort-wasm-simd-threaded.asyncify.wasm" };
    const create = pipeline as (task: "automatic-speech-recognition", model: string, options: Parameters<typeof pipeline>[2]) => Promise<AutomaticSpeechRecognitionPipeline>;
    transcriber ??= await create("automatic-speech-recognition", LYRIC_MODEL, { revision: LYRIC_REVISION, device: backend, dtype: { encoder_model: "q8", decoder_model_merged: "q8" } });
    if (language === "auto") {
      progress({ stage: "detecting", backend });
      const features = await transcriber.processor(samples), allowed = new Set(SPOKEN_LANGUAGES.map(item => item.token));
      const vocabulary = (transcriber.model.config as unknown as { vocab_size: number }).vocab_size;
      if (!Number.isInteger(vocabulary) || vocabulary < 10000 || vocabulary > 100000) throw new Error("Recognition configuration is invalid. Please retry.");
      const output = await transcriber.model.generate({ inputs: features.input_features, decoder_input_ids: new Tensor("int64", BigInt64Array.of(BigInt(50258)), [1, 1]), max_new_tokens: 1, return_timestamps: false, return_token_timestamps: false, return_dict_in_generate: false, suppress_tokens: Array.from({ length: vocabulary }, (_, i) => i).filter(i => !allowed.has(i)), begin_suppress_tokens: [], do_sample: false });
      const tokens = (output as unknown as { tolist(): bigint[][] }).tolist()[0];
      const detected = SPOKEN_LANGUAGES.find(item => item.token === Number(tokens.at(-1)));
      if (!detected) throw new Error("Select the song language and try again."); language = detected.code;
    }
    const loadMs = performance.now() - started; progress({ stage: "transcribing", backend });
    const inference = performance.now(), output = await transcriber(samples, { language, task: "transcribe", return_timestamps: "word", do_sample: false });
    if (Array.isArray(output)) throw new Error("Recognition returned an unexpected result.");
    send({ type: "result", result: { chunks: output.chunks ?? [], text: output.text, language, backend, loadMs, inferenceMs: performance.now() - inference, downloadedBytes, cacheHits, requests } });
  } catch (failure) { send({ type: "error", message: failure instanceof Error ? failure.message : "Recognition could not finish. Try a shorter vocal passage." }); }
  finally { scope.fetch = nativeFetch; busy = false; }
};
