import { captionDocument, type AsrProgress, type Backend, type TimedText } from "./asr-core.ts";
import { readableSourceDocument } from "./source-caption-layout.ts";
import type { AsrClient } from "./asr-client.ts";
import type { TranslationClient } from "./translation-client.ts";
import { audioSections, mergeSection } from "./subtitle-timeline.ts";
import { validateSpokenLanguage, validateTranscriptionQuality, ACCURATE_ENGLISH_REVISION, ACCURATE_MULTILINGUAL_REVISION, type TranscriptionQuality } from "./subtitle-capabilities.ts";
import { languageFilename, needsTranslation, validateTranslationPair, TRANSLATION_REVISION } from "./translation-core.ts";
import { CHECKPOINT_TTL, type CheckpointStore, type SubtitleCheckpoint } from "./subtitle-checkpoints.ts";
import { semanticUnits, localizeUnit, localizedDocument, LOCALIZATION_VERSION, type UnitTranslation, type LocalizationDiagnostic } from "./semantic-localization.ts";

type Decoder = { duration: number; read(start: number, end: number): Promise<Float32Array>; dispose(): void };
type JobOptions = { filename: string; fileKey: string; spoken: string; target: string; quality?: TranscriptionQuality; audioKind?: "speech" | "music"; backend: Backend; signal: AbortSignal; progress(value: AsrProgress): void; diagnostics?(value: LocalizationDiagnostic): void };
type Dependencies = { decoder: Decoder; asr: Pick<AsrClient, "run" | "cancel">; translator: Pick<TranslationClient, "translate" | "cancel">; store: CheckpointStore };
export async function retrySection<T>(operation: () => Promise<T>, signal: AbortSignal, onRetry: (attempt: number, error: unknown) => void): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    try { return await operation(); }
    catch (error) { signal.throwIfAborted(); if (attempt >= 2) throw error; onRetry(attempt + 1, error); }
  }
}
export async function runSubtitleJob(options: JobOptions, dependencies: Dependencies) {
  const { filename, fileKey, spoken, target, quality = "fast", audioKind = "speech", backend, signal, progress } = options;
  const { decoder, asr, translator, store } = dependencies;
  validateSpokenLanguage(spoken);
  validateTranscriptionQuality(quality);
  const sections = audioSections(decoder.duration);
  // Bump this schema when timing/model behavior changes; target language is
  // deliberately excluded so another output can reuse source transcription.
  const key = `v3/${fileKey}/${spoken}` + (quality === "accurate" ? `/small-${spoken === "en" ? ACCURATE_ENGLISH_REVISION : ACCURATE_MULTILINGUAL_REVISION}` : "") + (audioKind === "music" ? "/music-v1" : "");
  let storageAvailable = true;
  // Mirrored checkpoints also cover browsers with disabled/evicted IndexedDB.
  const memory = sessionCheckpoints.get(key);
  const storage = async <T>(operation: () => Promise<T>): Promise<T | undefined> => {
    if (!storageAvailable) return undefined;
    try { return await operation(); }
    catch { storageAvailable = false; progress({ stage: "preparing", warning: "Browser recovery storage is unavailable. Keep this tab open; completed work can only be recovered during this session." }); return undefined; }
  };
  let checkpoint = await storage(() => store.load(key)) ?? memory;
  if (checkpoint && (checkpoint.duration !== decoder.duration || checkpoint.completed > sections.length || checkpoint.completed < 0 || checkpoint.expires <= Date.now())) checkpoint = undefined;
  let words: TimedText[] = checkpoint?.words ?? [], language = checkpoint?.language ?? spoken;
  const startSection = checkpoint?.completed ?? 0;
  try {
    for (let index = startSection; index < sections.length; index++) {
      const section = sections[index]; signal.throwIfAborted();
      progress({ stage: "preparing", completed: index, sections: sections.length });
      const merged = await retrySection(async () => {
        const samples = await decoder.read(section.start, section.end);
        // Fresh translation jobs need measured sentence boundaries even in
        // Fast mode. Same-language short English retains its original path.
        const result = await asr.run(samples, backend, signal, value => progress({ ...value, completed: index, sections: sections.length }), { language, quality, multilingual: spoken !== "en", wordTimestamps: quality === "accurate" || decoder.duration > 60 || spoken !== "en" || needsTranslation(language, target), hasFollowingSection: index + 1 < sections.length, keepAlive: true, ...(audioKind === "music" ? { audioKind } : {}) });
        if (result.language) language = result.language;
        if (result.text.trim() && !result.chunks.length) throw new Error("Speech was recognized without usable timing. Retry this section.");
        return mergeSection(words, result.chunks, section);
      }, signal, (attempt, error) => progress({ stage: "transcribing", completed: index, sections: sections.length, warning: `Retrying section ${index + 1} (retry ${attempt} of 2): ${error instanceof Error ? error.message : "Processing failed."} Completed sections are kept.` }));
      words = merged;
      const next: SubtitleCheckpoint = { key, expires: Date.now() + CHECKPOINT_TTL, completed: index + 1, duration: decoder.duration, words, language };
      sessionCheckpoints.set(key, next);
      await storage(() => store.save(next));
      progress({ stage: "transcribing", completed: index + 1, sections: sections.length });
    }
    // Release speech model memory before allocating the larger text model.
    asr.cancel(); signal.throwIfAborted(); progress({ stage: "building" });
    const source = captionDocument(words, decoder.duration, filename, true);
    if (!source.cues.length) return { document: source, source, words, language, translated: false };
    if (language === "auto") throw new Error("The spoken language could not be detected. Select it and retry.");
    if (!needsTranslation(language, target)) return { document: { ...readableSourceDocument(source, language, words), filename: languageFilename(source.filename, language) }, source, words, language, translated: false };
    validateTranslationPair(language, target);
    const units = semanticUnits(source, language, words), translations: UnitTranslation[] = [];
    // Explicitly opt-in, development-only callback. Never log private text by
    // default, send diagnostics over the network, or persist them separately.
    const diagnose = (value: LocalizationDiagnostic) => { if (process.env.NODE_ENV !== "production") options.diagnostics?.(value); };
    for (const unit of units) {
      signal.throwIfAborted();
      const completed = translations.length;
      diagnose({ stage: "source", unit });
      progress({ stage: "translating", completed, sections: units.length, unit: "sentences" });
      const cacheLanguage = `${language}-${target}-${TRANSLATION_REVISION}-${LOCALIZATION_VERSION}`;
      // Bind cached text to the actual immutable source cue. If source recovery
      // expires before a translation, a new hypothesis cannot reuse stale text.
      const cueHash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([unit.start, unit.end, unit.text, unit.cues.map(cue => [cue.id, cue.start, cue.end])]))))].map(byte => byte.toString(16).padStart(2, "0")).join("");
      const cueKey = `${unit.id}/${cueHash}`;
      const memoryKey = `${key}/${cacheLanguage}/${cueKey}`;
      const cached = sessionTranslations.get(memoryKey);
      let text = await storage(() => store.translation(key, cacheLanguage, cueKey)) ?? (cached && cached.expires > Date.now() ? cached.text : undefined);
      if (text) { try { localizeUnit(unit, text, target); } catch { text = undefined; } }
      try {
        if (!unit.timingReliable) throw new Error("Sentence timing needs review: multiple sentences share a source cue without measured interior word boundaries.");
        if (!text) {
          text = await retrySection(async () => {
            const value = await translator.translate(unit.text, language, target, signal, value => progress({ ...value, completed, sections: units.length, unit: "sentences" }));
            diagnose({ stage: "raw", unit, translation: { id: unit.id, text: value } });
            localizeUnit(unit, value, target); return value;
          }, signal, attempt => progress({ stage: "translating", completed, sections: units.length, unit: "sentences", warning: `Retrying sentence ${completed + 1} (retry ${attempt} of 2). Completed sentences are kept.` }));
          sessionTranslations.set(memoryKey, { text, expires: Date.now() + CHECKPOINT_TTL });
          await storage(() => store.saveTranslation(key, cacheLanguage, cueKey, text!));
        }
        translations.push({ id: unit.id, text });
      } catch (error) {
        signal.throwIfAborted();
        translations.push({ id: unit.id, error: error instanceof Error ? error.message : "Translation failed. Retry this sentence." });
      }
      progress({ stage: "translating", completed: translations.length, sections: units.length, unit: "sentences" });
    }
    progress({ stage: "building" }); signal.throwIfAborted();
    const localized = localizedDocument(source, units, translations, target);
    if (options.diagnostics && process.env.NODE_ENV !== "production") {
      const byId = new Map(localized.document.cues.map(cue => [cue.id, cue]));
      for (const [index, coverage] of localized.ledger.entries()) diagnose({ stage: "coverage", unit: units[index], translation: translations[index], coverage, cues: coverage.outputCueIds.map(id => byId.get(id)!) });
    }
    if (localized.fast) progress({ stage: "building", warning: "Some localized captions are too dense for comfortable reading. Their source time envelopes were preserved; review them before downloading." });
    return { document: localized.document, source, words, language, translated: true, coverage: localized.ledger, failedTranslations: localized.failed };
  } finally { decoder.dispose(); asr.cancel(); translator.cancel(); }
}
const sessionCheckpoints = new Map<string, SubtitleCheckpoint>();
const sessionTranslations = new Map<string, { text: string; expires: number }>();
export function clearSessionCheckpoints() { sessionCheckpoints.clear(); sessionTranslations.clear(); }
export function cleanSessionCheckpoints(now = Date.now()) {
  for (const [key, value] of sessionCheckpoints) if (value.expires <= now) sessionCheckpoints.delete(key);
  for (const [key, value] of sessionTranslations) if (value.expires <= now) sessionTranslations.delete(key);
}
