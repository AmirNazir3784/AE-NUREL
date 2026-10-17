# Local subtitle quality upgrade

Engineering notes, 10 October 2026; integrity repair verified 12 October 2026. **Production release hold remains in place.** Read with [the bounded local pipeline documentation](local-subtitle-upgrade.md). Audio, source transcripts and translated text remain on the device. The only external inference-related traffic is public static model/runtime downloads.

These privacy statements describe the browser tool. The separate opt-in development CPU workspace explicitly requires upload consent and operator access; see [its implemented limits](../server/hybrid/README.md). It is unavailable in production and never silently replaces local processing.

## Transcription decision

### Controlled development verification — 17 October 2026

On `dev/aenural-hybrid`, original pinned Whisper Small/M2M100 revisions and all generation/coverage/timing protections remain. Found one concrete lifecycle defect: AsrClient's idle worker had no model identity, so a subsequent kept-alive request with a different quality, English/multilingual route, timestamp mode or backend could retain the previous loaded model. Reuse now requires matching settings; incompatible workers terminate. Same-model long-section reuse and cancellation remain. Added a regression covering all four transitions. Normal subtitle-job cleanup already reduced the exposure; this is not evidence that it caused every reported recognition error.

Accurate is now the retained workspace's preferred default. Fast stays explicitly selectable; existing reported-memory ≤4 GiB guard asks the user to choose Fast instead of silently downgrading. Translation remains optional, with a concise draft/review note. No vocabulary substitutions, prompting changes, beam settings or language-pair fixes.

`scripts/local-subtitle-quality/verify-standard-models.mjs` verifies cached original English Small and M2M100 ONNX files against pinned upstream LFS SHA-256 (four matching files), blocks all weight downloads, runs the existing synthetic terminology WAV and compares direct upstream M2M100 versus the integration on five existing multilingual cases. All five outputs match exactly, including known semantic failures. Multilingual Small's pinned manifest is checked, but its two weights are absent from the native filesystem cache; no new download was made and no native hash verification is claimed for them. These are original pinned ONNX community/Xenova exports of upstream models, not a claim that quantized ONNX bytes equal OpenAI/PyTorch weights.

Real native Small CPU output recognizes A-roll/B-roll, After Effects, Premiere Pro and motion graphics; SaaS remains “SAUS”. 49 timed words, approximately 14.0s inference; both generated exports parse. Actual browser Accurate English: WASM, 10.57s loading / 25.70s inference, 15 cache hits, zero downloaded bytes/requests. Browser downloads contain four valid timed cues with A-roll/B-roll retained. Current fixture/evidence and unedited M2M100 outputs are in ignored `artifacts/hybrid/`; no private recording or new model was used. Structural correctness does not establish semantic quality.

The installed stack is Transformers.js **4.3.1**, ONNX Runtime Web **1.31.0-dev.20260914-8d85527a0**, and Mediabunny **1.61.3**. Fast retains the working Tiny/Tiny.en paths. Accurate selects **Whisper Small timestamp-enabled ONNX**, with quantized encoder and merged decoder. No vocabulary substitutions, prompts containing terminology lists, fine tuning or external speech APIs were introduced.

| Candidate | Selected weight bytes | Practical findings | Decision |
| --- | ---: | --- | --- |
| Tiny/Tiny.en, fp32 encoder + q8 decoder | approximately 63.6 million | Lowest memory; existing compatible short/long paths | Fast (previous default) |
| Base.en timestamped, fp32 encoder + q8 decoder | 136,163,926 | Better SaaS recognition in this fixture, but still “a role” | Not selected |
| Small.en timestamped, q8 encoder + q8 decoder | 249,035,489 | Recognized A-roll and B-roll; higher memory and latency | Accurate |
| Small multilingual timestamped, q8 both | 249,036,248 | Same architecture, 99 Whisper language tokens; explicit language or actual token detection | Accurate for Auto Detect/non-English |
| Small, fp32 encoder + q8 decoder | approximately 509.6 million | Twice the download before tokenizer/runtime overhead | Not the default Accurate precision |

