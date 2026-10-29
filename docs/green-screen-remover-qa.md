# Free Green Screen Remover — rebuilt and verified

29 October 2026. Local route: `http://localhost:3000/tools/free-green-screen-remover`. Built from the completed compressor/cropper baseline on `dev/tools-completion`; the unfinished implementation on the separate design branch was not imported or changed.

## Implementation and product scope

- Reuses installed Mediabunny 1.61.3, the existing video inspector/limits, and shared page styles. No new packages, paid APIs, services, models, uploads or processing infrastructure.
- Green, blue or custom screen color; automatic border-color detection and click-to-sample; removal strength, soft alpha edges, green/blue spill suppression and reset.
- Original, Result, Matte and checkerboard Cutout views; playback, seeking and preview muting. Hex fields and keyboard-operable range controls complement mouse color sampling.
- Solid color, static/animated two-color gradient, gradient presets, and PNG/JPEG/WebP image backgrounds. Cover/contain fitting with a padding color; background image limits: 20 MB, 24 MP, neither edge over 8192 pixels.
- Original-size and explicit 4K/UHD output, plus 1080p/720p/480p. UHD 3840 × 2160 and DCI 4096 × 2160 input, including portrait equivalents; Original size preserves accepted source dimensions, never upscaled. 640 × 360 and true 3840 × 2160 original sample clips can be generated and downloaded from the tool. The shared inspector's DCI limit also applies to the completed compressor and cropper.
- MP4/H.264 and WebM/VP9 (VP8 fallback if needed); full timeline, copied compatible AAC/Opus audio or deliberate muting. Other supported audio can be converted. Track, duration and dimension validation runs on the completed file before success is shown.
- Full-resolution PNG frame downloads can preserve transparency. Video exports deliberately include the chosen background and are not advertised as transparent video.
- Export uses a WebGL fragment shader when available, with the same chromaticity/soft-alpha/spill math as the CPU preview/reference. A 2D fallback handles unavailable/unsupported graphics initialization. Shader/texture resources and temporary object URLs are released. Abort signals and operation IDs protect cancellation, replacement and unmount.
- User-facing progress says “Removing screen, please wait…” and does not describe the processing location.
- Input: at most 500 MB, 20 minutes, 4K pixels, one video and at most one audio track. Output: 256 MB. Encoding availability and performance vary by browser/device. This is color-based chroma key, not semantic/AI person segmentation. Matching clothing can be removed; challenging hair, blur, uneven lighting, HDR/color and embedded subtitles are not guaranteed. See the page FAQs.

## Competitor inspection

Browser-tested `https://caption-x.com/green-screen-remover` using the original, generated, non-personal 640 × 360 sample. Observed automatic screen detection, a color sampler, original/result toggle, strength, edge softness, spill removal, solid/gradient/image backgrounds, optional animated gradients, and MP4 export. Its completed sample reported 640 × 360 and approximately 184 KB. No general comparative speed/quality claim is made.

The rebuilt AENural tool adds explicit matte/cutout inspection, transparent PNG frames, image fit/padding choices, hex entry, downloadable sample clips including 4K, independent format/resolution/audio controls and validated downloadable output. It uses the site's own visual system and original help content.

## Real browser and downloaded-file evidence

Files were downloaded through the UI, reparsed independently with Mediabunny in Node, and reopened in a separate native-video/canvas QA page for decoded-pixel checks. Ignored evidence and helper scripts are under `artifacts/green-screen-remover/`; generated media is in Downloads.

