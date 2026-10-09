# AENural — Local AI Caption Generation, Batch 1

## Latest follow-up — focused preview UX cleanup (9 October 2026)

**Both tools remain PARTIAL development previews; no release/discovery change.** Inspection of the actual `/tools/podcast-to-captions` and `/tools/free-subtitle-generator` routes established that they share `TranscriptionWorkspace`. Its collapsed information area contained development-only raw model/result JSON, revision, backend/load/inference/cache metrics and cache maintenance. These were not confined to `/dev/local-transcription`.

The two previews now show a concise local-privacy sentence, a small approximate first-use download note (about **95 MB**, including runtime/detector/Whisper/tokenizer assets; device/cache-dependent), and generation before technical options. Actual download byte counts remain visible, with a determinate bar only for a known total. Internal asset filenames have become “Current download”; stage labels describe checking, downloading, preparing, detecting and transcribing without an invented overall percentage or ETA. Filename details show duration rather than codec internals. Processing choice and cache maintenance are inside a closed **Advanced options and model information** area, with a secondary license/notices link. Raw JSON, revisions and result telemetry were removed from this shared customer workspace entirely. The separate lab and its diagnostics were preserved unchanged.

Caption review and its existing prominent SRT/VTT controls, undo, timing validation, cancellation, source playback, replacement safeguards, shared Whisper/Silero worker and caching are unchanged. Existing AENural tokens/components and responsive CSS are reused. No new UI framework/tool/dependency was added.

### Evidence boundaries

- **User-observed:** the owner reports successful SRT and VTT generation/download in Chrome and a visible WebGPU processing indication. Exact route, recording, browser version, backend tracing and browser timing measurements were not supplied. This is useful current success evidence, **not independently reopened file-content QA**, proof that both preview routes passed, or an instrumented WebGPU performance result.
- **Automated:** 16 focused preview/session/review/export/discovery checks passed, including three rendered-markup presentation tests. Across both requested tasks, final full regression: **575 tests / 67 suites**, lint, non-incremental typecheck and production build passed (31/31 static entries). No new engine/native accuracy benchmark was substituted for browser proof.
- **Unverified:** actual post-cleanup populated layout/focus/announcements at 320/768/desktop in both themes, current CPU fallback/cache/cancellation/device behavior, actual downloaded contents and network no-upload inspection. No browser connection was attempted or retried in this batch. Human benchmark/provenance/target-host release gates from the Silero report remain open.

### Exact focused manual UX acceptance

1. Run `npm.cmd run dev` and open **both** preview URLs directly. At 320 px, 768 px and desktop in light/dark, confirm upload and Generate are easy to find, Advanced options starts closed, no raw JSON/revision/backend timings/cache metrics appear, and long filenames do not overflow.
2. Use the owned `artifacts/local-asr-qa/batch2/clear.wav` and original owned MP3. Generate once with normal cache, then again on the same browser. Observe actual byte counts on a cold download and no forced setup/cache clearing on a warm run. Record any missing totals as unavailable, not a fake completion percentage. Do not clear unrelated site data.
3. Keyboard-tab through upload, Generate, Cancel, Reset, audio review, caption edits and both downloads. Open Advanced options only to test CPU fallback or maintenance. Check focus visibility, stage/status/error announcements and touch action reachability with populated results.
4. Correct Unicode/multiline text and timestamps, undo, reject reversed/equal times, then save **actual** SRT and VTT files. Independently reopen/parse both and verify every cue, correction and final word; import the reviewed file into the existing Subtitle Editor. Confirm replace/reset safeguards and cancellation preserve their existing behavior.
5. Record browser/version/device, exact route and actual execution evidence separately from displayed labels. Measure processing time only with a real browser run. Inspect Network for any media/transcript request body; all recording processing must remain local.

---

## Previous follow-up — Silero VAD and release blockers (9 October 2026)

