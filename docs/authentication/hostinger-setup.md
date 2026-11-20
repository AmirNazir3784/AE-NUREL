# AENural — Better Auth + Hostinger MySQL: Local Setup & Testing Guide

> **Repo path (once committed):** `docs/authentication/hostinger-setup.md`
> **Repo:** `faisalhere-afk/aenural-website` — work branch `feature/hostinger-authentication` (HEAD `8efd3d2`, Phase 3, 2026-11-18; base `main` @ `9137c8ae`)
> **Status: DRAFT — local testing guide only. Nothing in this guide is production-ready.**
>
> **Phase 3 changes to this guide:** local project path corrected to `D:\Work\online-tools-platform` (earlier versions said `D:\Work\Tools\online-tools-platform` — that folder is wrong; use the new path everywhere below). Free quota is now decided: **3 videos per day (UTC reset)**, not lifetime. Trusted-proxy header has a researched recommendation (`x-real-ip`, §3.3). A resumable setup wizard `npm run membership:setup` is added in Phase 3 (§2A) — run it first; the manual steps below remain the reference if any wizard stage fails.
> **Do NOT touch the production repo `AmirNazir3784/AE-NUREL`. It is off-limits and must never be modified.**

## Who this guide is for

You (Faisal) — working on your own Windows PC, in VS Code, in your local folder
`D:\Work\online-tools-platform`. You do not need to know MySQL or Better Auth
already. Follow the steps in order. Do not skip the TLS checks in §5–§6: they are the
whole point of this phase.

**Stack (verified at `main` HEAD):** Next.js 16.4.6, Better Auth 1.7.14,
`mysql2` 3.24.6, Kysely 0.28.18, Nodemailer 10.2.1, Node 24.21.0 (reported on your PC).

**What is already built (verified by code audit, 2026-11-18):** Better Auth with
email/password, email verification required, 7-day sessions, DB-backed rate limits.
Pages: `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`,
`/verify-email`, `/account` (+ billing, history, projects, settings, subscription).

**As-built verification flow — read this first:** after sign-up the user is sent to
`/verify-email`, where they enter a **6-digit code** sent to their email address
(Better Auth Email OTP: 5-minute expiry, 5 attempts, 60-second resend cooldown).
The code email comes from `support@aenural.com` with the subject "Your AENural
verification code". On a correct code the account is verified, a session is
created, and the user lands on `/account` — there is no separate sign-in step
after verification. **There is no `/check-email` page and no `/email-verified`
page** in the repo, even though an older architecture doc says there are. Do not
look for them, and do not create them in this phase. Password reset still uses
a link (unchanged).

**What this guide does NOT claim:** no live MySQL connection, no SMTP delivery, and
no end-to-end signup → verify → login against MySQL has been verified yet. The
audit was code review + public-docs research only — the Hostinger dev database is
IP-restricted to your PC, so nobody else can test it for you. Everything marked
**"must verify locally"** below can only be settled by you, on your PC.

---

## 0. Before you start — the three things you must know

### 0.1 Two databases, two connection profiles — never mix them

| Profile | Host | TLS | When |
|---|---|---|---|
| **Remote dev** (this guide) | `srv2224.hstgr.io:3306` | **TLS required + verified, or refuse to start** | Your PC → internet → Hostinger |
| **Production** (later, on Hostinger) | `127.0.0.1:3306` | **None** — plain loopback, per Hostinger's own Node.js guide | App running *on* Hostinger |

