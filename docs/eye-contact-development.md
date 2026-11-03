# AI Eye Contact: local review handoff

Updated: 2 November 2026. Branch: dev/tools-completion. Baseline: ecbb757.

## Status and release hold

Technical checks below pass. Owner will review exported visual quality.
Do not push, deploy, promote the route, or add a public header entry before
owner review and explicit release instructions. Existing redesigned menus stay
intact. Route /tools/ai-eye-contact works in development, remains noindex and
returns 404 in a production build. It is absent from the public sitemap.
Caption/Lyrics/Podcast release flags and account/payment systems are unchanged.

## Implemented flow

Choose video -> MediaPipe face/eye landmarks -> Intel learned head-pose/gaze
estimation -> separate FLX neural eye flows -> original-resolution texture warp
-> preview, manual refinement -> MP4 or WebM export -> video review/download.
The Intel camera-facing negative-Z convention is converted before calculating
correction. Eye crops/commands account for roll. Timestamp-based smoothing
resets on seeking, settings changes and face jumps. Closed/small/cropped eyes,
unsupported poses and multiple faces retain the original frame. Export fails
if no frame received a usable correction. Counts are not quality scores.

Models and license/provenance details: public/models/eye-contact/README.md.
Only new application dependency: @mediapipe/tasks-vision 1.2.0. Existing
onnxruntime-web and mediabunny handle inference and media. No paid service.
Recordings are not uploaded; pinned runtime assets are fetched from jsDelivr.

## Final checks (2 November 2026)

- Original-size 3840 x 2160 motion fixture, 30 frames, about one second.
  Fixture is upscaled public government footage: a dimension/codec test,
  NOT a native-4K eye-detail or long-video performance benchmark.
- Automatic correction, default strength, Original output, Keep sound enabled.
- WebM: 30/30 frames adjusted; VP9 3840x2160, Opus stereo, duration 1.04s.
- MP4: 30/30 frames adjusted; H.264 3840x2160, AAC stereo, duration 1.02s.
- Both actual downloaded outputs independently decoded with FFmpeg without
  decode errors. Native exported-video player and download controls rendered.
- All 953 tests pass; scoped Eye Contact ESLint passes; optimized webpack
  production build and its TypeScript check pass.
- Updated one stale V1 assertion to inspect the extracted FreeToolsMenu;
  preserved the redesigned menu code instead of restoring its old structure.
- Mobile viewport requested 390x844: content client/scroll widths both 375,
  no horizontal overflow; stacked comparisons and FAQ interaction checked.
  Temporary viewport override reset afterward.
- Production localhost:3100: eye route 404/noindex, development sample 404,
  sitemap 200 application/xml and excludes eye route; checked neural model
  asset URLs return 200. These are release-hold checks, not a public release.
- Runtime emits MediaPipe informational/delegate and ONNX unused-initializer
  warnings; successful exports above still complete. Do not call console empty.

## Interface completion

Clear source/preview comparison, manual controls, export settings, progress,
cancel/retry, result playback/download, task-specific FAQs, cropper link,
keyboard-visible focus, theme tokens and responsive layout. Old cancellation
notice clears on valid source replacement. Explanations distinguish reduced
preview from original-resolution export. Preview label remains until approval.

## Prior evidence retained; do not repeat unrelated exports

Owner-authorized private clip produced a 508x904 MP4, 90/90 adjusted frames.
Cancellation during preparation and replacement/retry were checked earlier.
FLX ONNX outputs were compared against an independent TensorFlow.js reference
for both eyes at three angles: max flow difference 0.00004186, max lighting
0.00009081. This is numerical conversion evidence, not visual-quality proof.
Original-resolution warp and smoothing have dedicated numerical tests.
Previous Compressor/Cropper/Green Screen exports do not need retesting.

## Pending owner decision

Owner reviews naturalness, blink/motion artifacts and desired strength on their
footage. No claim of competitor parity, all-person reliability or perfect gaze.
Large changes, glare, blur and head turns remain limitations. HDR/specialist
color metadata and embedded subtitles are not preserved. Public registry,
SEO metadata/sitemap and new-menu entry promotion follow approval, with fresh
checks appropriate to those release changes. No pushes/deployment performed.

QA logs, exports, private crops and screenshots live only in ignored
artifacts/eye-contact; private recordings/credentials/runtime databases must
never enter Git or public assets.
