# AENural recovery audit

Updated: 9 October 2026, after focused AI preview UX cleanup and SRT to MP4 duration investigation. New generation tools remain unpublished.
Workspace: D:\Work\Tools\online-tools-platform. Git baseline: a8be461. Working changes are uncommitted; no commit or push was performed.

## 1. Executive summary

**Estimated overall completion remains 88%. Sixteen free tools are publicly discoverable: six Timing & Editing and exactly ten Format Conversion tools. Two additional Caption Generation development previews are PARTIAL and unpublished. The ten Format Conversion implementations remain present; the requested MP4 duration extension is PARTIAL and current muxer playback acceptance is pending. Public-release acceptance remains incomplete.**

Latest focused batch: both AI previews were inspected directly in source and simplified using their shared workspace. Raw model/result JSON, revisions and result telemetry were present there as well as in the separate development lab; they are now removed from the preview workspace, while the lab remains unchanged. Privacy/download information is concise, asset bytes/stages remain truthful, and CPU choice/cache maintenance/licensing are secondary advanced information. Review/edit/undo/download logic and Whisper/Silero/cache behavior are preserved. The owner reports current Chrome SRT/VTT success and a visible WebGPU indication; no independent download-content check, exact-route proof, backend trace or browser timing was supplied. No browser automation was retried.

MP4 root cause: a conservative application timeline constant, **120000 ms**, independent of the 500-cue limit. Single-cue and 500-cue inputs within 2:00 pass validation; longer inputs fail specifically for duration. The public limit remains **2:00 before and after** because fresh five/ten-minute browser rendering/playback/resource evidence is unavailable. Fit-error canvas cleanup and cancellable preflight were fixed; metadata reservation reduces duplicate encoded-chunk retention. Fourteen native H.264 packet-replay files at 480p/720p, including two/five/ten minutes and 500 cues, passed independent container/timing/caption-or-blank byte verification. This is **not fresh browser encoding, playback, seeking or memory proof**. The highest independently played historical output remains 5.5 seconds; the existing two-minute configured policy was not relabeled a proven full-duration benchmark. See [MP4 follow-up and exact manual QA](aenural-format-conversion-qa.md).

Latest checks: **39 focused tests / seven suites; 575 full tests / 67 suites passed**, no failures/skips/cancellations. Lint, explicit non-incremental typecheck and production build passed (31/31 static entries). No new dependency, tool, deployment, commit or push. Logs: `artifacts/ux-mp4-{full-tests,lint,typecheck,build}.log`. Both held AI previews remain absent from public discovery; all 16 public entries and Source Window remain intact.

### Earlier Silero follow-up evidence (historical checks)

Current batch: one local Whisper worker is reused by Podcast to Captions and one canonical Free Subtitle Generator. It now gates Whisper with pinned Silero VAD 6.2.3 using the same ONNX Web runtime. Both previews remain development-only, noindex, absent from registry/directories/sitemap, and production-notFound. Scope is English MP3/WAV candidates, 60 seconds / 25 MiB; video is rejected. One fresh supported browser connection timed out; no browser retry followed. Current browser MP3, WASM/WebGPU and full workspace acceptance remain PENDING MANUAL VERIFICATION. No paid API, server inference, media-upload endpoint, account or database was added. The sixteen existing tools and Source Window were protected.

Fresh checks: **563 tests passed in 65 suites**, including 50 focused local-ASR/VAD/session/progress/export/release checks. Lint passed; one unused test import warning was corrected and that file re-linted cleanly. Explicit typecheck and production build passed (31/31 static generation). Production dependencies have zero reported vulnerabilities. Isolated Windows default-policy npm ci and locked-version checks passed; npm withheld three dependency install scripts, which remain unvalidated. Static initial-script inspection of home, /tools and all sixteen tools found no eager AI library/worker scripts; this is not browser network proof.

The ungated instrumental-tone hallucination “The.” was reproduced. **The new VAD gate rejects owned silence, tones and noise with zero Whisper calls/cues**, while retaining normal, −34 dB quiet, separated and background-noisy speech. Full source context/timings are preserved; an initial VAD-region cropping regression was corrected. Native clean/quiet/separated/padded/repeated outputs retain final words and have 1.47% synthetic WER. Noisy speech remains readable but its strict exact-word check failed: “Lighthouse” became “Light House” (4.41% WER); no output correction was hardcoded. Files were independently reopened, but are not browser downloads. Broader music/transient/human no-speech classification is still unproven. Five human recordings/annotations are **PENDING USER INPUT**; browser/GPU/download/mobile/dark/accessibility, converted-weight licensing and target-host gates remain open. See [current follow-up evidence and exact manual steps](aenural-local-ai-batch-1-qa.md).

AENural is the real public brand, and AENural Source Window remains the flagship. The approved HTML's Sora/Inter typography, orange/teal palette, surfaces, header/footer, cards and theme direction are implemented. Fake testimonials, ratings, pricing, community and roadmap claims remain excluded correctly. Source Window was not redesigned in this batch.

Previous Format Conversion batch: the six existing conversion tools were protected. The remaining tools were completed and checked in order: VTT to TXT, SBV to SRT, SRT to SBV, then SRT to MP4. All sixteen released tools are discoverable through /tools and /tools/subtitle-tools. Each converter page has a distinct title, description, H1, breadcrumb and related links. Existing canonical and sitemap infrastructure consumes the registry automatically. That conversion batch did not implement Caption Generation; the current batch adds only the two held previews described above.

Previous-batch editor evidence, unchanged here: the editor previously guarded clicks and unload but allowed App Router history traversal to unmount its dirty in-memory session. A pre-hydration history guard rolls back an unapproved traversal before Next sees it, invokes the existing editor confirmation and replays only an approved traversal. It preserves Next-owned history state and uses the existing dirty model. No sentinel entries, second dirty state or persistence system was added.

Previous Format Conversion verification: **513 tests passed in 56 suites**; 149 converter-related tests, lint, explicit typecheck and production build passed. Chrome exercised all four converters with real fixtures. Four saved text files matched expected UTF-8 bytes. Two real H.264 MP4 downloads (480p black, 720p white) were reopened, decoded and played to their 5.500-second ends. Samples track SRT boundaries within 0.01 ms; decoded captions appear only during cues and fit inside the frame. Those four workspaces passed 1440/768/320-width checks without page overflow. This historical evidence does not cover the current generation previews.

