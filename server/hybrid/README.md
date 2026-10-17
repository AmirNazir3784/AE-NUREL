# Development CPU transcription

This is an opt-in loopback service, not a public Hostinger deployment. Production always returns 404, including when enable flags are set. The existing browser tool is unchanged and never receives an automatic server fallback.

Run from the repository root with Node 22.22.2 or newer supported Node, after installing the existing dependencies. `/dev/hybrid-processing` uses the existing caption editor/exporters. The operator supplies an ephemeral access token in the form; it is held only in component memory. Use synthetic/public test audio.

Required server environment names:

- `AENURAL_HYBRID_ENABLED=1` (development only)
- `AENURAL_HYBRID_DEV_TOKEN` (32–256 characters, randomly generated; never a public variable)
- `AENURAL_HYBRID_ORIGIN` (exact local HTTP origin)
- `AENURAL_HYBRID_MODEL_CACHE` (absolute private cache directory, outside `public`)
- `AENURAL_HYBRID_MAX_RSS_MB` (1024–4096; local QA used 2048)
- `AENURAL_HYBRID_TIMEOUT_MS` (optional, 1000–300000; default 180000)
- `AENURAL_HYBRID_QA=1` optionally isolates Next development output in `.next-hybrid-dev`.

Bind the development server to loopback. The cache uses the existing SHA-256-of-pinned-URL filenames from `artifacts/local-asr-qa/model-cache`; no weights are downloaded by the service. `verify-standard-models.mjs` checks cached weights against upstream LFS hashes. No credentials or weights belong in Git.

Implemented capability: English, intact 16-bit PCM WAV, mono/stereo, 8–48 kHz, maximum 60 seconds/8 MiB. The server uses pinned Small.en q8 CPU with word timestamps. Translation and video return unsupported capability responses. The browser's existing long-recording pipeline remains available separately.

One isolated child and one upload reservation per Node process; no public queue. Input is streamed with a 15-second upload deadline and strict WAV parsing. Token, Host/Origin, consent, rate and size gates precede inference. The child has a 768 MiB V8 heap cap, two ORT CPU threads, RSS monitoring and a wall-clock deadline. **RSS monitoring is not an OS-enforced native-memory limit** and does not include the Next process. Model RAM and web-server headroom must both fit the host.

Successful, failed, timed-out and cancelled jobs delete temporary audio before reporting completion. Parent disconnect stops the worker and attempts cleanup. Cleanup errors stop new jobs; an OS/power failure can still leave a private temporary directory requiring operator cleanup. Results expire after ten minutes or are deleted when received. Jobs are in-memory and do not survive a server restart; the browser tool retains its separate existing checkpoint recovery.

Local acceptance: `node --test tests/hybrid-processing.test.mjs`; real Node 22 integration: `scripts/prelaunch/verify-hybrid-service.mjs` against the configured isolated loopback instance. The latter expects only the ignored synthetic fixture/cache and generated QA token file; it never contacts production.

Before any Hostinger use: verify the actual Cloud plan's Node/native-ONNX CPU, child-process, RAM, timeout, private persistent cache and temporary-storage permissions. Implement real account authorization, deployment-level rate limits/concurrency across instances, privacy/retention disclosure and a supported private launch configuration. The development token and process-local controls are not a public abuse-protection system. Production enablement is deliberately absent; do not run a public website with `NODE_ENV=development`. No deployment performed.
