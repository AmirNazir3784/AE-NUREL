# Eye Contact and Lyrics release checkpoint

18 November 2026. Owner-authorized release of these two tools only, from `dev/tools-completion`. Production baseline: `ac67d8b4e28ff61fe8608cb85979b025975bfe76`. Commit and deployment results must be checked separately; this document is not proof that Hostinger has deployed a commit.

## What changed

- Public routes, canonical metadata, sitemap, tool directory and existing Tools/Free Tools menus for AI Eye Contact and Lyrics to Captions. Public tool count: 27. Podcast and development inference endpoints remain unavailable in production. Pricing stays hidden.
- Eye Contact keeps the existing correction models and editor. Hardware GPU is attempted, with same-graph CPU recovery, bounded clip lengths, tensor cleanup and queued frame processing. Preview and export share one engine instead of initializing a second full set of models. MP4/WebM rendering retains supported sound; original-resolution export remains an explicit option.
- Lyrics uses a pinned quantized Whisper Turbo worker, vocal-focused filtering, actual word timestamps, phrase/word captions, optional supplied lyrics, manual timing, synced preview, editing and SRT/VTT exports. No made-up word times; unmatched lines need manual timing. Old recognition checkpoints are isolated by recognizer identity.
- Minimal Lyrics form: short labels, compact textarea, native audio controls, three task buttons and a 6 px orange progress bar. Preparation percentages reflect measured resources; speech recognition is indeterminate. Cancellation and retry remain available.

## Actual production-mode browser checks

Chrome on this Windows PC, optimized `next build` served with `npm run start` on port 3102. Media tests used an isolated QA profile, not the owner's personal storage. Private recordings, downloaded files and QA logs stay ignored under `artifacts/tool-completion-2026-11-17/`.

**Lyrics:** actual first 22 seconds of the owner's supplied song completed on WebGPU and WASM CPU. Captured worker results confirm the execution providers, rather than inferring GPU use from adapter availability. GPU model initialization took about 75.7 s and inference 69.7 s on this PC; CPU initialization took 5.2 s and inference 73.8 s. These are fixture/device observations, not product speed guarantees. Model resources were reused/seeded in isolated cache; this is not a full cold internet-transfer benchmark. A real pinned Hugging Face range/CORS request returned 206 with the expected content range.

Recognition still mishears some sung words. It is an editable draft, not verified exact lyrics. Small-model attempts failed accuracy checks and were not accepted as successful just because subtitle syntax was valid. Vocal filtering is not Demucs; line matching is not WhisperX forced alignment.

Verified cancellation/retry, changed-options protection, phrase SRT/VTT, 61 measured word cues, text edits, undo/redo, playhead timing, synced preview, manual lines and Unicode import/export. No inference API requests or audio uploads were observed. Existing analytics requests are separate and were not mistaken for inference traffic.

**Eye Contact:** a public-domain 4.013 s, 1280 × 720 talking-head fixture produced 119-frame MP4 and WebM outputs. MP4 retained all 172 original AAC packets with identical SHA-256; WebM produced VP9/Opus with sound. Actual downloaded files were parsed and played to completion. Final repeated-export/cancellation results are recorded in the ignored `eye-shared-engine-final.json` acceptance artifact. This is not a claim that every face, 4K source or codec combination has been tested.

**Layout:** Chrome responsive emulation at widths 1440, 768, 390 and 320 in light/dark themes, including loaded editors; no horizontal page overflow. Centered Eye upload checked. Reduced-motion emulation exercised. This is not physical-device, screen-reader or exhaustive keyboard certification.

## Automated checks

Fresh optimized production build and TypeScript check passed. Final full test suite after engine sharing: **1,035 tests, 123 suites, all passing**. Full ESLint: zero errors, four existing warnings in unrelated files. Modified Eye files pass focused ESLint. See ignored `release-*.log` files for exact run output; never treat tests as proof of universal reliability.

Production HTTP checks: both tool routes, AI directory and tool directory return 200; both routes have one H1, canonical URLs and no noindex. Both appear in the sitemap. `/pricing`, Podcast and the removed development inference API return 404. Eye model headers advertise a 24-hour cache lifetime.

## Hosting and operational limits

Hostinger runs the normal Next.js website and serves the existing approximately 21 MB Eye assets. Lyrics resources come from a pinned public Hugging Face revision: approximately 1.085 GB of weights plus runtime/tokenizer. Resources load on Generate, with bounded resumable cache ranges and no redundant full-buffer library cache. Browser storage eviction can require another transfer. No model binaries, recordings, private databases or credentials are added to Git.

No public Hostinger inference, Python service, Redis queue, paid API or rented GPU is introduced. That avoids concentrating every visitor's inference RAM on the hosting account. It is not a thousand-user load test or provider bandwidth guarantee. Browser GPU/CPU support, available RAM, network delivery and codec support still vary. Known very-low-memory devices are refused automatic Lyrics recognition; import/manual timing remains available. CPU automatic clips are limited to 30 seconds. Hardware GPU Lyrics can accept up to five minutes; Eye up to two minutes with acceleration or 30 seconds on CPU. Unknown device memory is not a safety guarantee.

The CPU check ran with GPU disabled and a simulated 4 GB browser hint on a machine with more physical RAM; genuine 4 GB/mobile hardware was not certified. Cold internet loading of the full model, long songs and every fallback/device-loss scenario remain unverified. Errors and limits must remain honest rather than claiming guaranteed support.

## Authorized deployment handoff

1. Review the release diff and ensure only source, tests, model notices and this checkpoint are staged. Keep runtime data and private configuration excluded.
2. Fetch both remote `main` branches. Fast-forward only if neither has unrelated new work; otherwise integrate and recheck without force-pushing.
3. Commit on the development branch; fast-forward the reviewed commit to `origin/main` and `hostinger/main`, preserving the development branch. The owner has explicitly authorized this release.
4. Hostinger's existing GitHub-connected deployment follows AmirNazir `main`. Preserve private environment/account configuration; no database migration or new inference service is required for these tools.
5. Verify actual live tool responses, menu discovery, canonical URLs, sitemap, model headers and continued 404 restrictions after deployment. A successful Git push alone is not deployment verification.

Existing Auto Caption free features, account roles, private owner login, public signup restrictions and pricing visibility are unchanged. No guarantee of perfect lyric transcription, competitor parity, all-device support or crash-free operation is made.
