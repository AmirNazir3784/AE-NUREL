# Compress to 10MB — local review

Implemented 2 November 2026. Local route: `/tools/compress-video-to-10mb`.
Listed in the development tool directory only. No push or deployment authorized
under the current review hold; production route remains 404/noindex and absent
from the sitemap. Preserve the redesigned header until release integration.

## Implementation

The existing VideoCompressor accepts an optional `tenMB` presentation flag.
It initializes and locks target mode at 10 decimal MB (10,000,000 bytes).
General compressor defaults, modes, algorithm and audio behavior are unchanged.
Both use the existing measured-size enforcement and at most one lower-bitrate
retry; an oversized result is never reported as successful. No dependencies.

Dedicated hero, fixed-budget panel, exact measured bytes and remaining room,
format/resolution/audio controls, result preview and task-specific FAQs.
Already-small inputs offer an original download to avoid needless quality loss.
Shared stylesheet preserves AENural theme, responsive layout and focus states.

## Verification

- Real public-motion input: 26,765,487 bytes, 1280x720, eight seconds with AAC.
  Dedicated MP4 output: 9,517,732 bytes, 64% smaller, sound retained.
  Downloaded output independently decoded successfully with FFmpeg.
- 3840x2160 one-second fixture: WebM output 425,239 bytes, sound retained,
  independently decoded. Fixture is upscaled public government footage for
  dimensions/codec testing, not a native-4K quality benchmark.
- Already-small source message and original-download link verified.
- Mobile: requested 390px viewport, client/scroll widths both 375px; no overflow.
- Scoped ESLint and TypeScript passed; optimized webpack build passed.
- Added component-contract tests for locked budget and preserved general mode,
  plus a long-audio budget test that rejects impossible sound-retaining settings.
- Production checks: new preview 404/noindex; public sitemap 200 without preview;
  existing Video Compressor 200. No old tool export checks repeated.

QA logs, fixtures, downloads and screenshots are ignored under artifacts.
Owner review and explicit push instructions remain required before publication.
When approved, promote route metadata/registry and integrate the new header
through its shared tool data; do not publish other unfinished previews.
