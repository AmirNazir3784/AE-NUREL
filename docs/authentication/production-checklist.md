# AENural — Production Checklist: Better Auth + Hostinger MySQL

> **Repo path (once committed):** `docs/authentication/production-checklist.md`
> **Repo:** `faisalhere-afk/aenural-website`, branch `feature/hostinger-authentication`
> **Status: DRAFT — preparation checklist only. Do NOT execute this phase yet.**
> **Phase 3 (2026-11-18):** quota decided (3/day); trusted-proxy recommendation (`x-real-ip`) + production DB-connectivity assumption documented with its hPanel verification step; least-privilege DB user, test-restore procedure, owner-activation rotation doc, and live OTP-flow correction in §9.
> **Do NOT touch the production repo `AmirNazir3784/AE-NUREL`. It is off-limits.**

## ⛔ Gate: do not start this checklist until local testing passes

**Do NOT execute any production step below until every step of
`docs/authentication/hostinger-setup.md` §10 (local registration → verification
→ login → logout → password recovery, plus §11 MySQL confirmation) passes
against the Hostinger database, and the TLS decision in that guide's §6
has a recorded outcome.**

If local testing has not passed, this document is read-only: use it to prepare,
not to deploy. In particular, do **not** enable `AENURAL_MEMBERSHIP_ENABLED=1`
in production, and do **not** run the migration against the live database
until the gate is met.

**What "passes" means:** §10.1–§10.7 all pass, §11 shows the test users/sessions
in MySQL, the TLS probe (`check-mysql-tls.mjs`) exits 0 with a recorded
`Ssl_version`, and the open questions in the setup guide are resolved:
`AUTH_TRUSTED_IP_HEADER` set to the recommended `x-real-ip` with Hostinger CDN
confirmed enabled in hPanel and no other proxy in front (setup guide §3.3,
`docs/authentication/trusted-proxy-ip.md`), free-quota policy **decided**
(3 videos per day, UTC reset — README/roadmap/code now agree), and the logout
control located and verified.

---

## 1. Production database — the live DB (its name ends in `_dev`)

> **Naming clarification (decided by Faisal, 2026-11-20):** the live
> database is `u853936014_aenural_dev` on `srv2224.hstgr.io:3306`, user
> `aenural_devuse`. It was created **for the live website** — the `_dev`
> in the name is just a name. It **IS** the production database. There is
> **no separate prod DB** to create and no dev/prod mixing concern.
> Production connects to it via loopback (`127.0.0.1`, §3) from the
> Hostinger web server; `srv2224.hstgr.io` is for PC-side access only and
> must never appear in the production env vars.

- [ ] Confirm in hPanel that the database `u853936014_aenural_dev` and the
      user `aenural_devuse` exist (exact hPanel spelling; do not guess a
      prefix). No new database and no new database user are needed.
- [ ] **Schema import is still pending:** as of 2026-11-20 the database has
      **zero tables** — the 14-table schema has never been imported. The
      import is Step 10 work (checklist §4 / `production-mysql-init.md` §4).
      Do not enable membership before the import is verified.
- [ ] **Least privilege for the runtime user:** verify in hPanel that the
      runtime user has only what the app needs at runtime — `SELECT,
      INSERT, UPDATE, DELETE` on the production database. Do **not** grant
      `DROP`, `ALTER`, `CREATE`, `FILE`, `GRANT OPTION`, or any server-wide
      privilege to the runtime user. The one-time migration (§4) is run by
      you (or a separate migration user) from phpMyAdmin, not by the app, so
      the runtime user never needs schema-changing rights. If the app later
      needs a schema change, that is a new reviewed migration, not a
      privilege escalation.
- [ ] **Remote MySQL for the production database: leave it OFF.** The
      production app connects via loopback (`127.0.0.1`, §3) and needs no
      remote access. Do not add your PC's IP to the production database's
      Remote MySQL list, and never enable "Any Host".
- [ ] Record (privately, never in the repo or chat): production DB name, user,
      and where the password is stored. The password lives **only** in
      Hostinger's hPanel env vars (§4) — never in git, never in a chat message.

> Why this matters: local/dev testing is done against this same database,
> so test accounts, test sessions, and any junk rows from testing land in
> the **live** database. Clean up every test account/session before real
> users arrive — do not ship test users and their password hashes to real
> users. The docs' older "never restore a dev backup into production"
> warnings assume a separate dev DB; read them with this in mind — there
> is only one database and it is the live one.

