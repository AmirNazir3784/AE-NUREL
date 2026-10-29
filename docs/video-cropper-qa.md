# Video Cropper — completed local tool

Completed on 29 October 2026 on `dev/tools-completion`. Next tool selection belongs to the owner; do not start another tool automatically. Green Screen Remover is unfinished and outside this change.

## Scope and implementation

- Local URL: `http://localhost:3000/tools/video-cropper`.
- Reuses the installed Mediabunny 1.61.3 library and the compressor's media inspector, input limits and shared visual styles. No new dependencies, paid services, upload endpoint or processing infrastructure.
- Free, 9:16, 1:1, 4:5, 16:9 and 3:2 framing; exact preset ratios with even pixel dimensions; draggable frame and four corner handles; keyboard movement/resizing; committed numeric X/Y/width/height controls; centering, undo and full-frame reset.
- Original playback and seeking, live cropped-frame canvas, actual exported-file playback, MP4/H.264 or WebM export, optional audio, and shorter-edge resolution limits without upscaling.
- Export uses the displayed source coordinates after input orientation, then scales to the displayed output dimensions. The full timeline is exported. Compatible audio is copied; other supported audio is converted. The result is parsed again to check dimensions, duration and audio track count before reporting success.
- Cancellation, replacement and unmount abort work. Operation IDs prevent late results from replacing current state; object URLs are revoked. Changing the crop or export settings invalidates old results.
- Input limits remain 500 MB, 20 minutes, one video track, at most one audio track and up to 4K pixels. Output has a 256 MB memory limit. Browser codec availability varies; failures are reported. Cropping re-encodes the video and is not lossless. Embedded subtitles, descriptive metadata and HDR/color preservation are not guaranteed.
- Development directory entry only. Normal production returns 404 and has no directory/sitemap listing. `AENURAL_VIDEO_TOOLS_QA=1` enables a local optimized-build QA route, still `noindex, nofollow`. This flag is not a production release instruction.
- Owner's wording preference: progress says “Cropping, please wait…”; product copy focuses on framing and preserving the original, without explaining where processing runs. The underlying local implementation is unchanged.

## Competitor inspection

Inspected `https://caption-x.com/video-cropper` and loaded the public Source Window demo. Observed Free, 9:16, 1:1, 4:5 and 16:9 presets, movable/resizable framing, a thirds grid, and a Crop video action with progress/cancellation. Its displayed 9:16 crop for the 1920 × 1080 clip was 608 × 1080. Our exact-ratio crop is 594 × 1056. Added numeric geometry, keyboard controls, undo, centering, independent crop preview and explicit export/audio controls. No comparative speed or quality claim is made.

## Verification performed

1. Real browser MP4 export of `public/videos/source-window-feature.mp4`: **2,612,789 bytes, 594 × 1056, 33.133333 seconds, one AAC audio track**. Downloaded and independently reparsed using Mediabunny outside the browser.
2. Same source to silent WebM with the 480p short-edge cap: **2,082,208 bytes, 468 × 832, 33.1 seconds, zero audio tracks**. Downloaded and independently reparsed. The 468-pixel width keeps the exact 9:16 ratio with even dimensions.
3. Deterministic 640 × 360, 1.958-second VP9/WebM fixture with red/green/blue/yellow quadrants. Set Free crop to **X=320, Y=180, width=320, height=180** using numeric inputs. Exported MP4 was **2,257 bytes, 320 × 180, 1.958003 seconds, no audio**. Reopened the actual download in an independent native-video/canvas QA page, played it, then sampled four interior corners and the center. All five decoded samples were **RGBA [254,255,0,255]**, confirming the exported area is the selected yellow bottom-right quadrant. QA fixture and generated media remain ignored under `artifacts/` or in Downloads.
4. Actual pointer drag moved the frame from (160,90) to (205,117). Corner drag resized 320 × 180 to 280 × 146. Keyboard movement changed X by one pixel; locked-ratio corner keyboard resizing produced 180 × 320. Undo, centering, preset changes and numeric edits were exercised. Crop changes removed the stale result/download.
5. Cancelled an export and confirmed original/crop retained without a success result. Invalid HTML replacement produced a supported-format error and retained the valid source. Same-file replacement remained usable.
6. Loaded layouts at actual browser widths **320 and 390**: document scroll width equaled client width (305 and 375 respectively, excluding the scrollbar). Inspected the narrow framing stage, wrapped transport, numeric controls and 44px corner hit areas. Started and completed a real small-fixture export from the mobile layout. This is responsive desktop-browser testing, not physical phone/touch testing.
7. Tested optimized `next start` build with local QA flag: HTTP **200**, `noindex, nofollow`; actual 198 × 352 fixture MP4 export completed. Ordinary production without the flag: cropper **404**; sitemap **200**, `application/xml`, **26 URLs**, no cropper URL.
8. Browser error/warning logs were empty for cropper tests. Current system dark appearance was visually inspected. Forced light preference, forced reduced motion, physical mobile devices, rotated/HDR fixtures, and the maximum input sizes were not exercised.

## Automated checks

- `npm.cmd run build`: passed, including TypeScript.
- `npm.cmd run typecheck`: passed.
- ESLint for new cropper files and test: passed without warnings. Full lint had no errors and existing warnings (the earlier full run began on the separate design branch before returning to this branch).
- Focused crop geometry, development discovery and sitemap tests: **14 passed**.
- Full suite: **927 tests, 924 passed, 3 failed**. The same pre-existing failures remain in `tests/studio-highlighting.test.mjs` at lines 67, 98 and 108; they concern premium caption controls and are unrelated to this tool.

## Publication boundary

Publish this change only to `faisalhere-afk/aenural-website` (`origin`), on `dev/tools-completion` and the existing development mirror `main`. Do not touch the separate design branch or synchronize its unfinished green-screen work. Do not push, merge or deploy to `AmirNazir3784/AE-NUREL` (`hostinger`). Production release waits for the owner's final authorization after tool completion.