**Unresolved native-unload evidence:** automated tab.reload cleared a dirty editor without exposing a native warning dialog. The dirty-gated beforeunload implementation remains present, but user-triggered refresh/tab/window-close cancellation must be checked manually. Do not call these browser checks complete.

Remaining release dependencies include the real SITE_URL, factual Source Window media/capabilities/install/support information, actual Help/Privacy contacts/hosting facts, complete current browser acceptance for the original seven tools, independent player compatibility, install-script/native-runtime checks and actual target-host reproduction. The current isolated Windows package installation does not close Hostinger release acceptance.

## 2. Estimate and classification

88% is an engineering estimate, approximately ±10 percentage points, not a launch-readiness score. Scope expanded from twelve to sixteen tools. The earlier conversion implementations moved the estimate from 85% to 88%; unresolved release acceptance prevents a higher claim. Complete category coverage does not prove the requested longer MP4 duration or close acceptance gaps for protected tools.

COMPLETE means the scoped implementation and stated checks are supported; it does not certify every browser. PARTIAL identifies an implementation or acceptance gap. NEEDS REVIEW requires runtime/product evidence. NOT STARTED means no substantive implementation.

Counts use **43 primary units: 25 global areas below, 16 released-tool statuses and 2 held generation-preview statuses**. P0/P1 rows and A–H dimensions do not add units. The 88% engineering estimate is not increased for unpublished previews with outstanding acceptance failures.

| Status | Count |
| --- | ---: |
| COMPLETE | 18 |
| PARTIAL | 23 |
| NOT STARTED | 0 |
| NEEDS REVIEW | 2 |
| Total | 43 |

Eight of the nine converters added across the earlier conversion batches remain COMPLETE for their documented V1 scopes and representative Chrome acceptance. SRT to MP4 is now PARTIAL for the requested duration extension/current muxer playback acceptance. The original seven tools remain PARTIAL because broader release acceptance gaps were not silently closed by this batch.

## 3. Global website status

Comparison: references/AENural-design-reference.html, with artifacts/v1-design-integration-plan.md as historical context. Current implementation and executed checks are authoritative.

| Area | Status | Implemented and remaining work |
| --- | --- | --- |
| Homepage | PARTIAL | Approved flagship/free-tool structure, orange hero, curated tools, FAQs and truthful CTAs. FAQ format guidance is current. Product illustrations still need real approved Source Window media/facts. |
| Header/navigation | PARTIAL | AENural mark, announcement, real routes, search, theme toggle and mobile menu. Registry-backed mobile/search discovery includes new tools. Active-route cues and full keyboard/touch acceptance remain. |
| Mega menu | PARTIAL | Compact flagship/category structure retained; no full tool-list desktop header expansion. Short-height desktop placement/scroll and keyboard transitions need acceptance. |
| Footer | COMPLETE | Branded responsive columns with real product/tool/support/company destinations. No fictional community links. |
| Typography | COMPLETE | Bundled Sora headings and Inter body. Computed Sora confirmed on all new pages. Builds do not fetch external fonts. README font description remains stale. |
| Colors | COMPLETE | Shared orange/teal accents, semantic light/dark surfaces, borders and statuses. Existing contrast-token checks pass; this is not every rendered-state contrast certification. |
| Spacing system | PARTIAL | Shared constrained layouts and spacing; new minimal stations and wider output workspaces fit the system. Existing CSS layers and cramped editor pagination remain targeted review items. |
| Buttons | COMPLETE | Existing primary/secondary/destructive hierarchy, focus/disabled states; new upload actions at least 45px high in checked widths. |
| Cards | COMPLETE | Shared branded directory cards/icons, grouped responsive grids and related tools. All converter registry entries use the same system. |
| Dark mode | PARTIAL | Pre-hydration/system/stored theme behavior retained. Representative new populated states and existing editor inspected. Full original-tool loaded-state matrix remains. |
| Responsive/mobile | NEEDS REVIEW | All four current new pages and the prior five converters checked at 1440/768/320; populated narrow states have no page overflow. Full sixteen-tool touch, keyboard, long-filename and real-device matrix remains. |
| Source Window page | PARTIAL | Honest branded flagship shell and real route. Needs actual product demonstration, verified capabilities/compatibility and acquisition/install/support facts. Unchanged this batch. |
| /tools directory | PARTIAL | Sixteen tools, accurate count, six Timing & Editing and ten Format Conversion tools. Live JSON filtering works. Task aliases and remaining menu/active-state acceptance remain. |
| /tools/subtitle-tools | COMPLETE | Sixteen task links and grouped cards, format-specific guidance, breadcrumb and relevant distinctions. Direct production route and all sixteen destinations covered by route checks. |
| About | COMPLETE | Truthful brand/flagship/free-tools explanation without a stale hardcoded count. More background facts only when supplied. |
| Help | PARTIAL | Existing file/download/tool guidance. Real contact and final browser-specific troubleshooting remain. |
| Privacy | PARTIAL | Local file processing, in-memory operation and theme storage explained; count updated. Actual operator/contact/host logging/retention facts remain. |
| 404 | COMPLETE | Existing real not-found route, noindex and recovery links; prior production HTTP 404 check passed. Not modified. |
| Error state | NEEDS REVIEW | Existing client boundary and retry/reset route recovery. No induced-error/refetch or root-layout failure test completed this batch. |
| Favicon/branding | COMPLETE | Existing AENural SVG/ICO/Apple assets and branding; no public ToolSuite rename. |
| Metadata | COMPLETE | Unique new titles/descriptions, one H1, inherited text OG/Twitter and AENural title template. Four new routes statically generated and production discovery/MP4 checked; previous five-route HTTP evidence retained. |
| Canonical handling | PARTIAL | Existing validated origin helper used on each new page. SITE_URL absent, so checked production HTML emits no canonical. Real origin required. |
| Robots | PARTIAL | Existing crawl route; sitemap pointer conditional on origin. Public/preview indexing policy requires host confirmation. |
| Sitemap | PARTIAL | Existing registry-derived generator now covers 23 content URLs when origin is supplied. Actual build remains empty without SITE_URL. |
| Social/OG | PARTIAL | Existing branded social image/text metadata. Absolute URL/image emission and live share previews need real origin/rebuild. |