Sizes are decimal bytes for model weights, **not total first-use traffic or total RAM**. Tokenizer/config, the shared runtime, and the 2.33 MB speech detector are additional. English and multilingual exports have distinct assets; using both may cache both. Fast and Accurate cache independently. Browser storage can be evicted.

Whisper upstream code/weights are MIT. Models and revisions:

- Fast English: `onnx-community/whisper-tiny.en`, `2575352d61be1bf7225cf8f8b268a4678025fc58`.
- Fast word-timed English: `onnx-community/whisper-tiny.en_timestamped`, `aeaa13760958b03fac5062f457d317d3319c3168`.
- Fast multilingual: `onnx-community/whisper-tiny_timestamped`, `517244293732ee2d58139af5814231b7e6830a0d`.
- Accurate English: `onnx-community/whisper-small.en_timestamped`, `8085393831131554ad978a4e438295a734d3d2c0`.
- Accurate multilingual: `onnx-community/whisper-small_timestamped`, `65caa70f294b46e1c33ff820aae6b16d048ab818`.

Both Accurate exports include alignment heads for word timestamps. The same VAD, 120-second cores, five-second overlaps, maximum 130-second decoding buffers, timestamp reconciliation, retry, cancellation and checkpoint path are used. Accurate always requests word timestamps. Source keys include quality and model revision; existing Fast source keys remain reusable. Translation keys also include the localization algorithm/model version. Target-language changes do not retranscribe the recording.

Accurate Automatic uses WASM: q8 Small was considerably slower on the tested AMD WebGPU adapter, and an available adapter alone does not prove useful acceleration. Fast retains its existing automatic GPU selection. Advanced options allow an explicit GPU choice; if Accurate GPU initialization fails it retries **the same Small model** on WASM. A device reporting 4 GiB or less is directed to Fast before Accurate starts. Missing device-memory information is not treated as proof of sufficient RAM; the UI warns about memory. These precautions cannot guarantee that every browser or phone can load Small. No out-of-memory immunity is claimed.

## Real speech comparison

Fixture: 17.82 seconds of local Windows SAPI speech (Microsoft David Desktop), generated without a cloud service. Text includes A-roll, B-roll, After Effects, Premiere Pro, motion graphics and SaaS. One voice/recording is a regression sample, **not an accuracy corpus**.

| Model | Native CPU inference | Process RSS after run | Difficult terms actually returned |
| --- | ---: | ---: | --- |
| Tiny | 3.45 seconds | 564 MB | “a role”, “B-roll”, “SOS” |
| Base | 4.30 seconds | 784 MB | “a role”, “B-roll”, “SaaS” |
| Small q8 | 12.27 seconds | 1,335 MB | “A-roll”, “B-roll”, “SAUS” |

Hardware: AMD Ryzen 5 4500U, six logical threads, approximately 16 GB physical RAM. These are **native CPU**, not WASM/WebGPU, measurements. RSS is an observed process value after inference, not measured browser peak memory. Cold initialization included downloads and is unsuitable for comparing inference speed. Accurate improved the requested A-roll/B-roll distinction but did **not** solve every technical term: SaaS regressed relative to Base. The editor remains necessary.

Chrome on this device, same 17.82-second audio with cached assets: Fast WASM initialization **4.16 seconds**, inference **5.49 seconds**; Accurate WASM initialization **5.93 seconds**, inference **26.34 seconds** (about **4.8×** Fast inference). Accurate WebGPU initialization was **8.29 seconds**, inference **182.94 seconds**. The GPU test overlapped a native translation benchmark for part of its run, so it is not a controlled universal GPU/CPU comparison. Nevertheless, poor GPU responsiveness and the slower separate five-hour QA speech sections supported a compatible WASM default. No performance promise for other GPUs is inferred.

Actual Fast/Accurate SRT and VTT downloads both parsed correctly. Accurate recognized “A-roll” and “B-roll”; the generic tokenizer-boundary join retained their hyphens. Refresh/reselection recovered Accurate source words without loading the model again; switching back to Fast recovered its separate original hypothesis.

