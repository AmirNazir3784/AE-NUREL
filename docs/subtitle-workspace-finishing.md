# Subtitle workspace finishing — 12 October 2026

Scope: segmentation, customer review UI and development discoverability. Whisper/M2M100, source sentence accounting, bounded decoding, checkpoint schemas and production release hold are retained. No model research, new dependencies, external inference or production deployment.

## Confirmed causes and changes

- Awkward exported splits were real cue boundaries and explicit newlines, not solely RTL rendering. Textarea soft wrapping can add further visual lines on narrow screens without changing the exported file.
- The previous layout chose a cue count from width/duration, then balanced fixed-count breaks. That could force a readable sentence apart and reward a balanced layout over grammatical continuity.
- The planner now scores cue count, cue boundaries and one/two-line arrangements together inside each source sentence. Readable sentences up to eight seconds and the two-line width budget remain one cue. Longer text uses bounded dynamic programming; punctuation, clause boundaries, grammatical attachments, tiny fragments and uneven lines affect the score.
- Unicode word/grapheme segmentation and small grammatical classes cover the tested scripts. These are layout heuristics, not translation replacements or a complete syntactic parser. Technical hyphens, names, dates and mixed scripts retain their text. Oversized inputs use a bounded fallback that preserves content and requests review.
- Same-language source captions use the planner only at measured word boundaries (or existing reliable cue boundaries). Source ASR/checkpoints remain unchanged. Unreliable interior timing falls back to rewrapping existing cues; no proportional source speech alignment is invented.
- Translated layout stays inside its own sentence envelope. Existing cue timings are retained when the resulting layout fits; redistribution otherwise remains confined to that sentence. Character preservation and coverage/export guards remain enforced.

## Concrete before/after

The opening sentence was already restored by the preceding integrity repair. It remains at **00:00:00,500–00:00:03,000**, as `آج کی ویڈیو میں، / ہم ایک تجربہ کرنے جا رہے ہیں.` The A-roll question starts at **00:00:03,180**, never in the opening interval.

The saved real native M2M100 output was replayed without changing its words:

| Before (previous actual export) | After (current replay) |
| --- | --- |
| Question cue ends at 00:00:05,603 with `A-roll اس نقطہ تک ماسٹر`; next cue begins `کریں جہاں…` | Break moves to 00:00:05,756 after `A-roll اس نقطہ تک ماسٹر کریں`; next cue begins `جہاں…`. |
| Final sentence cue ends at 00:00:15,320 with `…جو عظیم مواد کے تخلیق`; next cue starts `کاروں…` | Three cues remain inside 00:00:10,980–00:00:19,100; `مواد کے تخلیق کاروں کو ان کے` stays on one line in 00:00:14,193–00:00:17,043. |
| English source question could split off `becomes optional?` | One cue retains the complete question with two explicit lines, within its original measured speech interval. |

The actual browser Urdu output differs slightly from native CPU output. Its final sentence uses **00:00:10,980–00:00:14,166**, **00:00:14,166–00:00:17,057**, **00:00:17,057–00:00:19,100**; `تخلیق کاروں` and `اس نقطہ تک` remain attached. Eight cues cover all five source sentence envelopes. No standalone `گا؟` line appears.

Meaning was not rewritten: `آخر میں آپ کو ایک قاضی بننے کے لئے جا رہے ہیں، نہیں؟` still misinterprets the viewer deciding as a courtroom occupation. Editing terminology and the final sentence's “mesmerizing” translation also remain unacceptable. These are model limitations, not segmentation passes.

## Customer workspace