Production must use `127.0.0.1` — **never** `localhost` (Node resolves it to IPv6
`::1` and Hostinger MySQL rejects `user@::1` with "Access denied") and **never**
`srv2224.hstgr.io` from inside Hostinger (Hostinger says the remote hostname "only
works for connections from outside Hostinger"). See
`docs/authentication/production-checklist.md` for the production phase.

### 0.2 Your dev database (Hostinger)

- **Host:** `srv2224.hstgr.io`, port `3306`
- **Database name:** `u853936014_aenural_dev`
- **Username:** `aenural_devuse` — ⚠️ **use the EXACT full username shown in hPanel
  (Databases → your database → users).** The username as given may already include
  a Hostinger prefix. Do **not** invent a prefixed variant (do not guess
  `u853936014_aenural_devuse` or any other form). If hPanel shows a different
  spelling, hPanel is right and this guide is wrong — use hPanel's spelling.
- **Password:** private. It lives **only** in your `.env.local` (see §3).
  **Never paste it into chat, email, a ticket, a screenshot, or a terminal
  command** (never `mysql -p<password>` — type it at the prompt instead).
- **Remote MySQL is IP-restricted to your PC only. "Any Host" is disabled. Keep it
  that way.** If your home IP changes (ISP rotation), remote connections will
  suddenly fail — that is an IP-allowlist problem, not a TLS problem. Check
  hPanel → Databases → Remote MySQL first (§5.4).

### 0.3 How the app chooses SQLite vs MySQL

This is the code in `server/membership/config.mjs` (verified). Read it once, then
you will understand every failure below:

- **Default dev run = SQLite** (a local file in `.aenural-local/`, git-ignored).
  No MySQL, and no real email unless SMTP is configured: account mail is sent
  over SMTP whenever `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD`/`MAIL_FROM` are
  set (even in local mode). With no SMTP configured, sending fails loudly
  instead of silently writing files — unless you explicitly set
  `AENURAL_EMAIL_TRANSPORT=local-outbox`, which writes each account email as
  a `mail-<uuid>.json` file (mode 0600) in that folder. The outbox is a
  development/testing aid only; it contains live verification codes.
- **MySQL mode in dev** requires `AENURAL_MEMBERSHIP_DATABASE=mysql`.
- **MySQL mode in production** requires `NODE_ENV=production` +
  `AENURAL_MEMBERSHIP_ENABLED=1`.
- **In MySQL mode the app throws at startup unless ALL of these are set:**
  `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`,
  `MAIL_FROM`, `AUTH_TRUSTED_IP_HEADER`. (Note: `DB_HOST`/`DB_PORT`/`SMTP_PORT`/
  `SMTP_SECURE` have defaults and are *not* required by the startup check — a
  missing `DB_HOST` silently points at `127.0.0.1`, i.e. your own PC. Always set
  `DB_HOST` explicitly.)
- **In MySQL mode the app does NOT auto-create tables.** `server/membership/migrations/001-initial-mysql.sql`
  must be imported manually first (§7). If it was not imported, the first
  auth request fails with a generic 503 — that is the symptom of a missing schema.
- **In MySQL mode there is no auto-generated secret.** `BETTER_AUTH_SECRET` must
  be set and be at least 32 characters, or the app throws.

> **Known open questions (do not guess — verify or ask, as noted):**
> 1. **Remote TLS availability is UNVERIFIED.** No Hostinger CA certificate was
>    found in any public source, and Hostinger's own remote-MySQL docs never
>    mention TLS. Whether `srv2224.hstgr.io` offers TLS, and whether its
>    certificate chains to a public CA, is only probeable from your allowlisted
>    PC (§5–§6). **Never set `rejectUnauthorized: false`.**
> 2. **`AUTH_TRUSTED_IP_HEADER` — recommended value `x-real-ip`, confirm before relying on it.** Hostinger's own CDN doc says Node.js apps should read `X-Real-IP` (or only the last entry of `X-Forwarded-For`), and never `CF-Connecting-IP`; Better Auth cannot safely use a multi-entry `X-Forwarded-For` without `trustedProxies`, which this code does not set. So `x-real-ip` is the recommended value — but only while Hostinger CDN is enabled for `aenural.com` and no Cloudflare/other proxy sits in front. Confirm both in hPanel (§3.3, `docs/authentication/trusted-proxy-ip.md`) before treating rate limiting as verified.
> 3. **Free quota — DECIDED (owner, 2026-11-18, Phase 3): 3 videos per day per free account (UTC daily reset at 00:00 UTC).** No lifetime allowance. Code (`server/membership/service.mjs`, `src/features/membership/caption-policy.ts`), dashboard copy, README and roadmap now all agree. Use the per-day wording in any user-facing copy.
> 4. **No MySQL test coverage yet.** The test suite (`npm test`) is SQLite-only.
>    Passing tests do **not** prove the MySQL path works.

---

## 1. Pull the changes into your local VS Code project

**Stop the dev server first.** If `npm run dev` is running, press `Ctrl+C` in its terminal and wait for it to exit before pulling or installing anything. On Windows a running dev server locks files (including native dependencies), so `git pull` / `npm ci` can fail or silently leave a half-updated tree while the server keeps serving old code.

Work in the VS Code integrated terminal (Terminal → New Terminal), PowerShell.
All commands assume you are in the project folder.

```powershell
cd D:\Work\online-tools-platform
git status
```

`git status` should show a clean tree (or only files you expect). If it shows
unexpected changes, stop and sort those out first — do not lose work.

```powershell
git fetch origin
git checkout main
git pull origin main
```

Now switch to the work branch. **Use exactly one of these two:**

- **If the branch already exists** (the coordinator created it on GitHub):

  ```powershell
  git checkout feature/hostinger-authentication
  git pull origin feature/hostinger-authentication
  ```

- **If it does not exist yet:**

  ```powershell
  git checkout -b feature/hostinger-authentication main
  ```

Verify where you are:

```powershell
git branch --show-current
git log --oneline -3
```

You should see `feature/hostinger-authentication` and recent commits on top of
`main` (`8efd3d2` or later — Phase 3). If the log stops at an earlier commit, pull again; the wizard (§2A) and the Phase 3 doc fixes are in the newer commits. If `git checkout` says the branch does not exist
and you are not supposed to create it, stop and ask the coordinator — do not
work on `main` directly, and do not work on the stale `dev/tools-completion`
branch (it is fully merged into `main` and ~20 days behind it).

> **cmd alternative:** the same commands work in `cmd.exe` (`cd /d
> D:\Work\online-tools-platform` first). PowerShell is used below.

---

## 2. Install dependencies

**Dev server still running? Stop it first (see §1).** `npm ci` replaces `node_modules` wholesale; on Windows a running `next dev` holds native dependency files open (notably `onnxruntime-node`) and the install can fail part-way.

```powershell
cd D:\Work\online-tools-platform
npm ci
```

Use `npm ci` (clean install from `package-lock.json`), not `npm install` — it
guarantees the exact versions the audit verified (Next.js 16.4.6, Better Auth
1.7.14, `mysql2` 3.24.6, Kysely 0.28.18, Nodemailer 10.2.1). **Do you need it?** Yes if you just pulled, if `package-lock.json` changed, or if anything in `node_modules` looks stale. If nothing changed since your last successful `npm ci`, you may skip it — but if any later step fails oddly, re-run `npm ci` before debugging further. If `npm ci` fails,
do not "fix" it by deleting `package-lock.json`; report the exact error.

Optional sanity check (names only — it never contacts any service):

```powershell
npm run release:check
```

It will fail until `.env.local` is complete (§3) — that is expected. Run it
again after §3. Note its limits: it checks **variable names only**. A pass does
**not** prove the database is reachable, the schema is imported, or mail
delivers.

---

## 2A. Run the setup wizard (Phase 3 — recommended path)

Phase 3 adds a resumable setup wizard that runs the checks in this guide for you, in order. Run it **after** §2 and **before** editing anything by hand:

```powershell
npm run membership:setup
```

What it does (stages A–I): **A** preflight (Node version, clean tree, branch); **B** secure `.env.local` (writes it atomically, preserving your existing settings — each value is saved as soon as you enter it, so a later failure loses nothing; no backup copy containing credentials is left on disk, the previous content is kept only in memory for rollback; never prints secrets); **C** MySQL TLS verify (the §5–§6 probes); **D** schema (imports `001-initial-mysql.sql` into the **dev** database — **only with your explicit approval** at the prompt; it never runs without it); **E** real SMTP test email (sends one test message and waits for you to confirm receipt); **F** OTP failure-handling check; **G** integration testing (the §10 sequence, automated where possible); **H** UI verification; **I** lint / typecheck / test / build / `release:check`, then a final readiness report (PASS / FAIL / PENDING / NOT RUN per item).

**Credentials the wizard needs:** the dev DB password (hPanel → Databases), the `support@aenural.com` mailbox password (hPanel → Emails), and a `BETTER_AUTH_SECRET` if none exists yet (§4 — the wizard generates one rather than asking you to invent it). It asks for each value at the prompt and writes it only to `.env.local`; it never prints a secret, and never commits anything.

**Typing passwords in Stage B (fixed in the Phase 3 fix):** passwords are hidden, but one `*` shows for every character you type or paste, so you can see the input is being received. Typing works, and pasting a whole password works too (right-click paste in CMD, Ctrl+V in Windows Terminal / VS Code). Backspace deletes one character (and one `*`); Ctrl-U clears the line; Ctrl-C cancels the prompt. If you leave a required password empty, the wizard asks again immediately — it no longer fails the whole stage, and anything you already entered stays saved. After three empty attempts it offers retry, loading the value from `.env.local`, or aborting Stage B (already-saved values are kept).

**If a password prompt ever looks stuck:** press Ctrl-C, then either paste the password again at the next prompt, or pre-fill it directly in `.env.local` first (see §3 — put the value in double quotes if it contains `$`, `#`, `,`, `!`, spaces or backslashes, e.g. `SMTP_PASSWORD="p$a#s,s!w"`) and re-run the wizard. You can also skip all secret prompts with `npm run membership:setup -- --from-env`, which reads every secret from `.env.local` and fails clearly, naming any required value that is still missing.

**Resume after failure:** the wizard records which stages already passed and **does not repeat completed steps**. If it stops (for example the TLS probe fails), fix the reported cause using the matching section of this guide (§5–§6 for TLS, §8 for SMTP, §7 for schema), then run `npm run membership:setup` again — it resumes at the first unfinished stage (Stage A stays passed; re-running resumes at Stage B if that is where it stopped). If a stage keeps failing, report the wizard's exact output and continue manually from that section; do not work around it by editing code.

**If `npm run membership:setup` says the script is missing:** your checkout predates Phase 3 — go back to §1, `git pull origin feature/hostinger-authentication`, run `npm ci` again (§2), and retry. Do not hand-roll the wizard's steps from memory; the manual sections below are the fallback.

**The wizard does not replace this guide.** If you want to understand a step, or the wizard cannot run, the manual sections (§3–§12) are the same procedure, step by step.

---

## 3. Configure `.env.local`

### 3.1 Create the file (and back it up first if it already exists)

`.env.local` lives in the project root, next to `package.json`. It is
git-ignored — it will never be committed. **Never paste its contents into chat,
email, or a GitHub issue.**

```powershell
cd D:\Work\online-tools-platform
# If .env.local already exists, back it up BEFORE editing:
Copy-Item .env.local .env.local.bak-2026-11-18 -ErrorAction SilentlyContinue
# If it does not exist, create it from the canonical example:
Copy-Item config\membership.env.example .env.local
notepad .env.local
```

(Use VS Code instead of Notepad if you prefer: `code .env.local`.)

### 3.2 Full template

Copy this into `.env.local` and fill in **only** the placeholders. Every line
below is a real variable the code reads. Lines marked **hPanel** come from
Hostinger's hPanel; **generate** means you create the value yourself (§4);
**fixed** means copy it exactly as shown.

```dotenv
# --- AENural local dev: Hostinger MySQL (remote dev profile) ---
# NEVER commit this file. NEVER paste real passwords into chat/email.

# App origin for local dev (fixed)
BETTER_AUTH_URL=http://localhost:3000
SITE_URL=http://localhost:3000
# Local dev runs on http://localhost:3000 ONLY — never expose this dev
# server beyond localhost (no tunnel, no public URL, no LAN share): in
# local mode the app trusts X-Forwarded-For, which any visitor can
# forge, so an exposed dev server would have no working per-IP rate
# limits. Treat any non-localhost exposure as a security incident.

# Auth secret (generate — see §4; at least 32 characters, no spaces)
BETTER_AUTH_SECRET=<paste-the-generated-secret-here>

# --- Hostinger dev database (hPanel: Databases) ---
DB_HOST=srv2224.hstgr.io
DB_PORT=3306
DB_NAME=u853936014_aenural_dev
# Username: EXACT full username shown in hPanel. Do not invent a prefix.
DB_USER=aenural_devuse
# Password: the dev DB user's password from hPanel. Type it here only.
DB_PASSWORD=<your-dev-db-password-from-hpanel>

# --- MySQL TLS (implemented in this branch — see §5/§6) ---
# Path to the Hostinger CA certificate PEM file, IF Hostinger provides one.
# Leave blank until the §6 probe tells you whether one is needed.
# NEVER put certificate contents in an env var — a file path only.
DB_SSL_CA_FILE=
# Public-CA opt-in: set to 1 ONLY if the §6 probe (outcome A) proves the
# server certificate chains to a public CA in Node's trust store.
# Verification stays ON either way (rejectUnauthorized is never false).
# The app REFUSES remote MySQL unless DB_SSL_CA_FILE or
# DB_TLS_ALLOW_PUBLIC_CA=1 is set — this is the fail-closed rule.
DB_TLS_ALLOW_PUBLIC_CA=

# --- Membership mode switches (fixed for this guide) ---
# Forces MySQL mode in dev. Remove/unset to go back to SQLite (§12).
AENURAL_MEMBERSHIP_DATABASE=mysql
# Do NOT set AENURAL_MEMBERSHIP_ENABLED=1 for local dev testing.
# Do NOT set AENURAL_OWNER_TEST_MODE=1 unless you are testing owner-only mode.

# --- SMTP: Hostinger Email (hPanel: Emails -> Mailboxes) ---
# Primary: port 465, implicit SSL. Fallback only if 465 is blocked: 587 + STARTTLS.
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
# SMTP user is the FULL mailbox address:
SMTP_USER=support@aenural.com
# SMTP password is the MAILBOX password (not your hPanel password):
SMTP_PASSWORD=<your-support-mailbox-password-from-hpanel>
# Sender address (fixed). NOTE: the code uses MAIL_FROM, NOT SMTP_FROM —
# any doc that says SMTP_FROM is wrong.
MAIL_FROM=support@aenural.com
# --- Email transport (new in this branch) ---
# Leave unset (default): SMTP whenever the SMTP_* variables above are set.
# AENURAL_EMAIL_TRANSPORT=smtp forces SMTP (missing SMTP vars = send error).
# AENURAL_EMAIL_TRANSPORT=local-outbox writes mail-*.json to .aenural-local/
# instead of sending — local/SQLite dev and tests ONLY, never production.
# There is NO silent fallback: if SMTP is configured and a send fails, the
# failure is logged server-side ([membership] Email send failed) and no
# code is written to disk. Watch the dev-server terminal during §10.
# AENURAL_EMAIL_TRANSPORT=

# --- Proxy / IP header (recommended: x-real-ip — see §3.3) ---
# Required whenever the app is not in local mode (Step 5, S5-06 — not
# only in MySQL mode); the app throws at startup if blank.
# Recommended value is x-real-ip (Hostinger CDN overwrites it with the
# visitor's real IP; Better Auth cannot safely use multi-entry
# X-Forwarded-For here). Set it as below, then confirm in hPanel that
# Hostinger CDN is enabled for aenural.com and no other proxy sits in
# front (§3.3). Do NOT substitute x-forwarded-for or cf-connecting-ip.
AUTH_TRUSTED_IP_HEADER=x-real-ip
```

**What `SMTP_SECURE` means:** `true` = port 465, implicit TLS from the first
byte. `false` = port 587 with STARTTLS (the code then sets `requireTLS: true`,
so it fails rather than sending in cleartext). **Never mix the pairs:**
465 + STARTTLS and 587 + SSL both fail.

**What is NOT in this file (on purpose):** `LEMONSQUEEZY_*` (payments — out of
scope for auth testing; leave unset unless you are testing checkout, in which
case follow the payments docs, not this guide). `DB_SSL_CA_FILE` and
`DB_TLS_ALLOW_PUBLIC_CA` are the new TLS variables implemented in this branch
(`server/membership/mysql-tls.mjs`) — see §5/§6.

### 3.3 Confirm the two values you cannot guess

Do these **before** running the app in MySQL mode:

1. **`AUTH_TRUSTED_IP_HEADER` — recommended `x-real-ip`; confirm two things in hPanel, then ask support only if they fail.** Research (Phase 3, `docs/authentication/trusted-proxy-ip.md`) — Hostinger's own CDN doc, updated 2026-10-29: *"Node.js apps on Hostinger read the visitor IP address and protocol from the request headers themselves. Read `X-Real-IP` for the visitor IP address, or only the last entry of `X-Forwarded-For`"*; *"Do not rely on the `CF-Connecting-IP` header. Hostinger CDN removes it from incoming requests because any client could send it."* Better Auth reads the **first** listed header with a valid address and, without `trustedProxies` (this code sets none), cannot safely use a multi-entry `X-Forwarded-For` — a client can forge its leftmost entry. `X-Real-IP` is a single value overwritten by Hostinger CDN, so it is the safe choice. **Set `AUTH_TRUSTED_IP_HEADER=x-real-ip` in `.env.local`.**
   Then confirm, in hPanel, before treating rate limiting as verified:
   - **Hostinger CDN is enabled** for `aenural.com` (hPanel → Websites → Dashboard → CDN / Performance — the exact panel name varies; if you cannot find a CDN toggle, ask support). The Hostinger doc's `X-Real-IP` advice is written for traffic *through Hostinger CDN*, and it warns the setting *"is reliable only for requests that pass through Hostinger CDN. Requests sent directly to the hosting server's IP address skip the CDN and can carry any header value."*
   - **No Cloudflare (or any other proxy) sits in front of Hostinger CDN.** If one does, `X-Real-IP` holds the Cloudflare address, not the visitor — the visitor is an earlier `X-Forwarded-For` entry that is trustworthy only when the request really came from a Cloudflare address. Do not guess; ask support.
   
   **If either check fails, or you cannot find the CDN setting, ask Hostinger support** (live chat or ticket), verbatim:
   > "For a Node.js app on Hostinger Cloud Startup (domain aenural.com), which incoming HTTP header does your trusted proxy overwrite with the visitor's real IP address — `x-real-ip`, `x-forwarded-for`, or `cf-connecting-ip`? My auth library (Better Auth) uses this header for rate limiting, so I need the exact header your proxy sets and that a visitor cannot spoof. Is Hostinger CDN enabled for this domain, and is there any other proxy in front of it?"
   
   Record the answer (date + ticket/chat reference). If Hostinger names a different header, put exactly that value in `.env.local` and report it — `npm run release:check` accepts only `x-real-ip`; if Hostinger names anything else, stop and report it; do not just change the variable (a multi-entry header needs `trustedProxies` work first — see the comment at `server/membership/auth.mjs` on the trusted-IP header and `docs/authentication/trusted-proxy-ip.md` §7). **Why blindly trusting a forwarded header is dangerous:** rate limiting, OTP-attempt limits and session IP logging all key on this value. If it is a header any visitor can set, an attacker can rotate a fake IP on every request and bypass every per-IP limit, or frame someone else's IP and get *them* rate-limited. The safe default is to trust **no** forwarded header (use the direct connection IP) — but this app always sits behind Hostinger's proxy in production, so the direct connection IP would be a CDN address shared by all visitors, and per-IP limits would collapse into one shared bucket. That is why the header must be the one the proxy itself overwrites, and why it must be confirmed rather than guessed.
2. **`support@aenural.com` mailbox — confirm it is Hostinger Email, not Titan.**
   In hPanel go to Emails → Mailboxes → (the mailbox) → Connect Apps & Devices
   and copy the exact SMTP values shown there. Titan mailboxes use
   `smtp.titan.email`, **not** `smtp.hostinger.com` — if yours is Titan, stop and
   report it; the values in §3.2 do not apply. While there, check
   Emails → Mailboxes → View limits for the mailbox's daily sending limit
   (community-reported: 100/day trial, 1,000/day Business Starter, 3,000/day
   Business Standard/Premium — confirm yours; auth mail is low-volume, so the
   limit is unlikely to bind, but know it).

### 3.4 `.env.local` safety checklist

- [ ] File is in the project root and named exactly `.env.local`.
- [ ] No real password appears in any chat message, screenshot, or terminal
      command history you share.
- [ ] `git status` does **not** list `.env.local` (it is git-ignored; if it
      shows up, stop — do not commit it).
- [ ] You have a backup copy (`.env.local.bak-2026-11-18`) somewhere safe,
      outside the repo if you prefer.

---

## 4. Generate `BETTER_AUTH_SECRET`

The secret must be **at least 32 characters**. Generate it — do not invent one
by typing, and do not reuse a password. In PowerShell, in the project folder:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

That prints one line of random text (64 characters). Copy that whole line into
`.env.local` as the value of `BETTER_AUTH_SECRET`. Do not share it with anyone,
do not paste it into chat.

PowerShell-only alternative (same result, no Node):

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { [byte](Get-Random -Maximum 256) }))
```

Notes:

- In **SQLite/dev mode** the app auto-generates a secret file if none is set.
  In **MySQL mode it does not** — a missing or short secret makes the app throw
  at startup. If you see a "secret must be at least 32 characters" error, this
  is the cause.
- Use a **different** secret for dev and for production. Never copy the dev
  secret into Hostinger's production env vars (see `production-checklist.md`).

---

## 5. Test the Hostinger MySQL connection securely (TLS probe)

**Do this before importing any schema and before starting the app in MySQL
mode.** Everything in this section runs from your allowlisted PC only — the
cloud cannot reach this database, and that is by design.

### 5.1 Check the IP allowlist is still fresh

In hPanel → Databases → Remote MySQL, confirm the listed IP is still your PC's
**current** public IP. Find your current public IP first:

```powershell
(Invoke-WebRequest -Uri "https://ifconfig.me/ip" -UseBasicParsing).Content
```

If hPanel shows a different IP, update it there and wait a few minutes. If you
skip this, every later step fails with a connection timeout / access-denied
error that looks like a TLS problem but is not.

### 5.2 Probe 1 — Does the server offer TLS at all? (MySQL CLI, if installed)

If you have the MySQL client (`mysql`) installed on Windows, connect with TLS
**required** (never without it for this host) and type your password at the
prompt — do not put it on the command line:

```powershell
mysql --host=srv2224.hstgr.io --port=3306 --user=aenural_devuse --protocol=TCP --ssl-mode=REQUIRED -p
```

(`-p` with nothing after it means "prompt me for the password".)

Once connected, run:

```sql
SHOW VARIABLES LIKE 'have_ssl';
SHOW VARIABLES LIKE 'tls_version';
SHOW VARIABLES LIKE 'require_secure_transport';
SELECT VERSION();
SHOW SESSION STATUS LIKE 'Ssl_version';
SHOW SESSION STATUS LIKE 'Ssl_cipher';
```

What the answers mean:

| Result | Meaning |
|---|---|
| `have_ssl` = `YES` | TLS is available on this server. Continue. |
| `have_ssl` = `DISABLED` | TLS is compiled in but not enabled on this server. Remote TLS is not possible as configured — go to §6, outcome C. |
| `tls_version` e.g. `TLSv1.2,TLSv1.3` | Acceptable. Anything listing only TLS 1.0/1.1 is not acceptable. |
| `require_secure_transport` = `ON` | The server itself refuses unencrypted connections. Good — but you must still verify from the client side. |
| `Ssl_version` non-empty, e.g. `TLSv1.3` | **This session is actually encrypted.** This is the check that matters. |
| `Ssl_version` empty | This session is **not** encrypted, even if `have_ssl` is `YES`. Do not proceed — go to §6. |
| `Ssl_cipher` non-empty | Confirms a cipher was negotiated. Log the cipher *name* only. |

Type `exit` to leave the MySQL prompt. **Never paste the output containing
your password anywhere** (these queries print no password, but check before
sharing output).

> If `mysql` is not installed on your PC, skip Probe 1 and use Probe 2 — it
> needs only Node + the project's existing `mysql2` dependency.

### 5.3 Probe 2 — Node TLS check (no MySQL CLI needed)

A standalone script ships in this branch at
`scripts/membership/check-mysql-tls.mjs`. It reads only `.env.local`, prints
`have_ssl` / `tls_version` / `Ssl_version` / cipher, and exits non-zero if TLS
was required but not established. It **never logs the password, the DSN, or
certificate contents.**

```powershell
cd D:\Work\online-tools-platform
node scripts\membership\check-mysql-tls.mjs
```

- **Exit code 0 + `Ssl_version: TLSv1.2` or `TLSv1.3`** → TLS verified. Continue to §7.
- **Exit code non-zero** → read its message, then follow §6. Do not work
  around it.

### 5.4 If the connection fails at all — diagnose in this order

1. **Timeout / `ETIMEDOUT` / `ECONNREFUSED`:** IP allowlist (§5.1) or wrong
   host/port. Re-check hPanel Remote MySQL and `DB_HOST`/`DB_PORT`.
2. **`Access denied for user 'aenural_devuse'@'%'` (or `@'<your-ip>'`):**
   wrong username or password, or the user lacks rights on
   `u853936014_aenural_dev`. Re-copy the **exact** username from hPanel (§0.2)
   and re-type the password. Do not guess a prefixed username.
3. **`User already has more than 'max_user_connections' active connections`:**
   too many open connections (per-user cap, community-reported ~100 on Cloud
   Startup — number unverified; the cap itself is Hostinger-official). Close
   stray `mysql` shells / Node processes and retry. Keep the app pool small
   (the code uses `connectionLimit: 5`).
4. **TLS/certificate errors** (`unable to verify the first certificate`,
   `self-signed certificate`, `DEPTH_ZERO_SELF_SIGNED_CERT`): go to §6 —
   do **not** "fix" them by disabling verification.

---

## 6. TLS decision tree (remote dev)

Work through this in order. Stop at the first outcome that matches.

```
Remote host is srv2224.hstgr.io?
  └─ YES → TLS is REQUIRED. Never connect without ssl, never fall back to cleartext.
        │
        ├─ A. mysql2 with ssl { rejectUnauthorized: true, minVersion: "TLSv1.2",
        │     servername: "srv2224.hstgr.io" } (NO ca file) connects,
        │     AND SHOW SESSION STATUS LIKE 'Ssl_version' is TLSv1.2/1.3
        │     → The cert chains to a public CA in Node's trust store.
        │       USE THIS. No CA file needed. Leave DB_SSL_CA_FILE blank
        │       AND set DB_TLS_ALLOW_PUBLIC_CA=1 in .env.local — the app
        │       requires this explicit opt-in (or a CA file) before it will
        │       open a remote MySQL connection. Verification stays ON.
        │
        ├─ B. Step A fails with "unable to verify the first certificate"
        │     or "self-signed certificate"
        │     → The cert is privately signed. You need the CA bundle:
        │       1. Ask Hostinger support (live chat / ticket), verbatim:
        │          "Does MySQL on srv2224.hstgr.io support TLS? Is there a CA
        │           certificate I can download to verify the server certificate,
        │           or is it signed by a public CA? Is REQUIRE SSL set for my user?"
        │       2. If they provide a CA file: save it as a .pem file in the
        │          project (e.g. .aenural-local/hostinger-mysql-ca.pem — git-ignored,
        │          never committed), set DB_SSL_CA_FILE to that PATH (never paste
        │          the certificate contents into .env.local), re-run §5.3.
        │       3. If they provide no CA: go to outcome C.
        │
        └─ C. No TLS available (have_ssl = DISABLED), or no CA and cert not
              publicly chained
              → Remote-dev TLS-with-verification is NOT possible as configured.
                Do NOT proceed with cleartext remote MySQL. Your options:
                (a) SSH tunnel to Hostinger (Hostinger's own tutorial recommends
                    SSH as the secure remote method) and connect to the tunnel's
                    local endpoint as a loopback connection; or
                (b) stop using remote MySQL for dev and do schema/seed work via
                    a deploy-time step on Hostinger instead.
                Record the decision and the Hostinger answer in the repo docs
                before continuing. NEVER choose:
                (d) rejectUnauthorized: false — encryption without authentication,
                    MITM-able, and explicitly forbidden for this project.
