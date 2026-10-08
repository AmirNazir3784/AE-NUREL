# ToolSuite

A Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 utility platform. The first tool is **SRT Timing Adjuster** at `/tools/srt-timing-adjuster`.

## Development

```sh
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Tests use Node's built-in runner and TypeScript stripping (Node 22.18+ or Node 24 recommended). No additional test dependencies are required. The UI uses a system font stack; builds do not need to download web fonts. On Windows with PowerShell script restrictions, use `npm.cmd`.

## Organization

- `src/app`: routes, metadata and global shell.
- `src/components/site`: shared header, search and footer.
- `src/components/tools`: reusable tool layout, upload, download, privacy and related-tools UI.
- `src/components/ui`: shared icons and status messages.
- `src/features/srt-timing-adjuster`: tool-specific controls and preview.
- `src/lib/srt.ts`: pure SRT parsing, validation and timestamp adjustment.
- `src/lib/tools.ts`: available-tool registry used by the homepage and search.
- `tests/srt.test.mjs`: parser, encoding, validation and timing tests.
- `tests/srt-session.test.mjs`: fresh-upload, replacement, reset and progress regressions.

Design tokens are centralized in `src/app/globals.css`. Add future tools to the registry and compose the shared components; future categories currently display Coming soon.

## SRT behavior

All file reading and processing takes place in the browser. No upload endpoint, backend, telemetry, external fonts or file persistence is used. Downloads are UTF-8 SRT files. UTF-8 and BOM-marked UTF-16 inputs are supported. File size is limited to 10 MB to keep browser processing responsive.

Cues must contain a numeric identifier, valid timestamps and subtitle text, with blank lines between cues. Multiline text, original numbering, spacing, markup and original line endings are preserved. Standard SRT coordinate suffixes are supported. Invalid cues reject the whole file rather than silently removing content.

Offsets support positive/negative seconds with up to three decimal places. Timestamps before zero are clamped to zero, with an explicit warning; fully clamped cues can have zero duration. Offsets or results beyond `99:59:59,999` are rejected. Zero offset preserves the source text exactly. Preview shows the first three cues; download includes every cue.

Each successful upload or replacement starts a fresh session at offset `0` and clears previous messages. Start over clears the file, preview, offset, download state and messages. Progress reflects upload, valid output readiness and the download action.