- Routine translation/density notices no longer use large yellow/orange panels. “Review captions”, an inline draft note, per-caption hints and a collapsed suggestions list replace them. Reading hints update after edits.
- “Compare with source” reveals optional source references. Numbers/identifier checks are small contextual suggestions, not declarations that a translation is wrong. Worker/model telemetry is not exposed.
- Recoverable processing notes are deduplicated in a collapsed disclosure. Advanced recovery, processing choices, cache controls and licenses are optional.
- Missing translated text and invalid coverage/timing still display actionable alerts and disable SRT/VTT. Entering missing text or Undo reevaluates the live guard; advisory hints do not block exports. Undo/Redo, cancellation, retry and downloads remain available.
- Existing AENural tokens, surfaces, focus states and responsive layout are reused. Homepage, navigation, footer and Source Window are unchanged.

## Directory naming and release isolation

Development All Tools has 18 tools, including a Caption Generation section using ordinary tool cards:

- **Audio to SRT / VTT** — “Generate subtitles from long or short audio, with optional translation in supported languages.” Existing `/tools/free-subtitle-generator` route.
- **Speech to Captions** — “Turn short English recordings into editable SRT or VTT captions.” Existing `/tools/podcast-to-captions` route; its English MP3/WAV short-file behavior is unchanged.

Page headings and labels match. The production public registry remains 16 tools. Global public search and sitemap do not consume the development catalog; both preview pages retain production 404 and noindex guards. Later release requires deliberate ordinary registry inclusion and removal of the existing acceptance gate, not a special navigation mechanism.

## Verification

- **691 tests / 82 suites pass**, zero failures/skips; ESLint, TypeScript and optimized production build pass. Regressions cover six scripts, source timing/coverage, short/dense speech, mixed identifiers, real TSX review rendering, live missing-text/export guards, edit/undo, and development/public directory isolation. Existing long-job, retry/cancel/recovery and release tests remain passing.
- Replayed 13 previously recorded real M2M100 results (12 semantic cases plus the experiment), using their original source fixtures and unchanged raw model output. Read back and validated **26 written SRT/VTT files**, exact text, chronological timing and sentence envelopes. This is layout regression QA, not new inference or semantic acceptance.
- Chrome used the already-selected original talking-head recording, explicit English, Accurate and Urdu. Source/translation caches were reused. Actual newly downloaded Urdu SRT and VTT were read and compared: eight matching cues, five intact sentence envelopes, opening retained, attached compound, valid files. Downloads are copied to ignored local artifacts; no private audio is added to the repository.
- Same-language English, text editing, Undo, blank-caption export blocking and recovery with Undo were checked in the real page. Source comparison was checked. Desktop and 390×844 responsive views were inspected; no horizontal overflow was observed at the narrow viewport. Original browser theme and viewport override were restored.
- Development directory search finds both correctly named cards and their working routes. Fresh local production HTTP checks: `/tools` 200 with neither preview, both preview routes 404, `/sitemap.xml` 200 with neither preview.
- No new multi-hour continuous speech/browser refresh/cancel run, native-speaker review, phone memory certification or browser-wide network capture is claimed. Existing deterministic tests cover retained job mechanisms. No inference/request code was changed.

Local evidence: ignored `artifacts/subtitle-workspace-finishing/` contains before/after replay files, actual browser exports, export-verification JSON and production HTTP results; `artifacts/workspace-*.log` contains checks. The historical `artifacts/local-subtitle-quality/repair-*.srt` files are the authoritative previous real exports. Replay with `node scripts/local-subtitle-quality/segmentation-qa.mjs after browser` when those local artifacts are available. Verify a running local production build with `node scripts/local-subtitle-quality/verify-workspace-release.mjs` (default port 3107).

## Remaining limitations and verdict

Break scoring cannot guarantee grammatical parsing in every supported language. Dense speech may require manual editing; two explicit lines do not guarantee two visual lines in every player/font/viewport. Within-sentence translated timing is approximate, not target-language forced alignment.

Transcription architecture is retained; sentence accounting/export guards are retained and tested; segmentation is materially improved with heuristic limitations. Natural multilingual translation remains **not accepted**. The existing production hold stays in place. No commit, push, reset, clean or deployment was performed.