**Podcast to Captions: PARTIAL. Free Subtitle Generator: PARTIAL. Neither can be released yet.** Both remain functional development previews using one shared Whisper engine, noindex and excluded from registry/discovery/sitemap/production. Public count remains 16, including ten Format Conversion tools. No existing converter, Source Window or shared brand layout was rebuilt. No commit/push, paid/remote/server inference or deployment occurred.

### Root cause and correction

The owned 30-second instrumental fixture again produced **“The.”** through ungated Whisper (`batch2-ungated-tones.json`). Timestamped output alone is not a speech-presence decision. The earlier “digital silence” amplitude cutoff also rejected sufficiently quiet nonzero samples without evaluating speech.

The shared worker now uses **Silero VAD 6.2.3** before Whisper: 512-sample / 32 ms frames at 16 kHz, explicit recurrent state and 64-sample context, 0.5/0.35 probability hysteresis, 250 ms minimum activity, 400 ms silence hangover, 300 ms padding and original source times. Only exact-zero audio bypasses the model. No recognized-word blacklist or general quiet-volume rejection exists. A v5 Silero model was investigated first and falsely accepted the tone onset; v6.2.3 rejects it with the same policy. One Silero implementation is shipped, not multiple VAD packages or ASR engines.

Whisper is not constructed or invoked if VAD detects no speech. A detector load/state/integrity failure becomes an error; it never silently skips detection. Valid speech is transcribed using the **whole unchanged source context**; only model segments entirely outside detected speech are removed. An initial region-cropping implementation caused incomplete timings and was corrected before final checks. No source silence is concatenated away, no model timing is replaced by VAD timing, and no subtitle text is fabricated to fill gaps.

Selected official VAD asset:

