# Caption Studio model reuse

12 November 2026: the owner requested reducing repeated AI preparation. Caption Studio previously omitted the worker's existing keep-alive option, causing every successful run to terminate its loaded inference pipeline.

The studio now opts into compatible-model reuse through `STUDIO_MODEL_REUSE`. The worker stays ready between clips for five idle minutes, then is terminated. Editor unmount and cancellation still terminate it immediately. Quality, language-model family, backend, timestamp mode or audio-mode changes start a compatible fresh worker. Other callers retain their existing retention defaults.

A warm worker skips re-reading its already initialized WASM runtime assets. Known weight-byte preparation is seeded from an actual retained pipeline instead of appearing to download the weights again. Voice detection and transcription still process the new recording normally; no recognition text, model, revision, language selection, timing algorithm, upload consent or hard file limits change.

First-time preparation remains necessary. Reloading/leaving the page, an idle expiry, a worker failure or switching models can require initialization again. Existing persistent asset caches are preserved; storage restrictions or eviction can still require a download. This does not add Hostinger inference or a server upload.

Lifecycle regression tests use controlled worker ports and timers, verifying compatible reuse, idle expiry/reset, model changes, immediate cancellation and late-message/idle-failure cleanup. A separate test executes the actual worker control flow with explicit inference/asset fixtures: two jobs load one pipeline and one WASM runtime inventory, while disposal permits a fresh cold start. They are not measured browser inference speed benchmarks and do not download model weights.