The successful terminology comparison above uses **Spoken Language: English**, selecting Small.en. Actual Accurate Auto Detect identified English with the multilingual Small model, but still returned “a role” / “B role” on this fixture. This is an explicit remaining recognition limitation, not corrected by a dictionary. A fresh cached multilingual browser run took 19.65 seconds to load/detect and 23.96 seconds to transcribe. After the interruption on 12 October, a fresh Small.en browser run again returned A-roll/B-roll, taking 6.57 seconds to load and 28.87 seconds to transcribe; its audit recorded 15 cache hits, zero downloaded bytes and no asset requests.

Actual five-hour PCM WAV, **793,800,044 bytes**: Accurate processed **150 sections**, cancelled at 149, then resumed after refresh/reselection. Its downloaded SRT/VTT contain 12 cues, ending at **04:59:58.820** with the expected final word “lighthouse.” This fixture has speech at the beginning/end and silence between: it verifies duration, bounded decoding, absolute timing and recovery, **not five hours of continuous speech**. Browser peak RAM was not measured. The maximum application PCM buffer remains 8.32 MB.

Accurate also processed a real **260-second, three-section** WAV with spoken passages crossing both section seams. Both downloaded formats contain 20 cues and exactly three passage-ending “lighthouse” words, ending at **00:04:11.960**. No seam duplicates or timeline overlaps were found. Warm-worker WASM section inference times were 53.24, 47.55 and 23.50 seconds; model loading for later sections reused the worker/cache. This is a seam regression fixture, not an exhaustive test of difficult boundary speech.

Larger static weight downloads now use resumable **8 MiB ranges**. Interrupted ranges retry independently; cached completed ranges survive worker termination. Content-Range and byte length are validated. Once the complete model is cached, temporary ranges are removed. Existing complete caches are reused. Progress follows actual network reads (or already cached bytes when resuming). This bounds download-section allocation, **not total model RAM**. The browser still needs the full model for inference. Tests cover interrupted/corrupt ranges and cache recovery; hosts must support CORS-exposed HTTP ranges, verified on the pinned public model host.

## Localization architecture

### Confirmed application failure and baseline

The 56 focused baseline tests passed but did not cover the reported missing opener. The old grouper merged the complete 54-character opening sentence with the following question because it closed a sentence only after 60 characters or multiple cues. It produced three translation units from the six-cue fixture. Any nonempty translation was accepted, then distributed across the combined envelope. Thus a model omission could silently erase the opener and allocate later speech to 00:00:00.500–00:00:03.000. The supplied Urdu fixture deterministically demonstrates that unsafe contract. Greedy target splitting caused the tiny suffix line. RTL rendering did not cause missing content: `dir="auto"` was already present.

Cached native M2M100 retained the opener in the pre-repair baseline; **the exact earlier model omission was not reproduced in native inference**. Its cause inside the model remains unproven. The application grouping, missing coverage checks and timing misassignment are confirmed. Initially no matching audio was found among repository fixtures. Later browser inspection found the original `talking head 1.mp3` still selected with the exact English source transcript; this enabled a direct recovered-source browser regression. No recording was reconstructed.

### Sentence correspondence and safe failures

`source-sentences.ts` closes **every independently complete sentence**, regardless of length. Genuine unfinished continuation can span nearby cues, bounded to four cues, 20 seconds, 480 characters and a 1.2-second gap. A single existing source cue can use up to 1,200 characters. Longer unfinished streams become explicitly marked bounded continuations. Source IDs, character fragments and original timing accompany every unit; exact normalized source coverage and order are asserted. Model input contains text only.

One cue containing multiple sentences is divided only at matching **measured word boundaries**. Without those boundaries each sentence has a ledger entry but fails automatic timing review; no character-proportion speech alignment is invented. New Fast translation jobs request the existing Tiny word-timed path. The original short same-language Fast path remains unchanged. Recovered coarse Fast sources are retained without automatic retranscription; ambiguous interior timing requires manual editing or an Accurate run.

`semantic-localization.ts` maps returned translations by explicit unit ID, not array position. The runtime ledger retains source cue IDs/text/time envelope, output cue IDs, structural status and issues. Missing, malformed, empty and exhausted-retry results create **blank, identified captions** in their own interval and an explicit failed state. Later sentences continue. Export is blocked until missing text is corrected; identity and source-envelope checks also apply after editing. Nonempty output is never marked semantically verified. Source references and warnings appear in the existing editor; undo and download controls are reused.

