# Compression tools: local review handoff

Completed local implementation and functional checks: 2 November 2026.
Branch: dev/tools-completion; baseline ecbb757. No push or deployment.
The owner's local review hold remains in force.

## Competitor-first workflow

Before planning each tool, its corresponding CaptionX page was opened and used
with public demo material. Specific observations and design decisions are in
[compressor-competitor-research.md](compressor-competitor-research.md).
MP4 implementation initially started before research; this was paused when
the owner corrected the sequence. Competitor use and planning preceded further
MP4 refinement and each subsequent tool. Do not repeat this workflow mistake.

Do not claim all features or output quality are superior: only observed feature
differences are established. In particular, ProRes is not supported by the
AENural MOV tool, while CaptionX advertises it (not independently tested).

## Local routes and measured outcomes

| Tool | Route | Local functional evidence |
| --- | --- | --- |
| Compress MP4 | /tools/compress-mp4 | Same public demo: 3,450,397 -> 1,666,287 bytes, 1280x720, sound retained |
| Reduce Video File Size | /tools/reduce-video-file-size | Motion fixture: 26,765,487 -> 594,611 bytes, 852x480, sound retained |
| WhatsApp Compressor | /tools/compress-video-for-whatsapp | User-adjustable budget tested at 1 MB: 951,880 bytes, 1280x720, sound retained |
| MOV Compressor | /tools/mov-compressor | Genuine H.264/AAC MOV: MP4 output 208,638 bytes at 1280x720, sound retained |
| Compress Image to 20KB | /tools/compress-image-to-20kb | PNG 321,820 bytes at 1920x1080 -> JPEG 19,944 bytes at 629x354 |

All listed downloaded video outputs and the JPEG independently decoded with
FFmpeg without errors. Do not treat these examples as all-codec reliability
or visual-quality proof. The short MOV was remuxed from the public Source Window
demo; the large motion fixture is public government footage. No private clip
was uploaded to CaptionX. No paid API, dependency or processing service added.

## Architecture

Four video pages share the existing compression pipeline, cancellation,
measured size enforcement, audio checks and optional retry. Profiles configure
input acceptance/defaults, output format and presentation. MP4/WhatsApp/MOV
lock H.264 MP4 output; reducer offers MP4/WebM. General and fixed-10MB workflows
retain their settings. Dedicated editorial content clarifies task limitations.
Do not add separate algorithm copies for future compressor variants.

The image workspace uses native raster decode and canvas encoding with a
tested async quality search and optional progressive dimension reduction.
Source header checks cap file size/pixels before decode. It accepts still
JPEG/PNG/WebP/BMP; rejects animated PNG/WebP, GIF, SVG and invalid files.
JPEG flattens transparency to a chosen white/black background; WebP preserves
alpha. Output is decoded and measured again before download. Decimal KB are
explicit; no padding. Original already-small images can be downloaded intact.
When resizing is allowed, moderate encoding quality is favored over keeping
more pixels at very low quality. Fixed dimensions allow lower quality but fail
honestly if still over budget. Original camera metadata is not copied.

Image checks: transparent fixture -> 784-byte WebP; independently decoded RGBA
corner alpha=0 and opaque center=255. A 1 KB fixed-dimension request correctly
failed without a download. Cancellation on a 14 MB noisy image remained
canceled, with no late result. JPEG/WebP format switching and source replacement
were exercised. A tiny conversion may finish before cancellation takes effect.

## Validation and release hold

- All 968 automated tests pass (including new profile contracts, header parsing,
  measured budget fitting, resize/failure and abort tests).
- Scoped ESLint and optimized webpack build with TypeScript pass.
- All five pages checked at requested 390px viewport: actual client and scroll
  widths both 375px, no horizontal overflow. Override reset afterward.
- Existing desktop theme/header preserved; no header design edits.
- All five routes remain development-only and noindex. Listed in development
  directory; image card has its own conditional Image Tools section. Public
  registry/category lists and sitemap remain released-only.
- Production release-check server returned 404/noindex for all five previews,
  200 for existing compressor and sitemap, with none of the five URLs present
  in that sitemap. This tests the hold, not public availability.
- Development console has a hydration warning showing a third-party Chrome
  extension inserted its popup script before the site's history-init script.
  No site-level suppression or extension-settings changes were made to hide it.
- Logs/screenshots/fixtures are ignored under artifacts/tool-completion.

## Owner review and eventual release

Owner reviews visual quality and page design. Await explicit push instructions
before promoting routes, metadata, public registry, sitemap and shared menu
data. Preserve the latest user-designed header and both repositories' remote
work. Do not publish Eye Contact or caption previews as a side effect.
Do not silently claim universal WhatsApp limits or eliminate ProRes/HDR/alpha
limitations through wording. General browser codec support still applies.