- Revision **5cd7945676eb32225748052e2e6a0580e4686a08**; **2,327,524 bytes**.
- SHA-256 **1a153a22f4509e292a94e67d6f9b85e8deb25b4988682b7e174c65279d8788e3** checked on network and cache reads before execution.
- [Pinned upstream model/source](https://github.com/snakers4/silero-vad/tree/5cd7945676eb32225748052e2e6a0580e4686a08), [official recurrent ONNX interface](https://github.com/snakers4/silero-vad/blob/5cd7945676eb32225748052e2e6a0580e4686a08/src/silero_vad/utils_vad.py), [MIT notice](https://github.com/snakers4/silero-vad/blob/5cd7945676eb32225748052e2e6a0580e4686a08/LICENSE).
- Runtime remains **onnxruntime-web 1.31.0-dev.20260914-8d85527a0**, now an explicit direct dependency deduplicated with Transformers 4.3.1. The worker asserts the same runtime instance, reuses the model cache and pinned factory/WASM bytes, and releases the detector before Whisper. No new inference engine or larger Whisper model was installed.

### Actual fixture results — native ONNX CPU, not browser proof

| Owned fixture | Speech decision | Whisper / output result |
| --- | --- | --- |
| 10 s digital silence | Rejected | Zero Whisper calls, zero cues |
| 30 s original two-tone instrumental | Rejected; peak probability 0.2314 | Zero calls, zero cues; reproduced hallucination prevented by gate |
| 30 s seeded non-speech noise | Rejected; peak 0.0438 | Zero calls, zero cues |
| Clear synthetic narration, 27.695 s | Retained | Complete draft and final “Lighthouse”; 1/68 edits, WER **1.47%** |
| Same narration at 0.02 amplitude, approximately −34 dB | Retained | Complete draft and final word; WER **1.47%** |
| Narration with 5 s inserted at the existing 7.4 s sentence pause | Two regions retained; gap preserved | Full transcript and final word; WER **1.47%**; source timestamps retained |
| Narration plus seeded background noise | Retained | Speech preserved, but **exact final-word test FAILED**: “Lighthouse” became **“Light House”**; 3/68 edits, WER **4.41%**. No text replacement applied |
| Narration with 5 s intro/outro | Retained at original offset | Final word retained; WER **1.47%** |
| Repeated narration, 55.390 s | Retained | Both copies/final words; WER **1.47%** (2/136 edits) |

The strict native gated-ASR diagnostic exits nonzero for the noisy sample's spelling/word-segmentation mismatch. This is retained as a failed accuracy check, not hidden by the passing automated test suite. Its raw model output was nevertheless serialized, reopened and independently parsed: noisy SRT/VTT **607/603 bytes**. Clear output **606/602 bytes**; quiet **606/602**; separated **639/633**; padded **606/602**; repeated **1,182/1,166**. Hashes and actual segment intervals are in the evidence JSON. **All these are CLI-written local files, not browser downloads.**

Standalone native VAD runs took approximately **0.34–0.76 s** on these fixtures. In the final gated run, model load was **1.868 s**, clear ASR **6.793 s**, quiet **6.043 s**, separated **9.694 s**, padded **9.841 s**, repeated **17.941 s**. The run overlapped clean-install work and is not an isolated speed benchmark. Hardware: AMD Ryzen 5 4500U, Windows, Node 24.21.0, reported memory 16,539,521,024 bytes. Sampled process RSS after speech runs approximately **744–756 MB**, not peak/browser memory. Warm Whisper verification forbade all network requests and used 13 cache reads.

**Remaining VAD limitation:** these tests establish the owned negative fixtures and retained synthetic speech only. Silero is probabilistic, not a guaranteed speech/music classifier. Arbitrary music/singing, environmental/transient noise, very short utterances and real human voices remain unvalidated. The 250 ms policy can miss short utterances. Do not claim universal hallucination prevention or replace the pending human benchmark with synthesized voices. No additional VAD engines are planned in this batch.

### Fresh browser and interface verification

Exactly one user-authorized fresh supported-browser binding was attempted. It failed with **“Timed out after 10000ms waiting for CDP command Emulation.setFocusEmulationEnabled.”** No Chrome/browser retry, alternative controller, request-policy bypass or profile inspection followed. The later user instruction prohibiting further browser attempts was honored.

Thus **both current workflows, WAV/MP3 decode and duration, current WASM/WebGPU/CPU fallback, actual browser download progress/cache/cancellation/replacement, saved SRT/VTT, network no-upload proof, populated light/dark and 320/768/desktop keyboard/accessibility remain PENDING MANUAL VERIFICATION**. Earlier WAV/WASM browser results remain historical and use the previous runtime. No native result is labeled browser proof.

The new detecting stage is announced and treated as busy/cancellable. Runtime/model download sizes/hosts and speech-detection limitations are disclosed. A demonstrated review issue was corrected: reversed/equal caption times now set `aria-invalid` on the timing controls as well as showing errors. Existing labels/status/error semantics, AENural tokens, responsive CSS and editor undo/navigation/handoff are preserved. Actual rendered keyboard/focus/contrast and editor handoff still need browser/manual acceptance. Unit checks prove ten mock worker cancellation cycles terminate all workers; browser latency and memory-growth checks remain pending.

### Final release engineering checks

| Check | Follow-up result |
| --- | --- |
| Focused ASR/VAD/session/progress/export/discovery | **50 tests / 9 suites passed** |
| Full suite, run once at end | **563 tests / 65 suites passed**, no failures/skips/cancellations |
| Lint, run once at end | PASS; one unused test import warning corrected and its file re-linted cleanly |
| Non-incremental typecheck | PASS |
| Production build, run once at end | PASS, **31/31** static entries |
| Clean installation | Default-policy `npm ci` passed in an isolated Windows temp directory; locked Next/Transformers/ORT versions matched; temporary installation removed |
| Install-script caveat | npm withheld **onnxruntime-node, protobufjs, unrs-resolver** install scripts under its default approval policy. Those scripts and Linux/Hostinger reproduction are **NOT VERIFIED**; policy was not weakened |
| Production dependency audit | **0 vulnerabilities** (`--omit=dev`) |
| Initial AI loading | Static HTML inspection of home, /tools and all 16 tools: **18 pages without initial AI library/worker scripts**. Actual browser waterfall remains pending |

Current measured production chunks: Transformers **423,976 raw / 119,185 gzip bytes**, worker **27,004 / 10,386**, emitted ORT module **117,929 / 39,416**, WASM **26,861,777 bytes**; additional loader/shared chunks are excluded from these individual sizes. Silero adds 2.33 MB to the prior 63.6 MB Whisper weights, plus runtime/tokenizer/config assets. Weights are not bundled into initial JS/public/. Runtime paths and cache behavior still require a current browser run; static inspection is not an offline-app certification.

Notices now include pinned Silero MIT and installed protobufjs/long/platform/flatbuffers component notices alongside the previous Transformers/Whisper/ORT/Jinja/tokenizer notices. The pinned converted Whisper card explicitly identifies `openai/whisper-tiny.en` as `base_model`, but still lacks its own license field. Upstream MIT notice is present; final converted-weight distribution/provenance and shipped-notice review remain open.

**Hostinger prerequisites, no deployment performed:** confirm the supported Next/Node hosting mode; reproduce the lock/install-script policy and build on the actual target; HTTPS worker and WASM capability; correct JS/module/WASM MIME and compression; CSP allowing the actual worker/blob/WASM execution and minimum observed model/runtime download origins (including redirects); CORS, storage quota/eviction and asset egress costs; production routes remaining 404 until release; set the owner's real origin only when supplied. No domain/config/service/account was invented. Browser and target-host measurements are still required.

### Exact remaining verification / next batch

1. **PENDING USER INPUT:** five consented English human recordings, 30–60 s each, their reference transcripts and hand-labeled cue boundaries. Require research WER ≤10%, no clip >20%, median boundary error ≤0.5 s and p95 ≤1 s. Synthetic WER does not satisfy this.
2. Use both development URLs and the detailed 13-step manual checklist below. Upload original WAV and MP3; record duration and CPU/WASM generation, actual model byte progress, cold/warm/cache-denied/offline/error behavior, cancel during decode/download/VAD/ASR and ten replace/cancel cycles. No more automated browser retries in this session.
3. Test `artifacts/local-asr-qa/batch2/{silence,tones,noise,clear,quiet,separated,noisy}.wav`, the original PCM WAV/MP3, intro/outro and repeated recordings. Require no captions/download for rejected audio, retained quiet speech/gaps/last words, and honest errors. Add legitimate varied noise/music/human negatives before broad no-speech claims; preserve the noisy exact-word failure for review.
4. Edit multiline Unicode and timings, undo/redo, attempt invalid export, save both formats and independently reopen **actual browser downloads**. Verify filenames/every cue/timing/final word, then open the reviewed download in the existing Subtitle Editor. Verify dirty replace/reset/navigation and native refresh/close manually.
5. At 320/768/desktop widths in light/dark, inspect populated results, long filenames, on-screen keyboard/action reachability, focus/labels/announcements/contrast; record screenshots/results. Record browser/hardware, actual WASM/GPU behavior and browser memory; inspect Network to prove no media/transcript upload and no eager AI requests from public tools.
6. Complete the licensing/provenance and actual Hostinger checks above. Only after applicable gates pass, register the two existing previews. No new tools, model-size increase, alternate VAD packages or redesign is recommended next. Keep tiny.en for now: synthetic quality is useful, but the human/browser evidence needed to justify a larger model is absent.

Follow-up evidence: `artifacts/local-asr-qa/batch2/` (VAD/native output/logs, noisy strict failure/reopened files, clean install tree, bundle and final checks); captured frame probabilities and provenance under `tests/fixtures/local-asr/vad/`. These local artifacts remain subject to the repository's existing ignore rules and need explicit retention in the later authorized backup.

---

## Historical Batch 1 baseline (superseded above where changed)

Updated 9 October 2026. Development implementation; **NOT RELEASED / NOT 100% COMPLETE**. No commit or push. The sixteen existing tools and Source Window were preserved. Research baseline: [competitor report](captionx-generation-competitor-research.md).

## Outcome

| Stage | Implementation | Evidence and disposition |
| --- | --- | --- |
| Shared engine | Dedicated worker, one pinned Whisper model, bounded decode/resample, asset cache, real byte progress, cancellation/stale-job protection, segment cues | Real speech recognized in the earlier browser baseline and current supplemental native CPU tests. Current browser runtime, WebGPU, broader no-speech detection and human benchmark are not accepted. **PARTIAL, release held.** |
| Podcast to Captions | Choose → validate → generate → review/edit/undo → SRT/VTT; replace/reset; file name/duration; local audio playback | Focused session/export checks pass. Final workspace browser flow and both saved downloads **PENDING VERIFICATION**. Development route only. |
| Free Subtitle Generator | One canonical page using exactly the same worker, decoding, review and exports | Focused scope/discovery checks pass. No separate AI variant, YouTube route or video extraction. Final browser workflow **PENDING VERIFICATION**. Development route only. |

Public free-tool count remains **16**, including exactly **10 Format Conversion** tools. Two generation previews are implemented but excluded from registry, search, directories and sitemap. HTTP checks on the production build returned 404 for both previews and the lab; homepage and /tools returned 200. A configured sitemap still has 23 content URLs. Development URLs: `/tools/podcast-to-captions`, `/tools/free-subtitle-generator`, `/dev/local-transcription` under `npm.cmd run dev`.

## Engine, delivery and scope

- `@huggingface/transformers` **4.3.1**, ONNX Runtime Web **1.31.0-dev.20260914-8d85527a0**, existing Mediabunny **1.61.3**. CPU/WASM one thread; automatic GPU adapter detection and explicit CPU retry. WebGPU execution is **UNVERIFIED**. The Node checks below use native ONNX CPU 1.30.0, not WASM and not a product server fallback.
- Model: `onnx-community/whisper-tiny.en`, revision **2575352d61be1bf7225cf8f8b268a4678025fc58**. Selected **fp32 encoder / q8 merged decoder**. English only. No larger model or second ASR engine.
- Exact pinned repository sizes: encoder **32,904,992 bytes**, decoder **30,718,858 bytes**; total **63,623,850 bytes** (63.6 decimal MB / 60.7 MiB). WASM **26,861,777 bytes**, factory **53,057 bytes**, plus tokenizer/configuration and JS. First use is more than 90 MB of uncompressed assets, not merely the weight size. [Pinned model inventory](https://huggingface.co/api/models/onnx-community/whisper-tiny.en/tree/2575352d61be1bf7225cf8f8b268a4678025fc58/onnx).
- **60 seconds / 25 MiB**, mono/stereo 8–48 kHz. Model PCM at 16 kHz is bounded to approximately 3.84 MB; this is not total model/browser memory. WAV and MP3 are input candidates; current complete MP3 decode/ASR is not yet browser-verified. M4A/MP4/MOV/WebM are rejected. No long podcast, video, translation or diarization claims.
- Actual model segment intervals are used; word timestamps are not claimed. Existing cue/export/editor reducers are reused. Missing, reversed, overlapping or out-of-media times are rejected rather than invented. Adjacent short segments can be joined without changing their outer boundaries. Long model segments are not split using fabricated word timing.
- Worker creation and the Transformers import occur only after Generate. Decoder loads only after file selection. No inference API, media upload, key, database, account, remote SpeechRecognition or server transcription path was introduced. Worker fetch permits body-free GET/HEAD only for the immutable model path and pinned runtime asset path; no query strings. This source policy is **not a substitute for the pending current-browser network capture**. Public asset redirects/download hosts still receive ordinary request metadata.
- Cache API name `aenural-whisper-tiny-en-v1`; cache denial warns and allows a network run. Cache clear removes only this namespace, not general browser HTTP cache. Progress counts consumed network bytes, excludes cache reads, and omits a denominator for compressed/unknown lengths. The v4 high-level metadata progress preflight is avoided because its default-revision cache keys can trigger unnecessary warm requests. No fabricated percentage.

Official [WebGPU guidance](https://huggingface.co/docs/transformers.js/guides/webgpu) describes optional browser acceleration and compatibility differences. Installed 4.3.1 source/types, pinned package manifests and emitted build assets govern this implementation; documentation alone does not establish AENural GPU compatibility.

## Evidence: browser versus native

### Earlier real Chrome baseline — Transformers 3.8.1, q8 encoder/decoder

The owned WAV `artifacts/captionx-research-fixtures/original-speech.wav` (27.694875 seconds, PCM16 mono 22,050 Hz, 1,221,390 bytes) was uploaded and decoded in the lab. Real model download byte counts were visible; cancellation during download returned a cancelled state. A warm WASM run recorded **1.965 s load / 6.916 s inference / 10 cache reads / 0 weight-download bytes**; one runtime GET still occurred. Runtime network totals were not fully captured by that older counter.

Word-timestamp mode failed because the converted graph lacks required cross-attention outputs. Segment mode ran but **dropped the final word “lighthouse”**. A real saved SRT, `original-speech (1).srt`, was read from the Downloads directory and retained as `local-asr-qa/baseline-3.8.1-q8.srt` (594 bytes). It is evidence of a successful browser download **and a failed final-word gate**, not proof of current correctness. No browser VTT save was verified. No screenshot set is claimed.

### Current 4.3.1 supplemental native ONNX CPU — NOT browser verification

| Owned fixture | Model load | Inference | Cache reads / asset requests | Observed result |
| --- | ---: | ---: | --- | --- |
| Original 27.695 s, first recorded run | 61.473 s | 4.645 s | 5 cache reads; network traffic | Final “Lighthouse” retained; partially cached setup, **not a clean cold-download benchmark** |
| Original 27.695 s, warm | 1.844 s | 5.078 s | 14 / 0 | Six serialized cues; last end 27.240 s |
| Repeated speech 55.390 s, warm | 1.243 s | 13.044 s | 13 / 0 | Both copies and both final words retained; eleven valid non-overlapping serialized cues; last end 54.640 s |
| Speech with 5 s intro/outro silence, 37.695 s | 1.684 s | 6.425 s | 14 / 0 | Speech retained; first model boundary 5.040 s, preserving the introduced offset |
| Original generated tones, 30 s | See raw JSON | 1.791 s | 14 / 0 | **FAILED no-speech test: invented “The.”** |

The native process's sampled RSS was approximately **681–748 MB** across these speech runs. These are snapshots after inference, **not peak/browser memory measurements**, and do not establish mobile feasibility. CPU/GPU hardware was not inventoried; no cross-device performance promise is made.

The single synthetic script has **68 reference words, one word edit, WER 1.47%** after case/punctuation normalization. It is not human-speech acceptance. The final word is retained with the selected precision. Native SRT/VTT files were independently reopened with existing parsers and checked byte-for-byte against serialization; original outputs are **606/602 bytes**. These files were CLI-written, **not downloaded from the final workspaces**. JSON evidence contains SHA-256 hashes, counts and actual first/last times.

Digital-zero silence is intercepted before loading any model; finite/silence checks pass. **Instrumental/noisy non-speech discrimination is not solved:** the tone fixture produced two bogus timed segments. No special-case word suppression or fixture-specific heuristic was added. A measured VAD/no-speech policy and negative-audio corpus are release requirements. These findings do not mean the engine cannot recognize real input; they prevent claiming general production-quality transcription.

## Automated checks and bundle

| Check | Result |
| --- | --- |
| ASR/session/progress/podcast/release focused checks | **29 passed, 6 suites** |
| Full `npm.cmd test` | **542 passed, 62 suites**, zero failures/skips/cancellations |
| `npm.cmd run lint` | PASS |
| `npm.cmd run typecheck -- --incremental false` | PASS |
| `npm.cmd run build` | PASS, 31/31 static generation |
| Production dependency audit | **0 vulnerabilities** (`--omit=dev`, registry reached with approved network access) |
| Production route hold | Both previews + lab HTTP 404; home and tools HTTP 200 |
| Static initial-script inspection | Home, /tools and all sixteen registered tools: **18 pages without AI library/worker initial scripts** |

Build measurement: AI library chunk **539,174 raw / 156,028 gzip bytes**; worker entry **22,684 / 8,807**; ORT module **117,929 / 39,416**, plus the WASM asset above and small loader/shared chunks. This is a measured artifact inventory, not an exact browser waterfall or complete incremental transfer total. Model weights are not bundled or in public/. The build emits lazy runtime assets; CDN paths are pinned in the worker. Real browser network verification of eager loading remains pending.

Lint initially encountered an unpacked third-party MP3 research package. The exact `artifacts/captionx-research-fixtures/package/**` directory is now ignored by ESLint; application source and QA scripts remain checked. No vendor code was edited or deleted. The full test suite was run after both preview implementations; the final extra work was evidence scripts/notices/documentation.

Labels, review inputs, error/status semantics, focus reset, existing dirty navigation/undo, semantic theme tokens, wrapping layouts and minimum 44 px controls are implemented. **Rendered keyboard/screen-reader, populated dark mode, 320/768/1440 overflow and real mobile results are PENDING VERIFICATION**, not passed by source inspection. The older editor native-refresh/close acceptance gap remains open.

## Browser interruption and exact manual QA

Supported browser automation initially worked. After the download wait timed out, binding failed with “Unable to load browser request-header policy.” One availability retry was automatically rejected as repeated reconnection. No subsequent reconnection, alternative browser controller or profile/cache inspection was attempted. The supplemental CLI tests are local model/file verification, not browser control.

Run these on both development preview pages before public registration:

1. Start `npm.cmd run dev`; use updated Chrome/Edge on a recorded desktop. Open each route. Confirm AENural header/footer, breadcrumb, one H1, visible upload and no model/runtime download before Generate. Inspect Network with Preserve log; use only the owned fixtures above.
2. Choose the owned WAV. Verify filename, 27.695-second duration, readable codec and local audio playback. Repeat with `original-speech.mp3`; record actual decoding, duration, complete recognition and final word. Do not claim MP3 support passes from its extension check alone.
3. Clear only the AENural model cache. Generate on CPU, verify per-asset real bytes and progress stages, record full cold bytes/time. Inspect requests, redirects and payloads: media/transcript bytes must never be sent. Record actual backend/browser/OS/CPU/GPU and peak memory where measurable.
4. Generate again warm. Require no weight re-download; then verify offline processing with all required model/runtime assets cached. Separately test offline route access before claiming an offline app.
5. Block one required asset, deny Cache API/quota, and simulate network interruption. Require explicit errors or cache warning, retry and preserved previous review; no server fallback.
6. Cancel during decode, download and inference; acknowledge within one second on target devices. Replace/reset while running. Repeat cancel → new job ten times; no late results or unbounded retained memory. Cancel/confirm replace/reset after editing and verify intended retained/discarded review.
7. Review original, doubled and intro/outro fixtures. Final words intact; no duplicated/overlapping window text; offsets retained; all timings inside media. Test empty/corrupt WAV, wrong suffix, unsupported containers/codecs, >60 seconds, >25 MiB, and exact boundaries. Failed replacement must preserve existing corrections.
8. Test digital silence, tones and noise. The follow-up native gate rejects these owned fixtures, but current browser behavior and varied music/noise remain unverified. Require an honest empty state and zero invented cues; do not hide chosen words to pass.
9. Edit text with multiline, combining accents, Arabic, CJK and emoji; change start/end, undo/redo, and introduce invalid/reversed time. Invalid export must be blocked with useful associated errors. Switching SRT/VTT must not invoke ASR.
10. Save both formats using actual browser downloads. Reopen downloaded UTF-8 files with independent parsers, verify basename/extension, sequential SRT indexes, WEBVTT header, every reviewed cue/text/timing and final word. Retain hashes. Test dirty navigation and native Refresh/tab/window close manually.
11. Exercise full keyboard flow and screen reader stage/error/result announcements; check focus. At 320/768/1440 widths, long filenames and populated captions, require no page overflow and reachable generate/cancel/download with an on-screen keyboard. Repeat light/dark and verify actual contrast.
12. Test WebGPU in the lab and automatic mode. Record adapter availability, successful execution or actionable CPU retry. Compare actual output, timing, load time and memory. No GPU speed/support claim until it passes. Actual mobile remains unsupported until measured separately.
13. Supply five consented 30–60 s human English recordings with reference transcripts and hand-labeled boundaries. Research gate: WER ≤10% overall, no clip >20%; median cue-boundary error ≤0.5 s, p95 ≤1 s. Keep noisy/accented diagnostics separate. No fabricated recordings, annotations or results.

## Licensing, host readiness and next batch

Full Transformers Apache-2.0, Whisper MIT, current-commit ONNX Runtime MIT/third-party, Jinja MIT and tokenizers Apache-2.0 notices are under `public/licenses/local-asr/`. The conversion repository has no explicit license field in the inspected metadata; derived-weight provenance/notice obligations and all shipped components still need a distribution review. The ONNX runtime dependency is a pinned development build; current browser compatibility is a release gate. No conclusion that publishing is legally/operationally ready is made.

Hostinger delivery, compressed static assets, model egress/cache policy, worker/blob CSP, MIME and CORS, clean install and actual production origin remain unverified. Static public asset downloads have bandwidth cost; self-hosting weights is not part of this batch. Model caches can be evicted. No paid inference is required by this architecture.

**Next batch:** close the local-ASR release gates only: current-browser WASM/GPU and WAV/MP3 validation, measured VAD/no-speech behavior, human accuracy/timing corpus, real downloads, cancellation/cache/network/device/accessibility checks, and licensing/Hostinger delivery. Register the two pages only after these pass. Postpone lyrics/alignment, styled video, clips, YouTube URLs, translation, diarization, long episodes and mobile performance promises.

## Evidence map

- Implementation: `src/features/local-asr/`, the two preview routes and development lab. Existing source/converter/editor implementations remain protected.
- Focused fixtures/tests: `tests/fixtures/local-asr/captured-tiny-en-segments.json`; `tests/local-asr.test.mjs`, `asr-session.test.mjs`, `asr-asset-progress.test.mjs`, `podcast-captions.test.mjs`, `caption-generation-release.test.mjs`.
- Raw results: `artifacts/local-asr-qa/{local-cpu-30s,warm-short,warm-long,warm-padded,warm-tones}.json`; generated WAVs and corresponding SRT/VTT; `output-verification.json`, `synthetic-accuracy.json`, `model-sizes.json`, `bundle-measurements.json`, `production-routes.json`, `production-dependency-audit.json`.
- Logs: `artifacts/local-ai-{full-tests,lint,typecheck,build}.log`.
- Existing ignore rules exclude local evidence/audit artifacts from Git. They must be retained explicitly in the later user-authorized backup. No staging, commit or push was performed.