No fabricated social proof or commercial claims should be restored to resemble the reference. No auth, database, payments, accounts, subscriptions or licensing were added.

## 4. Sixteen released free tools and two held previews

All inherit AENural header/footer, Sora/Inter, orange/teal tokens, breadcrumbs, local-processing messaging and related links. Purpose-specific workspaces remain intact. Legacy internal .v1 selectors/storage names do not constitute a public ToolSuite design.

### 4.1 SRT Timing Adjuster — /tools/srt-timing-adjuster

Overall: **PARTIAL**, unchanged in this batch.

- **A Functionality:** Upload, Earlier/Later offset, compact timestamp inspection, clamp warning and download implemented; earlier real-file library shift/clamp checks passed.
- **B Visual:** Branded compact station; fresh populated visual sign-off still pending.
- **C UX:** Correct compact timestamp-only inspection, without redundant caption preview.
- **D Mobile:** Breakpoints exist; current loaded-file touch/keyboard completion remains unverified.
- **E Dark:** Semantic tokens present; full loaded/clamped/error review pending.
- **F Validation:** Extension/size/encoding/SRT, offset/range and stale-read guards exist. Failed replacement retains valid work with a note.
- **G Export:** Timestamp-only serialization preserves text/numbering/source detail; current browser-saved export not freshly reopened.
- **H Remaining:** Complete browser matrix and assess warned zero-duration clamp consequences in target players.

### 4.2 SRT Merger — /tools/srt-merger

Overall: **PARTIAL**, unchanged in this batch.

- **A Functionality:** 2–10 files, reorder/remove/replace, optional gap, join inspection and export; earlier real-file library merge/gap/count checks passed.
- **B Visual:** Dedicated AENural file-list/join workflow; not forced into a generic converter.
- **C UX:** Existing wording correctly describes known subtitle ends, retained lead-in and optional gap. It does not infer video duration or guarantee timing against video.
- **D Mobile:** Full loaded row interactions/reordering and long filenames still need acceptance.
- **E Dark:** Shared tokens; populated row/join/error review pending.
- **F Validation:** Existing file-count/size/encoding/timing and stale-read checks; inspect real browser replacement/failure states.
- **G Export:** Numbered merged SRT and useful join calculation; fresh saved-file browser reopening remains pending.
- **H Remaining:** Real browser reorder/replace/remove/gap/download completion and mobile/dark QA. Misleading correctness wording is already fixed.

### 4.3 SRT Splitter — /tools/srt-splitter

Overall: **PARTIAL**, unchanged in this batch.

- **A Functionality:** Parts/cues-per-file/time-interval methods, output manifest, individual files and ZIP exist; earlier library ZIP reopening passed.
- **B Visual:** Branded configuration/manifest workspace with appropriate split-specific controls.
- **C UX:** Manifest is useful; stacked layout places ZIP action before manifest and warrants review.
- **D Mobile:** Loaded manifests, many outputs and control stacking still need current acceptance.
- **E Dark:** Semantic design implemented; loaded manifest/error states pending.
- **F Validation:** Existing split configuration, file limits, timestamp and safe export/session checks remain covered by tests.
- **G Export:** Real individual SRT/ZIP logic, not a placeholder; current browser downloads still need saved-byte verification.
- **H Remaining:** Browser matrix and manifest/action ordering polish. Preserve method/configuration/output workflow.

### 4.4 Subtitle Editor — /tools/srt-editor

Overall: **PARTIAL**; **confirmed Back/Forward defect fixed**.

- **A Functionality:** Existing SRT/VTT/scratch editing, timing/text/add/delete/nudges, undo/redo, pagination, find/replace and exports retained.
- **B Visual:** Editor itself remains the workspace; no redundant preview. Existing narrow pagination is cramped.
- **C UX:** Dirty Back and Forward now show the existing confirmation before Next unmounts work. Cancel preserves caption/Undo; deliberate discard reaches the intended route. Internal-link cancellation still works.
- **D Mobile:** Prior populated 320px light/dark no-overflow evidence remains; complex paging/file/keyboard matrix incomplete.
- **E Dark:** Existing branded cue/action/status styling retained; complete dialog/issue/pagination acceptance pending.
- **F Validation:** Existing editorIsDirty model controls click/history/beforeunload guards. Reset/replace checks remain. History tests cover clean/cancel/approve, state retention, hash behavior, multiple entries and rapid traversal. Native refresh/close remains NEEDS REVIEW.
- **G Export:** Existing SRT/VTT serializers and dirty-clearing model unchanged. Current browser export/saved-state matrix not fully retested.
- **H Remaining:** Manually confirm native refresh/tab/window-close cancellation, all link/discard/export paths across browsers, then narrow pagination polish.

Root cause: captured clicks and beforeunload did not intercept same-document App Router popstate. Dirty reducer state unmounted silently.

Fix: src/lib/history-navigation.ts installs before hydration through src/app/layout.tsx. It stamps only an entry position while retaining Next state, rolls back unapproved traversal, calls the existing UnsavedNavigation dialog, and replays the approved original delta. No history push is used for guarding. src/features/srt-editor/unsaved-navigation.tsx subscribes only while the existing dirty flag is true. Tests: tests/editor-navigation.test.mjs, 13 passing.

Fresh production Chrome evidence: Back/cancel kept the caption and Undo; Back/discard returned to /tools; clean Forward returned normally. After creating a forward destination and dirty editor work, Forward/cancel kept the caption; Forward/discard reached SRT to VTT. No repeated dialog or navigation loop occurred in these checks.

Automated reload cleared the test session without a browser dialog visible to the API. This is an unresolved acceptance result, not a native-unload pass or proof of user-triggered browser behavior.

### 4.5 Subtitle Sync Fixer — /tools/subtitle-sync-fixer

Overall: **PARTIAL**, unchanged in this batch.

