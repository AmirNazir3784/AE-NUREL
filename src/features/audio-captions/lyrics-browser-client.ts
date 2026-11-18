import { AsrClient, type AsrRunOptions } from "../local-asr/asr-client";
import type { AsrProgress, AsrResult, Backend, TimedText } from "../local-asr/asr-core";
import { hardwareGpu } from "../local-asr/browser-capability";
import { mergeSection, normalizeWordAlignment } from "../local-asr/subtitle-timeline";
import { assertMusicTiming } from "../local-asr/music-quality";
import { focusVocals } from "./vocal-focus";
import { LYRIC_SAMPLE_RATE, LYRIC_MAX_SECTION } from "./lyric-model";

export class LyricsBrowserClient implements Pick<AsrClient, "run" | "cancel"> {
  private readonly client: AsrClient;
  private selected: "webgpu" | "wasm" | undefined;
  constructor(createWorker?: ConstructorParameters<typeof AsrClient>[0]) { this.client = new AsrClient(createWorker ?? (() => new Worker(new URL("./lyrics.worker.ts", import.meta.url), { type: "module" }))); }
  cancel() { this.client.cancel(); }
  async run(samples: Float32Array, _backend: Backend, signal: AbortSignal, progress: (value: AsrProgress) => void, options: AsrRunOptions = {}): Promise<AsrResult> {
    signal.throwIfAborted();
    this.selected ??= await hardwareGpu(navigator) ? "webgpu" : "wasm";
    const duration = samples.length / LYRIC_SAMPLE_RATE, count = duration <= LYRIC_MAX_SECTION ? 1 : Math.ceil(duration / 20);
    if (this.selected === "wasm" && duration > 30.05) throw new Error("Use a clip up to 30 seconds, import captions or set timing.");
    let language = options.language ?? "en", words: TimedText[] = [], loadMs = 0, inferenceMs = 0, cacheHits = 0, downloadedBytes = 0;
    const requests: AsrResult["requests"] = [];
    for (let index = 0; index < count; index++) {
      signal.throwIfAborted();
      const start = count === 1 ? 0 : Math.max(0, index * 20 - 2), end = count === 1 ? duration : Math.min(duration, (index + 1) * 20 + 2);
      const section = { index, start, end, coreStart: index * 20, coreEnd: count === 1 ? duration : Math.min(duration, (index + 1) * 20) };
      const audio = await focusVocals(samples.subarray(Math.round(start * LYRIC_SAMPLE_RATE), Math.round(end * LYRIC_SAMPLE_RATE)), signal);
      const report = (value: AsrProgress) => progress({ ...value, completed: index, sections: count });
      // The installed runtime has reported GPU-memory growth across Whisper
      // runs. End each GPU worker after one bounded inference; weights remain
      // cached. CPU fallback can retain one model for its short clip.
      const run = () => this.client.run(audio.slice(), this.selected!, signal, report, { ...options, language, keepAlive: this.selected === "wasm", idleTimeoutMs: 30000, timeoutMs: this.selected === "webgpu" ? 180000 : 300000 });
      let result: AsrResult;
      try { result = await run(); }
      catch (failure) {
        signal.throwIfAborted(); this.client.cancel();
        if (this.selected !== "webgpu") throw new Error("Captions could not finish. Try a shorter clip or set timing.", { cause: failure });
        this.selected = "wasm";
        if (duration > 30) throw new Error("Use a clip up to 30 seconds, import captions or set timing.");
        report({ stage: "loading", warning: "Retrying recognition with the same quality. This may take longer." });
        result = await run();
      }
      language = result.language ?? language; loadMs += result.loadMs; inferenceMs += result.inferenceMs; cacheHits += result.cacheHits; downloadedBytes += result.downloadedBytes; requests.push(...result.requests);
      const normalized = normalizeWordAlignment(result.chunks, end - start, index + 1 < count || options.hasFollowingSection);
      assertMusicTiming(normalized.chunks); words = mergeSection(words, normalized.chunks, section);
      progress({ stage: "transcribing", completed: index + 1, sections: count });
    }
    return { chunks: words, text: words.map(word => word.text).join(""), language, backend: this.selected, loadMs, inferenceMs, cacheHits, downloadedBytes, requests };
  }
}