---

## 2. Production credentials

- [ ] Generate a **fresh** `BETTER_AUTH_SECRET` for production (different from
      dev). At least 32 characters:
      `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
      — generate it on a trusted machine, paste it **only** into hPanel env
      vars (§4), never into chat/email/git.
- [ ] Confirm the production DB password for `aenural_devuse` (the live DB
      user, §1 — Faisal knows it; it is never shared, never written in git
      or chat, and goes only into hPanel env vars, §3).
- [ ] Confirm the production SMTP mailbox password (the `support@aenural.com`
      mailbox password — the mailbox itself can be shared with dev, but confirm
      its daily sending limit covers production verification/reset volume;
      see setup guide §8).
- [ ] Confirm the Lemon Squeezy production credentials are the **live** (not
      test-mode) ones if sales are being enabled; otherwise leave
      `AENURAL_SALES_ENABLED` unset/off. Payments are out of scope for the auth
      phase — do not enable sales as a side effect of enabling auth.
- [ ] Rotate/revoke the owner activation token after owner activation —
      follow `docs/authentication/owner-activation-rotation.md` exactly.
      The token hash is **not** in the repo: Step 5 (S5-04) removed it from
      `server/membership/owner-bootstrap.json` (that file is now inert and
      the code never reads it) — the hash lives only in the env var
      `AENURAL_OWNER_ACTIVATION_TOKEN_HASH` (scrypt). Treat the token as
      single-use anyway; also confirm the real owner email —
      `owner@aenural.com` in the repo is a placeholder, not a real mailbox.
      Never reuse the dev activation token in production.
      **Owner activation is PAUSED (Faisal, 2026-11-20) and is NOT a
      pre-live gate for normal signup/login — skip this item for the normal
      go-live; use the rotation doc only if/when owner activation is
      resumed.**

---

## 3. Hostinger environment variables (hPanel Node.js app)

Set these in hPanel → your Node.js app → Environment variables (exact names —
copy them character for character; the app throws in MySQL mode if the
required ones are missing). **Restart the app after saving — env changes only
take effect on restart** (Hostinger docs, verified).

| Variable | Production value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Required for the production mode path in `server/membership/config.mjs` |
| `AENURAL_MEMBERSHIP_ENABLED` | `1` | **Only set this after the gate above is met.** Without it, production is **FULLY DISABLED** — auth routes 404 and no auth is initialised. It does **not** fall back to owner-only SQLite mode; owner-only mode requires the explicit `AENURAL_OWNER_TEST_MODE=1` opt-in (see `docs/authentication/controlled-activation.md` §2) |
| `BETTER_AUTH_URL` | `https://aenural.com` | Must be `https:` in production — the app throws otherwise |
| `SITE_URL` | `https://aenural.com` | Must share an origin with `BETTER_AUTH_URL` (`release:check` enforces this) |
| `BETTER_AUTH_SECRET` | *(fresh production secret, §2)* | ≥32 chars; never reuse dev's |
| `DB_HOST` | `127.0.0.1` | **Never `localhost` (IPv6 `::1` access-denied error) and never `srv2224.hstgr.io` from inside Hostinger.** Verify in hPanel before deploy: Databases → your production database → details must show host `127.0.0.1` (see assumption note below the table) |
| `DB_PORT` | `3306` | |
| `DB_NAME` | `u853936014_aenural_dev` | The live DB (see §1) — its name ends in `_dev`, but it **is** the production database |
| `DB_USER` | `aenural_devuse` | Exact hPanel spelling |
| `DB_PASSWORD` | *(production DB password, §1)* | hPanel env vars only |
| `DB_SSL_CA_FILE` | *(leave unset in production)* | Loopback needs no TLS (setup guide §6). Only set if a test **on Hostinger** proves the local MariaDB accepts TLS — do not set it blindly |
| `DB_TLS_ALLOW_PUBLIC_CA` | *(leave unset in production)* | Loopback needs no TLS; the opt-in is for remote dev only |
| `SMTP_HOST` | `smtp.hostinger.com` | |
| `SMTP_PORT` | `465` | Fallback `587` only if 465 is blocked on the host |
| `SMTP_SECURE` | `true` | `false` only with port 587 (STARTTLS) |
| `SMTP_USER` | `support@aenural.com` | Full mailbox address |
| `SMTP_PASSWORD` | *(mailbox password, §2)* | Not the hPanel password |
| `MAIL_FROM` | `support@aenural.com` | **Not `SMTP_FROM`** — that name is wrong wherever it appears |
| `AUTH_TRUSTED_IP_HEADER` | `x-real-ip` | Recommended value (setup guide §3.3, `docs/authentication/trusted-proxy-ip.md`). Only valid while Hostinger CDN is enabled for `aenural.com` and no Cloudflare/other proxy sits in front — re-confirm both in hPanel at deploy time. `release:check` accepts only `x-real-ip` (Step 5 security review, S5-02) — if Hostinger names anything else, stop and report it |
| `AENURAL_MEMBERSHIP_DATABASE` | *(leave unset)* | Not needed in production (`NODE_ENV=production` + `AENURAL_MEMBERSHIP_ENABLED=1` selects MySQL) |
| `NEXT_PUBLIC_AENURAL_SITE_PREVIEW` | `0` | Preview is **OFF** unless explicitly set to `1` (opt-in only since Step 5, S5-19). Keep it `0` so account pages are not publicly visible without auth once membership is enabled |