```

**For the production (loopback) profile the rule is the opposite:** `127.0.0.1`
never leaves the host, and Hostinger's own Node.js MySQL example sets **no**
`ssl` option. Do not add `ssl` to the loopback connection unless a test on
Hostinger proves the local MariaDB accepts it — adding it blindly will break
production. The code must treat local and remote as different profiles, never
silently fall back from one to the other.

**`DB_SSL_CA_FILE` / `DB_TLS_ALLOW_PUBLIC_CA` note:** both variables are
implemented in this branch (`server/membership/mysql-tls.mjs`,
`server/membership/config.mjs`). Remote MySQL requires one of them:
a CA file path, or the explicit public-CA opt-in (`=1`). Either way
`rejectUnauthorized` stays `true` — there is no way to disable verification.

---

## 7. Initialize the dev tables

The app **does not** auto-migrate MySQL. You import the migration file once,
manually. The file is `server/membership/migrations/001-initial-mysql.sql`
(Better Auth 1.7.14 tables + app tables, `utf8mb4`). If any auth option changes,
regenerate it offline first (it never connects to Hostinger):

```powershell
npm run membership:prepare-mysql
git status
```

Only proceed if `git status` shows the expected change (or no change, if the
file was already up to date). Then import it — **use exactly one method:**

### 7.1 Method A — phpMyAdmin (easiest)

1. hPanel → Databases → (dev database `u853936014_aenural_dev`) → phpMyAdmin.
2. Select the database `u853936014_aenural_dev` in the left panel (not
   `information_schema`, not any other database).
3. Top menu → **Import** → Choose File → select
   `server\membership\migrations\001-initial-mysql.sql` from your project folder.
4. Leave format as SQL, click **Import** (bottom-right).
5. Wait for the green "Import has been successfully finished" message. If it
   reports errors, stop — copy the exact error text and do not re-run blindly
   (the file has no `DROP`, so a failed partial import needs a human look).

### 7.2 Method B — MySQL CLI

From PowerShell, in the project folder (password at the prompt, never on the
command line; `--ssl-mode=REQUIRED` so the import itself is encrypted — if
§6 concluded TLS is unavailable, do not use this method remotely; use
phpMyAdmin instead):

```powershell
mysql --host=srv2224.hstgr.io --port=3306 --user=aenural_devuse --protocol=TCP --ssl-mode=REQUIRED -p u853936014_aenural_dev < server\membership\migrations\001-initial-mysql.sql
```

### 7.3 Verify the tables exist

Connect again (`mysql` CLI as in §5.2, or phpMyAdmin → SQL tab) and run:

```sql
USE u853936014_aenural_dev;
SHOW TABLES;
```

You must see **all** of these (14 tables):

- Better Auth: `user`, `session`, `account`, `verification`, `rateLimit`
- App: `aenural_activity`, `aenural_projects`, `aenural_caption_jobs`,
  `aenural_daily_usage`, `aenural_checkouts`, `aenural_orders`,
  `aenural_operation_limits`, `aenural_webhooks`,
  `aenural_email_delivery_attempts`

A standalone read-only checker ships in this branch at
`scripts/membership/verify-mysql-schema.mjs` (mysql2 only — it works before
`npm ci` finishes). It reports any missing table and exits non-zero if one is
missing. It never creates, alters, or drops anything:

```powershell
node scripts\membership\verify-mysql-schema.mjs
```

There is also an app-integrated gate, `npm run membership:verify-mysql`
(`scripts/membership/verify-mysql.mjs`), which additionally proves the
connection is encrypted for remote hosts. Run it after `npm ci` and the
import, before starting the app in MySQL mode.

Also confirm the database default charset while you are here (the migration
relies on database defaults — it sets `utf8mb4` via `SET NAMES` but no
per-table `ENGINE`/`CHARSET`):

```sql
SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'u853936014_aenural_dev';
```

If the default is not `utf8mb4`, note it and tell the coordinator before
going further — do not silently proceed.

---

## 8. Configure SMTP (Hostinger Email)

The app sends verification and password-reset mail through Nodemailer using
the values in §3.2 (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASSWORD`, `MAIL_FROM`). Checklist before testing:

