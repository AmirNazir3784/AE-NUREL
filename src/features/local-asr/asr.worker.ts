/// <reference lib="webworker" />
import { ASR_CACHE, ASR_MODEL, ASR_REVISION, ASR_ORT_VERSION, ASR_MAX_SECONDS, ASR_SAMPLE_RATE, isDigitalSilence, permittedAssetRequest, type Backend, type WorkerReply, type AsrProgress, type AsrResult } from "./asr-core";
import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import { observeAsset } from "./asset-progress";
import { cachedAsset, type AssetCache } from "./cached-asset";
import { detectSpeech, VAD_SHA256, VAD_URL } from "./speech-activity";
import { transcribeSpeech } from "./speech-transcription";
import type { InferenceSession } from "onnxruntime-web";
import { MULTILINGUAL_MODEL, MULTILINGUAL_REVISION, ENGLISH_TIMED_MODEL, ENGLISH_TIMED_REVISION, SECTION_MAX_SECONDS, SPOKEN_LANGUAGES, validateSpokenLanguage, validateTranscriptionQuality, ACCURATE_ENGLISH_MODEL, ACCURATE_ENGLISH_REVISION, ACCURATE_MULTILINGUAL_MODEL, ACCURATE_MULTILINGUAL_REVISION, ACCURATE_CACHE, speechBackend } from "./subtitle-capabilities";
import { normalizeWordAlignment } from "./subtitle-timeline";
import { downloadModel, clearModelParts } from "./model-download";
import { ACCURATE_FILE_BYTES } from "./subtitle-capabilities";
import type { AsrRunOptions } from "./asr-client";
import { modelPreparation } from "./model-preparation";