- **A Functionality:** Early reference/target + late reference/target, cue/manual selection, correction summary and source-format download implemented; earlier real-file anchor mapping passed.
- **B Visual:** Dedicated AENural two-reference station and concise correction inspection.
- **C UX:** Useful early/middle/late samples; one-decimal summary rounding can hide small real corrections.
- **D Mobile:** Long cues, picker pagination, four inputs and keyboard flow need fresh acceptance.
- **E Dark:** Shared tokens; loaded reference/result/error review pending.
- **F Validation:** Ordered/distinct anchors, positive result durations, overflow and inline VTT clocks validated; stale results invalidated.
- **G Export:** Exact millisecond mapping and SRT/VTT output; current browser-saved bytes pending.
- **H Remaining:** Summary precision and full loaded browser matrix; no automatic video-matching claims.

### 4.6 Subtitle Overlap Fixer — /tools/subtitle-overlap-fixer

Overall: **PARTIAL**, unchanged in this batch.

- **A Functionality:** Detect/review adjacent conflicts, select, Shorten Earlier/Move Later + gap, apply, remaining counts, undo and export exist; earlier chain-library repairs passed.
- **B Visual:** AENural conflict/repair workflow and useful before/after times, not a generic converter.
- **C UX:** Partial/excluded/cascading repair remains explicit. Computed changed-cue count is not shown; clean copy mislabels cues as files.
- **D Mobile:** Loaded conflict/partial results, pagination and long captions pending.
- **E Dark:** Semantic styling present; loaded result/error contrast pending.
- **F Validation:** Positive ordered input, safe gap, minimum duration, exclusions/overflow/inline VTT clocks checked. Gap error lacks field-specific association.
- **G Export:** Current repaired document is serialized; existing regressions pass; browser saved output pending.
- **H Remaining:** Gap error association, copy/changed-count clarity and browser matrix. Detection is adjacent/source-order, not all-pairs interval analysis.

### 4.7 SRT to VTT Converter — /tools/srt-to-vtt

Overall: **PARTIAL**, unchanged in this batch.

- **A Functionality:** Upload → validate → VTT ready → Download; earlier library output round trip passed.
- **B Visual:** Minimal AENural station; no preview/stepper.
- **C UX:** Existing advisory warning follows Download in DOM; move essential advice before action in a later focused fix.
- **D Mobile:** Long names/replacement/warning/download acceptance pending.
- **E Dark:** Semantic ready/error states exist; full populated review pending.
- **F Validation:** SRT extension/limits/encoding, positive/order checks, output consistency and stale result prevention implemented.
- **G Export:** Valid UTF-8 WEBVTT, basic formatting handling and positioning-loss warning; current saved-file browser test pending.
- **H Remaining:** Warning placement and browser acceptance. Related links now include reverse conversion and JSON.

### 4.8 VTT to SRT Converter — /tools/vtt-to-srt

Overall: **COMPLETE for documented V1 scope**.

- **A Functionality:** Choose VTT → validate → SRT ready → Download SRT, with replacement/reset.
- **B Visual:** Minimal AENural station; no preview or stepper.
- **C UX:** Filename/count and truthful loss warning precede download.
- **D Mobile:** Desktop/tablet/320px checked; populated narrow output actions usable, no page overflow.
- **E Dark:** Populated dark state inspected; shared semantic light theme.
- **F Validation:** WEBVTT parsing, positive/ordered cues, inline clock bounds/order, useful text, formatting balance, extension/encoding/10MB/10k limits. Malformed fixture showed plain error without download.
- **G Export:** Numbered SRT; timing/multiline words and portable b/i/u preserved. Metadata/settings/identifiers/wrappers/inline clocks dropped; ruby pronunciation omitted. Saved normal.srt matched expected 128 bytes/2 cues.
- **H Remaining:** Independent player/cross-browser acceptance; extended VTT features are explicitly lossy. Nine focused tests passed.

### 4.9 SRT to TXT Converter — /tools/srt-to-txt

Overall: **COMPLETE for documented V1 scope**.

- **A Functionality:** Choose SRT → TXT ready → Copy text / Download TXT; two useful output formats only.
- **B Visual:** AENural output workspace; resulting labelled text itself is shown, without a second preview.
- **C UX:** One cue per line or paragraph, readable whitespace, reset/replace and clear copy feedback/fallback.
- **D Mobile:** Three widths and populated narrow state checked; controls stack and text wraps without page overflow.
- **E Dark:** Populated dark and representative light theme checked.
- **F Validation:** Valid SRT/positive timing/limits/encoding/readable output; known style markup removed; unknown literal angle text retained.
- **G Export:** UTF-8 .txt; numbers/timestamps removed, cue words retained. Clipboard matched paragraph result; actual normal.txt matched expected 71 bytes/3 cues.
- **H Remaining:** Cross-browser clipboard permissions and real-device acceptance. Six focused tests passed.

### 4.10 ASS / SSA to SRT Converter — /tools/ass-to-srt

Overall: **COMPLETE for documented V1 scope**.

- **A Functionality:** Choose ASS/SSA → analyze compatibility → SRT ready → Download; real styled ASS and replacement SSA checked.
- **B Visual:** Minimal AENural converter with conditional concise Compatibility check.
- **C UX:** Explicit styling-loss message before action; does not claim fonts/colours/position/karaoke/animation are preserved.
- **D Mobile:** Three widths, populated narrow SSA and tablet ASS checked; no page overflow.
- **E Dark:** Shared semantic tokens and representative new-page theme checks; exhaustive styled/error theme matrix remains broader acceptance.
- **F Validation:** Script Info/Events/Format, unique required fields/order, Dialogue timing/text, commas, line breaks and limits validated. Malformed Events produced specific error and no download. Unsupported Events record types are rejected explicitly.
- **G Export:** Stable chronological numbered SRT; \N/\n line breaks normalized; override styling removed; drawing-only/empty/comment events omitted with warning. styled.srt 103 bytes/2 cues and basic.srt 57 bytes/1 cue matched saved bytes.
- **H Remaining:** Broader real-world ASS dialect/player corpus. Nine focused tests passed. It is a lossy converter, not a styling-preservation engine.

### 4.11 SRT to ASS Converter — /tools/srt-to-ass

Overall: **COMPLETE for documented V1 scope**.

