# AENural — Production Handover: Better Auth + Hostinger MySQL

> **Repo (development):** `faisalhere-afk/aenural-website`, branch `feature/hostinger-authentication`, HEAD `9abce77` (PR #21 targeting `main`, **do NOT merge automatically**).
> **Production repo:** `AmirNazir3784/AE-NUREL` — **do NOT touch it except through the controlled transfer in §D, and never by force-push or blind overwrite.**
> **Status at handover:** **Release state 2 — automated validation passed** (state 1 code-complete; state 2 closed by CI run #232, green on `9abce77` — see §A.2). **State 3 is NOT reached** (gate G4 open) and this document is **NOT production-ready**. This document is a handover, not a deployment approval. Nothing in it authorises enabling membership in production.
> **Audience:** Faisal (owner) and the Hostinger admin (one session, §B). If you are not one of those two people, stop — do not execute §B, §D, or §E.
> **Companion documents (same branch):** `docs/authentication/hostinger-setup.md` (local setup + testing), `docs/authentication/production-checklist.md` (gated pre-production checklist), `docs/authentication/trusted-proxy-ip.md` (trusted proxy header), `docs/authentication/owner-activation-rotation.md` (owner token rotation — owner login PAUSED 2026-11-20, see §A.4 item 4), `docs/authentication/otp-delivery-failure.md` (mail-delivery limits), `docs/authentication/otp-test-checklist.md` (22-item test list), `docs/ci-workflow.yml` (CI workflow, installed — see §A.2; the old `docs/ci-retarget-patch.md` is superseded).
> **Phase 4 audit:** `phase4/handover/SECURITY-REGRESSION-REPORT.md` (Worker F — regression + security audit, 2026-11-19). Read it before §A. The three small security fixes from that audit (F-1, F-2, F-3) **landed in the Phase 4 push (`1110f6ab`)** — see §A.4.

## Release states — read first

| State | Meaning | Rule |
|---|---|---|
| **1 — Code complete** | The auth work is implemented, committed on the branch, and reviewed. | Reached. |
| **2 — Automated validation passed** | Lint, typecheck, full test suite, and production build pass in CI and/or on a full local checkout. | **Current state — closed by CI run #232 on `9abce77` (see §A.2).** Requires the actual results in §A.2 — all green, no waivers. |
| **3 — Ready for controlled deployment** | State 2 holds **and** every deployment gate in §A.3 passes (local integration against the dev database, live MySQL/SMTP verification, trusted-proxy confirmation, backups, and the security gates in the audit report). | **State 3 must NOT be claimed while any required validation or security gate fails.** A single FAIL in §A.3 keeps the release at state 1 or 2. |
| **4 — Production authentication verified** | The release has been deployed through §E and the live checks in §E.6 pass on `https://aenural.com` against the production database and production mailbox. | **State 4 requires actual production verification.** A local pass, a staging pass, a code review, or a successful deploy with no live auth test does **not** reach state 4. Never report state 4 until §E.6 is signed off with dates and names. |

If anything in §A.3 is FAIL or PENDING, the release is **not** state 3, however complete the code looks. If §E.6 has not been run live, the release is **not** state 4, however smooth the deploy looked.

---

## A. Release status

### A.1 Completed work (Phases 1–3 + Phase 3 fix, branch `feature/hostinger-authentication`)

- **Phase 1 — Fail-closed MySQL TLS** (commits `172462f`, `305db58`, `1032f47`): remote MySQL requires verified TLS (`rejectUnauthorized: true`, TLS 1.2+, SNI) via a CA file or the explicit public-CA opt-in; loopback (`127.0.0.1`) is plain by design; no silent fallback to SQLite in MySQL mode; eager encrypted-session probe; hardened `release:check`; setup guide + production checklist + MySQL verification scripts.
- **Phase 2 — Email OTP verification** (commits `797af04`, `8efd3d2`): six-digit codes, 5-minute expiry, max 5 attempts, hashed storage, resend rotates (old code dies), 60s server cooldown, passwordless endpoints closed, pending-verification cookie (email only, httpOnly, 10 min), SMTP as the only transport when configured, no silent fallback to the local outbox, local-dev wording removed from customer pages.
- **Phase 3 — Setup wizard + OTP failure handling + production prep** (commits `9173bd5`, `63d5e4a`, `0b2e9b3`): `npm run membership:setup` (stages A–I, resumable, Windows-compatible hidden password input); OTP delivery-failure detection (transport-health pre-check + in-memory delivery tracker + honest error/retry UI); free quota decided as **3 videos per day (UTC reset)**; trusted-proxy recommendation (`x-real-ip`) documented; CI retarget patch staged; owner-activation rotation procedure; production checklist extended.
- **Phase 3 fix — Wizard password input** (commit `bca377b`): asterisk feedback, paste support, empty → immediate re-prompt, incremental `.env.local` save, `--from-env` flag, npm probe fix. Live Windows CMD/PowerShell/VS Code verification of typing/pasting is still owed by Faisal on his PC.
- **Phase 4 — Regression + security audit (Worker F, 2026-11-19), pushed as commit `1110f6ab`:** no regression found by code inspection + runnable checks; the three small security fixes (F-1, F-2, F-3) **landed in this push** (see §A.4), together with the pool-deadlock fix, the idempotent regenerated 001 (14 tables, 9 explicit FKs), and the `verifyIdentity` TLS fix (see §A.2.1). Full detail: `phase4/handover/SECURITY-REGRESSION-REPORT.md`. Merged test results in this push: pure suite 220 pass / 0 fail / 1 skipped (221 tests); MySQL integration 43 pass / 0 fail / 2 skipped (45 tests, disposable MySQL 8.0.46, two identical runs); SMTP integration 39 pass / 0 fail (Mailpit v1.34.0 + disposable MySQL).
- **Step 5 — Security-review fixes (commit `4085a87`, 2026-11-20):** 44 of the 46 Step 5 review findings fixed, 2 partial (S5-01 trusted-proxy header still unconfirmed with Hostinger; S5-18 CSP `script-src` deliberately not added), 1 accepted residual (S5-24), 7 Info no-action. Includes the trusted-proxy gates (S5-01/02/03/06/07), owner-token hardening (scrypt hash in env only, hash removed from the repo — S5-04; attempt limits — S5-12), resend/OTP limits (S5-16, S5-30), and defence-in-depth. Full detail: `phase5/SECURITY-REVIEW.md` and `phase5-fix/MERGE-REPORT.md`. Owner-token rotation itself is PAUSED (Faisal, 2026-11-20) — see §A.4 item 4.
- **CI fixes + green runs (commits `465ff18`, `e0f117f`, `9abce77`, 2026-11-20):** `465ff18` fixed the CI run #226 failures (rate-limit helper JSDoc type; deterministic S5-14 duplicate check); `e0f117f` fixed the CI run #228 failures (release-check dummy config now sets `NEXT_PUBLIC_AENURAL_SITE_PREVIEW=0`; robust Mailpit install with retry + `--no-release-check`); `9abce77` is the workflow install by Faisal (copy of `docs/ci-workflow.yml` to `.github/workflows/ci.yml`). CI results: run **#224 green, 4m17s** (on `464b9ce`); runs **#226 and #228 failed** on the two issues above, both fixed; run **#232 ALL PASSED, 4m27s** on `9abce77` — checks Node 22 (4m24s), checks Node 24 (2m53s), MySQL integration (1m57s), SMTP integration (1m29s); 12 non-blocking warnings only. See §A.2.

### A.2 Tests passed (only numbers actually observed — nothing invented)

Worker F re-ran the following on 2026-11-19 in this VM (Node v24.22.1, branch files fetched at HEAD `bca377b`, no `node_modules`):

| Check | Result |
|---|---|
| `node --check` on all 17 `server/membership/*.mjs` + `scripts/membership/*.mjs` files | 17/17 clean |
| `node --test tests/mysql-tls-config.test.mjs` | 19 pass, 0 fail (re-run after fix F-2 — still 19/19) |
| `node --test tests/setup-wizard.test.mjs` | 48 pass, 0 fail |
| `node --test tests/otp-delivery.test.mjs` | 8 pass, 0 fail, 1 skipped (integration suite correctly skipped without `better-auth`) |
| Fix F-1 verification (malformed owner hash → 403, not `RangeError`) | 4/4 checks pass; pre-fix `RangeError` reproduced |
| Fix F-2 verification (trusted-header requirement in owner-only mode) | 4/4 checks pass |
| Fix F-3 verification (`release:check` with full prod env vs `NODE_ENV` unset) | Pass — exit 0 with `NODE_ENV=production`; exit 1 with only the new message when `NODE_ENV` is unset |

Prior-phase results (reported by Phases 1–3, **not** re-verified by Worker F — see §A.5 for why one file could not be re-run here):

- Phase 1: `tests/mysql-tls-config.test.mjs` 19 pass; `release:check` loopback PASS / remote-without-TLS FAIL as designed.
- Phase 2: `tests/email-otp.test.mjs` 28 pass (19 pure + 9 integration, on real Better Auth 1.7.14 + SQLite).
- Phase 3: full OTP suite 68 pass (email-otp 28, otp-delivery 13, otp-integration 8, mysql-tls-config 19); `tests/setup-wizard.test.mjs` 31 pass at the time (48 pass now, after the Phase 3 fix added tests).

**Filled 2026-11-19 by the Phase 4 coordinator** (merged test tree in this
VM, Node v24.22.1, real MySQL 8.0.46 + Mailpit v1.34.0, disposable
databases only — the Hostinger dev database was never touched):

- `npm run lint` (full checkout / CI): **NOT RUN in this VM** — no full repo checkout
  exists in this VM (only the membership slice + test tree); lint runs in
  the new GitHub CI workflow once it is installed (see below), or on
  Faisal's PC with `npm run lint`. **Superseded by CI run #232 (green, 2026-11-20) — lint now runs and passes in CI.**
- `npm run typecheck` (full checkout / CI): **NOT RUN in this VM** — same reason as
  lint. Runs in the new CI workflow / on Faisal's PC (`npm run typecheck`). **Superseded by CI run #232 (green) — typecheck now runs and passes in CI.**
- Full `npm test` (full checkout / CI): **NOT RUN in this VM** as one command — the
  membership suites below were run individually in the merged test tree
  and are all green. The full-suite run belongs to CI once installed. **Superseded by CI run #232 (green) — the full suite now runs and passes in CI; see the current figures above.**
  - Pure suite (11 files: email-otp, otp-delivery, mysql-tls-config,
    setup-wizard, service-helpers, membership-activation,
    membership-server, otp-integration, auth-preview, membership-preview,
    owner-access): **221 tests, 220 pass, 0 fail, 1 skipped.**
  - MySQL integration (`tests/membership-mysql.test.mjs`, real Better Auth
    1.7.14 over real mysql2 against disposable MySQL 8.0.46, incl. a
    TLS-only instance): **45 tests, 43 pass, 0 fail, 2 skipped** (the 2
    skips are the CI-only remote-host TLS tests), two consecutive identical
    runs, ~8–9 s each.
  - SMTP integration (`tests/membership-smtp.test.mjs`, real Mailpit
    v1.34.0 + disposable MySQL 8.0.46 + scriptable fake SMTP server):
    **39 tests, 39 pass, 0 fail**, ~54 s.
  - `scripts/membership/verify-mysql.mjs` against a disposable MySQL
    8.0.46 database imported from the regenerated 001: **exit 0** —
    "MySQL schema OK: all 14 required tables are present"; a second CLI
    import of 001 is a no-op (still 14 tables), and the import creates
    **9 foreign keys** (verified in `information_schema`).
  - Setup wizard `--dry-run` against the same disposable database:
    **exit 0** — Stage A PASS, Stage D PASS ("Present: 14/14 required
    tables. Schema OK"), Stages B/C/E/I skipped by dry-run design.
    Note: Stage D still asks for the interactive YES confirmation even in
    dry-run (it writes nothing, but the prompt blocks a non-interactive
    shell) — a minor wizard wart, not a production blocker.
- `npm run build` (full checkout / CI): **NOT RUN in this VM** — no full repo checkout
  in this VM. Runs in the new CI workflow / on Faisal's PC
  (`npm run build`). **Superseded by CI run #232 (green) — the production build now runs and passes in CI.** `npm install` with the workflow's
  `ONNXRUNTIME_NODE_INSTALL=skip` flag was verified to succeed in this VM
  (462 packages; the flag skips the onnxruntime-node CUDA-binary download
  that hangs a plain install — see §A.2.1); true `npm ci` still needs
  Actions or Faisal's PC.
- CI status on the branch: **INSTALLED and GREEN.** The GitHub App still lacks the `workflows` permission, so Faisal installed the workflow himself by copying `docs/ci-workflow.yml` to `.github/workflows/ci.yml` — first at `464b9ce`, again at `9abce77`. The workflow has 3 jobs (checks on Node 22+24, MySQL integration, SMTP integration; triggers on `main` + `feature/hostinger-authentication` + manual dispatch). **CI run #232 ALL PASSED on `9abce77`, total 4m27s** — checks Node 22 (4m24s), checks Node 24 (2m53s), MySQL integration (1m57s), SMTP integration (1m29s); 12 non-blocking warnings only (Node 20 deprecation notices, unused-variable warnings). Earlier runs: #224 green (4m17s, on `464b9ce`); #226 failed (TS type error in the rate-limit helper + a timing-flaky S5-14 test) and #228 failed (release-check dummy config + a Mailpit download 403) — both fixed by commits `465ff18` and `e0f117f` (see §A.1). **State 2 is closed by run #232.** The old `docs/ci-retarget-patch.md` is superseded by the installed full workflow.

**Current suite figures (2026-11-20, verified for the #226 fix — these supersede the Phase 4-era numbers in the merged-tree section below):** `tests/email-otp.test.mjs` **71/71 (twice)**; SMTP integration full suite **39/39**; MySQL integration **36/36**. The Phase 4 merged-tree numbers below (pure 220/221, MySQL 43/45, SMTP 39/39) are the results actually observed on 2026-11-19 at `1110f6ab` and are kept as that day's record.

### A.2.1 Phase 4 coordinator findings (2026-11-19, merged tree)

Three issues found while merging the workers' suites — all fixed in this
push, all in the membership release only:

1. **Pool deadlock (Phase 4 regression, Critical — fixed).** The durable
   delivery audit (`recordDelivery` → Kysely INSERT) ran inside Better
   Auth's per-endpoint transaction, which already holds one pool
   connection; at ≥5 concurrent OTP/reset sends all 5 pool connections
   were held by transactions waiting for audit inserts that could never
   get a connection. Reproduced (8 parallel sign-ups: 5 mails, then a
   permanent stall) and fixed by making the audit write fire-and-forget
   in `server/membership/auth.mjs` — the in-memory tracker is still
   updated synchronously, so the verify page sees the outcome at
   response time; the audit row lands a millisecond later. Verified:
   8 parallel sign-ups complete in ~3 s, 8 mails, 8 audit rows.
   Residual: a crash in that millisecond window loses the audit row —
   accepted, it is a best-effort audit. A dedicated second pool and a
   Better Auth transaction hook were considered and rejected (unsupported
   deep import / lifecycle complexity).
2. **Duplicate `verification` rows on resend (test fix only).** Better Auth
   rotate resend INSERTs a second row for the identifier (no unique index
   on `verification.identifier`); the old code is dead and the new code
   verifies — the failing test read an unordered `SELECT` and got the old
   row. Test now asserts `MAX(createdAt)`. Deliberately **not** fixed by
   adding a unique index in this release (generator + migration + existing-
   DB deduplication, late in the release). Known limitation / post-launch
   hardening follow-up; the attempt-budget reset on resend is already an
   accepted residual (SEC-06).
3. **Restart test double-closed the pool (test fix only).** `db.destroy()`
   alone ends the shared mysql2 pool; the extra `authDatabase.end()` raced
   and threw. Test updated; no app change.

Also proven by Worker B and fixed in this push: the old 001 was **not
idempotent** (plain `CREATE TABLE`, second import fails 1050) and created
**zero foreign keys** (MySQL silently ignores inline `REFERENCES`) — the
regenerated 001 uses `CREATE TABLE IF NOT EXISTS` (14 tables), explicit
`FOREIGN KEY` constraints (9), and idempotent index blocks. Databases
imported with the old 001 need the manual `ALTER TABLE` statements in
`docs/authentication/production-mysql-init.md` §4.7 (the wizard Stage D
creates the missing delivery table, but not the FKs on existing tables).
And proven by Worker C: mysql2 ignores `ssl.servername` unless
`ssl.verifyIdentity` is set — both remote TLS profiles now set
`verifyIdentity: true`.

### A.3 Deployment gates (all must pass before state 3)

| # | Gate | Status |
|---|---|---|
| G1 | State 2: lint, typecheck, full tests, build all green (§A.2 filled) | **CLOSED** — CI run #232 ALL PASSED on `9abce77` (4m27s: checks Node 22 4m24s, Node 24 2m53s, MySQL 1m57s, SMTP 1m29s; 12 non-blocking warnings only). Current suite figures: email-otp 71/71, SMTP 39/39, MySQL 36/36. |
| G2 | Local integration passes on Faisal's PC against the **dev** database: setup guide §10 (registration → OTP → login → logout → password recovery) and §11 (rows in MySQL), wizard Stages C–E | PENDING — only Faisal on his allowlisted PC can run this. Note: the database used is the live database `u853936014_aenural_dev` (see §B.1) — test accounts created here must be cleaned up before real users arrive. |
| G3 | Remote MySQL TLS outcome for `srv2224.hstgr.io` recorded (probe exit 0 with `Ssl_version`, CA vs public-CA decision) | PENDING — unverified (includes resolving the earlier `ER_ACCESS_DENIED_ERROR` for `aenural_devuse` from Faisal's PC at wizard Stage C) |
| G4 | `AUTH_TRUSTED_IP_HEADER` confirmed with Hostinger (hPanel CDN check + support answer recorded, §B.8) | PENDING — unconfirmed; recommended `x-real-ip`, not verified. **Top blocker for state 3.** |
| G5 | Real SMTP delivery verified from the dev host (OTP arrives, SPF/DKIM pass) and mailbox product confirmed (Hostinger Email vs Titan) | PENDING — live delivery unverified. Mailbox product **confirmed 2026-11-20 (Faisal): `support@aenural.com` is Hostinger Email (NOT Titan)**, `smtp.hostinger.com:465`. SPF/DKIM/DMARC status and the mailbox daily limit still to-confirm (§B.6–§B.7). |
| G6 | Phase 4 fixes F-1, F-2, F-3 applied to the branch and re-verified (see §A.4) | APPLIED in the Phase 4 push (PR #21) and re-verified in the merged test tree 2026-11-19 (pure suite 220/221 green, incl. the F-1/F-2/F-3 cases); the coordinator's additional fixes (pool deadlock, idempotent 001, explicit FKs, `verifyIdentity`) are in the same push. |
| G7 | Security audit gates: no High finding open (SEC-01 is the open High — it is G4; all Medium findings fixed or explicitly accepted in §A.4) | PENDING — blocked on G4 |
| G8 | Production backup + test-restore procedure proven (§F, and production checklist §7) | PENDING — not yet done |
| G9 | Owner-activation token rotated per environment + placeholder email replaced (see §A.4 / §F.3) | **PAUSED — not a gate on normal login.** Owner login was paused by Faisal on 2026-11-20: the normal signup/login go-live does not need owner activation. The token hash is no longer in the repo at all (Step 5, S5-04 — scrypt hash in env only). Rotation applies only if/when owner activation resumes; see §A.4 item 4 and `docs/authentication/owner-activation-rotation.md`. |
| G10 | CI workflow installed so `main` + the feature branch get CI (full workflow incl. retarget: `docs/ci-workflow.yml` + `docs/ci-workflow.patch`) | **DONE** — workflow installed by Faisal (copy of `docs/ci-workflow.yml` to `.github/workflows/ci.yml`, at `464b9ce` and again at `9abce77`); CI run #232 green on `9abce77`. The old `docs/ci-retarget-patch.md` is superseded. |

### A.4 Known failures / open issues

1. **SEC-01 (High, open):** trusted proxy header unconfirmed — see §A.3 G4. This alone blocks state 3.
2. **Better Auth 1.7.14 swallows mail-send errors** (OTP and reset-link mail). Mitigation is in place (pre-check + tracker + honest UI), but a send failing after the pre-check still answers 200. Operators must watch server logs for `[membership] Email send failed`. A durable fix needs a Better Auth change or an app-owned send path — separate workstream, not a release blocker for state 3, but it must be understood by whoever operates production (see §E.6).
3. **OTP resend resets the attempt budget** (5 fresh attempts per new code, 60s cooldown). Accepted residual; bounded by per-IP rate limits. No action for this release.
4. **Owner-activation token — PAUSED, not a pre-live gate for normal login.** Owner login was paused by Faisal on 2026-11-20, so token rotation is **not** required before the normal signup/login go-live. The old facts in this item are all fixed: the unsalted SHA-256 hash was **removed from `owner-bootstrap.json` by Step 5 (S5-04)** — the hash now lives only in env (`AENURAL_OWNER_ACTIVATION_TOKEN_HASH`, scrypt), and the bootstrap file is inert (code never reads it); the attempt limit was **added by Step 5 (S5-12)** — per-IP 5/min, global 5/min, 10-minute lockout, one generic 403 for all failures; and the HTTP caller **now exists** — the route `src/app/api/membership/activate-owner/route.ts` is on the branch. The placeholder email `owner@aenural.com` still needs replacing **only if/when owner activation resumes**. If/when it resumes, rotate per environment per `docs/authentication/owner-activation-rotation.md` and treat the old token as compromised.
5. **Wizard password fix (commit `bca377b`)** is unverified on a live Windows console — Faisal must verify typing/pasting in CMD/PowerShell/VS Code on his PC.
6. **CI retarget DONE.** The full workflow is installed (`docs/ci-workflow.yml` → `.github/workflows/ci.yml`, by Faisal at `464b9ce` and `9abce77`) and CI run #232 is green. `docs/ci-retarget-patch.md` is superseded.
7. **R-04 — caption-gate conflict (OPEN decision for Faisal).** `release:check` requires `NEXT_PUBLIC_AENURAL_AUTO_CAPTION_RELEASE=1`, but this handover (§C) says `0` unless the caption launch is separately approved. This is an open decision, not a bug to work around: **do NOT set it to `1` just to pass `release:check`.** Faisal decides whether the caption launch is approved; until then the release check and this handover disagree, and that disagreement must be resolved by his decision, not by flipping the value.

**Phase 4 fixes — APPLIED in the Phase 4 push (commit `1110f6ab`), re-verified in the merged test tree 2026-11-19.** They were staged at `phase4/handover/files/` during the audit and then applied to the branch; do **not** re-apply the staged copies.

| Fix | File (repo-relative) | What it does | Verification (already applied in `1110f6ab`) |
|---|---|---|---|
| F-1 | `server/membership/owner-activation.mjs` | Malformed stored activation hash now returns 403 instead of `RangeError` 500. | `node --check server/membership/owner-activation.mjs`. |
| F-2 | `server/membership/config.mjs` | `AUTH_TRUSTED_IP_HEADER` is now required in non-local owner-only mode too (previously only in MySQL mode). **Consequence (corrected, Step 5 S5-21):** the header is required in explicit owner-test mode (`AENURAL_OWNER_TEST_MODE=1`) and in enabled mode; a fully disabled deploy does not start auth at all and needs no header. | `node --check server/membership/config.mjs`, then `node --test tests/mysql-tls-config.test.mjs` (expect 19 pass). |
| F-3 | `scripts/membership/release-check.mjs` | Fails when `AENURAL_MEMBERSHIP_ENABLED=1` but the real `NODE_ENV !== 'production'` (previously masked — the app would have run SQLite instead of MySQL). | `node --check scripts/membership/release-check.mjs`, then run `release:check` with the production env (expect exit 0) and once with `NODE_ENV` unset (expect exit 1 with the new message). |

### A.5 What is unverified (do not mistake this document for verification)

- Live MySQL/SMTP/end-to-end OTP against MySQL; live-browser rendering (mobile, light/dark); the production repository's state (not fetched in this task — see §D); Hostinger hPanel facts (§B). (Lint/typecheck/full tests/build in CI are now verified — CI run #232 green, see §A.2.)
- `tests/email-otp.test.mjs` could not be re-run by Worker F: the GitHub fetch pipeline replaced the 6-digit OTP literals in the fetched copy with `[credential:<uuid>]` placeholders, corrupting it (`SyntaxError`). The file on the branch is unaffected; the Phase 2/3 numbers above are prior evidence only.

### A.6 What this release deliberately does NOT include

Merging PR #21; any change to tools, blog, pricing, payments logic, quota behaviour (3/day, decided), or page designs beyond the verification form; enabling sales (`AENURAL_SALES_ENABLED` stays off unless separately approved); deploying to Hostinger; touching the production repo outside §D; any weakening of a security control for deployment convenience (in particular: never `rejectUnauthorized: false`, never trust a guessed proxy header, never enable the local outbox in production).

---

## B. Hostinger admin checklist — complete in ONE session

Do this in a single hPanel session so nothing is left half-configured. Work top to bottom. Record every value privately (password manager / private note) — **never in the repo, never in chat, never in a ticket or screenshot**. Tick each box only when it is actually done, not when it is "planned".

### B.1 Production database

**The live database already exists — do NOT create a second one.** It is `u853936014_aenural_dev` on `srv2224.hstgr.io:3306`, user `aenural_devuse` (confirmed by Faisal, 2026-11-20). **Naming clarification: the database name ends in `_dev`, but it was created FOR the live website — it IS the production database.** There is no separate prod DB and no dev/prod mixing concern. Production connects via `DB_HOST=127.0.0.1` from the Hostinger web server; `srv2224.hstgr.io` is for PC-side access only and must never appear in the production env vars (§C).

- [ ] Record the exact production database name: **`u853936014_aenural_dev`** (confirmed 2026-11-20 — live DB despite the `_dev` name).
- [ ] **Schema status: ZERO tables exist.** Faisal confirmed (2026-11-20) he never created the tables — the database has no schema yet. The 14-table import (§B.4) is pending Step 10 work.
- [ ] Confirm the database default charset is `utf8mb4` (phpMyAdmin → database → Operations, or run `SELECT DEFAULT_CHARACTER_SET_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'u853936014_aenural_dev';` — expect `utf8mb4`).

### B.2 Production database user (least privilege)

- [ ] The live database user already exists: **`aenural_devuse`** (confirmed by Faisal, 2026-11-20). Do **not** create a second user. Its password is known to Faisal — never ask for it in chat and never write it in the repo.
- [ ] Record the exact production username: **`aenural_devuse`** (copy it character for character from hPanel if there is any doubt about the spelling).
- [ ] Grant the production user rights **only** on the production database.
- [ ] Runtime privilege (least privilege): grant only `SELECT, INSERT, UPDATE, DELETE` on the production database. Do **not** grant `DROP`, `ALTER`, `CREATE`, `FILE`, `GRANT OPTION`, or any server-wide privilege to the runtime user. The one-time migration (§E.4) is run by you from phpMyAdmin (or a separate migration user), not by the app.
- [ ] Store the production DB password only in the password manager and (later) hPanel env vars (§B.5). It lives nowhere else.

### B.3 Hostname — verify, do not assume

- [ ] In hPanel, open Databases → production database → details and confirm the host shown for the **hosted app** is `127.0.0.1` (Hostinger's own Node.js guide says the app runs on the same host as MySQL; the remote hostname works only from outside Hostinger; `localhost` fails on Node 17+ because it resolves to IPv6 `::1`).
- [ ] Host confirmed: `127.0.0.1` ☐ / other (record exactly what hPanel shows): ______________________
- [ ] If hPanel shows anything other than `127.0.0.1`, **stop** — do not guess a host. Ask Hostinger support for the correct host for a managed Node.js app on this plan, and record the answer before continuing.
- [ ] **Remote MySQL for the production database: leave it OFF.** Do not add your PC's IP to the production database's Remote MySQL list, and never enable "Any Host".
- [ ] Note: remote access from Faisal's PC previously failed with `ER_ACCESS_DENIED_ERROR` for `aenural_devuse` (wizard Stage C). Resolving that is part of gates G2/G3; it does not change the production loopback setup above — production access is proved from the Hostinger web server in Step 10, not from the PC.

### B.4 Schema (production)

- [ ] Regenerate the migration from the exact code being deployed (offline, on the release commit): `npm run membership:prepare-mysql`. Confirm with `git status` / `git diff` that `server/membership/migrations/001-initial-mysql.sql` matches the deployed auth options. **Never hand-edit the SQL.**
- [ ] Read the SQL once before running it: it must contain the 5 Better Auth tables (`user`, `session`, `account`, `verification`, `rateLimit`) + the 8 app tables (`aenural_activity`, `aenural_projects`, `aenural_caption_jobs`, `aenural_daily_usage`, `aenural_checkouts`, `aenural_orders`, `aenural_operation_limits`, `aenural_webhooks`) + the delivery-audit table (`aenural_email_delivery_attempts`, migration 002) — **14 tables in total**, `utf8mb4`, and **no `DROP`**. If it contains anything else, stop.
- [ ] Import it into the **production** database only (phpMyAdmin → select the production database first → Import). Double-check the database name in the phpMyAdmin left panel before clicking Import. Importing into the wrong database is the most likely serious mistake in this phase.
- [ ] Verify: `SHOW TABLES;` lists all 14 tables in the production database. (Detail and the read-only checker: production checklist §4; §E.4.)

### B.5 Environment variables (hPanel Node.js app)

Set these in hPanel → Node.js app → Environment variables. Copy names character for character. Use the template in §C — **do not copy any dev-only value** (dev secret, `srv2224.hstgr.io` as `DB_HOST`). The database name `u853936014_aenural_dev` and user `aenural_devuse` are the live values (§B.1–§B.2), not dev values to avoid. Restart the app after saving (env changes only take effect on restart).

- [ ] `NODE_ENV=production` — required. (Without it the app treats the run as local/SQLite mode; fix F-3 makes `release:check` catch this, but the app itself still depends on the value being set.)
- [ ] `BETTER_AUTH_URL=https://aenural.com` and `SITE_URL=https://aenural.com` (same origin, `https:`).
- [ ] `BETTER_AUTH_SECRET` — fresh production secret, ≥32 chars, different from dev. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` on a trusted machine; paste **only** into hPanel.
- [ ] `DB_HOST=127.0.0.1` (per §B.3), `DB_PORT=3306`, `DB_NAME` + `DB_USER` + `DB_PASSWORD` from §B.1–B.2.
- [ ] `DB_SSL_CA_FILE` / `DB_TLS_ALLOW_PUBLIC_CA` — **leave unset** in production (loopback needs no TLS). Set only if a test on Hostinger proves otherwise — never blindly.
- [ ] `SMTP_HOST`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER=support@aenural.com`, `SMTP_PASSWORD` (mailbox password), `MAIL_FROM=support@aenural.com` — see §B.6.
- [ ] `AUTH_TRUSTED_IP_HEADER` — set only to the value confirmed in §B.8. **Required in explicit owner-test mode (`AENURAL_OWNER_TEST_MODE=1`) and in enabled mode; a fully disabled deploy does not start auth at all and needs no header** (Step 5, S5-21 — corrects the old fix F-2 wording).
- [ ] `AENURAL_MEMBERSHIP_ENABLED` — **leave unset / `0` for now.** It is flipped to `1` only in §E.5 (controlled activation), never during this session.
- [ ] `AENURAL_MEMBERSHIP_DATABASE` — leave unset in production.
- [ ] `NEXT_PUBLIC_AENURAL_SITE_PREVIEW=0` — preview is OFF unless explicitly set to `1` (opt-in only since Step 5, S5-19).
- [ ] **Do not set in production:** `AENURAL_OWNER_TEST_MODE=1`, any `AENURAL_*_QA` / hybrid switches, `AENURAL_EMAIL_TRANSPORT=local-outbox` (startup error in production — and must never be set there), dev-only database values, the dev secret.
- [ ] Restart the Node.js app in hPanel after saving, then check the app logs for a startup error before testing anything in a browser.

### B.6 Mailbox + SMTP

- [ ] **Confirmed 2026-11-20 (Faisal): `support@aenural.com` is a Hostinger Email mailbox (NOT Titan).** SMTP is `smtp.hostinger.com:465`. Record the product: Hostinger Email ☑ / Titan ☐ (Titan does not apply — skip the Titan steps in the SMTP verification doc).
- [ ] Confirm the mailbox password (the **mailbox** password, not the hPanel password) and that SMTP auth works for it.
- [ ] Check the mailbox daily sending limit (hPanel → Emails → Mailboxes → View limits) and confirm it covers expected verification/reset volume. Limit found: ______________________ (still to-confirm).
- [ ] Send one real test verification email from the production host and confirm receipt (this happens in §E.6 — do not send test mail from the production host before §E.5).

### B.7 DNS email authentication

- [ ] SPF record for `aenural.com` present: `v=spf1 include:_spf.mail.hostinger.com ~all` (Hostinger Email applies — confirmed §B.6; the Titan equivalent does not apply).
- [ ] DKIM CNAMEs present for the mailbox provider.
- [ ] `_dmarc` TXT record present, starting at `p=none`. **DMARC is not auto-added by Hostinger — add it by hand if missing.** If the domain does not use Hostinger nameservers, add all three records manually at the DNS provider.
- [ ] After the first live test mail (§E.6), check the receiving mailbox's "show original" / authentication results: SPF **and** DKIM must both pass. "It arrived" alone is not a pass.

### B.8 Trusted proxy (the value you must not guess)

- [ ] In hPanel, confirm **Hostinger CDN is enabled** for `aenural.com` (Websites → Dashboard → CDN / Performance; panel names vary — if you cannot find the toggle, ask support, do not assume it is on). CDN enabled: Yes ☐ / No ☐.
- [ ] Confirm **no Cloudflare or other proxy sits in front** of Hostinger CDN (check where `aenural.com` DNS points: an orange-clouded Cloudflare A record, or any other CDN/WAF, means `X-Real-IP` holds that proxy's address, not the visitor's). Other proxy in front: Yes ☐ (record which) / No ☐.
- [ ] If either check above fails or cannot be determined, ask Hostinger support — verbatim:
  > "For a Node.js app on Hostinger Cloud Startup (domain aenural.com), which incoming HTTP header does your trusted proxy overwrite with the visitor's real IP address — `x-real-ip`, `x-forwarded-for`, or `cf-connecting-ip`? My auth library (Better Auth) uses this header for rate limiting, so I need the exact header your proxy sets and that a visitor cannot spoof. Is Hostinger CDN enabled for this domain, and is there any other proxy in front of it?"
- [ ] Record the support answer with date + ticket/chat reference: ______________________
- [ ] Set `AUTH_TRUSTED_IP_HEADER` to exactly the value Hostinger confirmed. Recommended value is `x-real-ip` (valid only while both checks above pass). If Hostinger names a different header, use exactly that value — but `release:check` accepts only `x-real-ip` (Step 5, S5-02); if Hostinger names anything else, **stop and report it** — the allowlist in `server/membership/config.mjs` must be updated to exactly that value at the same time, never widened speculatively.
- [ ] **Do not enable membership in production until this section is complete.** A wrong header means rate limiting trusts a spoofable header (SEC-01).

### B.9 Hosting config

- [ ] Confirm the hosting plan runs a managed Node.js app (Cloud Startup, hPanel) — not a VPS. (On a VPS you run MySQL yourself; the `127.0.0.1` assumption in §B.3 still applies only if MySQL runs on that same VPS. This handover assumes the managed Cloud Startup Node.js app.)
- [ ] Confirm the app's Node.js version is 22 or 24 (the repo uses Node 24; `release:check` rejects <22).
- [ ] Confirm HTTPS is live at `https://aenural.com` (the app throws in production if `BETTER_AUTH_URL` is not `https:`).
- [ ] Confirm how to read the app logs in hPanel and how to restart the app — you will need both in §E and §F.
- [ ] Confirm Hostinger's own backup/retention for the plan and its limits — do not assume it covers the MySQL database at the granularity you need (§F.1 is your own backup, regardless).

**End of session checkpoint:** every box in §B is ticked, or the session stops at the first unticked box and that box is recorded as a named blocker with its owner. Do not proceed to §D/§E with an unticked §B box.

---

## C. Production environment template

Copy this into hPanel → Node.js app → Environment variables (§B.5). **Safe placeholders only — no real or dev credentials appear in this document.** Every value marked `<…>` must be replaced with the production value from §B; a line left as `<…>` will make the app throw at startup (that is the intended fail-closed behaviour — do not "fix" it by copying a dev value).

| Variable | Value | Required? |
|---|---|---|
| `NODE_ENV` | `production` | **Required.** Without it the app runs in local/SQLite mode. |
| `BETTER_AUTH_URL` | `https://aenural.com` | **Required.** Must be `https:` in production. |
| `SITE_URL` | `https://aenural.com` | **Required.** Must share an origin with `BETTER_AUTH_URL`. |
| `BETTER_AUTH_SECRET` | `<fresh-production-secret-32-plus-chars>` | **Required.** Fresh, different from dev. Generate locally; paste only into hPanel. |
| `DB_HOST` | `127.0.0.1` | **Required.** Per §B.3. Never `localhost`, never `srv2224.hstgr.io` from inside Hostinger. |
| `DB_PORT` | `3306` | **Required.** |
| `DB_NAME` | `u853936014_aenural_dev` | **Required.** The live DB (name ends in `_dev`, confirmed 2026-11-20 — see §B.1). |
| `DB_USER` | `aenural_devuse` | **Required.** Exact hPanel spelling. |
| `DB_PASSWORD` | `<production-database-password-from-B.2>` | **Required.** hPanel env vars only. |
| `DB_SSL_CA_FILE` | *(leave unset)* | Optional — loopback only. Set only if a Hostinger-side test proves TLS is needed. Never put PEM contents in an env var (file path only). |
| `DB_TLS_ALLOW_PUBLIC_CA` | *(leave unset)* | Optional — remote-dev only. Never set in production. |
| `SMTP_HOST` | `smtp.hostinger.com` | **Required.** Hostinger Email confirmed 2026-11-20 (§B.6); Titan does not apply. |
| `SMTP_PORT` | `465` | **Required.** `587` only if 465 is blocked on the host (then `SMTP_SECURE=false`). |
| `SMTP_SECURE` | `true` | **Required.** `false` only with port 587 (STARTTLS). Do not mix the pairs. |
| `SMTP_USER` | `support@aenural.com` | **Required.** Full mailbox address. |
| `SMTP_PASSWORD` | `<support-mailbox-password>` | **Required.** Mailbox password, not the hPanel password. |
| `MAIL_FROM` | `support@aenural.com` | **Required.** Note the name is `MAIL_FROM`, not `SMTP_FROM` (that name is wrong wherever it appears). |
| `AUTH_TRUSTED_IP_HEADER` | `<value-confirmed-by-Hostinger-in-B.8>` (recommended: `x-real-ip`) | **Required in explicit owner-test mode (`AENURAL_OWNER_TEST_MODE=1`) and in enabled mode; a fully disabled deploy does not start auth at all and needs no header** (Step 5, S5-21). Never guess. |
| `AENURAL_MEMBERSHIP_ENABLED` | `0` until §E.5, then `1` | **Required (controlled).** Only set to `1` in the controlled activation step. |
| `AENURAL_MEMBERSHIP_DATABASE` | *(leave unset)* | Optional — not needed in production. |
| `AENURAL_EMAIL_TRANSPORT` | *(leave unset)* | Optional — unset means SMTP when configured. **Never `local-outbox` in production** (startup error; outbox files contain live codes). |
| `NEXT_PUBLIC_AENURAL_SITE_PREVIEW` | `0` | **Required.** Preview is OFF unless explicitly set to `1` (opt-in only since Step 5, S5-19). |
| `NEXT_PUBLIC_AENURAL_AUTO_CAPTION_RELEASE` | `0` unless the caption launch is separately approved | Optional — do not enable as a side effect of enabling auth. **OPEN DECISION (R-04, 2026-11-20):** `release:check` requires this to be `1`, but this handover says `0` unless the caption launch is separately approved. Faisal decides; **do NOT set it to `1` just to pass `release:check`** (see §A.4 item 7). |
| `LEMONSQUEEZY_API_KEY` / `LEMONSQUEEZY_STORE_ID` / `LEMONSQUEEZY_VARIANT_ID` / `LEMONSQUEEZY_WEBHOOK_SECRET` | `<live-values-only-if-sales-approved>` | Optional / provider-specific. Leave unset (or test-mode values) unless sales are being enabled in the same release. `AENURAL_SALES_ENABLED` stays `0` unless separately approved; live sales must never use `LEMONSQUEEZY_TEST_MODE=1`. |

**Do not set in production:** `AENURAL_OWNER_TEST_MODE=1`, any `AENURAL_*_QA` / hybrid switches, dev-only database values, the dev secret, `AENURAL_EMAIL_TRANSPORT=local-outbox`.

```env
# AENural production environment — hPanel Node.js app env vars.
# Replace every <...> with the production value from handover §B.
# NEVER copy values from .env.local (dev) into this list.
NODE_ENV=production
BETTER_AUTH_URL=https://aenural.com
SITE_URL=https://aenural.com
BETTER_AUTH_SECRET=<fresh-production-secret-32-plus-chars>
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=u853936014_aenural_dev
DB_USER=aenural_devuse
DB_PASSWORD=<production-database-password-from-B.2>
# DB_SSL_CA_FILE= (leave unset — loopback only)
# DB_TLS_ALLOW_PUBLIC_CA= (leave unset — remote-dev only)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=support@aenural.com
SMTP_PASSWORD=<support-mailbox-password>
MAIL_FROM=support@aenural.com
AUTH_TRUSTED_IP_HEADER=<value-confirmed-by-Hostinger-in-B.8>
AENURAL_MEMBERSHIP_ENABLED=0
NEXT_PUBLIC_AENURAL_SITE_PREVIEW=0
```

---

## D. GitHub release transfer — Faisal repo → production repo (VS Code)

**Who:** Faisal only, in VS Code, on his PC. **Never** force-push. **Never** blindly overwrite. If any step below fails or surprises you, stop and report it — do not improvise a push.

### D.1 Preconditions

- [ ] Release is at state 3 (§A.3 — all gates pass, including G4 trusted-proxy confirmation and G6 fixes F-1/F-2/F-3 applied).
- [ ] PR #21 is **not** merged yet, or the approved release commit is identified in D.3 — merging is a separate, explicit decision by Faisal, not part of this transfer.
- [ ] You have push access to `AmirNazir3784/AE-NUREL` and know its default branch name (check on GitHub first — do not assume it is `main`).

### D.2 Fetch both repositories

In VS Code (two separate local folders — never mix the two checkouts in one folder):

```powershell
# Folder 1: development repo (already on your PC)
cd D:\Work\online-tools-platform
git fetch origin
git checkout feature/hostinger-authentication
git pull origin feature/hostinger-authentication
git log --oneline -5   # confirm HEAD is the approved release commit from D.3

# Folder 2: production repo (clone it fresh if you do not have it)
git clone https://github.com/AmirNazir3784/AE-NUREL.git D:\Work\aenural-production
cd D:\Work\aenural-production
git fetch origin
git checkout <production-default-branch>   # e.g. main — confirm the name on GitHub first
git pull origin <production-default-branch>
git log --oneline -5   # record the production HEAD commit: ______________________
```

### D.3 Verify branch and tree — identify the approved release commit

- [ ] In the dev repo, record the exact release commit (full SHA): ______________________ — this is the commit that passed §A.3. The release commit is **`9abce77`** (or its successor, if a further commit — e.g. this docs re-issue — lands on top of it; record whichever it is, and why). F-1/F-2/F-3 already landed in `1110f6ab`; there is no "fixes rejected" branch anymore.
- [ ] Confirm the release commit is on the branch and in PR #21 (`git branch --contains <sha>`, and the PR's commit list).
- [ ] In the production repo, record the current production HEAD (full SHA): ______________________ and the date of its last deploy to Hostinger: ______________________
- [ ] Compare histories: `git log --oneline <prod-HEAD>.. <release-commit>` (in a repo that has both remotes — see D.4) and `git log --oneline <release-commit>.. <prod-HEAD>`. Record: commits only in dev: ______; commits only in prod: ______.

### D.4 Compare and detect conflicts — preserve production-only changes

Do the comparison in a scratch clone (or a temporary remote) so neither working repo is disturbed:

```powershell
cd D:\Work\aenural-production
git remote add faisal https://github.com/faisalhere-afk/aenural-website.git
git fetch faisal feature/hostinger-authentication
git diff --stat <prod-HEAD>...faisal/feature/hostinger-authentication
git log --oneline <prod-HEAD>...faisal/feature/hostinger-authentication
```

- [ ] List every file that differs: ______________________
- [ ] Identify **production-only changes** (anything in the production repo that is not in the dev branch): ______________________ — typically production config, deploy settings, or hotfixes. **These must be preserved.** If a file differs in both repos, that is a conflict to resolve by hand, file by file — never by taking one side wholesale.
- [ ] Check specifically for divergence in: `.github/workflows/` (CI — the workflow is installed on the branch and green, run #232; confirm the production repo's workflow matches the installed one, and do not re-apply the superseded `docs/ci-retarget-patch.md`), `package.json` / `package-lock.json`, `next.config.ts`, any `*.env*` or config file, and any file the production repo has that the dev branch does not.
- [ ] If the histories have diverged in a way you cannot explain file by file, **stop**. Do not proceed to D.5. Report the divergence (both SHAs + the diff stat) and get a review before any push.

### D.5 Review the diff, then the approved push

- [ ] Review the full diff (`git diff <prod-HEAD>...faisal/feature/hostinger-authentication`) — read it, do not skim. Confirm it contains only the approved auth work (+ the Phase 4 fixes) and nothing unrelated (no tools/blog/pricing/payments changes beyond what §A.1 lists, no secrets, no dev credentials, no `.env.local`, no `owner-bootstrap.json` hash — the file holds no hash at all since Step 5 S5-04, scrypt hash in env only — and its rotation is §F.3, owner-paused).
- [ ] Merge the release into the production branch **as a merge commit or a reviewed PR inside the production repo** — whichever the production repo's normal flow is. Do **not** force-push, do **not** `push --force`, do **not** delete the production branch, do **not** push directly over production HEAD without review.
- [ ] Push only the production branch you reviewed, from the production folder:
  ```powershell
  cd D:\Work\aenural-production
  git push origin <production-default-branch>
  ```
  (If the production flow uses a PR: push a release branch and open the PR there instead; the same review rules apply, and the PR must be approved before merging.)
- [ ] Record the pushed production commit (full SHA): ______________________ and the push time: ______________________

### D.6 Verify the Hostinger deploy

- [ ] Confirm Hostinger picked up the new production commit (hPanel Node.js app → deployment / git log, or the deploy method the production repo uses). If Hostinger deploys from a different branch or by manual upload, follow that repo's established deploy method — do not invent a new one during this release.
- [ ] Confirm the app restarts cleanly: check the app logs for a startup error **before** testing in a browser. A missing required env var makes the app throw at startup — that is a good failure (loud, early). A silently wrong `DB_HOST` is a bad one — re-check §B.3/§B.5 if the logs show `ECONNREFUSED` or access-denied.
- [ ] Confirm the public site still loads (`https://aenural.com`, a tool page, `/pricing`, `/blog`) with membership still disabled (`AENURAL_MEMBERSHIP_ENABLED=0` at this point). If the public site is broken, go to §F immediately — do not proceed to §E.5.
- [ ] Remove the temporary `faisal` remote from the production folder (`git remote remove faisal`) so later fetches cannot confuse the two repos.

---

## E. Controlled deployment sequence

### E.1 Deploy with auth disabled

- [ ] Deploy the release commit to Hostinger per §D.6, with `AENURAL_MEMBERSHIP_ENABLED=0` (or unset) in the hPanel env vars. Membership is fully disabled in this state — the site stays up, auth-gated features stop, and no MySQL writes happen. (Owner-only mode is a separate explicit opt-in, `AENURAL_OWNER_TEST_MODE=1`, not the disabled state.)
- [ ] Verify the public site (homepage, one tool page, `/pricing`, `/blog`, navigation) and confirm no startup error in the logs.

### E.2 Verify the public site

- [ ] Homepage loads; a free tool works end to end (guest path, no sign-in); `/pricing` loads; `/blog` loads; header/footer/navigation unchanged.
- [ ] `/account` does **not** expose account content without sign-in (with `NEXT_PUBLIC_AENURAL_SITE_PREVIEW=0`, it must not render the account preview; with membership disabled it must redirect or 404 — record what you observe: ______________________).
- [ ] Confirm the production headers are live (DevTools → Network → any page → Response Headers): HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, CSP `frame-ancestors 'self'`, and `Cache-Control: private, no-store` on `/api/auth/*`, `/api/membership/*`, `/account/*`, `/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password`, `/reset-password`.

### E.3 Complete DB + SMTP config

- [ ] All of §B is complete and ticked (if any box was left open, stop here — do not proceed).
- [ ] `npm run release:check` passes with the production env vars (names only — it cannot prove reachability, schema, or delivery). Run it with the production values loaded; expect exit 0.
- [ ] Confirm the app logs show no startup error after the §B.5 restart.

### E.4 Apply migrations

- [ ] The migration file was regenerated from the exact release commit and reviewed (§B.4). It is imported into the **production** database only.
- [ ] Verify `SHOW TABLES;` lists all 14 tables in the production database. If any table is missing, stop — do not enable membership.
- [ ] From a machine that can reach the production database (on Hostinger, or via phpMyAdmin SQL — **not** from the cloud, and never by enabling Remote MySQL for this), run the read-only checker if you have a secure way to provide production env vars: `node scripts/membership/verify-mysql-schema.mjs`. Never paste production credentials into a shared terminal.
- [ ] **Re-import is not a migration.** If the schema drifts later, regenerate, review the diff, and apply the *change* only — never blindly re-import the whole file over a live database containing users, and never hand-edit the SQL.

### E.5 Controlled activation

- [ ] Preconditions: §E.1–§E.4 all ticked; §A.3 gates G1–G10 all pass; §B complete; backup taken (§F.1) and test-restore done (§F.2).
- [ ] In hPanel, set `AENURAL_MEMBERSHIP_ENABLED=1` (and nothing else — do not change any other env var in this step) and **restart the app**.
- [ ] Check the app logs immediately: the app must start with no error, and (for a loopback DB) no TLS error is expected. If startup fails, go to §F — do not retry the flip.
- [ ] Confirm the membership API answers: `GET https://aenural.com/api/membership/access` as an anonymous visitor returns the guest/anonymous shape (not a 500, not a stack trace).

### E.6 Live verification — signup / OTP / login / logout / reset (this is what earns state 4)

Run the setup guide's §10 end-to-end test **again, live, against `https://aenural.com`** — do not assume the local pass transfers. Use a real test mailbox you control, and a second account for isolation. Tick each box with the observed result, not from memory.

- [ ] Sign-up with a real mailbox you control → lands on `/verify-email` with the masked email shown (you do **not** type the email again).
- [ ] Verification email received from `support@aenural.com` → check "show original": SPF **and** DKIM pass. If nothing arrives in 5 minutes, check the server logs for `[membership] Email send failed` — that log line is the source of truth (Better Auth answers success even when mail fails; see §A.4 item 2).
- [ ] Enter the 6-digit code → "Email verified" → lands on `/account` **already signed in**.
- [ ] Negative OTP checks: wrong code rejected; 5 wrong attempts invalidate the code; a code older than 5 minutes is rejected as expired; a used code cannot be reused; Resend is disabled during the 60s countdown and the old code stops working after resend.
- [ ] Refresh `/verify-email` mid-flow: the masked email is still there (server cookie). Direct visit with no pending signup shows the recovery step.
- [ ] Duplicate signup rejected cleanly; wrong password rejected; unverified account cannot sign in.
- [ ] Logout works; anonymous visit to `/account` redirects to `/sign-in`.
- [ ] Password reset in a fresh browser: neutral message, reset link works, new password signs in, old sessions revoked, reused token fails, expired token (>30 min) fails.
- [ ] Rate limiting observed on rapid retries (429, then wait a minute); resend throttling — three separate limits, test each one separately: (a) OTP-send **3/min per IP** (setup guide §10); (b) `/api/membership` resend route **30/min per IP** (Step 5, S5-30); (c) per-email budget **10/hour, 20/day + 1-hour cooling-off** (Step 5, S5-16). Expect 429 when a limit is hit.
- [ ] A/B isolation: the second account sees only its own projects, history, and orders.
- [ ] MySQL confirmation (read-only queries via phpMyAdmin against the **production** database): test users/sessions present in `user`/`session`; **no test rows from local/dev testing present** — clean up any G2 test accounts before real users arrive (local testing used the same live database, §B.1).
- [ ] Trusted-proxy verification: sign in from a known IP, then `SELECT ipAddress FROM session ORDER BY createdAt DESC LIMIT 5;` — the newest row must show **your real IP**, not a CDN/proxy address. If it shows a proxy address, disable membership (`AENURAL_MEMBERSHIP_ENABLED=0`, restart) and re-open §B.8 with support. Also check the logs for Better Auth's "could not determine a client IP" warning.
- [ ] Secure cookies verified in the browser (DevTools → Application → Cookies): `better-auth.session_token` has the `Secure` flag.
- [ ] Backups (§F.1) are current as of enablement day.
- [ ] **Only if sales are being enabled in the same release:** one real Lemon Squeezy test-mode checkout + webhook + refund revocation. Otherwise leave payments disabled and record that as out of scope.

**Sign-off (fill in by hand on the day — state 4 is not reached until this is filled in):**

> Local testing passed on: ________  |  Production enabled on: ________
> Enabled by: ________  |  Release commit deployed: ________
> `AUTH_TRUSTED_IP_HEADER` value used: ________ (Hostinger-confirmed, §B.8)
> Free-quota policy: **3 videos per day (UTC reset)**  |  Backup taken: ☐  |  Test-restore done: ☐
> Live verification (§E.6) completed by: ________ on: ________

---

## F. Rollback

Read the app logs first. Speed matters less than not making it worse. Work in this order.

### F.1 App rollback (first — stop the bleeding)

1. **Disable membership in production** (hPanel Node app env vars): set `AENURAL_MEMBERSHIP_ENABLED` to `0` (or remove it) and restart the app. Membership is fully disabled — the site stays up, auth-gated features stop, and no new MySQL writes happen. (Owner-only mode is a separate explicit opt-in, `AENURAL_OWNER_TEST_MODE=1`, not the disabled state. Confirm this behaviour on the §E.1 deploy first — do not discover it during an incident.)
2. **Preserve evidence:** copy the app logs and the exact error text before restarting anything else. Do not delete the production database.
3. **Diagnose from the checklist:** most likely causes, in order — wrong `DB_HOST` (`localhost`/`srv*.hstgr.io` instead of `127.0.0.1`), missing required env var (including `NODE_ENV=production` — see fix F-3), schema not imported (§E.4), wrong `AUTH_TRUSTED_IP_HEADER`, SMTP failure (verified users can still sign in, but new signups stall).
4. **Restore the previous code** (if the failure is a code regression): in the production repo, check out the last known-good commit/branch recorded in §D.3 and redeploy through the normal Hostinger Node app flow. Do not hot-edit files on the server. Never force-push the rollback.
5. **Re-enable only after the local reproduction passes:** reproduce the failure against the dev database using the setup guide, fix it there, and re-run §E.6 before flipping `AENURAL_MEMBERSHIP_ENABLED=1` back on.

### F.2 Activation-state rollback

- Disabling membership (`AENURAL_MEMBERSHIP_ENABLED=0`) does **not** delete accounts, sessions, or orders — it only stops auth-gated features. Users' data stays in the production database.
- To re-enable after a fix, set the flag back to `1` and restart (§E.5). No re-migration is needed if the schema is unchanged.
- If activation itself must be undone because the wrong code was deployed (e.g. membership was enabled before §B.8 passed): disable the flag, fix the underlying issue (usually the trusted-proxy header or the schema), and re-run §E.5–§E.6 from the top. Do not leave the flag at `1` while a gate is failing.

### F.3 Environment rollback

- Env vars are changed only in hPanel (never in git). To roll back an env change, restore the previous value in hPanel and restart the app. Keep a private record of the previous values (password manager) before changing them in §E.5.
- If a secret was ever pasted into the wrong place (chat, ticket, terminal history, a file): treat it as compromised — rotate it (new `BETTER_AUTH_SECRET` invalidates all existing sessions, which is the correct response to a secret leak; new DB/mailbox passwords likewise), and never reuse the leaked value.
- **Owner activation token:** revocation is rotation (§A.4 item 4; `docs/authentication/owner-activation-rotation.md`). Rotate to a fresh random token (hash stored in env only as scrypt since Step 5, S5-04 — **never committed to the repo**, plaintext discarded) — the old token then fails the hash check. **Owner activation is PAUSED (2026-11-20); this step applies only if/when owner activation resumes — it is not a pre-live gate for normal login.** If the owner account itself must go: **rotate first, delete second** (deleting the row without rotating re-arms the old token). Deleting the owner row: delete from `account` where `userId` = the owner id, then from `user` where `email` = the owner email — or use the app's own delete-account flow while signed in as the owner. After any activation (including a test one), rotate again before production use; dev and production tokens must never be the same.

### F.4 Schema rollback

- **There is no schema "undo" for this release** — the migration contains no `DROP`, and the app never auto-migrates MySQL. Rolling back the *code* does not roll back the *schema*, and that is by design: the 14 tables are additive and the previous code simply stops using them.
- If a migration was applied to the **wrong database**: stop, record exactly which database received it, and assess before touching anything — do not "fix" it by importing again elsewhere. The wrong-database import is a data-hygiene problem (test rows in prod, or a missing schema), not a reason to drop tables.
- Never `DROP` a production table to "roll back" a migration. If data is damaged, restore from backup (§F.5) instead.

### F.5 Backup / restore and account-data protection

**Before enablement (do this in §B/§E, not "someday"):**

- [ ] **Export via phpMyAdmin:** hPanel → Databases → (production DB) → phpMyAdmin → select the production database → Export → Quick, SQL → Go. Save the `.sql` file somewhere safe **off** the hosting account (your PC / encrypted storage), labelled with the date. Verify the file is non-empty and starts with the expected table names.
- [ ] **Alternative (`mysqldump`, only where the production DB is reachable):** `mysqldump --host=127.0.0.1 --port=3306 --user=<prod-user> -p --single-transaction --routines <prod-db-name> > aenural-prod-YYYY-MM-DD.sql` (password at the prompt, never on the command line). With Remote MySQL off (§B.3) this only works on the Hostinger host itself (e.g. via SSH, if available on the plan) or via phpMyAdmin. Do not enable Remote MySQL just to take a backup.
- [ ] Record the restore procedure next to the backup: import the `.sql` file into an **empty** database via phpMyAdmin (Import) and verify `SHOW TABLES;` + row counts afterwards.
- [ ] **Test-restore once before enablement:** in hPanel create a throwaway database (e.g. `…_restore_test`), import the backup `.sql` into it via phpMyAdmin, run `SHOW TABLES;` (must list all 14 tables) and compare row counts against production (`SELECT COUNT(*) FROM user;` etc. — counts must match the backup, not necessarily live production if users signed up since). If the import errors or any table/count is wrong, the backup is broken — fix the backup procedure before enabling membership. **Delete the throwaway database afterwards** (it contains copies of password hashes and sessions — do not leave it lying around). Record the test-restore date next to the backup.
- [ ] Note Hostinger's own backup/retention for the plan and its limits — do not assume it covers the MySQL database at the granularity you need.

**Restore (only if data is damaged):**

1. Import the §F.5 backup into the production database (phpMyAdmin Import into an empty DB, or restore over the damaged one only if you are sure the backup is newer than the damage and you accept losing signups since the backup).
2. Verify `SHOW TABLES;` (14 tables) and row counts before re-enabling membership.
3. **Never restore a dev database backup into production.** Dev backups contain test accounts, test sessions, and possibly partial imports — restoring one into production would ship test users and their password hashes to real users.
4. **Account-data protection during any restore:** backups contain password hashes, session tokens, emails, and order records. Keep backup files off the hosting account, encrypted where possible, and delete throwaway restore databases immediately after verification. Do not email backup files, do not paste them into chat, and do not store them in the repo.
5. After a restore, all sessions created after the backup are gone — affected users will need to sign in again. That is expected; do not "fix" it by restoring a newer, unverified backup.

---

## Document control

- **Drafted:** 2026-11-19, Worker F (Phase 4 regression + security audit), from branch `feature/hostinger-authentication` HEAD `bca377b` and the Phase 1–3 reports.
- **Re-issued:** 2026-11-20, Worker A (Step 7 docs fix), from branch HEAD `9abce77` — state 2 closed by CI run #232; G1/G10 closed, G9 re-scoped to owner-paused; Step 5 fixes and CI-fix commits folded in; live-DB naming clarification and email confirmation recorded; §B.4 fixed to all 14 tables; R-04 caption-gate conflict added as an open decision.
- **Status:** draft handover, **not** a deployment approval. Release state 2 (state 3 NOT reached — G4 open; **NOT production-ready**).
- **Next update:** after Faisal's local integration results (G2) and the G4 Hostinger confirmation; then fill in the sign-off lines. Do not claim state 3 until §A.3 is fully green.
- **Never edit this document to claim a state that has not been earned.** If a gate fails, record the failure here and stay at the lower state.