const scope = self as unknown as DedicatedWorkerGlobalScope;
let busy = false;
let transcriber: AutomaticSpeechRecognitionPipeline | undefined;
let transcriberBackend: "wasm" | "webgpu" | undefined;
let factoryUrl = "";
scope.onmessage = async (event: MessageEvent<{ id: number; samples: Float32Array; backend: Backend } & AsrRunOptions>) => {
  if (busy) return;
  busy = true;
  const { id, samples, backend: requested, multilingual = false, wordTimestamps = false, keepAlive = false, quality = "fast", audioKind = "speech" } = event.data;
  let language = event.data.language ?? (multilingual ? "auto" : "en");
  const modelName = quality === "accurate" ? multilingual ? ACCURATE_MULTILINGUAL_MODEL : ACCURATE_ENGLISH_MODEL : multilingual ? MULTILINGUAL_MODEL : wordTimestamps ? ENGLISH_TIMED_MODEL : ASR_MODEL;
  const revision = quality === "accurate" ? multilingual ? ACCURATE_MULTILINGUAL_REVISION : ACCURATE_ENGLISH_REVISION : multilingual ? MULTILINGUAL_REVISION : wordTimestamps ? ENGLISH_TIMED_REVISION : ASR_REVISION;
  const modelCache = quality === "accurate" ? ACCURATE_CACHE : ASR_CACHE;
  const send = (reply: Omit<Extract<WorkerReply, { type: "progress" }>, "id"> | Omit<Extract<WorkerReply, { type: "result" }>, "id"> | Omit<Extract<WorkerReply, { type: "error" }>, "id">) => scope.postMessage({ id, ...reply });
  const weightRoot = `https://huggingface.co/${modelName}/resolve/${revision}/onnx/`;
  const encoder = quality === "accurate" ? "encoder_model_quantized.onnx" : "encoder_model.onnx";
  const decoder = "decoder_model_merged_quantized.onnx";
  const preparation = modelPreparation({ [encoder]: ACCURATE_FILE_BYTES[weightRoot + encoder], [decoder]: ACCURATE_FILE_BYTES[weightRoot + decoder] });
  const progress = (value: AsrProgress) => send({ type: "progress", progress: preparation.progress(value) });
  let detector: InferenceSession | undefined;
  const requests: { method: string; url: string }[] = [];
  let downloadedBytes = 0;
  let rangeCache: AssetCache | undefined;
  const nativeFetch = scope.fetch.bind(scope);
  scope.fetch = async (resource, options) => {
    const url = new URL(typeof resource === "string" ? resource : resource instanceof URL ? resource.href : resource.url, scope.location.href);
    const method = options?.method ?? (resource instanceof Request ? resource.method : "GET");
    if (!permittedAssetRequest(url, method, !!(options?.body || (resource instanceof Request && resource.body)))) throw new Error("Local transcription blocked an unexpected network request.");
    requests.push({ method, url: url.origin + url.pathname });
    if (method.toUpperCase() === "GET" && rangeCache && ACCURATE_FILE_BYTES[url.href]) return downloadModel(url.href, ACCURATE_FILE_BYTES[url.href], rangeCache, nativeFetch, progress, bytes => { downloadedBytes += bytes; });
    const response = await nativeFetch(resource, options);
    return observeAsset(response, url.pathname.split("/").at(-1) ?? "asset", progress, bytes => { downloadedBytes += bytes; });
  };
  try {
    validateSpokenLanguage(language);
    validateTranscriptionQuality(quality);
    if (audioKind !== "speech" && audioKind !== "music") throw new Error("Unsupported audio processing mode.");
    if (audioKind === "music" && (quality !== "accurate" || !wordTimestamps || samples.some(value => !Number.isFinite(value)))) throw new Error("Music requires valid audio and Accurate measured word timing.");
    if (!(samples instanceof Float32Array) || !samples.length || samples.length > (wordTimestamps ? SECTION_MAX_SECONDS : ASR_MAX_SECONDS) * ASR_SAMPLE_RATE + 1) throw new Error("Audio exceeds the local section processing limit.");
    if (isDigitalSilence(samples)) {
      send({ type: "result", result: { chunks: [], text: "", backend: "silence check", loadMs: 0, inferenceMs: 0, cacheHits: 0, downloadedBytes: 0, requests } });
      return;
    }
    progress({ stage: "loading" });
    const { pipeline, env, Tensor } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    env.remoteHost = "https://huggingface.co/";
    // v4's preload inventory also consults config with its default revision.
    // Pin the URL template as well as pipeline options so every read stays immutable.
    env.remotePathTemplate = "{model}/resolve/" + revision + "/";
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
    env.cacheKey = modelCache;
    env.useWasmCache = true;
    const assetCache: AssetCache = {
      async match(key: string) { try { const response = await (await caches.open(modelCache)).match(key) ?? (modelCache !== ASR_CACHE && (key.startsWith(runtimeBase) || key === VAD_URL) ? await (await caches.open(ASR_CACHE)).match(key) : undefined); if (response) { cacheHits++; if (key.startsWith(weightRoot)) { const size = ACCURATE_FILE_BYTES[key] ?? Number(response.headers.get("content-length")); if (size > 0) { preparation.update(key.slice(weightRoot.length), size, size); progress({stage:"loading"}); } } } return response; } catch { warn(); return undefined; } },
      async put(key: string, response: Response) { try {
        const cache = await caches.open(modelCache); await cache.put(key, response);
        if (ACCURATE_FILE_BYTES[key]) await clearModelParts(key, ACCURATE_FILE_BYTES[key], part => cache.delete(part));
      } catch { warn(); } }
    };
    rangeCache = assetCache;
    env.customCache = assetCache;
    const started = performance.now();
    const ort = await import("onnxruntime-web/webgpu");
    // Both models must use the very same runtime instance and pinned WASM assets.
    if (ort.env.wasm !== wasm) throw new Error("Local speech runtime versions do not match. Reload and retry.");
    const [binary, factory, model] = await Promise.all([
      cachedAsset(runtimeBase + "ort-wasm-simd-threaded.asyncify.wasm", assetCache, scope.fetch),
      cachedAsset(runtimeBase + "ort-wasm-simd-threaded.asyncify.mjs", assetCache, scope.fetch),
      audioKind === "music" ? undefined : cachedAsset(VAD_URL, assetCache, scope.fetch, VAD_SHA256)
    ]);
    wasm.wasmBinary = binary.buffer;
    if (!factoryUrl) factoryUrl = URL.createObjectURL(new Blob([factory], { type: "text/javascript" }));
    wasm.wasmPaths = { mjs: factoryUrl, wasm: runtimeBase + "ort-wasm-simd-threaded.asyncify.wasm" };
    // Speech VAD rejected most sung vocals in the approved song regression.
    // Music mode preserves full real sections for Whisper; it does not invent
    // speech-detector confidence or word timing. Speech tools retain Silero.
    let regions = [{ start: 0, end: samples.length / ASR_SAMPLE_RATE }];
    let speechActivity: AsrResult["speechActivity"];
    if (audioKind === "speech") {
    detector = await ort.InferenceSession.create(model!, { executionProviders: ["wasm"] });
    progress({ stage: "detecting", backend: "wasm" });
    const detectionStarted = performance.now();
    const activity = await detectSpeech(samples, async (input, state) => {
      const output = await detector!.run({ input: new ort.Tensor("float32", input, [1, 576]), state: new ort.Tensor("float32", state, [2, 1, 128]), sr: new ort.Tensor("int64", BigInt64Array.of(BigInt(16000)), []) });
      if (!(output.output?.data instanceof Float32Array) || !(output.stateN?.data instanceof Float32Array)) throw new Error("The speech detector returned an invalid response.");
      return { probability: output.output.data[0], state: output.stateN.data };
    });
    speechActivity = { ...activity, elapsedMs: performance.now() - detectionStarted }; regions = activity.regions;
    await detector.release(); detector = undefined;
    if (!activity.regions.length) {
      send({ type: "result", result: { chunks: [], text: "", backend: "speech detector / wasm", loadMs: performance.now() - started, inferenceMs: 0, cacheHits, downloadedBytes, speechActivity, requests } });
      return;
    }
    }
    let hasGpu = false;
    if (requested === "webgpu" || requested === "auto" && quality === "fast") {
      const gpu = (scope.navigator as WorkerNavigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      const adapter = await gpu?.requestAdapter();
      hasGpu = !!adapter;
    }
    let backend = speechBackend(quality, requested, hasGpu);
    if (transcriberBackend) backend = transcriberBackend;
    progress({ stage: "loading", backend });
    // Narrow the library's all-task overload before invoking it (TS otherwise expands every model union).
    const createAsr = pipeline as (task: "automatic-speech-recognition", model: string, options: Parameters<typeof pipeline>[2]) => Promise<AutomaticSpeechRecognitionPipeline>;
    const loadTranscriber = () => createAsr("automatic-speech-recognition", modelName, {
      // Observe fetch streams instead of v4's optional metadata preflight, which
      // uses default-revision cache keys and makes extra requests on warm runs.
      revision, device: backend, dtype: { encoder_model: quality === "accurate" ? "q8" : "fp32", decoder_model_merged: "q8" }
    });
    if (!transcriber) {
      try { transcriber = await loadTranscriber(); }
      catch (error) {
        if (quality !== "accurate" || backend !== "webgpu") throw error;
        backend = "wasm"; progress({ stage: "loading", backend, warning: "Accurate could not initialize on this GPU. Retrying the same model on CPU." });
        transcriber = await loadTranscriber();
      }
      transcriberBackend = backend;
    }
    if (multilingual && language === "auto") {
      // transformers.js 4.3.1 currently defaults to English when language is
      // omitted. Perform Whisper's language-token detection explicitly.
      const features = await transcriber.processor(samples.subarray(Math.floor(regions[0].start * ASR_SAMPLE_RATE), Math.floor((regions[0].start + 30) * ASR_SAMPLE_RATE)));
      const allowed = new Set(SPOKEN_LANGUAGES.map(item => item.token));
      const suppress = Array.from({ length: 51865 }, (_, i) => i).filter(i => !allowed.has(i));
      const output = await transcriber.model.generate({ inputs: features.input_features, decoder_input_ids: new Tensor("int64", BigInt64Array.of(BigInt(50258)), [1, 1]), max_new_tokens: 1, return_timestamps: false, return_token_timestamps: false, return_dict_in_generate: false, suppress_tokens: suppress, begin_suppress_tokens: [], do_sample: false });
      const tokens = (output as unknown as { tolist(): bigint[][] }).tolist()[0];
      const detected = SPOKEN_LANGUAGES.find(item => item.token === Number(tokens.at(-1)));
      if (!detected) throw new Error("The spoken language could not be detected. Select it explicitly and retry.");
      language = detected.code;
    }
    const loadMs = performance.now() - started;
    progress({ stage: "transcribing", backend });
    const inferenceStarted = performance.now();
    const output = await transcribeSpeech(samples, regions, async speech => {
      const output = await transcriber!(speech, { return_timestamps: wordTimestamps ? "word" : true, chunk_length_s: 30, stride_length_s: 5, do_sample: false, ...(multilingual ? { language, task: "transcribe" } : {}) });
      if (Array.isArray(output)) throw new Error("Unexpected transcription response.");
      if (!wordTimestamps) return output;
      const truncatedContext = !!event.data.hasFollowingSection && speech.byteOffset + speech.byteLength === samples.byteOffset + samples.byteLength;
      const normalized = normalizeWordAlignment(output.chunks ?? [], speech.length / ASR_SAMPLE_RATE, truncatedContext);
      if (normalized.joined) progress({ stage: "transcribing", warning: "Small word-alignment overlaps were grouped within their measured outer spans. Both words are retained." });
      if (normalized.clipped) progress({ stage: "transcribing", warning: "Model output in a padded context edge was bounded to available audio. Non-final section edges are reconciled with the following overlap." });
      return { ...output, chunks: normalized.chunks };
    }, wordTimestamps, (completed, sections) => progress({ stage: "transcribing", completed, sections, unit: "sections", backend }));
    send({ type: "result", result: { ...output, language, backend, loadMs, inferenceMs: performance.now() - inferenceStarted, cacheHits, downloadedBytes, speechActivity, requests } });
  } catch (error) { send({ type: "error", message: error instanceof Error ? error.message : "Local transcription failed. Try CPU mode or a shorter recording." }); }
  finally { await detector?.release().catch(() => {}); if (!keepAlive) { await transcriber?.dispose().catch(() => {}); transcriber = undefined; transcriberBackend = undefined; if (factoryUrl) URL.revokeObjectURL(factoryUrl); factoryUrl = ""; } scope.fetch = nativeFetch; busy = false; }
};