- **A Functionality:** Choose SRT → ASS ready → Download; no styling editor.
- **B Visual:** Minimal AENural station with default-style/rounding notices before action.
- **C UX:** Explains default style and centisecond precision truthfully.
- **D Mobile:** Three widths and populated 320px checked; reachable download, no overflow.
- **E Dark:** Shared tokens and representative light/dark new-page QA.
- **F Validation:** Valid SRT, positive duration, limits/encoding; rejects timing collapsed by centisecond rounding or rounding beyond supported timeline. Literal braces/ASS escape sequences are conservatively rejected with cue-specific explanation rather than interpreted or silently altered.
- **G Export:** Complete Script Info, V4+ Styles with one sensible default, Events and Dialogue; multiline \N, Unicode, .ass filename and nearest-10ms timing. normal.ass matched 801 bytes/3 cues and parser round trip passed.
- **H Remaining:** Open in independent ASS-compatible editors/players. Documented literal-text restriction is a deliberate V1 limitation, not silent text preservation. Seven focused tests passed.

### 4.12 SRT to JSON Converter — /tools/srt-to-json

Overall: **COMPLETE for documented V1 scope**.

- **A Functionality:** Choose SRT → JSON ready → Copy JSON / Download JSON; reset/replace.
- **B Visual:** Wider AENural structured-output workspace; labelled code textarea, no schema clutter or redundant preview.
- **C UX:** Predictable pretty-printed array with index, start, end, startMs, endMs and text. Source-order numbering, multiline/Unicode/quotes/backslashes preserved.
- **D Mobile:** Three widths and populated 320px checked. Code scrolling stays inside output; no document overflow.
- **E Dark:** Populated desktop dark output inspected; shared semantic theme.
- **F Validation:** Valid SRT/positive times/limits/encoding; JSON.stringify provides correct escaping. Wrong extension shows plain error without output. Reset cleared output and focused upload.
- **G Export:** UTF-8 .json and numeric milliseconds. Clipboard parsed as three objects; saved normal.json matched 484 bytes with exact 1003/3507ms values.
- **H Remaining:** Cross-browser clipboard/real-device acceptance. Five focused tests passed.

### 4.13 VTT to TXT Converter — /tools/vtt-to-txt

Overall: **COMPLETE for documented V1 scope**. Eleven focused tests pass.

- Parses WebVTT through the existing parser; removes header, cue IDs/settings, timestamps, STYLE/REGION/NOTE metadata, voice/classes and inline clocks. Keeps Unicode and visible ruby text; decodes entities and normalizes whitespace.
- Matches SRT-to-TXT's one-cue-per-line and paragraph options. The labelled read-only transcript is the result; no redundant preview or stepper.
- Browser: real transcript/settings fixtures, paragraph clipboard success, malformed replacement, reset/upload focus, keyboard actions, light/dark and 1440/768/320 widths passed.
- Real downloads transcript (1).txt and transcript (2).txt both matched expected 87-byte UTF-8 outputs (different newline/space structure). Native clipboard text matched paragraph output. Empty/encoding/size/cue limits are covered by focused tests.

### 4.14 SBV to SRT Converter — /tools/sbv-to-srt

Overall: **COMPLETE for documented V1 scope**. Eleven focused tests pass.

- Parses basic YouTube H:MM:SS.mmm,H:MM:SS.mmm syntax, Unicode, multiline captions and blank-line separation. Generates sequential SRT indexes and comma-millisecond timestamps, preserving source order and overlap.
- Fixed multiple consecutive whitespace-only separator lines; regression test added. Malformed clocks, unsupported headers, missing text/separation, zero/reversed durations and unreadable/empty/oversized files are rejected.
- Minimal upload → ready → download station with replacement/reset. Real youtube (1).srt download matched 169 UTF-8 bytes and reparsed as three numbered cues, including hour-scale timing.
- Browser: malformed input, replacement, reset, keyboard download, light/dark and 1440/768/320 widths passed.

### 4.15 SRT to SBV Converter — /tools/srt-to-sbv

Overall: **COMPLETE for documented V1 scope**. Eleven focused tests pass.

- Uses the existing SRT parser, removes indexes, emits basic SBV timestamps and blank-line-separated captions, preserving Unicode, line breaks, exact milliseconds, source order and overlaps.
- Known SRT styling/positioning is omitted with a notice before Download. Rejects empty visible text, ambiguous timing-like caption lines and blank lines introduced by formatting removal.
- Real normal (1).sbv download matched 145 UTF-8 bytes; conversion round trips retain source text and timings.
- Browser: normal/formatted/malformed fixtures, replacement/reset, keyboard download, light/dark and 1440/768/320 widths passed. No caption preview or stepper added.

### 4.16 SRT to MP4 Converter — /tools/srt-to-mp4

Overall: **PARTIAL for duration extension and current muxer browser acceptance**. Fourteen planning tests and five mocked lifecycle tests pass. The cap remains 120 seconds; one/500-cue duration acceptance is independently covered. Cleanup, cancellable fit checking, accurate duration/count errors and reserve-mode muxing were improved. Fourteen native packet-replay files (both resolutions, one/500 cues, two/five/ten minutes plus baseline) passed container/timing/packet checks. These do not prove fresh browser rendering/playback/memory. No browser retry was performed. [Current report and precise remaining QA](aenural-format-conversion-qa.md).

The following browser/media bullets are retained **historical initial implementation evidence**; they do not certify current reserve-mode playback or longer rendering.