- [ ] `SMTP_HOST=smtp.hostinger.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`
      (primary). Fallback **only if 465 is blocked**: `SMTP_PORT=587`,
      `SMTP_SECURE=false` (STARTTLS, `requireTLS: true`). Never mix pairs (§3.2).
- [ ] `SMTP_USER` is the full mailbox address `support@aenural.com`;
      `SMTP_PASSWORD` is that mailbox's password (not the hPanel password).
- [ ] `MAIL_FROM=support@aenural.com` (the code's variable — **not**
      `SMTP_FROM`).
- [ ] Mailbox confirmed as Hostinger Email, not Titan (§3.3, step 2).
- [ ] SPF/DKIM/DMARC for `aenural.com`: if the domain uses Hostinger
      nameservers, Hostinger auto-publishes SPF
      (`v=spf1 include:_spf.mail.hostinger.com ~all`) and DKIM (three CNAMEs);
      **DMARC is not auto-added** — add a `_dmarc` TXT record starting at
      `p=none` by hand. If the domain does *not* use Hostinger nameservers,
      add SPF/DKIM/DMARC manually at your DNS provider. Without SPF/DKIM,
      verification mail is more likely to land in spam — check the spam folder
      during §10 testing before concluding mail is broken.
- [ ] Know the mailbox daily limit (hPanel → Emails → Mailboxes → View limits).
      Auth mail is low-volume; the limit is unlikely to bind during testing,
      but repeated resend tests count against it — do not hammer resend.

