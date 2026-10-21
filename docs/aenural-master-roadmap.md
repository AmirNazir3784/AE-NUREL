# AENural master roadmap
Updated: 2026-10-21 | Owner: AENural | Status: Phase 0 in progress
**Development only:** `faisalhere-afk/aenural-website` / `dev/aenural-hybrid`.
**Do not modify or deploy production:** `AmirNazir3784/AE-NUREL` (Hostinger remote).

## Product decisions — approved
- AENural is a Pakistan-operated business serving international subscribers. Prioritize Visa/Mastercard and other globally supported cards; payment provider, onboarding, payout eligibility and prices remain undecided. Evaluate hosted merchant-of-record options; do not collect card details.
- Product A — **Auto Caption Generator**, freemium subscription product. **Free: exactly 3 videos TOTAL per free account** (lifetime account allowance; **not** 3/day or 3/month), **up to 60 seconds each**, **watermarked exported videos**, **5 free presets**. Proposed free presets: Clean, Bold, Outline, Highlight, Minimal; confirm before enforcement. Premium: remaining 25 of 30 styles, advanced animation, word highlighting, watermark-free export and extended duration subject to technical benchmarks. Authenticated, verified server-side accounting required.
- Product B — **Audio to SRT/VTT/TXT**, separate transcription-focused freemium product using shared subscription entitlements. Reference inspiration: TurboScribe three-mode UI (Fast/Balanced/Accurate), **not** a claim that three distinct models exist in AENural. Benchmark model quality, memory, speed and costs before a mode is shipped or called premium.
- One Premium subscription is intended to unlock eligible features across both products. Source Window is a separate product in Coming Soon state. Remaining released subtitle utilities remain free and anonymous.
- No artificial delay for free processing. Do not promise unlimited media, faster paid speed, worldwide coverage or secure browser-only paywalls without verified implementation.

### Before implementing the quota — clarify these specifications
The confirmed rule is **3 free videos total per account**. Still to resolve: what consumes a credit (successful generation, distinct upload, or completed watermark export); whether failed jobs/retries consume one; server reconciliation/idempotency; whether changing/transcoding the same video counts again; account verification; cancellations/refunds; and limits against multi-account abuse. Never assume or silently charge a credit.

## Work phases
| Phase | Work | Exit requirement | State |
| --- | --- | --- | --- |
| 0 | Baseline, threat assessment, documentation, secure workflow, CI design | Audited development baseline, risk list, verified local/CI checks, documented release gates | **In progress** |
| 1 | Header hover and search behavior; investigate cold route loading and hero video | Automated interaction tests, production-like route/media measurements, real Chrome desktop/mobile acceptance | Not started |
| 2 | Catalog taxonomy, separate premium products from free tools, search-intent SEO, metadata/canonical routes | Accurate unique route/name registry, 301 redirects where required, SEO audits; no premature indexing | Not started |
| 3 | Cohesive product directory, homepage, individual tool page UI/UX | Reusable design tokens/components, dark/light, mobile, keyboard accessibility, guidance and FAQ tests | Not started |
| 4 | About/Help/Source Window copy, Coming Soon presentation, product messaging | No inaccurate "sole flagship" or false availability claims; SEO/content review | Not started |
| 5 | Real auth and paid architecture; quota, entitlements, watermark, hosted checkout, verified webhooks | Threat-tested multi-user server authorization, reliable accounting, payment sandbox tests, secrets/retention controls | Not started |
| 6 | Production release acceptance and approval | Clean lint/types/tests/build/security review, monitoring, fresh-device load and rollback plan | Not started |

## Working agreement
1. Before code: inspect local Git status / remotes and authoritative development files; state a small scope and obtain approval when unclear.
2. Work in focused commits on the development branch only; preserve uncommitted Codex work. No hard reset, forced checkout, undocumented merge or production push.
3. Prefer verified Git changes and deterministic sync over loose root-level TSX ZIPs. If local tree diverges, stop and inspect the actual file before merging.
4. Per change: add success, failure and regression tests; run lint, typecheck, full test suite and production build. Report *where* each test ran; never infer success from a mock or claim an unavailable browser test passed.
5. Security gates: input validation, output escaping, permission checks at server/data boundaries, trusted authentication and password hashing libraries, environment-backed secrets, rate limits, logging without PII/secrets, and safe storage/retention. Test invalid, hostile, expired, duplicate and concurrent requests.
6. Update `docs/aenural-release-checkpoint.md` at every approved completed stage: latest commit, observed evidence, remaining risks and exact next step. Record product policy changes here first.

See `docs/aenural-phase0-security-audit.md`, `docs/aenural-auth-architecture.md` and `README.md`.
