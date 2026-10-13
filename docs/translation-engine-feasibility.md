# Translation-engine feasibility experiment

Date: 2026-10-12. Research only; no AENural production files, model routing, UI or release gates changed.

## Decision: REJECT the current integration proposal

The specified alternative could not initialize using its documented native approach on this Windows workstation. Stop this experiment rather than substitute preprocessing, rebuild its dependencies or integrate an unmeasured translator. This is a feasibility rejection of the current path, **not evidence that IndicTrans2 translates worse than M2M100 or cannot run in any browser**. Comparative quality remains unknown.

The user's Phase 2 stop condition applies before the requested 20+ translations per language pair. No alternative translations were generated. Consequently there is no measured quality advantage, no comparative regression result and no justified browser smoke test. Do not integrate or lift the existing production release hold.

## Baseline and exact configurations

Read the existing quality/acceptance documents, `scripts/local-subtitle-quality/cases.json`, benchmark scripts and saved actual outputs. Preserve current sentence coverage, timing, recovery and Whisper improvements; this experiment does not repeat localization rewrites.

| Item | Configuration |
| --- | --- |
| Existing baseline | `Xenova/m2m100_418M`, revision `9c374f0b7aca709787cea97b047bfbbd1559d177` |
| Reused baseline inference | Current shared helper, native CPU q8, deterministic greedy, explicit source/target language tokens, `max_new_tokens: 512`, no forced EOS |
| Candidate | `hari31416/indictrans2-en-indic-dist-200M-ONNX-int8`, revision `1eaa43a3fb76f382f1b22c76e56f6ab4926ad68b` |
| Candidate approach | Repository's unchanged `translate.py`; `CPUExecutionProvider`; documented greedy/KV-cache decoding, planned `max_new_tokens: 128` |
| Candidate languages | `eng_Latn` → `urd_Arab` / `hin_Deva`; actual downloaded language dictionary IDs 68 / 15 |
| Native environment | Portable Python 3.12.10; ONNX Runtime 1.23.2; tokenizers 0.22.1; NumPy 2.2.6; Windows 11 build 26200 |

Baseline evidence: `artifacts/local-subtitle-quality/integrity-repair.json` and `m2m-reproduced.json`. Six exact-input Urdu outputs were reusable; no exact-input Hindi outputs were available. No expensive M2M100 rerun was warranted after the candidate failed initialization.

Known baseline issues include the courtroom sense of “judge”, unnatural Urdu grammar, literal idioms, pronoun/perspective and gender changes, omitted meaning and technical terminology errors. Negation requires review too: distinguish historical/prototype failures from current outputs. The current German “need not” example retained lack of obligation; do not attribute a different model's negation reversal to this pinned M2M100 baseline. Structural coverage checks do not certify semantic correctness.

## Provenance, support and preprocessing

