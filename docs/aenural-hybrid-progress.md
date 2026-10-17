# Controlled development checkpoint

17 October 2026. Development only; no production remote changes or deployment.

## Phase 0 — complete

DONE: Created `dev/aenural-hybrid` from verified local `f96a4d8`, six commits ahead of origin/main, preserving every existing uncommitted homepage/media change. Origin is faisalhere-afk/aenural-website; hostinger is AmirNazir3784/AE-NUREL. No URL changes, resets or pushes. Reviewed installed Next video/client guides, approved design and existing ASR/localization/chunk/recovery/media records.

TESTED: Baseline full suite recorded under ignored artifacts/hybrid. Existing homepage video test fails because the third MP4/poster are already absent; Phase 1 updates this obsolete three-video contract. The current feature MP4 has already been compressed to 5,715,433 bytes. Hero remains 67,934,108 bytes. Both are below GitHub's per-file limit.

NEXT: Phase 1 replaces the obsolete third-video reference with a static SVG and implements two muted previews/shared accessible modal. Later phases must not start before this phase passes its verification.

## Phase 1 — complete

DONE: Two muted/looping/inline visible previews without native controls, one shared accessible modal with native controls/audio and safe cleanup. Static SRT→VTT SVG replaces third video; the asset was already absent, so no user media deleted. Added requested 88px separation between the two feature rows. No unrelated layout or tool changes.

TESTED: Nine focused regressions and 725-test full suite pass; lint and fresh production build pass. Native browser desktop/mobile measurements, real playback, X/Escape/backdrop/focus/scroll lock, Light/Dark modal surfaces and static illustration verified; user also confirms themes. Browser measured exactly 88px feature gap. Narrow screenshots sometimes scale incorrectly; full-page capture/DOM bounds used honestly. Later Dark Reader attribute injection produced an extension-related hydration warning, documented rather than suppressed. Production public-route/gate/assets checks recorded under artifacts/hybrid.

NEXT: Phase 2 separates branded/free navigation and retires only the duplicate customer caption route/listing. Shared ASR/editor/model/recovery code remains intact.

## Phase 2 — complete

DONE: Shared Tools/Free Tools disclosures with hover/click/keyboard/Escape/outside dismissal; actual Source Window product and dedicated /premium-tools directory. Free menu and mobile accordion use all 16 released registry entries in two categories. /tools remains canonical for free utilities (16 production/17 development cards). One held Audio to SRT/VTT entry retained. Duplicate Speech to Captions listing removed; /tools/podcast-to-captions now unconditionally 404, with shared components, models and caches untouched. Public sitemap adds only the real branded directory.

TESTED: 44 focused tests, 731-test full suite, lint/typecheck and production build pass. Actual desktop menu has 16 links, 620px width and fits the viewport; mobile has all 16 links inside its scrollable disclosure with no horizontal overflow. Keyboard entry/Escape, product-directory link and existing search checked in browser. Development and production HTTP scripts verify every public tool, correct 17/16 card counts, product directory, duplicate 404, held AI gate, assets/search/sitemap. Existing production verification passes. No production enablement or remote change.

NEXT: Phase 3 audits documented model settings and cached original assets, makes only evidenced integration corrections and verifies source/timestamp/translation integrity. Do not replace models or undo coverage/recovery protections.

## Phase 3 — complete (integration; semantic release hold retained)

DONE: Corrected one proven lifecycle defect: an idle ASR worker could be reused after incompatible quality/language-model/timestamp/backend requests. Its identity is now checked before reuse; normal chunk reuse/cancel remains. Accurate preferred in retained workspace; low-memory guard and explicit Fast remain, without silent downgrade. Added optional translation draft/review wording. Original pinned Small/M2M100 model revisions, quantized weights and generation settings untouched. Kept source sentence coverage, token/truncation guards, VAD, measured alignment, chunk/recovery/export integrity.

TESTED: 85 focused tests, 732 full tests, lint and production build pass. Cached-only native verification matches four weight files to upstream LFS SHA-256, transcribes the original synthetic fixture and generates valid SRT/VTT. Five M2M100 wrapper outputs exactly match direct upstream pipeline outputs, with zero model downloads; known semantic failures remain. Native multilingual Small weights absent from filesystem cache, so no new download/hash claim. Real browser Small.en WASM: 15 cache hits, 0 downloaded bytes, 25.70s inference; four exported source cues parsed. Target change to Urdu immediately reuses source (no second speech audit); real M2M100 browser result and both downloads verified within all four source sentence intervals. Source technical term SAUS remains an ASR error; translated SAUS omission/judge meaning remain model errors, not semantic passes.