**Do not set in production:** `AENURAL_OWNER_TEST_MODE=1` (owner-only test
mode), any `AENURAL_*_QA` / hybrid switches ( `release:check` blocks them in
production), dev database values, or the dev secret.

> **Assumption — production DB connectivity (verify, don't assume).** This
> checklist sets `DB_HOST=127.0.0.1` because Hostinger's own Node.js guide
> ("Connecting a Hostinger MySQL database to a Node.js application", updated
> 2026-10-29) says the production app runs **on the same host as MySQL** and
> must use `127.0.0.1:3306` — explicitly: the remote hostname (e.g.
> `srv123.hstgr.io`) *"only works for connections from outside Hostinger"*,
> and `localhost` fails on Node 17+ because it resolves to IPv6 `::1`. That
> is a statement about Hostinger's managed Node.js hosting (Business/Cloud
> plans, hPanel Node.js apps). **Verify it for this account before deploy:**
> in hPanel, open Databases → your production database → details and confirm
> the host shown is `127.0.0.1`; then, after the first deploy, check the app
> logs for a successful startup (no `ECONNREFUSED` / access-denied) — a
> failed loopback connection means the assumption is wrong for this plan and
> the deploy stops until Hostinger support confirms the correct host. A
> remote host is needed only if the app and the database are on different
> machines — which, on Hostinger's managed Node.js hosting, they are not.
> (On a Hostinger **VPS**, you run MySQL yourself, so the same `127.0.0.1`
> applies only if MySQL runs on that same VPS; this checklist assumes the
> managed Cloud Startup Node.js app, not a VPS.)

After saving, **restart the Node.js app in hPanel**, then check the app logs
for a startup error before testing anything in a browser. A missing required
var makes the app throw at startup — that is a good failure (loud, early);
a silently wrong `DB_HOST` (e.g. `localhost` or the remote hostname) is a bad
one, so verify §5 below before announcing anything.

---

## 4. Production migration (reviewed, separate, once)

- [ ] Regenerate the migration from the exact code being deployed, offline:
      `npm run membership:prepare-mysql` — then `git status` / `git diff` to
      confirm `server/membership/migrations/001-initial-mysql.sql` matches the
      deployed auth options. If any auth option changed since the dev import,
      the file must be regenerated; never hand-edit the SQL.
- [ ] **Review the SQL before running it against production.** Read the file
      once: it must contain the Better Auth tables (`user`, `session`,
      `account`, `verification`, `rateLimit`) + the 8 app tables
      (`aenural_activity`, `aenural_projects`, `aenural_caption_jobs`,
      `aenural_daily_usage`, `aenural_checkouts`, `aenural_orders`,
      `aenural_operation_limits`, `aenural_webhooks`) + the delivery-audit
      table (`aenural_email_delivery_attempts`) — **14 tables in total**,
      `utf8mb4`, no `DROP`. If it contains anything else, stop and ask.