Each successful sentence is checkpointed independently. `sentence-v2` translation keys invalidate old combined-thought results while retaining existing source checkpoints and model caches. Retry repeats only failed/invalid sentences, with two retries. Cancellation retains completed results and releases workers. A development-only, opt-in `runSubtitleJob` diagnostics callback exposes source fragments → input → raw output → ledger → final cues in memory. It is disabled in production and does not log/persist private content by default. The benchmark logs only its explicitly invoked public regression fixtures.

### Generation, meaning and layout

`translation-generation.ts` is shared by the worker and cached-only native benchmark. Source/target language tokens remain independent (`jw` → `jv` only for the actual tokenizer code). NFC preserves compatibility distinctions; source tokenization explicitly disables truncation and rejects more than 1,024 tokens. Generation remains deterministic greedy decoding. Forced EOS at the 512-token budget is disabled; output at the budget or without natural EOS is rejected even if the last token is EOS. The installed runtime supports null forced EOS despite its incorrect generated TypeScript declaration; a narrowly documented type expectation covers this library mismatch.

M2M100 has no separate context channel or reliable sentence-ID output mechanism. Prepending neighboring independent sentences recreates the coverage/alignment defect. Only the active sentence/continuation is translated; cue-split sentences still receive their complete bounded thought. Previous combined-context and beam experiments did not establish a general semantic improvement. No beam/repetition/stochastic option, phrase dictionary, expected-answer prompt, placeholder restoration or larger model was adopted. Observable loss of digit values or alphanumeric identifiers produces **review hints**, not semantic failure claims; translated names and text length alone do not establish incorrectness. Fluent clause omissions, negation, roles, idioms and technical senses can still escape detection.

`subtitle-segmentation.ts` balances target word/grapheme segments with punctuation and generic short-fragment penalties. It protects common names, technical hyphens, URLs and numeric notation where detectable, uses script-aware display-width estimates, and emits at most two lines per cue. Punctuation attaches to text. All non-whitespace characters must survive unchanged. Output timings stay within **that sentence's measured speech envelope**; original cue times are retained where suitable. Dense/impossible layouts are flagged rather than shortened or moved. These are typography heuristics, not a syntactic parser: Urdu compounds such as `تخلیق کاروں` can still break between cues, and actual font width/reading speed varies. `dir="auto"` remains on source and caption controls; exports add no bidi markup.

### Six-cue regression result

The new five sentence envelopes are **500–3000, 3180–7600, 7940–8600, 8920–10600, 10980–19100 ms**. Only source cues 5–6 are joined as a genuine continuation. The downloaded browser Urdu SRT contains seven cues:

| Source interval | Previously supplied Urdu | Actual repaired browser output / timing |
| --- | --- | --- |
| Opening, 500–3000 ms | Missing; the question occupies this interval | `آج کی ویڈیو میں،` / `ہم ایک تجربہ کرنے جا رہے ہیں.` at **500–3000** |
| A-roll question, 3180–7600 ms | Begins early at 500 ms; `اس نقطہ تک` and `گا؟` split | Question occupies **3180–5603** and **5603–7600**; `اس نقطہ تک` remains together; no orphan `گا؟` |
| We'll see, 7940–8600 ms | Merged with the next sentence | `ہم دیکھیں گے` at **7940–8600** |
| Viewer decision, 8920–10600 ms | Courtroom-judge meaning | `آخر میں آپ کو ایک قاضی` / `بننے کے لئے جا رہے ہیں، نہیں؟` at **8920–10600**; **semantic failure remains** |
| Advanced techniques, 10980–19100 ms | Wrong technical senses and mesmerizing meaning | Two cues at the original 10980–15320 / 15320–19100; technical/mesmerizing errors remain, including `مزاحمت کرنے` in the browser output |

The actual opening, middle and final intervals were read from the downloaded file, not reconstructed from a screenshot. Native and browser first four translations agree; the final sentence differs in some words while failing semantics on both runtimes.

