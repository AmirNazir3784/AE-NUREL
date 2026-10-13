import { LANGUAGE_NAMES } from "./language-names.ts";
// Verified against generation_config.json at this immutable model revision.
// whisper-tiny has 99 language tokens (not large-v3's Cantonese token).
export const MULTILINGUAL_MODEL = "onnx-community/whisper-tiny_timestamped";
export const MULTILINGUAL_REVISION = "517244293732ee2d58139af5814231b7e6830a0d";
export const ENGLISH_TIMED_MODEL = "onnx-community/whisper-tiny.en_timestamped";
export const ENGLISH_TIMED_REVISION = "aeaa13760958b03fac5062f457d317d3319c3168";
export const ACCURATE_ENGLISH_MODEL = "onnx-community/whisper-small.en_timestamped";
export const ACCURATE_ENGLISH_REVISION = "8085393831131554ad978a4e438295a734d3d2c0";
export const ACCURATE_MULTILINGUAL_MODEL = "onnx-community/whisper-small_timestamped";
export const ACCURATE_MULTILINGUAL_REVISION = "65caa70f294b46e1c33ff820aae6b16d048ab818";
export const ACCURATE_CACHE = "aenural-whisper-small-v1";
export const ACCURATE_FILE_BYTES: Readonly<Record<string, number>> = {
  [`https://huggingface.co/${ACCURATE_ENGLISH_MODEL}/resolve/${ACCURATE_ENGLISH_REVISION}/onnx/encoder_model_quantized.onnx`]: 92240508,
  [`https://huggingface.co/${ACCURATE_ENGLISH_MODEL}/resolve/${ACCURATE_ENGLISH_REVISION}/onnx/decoder_model_merged_quantized.onnx`]: 156794981,
  [`https://huggingface.co/${ACCURATE_MULTILINGUAL_MODEL}/resolve/${ACCURATE_MULTILINGUAL_REVISION}/onnx/encoder_model_quantized.onnx`]: 92240498,
  [`https://huggingface.co/${ACCURATE_MULTILINGUAL_MODEL}/resolve/${ACCURATE_MULTILINGUAL_REVISION}/onnx/decoder_model_merged_quantized.onnx`]: 156795750,
};
export type TranscriptionQuality = "fast" | "accurate";
export function validateTranscriptionQuality(quality: string): asserts quality is TranscriptionQuality {
  if (quality !== "fast" && quality !== "accurate") throw new Error("Choose Fast or Accurate transcription quality.");
}
export function accurateDeviceReason(memoryGiB?: number) {
  return memoryGiB !== undefined && Number.isFinite(memoryGiB) && memoryGiB <= 4 ? "Accurate needs more memory than this device reports. Choose Fast to keep processing safely." : null;
}
export function speechBackend(quality: TranscriptionQuality, requested: "auto" | "wasm" | "webgpu", hasGpu: boolean): "wasm" | "webgpu" {
  if (requested === "webgpu" && !hasGpu) throw new Error("WebGPU is unavailable on this device. Choose CPU and try again.");
  // q8 Small was substantially faster/more responsive on WASM in browser QA.
  // An adapter alone is not evidence of useful GPU acceleration for this model.
  return requested === "webgpu" || requested === "auto" && quality === "fast" && hasGpu ? "webgpu" : "wasm";
}
export const SUBTITLE_MAX_SECONDS = 5 * 60 * 60;
export const SUBTITLE_MAX_BYTES = 4 * 1024 ** 3;
export const SECTION_SECONDS = 120;
export const SECTION_OVERLAP = 5;
export const SECTION_MAX_SECONDS = SECTION_SECONDS + 2 * SECTION_OVERLAP;
export const WHISPER_LANGUAGE_CODES = "en zh de es ru ko fr ja pt tr pl ca nl ar sv it id hi fi vi he uk el ms cs ro da hu ta no th ur hr bg lt la mi ml cy sk te fa lv bn sr az sl kn et mk br eu is hy ne mn bs kk sq sw gl mr pa si km sn yo so af oc ka be tg sd gu am yi lo uz fo ht ps tk nn mt sa lb my bo tl mg as tt haw ln ha ba jw su".split(" ");
export const SPOKEN_LANGUAGES = WHISPER_LANGUAGE_CODES.map((code, index) => ({
  code, token: 50259 + index,
  name: LANGUAGE_NAMES[code] ?? code,
})).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
export type LanguageOption = { code: string; name: string };
export function validateSpokenLanguage(language: string) {
  if (language !== "auto" && !WHISPER_LANGUAGE_CODES.includes(language)) throw new Error("Choose a supported spoken language.");
}
export const SUBTITLE_ACCEPT = ".mp3,.wav,.m4a,.aac,.flac,.ogg";
const AUDIO_MIMES = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav", "audio/vnd.wave", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/x-aac", "audio/flac", "audio/x-flac", "audio/ogg", "application/ogg", "audio/x-flac+ogg", "application/octet-stream"]);
export function validateSubtitleFile(file: { name: string; size: number; type?: string }) {
  if (!/\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(file.name)) throw new Error("Choose MP3, PCM WAV, M4A, AAC, FLAC or OGG audio. Decoder support also depends on your browser.");
  if (!file.size) throw new Error("This file is empty. Choose a recording with speech.");
  if (file.size > SUBTITLE_MAX_BYTES) throw new Error("Choose an audio file no larger than 4 GiB.");
  if (file.type && !AUDIO_MIMES.has(file.type.toLowerCase())) throw new Error("The file type does not match a supported audio recording.");
}
export function validateSubtitleDuration(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("The recording has no readable duration.");
  if (duration > SUBTITLE_MAX_SECONDS) throw new Error("Choose a recording up to 5 hours long.");
}