| Test | Actual result |
| --- | --- |
| Green demo → gradient MP4, initial 2D rendering path | 640 × 360, 3 seconds, 404,972 bytes. Gradient corners decoded as approximately [30,47,86] and [108,79,201]; face [254,209,176]; shirt [37,60,113]. |
| Transparent PNG | 640 × 360. Background samples RGBA [0,0,0,0], face [255,209,174,255], shirt [38,60,114,255]. |
| **4K input → 4K MP4**, final accelerated path | **3840 × 2160, 3 seconds, 72 frames, 1,785,844 bytes**. Source was 2,040,511 bytes, 72 frames at 24 FPS. No downscale or frame loss. |
| **Optimized-build 4K WebM**, animated gradient | **3840 × 2160, 72 frames, VP9, 1,499,175 bytes**. Native playback duration 3 seconds; packet parser reports 2.958 seconds because its last frame timestamp excludes the final frame interval. All 72 frames remain. |
| **4K transparent PNG** | **3840 × 2160**. Four background probes RGBA [0,0,0,0]; face [255,209,174,255]; shirt [38,60,114,255]. |
| 4K decoded MP4 pixels | Green-gradient background probes [20,53,48], [69,138,108], [32,72,63], [60,119,96]; face [255,209,174]; shirt [38,60,114]. All opaque. Subject orientation and chosen background retained. |
| Blue-screen audio fixture → white WebM | 640 × 360; white corners [255,255,255], red subject about [254,0,0]. All 32 source Opus packets copied with identical combined SHA-256. |
| Blue fixture → image background, GPU path | 640 × 360, 69,790 bytes. Contain padding [24,44,78], left image [255,1,0], right image [1,0,255]; red subject retained. All 32 Opus packets still identical to source. |
| Intentionally muted image-background MP4 | 640 × 360, 2.183 seconds, 14,537 bytes; zero audio tracks. |
| Public Source Window clip → MP4, audio/timeline check | 852 × 480, 33.133333 seconds, 4,437,049 bytes. All **1,554 AAC packets** copied with identical combined SHA-256 to the original. This clip was used for audio/timeline checks, not as a claim about key quality on ordinary backgrounds. |

On this PC, the three-second 4K sample initially took 52 seconds using the 2D export path; the final accelerated MP4 export took about 10.2 seconds and optimized WebM took 9.2 seconds. These are individual observed runs, not performance guarantees or a competitor benchmark.

UI checks exercised: sample generation, green/blue selection, Auto-detect, exact hex input, mouse sampling (4K screen sampled as `#00c251`), keyboard range changes, reset, preview modes, animated gradient selection, image loading, contain fit, optional audio, PNG preparation/download, cancellation, and file replacement. Invalid HTML selected as video/background produced the correct error and retained the previous valid source, image and result. Changing key/background/output invalidated stale results.

Responsive checks used actual 320px and 390px browser viewports with a loaded 4K file: document scroll width equaled client width (305/375 pixels, excluding scrollbar). Visually checked the loaded matte and controls; keyboard editing and mouse sampling worked. This was desktop-browser viewport testing, not physical-phone/touch certification. Current dark appearance was inspected. DCI acceptance and original-size geometry were unit-tested; actual exported 4K fixtures were UHD. Forced light/reduced-motion preferences, rotated/HDR footage, difficult real hair and maximum-duration files were not tested.

## Build and release checks

- Build including TypeScript: passed.
- Separate typecheck and focused ESLint: passed. Full ESLint: zero errors, four existing unused-variable warnings outside this tool.
- Keying, geometry, directory and sitemap tests: **15 passed**.
- Full suite: **937 tests, 934 passed, 3 pre-existing failures** in `tests/studio-highlighting.test.mjs` (lines 67, 98, 108), concerning premium caption controls.
- Normal production: tool HTTP **404**; sitemap HTTP **200**, `application/xml`, **26 URLs**, no new tool URL. Development directory includes this tool without changing the public registry.
- Local optimized QA with `AENURAL_VIDEO_TOOLS_QA=1`: tool HTTP **200**, `noindex, nofollow`; real 4K WebM export passed. This flag is for local QA, not release authorization.
- Browser error/warning logs were empty at the end of the tested development and optimized flows.

Publish completed work only to `faisalhere-afk/aenural-website` (`origin`), on `dev/tools-completion` and its existing development mirror `main`. Do not synchronize, merge or deploy to Amir/Hostinger. Wait for the owner to choose the next tool.
