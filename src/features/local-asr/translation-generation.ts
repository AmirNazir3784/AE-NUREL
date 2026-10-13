import type { TranslationPipeline, M2M100Tokenizer, Tensor } from "@huggingface/transformers";
import { translationCode, validateTranslationPair } from "./translation-core.ts";

export const TRANSLATION_OUTPUT_TOKENS = 512;
export function validateTranslationTokens(tokens: readonly (number | bigint)[], limit = TRANSLATION_OUTPUT_TOKENS) {
  // EOS alone is insufficient: a forced EOS at the output budget can mask a
  // truncated sentence. Count generated tokens, excluding decoder start.
  if (tokens.length - 1 >= limit || Number(tokens.at(-1)) !== 2) throw new Error("Translation reached its output limit or ended incompletely. Retry this sentence; partial text was not accepted.");
}
export async function generateLocalTranslation(translator: TranslationPipeline, text: string, source: string, target: string) {
  validateTranslationPair(source, target);
  if (typeof text !== "string" || !text.trim() || text.length > 1200) throw new Error("This sentence is too long for safe local translation.");
  const options = { src_lang: translationCode(source), tgt_lang: target, max_new_tokens: TRANSLATION_OUTPUT_TOKENS, forced_eos_token_id: null, do_sample: false };
  const inputs = (translator.tokenizer as M2M100Tokenizer)._build_translation_inputs(text.normalize("NFC"), { truncation: false }, options) as { input_ids: Tensor };
  if (inputs.input_ids.dims.at(-1)! > 1024) throw new Error("This sentence exceeds the translation model's input limit. No input was truncated.");
  // The 4.3.1 runtime defaults forced_eos_token_id to null and explicitly tests
  // for null in modeling_utils.js; its generated declaration omits null.
  // @ts-expect-error Transformers.js 4.3.1 declaration disagrees with its supported null default.
  const generated = await translator.model.generate({ ...inputs, ...options });
  const tokens = (generated as Tensor).tolist() as bigint[][];
  if (tokens.length !== 1) throw new Error("Translation returned an invalid sentence result.");
  validateTranslationTokens(tokens[0]);
  const output = translator.tokenizer.batch_decode(generated as Tensor, { skip_special_tokens: true })[0]?.normalize("NFC").trim();
  if (!output || !/[\p{L}\p{N}]/u.test(output)) throw new Error("The local model returned no usable translation for this sentence.");
  return output;
}
