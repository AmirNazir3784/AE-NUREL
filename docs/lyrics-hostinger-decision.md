# Eye Contact and Lyrics: processing decision

Updated 18 November 2026, following the owner's final browser-processing choice and explicit authorization to release both tools.

## Current architecture

Both tools process media using the visitor's hardware. Prefer a compatible hardware GPU, recover on CPU where practical, and limit unsupported or weak devices rather than sending work to Hostinger. **There is no server inference endpoint, audio upload, paid API, Python service, Redis worker or GPU rental in this release.** Auto Caption, account access and pricing visibility are unchanged.

The earlier local native-CPU experiment was measured, then removed from active source. Its ignored checkpoint is `artifacts/tool-completion-2026-11-17/server-cpu-checkpoint`. Its approximately 2.3 GiB process peak demonstrated why an unrestricted fallback on a presumed 4 GB shared hosting account is unsuitable for thousands of jobs. That experiment is not part of deployment.

## Device handling and safety

- Hardware WebGPU adapter detection excludes software adapters and insufficient binding limits. An adapter alone is not proof that a model runs: actual initialization and inference must succeed.
- Eye Contact's existing models attempt WebGPU with unsupported operations on WASM. A failed GPU session is released and retried once with the same graph on CPU, including device-loss failures. Eye/pose input and output tensors are disposed on failed runs too.
- Eye Contact accepts up to two minutes with acceleration or 30 seconds on CPU. Export rechecks support, bounds output to 256 MB, defaults to 720p, and keeps the explicit original-resolution option. No model or arbitrary media size is assumed safe on every device.
- Lyrics uses one dedicated worker at a time, a pinned quantized Whisper Turbo model and 20-second cores with overlap. Known 2 GiB devices cannot start automatic recognition; manual timing/import remains available. CPU or known 4 GiB devices get 30-second automatic clips; compatible acceleration with adequate/unknown memory allows the existing five-minute maximum. Unknown memory is not a safety guarantee.
- A reported [Whisper GPU-memory issue](https://github.com/huggingface/transformers.js/issues/1739) affects the installed runtime generation. Each GPU recognition worker terminates after one bounded run, releasing its context instead of accumulating memory across a long song. Models remain cached. CPU model reuse is limited to its short workflow and a 30-second idle timeout.
- GPU failure terminates the worker before trying the same model on CPU. A long job that loses acceleration requests a shorter clip rather than silently processing minutes on a weak CPU. Cancellation, inference deadlines, model range retries and checkpoint recovery are bounded.
- A non-blocking Web Lock prevents another heavy Eye export/Lyrics generation in the same browser origin where supported. It releases on cancellation/tab close. Browsers without Web Locks retain per-workspace job guards; no cross-tab guarantee is claimed there. Other existing tools were not changed to use this lock.

## Model delivery and privacy

Eye Contact's approximately 21 MB of existing weights stay in `public/models/eye-contact`, with their existing licenses and documented provenance. Runtime files use existing pinned jsDelivr URLs. The unversioned Eye asset URLs receive a 24-hour cache lifetime and a revalidation window, rather than an immutable one-year promise. A future model revision should version the asset URL.

Lyrics model: `onnx-community/whisper-large-v3-turbo_timestamped`, immutable revision `b3f77bf9a8c4d5ea3415827033d1ffea7955fd9a`. Quantized weights total **1,084,880,793 bytes**, plus tokenizer/runtime resources. Files are loaded only when generation is requested. Browser storage can reuse complete resources and resume interrupted 8 MiB ranges. Clearing/evicting storage requires resources again. Requests are limited to pinned public GET/HEAD assets; audio-bearing requests and APIs are blocked in the recognition worker.

The fetch layer owns caching. Transformers.js's additional full-buffer cache is disabled to avoid a second allocation/write of the 645 MB encoder. Metadata/runtime resources are cached separately. This reduces avoidable memory pressure; it does not make the model suitable for every low-memory device.

Model resources necessarily transfer to the browser. Do not claim the model is already present, never downloads, or that every repeat visit is guaranteed cache retention. Ordinary UI uses task-focused preparation text and accurately measured preparation progress; recognition stays indeterminate until real work completes.

The main Lyrics form uses short labels and one slim orange progress bar: Preparing, Listening or Creating captions. A percentage appears only during measurable preparation. File logs, stage badges and section counters are absent from the main workflow. Limits and accuracy explanations remain in the relevant help/FAQ.

Hostinger serves the Next.js website and existing Eye assets; Hugging Face serves pinned Lyrics resources. No new CDN or large model binary is added to Git/deployment. Cold model delivery has real bandwidth and latency costs. No thousand-user load capacity, crash-free behavior, all-device support or unlimited provider bandwidth is claimed.

## Accuracy and honest product scope

Whisper speech models can miss singing and hallucinate repetitions: [user experience in Whisper discussion #1833](https://github.com/openai/whisper/discussions/1833), [Vibe song-transcription issue #861](https://github.com/thewh1teagle/vibe/issues/861). Changing processing location does not fix that. Smaller English/multilingual models failed the supplied opening vocal; valid subtitle syntax from those attempts was not an accuracy pass.

The larger model plus vocal-focused filtering/compression recognizes substantially more of the owner's first 22 seconds, but still mishears words. This is an editable draft workflow. Frequency filtering is not Demucs separation. Supplied lines are matched to measured word spans; unmatched lines remain untimed. This is not WhisperX/Wav2Vec2 forced alignment. Review is required, and no millisecond-accuracy or competitor-parity promise is made.

Eye correction is intended for small gaze adjustments on one front-facing speaker. Blinks, glare, multiple faces and large head angles can remain unchanged or produce artifacts. A count of adjusted frames is not a visual-quality score.

## Hosting implications

[Hostinger's documented limits](https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/) include shared plan resources, a 120-second request deadline and no Python/Redis/permanent queue services on managed Cloud. The chosen architecture avoids inference requests entirely. The exact account's ordinary traffic, model-asset caching and deployment performance still need live verification after owner-authorized release.

See `docs/media-tools-release-checkpoint.md` for actual browser/build results, remaining limitations and handoff. The owner authorized publishing the checked implementation to both repositories on 18 November; unrelated preview tools remain restricted.