**Note:** the app sends **real email whenever SMTP is configured** (local
mode included) — there is no silent downgrade to disk. The local outbox
(`mail-<uuid>.json` in `.aenural-local/`) is used **only** when you explicitly
set `AENURAL_EMAIL_TRANSPORT=local-outbox` (local/SQLite mode, tests). If no
code email arrives during §10, check the dev-server terminal for
`[membership] Email send failed` — Better Auth logs mail failures
server-side instead of failing the request, so the page can say "code sent"
while nothing arrived. That log line is the source of truth.

---

## 9. Start the local site (MySQL mode)

```powershell
cd D:\Work\online-tools-platform
# Make sure MySQL mode is on for this terminal session:
$env:AENURAL_MEMBERSHIP_DATABASE = "mysql"
npm run dev
```

Open `http://localhost:3000` in your browser. What you should see:

- The site loads; the header shows a **Sign in** link (it is hidden until
  membership is enabled — if you see no Sign in link, the app is not in
  membership mode; stop and check §3/§9 troubleshooting).
- No startup crash. If the terminal shows an error about a missing env var,
  a short secret, or a database connection failure, read the exact message —
  it names the missing variable. Fix `.env.local`, stop the dev server
  (`Ctrl+C`), and start it again. Env changes are **not** picked up by a
  running `npm run dev` — always restart.

