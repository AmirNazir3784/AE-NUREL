# AENural — browser tools and caption products

AENural is a Next.js 16 / React 19 / TypeScript site with browser-based subtitle utilities, an in-development Auto Caption Generator, an in-development audio transcription product and a Source Window product page. **Not every tool in this repository is released or safe to expose publicly.**

## Development branch and release safety

- Current tool-completion development: work locally on `dev/tools-completion`; publish completed work only to `faisalhere-afk/aenural-website` (`origin`). Complete and browser-test each tool's design, content and functionality before moving to the next.
- The synchronized AmirNazir `main` baseline is the starting point. During this development phase, do not copy unfinished development work back into production.
- Separate production Hostinger repository: `AmirNazir3784/AE-NUREL`. **Do not push, merge, deploy or synchronize it without explicit approval and verified release checks.**
- Existing local Codex changes might not be pushed. Before syncing, always inspect the local branch, remotes and working-tree diffs; avoid reset/forced checkout/automatic overwrite.

## Local setup

Use a supported modern Node.js runtime (Node 24.21.0 is the user's reported development runtime). From the repository root:

```sh
node --version
npm ci
npm run dev
```

Open `http://localhost:3000`. `npm ci` uses the committed lockfile; first preserve any unusual local dependency modifications. Optional private settings live in a local, ignored `.env.local`; **never commit secrets**. Do not enable hybrid processing until its separate development-only runbook is reviewed.

### Required validation before signing off changes

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Run and report these against the *actual local or CI checkout*, including commit SHA and any warnings. Passing a parser-only or mock integration fixture is not the same as passing these commands. For changes to UI, also check real Chrome on desktop/mobile, reduced-motion behavior, focus/keyboard navigation, and browser console; for deployments, test a fresh public browser and network requests. An unavailable test is reported as **NOT RUN**.

## Code organization

- `src/app`: Next.js routes, layout, sitemap and page metadata; development-only routes are deliberately gated.
- `src/lib`: released free-tool registry, processing/validation utilities, subtitle parsing and export logic.
- `src/components/site`: shared navigation, menus, search, footer and **nonfunctional** development account preview.
- `src/components/tools`, `src/components/home`, `src/components/ui`: reusable tool directories, cards, media and UI.
- `src/features/caption-studio`: video upload/inspection, caption generation, editing, styles, player and local export. This is **not** a released paid service.
- `src/features/local-asr`: local transcription and related browser speech infrastructure.
- `src/features/srt-*` and related features: free subtitle editing, timing, split/merge and conversion.
- `server/hybrid` and `src/app/api/dev/hybrid`: opt-in *development-only* private CPU QA processing; never a public cloud transcription API without new security/scale architecture.
- `tests`: Node test runner suites and specialized integration fixtures; `scripts/prelaunch` contains development verification scripts.
- `docs`: engineering checkpoints, product decisions and detailed domain-specific runbooks.

## Product release boundaries

- Released free utilities come from `src/lib/tools.ts`.
- Auto Caption Generator (`/tools/auto-caption-generator`) and Audio to SRT/VTT (`/tools/free-subtitle-generator`) are currently development-only routes/previews and must not be falsely promoted as public subscription products.
- `src/components/site/auth-preview-modal.tsx` demonstrates sign-in form UI only. **No real accounts, sessions, billing, per-account quotas or paid access controls are implemented yet.** Do not accept real customer credentials into the preview.
- **Approved future free-plan policy:** Auto Caption Generator allows **3 videos total per free account** with a 60-second limit and watermarked exports. Its processing/billing semantics and secure server-side enforcement remain to be specified and implemented. Premium features must not be protected only by UI.
- Existing `docs/aenural-auth-architecture.md` proposes Hostinger-managed MySQL + Better Auth for AENural; feasibility and database access are not confirmed. No schema change without explicit approval.
- For public release check indexing/canonicals/metadata, customer messaging, privacy, server headers and performance on real hosting.

## Maintenance and progress

- **Roadmap and approved product decisions:** [docs/aenural-master-roadmap.md](docs/aenural-master-roadmap.md)
- **Latest resume point:** [docs/aenural-release-checkpoint.md](docs/aenural-release-checkpoint.md)
- **Phase 0 security findings:** [docs/aenural-phase0-security-audit.md](docs/aenural-phase0-security-audit.md)
- [Account architecture](docs/aenural-auth-architecture.md)
- [Local hybrid processing runbook](server/hybrid/README.md)
- [Caption Studio overview](docs/caption-studio.md)

Update the checkpoint at each validated milestone: commit, changed files, test evidence, unfinished risks and next small action.

## SRT Timing Adjuster — current utility contract

SRT processing is performed locally. Files are validated for supported size, timestamp syntax and encoding. The adjuster can move timestamps earlier/later, preserves meaningful cue text, provides a preview, and exports the result. Review exported timing before using it with a video. Refer to the implementation and tests rather than this overview for authoritative numeric limits.


### Historical detailed SRT contract (retained from initial README)

> The following notes were inherited from the early ToolSuite README. Revalidate against current implementation and tests before treating limits as release guarantees.

#### Original SRT behavior notes

All file reading and processing takes place in the browser. No upload endpoint, backend, telemetry, external fonts or file persistence is used. Downloads are UTF-8 SRT files. UTF-8 and BOM-marked UTF-16 inputs are supported. File size is limited to 10 MB to keep browser processing responsive.

Cues must contain a numeric identifier, valid timestamps and subtitle text, with blank lines between cues. Multiline text, original numbering, spacing, markup and original line endings are preserved. Standard SRT coordinate suffixes are supported. Invalid cues reject the whole file rather than silently removing content.

Offsets support positive/negative seconds with up to three decimal places. Timestamps before zero are clamped to zero, with an explicit warning; fully clamped cues can have zero duration. Offsets or results beyond `99:59:59,999` are rejected. Zero offset preserves the source text exactly. Preview shows the first three cues; download includes every cue.

Each successful upload or replacement starts a fresh session at offset `0` and clears previous messages. Start over clears the file, preview, offset, download state and messages. Progress reflects upload, valid output readiness and the download action.
