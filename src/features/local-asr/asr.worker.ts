/// <reference lib="webworker" />
import { ASR_CACHE, ASR_MODEL, ASR_REVISION, ASR_ORT_VERSION, ASR_MAX_SECONDS, ASR_SAMPLE_RATE, isDigitalSilence, permittedAssetRequest, type Backend, type WorkerReply, type AsrProgress } from "./asr-core";
import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import { observeAsset } from "./asset-progress";
import { cachedAsset, type AssetCache } from "./cached-asset";
import { detectSpeech, VAD_SHA256, VAD_URL } from "./speech-activity";
import { transcribeSpeech } from "./speech-transcription";
import type { InferenceSession } from "onnxruntime-web";

const scope = self as unknown as DedicatedWorkerGlobalScope;
let busy = false;
scope.onmessage = async (event: MessageEvent<{ id: number; samples: Float32Array; backend: Backend }>) => {
  if (busy) return;
  busy = true;
  const { id, samples, backend: requested } = event.data;
  const send = (reply: Omit<Extract<WorkerReply, { type: "progress" }>, "id"> | Omit<Extract<WorkerReply, { type: "result" }>, "id"> | Omit<Extract<WorkerReply, { type: "error" }>, "id">) => scope.postMessage({ id, ...reply });
  const progress = (value: AsrProgress) => send({ type: "progress", progress: value });
  let transcriber: AutomaticSpeechRecognitionPipeline | undefined;
  let detector: InferenceSession | undefined;
  let factoryUrl = "";
  const requests: { method: string; url: string }[] = [];
  let downloadedBytes = 0;
  const nativeFetch = scope.fetch.bind(scope);
  scope.fetch = async (resource, options) => {
    const url = new URL(typeof resource === "string" ? resource : resource instanceof URL ? resource.href : resource.url, scope.location.href);
    const method = options?.method ?? (resource instanceof Request ? resource.method : "GET");
    if (!permittedAssetRequest(url, method, !!(options?.body || (resource instanceof Request && resource.body)))) throw new Error("Local transcription blocked an unexpected network request.");
    requests.push({ method, url: url.origin + url.pathname });
    const response = await nativeFetch(resource, options);
    return observeAsset(response, url.pathname.split("/").at(-1) ?? "asset", progress, bytes => { downloadedBytes += bytes; });
  };
  try {
    if (!(samples instanceof Float32Array) || !samples.length || samples.length > ASR_MAX_SECONDS * ASR_SAMPLE_RATE + 1) throw new Error("Audio exceeds the local processing limit.");
    if (isDigitalSilence(samples)) {
      send({ type: "result", result: { chunks: [], text: "", backend: "silence check", loadMs: 0, inferenceMs: 0, cacheHits: 0, downloadedBytes: 0, requests } });
      return;
    }
    progress({ stage: "loading" });
    const { pipeline, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    env.remoteHost = "https://huggingface.co/";
    // v4's preload inventory also consults config with its default revision.
    // Pin the URL template as well as pipeline options so every read stays immutable.
    env.remotePathTemplate = "{model}/resolve/" + ASR_REVISION + "/";
    env.fetch = scope.fetch;
    env.useBrowserCache = false;
    env.useFSCache = false;
    const wasm = env.backends.onnx.wasm!;
    wasm.numThreads = 1;
    wasm.proxy = false;
    // Version-pinned runtime assets. Never a transcription endpoint.
    const runtimeBase = "https://cdn.jsdelivr.net/npm/onnxruntime-web@" + ASR_ORT_VERSION + "/dist/";
    wasm.wasmPaths = { mjs: runtimeBase + "ort-wasm-simd-threaded.asyncify.mjs", wasm: runtimeBase + "ort-wasm-simd-threaded.asyncify.wasm" };
    let cacheHits = 0, cacheWarned = false;
    const warn = () => { if (!cacheWarned) { cacheWarned = true; progress({ stage: "loading", warning: "Model caching is unavailable. This run can continue, but a later run may download the model again." }); } };
    env.useCustomCache = true;
    env.cacheKey = ASR_CACHE;
    env.useWasmCache = true;
    const assetCache: AssetCache = {
      async match(key: string) { try { const response = await (await caches.open(ASR_CACHE)).match(key); if (response) cacheHits++; return response; } catch { warn(); return undefined; } },
      async put(key: string, response: Response) { try { await (await caches.open(ASR_CACHE)).put(key, response); } catch { warn(); } }
    };
    env.customCache = assetCache;
    const started = performance.now();
    const ort = await import("onnxruntime-web/webgpu");
    // Both models must use the very same runtime instance and pinned WASM assets.
    if (ort.env.wasm !== wasm) throw new Error("Local speech runtime versions do not match. Reload and retry.");
    const [binary, factory, model] = await Promise.all([
      cachedAsset(runtimeBase + "ort-wasm-simd-threaded.asyncify.wasm", assetCache, scope.fetch),
      cachedAsset(runtimeBase + "ort-wasm-simd-threaded.asyncify.mjs", assetCache, scope.fetch),
      cachedAsset(VAD_URL, assetCache, scope.fetch, VAD_SHA256)
    ]);
    wasm.wasmBinary = binary.buffer;
    factoryUrl = URL.createObjectURL(new Blob([factory], { type: "text/javascript" }));
    wasm.wasmPaths = { mjs: factoryUrl, wasm: runtimeBase + "ort-wasm-simd-threaded.asyncify.wasm" };
    detector = await ort.InferenceSession.create(model, { executionProviders: ["wasm"] });
    progress({ stage: "detecting", backend: "wasm" });
    const detectionStarted = performance.now();
    const activity = await detectSpeech(samples, async (input, state) => {
      const output = await detector!.run({ input: new ort.Tensor("float32", input, [1, 576]), state: new ort.Tensor("float32", state, [2, 1, 128]), sr: new ort.Tensor("int64", BigInt64Array.of(BigInt(16000)), []) });
      if (!(output.output?.data instanceof Float32Array) || !(output.stateN?.data instanceof Float32Array)) throw new Error("The speech detector returned an invalid response.");
      return { probability: output.output.data[0], state: output.stateN.data };
    });
    const speechActivity = { ...activity, elapsedMs: performance.now() - detectionStarted };
    await detector.release(); detector = undefined;
    if (!activity.regions.length) {
      send({ type: "result", result: { chunks: [], text: "", backend: "speech detector / wasm", loadMs: performance.now() - started, inferenceMs: 0, cacheHits, downloadedBytes, speechActivity, requests } });
      return;
    }
    let backend: "wasm" | "webgpu" = "wasm";
    if (requested !== "wasm") {
      const gpu = (scope.navigator as WorkerNavigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      const adapter = await gpu?.requestAdapter();
      if (adapter) backend = "webgpu";
      else if (requested === "webgpu") throw new Error("WebGPU is unavailable on this device. Choose CPU and try again.");
    }
    progress({ stage: "loading", backend });
    // Narrow the library's all-task overload before invoking it (TS otherwise expands every model union).
    const createAsr = pipeline as (task: "automatic-speech-recognition", model: string, options: Parameters<typeof pipeline>[2]) => Promise<AutomaticSpeechRecognitionPipeline>;
    transcriber = await createAsr("automatic-speech-recognition", ASR_MODEL, {
      // Observe fetch streams instead of v4's optional metadata preflight, which
      // uses default-revision cache keys and makes extra requests on warm runs.
      revision: ASR_REVISION, device: backend, dtype: { encoder_model: "fp32", decoder_model_merged: "q8" }
    });
    const loadMs = performance.now() - started;
    progress({ stage: "transcribing", backend });
    const inferenceStarted = performance.now();
    const output = await transcribeSpeech(samples, activity.regions, async speech => {
      const output = await transcriber!(speech, { return_timestamps: true, chunk_length_s: 30, stride_length_s: 5, do_sample: false });
      if (Array.isArray(output)) throw new Error("Unexpected transcription response.");
      return output;
    });
    send({ type: "result", result: { ...output, backend, loadMs, inferenceMs: performance.now() - inferenceStarted, cacheHits, downloadedBytes, speechActivity, requests } });
  } catch (error) { send({ type: "error", message: error instanceof Error ? error.message : "Local transcription failed. Try CPU mode or a shorter recording." }); }
  finally { await detector?.release().catch(() => {}); await transcriber?.dispose().catch(() => {}); if (factoryUrl) URL.revokeObjectURL(factoryUrl); scope.fetch = nativeFetch; busy = false; }
};
