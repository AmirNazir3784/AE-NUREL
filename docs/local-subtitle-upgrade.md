# Local audio → SRT/VTT upgrade

The follow-up [quality upgrade and integrity repair](local-subtitle-quality.md) adds Fast/Accurate transcription and independent sentence-level localization with bounded genuine continuations. That document records model comparisons, downloads, browser measurements and semantic limitations.

The existing tool uses Mediabunny 1.61.3, Transformers.js 4.3.1, ONNX Runtime Web 1.31.0-dev.20260914-8d85527a0 and Silero VAD 6.2.3. There is no transcription/translation API, upload endpoint, queue service, credential or server environment variable. The original 60-second restriction is in `asr-core.ts`, `asr.worker.ts`, `speech-activity.ts`, and the preview copy. `decode-audio.ts` also allocates the full decoded recording. That path remains for the unrelated podcast preview/development lab.

The existing subtitle page now uses `SubtitleWorkspace`, reusing its layout, styles, upload component, caption editor and downloads. Its separate local job pipeline reads at most 130 seconds into mono 16 kHz Float32 samples: **8,320,000 bytes of model audio per section**, rather than about 1.15 GB for five hours. Native decoder buffers, model/session memory, transcript state, download/cache buffers and the browser itself are additional memory. This is a bound on PCM allocation, not a claim about total peak RAM.

## Processing and recovery

