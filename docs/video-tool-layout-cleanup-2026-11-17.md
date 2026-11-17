# Public video tool layout cleanup

The six compression pages were published and verified live in commit
`7454429` on 17 November 2026. All six normal public URLs returned 200;
directory, menu, search and sitemap entries worked. Live MP4 and JPEG downloads
were checked, including video frame count, duration and original audio packets.

The owner then requested cleaning up Green Screen Remover and other public
tools with the same promotional layout, followed by publication to both
repositories. This follow-up covers Free Green Screen Remover, Video Compressor
and Video Cropper. The remaining subtitle tools already use the clean shared
layout; existing transcription/caption editorial pages are outside this change.
Eye Contact and other development previews are not promoted.

## Changes

- Reused the same shared media-page layout, actual tool names, orange title
  accents, one-sentence introductions, compact artwork and centered uploads.
- Show settings after choosing a video, using a plain Settings heading and
  direct screen-removal/background/export group names.
- Kept green/blue selection, key refinements, all preview modes, backgrounds,
  4K options, PNG frames, sample actions and export handlers. Sample buttons
  now share one compact row; native color pickers and sliders retain their
  own appearance inside the shared tool-page styling.
- Retained crop ratios, draggable frame/edges, pixel fields, undo, sound and
  export controls. Compression modes and media algorithms are unchanged.
- Preserved canonical URLs, metadata, detailed FAQs, technical limits and
  all unrelated public/development access restrictions.

## Verification

All 1,022 tests and TypeScript passed. Scoped ESLint reported no errors.
Chrome verified empty and loaded layouts at 1440, 900, 768, 390 and 320px in
both themes without horizontal page overflow. Actual downloads: general
compression 197,125 bytes, square crop 394,740 bytes, green-screen sample
export 268,080 bytes. Green-screen PNG preparation produced a 29,734-byte
frame. No old transcription or large 4K benchmarks were repeated.

Browser logs, screenshots and output files remain ignored under
`artifacts/browser-connection-2026-11-17/`. Final production and live checks
must accompany the authorized pushes; a GitHub update alone is not deployment
confirmation.
