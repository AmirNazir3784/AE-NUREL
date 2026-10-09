# AENural Format Conversion QA — 9 October 2026

## Latest follow-up — SRT to MP4 duration investigation and fixes

**Duration-extension request: PARTIAL. Supported/configured maximum before → after: 2:00 → 2:00.** The two-minute restriction is the application's `MAX_VIDEO_DURATION_MS = 120000`, checked against the greatest cue end measured from zero. It is a conservative V1 release policy, not a demonstrated H.264/WebCodecs/MP4 format limitation. Cue count is checked separately against 500. A single late cue can therefore fail while 500 shorter cues pass. No captions or gaps are shortened, sped up, shifted or dropped.

### Implemented corrections

- Duration errors now give the actual end time (including milliseconds), supported maximum, definition of timeline/gaps and confirm when cue count is within its separate limit. Cue-count errors give actual and maximum counts. The misleading suggestion to retime input was removed.
- A fit failure previously occurred outside the renderer's `try/finally`, leaving the allocated canvas uncleared. All preflight fitting is now covered by cleanup. A missing canvas context is also cleared. Large preflights yield every 32 intervals and check cancellation before each interval; cancellation/fit failure never allocates an encoder unnecessarily.
- Mediabunny 1.61.3 uses **`fastStart: "reserve"`** with the known maximum packet count instead of `"in-memory"`. This writes media progressively into the output buffer rather than retaining an additional collection of all encoded chunks until finalization. Ordinary fast-start H.264 MP4 is retained, including 480p/720p, exact timing and keyframes. **The completed file still resides in BufferTarget/Blob for preview/download: this is not constant-memory disk streaming.** Installed API/source and [official output-target guidance](https://mediabunny.dev/guide/writing-media-files#output-targets) were checked. A disk/OPFS `StreamTarget` is a possible later bounded-memory design, but needs browser compatibility, permission/quota, cleanup and preview/download acceptance; no untested storage architecture was added here.

### Focused and genuine media evidence

| Case | Input validation / focused tests | Native media probe |
| --- | --- | --- |
| One cue ending at 2:00 | Accepted; 119-second blank lead-in preserved | 480p/720p 120-second H.264 files remuxed, reopened and packet-checked |
| One cue ending at 2:00.001 | Rejected specifically for duration; one cue is within limit | No production render attempted |
| Multiple cues within two minutes | Existing Unicode/multiline/overlap/gap tests pass | Original 5.5-second browser files independently demuxed again; new reserve-layout baseline files passed |
| 500 cues ending at 2:00 | All 500 accepted, gaps and final cue intact | Both sizes: 1,079 correctly timed packets |
| 500 cues spanning 5:00 / 10:00 | Rejected for duration alone, not cue count | QA-only 300/600-second packet replay passed both sizes |
| Five-minute one/500-cue cases | Public duration gate retained | 300 / 1,199 packets respectively, per size |
| Ten-minute one/500-cue cases | Public duration gate retained | 600 / 1,399 packets respectively, per size |
| Malformed, empty, bad timing, >500 cues, excess text/file size | Rejected by focused tests | No fake MP4 output |
| Cancel during preflight / encoding, then render again | Mock-adapter lifecycle tests pass, including cleanup | Actual browser cancellation latency/resources remain unverified |

**Probe method, limits and actual output:** `probe-long-mp4.mjs` reuses owned H.264 keyframes from the previously downloaded and decoded `video (1).mp4` and `video (2).mp4`. It exercises the **current renderer's control flow and real Mediabunny muxer**, substituting a canvas/encoder adapter that replays those frame bytes at the requested times. The QA-only plan bypasses the duration gate; public input validation does not. Fourteen output files were written, independently reopened, and checked for ftyp, one AVC video/no audio, expected dimensions, total duration, front metadata, every keyframe timestamp/duration (within 0.01 ms), and exact caption/blank packet bytes at every interval, including the last cue. These are real H.264 packet containers, **not fresh browser text rendering or encoding, and not playback/seek/decode proof**. Unchanged caption imagery is deliberately reused; this cannot establish absence of newly encoded frozen/corrupt frames.

Evidence and reproducible fixtures: `artifacts/mp4-duration-qa/evidence.json`, matching `.mp4`/`.srt` files. The 500-cue files at 2/5/10 minutes were **8,361,268 / 9,289,788 / 10,837,312 bytes** at 480p and **11,296,119 / 12,550,739 / 14,641,763 bytes** at 720p. Native replay/mux took 3–85 ms per case in this run; **these are not encoding speeds, browser memory measurements or ETAs**. Reservations add some metadata space; output remains compatible with native demuxing and front-metadata checks.

```powershell
node artifacts/probe-long-mp4.mjs "$env:USERPROFILE/Downloads/video (1).mp4" "$env:USERPROFILE/Downloads/video (2).mp4"
node --test tests/subtitle-video.test.mjs tests/mp4-render.test.mjs tests/format-conversion.test.mjs
```

Focused MP4/planning/discovery checks: **23 passed** (14 planning + five lifecycle + four discovery). Combined focused UX/MP4 checks: **39 passed / seven suites**. Final full regression: **575 passed / 67 suites**; lint, non-incremental typecheck and production build passed (31/31 static entries). See `ux-mp4-{full-tests,lint,typecheck,build}.log` for final logs. Existing 16 public tools, two AI previews, Source Window and discovery counts are unchanged. No new dependency, browser retry, deployment, commit or push.

### Why the duration cap remains / exact manual QA

The allowed CLI has no `VideoEncoder` or `OffscreenCanvas`; FFmpeg/ffprobe/Python are not available on PATH. Per instruction, the failed browser integration was not retried and no alternate controller/headless browser was installed. Native packet replay demonstrates that muxing itself has no two-minute barrier, but cannot establish reliable fresh five/ten-minute WebCodecs encoding, actual text fit, playback/seeking or device memory. **Only the previous 5.5-second browser render was independently played/decoded; the retained 120-second cap is the existing configured policy, not a newly proven end-to-end maximum.** Fresh playback of the reserve-layout output also remains pending. Removing or raising the gate from these probes alone would overstate the evidence.

1. With `npm.cmd run dev`, open the existing SRT to MP4 tool in supported Chrome/Edge on localhost/HTTPS. Use `tests/fixtures/conversions/video.srt`, then `artifacts/mp4-duration-qa/120s-1cues.srt` and `120s-500cues.srt`. Render both 480p black and 720p white. Record browser/device, elapsed rendering time and browser memory before/during/after. Confirm all cues and full 120-second duration.
2. Download and reopen **new actual browser files** in an independent player. For the single-cue case verify blank frames through 118.999 s and the Unicode/multiline caption at 119–120 s. For 500 cues verify the first cue at 0 s, blank at .121 s, alternating captions throughout, and the final caption at 119.999 s. Seek repeatedly forward/backward and play to ended; inspect for frozen/corrupt frames and missing final captions. For baseline video.srt use the existing `artifacts/mp4-browser-qa.html` harness and its .25/1/2.75/4 s checks.
3. Upload `300s-1cues.srt`, `300s-500cues.srt`, `600s-1cues.srt` and `600s-500cues.srt`: public input must still report the true duration, never blame valid cue count or alter timing. To qualify a larger cap, use an **isolated QA-only working copy** with `MAX_VIDEO_DURATION_MS` temporarily set to 300000, then 600000, and corresponding limit-label/test expectations. Do not publish that copy. Render all four files through the actual workspace at both resolutions, repeat cancel/render cycles and independent full-play/seek/frame checks. Compare at least one long-gap single-cue and one dense 500-cue case on intended desktop/mobile devices before promoting any tested maximum. Retain 120000 in the main workspace until this evidence passes.
4. Cancel during fit checking/rendering; confirm no late media/download appears, then render successfully again. Test malformed.srt, empty, invalid/reversed timestamps, 501 cues, >10 MB and long filenames. Confirm reset/replacement/settings invalidation, correct `.mp4` filename, accessible progress/errors and no media upload. Check light/dark at 320/768/desktop using the existing interface.

---

## Historical initial Format Conversion batch

The remaining tools were addressed in the requested order. The six existing converters were protected. No commit, push, Timing & Editing work or Caption Generation work was performed.

| Tool | Focused tests | Executed Chrome QA | Saved output |
| --- | ---: | --- | --- |
| VTT to TXT | 11 | transcript/settings fixtures, lines/paragraph, native clipboard, replacement, malformed error, reset/focus, keyboard, light/dark, 1440/768/320 | transcript (1).txt: 87 bytes; transcript (2).txt paragraph: 87 bytes; both exact UTF-8 comparisons passed |
| SBV to SRT | 11 | youtube.sbv, malformed timing, replacement/reset, keyboard download, light/dark, three widths | youtube (1).srt: 169 bytes; exact comparison and SRT parsing passed |
| SRT to SBV | 11 | normal/formatted/malformed SRT, styling notice, replacement/reset, keyboard download, light/dark, three widths | normal (1).sbv: 145 bytes; exact comparison and SBV round trip passed |
| SRT to MP4 | 10 | real render/progress/player/download, two output sizes/backgrounds, settings invalidation, malformed replacement, cancel/reset/focus, keyboard, light/dark, three widths | video (1).mp4: 91,719 bytes at 854×480; video (2).mp4: 125,827 bytes at 1280×720; both decoded and played to end |

Downloads are under `C:/Users/Awais Javeed/Downloads/`. Native Chrome adds collision suffixes; the actual application-suggested filenames are transcript.txt, youtube.srt, normal.sbv and video.mp4. Earlier unsuffixed files predated this run and were not used as new evidence.

The production build at http://127.0.0.1:3002 also rendered, played through 5.5 seconds and downloaded video (3).mp4 (91,719 bytes); its H.264 track, dimensions, duration and samples passed disk verification. Production Subtitle Tools renders exactly ten Format Conversion cards. /tools reports 16 free tools, six Timing & Editing and ten Format Conversion tools. Unique titles/descriptions, one H1, breadcrumbs and related routes are present. Sitemap logic has 23 content URLs when SITE_URL is configured; actual production origin remains unset.

## Commands and reproducible evidence

Final results: all converter-related tests **149/149**, full suite **513/513 in 56 suites**, lint PASS, explicit `tsc --noEmit --incremental false` PASS, production build PASS (28/28 static generation). Logs: format-converter-tests.log, format-full-tests.log, format-lint.log, format-typecheck.log and format-build.log in this directory. A final category/FAQ wording correction received focused lint and a rebuilt production artifact; the full suite was not repeated unnecessarily.

PowerShell:

```powershell
node artifacts/verify-format-download.mjs txt "$env:USERPROFILE/Downloads/transcript (1).txt"
node artifacts/verify-format-download.mjs txt "$env:USERPROFILE/Downloads/transcript (2).txt" paragraph
node artifacts/verify-format-download.mjs srt "$env:USERPROFILE/Downloads/youtube (1).srt"
node artifacts/verify-format-download.mjs sbv "$env:USERPROFILE/Downloads/normal (1).sbv"
node artifacts/verify-subtitle-mp4.mjs "$env:USERPROFILE/Downloads/video (1).mp4"
node artifacts/verify-subtitle-mp4.mjs "$env:USERPROFILE/Downloads/video (2).mp4" video.srt 1280 720
node artifacts/verify-subtitle-mp4.mjs "$env:USERPROFILE/Downloads/video (3).mp4"
node artifacts/format-bundle-check.mjs
```

The MP4 verifier demuxes the actual disk file, checks ftyp/H.264, one video/no audio, dimensions, total duration, nonempty keyframe samples and each sample timestamp/duration against the SRT timeline with <0.01ms tolerance. Default MP4 timescale introduces only a few microseconds of rounding.

The independent browser harness in `mp4-browser-qa.html` opens actual downloaded media using a file picker. Its four decoded-frame checks are:

| Time | Expected | 480p differing pixels | 720p differing pixels |
| --- | --- | ---: | ---: |
| 0.25s | blank lead-in | 0 | 0 |
| 1s | first Unicode/multiline caption | 4,264 | 7,767 |
| 2.75s | blank gap | 0 | 0 |
| 4s | wrapped second caption | 11,273 | 19,421 |

Both saved files passed margin/clipping checks and actual playback to `ended` at 5.5 seconds. To reproduce, temporarily copy the harness into public/__format-qa.html, visit that local URL, choose the saved video, then press Play downloaded MP4 to end. Remove the public copy afterward; the temporary public copy used in this run was removed before the final build.

## MP4 architecture and scope

Canvas → WebCodecs H.264 → Mediabunny MP4 muxer → in-memory Blob. Encoding is entirely local. Runtime dependency: exact mediabunny 1.61.3, already present in the pending workspace and retained after checking its installed API and compatibility. The production library chunk is **221,905 bytes raw / 58,068 bytes gzip**, absent from initial MP4 HTML script references and imported on Render. No WASM encoder, server/API/database, external media processing or audio generation was added.

Only 480p/720p and black/white backgrounds are offered. Limits: 10 MB SRT, 500 cues, a two-minute timeline, 2,000 characters per cue, and text that fits the frame at the allowed default sizes. Gaps begin at zero and last through the largest cue end. Overlaps display together in source order. Explicit lines remain; long words/CJK/emoji wrap by grapheme. Available OS/font glyphs determine Unicode display. SRT styling/positioning becomes the default style with notice. Unsupported H.264/HTTPS environments and impossible text fits produce errors; there is no fallback fake MP4.

Sources checked: [YouTube's basic SBV format](https://support.google.com/youtube/answer/2734698?hl=en), [Mediabunny media sources](https://mediabunny.dev/guide/media-sources), [supported formats and codecs](https://mediabunny.dev/guide/supported-formats-and-codecs), installed Mediabunny types/source and version-matched installed Next documentation.

## Exact remaining manual QA

These are additional release checks beyond the representative Chrome evidence above:

1. In intended Edge/Safari/Firefox versions on a real HTTPS deployment, upload each matching fixture from tests/fixtures/conversions. Download and reopen the outputs. For VTT TXT, test both modes and clipboard permissions; for SBV, confirm YouTube import if that platform is a release target.
2. In each target browser, open SRT to MP4 with video.srt. Render both 480p black and 720p white. Check Chinese/Arabic glyphs and multiline wrapping, blank 0–0.503s lead-in, blank 2.507–3.003s gap, 5.500s end, and playback/seeking in an independent player. An unsupported encoder must show the explained error and no Download MP4.
3. Render video-limit.srt and cancel while progress is visible. Confirm no late video/download returns and upload focus is restored. Render again, change a setting, replace with malformed.srt and reset; previous media must disappear each time.
4. On real tablet/mobile devices in both themes, complete upload through download using touch, including a long filename and populated/error states. Keyboard users should reach upload, output mode/settings, Copy/Render/Download and Start over. Check screen-reader announcements for ready/errors/progress and visually inspect focus/contrast.
5. After supplying the real SITE_URL, rebuild and verify self-canonicals, social URLs, robots sitemap pointer and all 23 sitemap content URLs. No invented domain was configured.

Known broader release blockers remain: real production origin, Source Window factual media/product/install/support details, Help/Privacy operator/hosting/contact facts, original-tool complete acceptance (including native editor refresh/close), clean install/target host reproduction, and broader browser/device/screen-reader/player testing. No technical blocker remains for the four scoped converters in the proven Chrome environment.

Next category: **Caption Generation — not started. STOP.**
