# AENural release checkpoint — resume here
Last updated: 2026-10-21
**Status:** Phase 0 (development baseline and security hardening) **IN PROGRESS**. No production changes or deployment.

## Trusted repositories and working tree
- Development repository: `faisalhere-afk/aenural-website`, branch `dev/aenural-hybrid`.
- Production repository / Hostinger remote: `AmirNazir3784/AE-NUREL` — **hands off until explicit release approval**.
- Inspected development HEAD at start of this phase: `c9743b3197123ca1711a0b64beed94da43edf160`.
- Documentation commits in this phase:
  - `574b24c92a3b31dd495e17ceadf825381c6c2f72`: approved product roadmap, including **3 free videos lifetime per free account**.
  - `466d34c319d858e37cae52d83801ddbeaa0d0119`: preliminary security audit and future paid-release blockers.
  - `01965f65b5c622ef0addaf136f4c2a05e7820b89`: corrected project README and safe development workflow.
- This checkpoint was committed after the above changes. **Local Windows tree NOT inspected this turn**; local Codex edits may differ. Never assume `git status` is clean or merge blindly.

## Approved product requirements
- Auto Caption Generator: free tier **3 videos TOTAL per account**, 60-second per-video limit, exported-video watermark and 5 basic presets; Premium may unlock 25 additional presets, advanced animation, word highlighting, watermark removal and longer videos. Free quota counting semantics and premium duration feasibility **not yet approved**.
- Audio to SRT/VTT/TXT is a **separate** subscription-capable transcription product, not the Auto Caption Generator. Three-mode external screenshots are design/model-strategy references, not implementation evidence.
- Free utilities stay separate and accessible without an account. Source Window is **Coming Soon**. AENural Premium is intended to cover eligible premium products under one account.
- Business based in Pakistan, customers worldwide where provider supports payments; prioritize Visa/Mastercard. Provider, payout eligibility and pricing still pending research and onboarding verification.

## Last verified technical progress
- Three-panel Auto Caption Generator and in-player full-screen controls were visually verified by user on localhost in prior session.
- User-reported local test suite: **869 tests; 869 pass, 0 fail**. This is a historical result **before these documentation commits**; no fresh suite was run by the assistant.
- Development source currently contains 30 style presets, Fast/Accurate local transcription and a 120-second media validation limit. These **do not** yet implement the approved free/premium plan.
- Development-only account preview has **no authentication backend**; no payment billing or quota enforcement exists.
- Development hybrid transcription API is gated and **not ready for multi-user production**.

## Phase 0 results and open work
**COMPLETED (review/documentation):**
- [x] Record fixed lifetime 3-video free plan in roadmap.
- [x] Inspect key source, auth-preview, hybrid-service and release-boundary files, as well as package lockfile presence, Git branch metadata and absence of CI workflows.
- [x] Write initial security release-blocker register; note observed safeguards, limitations and unresolved verification.
- [x] Replace outdated root README with current setup and code structure.

**NOT VERIFIED / STILL PENDING:**
- [ ] Inspect user's **actual Windows Git branch, remotes, status and diffs**, and reconcile local Codex changes without destroying them.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` on the current checkout and record fresh outcomes.
- [ ] Run safe lockfile/dependency vulnerability audit and secret/history scan; verify deployed HTTP headers (without exposing secrets).
- [ ] Add development CI (lint/typecheck/tests/build) and review branch protection/required checks.
- [ ] Validate production/dev route gating under a production build and assess errors / edge cases.
- [ ] Define the exact free-credit charge event, cancellation/retry/idempotency and abuse policy **before** auth/quota implementation; get explicit database changes approval later.
- [ ] Observe real production cold loads, navigation and video range/cache behavior (separate performance task; no production changes yet).

## Exact next small task
**Phase 0B — local baseline / read-only Git check:**
From `D:\Work\Tools\online-tools-platform` run and share:
```cmd
git branch --show-current
git remote -v
git status --short
node --version
```
Then validate the **existing local checkout** using:
```cmd
npm run lint
npm run typecheck
npm test
npm run build
```
Don't first pull, merge, reset, switch branches, overwrite or run installers. If a check fails, stop and share output. The next code feature after Phase 0 acceptance is **Phase 1A: header hover-menu dismissal and blank search suggestions**, with focused regression tests.

## Reporting policy
Mark each task as `DONE (evidence)`, `BLOCKED (reason)`, `NOT RUN`, or `IN PROGRESS`. For each meaningful commit document actual tested command outputs, SHA, locally preserved changes, known security risks, rollback strategy, and precise continuation. Never mark user-facing production released without deployment approval and final smoke tests.