- Canvas text rendering → native WebCodecs H.264 encoding → Mediabunny MP4 muxing → in-memory Blob/download. No file-upload endpoint, backend, cloud processing or audio generation. The existing exact-pinned mediabunny 1.61.3 dependency is retained; its only dependency entries are browser type definitions. Official API and installed source/types were checked.
- V1 intentionally allows only 480p (854×480), 720p (1280×720), black/white background, 500 cues and timelines up to two minutes. Video starts at zero and ends at the largest cue end, including gaps. Default text wraps by words/graphemes, preserves explicit lines, supports available Unicode fonts and shrinks to fit; impossible fits fail clearly. Overlapping cues remain visible in source order.
- Encoding is imported only after Render. Production library chunk: 221,905 bytes raw / 58,068 gzip; absent from initial MP4 page script HTML. No WASM encoder payload added.
- Actual saved outputs: video (1).mp4, 91,719 bytes, H.264, 854×480; video (2).mp4, 125,827 bytes, H.264, 1280×720. Both contain one video track, no audio and duration 5.500s. All nine keyframe sample starts/durations match the fixture timeline within 0.01 ms (MP4 timescale rounding).
- Production smoke: the rebuilt application also rendered, played to ended at 5.5s and downloaded video (3).mp4 (91,719 bytes); the disk media verifier passed. No production browser errors were captured.
- Independent local browser harness reopened both disk files, decoded four sample frames, proved blank lead-in/gap frames and visible/unclipped caption frames, and played both saved files to ended at 5.5s. Text fits with margins; long sentences wrap across multiple lines. This is actual MP4 media, not renamed subtitle data.
- Browser: upload/render/progress/download, settings invalidating stale media, malformed replacement clearing media, two-minute-render cancellation, reset/upload focus, light/dark and 1440/768/320 widths passed. Late playback callbacks now check their operation ID before changing state.
- Download is exposed only after the local video element decodes data and validates dimensions/duration. Unsupported H.264/secure-context environments get a clear error. Other browser/OS codecs, real devices and independent player acceptance remain recommended release checks, not claimed as performed.

The Format Conversion group contains exactly: SRT→VTT, VTT→SRT, SRT→ASS, SRT→TXT, SRT→JSON, VTT→TXT, SRT→MP4, SBV→SRT, SRT→SBV and ASS/SSA→SRT. There are no Caption Generation entries.

### 4.17 Podcast to Captions — development-only

Overall: **PARTIAL / RELEASE HELD**. Short English recording upload/validation, lazy shared worker, model byte progress/cache warning, cancellation, review/text/timing corrections/undo, SRT/VTT exports and replace/reset protection implemented. Existing editor/export reducers and AENural layout/theme tokens reused. Production route is 404, noindex and undiscoverable. Final browser upload/MP3/transcription/edit/download, mobile/dark/accessibility, human benchmark and no-speech acceptance are pending or failed as detailed in current QA. No long-podcast claim.

### 4.18 Free Subtitle Generator — development-only

Overall: **PARTIAL / RELEASE HELD**. One canonical page reuses exactly the same engine, decoder, review and exports. English MP3/WAV candidates only; untested video/audio containers rejected. No duplicate AI/YouTube variant. Same release gates and production/discovery hold as Podcast to Captions. Both previews count as implemented development work, not as publicly available free tools.

## 5. P0 status

| P0 | Status | Evidence / remaining acceptance |
| --- | --- | --- |
| Confirmed editor Back/Forward data loss | COMPLETE | Production Chrome cancel/discard/clean history checks passed; 13 focused history tests. Next state retained; no guard-added history entries. |
| All editor unsaved exits, including refresh/close | PARTIAL | Existing dirty model, beforeunload, captured links and reset/replace protections retained. Native refresh/close cancellation not verified; automated reload cleared the test session. Manual check remains required. |
| Merger misleading correctness wording | COMPLETE | Existing copy correctly disclaims unavailable video duration; no change needed. |
| Real-file end-to-end QA readiness | PARTIAL | Five new tools exercised with real browser picker and six saved files reopened; original seven still need full current browser file workflows. No automated browser runner added. |
| Reproducible production build | PARTIAL | Local build/start passes with current lockfile/node_modules. Clean npm ci, pinned runtime and target-host artifact reproduction remain unproven. |

No confirmed remaining Back/Forward code defect was observed after the fix. Native unload and broader release acceptance must not be represented as completed.

## 6. P1 status

| P1 | Status | Current evidence / gap |
| --- | --- | --- |
| /tools | PARTIAL | All sixteen discoverable; live search works. Aliases/active-state and broader keyboard/mobile acceptance remain. |
| /tools/subtitle-tools | COMPLETE | Sixteen task links/cards and accurate format guidance inspected. |
| Homepage/discovery | PARTIAL | Approved structure retained; real flagship media/facts pending. |
| Mobile QA | PARTIAL | New tools checked at three widths and populated narrow states; full original-seven/current real-device matrix pending. |
| About / Help / Privacy | PARTIAL | Real factual pages; missing real support/privacy/operator/hosting facts. |
| 404/error recovery | PARTIAL | Existing 404 proven previously; unexpected error/refetch/root-layout behavior still needs test. |
| SEO/crawl/share | PARTIAL | Registry/metadata integration complete; SITE_URL absent, canonical/absolute OG/sitemap output inactive. |

## 7. Tests, build and browser results

**Latest UX/MP4 batch:** 39 focused tests / seven suites; full suite **575 tests / 67 suites passed**. Lint, non-incremental typecheck and production build passed (31/31 static entries). Native long-MP4 probes verified fourteen actual saved containers, not new browser encoding/playback. User-reported Chrome SRT/VTT downloads and displayed WebGPU are recorded separately from independent file-content/backend/timing proof. No browser retry. See the latest sections of both QA reports and `ux-mp4-*.log`.

### Earlier Silero follow-up checks

**Current Local AI follow-up:** 50 focused tests / 9 suites; full suite **563 tests / 65 suites**, all pass; lint (unused import warning fixed with targeted re-lint), explicit non-incremental typecheck and production build pass. Build generates 31 static entries; production-notFound/noindex gates and absence from the registry remain. Production dependency audit reports zero vulnerabilities. Isolated Windows default-policy npm ci and exact locked dependency graph passed, with three install scripts withheld by npm. Native VAD/Whisper evidence, model/runtime sizes, lazy bundle inventory, noisy spelling failure and manual checks are recorded in [aenural-local-ai-batch-1-qa.md](aenural-local-ai-batch-1-qa.md). The one freshly authorized browser bind timed out on Emulation.setFocusEmulationEnabled; no retry/bypass/alternative controller followed. Current-preview browser acceptance is PENDING MANUAL VERIFICATION. Earlier automatic-review rejection remains historical Batch 1 evidence.

The table and browser details below are retained **historical Format Conversion batch** evidence, not fresh Caption Generation browser QA.

Environment: Windows PowerShell, Node 24.21.0, Next 16.3.8, React 19.2.8. npm.cmd avoids the machine's npm.ps1 execution-policy restriction. Installed Next documentation was consulted before code.