1. Validate extension, MIME, size, real container/codec, duration and sample layout. Decode the first second before accepting a recording. Later corruption is reported at the affected section.
2. Compute a full-file identity in 4 MiB blocks (SHA-256 over ordered block hashes). File contents never enter a network request.
3. Decode successive 120-second sections with five seconds of context on either side. Keep original media offsets. Reuse one speech worker/model for the job. Within long sections, speech-detector regions get an additional second of guard context (beyond the detector's padding); overlapping contexts are combined, while disjoint contexts are transcribed separately and offset back to the section timeline. Silence is never concatenated away. This avoids hallucinations and wasted inference through large silent gaps. The original short-English path retains its full context.
4. Validate timestamps and stitch overlapping word hypotheses at shared context near the section boundary. Keep one copy. Adjacent word alignments overlapping by at most 120 ms are grouped into their original outer measured span, preserving both words without inventing an interior boundary. Last-window padding output is bounded to available audio (up to 1.5 seconds of aligner overrun); tokens wholly outside audio are excluded. These corrections produce visible warnings. Larger drift and conflicting boundaries fail explicitly; they are never resolved by evenly distributing words or dropping a conflicting sentence.
5. Checkpoint the source transcript after each successful section. Retry a failed section twice, then retain previous sections. Source transcription is independent of the selected target language.
6. Release the speech worker before optional translation. Give every independently complete sentence its own identity and measured speech envelope; join only genuine bounded continuations across cues. IDs and times never enter the translation model. Validate input token length, natural EOS, output budget, nonempty text and structure. Save each successful sentence before proceeding; failed sentences remain explicitly blank/retryable in the coverage ledger and block export until corrected. Old combined-thought translations are invalidated while source checkpoints are reused.
7. Build/export with the existing SRT/WebVTT exporters. Readable source cues are grouped using measured word boundaries, six-second/84-character targets and sentence punctuation, with a small allowance to avoid brief ending-word flashes. Target-locale balanced segmentation retains original cue times where practical or redistributes text only inside its corresponding sentence's speech envelope. Ambiguous interior source timing and dense layouts require review. Structural coverage does not prove complete meaning preservation.

IndexedDB stores source words and translated sentence text, **never audio**, with a rolling 24-hour expiry. Expired records are purged when the tool opens and hourly while open, including the memory fallback. Browser eviction can remove them earlier. After a refresh, reselect the identical file and original Spoken Language setting and Transcription Quality, then Generate. Completed source sections and translations are reused. A session-memory fallback retains work if IndexedDB fails. Reset clears all subtitle recovery data; model cache cleanup is separate. Edited review drafts remain subject to the existing editor's download/navigation behavior; edits are not part of source checkpoints.

Cancel aborts decoding and terminates workers. Speech and translation have 20-minute inactivity/inference timeouts, extended by actual incoming model-download bytes. Jobs do not continue after the tab closes or the device sleeps. There is no durable operating-system background service. Section-based progress reports completed work; download progress uses observed bytes and only shows a denominator when known. Web Locks prevent duplicate processing of the same source job in concurrent tabs when available, in addition to the synchronous submission guard in each workspace.

## Models and supported languages

All model/runtime downloads are public static assets. Worker fetch guards allow only bodyless GET/HEAD requests to pinned asset paths; audio/text are never posted to AI services.

| Use | Local model | Immutable revision |
| --- | --- | --- |
| Explicit English, recordings ≤60 seconds | Original `onnx-community/whisper-tiny.en` | `2575352d61be1bf7225cf8f8b268a4678025fc58` |
| Longer explicit English | `onnx-community/whisper-tiny.en_timestamped` | `aeaa13760958b03fac5062f457d317d3319c3168` |
| Auto Detect / other spoken languages | `onnx-community/whisper-tiny_timestamped` | `517244293732ee2d58139af5814231b7e6830a0d` |
| Accurate, explicit English | `onnx-community/whisper-small.en_timestamped` | `8085393831131554ad978a4e438295a734d3d2c0` |
| Accurate, Auto Detect / other languages | `onnx-community/whisper-small_timestamped` | `65caa70f294b46e1c33ff820aae6b16d048ab818` |
| Optional translation | `Xenova/m2m100_418M` | `9c374f0b7aca709787cea97b047bfbbd1559d177` |

Timestamp-enabled exports are required because the original ONNX export lacks cross-attention outputs for word alignment. Fast keeps tiny/tiny.en and its working short-English model. Accurate uses q8 timestamp-enabled Small/Small.en with word alignment. In this installed Transformers.js version, missing `language` defaults to English. Auto Detect therefore explicitly generates one Whisper language token from the first detected speech, constrained to the 99 supported language tokens, and reuses that language for the recording. Mixed-language recordings need manual review; per-speaker/per-cue language switching is not implemented. An untimed partial token at a non-final right context edge is left to the next overlapping section; the same missing timing at the original recording's end remains an error.

The source selector uses the pinned Whisper generation configuration's **99** language tokens. The target selector uses the pinned M2M100 tokenizer's **100** language tokens. These sets differ. A source language outside M2M100's set still transcribes with Same as spoken language; unsupported translation is rejected clearly. Whisper `jw` maps to M2M100 `jv` (Javanese). No unsupported language is approximated with a different language. Static English labels avoid server/browser ICU hydration differences.

M2M100 is a dedicated translation model, not a conversational LLM. Its quantized encoder/merged-decoder total **631,984,548 bytes**, with ~8 MB tokenizer plus runtime/config assets: approximately 650 MB on first translation use. It runs on WASM CPU for compatibility; substantial free RAM is required. There is no guarantee that phones or low-memory devices can load it. Model quality varies across languages; transcription/translation are drafts, not certified translations.

Sources: [Whisper tokenizer/languages](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py), [timestamp-enabled ONNX export](https://huggingface.co/onnx-community/whisper-tiny_timestamped), [M2M100 ONNX export](https://huggingface.co/Xenova/m2m100_418M), [upstream M2M100 language list/license](https://huggingface.co/facebook/m2m100_418M), and the installed library code under `node_modules/@huggingface/transformers/src/models/whisper/`.

## Limits and release status

- Application limits: five hours, 4 GiB input, mono/stereo, 8–48 kHz. Limits are enforced before large allocations. Codec support is checked in the actual browser. MP3/PCM WAV/M4A/AAC/FLAC/OGG containers are recognized; no video support is claimed.
- Large file hashing/demux indexing reads the source from disk but does not decode or allocate all audio. Browser/file-system/demuxer indexing limits still apply.
- WASM/GPU memory, device speed, browser suspension, storage quota and model-host availability remain real limits. No five-hour direct upload or server timeout is involved.
- Existing production `notFound()` gate and noindex/registry release hold are preserved. This task does not publish the development preview or change unrelated tools. Hostinger delivery/CSP/CORS and model conversion provenance/notices require the existing release review before public distribution.
- No standalone subtitle translator page was added. Source checkpoint separation permits future multi-target export without retranscribing.

## Verification

`tests/local-subtitle-jobs.test.mjs` covers orchestration, simulated five-hour processing, bounded section plans, original offsets, overlap/repeated words, Unicode, actual language sets, input limits, translation timing/structure, skipping translation, retry/resume, refresh checkpoints, storage failure, hashing changed middle content, worker reuse and timeouts. These adapter tests do not certify model accuracy or actual five-hour browser performance.

Supplemental real-model and browser evidence is recorded under the local ignored `artifacts/local-subtitle-upgrade/` directory. The pre-existing synthetic speech fixture is used; no personal audio or text is sent externally. Native ONNX checks are explicitly distinguished from browser/WASM checks.

Initial bounded-pipeline verification on 2026-10-10 (the later Fast/Accurate and contextual-localization upgrade has **637 passing tests** and separate browser results in [the quality report](local-subtitle-quality.md)):

- **611 tests passed**, TypeScript check, ESLint and optimized Next.js production build passed. No new dependencies, API routes, credentials or environment variables were added.
- Chrome, original explicit-English short path: real 27.7-second synthetic audio, six cues, both downloaded formats parsed and validated.
- Chrome, Auto Detect: actual multilingual Whisper inference identified English, seven cues, valid downloaded SRT/VTT.
- Chrome, local M2M100 English → Spanish and English → Japanese: seven translated cues each; downloaded Unicode files parsed successfully, with every start/end timestamp identical to the source. The speech worker was released before translation. First-use translation downloaded its real public model assets; later use reused cached files.
- Chrome, 260-second boundary fixture: speech begins at 5, 105 and 225 seconds, crossing the 120/240-second section boundaries. Three passages appear once, 21 cues, final end 251.920 seconds, no timeline overlap. Real alignment failures retained completed sections; after fixing alignment stitching, refresh/reselection resumed the unfinished section successfully.
- Chrome, actual **18,000-second / 793,800,044-byte PCM WAV**: 150 bounded sections, speech at the start and near the end, 14 cues, final end **04:59:58.940**, valid SRT/VTT and no timeline overlap. Cancelled mid-job, refreshed and reselected the original file; the persisted job resumed and completed. This is a mostly silent synthetic duration/decoding/recovery test, **not five hours of continuous speech** or a total browser peak-memory benchmark.
- Chrome, invalid bytes with a `.wav` extension: rejected with “Input has an unsupported or unrecognizable format.” Previous reviewed captions remained available.

Downloaded-file checks are reproducible with `node artifacts/local-subtitle-upgrade/validate-browser-downloads.mjs` while these ignored local artifacts are present. `verified-browser-downloads.json` records exact cue intervals. Actual non-English spoken recordings, continuous multi-hour speech, low-memory/mobile devices and all advertised codec combinations still need broader acceptance testing before public release. The model language lists are verified capabilities, not a claim that every language was accuracy-tested here.
