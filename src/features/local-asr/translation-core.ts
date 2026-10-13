import type { EditorDocument } from "../../lib/subtitle-editor.ts";
import { ASR_ORT_VERSION } from "./asr-core.ts";
import { LANGUAGE_NAMES } from "./language-names.ts";

export const TRANSLATION_MODEL = "Xenova/m2m100_418M";
export const TRANSLATION_REVISION = "9c374f0b7aca709787cea97b047bfbbd1559d177";
export const TRANSLATION_CACHE = "aenural-m2m100-v1";
export const TRANSLATION_FILE_BYTES: Readonly<Record<string, number>> = {
  [`https://huggingface.co/${TRANSLATION_MODEL}/resolve/${TRANSLATION_REVISION}/onnx/encoder_model_quantized.onnx`]: 287856370,
  [`https://huggingface.co/${TRANSLATION_MODEL}/resolve/${TRANSLATION_REVISION}/onnx/decoder_model_merged_quantized.onnx`]: 344128178,
};
export function permittedTranslationAsset(url: URL, method: string, body: boolean) {
  return !body && ["GET", "HEAD"].includes(method.toUpperCase()) && !url.search && (
    url.origin === "https://huggingface.co" && url.pathname.startsWith("/" + TRANSLATION_MODEL + "/resolve/" + TRANSLATION_REVISION + "/") ||
    url.origin === "https://cdn.jsdelivr.net" && url.pathname.startsWith("/npm/onnxruntime-web@" + ASR_ORT_VERSION + "/dist/")
  );
}
// additional_special_tokens from the pinned tokenizer_config.json, not the
// transcription model's different set of supported languages.
export const TRANSLATION_CODES = "af am ar ast az ba be bg bn br bs ca ceb cs cy da de el en es et fa ff fi fr fy ga gd gl gu ha he hi hr ht hu hy id ig ilo is it ja jv ka kk km kn ko lb lg ln lo lt lv mg mk ml mn mr ms my ne nl no ns oc or pa pl ps pt ro ru sd si sk sl so sq sr ss su sv sw ta th tl tn tr uk ur uz vi wo xh yi yo zh zu".split(" ");
export const SUBTITLE_LANGUAGES = TRANSLATION_CODES.map(code => ({ code, name: LANGUAGE_NAMES[code] ?? code })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
export const translationCode = (code: string) => code === "jw" ? "jv" : code;
export function needsTranslation(source: string, target: string) {
  return target !== "same" && translationCode(source) !== target;
}
export function validateTranslationPair(source: string, target: string) {
  if (!TRANSLATION_CODES.includes(translationCode(source))) throw new Error("This spoken language is supported for transcription but not by the local translation model. Choose Same as spoken language.");
  if (!TRANSLATION_CODES.includes(target)) throw new Error("Choose a supported subtitle language.");
}
export type CueTranslation = { id: string; text: string };
export function applyCueTranslations(document: EditorDocument, translations: readonly CueTranslation[], language: string): EditorDocument {
  if (translations.length !== document.cues.length) throw new Error("Translation returned a different number of cues.");
  const cues = document.cues.map((cue, index) => {
    const item = translations[index];
    if (item.id !== cue.id || typeof item.text !== "string" || !item.text.trim() || item.text.length > 8000 || /\u0000|-->|\n\s*\n/u.test(item.text)) throw new Error("Translation returned an invalid cue. Its timing and text were not replaced.");
    return { ...cue, text: item.text.trim() };
  });
  return { ...document, filename: languageFilename(document.filename, language), cues };
}
export function languageFilename(filename: string, language: string) {
  if (!/^[a-z]{2,3}$/.test(language)) throw new Error("Invalid subtitle language code.");
  return filename.replace(/\.srt$/i, "") + "." + language + ".srt";
}
