# Lyrics recognition model notice

OpenAI Whisper large-v3-turbo uses the [MIT license](https://github.com/openai/whisper/blob/main/LICENSE).

ONNX conversion: [onnx-community/whisper-large-v3-turbo_timestamped](https://huggingface.co/onnx-community/whisper-large-v3-turbo_timestamped), pinned revision `b3f77bf9a8c4d5ea3415827033d1ffea7955fd9a`.

Approved quantized file fingerprints, checked during the local evaluation:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| encoder_model_quantized.onnx | 644883359 | a5bece0f99f86b5fed85e59b6b23299500639b283a0a6e00098e6583ed1baeb8 |
| decoder_model_merged_quantized.onnx | 439997434 | b4ab1c92a9bcf8c8fdc49deacb57ac51b707d5248bc7868af42371b896c3ae52 |

Inference uses the existing Transformers.js (Apache-2.0) and ONNX Runtime (MIT) dependencies. The model's source, weights, notices and licenses remain subject to their upstream terms. Model binaries and private test recordings are not committed. This implementation is not WhisperX, Demucs or NVIDIA Maxine.