The [candidate card](https://huggingface.co/hari31416/indictrans2-en-indic-dist-200M-ONNX-int8) identifies a third-party int8 ONNX conversion of AI4Bharat's English-to-Indic distilled 200M model. The [upstream license](https://github.com/AI4Bharat/IndicTrans2/blob/main/LICENSE) is MIT, as is the candidate's license metadata. Conversion provenance rests on those published descriptions/configuration; numerical parity with upstream weights was not independently verified. Upstream gated access was not accepted or bypassed.

English-to-Urdu and English-to-Hindi language tags are present in the pinned assets. This model is English-to-Indic, not a general replacement for M2M100's arbitrary supported source/target routing.

The helper requires `IndicTransToolkit.IndicProcessor`, separate source/target tokenizers, language prefixes, entity/Unicode handling, transliteration/normalization and output postprocessing. Bypassing this processing would invalidate a fair comparison. Three ONNX sessions and external weight sidecars are used. Source/target positional limits are 256; long examples would need token-count and termination checks. The helper's default 128-token generation budget and M2M100's 512-token budget are documented, **not asserted to be equivalent**; no candidate inference occurred to test truncation or fair paired settings.

## Native experiment and stopping evidence

No Python interpreter was initially installed. A portable official Python runtime and small native dependencies were installed only under ignored research artifacts. No system PATH, WSL installation, Torch installation or application dependency was changed.

The documented toolkit prerequisite could not be installed through the prebuilt Windows path:

```text
python -m pip install --only-binary=:all: --no-deps indictranstoolkit==1.1.1
ERROR: Could not find a version that satisfies the requirement indictranstoolkit==1.1.1 (from versions: none)
ERROR: No matching distribution found for indictranstoolkit==1.1.1
```

The [toolkit's published installation guidance](https://pypi.org/project/indictranstoolkit/) supports Linux/macOS and explicitly says Windows has not been built/tested. No Windows wheel was available for this environment. A source build might be possible, but was not attempted: that would exceed the requested bounded documented-path experiment.

Calling the unchanged repository helper then confirmed failure before any ONNX session or model loading:

```text
translate.py, line 92, in __init__
    from IndicTransToolkit import IndicProcessor
ModuleNotFoundError: No module named 'IndicTransToolkit'
```

Helper SHA-256: `b57fcc732d77b8c0d66b0b87b4b85e8513996e81d418ca9a68bb7f3c3d55035b`.

The research driver forbids socket connections during the native attempt. Downloads were public static model/package/runtime requests; no test text, private transcript or audio was sent to an AI service. The pending large model-sidecar download was cancelled when the prerequisite failure was established. The complete candidate bundle was never downloaded. Logs preserve the exact failure; no substitute outputs were generated.

## Raw comparison artifacts

`scripts/translation-engine-feasibility/cases.json` contains 24 English inputs, each planned for Urdu and Hindi: 48 rows covering conversation, formal/informal speech, ambiguity, idioms, negation, roles/gender, brands, technical instructions, numbers/dates, incomplete thoughts and long sentences. Fresh cases accompany the known regressions.

Saved locally, outside Git:

- `artifacts/translation-engine-feasibility/side-by-side.csv` — UTF-8 BOM CSV with all requested review columns.
- `artifacts/translation-engine-feasibility/side-by-side.json` — exact outputs, nulls for unavailable results, explicit run status and provenance.
- `artifacts/translation-engine-feasibility/evidence.json` — pins, byte counts, measurements and native error.
- `artifacts/translation-engine-feasibility/native-smoke.json`, `native-smoke.log`, `toolkit-install.log` — failure evidence.

**Execution counts:** 24 source examples prepared; 48 planned pairs; 6 reused M2M100 Urdu outputs; 0 candidate outputs; 0 completed comparative pairs. Empty candidate columns mean initialization failed, not an empty translation. Review fields remain unevaluated; no overlap scores, fabricated targets or automatic native-quality certification.

Examples below are unedited saved M2M100 outputs. The candidate column deliberately records the absence of inference.

| Source | M2M100 Urdu output | IndicTrans2 |
| --- | --- | --- |
| In today's video, we're going to be doing an experiment. | آج کی ویڈیو میں، ہم ایک تجربہ کرنے جا رہے ہیں. | Not generated: initialization failed |
| We'll see. | ہم دیکھیں گے | Not generated: initialization failed |
| We'll see, and in the end, you're going to be the judge, right? | ہم دیکھیں گے، اور آخر میں، آپ کو قاضی بننے کے لئے جا رہے ہیں، نہیں؟ | Not generated: initialization failed |
| Is it possible to master editing A-roll to the point where B-roll becomes optional? | کیا یہ ممکن ہے کہ ایڈجسٹنگ A-roll اس نقطہ تک ماسٹر کریں جہاں B-roll اختیاری ہو جاتا ہے؟ | Not generated: initialization failed |

These retain the known judge/technical issues for human review. They establish no improvement or regression by the candidate. Urdu and Hindi native review remains required if real paired outputs are obtained later.

## Download, memory and performance evidence

All MB/GB values below are decimal. Candidate totals come from **pinned Hub file metadata**, not completed download or observed inference memory. The card's older 452.9 MB figure does not describe the current pinned shared-sidecar layout.

| Measurement | Result | Qualification |
| --- | --- | --- |
| Candidate ONNX graphs + weight sidecars | 281,559,812 bytes / 281.56 MB | Three graphs plus two data sidecars |
| Candidate minimal inference assets | 309,337,666 bytes / 309.34 MB | Above plus tokenizer JSONs, tokenizer metadata, config/generation config; excludes runtime, toolkit and Python helper |
| Candidate repository files actually downloaded | 6,753,808 bytes / 6.75 MB | Small assets and one small graph; incomplete bundle |
| Candidate native attempt | 1,103.92 ms; peak working set 54,087,680 bytes / 54.09 MB | Failed initialization only; **not inference speed or model RAM** |
| M2M100 q8 weights | 631,984,548 bytes / 631.98 MB | Existing baseline; approximately 650 MB first-use assets plus runtime |
| Reused M2M100 six-input timings | 1.264–8.234 seconds; median 3.537 seconds | Historical individual translations; not a fresh paired benchmark |
| Historical M2M100 load / post-run RSS | 9.953 seconds / 1,753,567,232 bytes / 1.754 GB | Post-run RSS is not peak memory |

Workstation: AMD Ryzen 5 4500U, six CPU threads, 16.54 GB physical RAM. Candidate steady-state memory, inference speed and first-use loading time are **unmeasured**. Its smaller asset size alone proves neither better quality nor browser stability.

## Browser feasibility and verification

No browser experiment was run because the prerequisite quality advantage could not be established. The current Transformers.js 4.3.1 installation has no built-in IndicTrans2 model mapping; Python `auto_map` is not JavaScript integration. The [export project's custom browser design](https://github.com/Hari31416/indictrans2-onnx-export) describes a separate driver/preprocessing implementation. Its WASM behavior for this pinned bundle, resource consumption and generated translations remain unverified here. The Windows toolkit failure does not prove a JavaScript implementation is impossible.

Research scripts passed JavaScript syntax checks and ESLint. Evidence assertions validate case/output counts, exact baseline reuse, pins, asset totals and the recorded failure. SHA-256 comparison of all 268 pre-existing files captured before acquisition found no changes. No production code, package manifest, tool test, download workflow or release hold was altered. Production tests/build were not rerun for this isolated research addition; previous results are not presented as fresh validation.

## Reproduce and next action

Research scripts are under `scripts/translation-engine-feasibility/`. Local metadata, helper, portable interpreter, dependency freeze and installation logs remain under the ignored artifacts directory. With those local assets retained, reproduce the failure and consolidate evidence without networking:

```powershell
& ./artifacts/translation-engine-feasibility/python/python.exe scripts/translation-engine-feasibility/native-smoke.py
node scripts/translation-engine-feasibility/evidence.mjs
node scripts/translation-engine-feasibility/verify.mjs
node scripts/translation-engine-feasibility/prepare.mjs unchanged
```

`prepare.mjs inspect` acquires public metadata/small assets; `python` acquires the official portable interpreter/bootstrap; `weights` is a capped optional acquisition command that was interrupted here. Do not rerun acquisition to imply this failed experiment completed. The missing toolkit requirement is separate from the saved installed-dependency freeze.

No production integration is recommended. If a future experiment is authorized, first use a supported Linux/macOS environment with the documented processor, then run the prepared paired set with checked token budgets/termination and obtain independent Urdu/Hindi reviews. Only a demonstrated semantic advantage would justify an isolated browser WASM test. No other model search or large-model experiment is needed to reach this session's decision.