- [ ] Import it into the **production** database only — via phpMyAdmin
      (select the production database first, Import → choose the file) as in
      setup guide §7.1. Double-check the database name in the phpMyAdmin left
      panel before clicking Import. Importing into the wrong database is the
      most likely serious mistake in this phase — the target is
      `u853936014_aenural_dev` (§1).
- [ ] Verify with the read-only checker (from a machine that can reach the
      production DB — **not** from the cloud if remote MySQL is off, §1;
      run it on Hostinger or via phpMyAdmin SQL):
      `SHOW TABLES;` must list all 14 tables (§7.3 of the setup guide), or
      run `node scripts/membership/verify-mysql-schema.mjs` with production
      env vars **only if** you have a secure way to provide them (never paste
      production credentials into a shared terminal).
- [ ] Confirm the production database default charset is `utf8mb4`
      (setup guide §7.3 query) — the migration relies on database defaults.
- [ ] **Re-import is not a migration.** If the schema drifts after the first
      import (an auth option changed), regenerate with
      `npm run membership:prepare-mysql`, review the diff, and apply the
      *change* only — never blindly re-import the whole file over a live
      database containing users, and never hand-edit the SQL.

**The app does not auto-migrate MySQL in production either.** If the schema is
missing, auth requests fail with a generic 503. There is no startup check that
the MySQL schema exists — the `SHOW TABLES` verification above is that check.
Do not skip it.

---

## 5. HTTPS, cookies, and headers

- [ ] Site is served over HTTPS at `https://aenural.com`;
      `BETTER_AUTH_URL=https://aenural.com` (http would make the app throw).
- [ ] Secure cookies are on in production: the code sets
      `useSecureCookies: !config.local`, so production cookies are secure
      automatically — verify in the browser (DevTools → Application → Cookies:
      the `better-auth.session_token` cookie must have the `Secure` flag).
- [ ] Confirm the production headers from `next.config.ts` are live:
      HSTS, `upgrade-insecure-requests`, `Cache-Control: private, no-store` on
      `/api/auth/*`, `/api/membership/*`, `/account/*`, `/sign-in`, `/sign-up`,
      `/verify-email`, `/forgot-password`, `/reset-password`, and
      `Referrer-Policy: no-referrer` on auth/reset routes. (Check with
      DevTools → Network → any auth page → Response Headers.)
- [ ] Confirm the `AUTH_TRUSTED_IP_HEADER` value from §3 is the one Hostinger
      confirmed — a wrong header means rate limiting trusts a spoofable header.
- [ ] **Verified reverse-proxy config:** Hostinger CDN enabled for
      `aenural.com` (hPanel check, setup guide §3.3); no Cloudflare/other
      proxy in front; `AUTH_TRUSTED_IP_HEADER=x-real-ip`. Verify live after
      deploy: sign in from a known IP, then check the `session.ipAddress`
      column in the production database — it must show your real IP, not a
      CDN/proxy address. If it shows a proxy address, stop: rate limiting is
      keying on the wrong IP (see `docs/authentication/trusted-proxy-ip.md`
      §"How to verify after deploy").

---

## 6. SMTP in production

- [ ] Mailbox confirmed as Hostinger Email (not Titan — Titan uses
      `smtp.titan.email`; setup guide §3.3).
- [ ] SPF/DKIM/DMARC for `aenural.com` verified live: SPF
      `v=spf1 include:_spf.mail.hostinger.com ~all`, DKIM CNAMEs present,
      `_dmarc` TXT present starting at `p=none` (DMARC is **not** auto-added
      by Hostinger — add it by hand if missing; if the domain does not use
      Hostinger nameservers, add all three records manually at the DNS provider).
- [ ] Send **one real test verification email from the production host** and
      confirm receipt, then check the receiving mailbox's "show original" /
      authentication results: SPF **and** DKIM must pass. Do not rely on "the
      mail arrived" alone — a pass in the inbox with failing SPF/DKIM will go
      to spam for many users.
- [ ] Know the mailbox daily limit (hPanel → Emails → Mailboxes → View limits)
      and confirm it covers expected verification/reset volume.

---

## 7. Backups (before you need them)

Do this **before** enabling membership in production, and repeat on a schedule
afterwards (Hostinger backups are not a substitute for knowing how to restore
this database yourself).