## Translation candidates and evidence

| Candidate | Quantized weight download | Compatibility/license assessment |
| --- | ---: | --- |
| M2M100 418M | 631,984,548 bytes, approximately 650 MB with tokenizer | Existing working q8 WASM pipeline; 100 explicit language tokens; MIT |
| NLLB distilled 600M | approximately 894.6 MB | ONNX available, but CC-BY-NC 4.0 and model card describes research use; unsuitable as the default commercial-site replacement |
| MADLAD-400 3B | approximately 4.94 GB for the inspected quantized encoder/two decoder files | Apache 2.0, broad coverage; inspected export uses separate decoder/decoder-with-past files rather than the current merged-decoder layout; not benchmarked, too large for the default browser path |
| TranslateGemma 4B ONNX | approximately 3.09 GB q4, 2.72 GB q4f16 | Too large as a broadly compatible default; Gemma terms and smaller language set also require consideration |
| Qwen3.5 0.8B optimized ONNX | approximately 647.1 MB q4 text graphs/weights, plus tokenizer | Apache 2.0 multilingual instruction candidate; evaluated on the same multilingual matrix before any adoption |
| Qwen3.5 2B optimized ONNX | 1,533,740,397 bytes for q4 text graphs/weights, plus tokenizer | Apache 2.0; tested with semantic units and a second generic context/prompt experiment; mixed quality, not adopted |

M2M100 was benchmarked with isolated cues and the actual bounded semantic units across English → Urdu/Spanish/German/Arabic/Japanese, Spanish → English, German → Spanish, Japanese → English, Arabic → French and Urdu → English. Context improved some flow but **did not reliably fix idioms or ambiguous words**. The “judge” example remained literal in several languages. Arabic → French retained negation with the actual two-unit grouping, but changed gender; an earlier oversized whole-case prototype also lost negation/person information. A real three-beam experimental decoder failed to fix the matrix consistently and was not adopted. Merely setting `num_beams` is not a quality fix: the installed Transformers.js generation implementation still marks beam search TODO.

Qwen 0.8B returned Arabic for an Urdu request and failed the Japanese/idiom cases. Qwen 2B improved Japanese → English and Arabic → French, but its initial German → Spanish output changed “need not send today” into “do not send today.” A second generic prompt explicitly distinguished optional/prohibited/impossible and supplied neighboring source thoughts: that example improved, as did Spanish → English. English → Japanese still used a courtroom judge and quotation marks; the Spanish idiom and contemporary Urdu remained awkward. These were actual native CPU inference experiments, **not verified browser Qwen runs**. The 2B process used about 1.59 GB RSS after inference, with approximately 6–13 seconds per matrix case in the context experiment; browser peak RAM would differ. A 1.55 GB download and unresolved semantic failures do not justify replacing the functioning browser model.

**Current decision:** retain the pinned M2M100 q8 model with independent sentence correspondence and bounded genuine continuations; expose no misleading “Natural” mode. Separation fixes the Japanese first-person regression in this matrix but loses German→Spanish cross-sentence register consistency. It does **not** satisfy universal natural, meaning-preserving localization. Neither fluent output nor structural validation certifies semantic accuracy. The [manual acceptance matrix](local-subtitle-localization-acceptance.md) records actual failures and requires native-speaker review before release. Candidate research above is historical; no additional models were downloaded or benchmarked for this repair.

This evidence prevents a claim of universally natural localization from context grouping alone. See the acceptance matrix for actual before/after outputs and unresolved failures.

## Reproducing the measurements

The tracked [matrix](../scripts/local-subtitle-quality/cases.json) covers conversational/rhetorical speech, idioms, cue-split thoughts, formality, pronouns/gender, negation, technical terms, brands, numbers/dates, word order and different writing systems. Meaning notes are evaluation criteria, **never instructions or replacement rules supplied to the model**. The commands in this subsection describe the historical model comparison; **do not rerun/download larger candidates for this repair**. Use the cached-only integrity commands below for current verification.

On Windows, run `scripts/local-subtitle-quality/make-fixture.ps1` under the existing execution policy. Do not weaken system policy to run it. A normal local human recording of the same passage is also suitable.