NEXT: Phase 4 implements an isolated development-only, bounded/authenticated Node CPU transcription service and client/editor boundary. No public enablement. Hostinger deployment/resource configuration remains unverified; unsupported input/translation/video capabilities must fail honestly.

## Phase 4 — development foundation complete; Hostinger deployment blocked

DONE: Isolated opt-in Node CPU module/API and dev-only upload workspace reuse pinned Small.en q8, existing word normalization/editor/exporters. Explicit consent/token, strict local Host/Origin, PCM structure/8 MiB/60-second limits, one-process concurrency, rate/time/RSS controls, cancellation, safe temporary cleanup and result expiry. Production always 404. No server translation/video claims, new dependencies, paid services or silent browser fallback. See server/hybrid/README.md for actual configuration and deployment boundaries.

TESTED: Fourteen boundary/lifecycle tests pass. Real Node 22 HTTP-to-native-CPU run: 49 timed words/four cues from the existing 17.82-second synthetic fixture, 24.8s including loading, peak worker RSS 1,423,200,256 bytes. Thirteen concurrent homepage requests returned 200. Final real rerun after cleanup/cancellation refinements: 22.6s, 49 words/four cues, fifteen homepage 200s, real cancellation and temporary cleanup passed. Actual browser upload/consent/poll/editor, edit/Undo and downloaded SRT/VTT verified (four cues, first 240ms/final 17280ms), desktop/narrow DOM overflow checks. A later browser confirmation dialog blocked automation during an additional cancel check; one recovery/cleanup attempt also timed out. API cancellation is independently verified. Lint/typecheck pass; final full regression/build checkpoint follows.

BLOCKERS: No Hostinger account/runtime access or verified resource configuration. Native RSS watcher is not a kernel memory cap; service is process-local and English WAV only. No public authentication/abuse system and no public enablement. Existing semantic translation release hold remains. The development foundation is real; Hostinger deployment readiness is not claimed.

NEXT: Phase 5 full regression/lint/typecheck/fresh production build and production 404 checks. No deployment or public processing enablement.

## Phase 5 — complete, with recorded browser/hosting limits

DONE: Final integration checkpoint across media, 88px feature spacing, shared video modal, product/free navigation, single held caption tool, model identity correction and isolated CPU service. No release gates lifted.

TESTED: **746 tests / 91 suites pass on both Node 24 and Node 22.22.2**; ESLint has zero warnings, TypeScript passes, fresh optimized webpack production build exits 0 on Node 22. Actual production requests verify all 16 public tools, branded directory, exactly two videos/range delivery, byte-matched logos, loaded CSS, search markup and account/AI gates. Hybrid page/API GET/POST/DELETE/OPTIONS return 404 even with enable flags and a valid operator token. Development directory has 17 entries and retired duplicate is 404. First production check correctly found an empty sitemap because the QA build omitted SITE_URL; rebuilding with the existing SITE_URL=https://aenural.com setting produces the correct public sitemap, with no held AI/dev routes. No source workaround for missing configuration.

LIMITS: Actual browser media, navigation, source/Urdu downloads and server editor/export checks are recorded above; the final extra browser cancel check could not finish because the browser confirmation dialog blocked automation. No claim of native-speaker acceptance, new continuous multi-hour inference, Hostinger execution or public server readiness. Existing long-job/recovery regression suite passes. Operator cleanup remains necessary after a complete OS failure.

NEXT: Phase 6 verifies the development-only backup, excludes generated tokens/weights/cache/private media, and may commit/push only dev/aenural-hybrid to origin. Never push hostinger or either main branch. Hostinger resource/private deployment configuration and real public authorization are the next engineering prerequisites, not deployment authorization.

## Phase 6 — verified backup prepared

DONE: Correct dedicated branch and unchanged remote URLs rechecked. All 49 changed files inspected for model/cache/private-audio/credential exclusions and GitHub's 100 MiB limit. Both public videos are below that limit. Temporary operator token deleted and both task-owned QA servers stopped; the user's original development server was left running. No production repository action or deployment.

TESTED: Development origin access verified; the development branch does not yet exist remotely. Full regression and actual local production checks above are the backup acceptance evidence.

NEXT: Commit verified development work and push only origin/dev/aenural-hybrid; record the actual remote result. Hostinger remains blocked pending real private runtime/resource configuration, public authorization and abuse controls. Translation semantic release acceptance remains outstanding.