- [ ] **Export via phpMyAdmin:** hPanel → Databases → (production DB) →
      phpMyAdmin → select the production database → Export → Quick, SQL →
      Go. Save the `.sql` file somewhere safe **off** the hosting account
      (your PC / encrypted storage), labelled with the date. Verify the file is
      non-empty and starts with the expected table names.
- [ ] **Export via `mysqldump` (alternative, from a machine with MySQL client
      access to the production DB):**
      `mysqldump --host=127.0.0.1 --port=3306 --user=<prod-user> -p --single-transaction --routines <prod-db-name> > aenural-prod-YYYY-MM-DD.sql`
      (password at the prompt, never on the command line). This only works
      where the production DB is reachable — with Remote MySQL off (§1) that
      means on the Hostinger host itself (e.g. via SSH, if available on the
      plan) or via phpMyAdmin. Do not enable Remote MySQL just to take a backup.
- [ ] Record the restore procedure next to the backup: import the `.sql` file
      into an **empty** database via phpMyAdmin (Import) and verify
      `SHOW TABLES;` + row counts afterwards. A backup you have never restored
      is a hope, not a backup — test-restore once into a throwaway database
      before you need it for real.
- [ ] **Test-restore (do this once before enablement, not "someday"):** in
      hPanel create a throwaway database (e.g. `…_restore_test`), import the
      §7 backup `.sql` into it via phpMyAdmin, then run `SHOW TABLES;`
      (must list all 14 tables) and compare row counts against production
      (`SELECT COUNT(*) FROM user;` etc. — counts must match the backup, not
      necessarily live production if users signed up since). If the import
      errors or any table/count is wrong, the backup is broken — fix the
      backup procedure before enabling membership. **Delete the throwaway
      database afterwards** (it contains copies of password hashes and
      sessions — do not leave it lying around). Record the test-restore date
      next to the backup.
- [ ] Note Hostinger's own backup/retention for the plan, and its limits —
      do not assume it covers the MySQL database at the granularity you need.

---

## 8. Rollback procedure (production)

If production auth fails after enablement, roll back in this order. Speed
matters less than not making it worse — read the app logs first.

1. **Stop the bleeding — disable membership in production** (hPanel Node app
   env vars): remove / set `AENURAL_MEMBERSHIP_ENABLED` to `0` (or remove it),
   restart the app. Without the flag, production is **FULLY DISABLED** — auth
   routes 404, no auth is initialised, auth-gated features stop, and no new
   MySQL writes happen. The site itself stays up, but there is **no owner
   login fallback**: owner-only mode is a separate, explicit opt-in
   (`AENURAL_OWNER_TEST_MODE=1`, see `controlled-activation.md` §2) and
   does **not** activate by disabling membership. Do not expect any login
   — owner or otherwise — to work while membership is disabled.
2. **Preserve evidence:** copy the app logs and the exact error text before
   restarting anything else. Do not delete the production database.
3. **Diagnose from the checklist:** most likely causes in order — wrong
   `DB_HOST` (`localhost`/`srv*.hstgr.io` instead of `127.0.0.1`), missing
   required env var, schema not imported (§4), wrong `AUTH_TRUSTED_IP_HEADER`,
   SMTP failure (verification mail not sending — users can still sign in if
   already verified, but new signups stall).
4. **Restore the database only if data is damaged:** import the §7 backup
   into the production database (phpMyAdmin Import into an empty DB, or
   restore over the damaged one only if you are sure the backup is newer than
   the damage and you accept losing signups since the backup). Never restore
   a **dev** database backup into production.
5. **Restore the previous code** (if the failure is a code regression):
   in the deployment repo, check out the last known-good commit/branch and
   redeploy through the normal Hostinger Node app flow. Do not hot-edit files
   on the server.
6. **Re-enable only after the local reproduction passes:** reproduce the
   failure against the dev database using the setup guide, fix it there, and
   re-run the final verification (§9) before flipping
   `AENURAL_MEMBERSHIP_ENABLED=1` back on.

---

## 9. Final live verification checklist (run after enablement)

Run the setup guide's §10 end-to-end test **again, live, against
`https://aenural.com`** — do not assume the local pass transfers. Use a real
test mailbox you control, and a second account for isolation.

- [ ] `npm run release:check` passes with the production env vars (names only
      — it cannot prove reachability, schema, or delivery).