> **cmd alternative:** `set AENURAL_MEMBERSHIP_DATABASE=mysql && npm run dev`
> (in `cmd.exe`, `set` only affects that terminal window).

**Do not** set `AENURAL_MEMBERSHIP_ENABLED=1` for this local test — that flag is
for production. In dev, `AENURAL_MEMBERSHIP_DATABASE=mysql` is the switch.

### Troubleshooting startup

| Symptom | Likely cause |
|---|---|
| Throws listing `DB_NAME, DB_USER, …` / `AUTH_TRUSTED_IP_HEADER` | A required MySQL-mode var is missing/blank in `.env.local` (§3). |
| "secret must be at least 32 characters" | `BETTER_AUTH_SECRET` missing/short (§4). |
| `ECONNREFUSED 127.0.0.1:3306` | `DB_HOST` missing — it defaults to `127.0.0.1`. Set `DB_HOST=srv2224.hstgr.io`. |
| Timeout connecting to `srv2224.hstgr.io` | IP allowlist stale (§5.1) or network/firewall. |
| Generic 503 on first `/api/auth/*` or `/api/membership/*` call | Schema not imported (§7) — or the DB user lacks rights. Check §7.3 first. |
| Site loads but no Sign in link | Membership not enabled in this mode — check `AENURAL_MEMBERSHIP_DATABASE=mysql` is actually set in *this* terminal. |

---

## 10. Test registration, verification, login, logout, password recovery

If you ran the wizard, Stage I already walked these checks with you; this section is the same list in full, for re-running by hand.

Do these in order, in a normal browser window. Keep a second, private/incognito
window handy for the "fresh browser" reset test (§10.6). Use a real mailbox you
control for the test account (not `support@aenural.com` — that is the sender).

**Known limits while testing (code-verified):** passwords 12–128 characters;
verification codes are **6 digits, expire after 5 minutes, allow 5 incorrect
attempts**, and resends are limited to **one new code every 60 seconds**
(the page shows a countdown; the server enforces it too). Password-reset
tokens expire after **30 minutes**; sessions last **7 days** (rolling,
refreshed daily). Rate limits (DB-backed): sign-up 4/min, sign-in 8/min,
request-password-reset 3/min, OTP send 3/min, OTP verify 5/min, global
60/min. If you hit a 429, **wait a full minute** — do not keep retrying.
Verification links issued before this branch still verify for 1 hour;
no new links are sent.

### 10.1 Register

1. Go to `http://localhost:3000/sign-up`.
2. Enter a name, your test email, and a password of at least 12 characters.
3. Submit. Expected: you are sent to `/verify-email` (six code boxes + your
   masked email, e.g. `jo••••@gmail.com`). You are **not** signed in yet
   (`autoSignIn: false`). Sign-up itself sends the 6-digit code.
4. Check the test mailbox (and spam folder) for the code email from
   `support@aenural.com`, subject "Your AENural verification code". Expected:
   one email, arriving within a minute or two. If nothing arrives after
   5 minutes, check §8 (SPF/DKIM, Titan vs Hostinger Email, daily limit) and
   the dev-server terminal for `[membership] Email send failed` — a failed
   send is logged server-side, it does not fail the signup request, so the
   page can look successful while no mail arrived. The log line is the
   source of truth. Nodemailer has no retry.

### 10.2 Verify (enter the code) — then you are signed in

1. On `/verify-email`, enter the 6-digit code from the email (type it, or
   paste the whole code — the boxes fill in order). The page keeps your
   email across a refresh (server cookie, 10 minutes) — you do not type it
   again. If the page instead asks for your email, your verification
   session expired: enter the email, request a fresh code, and continue.
2. Submit. Expected: "Email verified. Taking you to your account…" and you
   land on `/account` **already signed in** — a session is created when the
   code is verified. The header shows your Account link. No separate
   sign-in step is needed after verification.
3. Confirm the account page loads your (empty) dashboard — billing, history,
   projects, settings, subscription sub-pages should all render without errors.
4. Negative checks (same page, fresh codes as needed): a wrong code is
   rejected; after **5 wrong attempts** the code is invalidated and you must
   request a new one; a code older than **5 minutes** is rejected as expired;
   a used code cannot be reused; **Resend** inside the 60-second countdown
   is disabled, and after resending, the **old code no longer works**.
5. Log out (§10.5), then sign in at `/sign-in` with the same
   email/password. Expected: you land on `/account` — password login is
   unchanged.

### 10.3 Duplicate signup (must stay generic — no "already exists" error)

1. Log out (§10.5), then go to `/sign-up` and register again with the **same**
   email and a different password.