| Check | Final result |
| --- | --- |
| Focused editor history tests | PASS: 13 tests |
| Five new converter tests + conversion session | PASS: 42 tests (9 VTT, 6 TXT, 9 ASS import, 7 ASS export, 5 JSON, 6 shared session) |
| All converter-related tests | PASS: 149 tests, 16 suites |
| Four remaining converter suites | PASS: 43 tests (11 VTT TXT, 11 SBV SRT, 11 SRT SBV, 10 video planning) |
| Format discovery regression tests | PASS: 4 tests, exact ten-tool membership and 23 sitemap URLs with a configured origin |
| npm.cmd test | PASS: 513 tests, 56 suites, zero failures/cancelled/skipped/todo |
| npm.cmd run lint | PASS, exit 0 |
| npm.cmd run typecheck -- --incremental false | PASS, exit 0 |
| npm.cmd run build | PASS, exit 0; 28/28 static generation; all four new routes present |
| Built route checks | Four new tools and both discovery pages are statically generated; distinct AENural metadata, one H1 and registered related links. Production MP4 smoke check also performed. |
| Real Chrome converter workflows | Current four passed: four saved text outputs matched bytes; two H.264 MP4s reopened, decoded and played to end. Previous five-converter checks remain historical evidence. |
| Clipboard | TXT paragraph copy matched; JSON copy parsed correctly |
| Validation/reset | Malformed VTT/ASS and wrong JSON extension rejected without downloads; reset cleared output and restored focus |
| Responsive | All four current new pages: 1440/768/320 requested widths, no horizontal page overflow; primary actions >=45px and reset >=44px. Prior five-page evidence remains historical. |
| Theme/accessibility | Representative new-page light/dark, real labels/status/error semantics and focus reset checked. Full screen-reader/real-device acceptance not claimed |
| Editor browser history | Back/Forward cancel/discard and clean navigation passed; internal-link cancel preserved work |
| Editor native refresh/close | NOT SIGNED OFF: automation reload cleared work without API-visible dialog; manual native controls required |
| Production origin | NOT CONFIGURED: no canonicals/absolute OG image/current sitemap entries; not hidden as a passing SEO check |

An initial lint failure concerning a DOM ref returned through the conversion hook was fixed: the hook now returns session state/actions only, with reset focus handled in the event. Final lint/typecheck/build passed. A QA script's incorrect TXT paragraph call was corrected; all six disk comparisons then passed. No final failing automated check is concealed.

Current final logs: artifacts/format-converter-tests.log, format-full-tests.log, format-lint.log, format-typecheck.log and format-build.log. Current evidence, verification commands and exact remaining manual steps: artifacts/aenural-format-conversion-qa.md. Saved test downloads are in the local Downloads directory. Earlier %TEMP%/aenural-batch-* logs and artifacts/aenural-batch-notes.md describe the previous batch only.

Tests establish parser/serializer/session correctness and meaningful history behavior with an event queue/Next-state model; they are not browser E2E tests. Browser checks were performed separately. Existing source-contract and token tests do not certify every screen-reader, hardcoded contrast combination or player.

Historical artifacts/aenural-design/responsive-checks.json has 110 initial-state checks; it remains historical evidence, not replacement for loaded acceptance. Original seven library smoke checks from the prior audit remain valid as prior results; this batch did not rerun them as browser workflows.

## 8. Remaining visual inconsistencies

1. Source Window still uses illustrative placeholders rather than actual product media.
2. Editor 320px pagination is cramped; do not redesign its editing workspace.
3. Category/trust/marketing heading treatments vary; review shared spacing with purpose intact.
4. Existing CSS layers/legacy internal selectors remain; no wholesale style rewrite is justified.
5. Original-tool long filename/error/clamp/manifest/partial repair/paginated states need complete current light/dark acceptance.
6. Navigation active-location and short-height mega-menu behavior need review.
7. Existing splitter action-before-manifest and SRT-to-VTT warning-after-download ordering remain. New converter warnings precede actions.
8. Minor count grammar such as "1 cues" remains a copy-polish item.

No tool was found to be an untouched public ToolSuite workspace. Stale README/legacy internal names are documentation debt.

## 9. Remaining functional issues and release dependencies

- **Generation P0 release:** current pinned browser WASM/runtime and WAV/MP3 verification, real final-workspace SRT/VTT downloads, network inspection, WebGPU behavior, ten cancellation/replacement cycles and cache/offline/failure acceptance remain pending.
- **Generation P0 correctness:** the new pinned Silero gate rejects the reproduced tone/noise/silence fixtures, but broader music/singing/transient/human false-positive/false-negative behavior remains unvalidated. Quiet synthetic speech is retained; very short utterances can be missed. The noisy exact final-word check failed (“Light House”); keep real review and quality evidence, not word suppression or fixture-specific rules.
- **Generation quality/device release:** five consented human clips and timed annotations are **PENDING USER INPUT**; human WER/timing gates and browser desktop/mobile memory/performance are unproven. Populated light/dark, responsive and accessibility browser acceptance remains pending. One fresh browser attempt failed; user instructed no more retries this session.
- **Generation distribution:** converted-weight license/provenance review, complete shipped notices and actual Hostinger worker/blob CSP, CORS/MIME/cache/bandwidth/clean-install validation remain open. Both previews must stay out of public discovery until their gates pass.

- **P0 acceptance:** manually verify dirty native Refresh/Ctrl+R/tab/window-close cancellation. Keep the unresolved automated reload result visible.
- **P0 acceptance:** finish original seven real browser upload/task/download/reopen workflows and all-editor-exit matrix across intended browsers.
- **P0 release:** clean-install/runtime/host reproducibility has not been proven.
- **P1:** supply real HTTPS origin; rebuild and inspect all 23 sitemap content URLs, self-canonicals, OG/Twitter image URLs and robots pointer.
- **P1:** supply actual Source Window product/media/compatibility/acquisition/install/support facts.
- **P1:** finish real Help/Privacy operator/contact/hosting/logging information.
- **P1:** induce error/recovery and root-layout failure; complete keyboard/touch/screen-reader acceptance.
- **P2 existing:** task search aliases; sync summary millisecond precision; overlap gap error association, clean-file wording and changed-cue count.
- **Review:** zero-duration timing clamps, subtitle formatting across target players, independent ASS reader compatibility.
- **Documented new scope limits:** ASS import supports Dialogue/Comment Events and explicitly rejects other record types. SRT→ASS rejects literal braces/ASS escape sequences and unrepresentable rounded durations. VTT/ASS→SRT omit unsupported features with truthful notices.
- **Recovery:** README is stale. Existing .gitignore ignores this recovery audit and local QA artifacts; deliberately retain them in the later backup. Ignore rules were not changed, and nothing was staged/committed/pushed.

