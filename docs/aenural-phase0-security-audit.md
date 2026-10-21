# AENural Phase 0 — initial security and engineering baseline
Date: 2026-10-21 | Development branch: `dev/aenural-hybrid`
Baseline inspected (before documentation commits): `c9743b3197123ca1711a0b64beed94da43edf160`.
**Scope:** static review of the linked development repository (GitHub tree: 468 entries) and previously reported local test output. This is a **preliminary** audit, not a penetration test, live Hostinger scan, full dependency vulnerability audit, or verified local build. No production access, database migrations, code changes, deployments or credential inspection were performed.

## Architecture confirmed in reviewed files
- Next.js 16.3.8, React 19.2.8, TypeScript; Node 24.21.0 reported in user's local environment. `package.json` has `dev`, `build`, `lint`, `typecheck`, `test` scripts; `package-lock.json` exists.
- Public free-tool registry: `src/lib/tools.ts`. Auto Caption Generator is development-only (`src/app/tools/auto-caption-generator/page.tsx` checks `NODE_ENV`, sends `noindex`); Audio to SRT/VTT preview also not deployed (`src/app/tools/free-subtitle-generator/page.tsx`). Source Window currently a page, not a released product.
- Auto Caption Generator: `src/features/caption-studio/studio-core.ts` currently validates 120-second max media and <=200 MiB input, with style validation. `generation-controls.tsx` exposes device Fast/Accurate selection; `studio-media.ts` validates input/export paths. These are **current implementation limits**, not the future freemium contract.
- Account UI: `src/components/site/auth-preview-modal.tsx` explicitly reports no network/session/persistence. The documented Hostinger MySQL + Better Auth architecture in `docs/aenural-auth-architecture.md` is **planned only**, not implemented.
- Hybrid CPU API: `server/hybrid/config.mjs`, `api.mjs`, `jobs.mjs` implement a development-only loopback/token/origin gate, bounded WAV upload, per-process job/rate limits, temporary-file cleanup and child-process controls. `server/hybrid/README.md` states it is **not** designed for public deployment.
- `.gitignore` excludes `.env*` and generated artifacts. `next.config.ts` contains only a development QA output-dir setting; no custom security headers are defined **there** (hosting/CDN response headers still uninspected).
- Current development branch `dev/aenural-hybrid` was reported by GitHub as `protected:false`. The repository tree contained **no .github workflow files**. Production is a separately controlled repository and must not be changed.

## Risk register (priority reflects blockers for future public subscriptions, not evidence of an active compromise)
| ID | Priority | Observation / risk | Remediation and test before release |
| --- | --- | --- | --- |
| SEC-01 | **Release blocker** | No real customer authentication, entitlement store or server-verified payment status. Preview UI is not a login. | Implement the separately approved real auth design; verify sessions/email, account ownership, logout, password reset and failure scenarios on a development DB. No ad hoc password hashing. |
| SEC-02 | **Release blocker** | The approved lifetime 3-free-video rule has **no trustworthy counter yet**. Client-only flags, localStorage or hidden buttons can be modified; shared accounts and concurrent requests introduce race conditions. | Decide billable event, implement atomic DB transaction/unique idempotency key per completed billable video; server checks entitlement and limits. Test concurrent, failed, repeated and replayed jobs across accounts. |
| SEC-03 | **Release blocker** | Subscription-only local model/style and no-watermark behavior cannot be securely enforced solely by a browser-delivered application. A determined user can alter browser code. | Threat-model each paid feature; place enforceable value/server entitlements behind authenticated endpoints, or explicitly accept/document client-side bypass risk before charging. For watermarked exports, assess server rendering/cost and legal product honesty. |
| SEC-04 | **Release blocker** | Development hybrid service uses local token, a single-process coordinator and in-memory rate limits. It is not multi-user, horizontal-scale production infrastructure. | Keep dev service disabled publicly; evaluate job queue, scoped auth, global rate limiting, memory/CPU budgets, deletion, ownership and hosting feasibility before any paid cloud processing. |
| SEC-05 | **High — verification gap** | No CI workflow observed, so commits do not show automated full-suite/build checks. Previous 869/869 tests were reported by user from a local run; latest doc commits are not automatically certified. | Add CI for `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; document runner/Node and fail closed on failures. Run a controlled local baseline first. |
| SEC-06 | **High — verification gap** | Dependency vulnerabilities, accidental secret history, third-party packages and deployed HTTP security headers have not been assessed. | Run lockfile dependency audit + secret scan in safe development environment; inspect actual HTTPS headers (CSP, HSTS, clickjacking protection, MIME, referrer) and correct based on Next/Hostinger integration and exception tests. Do not log/disclose secrets. |
| SEC-07 | **Medium** | Dev branch is not branch-protected according to GitHub metadata. | Evaluate required checks, review/force-push protections and least-privilege repository access after CI exists; avoid unintended permissions changes. |
| SEC-08 | **Medium / product dependency** | Unverified 10,000+ user concurrency, long-video inference performance, storage, billing webhooks, privacy policies, legal processing terms and abuse controls. | Load/stress test *approved staging only*; monitor resource costs and backpressure; idempotent verified webhooks, no sensitive card storage, backups and disaster recovery. |
| SEC-09 | **Medium — pending measurement** | Reported cold-route latency and media delay on production have not been isolated to network/hosting/build/hydration. | Capture CDN/Hostinger headers, cache policy, TTFB, JS transfer/parse time, static/media range requests and Web Vitals on a fresh browser; fix based on evidence. |
| SEC-10 | **Low — documentation** | Root README still describes earliest ToolSuite version and first utility. | Replace with correct AENural setup, architecture, environment boundaries, security and test instructions. |

## Positive controls observed (not full certification)
- Prod routing gates are present for unreleased AI tools, which currently prevents premature public subscription exposure.
- Hybrid development service validates Host, origin, bearer token, duration/content limits; uses crypto timing-safe comparison and bounded workloads; request handler gives generic client errors.
- `studio-core.ts` validates file metadata and caption style bounds; local processing is separate from auth.
- Environment file ignore rules are present; no production secrets need to be placed in documentation.

## Next Phase 0 tasks / acceptance evidence required
1. **Local snapshot before editing:** verify `git branch --show-current`, `git remote -v`, `git status --short`, untracked files and Codex modifications. No reset/checkout, merge or replacing source files.
2. **Reproducible development baseline:** Node/package-lock verification; `npm ci` only after protecting local workspace and confirming project conventions; then `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Retain logs, executed command, commit SHA and environment in checkpoint. Latest **user-reported** result before this audit: 869 tests, 869 pass, 0 fail; not rerun by assistant.
3. **Automated security verification:** read-only dependency audit and secret-scan rules without publishing any secret values; establish CI and branch protection after agreed settings.
4. **Release boundary verification:** development auth/transcription and preview routes do not appear in the production build, routes/robots/sitemap correctly gate unfinished products; no production deployment.
5. **Threat-model design session:** decide secure quota consumption and refund semantics, authenticated database schema, webhook idempotency and watermark enforcement; get explicit approval for DB migrations.
6. **Check live-site behavior carefully:** request traces and headers without sending private media or changing live configuration.

## Change control and reporting
Every approved change gets a small commit, tests with actual results, a risk note and an updated `docs/aenural-release-checkpoint.md`. When a check cannot be run, record it as **NOT RUN**, never "passed". A green static review does not certify production.