2. Expected: the **same generic success as a first sign-up** — the page moves
   to `/verify-email` exactly as it does for a new account, with **no**
   "already exists / email already registered" error and **no second
   verification email**. No second `user` row must appear in the database
   (§11). A clear "already exists" error would itself be an enumeration
   oracle (anyone could probe whether an address has an account), so the
   app deliberately does not return one — an earlier version of this
   section that expected such an error was wrong, and was corrected in
   the Step 5 security fix (S5-14, see
   `docs/authentication/otp-delivery-failure.md` §4 for the live
   Better Auth 1.7.14 behaviour). If you own the address, use the
   recovery flow on `/verify-email` to get a fresh code.

### 10.4 Wrong password (must fail cleanly)

1. At `/sign-in`, enter the correct email with a wrong password.
2. Expected: a generic sign-in failure message (it must not say whether the
   email exists or the password was wrong — that distinction helps attackers).
3. Repeat wrong passwords rapidly 8+ times in a minute: expected: a 429
   rate-limit response. Wait a minute before continuing.

### 10.5 Logout

1. While signed in, use the Account menu / sign-out control to log out.
   (Verified wired in this branch: `account-dashboard.tsx` calls
   `authRequest('sign-out')` → POST Better Auth's `/api/auth/sign-out`,
   then redirects home. If you cannot find a logout button, report that.)
2. Expected after logout: the header shows Sign in again, and visiting
   `http://localhost:3000/account` redirects you to `/sign-in` (anonymous
   access denied).

### 10.6 Password recovery (fresh browser)

1. In a **fresh incognito/private window**, go to `/forgot-password`, enter
   your test email, submit. Expected: a neutral "if an account exists, a reset
   link was sent" message — it must look the same whether or not the email is
   registered.
2. Open the reset email, click the link, set a new password (12+ characters).
   Expected: success, then sign in with the **new** password. Old sessions
   must be revoked (`revokeSessionsOnPasswordReset: true`) — any other browser
   where you were signed in should now be signed out; verify that.
3. **Reused token:** click the same reset link a second time. Expected:
   failure — a used token must not work twice.
4. **Expired token:** request a new reset link, wait **more than 30 minutes**,
   then click it. Expected: failure ("expired"). (Do this one last — it costs
   30 minutes of waiting; start the timer, do §11 meanwhile, then come back.)
5. **Resend throttling:** on `/verify-email`, click resend repeatedly.
   Expected: after 3 sends in a minute, a 429. Wait a minute before retrying.

### 10.7 A/B profile isolation (quick check)

1. Register a **second** test account with a different email (verify it too).
2. Sign in as account A: you see only A's dashboard/projects (empty).
3. Sign in as account B (different browser/profile): you see only B's.
   Neither account must ever see the other's data. If you create a project as
   A, it must not appear for B.

**Record your results.** For each step above, note pass/fail + the exact error
text on failure. A screenshot of an error is more useful than a paraphrase.
Do not move to production until **all** of §10 passes (§12 of
`production-checklist.md` is the live re-run of this list).

---

## 11. Confirm accounts/sessions are stored in MySQL

These are **read-only** queries — they change nothing. Run them in phpMyAdmin
(SQL tab) or the `mysql` CLI after completing §10. **Never run `SELECT` on
`account.password`** (password hashes) and never share query output that
contains tokens — the queries below deliberately avoid both.

```sql
USE u853936014_aenural_dev;

-- 1. Your test users (should show emailVerified = 1 after §10.2)
SELECT id, name, email, emailVerified, createdAt
FROM user
ORDER BY createdAt DESC
LIMIT 5;

-- 2. Active sessions (one row per signed-in browser; expiresAt ~7 days out)
SELECT id, userId, expiresAt, ipAddress, createdAt
FROM session
ORDER BY createdAt DESC
LIMIT 5;

-- 3. Credential accounts (one per email/password user; no secrets shown)
SELECT id, userId, providerId
FROM account
ORDER BY createdAt DESC
LIMIT 5;

-- 4. Counts — sanity check that nothing duplicated or leaked
SELECT (SELECT COUNT(*) FROM user) AS users,
       (SELECT COUNT(*) FROM session) AS sessions,
       (SELECT COUNT(*) FROM account) AS accounts,
       (SELECT COUNT(*) FROM verification) AS pending_verifications;
```

Expected after §10:

- `users` = number of test accounts you created (duplicate signup in §10.3
  must **not** have added one).
- `sessions` ≥ 1 while signed in; **0 for a user after logout / after password
  reset** (sessions revoked).
- `pending_verifications` drops to 0 for a user once they verify (used tokens
  are consumed).

If `user` is empty after a successful-looking signup, you were almost
certainly running in **SQLite mode**, not MySQL mode — re-check
`AENURAL_MEMBERSHIP_DATABASE=mysql` (§9) and that you did not restart the
server without it.

---

## 12. Rollback / restore the previous config

### 12.1 Go back to SQLite dev mode (no code change needed)

```powershell
# In PowerShell, unset the variable for this terminal:
Remove-Item Env:AENURAL_MEMBERSHIP_DATABASE
# Or close the terminal and open a new one (env vars set with $env: do not persist).
# Then start the site again:
npm run dev
```

With the variable unset, the app uses SQLite in `.aenural-local/` again.
Verification mail then follows the normal transport rules: SMTP whenever
SMTP is configured, and a loud failure if it is not — mail is written to
`mail-*.json` files **only** if you explicitly set
`AENURAL_EMAIL_TRANSPORT=local-outbox`. Your MySQL dev database is untouched — the rows from §11 stay there for the
next MySQL test run. To re-enter MySQL mode later, set the variable again (§9)
— the schema import (§7) does not need repeating.

### 12.2 Restore `.env.local` from backup

```powershell
Copy-Item .env.local.bak-2026-11-18 .env.local -Force
```

### 12.3 Discard the branch's local changes (code only — careful)

```powershell
# See what would be lost first:
git status
# Stash uncommitted changes (recoverable):
git stash push -m "wip hostinger auth - before rollback"
# Or go back to main entirely (only if the branch work is committed or you
# are sure you want to abandon the local commits):
git checkout main
```

**Never** run `git stash` / `git checkout` / `git reset --hard` without reading
`git status` first, and never run them while `.env.local` is the only copy of
your passwords — back it up first (§3.1). Rolling back the code does not delete
the dev database; if you want a clean dev DB, that is a deliberate separate
step (drop + re-import §7 in phpMyAdmin) — do not do it casually, it deletes
your test accounts.

---

## Appendix — Environment variable reference

Every variable the auth/MySQL/SMTP code reads. "Required in MySQL mode" means
the app throws at startup without it (verified in `server/membership/config.mjs`).
"Default" is what the code uses when the variable is absent. "Where to get it"
is hPanel, generated, or fixed.