```text
node scripts/local-subtitle-quality/benchmark.mjs asr tiny artifacts/local-subtitle-quality/editing-terminology.wav
node scripts/local-subtitle-quality/benchmark.mjs asr base artifacts/local-subtitle-quality/editing-terminology.wav
node scripts/local-subtitle-quality/benchmark.mjs asr small artifacts/local-subtitle-quality/editing-terminology.wav
node scripts/local-subtitle-quality/benchmark.mjs translation m2m
node scripts/local-subtitle-quality/benchmark.mjs translation qwen
node scripts/local-subtitle-quality/benchmark.mjs translation qwen2
```

These commands download pinned public models and run locally on **native CPU**. They accept only short mono PCM 16-bit WAV fixtures; the product decoder supports its existing broader audio formats. Results/cache/audio go to ignored `artifacts/`, not source control. Browser testing must additionally exercise the actual page, WASM/GPU, refresh recovery, and downloaded SRT/VTT.

`verify-exports.mjs` accepts local filename prefixes and validates actual SRT/VTT downloads for numbering, Unicode, ordered nonoverlapping timelines and identical text/times across formats. Development-only audits report backend, timings, cache hits and asset URLs, without audio/transcript content. Actual warm speech jobs reported zero fetched assets/bytes; negative network-policy tests reject body-bearing requests, query-bearing URLs, unpinned model paths and API endpoints. These are worker asset-fetch audits and data-flow checks, **not a machine-wide packet capture**.

## Integrity repair verification — 12 October 2026

- **667 automated tests** pass, including 29 new integrity regressions, a fresh Fast translation timing regression, and the retained section, privacy, recovery, editor and release-gate suites. ESLint, TypeScript and optimized production build pass. The focused pre-repair baseline was 56 passing tests; passing old tests did not expose the reported defect. Compiled production route metadata still reports **HTTP 404** for the held subtitle preview.
- Deterministic tests cover independent/within-cue/cross-cue sentences, missing and reordered IDs/fragments, blank/malformed/partial/truncated outputs, actual-token limits, controlled retry, failed-first-sentence isolation, cancel during translation, persisted resume, invalid cache rejection, target changes without ASR repetition, measured interior timing and safe failure without it. Layout adversaries cover Urdu, Arabic, Japanese, Spanish, German and English, mixed scripts, numbers, technical names, punctuation, long words and dense intervals. Opt-in diagnostics are tested, including disabled callbacks in production.
- Cached native M2M100 reran all **12 semantic cases plus the six-cue report**. All 26 actual SRT/VTT files were read and structurally validated; every output cue stays in its own source sentence envelope. Semantic failures remain, recorded separately in [acceptance](local-subtitle-localization-acceptance.md). No new model weights or dependencies were downloaded.
- Chrome used the existing original recording, explicit English + Accurate + Urdu, with source recovery reused. Progress showed five sentences, 4/5 at 33 seconds. The final seven-cue SRT was actually downloaded/read; opening, middle and final intervals passed coverage/timing checks. The customer editor displayed source references, draft-review and density warnings.
- Browser download-event observation timed out after SRT download. One reconnect failed with `Debugger unattached`; browser QA stopped. **No newly verified browser VTT download, second target/script, editing/undo, screenshot, refresh/cancel or browser-wide network capture is claimed.** Those mechanisms have automated coverage and earlier browser evidence below. Current worker network restrictions remain pinned, bodyless static GET/HEAD; the native benchmark rejects any network fallback. This is code-path evidence, not a packet capture.
- Source transcription/checkpoint schema, 5-hour/4-GiB limits, bounded PCM allocation, models, caching, styles, Source Window and production gate remain intact. No Git commit/push/deploy was performed. Old combined translation caches are intentionally invalidated. Manual corrections still need downloading; editor changes are not source checkpoints.

Reproduce actual-file checks with:

```text
node scripts/local-subtitle-quality/integrity-benchmark.mjs repair
node scripts/local-subtitle-quality/verify-integrity.mjs artifacts/local-subtitle-quality/repair-browser.ur.srt
node scripts/local-subtitle-quality/verify-exports.mjs --source tests/fixtures/localization/experiment.en artifacts/local-subtitle-quality/repair-experiment-ur
```

