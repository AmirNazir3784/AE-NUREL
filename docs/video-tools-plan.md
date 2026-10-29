# Free video tools: research and implementation plan

28 October 2026. Work locally on `dev/tools-completion`; push reviewed work only to the Faisal repository. No production/AmirNazir deployment during this phase. No spending on APIs, subscriptions or additional processing infrastructure.

## First tool: Video Compressor

Competitor: https://caption-x.com/video-compressor. Browser-tested with the owner's explicitly approved, already-public `source-window-feature.mp4` demo. Its controls expose High (1080p), Balanced (720p) and Small (480p). The Balanced result reported 51% saved and 26 seconds processing. The downloaded output was independently parsed: 3,450,397 bytes became 1,673,882 bytes; 1920×1080 became 1280×720; both files contain H.264 video, stereo AAC audio at 48 kHz, and a 33.133-second timeline. The competitor sends the source to its servers. These are observations from one clip, not a general quality or speed benchmark.

Build a distinct AENural page with a compact introduction, a large video workspace, an adjacent settings panel, clear estimated/output sizes, an explicit download, and useful original help content. Keep the site's existing colors, fonts, header and footer. Support mobile, keyboard navigation and reduced motion.

Implementation uses the already-installed Mediabunny library and browser WebCodecs. No video-upload endpoint, paid API, new model or new dependency. Lazy-load the media engine after file selection. Codec support depends on the device/browser; check before encoding and explain unsupported inputs instead of inventing compatibility.

First-tool features:

- Balanced, Smaller, Higher quality and custom target-size modes.
- Independent resolution and MP4/WebM output choices; audio preservation or intentional muting.
- Local original/result previews, measured before/after sizes, descriptive filenames and manual downloads.
- Output-size estimates labeled as estimates, measured progress, cancellation, safe file replacement and reset.
- Parse the completed output to verify video dimensions, timeline and audio presence. Never call an oversized target result successful; retry once at a lower bitrate or explain what to change.
- Development-only route and local-directory entry. Preserve the public tool registry, sitemap, existing caption access controls and release holds.

Acceptance: meaningful unit tests for settings/size budgets and validation; actual browser uploads/encoding/downloads; independently inspect exported MP4 and WebM; verify preserved AAC packets where copying is possible; exercise cancellation, invalid input, replacement and target-size behavior; desktop/mobile/light/dark and keyboard checks; lint/typecheck/build and relevant/full tests. Report limitations honestly.

## Subsequent tools from the supplied list

1. Reuse the tested compressor engine for Compress to 10 MB, Compress MP4, Reduce Video File Size, WhatsApp Compressor and MOV Compressor, with useful purpose-specific controls and content.
2. Video Cropper: draggable crop, exact dimensions and aspect presets, preview and audio-preserving export.
3. Compress Image to 20 KB: browser image encoding, target-size verification, dimensions and quality controls.
4. Green Screen Remover: browser chroma key, color sampling, edge/spill controls and tested background/export options.
5. AI Eye Contact: investigate an available, appropriately licensed browser-capable gaze-redirection model before promising a working tool. Do not substitute a paid API or present a cosmetic eye overlay as AI correction.

Reference documentation: https://mediabunny.dev/guide/converting-media-files and https://mediabunny.dev/guide/supported-formats-and-codecs. This plan does not treat competitor claims or platform upload limits as independently verified facts.

## First-tool verification evidence

- Actual Chrome MP4 export: 3,450,397 → 1,666,287 bytes, 1280×720, unchanged 33.133-second duration. All 1,554 AAC packets have the same combined SHA-256 as the source. Browser-reported processing time: 13.4 seconds for this one clip/device.
- Actual 1 MB target export: 999,335 bytes, 1280×720, unchanged duration and identical source AAC packet hash. An impossible 0.1 MB target was rejected before encoding.
- Actual WebM export: 1,999,697 bytes, VP9 video and one Opus audio track, 1280×720, 33.12 seconds.
- Actual muted MP4: 831,946 bytes, 852×480, 33.133 seconds, zero audio tracks.
- Browser interactions passed: cancellation followed by a successful retry, unsupported SRT selection retaining the previous good video/result, same-file replacement clearing the old result, reset, and keyboard Tab/Space preset selection with a visible focus outline.
- Chrome desktop and 390px/320px viewport checks passed. The 320px check exposed an existing header overflow; a small logo/padding breakpoint change fixes it without changing desktop navigation. Browser warning/error log was empty at the end of the interaction checks.
- All 14 focused compressor/directory/sitemap tests passed. Full suite: 915 passed, three existing `studio-highlighting.test.mjs` failures; no new test failures. ESLint passed with four existing unused-variable warnings.
- Fresh optimized production build and separate typecheck passed. Ordinary production returned HTTP 404 for the new tool and retained the 26-URL sitemap without it. Opt-in loopback production QA returned HTTP 200 with noindex metadata; real Chrome media loading and compression also passed from that optimized bundle (52% saved on the same sample, 14.2 seconds, playable 1280×720 output with no media or console errors).
- Native dark-mode and forced reduced-motion browser preference checks: **NOT RUN** because the connected browser interface has no media-preference emulation. The new page uses existing light/dark CSS tokens and has an explicit reduced-motion rule; these were reviewed in source. Do not report this as device-wide or all-browser certification.

Ignored evidence lives in `artifacts/video-compressor/`: desktop/mobile screenshots, independently parsed export metadata, audio hashes and the full test log. Browser download notifications timed out for Blob URLs, but actual saved files were located and independently inspected; success is based on those bytes and browser playback metadata.

## Second tool: Video Cropper completed (29 October 2026)

Implemented `/tools/video-cropper` as a development-only tool with exact-ratio presets, draggable framing and corner resizing, keyboard controls, numeric geometry, undo/reset/centering, a live crop preview, MP4/WebM export and optional audio. See [video-cropper-qa.md](video-cropper-qa.md) for the implementation, actual export measurements, decoded-pixel verification and test results. Progress copy uses “Cropping, please wait…” and does not describe processing location.

Wait for the owner to choose the next tool. Green Screen Remover is unfinished and must be ignored for now. Continue publishing completed development work only to Faisal; the Amir/Hostinger production release remains on hold.