| Variable | Required where | Default | Example value | Where to get it |
|---|---|---|---|---|
| `BETTER_AUTH_SECRET` | MySQL mode (≥32 chars); SQLite auto-generates if absent | — (auto-generated file in SQLite mode only) | *(generated, §4 — never share)* | Generate with `node -e "…randomBytes(48)…"` (§4) |
| `BETTER_AUTH_URL` | Always (production: must be `https:`) | — | `http://localhost:3000` (dev); `https://aenural.com` (prod) | Fixed per environment |
| `SITE_URL` | Always; must share an origin with `BETTER_AUTH_URL` | — | `http://localhost:3000` (dev); `https://aenural.com` (prod) | Fixed per environment |
| `DB_HOST` | MySQL mode (not enforced by startup check — set it anyway) | `127.0.0.1` | `srv2224.hstgr.io` (remote dev); `127.0.0.1` (prod) | hPanel → Databases (remote hostname); fixed `127.0.0.1` in prod |
| `DB_PORT` | Optional | `3306` | `3306` | Fixed |
| `DB_NAME` | MySQL mode | — | `u853936014_aenural_dev` | hPanel → Databases |
| `DB_USER` | MySQL mode | — | `aenural_devuse` (exact hPanel spelling) | hPanel → Databases → users |
| `DB_PASSWORD` | MySQL mode | — | *(private — hPanel only)* | hPanel → Databases → user password; never share |
| `DB_SSL_CA_FILE` | Remote dev, **only if** §6 outcome B (Hostinger provides a CA) | — (blank) | `.aenural-local/hostinger-mysql-ca.pem` | Hostinger support, if they provide a CA file; otherwise leave blank |
| `DB_TLS_ALLOW_PUBLIC_CA` | Remote dev, **only if** §6 outcome A (cert chains to a public CA) | — (blank = not allowed) | `1` | Fixed; set to `1` only after the §6 probe proves outcome A. Never set it to bypass a verification failure. The app refuses remote MySQL unless this or `DB_SSL_CA_FILE` is set |
| `SMTP_HOST` | MySQL mode | — | `smtp.hostinger.com` | hPanel → Emails → Connect Apps & Devices |
| `SMTP_PORT` | Optional | `465` | `465` (primary); `587` (fallback) | Fixed per §8 |
| `SMTP_SECURE` | Optional | `true` | `true` (465); `false` (587) | Fixed per §8 |
| `SMTP_USER` | MySQL mode | — | `support@aenural.com` | hPanel → Emails → Mailboxes |
| `SMTP_PASSWORD` | MySQL mode | — | *(private — mailbox password)* | hPanel → Emails → Mailboxes; not the hPanel password |
| `MAIL_FROM` | MySQL mode | — | `support@aenural.com` | Fixed. **Not `SMTP_FROM`** — that name is wrong wherever it appears |
| `AUTH_TRUSTED_IP_HEADER` | MySQL mode | `x-real-ip` (code fallback when not enforced) | `x-real-ip` (recommended — §3.3) | Hostinger CDN doc + hPanel CDN check; ask Hostinger support if either check fails |
| `AENURAL_MEMBERSHIP_ENABLED` | Production MySQL mode (`=1` with `NODE_ENV=production`) | — | `1` (prod only; do not set for local dev) | Fixed |
| `AENURAL_MEMBERSHIP_DATABASE` | Dev MySQL mode | — (dev default = SQLite) | `mysql` | Fixed for this guide; unset to return to SQLite (§12) |
| `AENURAL_OWNER_TEST_MODE` | Owner-only testing only | — | `1` (only when testing owner-only mode) | Fixed; leave unset for normal testing |
| `AENURAL_LOCAL_DATA_DIR` | Optional (SQLite/dev data location) | `.aenural-local` | `.aenural-local` | Fixed; dir must not be inside `public/` |
| `NODE_ENV` | Always (implicit) | `development` (`npm run dev`) | `development` (dev); `production` (prod) | Set by the run command / Hostinger Node app |
| `LEMONSQUEEZY_API_KEY` / `LEMONSQUEEZY_STORE_ID` / `LEMONSQUEEZY_VARIANT_ID` / `LEMONSQUEEZY_WEBHOOK_SECRET` / `LEMONSQUEEZY_TEST_MODE` / `AENURAL_SALES_ENABLED` | Payments only — **out of scope for auth testing** | — | — | Lemon Squeezy dashboard; see payments docs, not this guide |
| `NEXT_PUBLIC_AENURAL_SITE_PREVIEW` | Optional | **OFF unless explicitly set to `1`** (opt-in only since Step 5, S5-19) | `0` (preview stays off) | Fixed; note the default is OFF |

**Variables that appear only in docs, not in code — do not use:** `DB_SSL_CA`
(architecture doc only; not implemented — the new variable is
`DB_SSL_CA_FILE`, a file *path*), `SMTP_FROM` (wrong name; code uses
`MAIL_FROM`). If you see either in a doc, the doc is stale.

---

## Sources & verification status

- **Verified from the repo at `feature/hostinger-authentication` HEAD (`8efd3d2`), Phase 3, 2026-11-18:**
  package versions/scripts; `server/membership/config.mjs` mode logic;
  `database.mjs` (no TLS in the pool); `auth.mjs` (limits, expiry times,
  verification flow); email transport (`MAIL_FROM`, port/secure mapping);
  `001-initial-mysql.sql` table list; `release-check.mjs` (names only).
  Full detail: `~/workspace/aenural-website-audit/audit-report.md`.
- **Verified from public Hostinger / Better Auth / MySQL docs, 2026-11-18:**
  remote MySQL = hPanel IP allowlist + port 3306, no TLS mention; production
  Node.js MySQL = `127.0.0.1:3306`, never `localhost`/`srv*.hstgr.io`;
  SMTP `smtp.hostinger.com:465` SSL primary, `587` STARTTLS fallback;
  SPF/DKIM auto-published only with Hostinger nameservers, DMARC manual.
  Full detail: `~/workspace/aenural-website-audit/hostinger-research.md`.
- **Must verify locally (not verifiable from public sources):** remote TLS
  availability + CA (§5–§6); that Hostinger CDN is enabled for `aenural.com`
  and no other proxy sits in front (§3.3); exact
  engine/version on `srv2224.hstgr.io` (`SELECT VERSION();`); mailbox product
  (Hostinger Email vs Titan) + daily limit; `001-initial-mysql.sql` importing
  cleanly on the real Hostinger MySQL version; end-to-end signup → verify →
  login against MySQL (§10).
- **Reconciled with the implementation (2026-11-18):** `DB_SSL_CA_FILE`
  (PEM path) and `DB_TLS_ALLOW_PUBLIC_CA` (`=1` opt-in) are implemented in
  `server/membership/mysql-tls.mjs` and validated by
  `scripts/membership/release-check.mjs`; the logout control is verified
  wired (`account-dashboard.tsx` → `authRequest('sign-out')` → POST
  `/api/auth/sign-out`). Still open: (1) the `check-mysql-tls.mjs` /
  `verify-mysql-schema.mjs` scripts have not been run against the real dev
  DB (cloud cannot reach it) — Faisal must run them from his PC and report
  the output. (2) Free-quota policy is **decided** (Phase 3, owner):
  **3 videos per day (UTC reset)** — README, roadmap, dashboard and code
  now agree; there is no lifetime allowance.
- **Trusted-proxy research (Phase 3, 2026-11-18):** Hostinger support doc
  "Hostinger CDN: Visitor IP addresses in logs and analytics" (updated
  2026-10-29, https://www.hostinger.com/support/hostinger-cdn-visitor-ip-addresses-in-logs-and-analytics/)
  — Node.js apps read `X-Real-IP`, or only the last entry of
  `X-Forwarded-For`; do not rely on `CF-Connecting-IP`; the advice holds
  only for requests through Hostinger CDN. Better Auth docs
  (https://better-auth.com/docs/concepts/rate-limit and
  https://better-auth.com/docs/reference/options) — `ipAddressHeaders`
  takes the first header with a valid address; a multi-entry
  `X-Forwarded-For` without `trustedProxies` shares one rate-limit counter
  and logs a warning; list only a header the proxy overwrites. Full note:
  `docs/authentication/trusted-proxy-ip.md`.
