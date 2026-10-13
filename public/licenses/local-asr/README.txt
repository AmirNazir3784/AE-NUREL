AENural local speech preview — third-party notices

Runtime: @huggingface/transformers 4.3.1 (Apache-2.0), with ONNX Runtime Web
1.31.0-dev.20260914-8d85527a0 (MIT and third-party notices).
Whisper upstream code and weights: MIT, OpenAI.
Model conversion: onnx-community/whisper-tiny.en, immutable revision
2575352d61be1bf7225cf8f8b268a4678025fc58, derived from openai/whisper-tiny.en.
Selected precision: fp32 encoder and q8 merged decoder.

Local subtitle upgrade: short, explicit-English recordings retain that original
model. Word-timed long English uses onnx-community/whisper-tiny.en_timestamped,
revision aeaa13760958b03fac5062f457d317d3319c3168. Multilingual/Auto Detect uses
onnx-community/whisper-tiny_timestamped, revision
517244293732ee2d58139af5814231b7e6830a0d, derived from openai/whisper-tiny.
Both use the existing Whisper MIT notice and fp32 encoder/q8 merged decoder.

Accurate subtitle transcription uses timestamp-enabled Whisper Small, with q8
encoder and q8 merged decoder. English: onnx-community/whisper-small.en_timestamped,
revision 8085393831131554ad978a4e438295a734d3d2c0. Multilingual:
onnx-community/whisper-small_timestamped, revision
65caa70f294b46e1c33ff820aae6b16d048ab818. Derived from the corresponding OpenAI
Whisper Small models; the existing Whisper MIT notice applies. Verify export
provenance/notices under the same production release hold.

Optional local text translation: Xenova/m2m100_418M, revision
9c374f0b7aca709787cea97b047bfbbd1559d177, derived from facebook/m2m100_418M.
Upstream model card identifies MIT licensing. Quantized encoder and merged
decoder run on-device via ONNX Runtime Web; no translation service is called.
The upstream fairseq MIT notice is included as m2m100-mit.txt. Verify conversion
provenance and all notices as part of the existing production release hold.

Speech activity detector: Silero VAD 6.2.3, MIT, Silero Team.
Official model/source revision: 5cd7945676eb32225748052e2e6a0580e4686a08.
Model size: 2,327,524 bytes. SHA-256:
1a153a22f4509e292a94e67d6f9b85e8deb25b4988682b7e174c65279d8788e3
Fetched lazily from the pinned raw.githubusercontent.com upstream path and
verified before execution. Uses the same ONNX Web runtime, not another ASR engine.

Full notices in this directory:
transformers-apache-2.0.txt
whisper-mit.txt
jinja-mit.txt
tokenizers-apache-2.0.txt
silero-vad-mit.txt
protobufjs-license.txt
long-license.txt
platform-license.txt
flatbuffers-license.txt

ONNX Runtime notices above were fetched from source commit 8d85527a0,
matching the pinned Web runtime, rather than the previous test runtime.
onnxruntime-mit.txt
onnxruntime-third-party.txt

Public Whisper delivery: Hugging Face. Speech detector: raw.githubusercontent.com.
Browser runtime delivery: jsDelivr.
These are static asset downloads, not transcription services. Audio processing
occurs locally. Asset hosts still receive ordinary download request metadata.
Model caching depends on browser storage availability and eviction policy.

Production distribution is HELD: the conversion repository does not display an
explicit license field. Verify its provenance/notices, include all shipped
tokenizer/runtime component notices, and validate the actual Hostinger delivery,
cache, CSP and CORS configuration before making this preview public.

Upstream references:
https://github.com/openai/whisper/blob/main/LICENSE
https://huggingface.co/onnx-community/whisper-tiny.en
https://huggingface.co/onnx-community/whisper-tiny.en_timestamped
https://huggingface.co/onnx-community/whisper-tiny_timestamped
https://huggingface.co/onnx-community/whisper-small.en_timestamped
https://huggingface.co/onnx-community/whisper-small_timestamped
https://huggingface.co/Xenova/m2m100_418M
https://huggingface.co/facebook/m2m100_418M
https://github.com/huggingface/transformers.js
https://github.com/microsoft/onnxruntime
https://github.com/snakers4/silero-vad/tree/5cd7945676eb32225748052e2e6a0580e4686a08