The optional browser-file argument assumes that locally downloaded artifact is available; the first two commands otherwise use only the documented existing cache/public fixtures. Model outputs/reports remain ignored under `artifacts/`. The tracked regression SRTs contain only the user-provided example.

**Readiness:** transcription behavior retained; structural sentence accounting and safe failures repaired; timing isolation repaired with heuristic readability limitations; natural multilingual semantics **not accepted**. No universal omission detector is claimed, and the release hold is not lifted.

## Earlier quality-upgrade verification (historical)

- **637 automated tests passed** (74 suites, zero failures/skips), including the retained short/long job tests and the new quality, semantic-unit/resegmentation and resumable-download checks. TypeScript, ESLint and optimized Next.js build passed.
- Actual browser downloads validated: Fast English (4 cues), Accurate English (4), Accurate five-hour fixture (12), Accurate seam fixture (20), and new contextual Urdu (5), Spanish (7), Japanese (5). SRT/VTT text and timing match within each format pair, with sequential SRT numbering and no overlaps.
- The earlier Urdu/Spanish/Japanese outputs preserve their old combined-thought envelopes, which did not protect independent sentence correspondence. Validate those historical files' structure with the current verifier; their old envelope acceptance is superseded:

```text
node scripts/local-subtitle-quality/verify-exports.mjs artifacts/local-subtitle-quality/browser-context.ur artifacts/local-subtitle-quality/browser-context.es artifacts/local-subtitle-quality/browser-context.ja
```

- Local M2M100 WASM translated three thoughts per real 17.82-second browser fixture. Cached initialization was approximately 5.9–7.7 seconds. Per-thought inference ranged from 4.4 to 16.0 seconds across Urdu/Spanish/Japanese; all nine worker audits recorded no asset requests. No browser-wide traffic capture or phone/low-memory performance certification was performed.
- The 12-case semantic matrix ran real local M2M100 and Qwen inference. Results include material failures; **automated test passes do not mean the natural-localization requirement passed**. Native-speaker acceptance, unseen recordings and continuous multi-hour speech remain unverified.
- No API routes, credentials, server-side AI, new package dependencies or standalone subtitle-translator page were introduced. The original production release gate remains in place. The reusable engine can support future translator work, but is not ready to promise natural multilingual localization.

## Workspace finishing — 12 October 2026

See [segmentation and customer workspace verification](subtitle-workspace-finishing.md) for the joint cue/line planner, measured source-boundary layout, calm review hints, revised development tool names and actual downloaded-file checks. Current verification: **691 tests / 82 suites**, lint, typecheck and production build pass. This pass replays recorded model output; it does not claim new inference quality or lift the production hold.

## Primary references

- [Whisper license and model family](https://github.com/openai/whisper), [Small timestamp-enabled export](https://huggingface.co/onnx-community/whisper-small_timestamped), [Base timestamp-enabled export](https://huggingface.co/onnx-community/whisper-base.en_timestamped).
- [M2M100 model card](https://huggingface.co/facebook/m2m100_418M), [pinned-compatible ONNX export](https://huggingface.co/Xenova/m2m100_418M).
- [NLLB model card and restrictions](https://huggingface.co/facebook/nllb-200-distilled-600M), [MADLAD upstream](https://huggingface.co/google/madlad400-3b-mt), [custom MADLAD ONNX export](https://huggingface.co/CXDuncan/madlad400-3b-mt-optimized-quantized-onnx).
- [TranslateGemma](https://huggingface.co/google/translategemma-4b-it), [TranslateGemma ONNX assets](https://huggingface.co/onnx-community/translategemma-text-4b-it-ONNX/tree/main/onnx).
- [Qwen3.5 0.8B](https://huggingface.co/Qwen/Qwen3.5-0.8B), [optimized 0.8B ONNX export](https://huggingface.co/onnx-community/Qwen3.5-0.8B-ONNX-OPT), [optimized 2B ONNX export](https://huggingface.co/onnx-community/Qwen3.5-2B-ONNX-OPT).
