# AENural release checkpoint — resume here
Last updated: 2026-10-21
**Status:** Phase 0 baseline COMPLETE. Phase 1A header/search fixes merged (PRs #2-#4). Local/GitHub reconciliation COMPLETE — one verified tree on `dev/aenural-hybrid` (`d9d9a10`). CI active via GitHub Actions. No production changes or deployment.

## Trusted repositories and working tree
- Development repository: `faisalhere-afk/aenural-website`, branch `dev/aenural-hybrid`.
- Production repository / Hostinger remote: `AmirNazir3784/AE-NUREL` — **hands off until explicit release approval**.
- Inspected development HEAD at start of this phase: `c9743b3197123ca1711a0b64beed94da43edf160`.
- Documentation commits in this phase:
  - `574b24c92a3b31dd495e17ceadf825381c6c2f72`: approved product roadmap, including **3 free videos lifetime per free account**.
  - `466d34c319d858e37cae52d83801ddbeaa0d0119`: preliminary security audit and future paid-release blockers.
  - `01965f65b5c622ef0addaf136f4c2a05e7820b89`: corrected project README and safe development workflow.
  - `42320a7685cbdf9f0a5db0250447ad05826f864b`: preserved early SRT behavior contract in updated README.
- This checkpoint was committed after the above changes. **Local Windows tree NOT inspected this turn**; local Codex edits may differ. Never assume `git status` is clean or merge blindly.

## Approved product requirements
- Auto Caption Generator: free tier **3 videos TOTAL per account**, 60-second per-video limit, exported-video watermark and 5 basic presets; Premium may unlock 25 additional presets, advanced animation, word highlighting, watermark removal and longer videos. Free quota counting semantics and premium duration feasibility **not yet approved**.
- Audio to SRT/VTT/TXT is a **separate** subscription-capable transcription product, not the Auto Caption Generator. Three-mode external screenshots are design/model-strategy references, not implementation evidence.
- Free utilities stay separate and accessible without an account. Source Window is **Coming Soon**. AENural Premium is intended to cover eligible premium products under one account.
- Business based in Pakistan, customers worldwide where provider supports payments; prioritize Visa/Mastercard. Provider, payout eligibility and pricing still pending research and onboarding verification.

## Last verified technical progress
- Three-panel Auto Caption Generator and in-player full-screen controls were visually verified by user on localhost in prior session.
- **Fresh local baseline run 2026-10-21 (user's Windows tree, output shared with assistant; assistant has no direct local access):** `npm run lint` PASS — 0 errors, 2 warnings (unused variable `j` in root helper scripts `aenural_player_controls_exact_sync.mjs` and `aenural_player_controls_sync.mjs`; not app source). `npm run typecheck` PASS — no errors. `npm test` PASS — **869 tests, 869 pass, 0 fail, 113 suites**. `npm run build` PASS — compiled successfully, 31/31 static pages generated. This supersedes the earlier historical 869 figure, which is now freshly confirmed on the local tree. NOTE: these results describe the **local Windows checkout**, which is ahead of this GitHub branch; they do not by themselves verify this branch's code.
- Development source currently contains 30 style presets, Fast/Accurate local transcription and a 120-second media validation limit. These **do not** yet implement the approved free/premium plan.
- Development-only account preview has **no authentication backend**; no payment billing or quota enforcement exists.
- Development hybrid transcription API is gated and **not ready for multi-user production**.
- **Live-site verification 2026-10-21 (assistant, real browser, read-only):** `https://aenural.com/dev/local-transcription` and `https://aenural.com/tools/auto-caption-generator` both return the site's 404 page — dev-only routes are **not** exposed in production, and the Auto Caption Generator page is **not live yet** (live build is older than the local tree). A hosting bot-verification interstitial was observed before the page loaded for the automated browser; recorded as a possible first-visit performance factor to measure in the performance task.

## Phase 0 results and open work
**COMPLETED (review/documentation):**
- [x] Record fixed lifetime 3-video free plan in roadmap.
- [x] Inspect key source, auth-preview, hybrid-service and release-boundary files, as well as package lockfile presence, Git branch metadata and absence of CI workflows.
- [x] Write initial security release-blocker register; note observed safeguards, limitations and unresolved verification.
- [x] Replace outdated root README with current setup and code structure.

**NOT VERIFIED / STILL PENDING:**
- [ ] Inspect user's **actual Windows Git branch, remotes, status and diffs**, and reconcile local Codex changes without destroying them.
- [x] Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` on the current **local** checkout and record fresh outcomes — DONE 2026-10-21, all pass (see Last verified technical progress). Still outstanding: the same checks running automatically on this GitHub branch via CI (item below).
- [ ] Run safe lockfile/dependency vulnerability audit and secret/history scan; verify deployed HTTP headers (without exposing secrets).
- [ ] Add development CI (lint/typecheck/tests/build) and review branch protection/required checks.
- [ ] Validate production/dev route gating under a production build and assess errors / edge cases.
- [ ] Define the exact free-credit charge event, cancellation/retry/idempotency and abuse policy **before** auth/quota implementation; get explicit database changes approval later.
- [ ] Observe real production cold loads, navigation and video range/cache behavior (separate performance task; no production changes yet).

## Exact next small task
**Phase 0B (continued) — local baseline is DONE (2026-10-21, all four checks pass on the local tree). Next: read-only local Git inspection and reconciliation plan.**
From `D:\Work\Tools\online-tools-platform` run and share only the summary (counts and branch/remote names; full file lists only if comfortable):
```cmd
git branch --show-current
git remote -v
git status --short
node --version
```
Purpose: identify exactly which local changes are modified/untracked and how the local tree differs from `dev/aenural-hybrid`, so a safe preservation plan (what to commit, what to keep local, what is a temporary helper script) can be agreed **before** anything moves. Don't pull, merge, reset, switch branches, overwrite or run installers. The next code feature after Phase 0 acceptance is **Phase 1A: header hover-menu dismissal and blank search suggestions**, with focused regression tests.

## Milestone — 2026-10-21: Phase 1A fixes, reconciliation, CI

- PR #2 (merged, `f714dfe`): navigation dropdown 300ms close-grace (Issue #1); search no longer lists all tools on an empty query (Issue #7 core).
- PR #3 (merged, `5bd2d50`): search dialog replaced by the approved dropdown panel under the search icon (new `src/components/site/header-search.module.css`).
- PR #4 (merged, `84b29fc`): Source Window "flagship" wording removed and Coming Soon state made explicit on the product page, header topbar, premium-tools page and product card (Issues #12/#9); the Source Window page hero now uses the feature video (`source-window-feature.mp4`). Homepage flagship mentions in `src/app/page.tsx` were deferred to the reconciliation and remain open (Batch E).
- Reconciliation DONE: the diverged local line (base `651fd93` plus uncommitted work) was preserved on `backup/local-work-2026-10-21` (9 grouped commits; ZIP-era leftovers archived outside the repo at `D:\Work\AENural-archive\zip-era-2026-10-21`), merged with `origin/dev` (merge commit `9761bf9`; 4 conflicts resolved file-by-file), and verified on the merged tree: lint PASS, typecheck PASS, tests **875/875 PASS** (114 suites), production build PASS (31/31 pages). Three tests that encoded pre-fix behaviour were updated (`tests/theme.test.mjs`, `tests/auth-preview.test.mjs`, `tests/home-video.test.mjs`; commit `d9d9a10`). Local `dev/aenural-hybrid` fast-forwarded and pushed (`84b29fc..d9d9a10`). Local tree and GitHub dev are now one identical copy. Production repository untouched throughout.
- CI added (`.github/workflows/ci.yml`): lint, typecheck, test and build run automatically on pushes to `dev/aenural-hybrid` and on pull requests into it.
- Next: Batch C performance measurement (Issue #2), then Batches D/E.

## Reporting policy
Mark each task as `DONE (evidence)`, `BLOCKED (reason)`, `NOT RUN`, or `IN PROGRESS`. For each meaningful commit document actual tested command outputs, SHA, locally preserved changes, known security risks, rollback strategy, and precise continuation. Never mark user-facing production released without deployment approval and final smoke tests.