No database/auth/payment/cloud feature is needed for these items. Conversion processing remains local. The new generation implementation uses browser decoding and a dedicated local-model worker, fetching public static model/runtime assets only; no file-upload API/cloud transcription was introduced. Actual current browser no-upload network evidence is still required.

## 10. Pre-existing release acceptance backlog (not executed in this batch)

1. Manually exercise native editor refresh/tab/window-close cancellation and all dirty exit paths on this production build. If native protection fails, isolate the actual event/dirty-state cause and add a focused regression before any broader work.
2. Complete original seven real-file browser workflows and independent target-player checks, including all new conversion outputs; reopen downloads. Fix only demonstrated correctness/safety issues first.
3. Close focused UX/accessibility issues: narrow editor pagination, original converter warning ordering, splitter manifest ordering, sync precision, overlap error/copy/count clarity, task aliases and count grammar.
4. Complete sixteen-tool mobile/dark/keyboard/screen-reader and error-recovery acceptance on intended browsers/devices. Retain repeatable evidence.
5. Obtain and publish factual Source Window media/capabilities/compatibility/install/support material within its existing approved structure.
6. Finish Help/Privacy contacts/operator/hosting facts and truthful AENural/sixteen-tool README documentation.
7. Set confirmed production SITE_URL, rebuild and verify all 23 URLs/canonicals/share assets/robots with actual preview indexing policy.
8. Prove clean-install/runtime/host reproducibility, review ignored evidence retention and prepare the user-authorized later Git backup. No commit/push is part of this batch.

## 11. Caption Generation — Batch 1 held for verification

Latest presentation-only follow-up simplifies both preview workspaces and preserves the diagnostic lab. The owner's Chrome success is recorded in [the latest UX evidence](aenural-local-ai-batch-1-qa.md). Both previews remain PARTIAL and undiscoverable pending the applicable gates; no additional generation tool was started. The next MP4 acceptance batch should qualify five/ten-minute actual WebCodecs encoding and independent playback/resource behavior before raising its conservative cap.

**Caption Generation has two PARTIAL development previews, zero publicly released tools.** The Silero follow-up closes the owned synthetic tone/noise/quiet-speech gate, not universal music discrimination. Next batch: manual/current-browser runtime and MP3/WAV checks when access is available, human accuracy/timing and varied legitimate negative-audio corpus, actual downloads, network/cache/cancel/device/accessibility, and licensing/install-script/Hostinger delivery. Keep tiny.en until real evidence justifies a larger model; no alternative VAD packages or new tools are recommended now. Only register these two previews when applicable gates pass.

Original editor native-refresh/close and other release checks remain in section 9. They were outside this conversion-only task and were not silently marked complete.

## 12. Recovery map and batch boundary

- Editor fix: src/lib/history-navigation.ts; src/app/layout.tsx; src/features/srt-editor/unsaved-navigation.tsx; tests/editor-navigation.test.mjs.
- Conversion core: src/lib/subtitle-conversion.ts; vtt-to-srt.ts; srt-to-txt.ts; ass-subtitles.ts; ass-to-srt.ts; srt-to-ass.ts; srt-to-json.ts.
- Shared small UI/state pieces: src/features/conversion/conversion-session.ts; use-conversion.ts; conversion-controls.tsx.
- Five own workspaces: src/features/vtt-to-srt, srt-to-txt, ass-to-srt, srt-to-ass, srt-to-json; corresponding src/app/tools routes.
- Brand additions: src/app/aenural-tools.css; src/lib/icons.ts; src/components/ui/icon.tsx.
- Discovery/content: src/lib/tools.ts; discovery.ts; /tools and category pages; count-only About/Privacy/Home FAQ changes.
- Tests: five conversion suites, conversion-session suite, editor history suite, registry/integration updates; tests/fixtures/conversions contains real SRT/VTT/ASS/SSA and malformed fixtures.
- Existing sitemap and metadata helpers consume the extended registry/routes; no invented production domain.
- Local evidence: artifacts/aenural-batch-notes.md; artifacts/aenural-batch-download-check.mjs; temporary check logs.

Previous conversion additions: src/lib/vtt-to-txt.ts, sbv.ts, sbv-to-srt.ts, srt-to-sbv.ts and subtitle-video.ts; matching four features/routes and tests. Mediabunny 1.61.3 was added for local rendering and is reused for local audio decoding. Those pre-existing uncommitted changes remain intact.

Current Local AI additions: src/features/local-asr; development lab; Podcast to Captions and Free Subtitle Generator preview routes; five focused test files plus the captured real-segment fixture; local-ASR license notices; pinned Transformers 4.3.1 and lockfile. ESLint ignores only the unpacked third-party research fixture directory, while application/QA code remains linted. Raw local test fixtures/model caches/results and final-check logs are under artifacts/local-asr-qa and artifacts/local-ai-*.log; [current QA report](aenural-local-ai-batch-1-qa.md) distinguishes browser, native CPU, automated and pending evidence.

Silero follow-up additions: speech-activity.ts (pinned detector and general probability policy), cached-asset.ts (cache/integrity), speech-transcription.ts (full-context gate), worker integration and detecting-stage status/cancellation; exact-zero silence check; timing input aria-invalid correction; direct existing-version ONNX Web dependency; 21 new regression tests including captured native frame probabilities, integrity/failure, source context and ten mock cancellation cycles. Model/native QA scripts, actual reopened outputs, strict noisy failure, clean installation and final-check logs are under artifacts/local-asr-qa/batch2/. Pinned Silero/component notices were added. No model weights are bundled into public/ or initial JS.

No Source Window redesign, existing-tool rebuild, login/database/payments/cloud inference, staging, commit or push was performed. Work stops after this batch report. This audit and QA evidence remain ignored by the repository's pre-existing ignore rules; retain them explicitly in a future user-authorized backup.
