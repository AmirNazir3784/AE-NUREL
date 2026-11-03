# Caption Studio: feature improvements, 2 November 2026

Owner direction: prioritize missing product features, preserve already-accepted
transcription/timing/styling/export work, and test only changed functionality.
No push/deployment; current local review hold remains.

## Competitor use before implementation

Used https://caption-x.com/studio with the previously authorized public Source
Window demo. A real competitor job produced 19 transcript lines. Inspected
editable lines, per-line playback/deletion, Timeline, Transcript options,
templates and word-fill styling controls. Transcript options showed disabled
Reset timings. Caption translation was presented as Pro/Pro+ access. These are
observations of that session, not a claim about all competitor capabilities.
No private recording, competitor assets or competitor code was copied.

## Features implemented

1. Visual caption timeline: zoom 1x/2x/4x/8x, seek ruler/playhead, overlapping
   captions on separate rows, pointer dragging and start/end resizing, keyboard
   100 ms steps or Shift+arrow 10 ms, Escape/pointer cancel, one Undo per drag.
   Time changes stay within video bounds; no synthetic word alignment.
2. Bulk literal find-and-replace: case-sensitive match preview, 2,000-character
   per-cue guard, timing/IDs preserved, undoable batch, explicit alignment caveat.
3. Caption review: existing subtitle analysis exposed in Studio, with fast-reading,
   overlap, long-line and excessive-line suggestions. Click an item to select
   and seek to its caption. Guidance does not rewrite or block valid exports.
4. Regroup timed words: 1–12-word maximum, sentence/pause breaks and bounded
   caption lengths, reuse exact existing measured word intervals, retain
   punctuation and selected style. Regrouped IDs/alignments are retained alongside
   original alignment snapshots so one Undo restores measured highlighting.
   Cue-only imports, edited/incomplete alignment, unsafe overlapping words and
   over-500-cue results are rejected rather than guessed or silently discarded.

Batch editing/review/regrouping were not found in the inspected competitor
controls. Do not assert they are absent from every CaptionX workflow or claim
superior transcription/visual quality. Competitor duration/size allowances still
exceed ours; no paid service, translation engine or processing-limit expansion
was added to disguise that gap.

## Focused validation

- Six new tests pass: grouping preserves exact word text/times; incomplete/edited
  and overlapping data reject safely; review does not mutate captions; timeline
  clamping; replacement preserves timings; component regroup + Undo restores
  both caption document and current alignment.
- Scoped ESLint and optimized build/TypeScript pass.
- Actual localhost: replace 4K with UHD, inspect unchanged 100–900ms timing,
  Undo restores wording; keyboard move changes to 200–1000ms; pointer edge drag
  changes end to 774ms, Undo restores; long test text produces 92.5 chars/sec
  and long-line review items; review jump works. Imported SRT correctly disables
  regrouping with an explanation.
- Regroup application/Undo tested through its component with deterministic word
  fixtures. No new real ASR run was performed just to generate timing fixtures.
- New layout checked at requested 390px width: client/scroll widths both 375px,
  no horizontal page overflow. Viewport override reset.
- Existing speech recognition and previously certified video exports were not
  rerun. No account/payment changes or new dependencies for these features.
- Screenshot and logs: ignored artifacts/tool-completion/caption-productivity.png
  and productivity-{tests,lint,types,build}.log.

## Minimal editing layout — 3 November 2026

Owner's side-by-side screenshots highlighted excessive panel chrome and dense
controls. The refinement keeps the three-panel desktop workspace and AENural
colors, while making transcript rows quieter, enlarging individual template
previews, and separating Templates / Customize views. All 30 styles remain
available. Secondary transcript utilities, the visual timeline, and subtitle /
project actions start collapsed. Video export sits directly below playback.
The loaded editor has a compact title and hides the redundant upload banner;
the introductory page, shared header and editorial content stay intact.

Actual localhost checks: Templates / Customize visibility switches correctly;
Transcript tools reveals Find & replace; timeline opens with its instructions
and cue controls; mobile client and scroll widths both measure 375px under a
390px viewport override, which was then reset. No ASR or video export was rerun
for this presentation change. Scoped ESLint and TypeScript pass. Optimized
production build passes. The known development hydration warning originates
from an injected Chrome extension script in the document head.

Preview: ignored `artifacts/tool-completion/caption-clean-layout.png`.
Nothing pushed or deployed; the local review hold remains active.