- [ ] App starts in hPanel with no startup error in the logs.
- [ ] Sign-up → verification email received (SPF/DKIM pass) → enter the
      6-digit code on `/verify-email` → lands on `/account` **already signed
      in** (no link is sent in Phase 2+; a reset-password link is the only
      emailed link).
- [ ] Duplicate signup rejected; wrong password rejected; 429 rate limiting
      observed on rapid retries (then wait a minute).
- [ ] Logout works; anonymous visit to `/account` redirects to `/sign-in`.
- [ ] Password reset in a fresh browser: neutral message, reset link works,
      new password signs in, old sessions revoked, reused token fails,
      expired token (>30 min) fails.
- [ ] Resend throttling: 3 verification sends/min, then 429.
- [ ] A/B isolation: second account sees only its own data.
- [ ] MySQL confirmation (read-only queries from setup guide §11, run via
      phpMyAdmin against the **production** database): test users/sessions
      present in `user`/`session`; test accounts/sessions from local testing
      cleaned up before real users arrive (there is only one database — the
      live DB, §1 — so local-test rows are live-DB rows).
- [ ] One real Lemon Squeezy test-mode checkout + webhook + refund revocation
      **only if** sales are being enabled in the same release; otherwise
      leave payments disabled and record that as out of scope.
- [ ] Backups (§7) are current as of enablement day.

**Sign-off line (fill in by hand on the day):**

> Local testing passed on: ________  |  Production enabled on: ________
> Enabled by: ________  |  TLS outcome (local): ________
> `AUTH_TRUSTED_IP_HEADER` value used: ________ (Hostinger-confirmed)
> Free-quota policy: **3 videos per day (UTC reset)** — decided 2026-11-18  |  Backup taken: ☐  |  Test-restore done: ☐

---

## What this checklist deliberately does NOT cover

- **Payments (Lemon Squeezy):** live merchant, webhook secret, `$20` variant
  verification, and refund handling are a separate workstream. Enabling auth
  does not require enabling sales.
- **CI / branch hygiene:** the CI workflow is installed
  (`.github/workflows/ci.yml`) and green on this branch — run **#232 ALL
  PASSED** (4m27s, 2026-11-20) on commit `9abce77`: checks Node 22 +
  Node 24, MySQL integration, SMTP integration. The Phase 3 retarget patch
  (`docs/ci-retarget-patch.md`) is **superseded** — do not apply it. The
  free-quota decision is made (3/day); the stale
  `/check-email`/`/email-verified` and `SMTP_FROM` doc references were
  corrected in Phase 1.
- **MySQL TLS on the production loopback:** Hostinger's own guide shows no
  `ssl` for `127.0.0.1`. Do not add it unless a test on Hostinger proves the
  local MariaDB accepts it.

## Sources & verification status

- Verified from the repo at `feature/hostinger-authentication` HEAD
  (`9abce77`), 2026-11-20: mode logic, required env vars,
  secure-cookies rule, production header set, migration table list
  (14 tables), `release:check` scope. Phase 4 (`1110f6ab`), Step 5
  security-review fixes (`4085a87`), CI fixes (`465ff18`, `e0f117f`) and
  the workflow install (`9abce77`) are all on the branch; CI run #232
  passed all four jobs on `9abce77` (release state 2 — G1 closed; state 3
  not reached, G4 open; state 4 needs live E2E). Full detail:
  `~/workspace/aenural-website-audit/audit-report.md`.
- Verified from public Hostinger docs, 2026-11-18: Node.js app =
  `127.0.0.1:3306` (same host as MySQL; remote hostname only from outside
  Hostinger), restart to pick up env vars, SMTP ports, SPF/DKIM
  auto-publish rules; Hostinger CDN passes the visitor IP in `X-Real-IP`
  (and `X-Forwarded-For`), never trust `CF-Connecting-IP`. Full detail:
  `~/workspace/aenural-website-audit/hostinger-research.md` and
  `docs/authentication/trusted-proxy-ip.md`.
- **Not verified:** any production deployment, production DB/SMTP behaviour,
  Hostinger plan's Node.js availability for this account, or the production
  `AUTH_TRUSTED_IP_HEADER` value — all must be confirmed on Hostinger itself,
  after the local gate passes.
