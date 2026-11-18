import { ASR_ORT_VERSION } from "../local-asr/asr-core.ts";
export const LYRIC_MODEL = "onnx-community/whisper-large-v3-turbo_timestamped";
export const LYRIC_REVISION = "b3f77bf9a8c4d5ea3415827033d1ffea7955fd9a";
export const LYRIC_RECOGNIZER = "lyrics-turbo-vocal-browser-v1-" + LYRIC_REVISION;
export const LYRIC_CACHE = "aenural-lyrics-turbo-v1";
export const LYRIC_SAMPLE_RATE = 16000;
export const LYRIC_MAX_SECTION = 26;
export const LYRIC_WEIGHT_ROOT = `https://huggingface.co/${LYRIC_MODEL}/resolve/${LYRIC_REVISION}/`;
export const LYRIC_WEIGHTS: Readonly<Record<string, number>> = {
  [LYRIC_WEIGHT_ROOT + "onnx/encoder_model_quantized.onnx"]: 644883359,
  [LYRIC_WEIGHT_ROOT + "onnx/decoder_model_merged_quantized.onnx"]: 439997434,
};
export const LYRIC_RUNTIME = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ASR_ORT_VERSION}/dist/`;
export function permittedLyricAsset(url: URL, method: string, hasBody: boolean) {
  return !hasBody && !url.search && ["GET", "HEAD"].includes(method.toUpperCase()) && (url.href.startsWith(LYRIC_WEIGHT_ROOT) || url.href.startsWith(LYRIC_RUNTIME));
}
