# Production MySQL initialisation — AENural (Better Auth + Hostinger MySQL)

> **Repo path (once committed):** `docs/authentication/production-mysql-init.md`
> **Repo:** `faisalhere-afk/aenural-website`, branch `feature/hostinger-authentication`
> **Status: PREPARATION ONLY — do not execute until the gate in §0 is met.**
> **Do NOT touch the production repo `AmirNazir3784/AE-NUREL`.**
> **No real passwords, no dev credentials, no live values in this document.
> Every credential below is a `<placeholder>` you fill in from hPanel only.**

This document is the executable companion to
`docs/authentication/production-checklist.md` (§1, §4, §7). The checklist
states *what* must be true; this document states *exactly how*, in order,
with the exact SQL, the exact failure modes, and the exact verification
queries. If any step below contradicts hPanel for this account, hPanel is
right and this document is wrong — stop and record the difference.

## 0. Gate — do not start

Do not execute any step below until **all** of these are true:

- [ ] Local testing passed against the Hostinger **dev** database
      (`docs/authentication/hostinger-setup.md` §10–§11, wizard Stages C–E).
- [ ] The TLS decision for the Hostinger database is recorded (§6 of the setup guide).
- [ ] The approved release commit (`9abce77`, or its successor) is
      identified and will be deployed via the handover §D transfer
      (`docs/authentication/production-handover.md` §D). PR #21 stays
      **UNMERGED** through that transfer — do **not** wait for a merge;
      "PR #21 is merged" is not the gate on this path.
- [ ] `AENURAL_MEMBERSHIP_ENABLED` is **not** yet set in production
      (the app must not try to use MySQL before the schema exists).

If the gate is not met, this document is read-only.

## 1. Confirm the correct production hostname — verify, do not assume

**Do not assume the production hostname is `127.0.0.1`.** That value is
*expected* for Hostinger's managed Node.js hosting, but it is an expectation
to confirm for this account and plan, not a fact about every Hostinger setup.

Evidence for the expectation (checked 2026-11-19): Hostinger's own guide
"Connecting a Hostinger MySQL database to a Node.js application"
(updated 2026-10-29) says the production app runs on the same host as
MySQL and must use `127.0.0.1:3306`; it states explicitly that the remote
hostname (e.g. `srv123.hstgr.io`) "only works for connections from outside
Hostinger", and that `localhost` fails on Node 17+ because it resolves to
IPv6 `::1` ("Access denied for user …@'::1'").
Source: https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/

Confirm it for this account **before** writing any env var:

1. hPanel → **Websites** → your site → **Dashboard** → **Databases** →
   **MySQL Databases**. Open the production database's details / management
   view and read the **host** it shows. Record it privately.
   - If it shows `127.0.0.1`, the expectation is confirmed for this account.
   - If it shows anything else (a hostname, another IP), **use exactly what
     hPanel shows** and update the env table in §3 accordingly. Do not
     override hPanel with this document.
2. Cross-check in phpMyAdmin: hPanel → **Databases** → the production
   database → **phpMyAdmin** → home page → **Database server** section.
   It shows the server software/version and the connection the phpMyAdmin
   session itself uses. This confirms *which server* you are looking at;
   it does **not** by itself prove the app's connect host — the hPanel
   database details in step 1 are the authority for that.
3. **Do not** use `SELECT @@hostname;` as the connect host: it returns the
   server's internal hostname, which is not necessarily a connectable
   address for the app.
4. VPS caveat: on a Hostinger **VPS** you run MySQL yourself, so
   `127.0.0.1` applies only if MySQL runs on that same VPS. This document
   assumes the managed Cloud Startup Node.js app, not a VPS. If the site
   moves to a VPS, re-confirm the host from the VPS itself.

Also confirm in the same hPanel view:

- [ ] The **exact database name** hPanel assigned (use it character for
      character; do not guess a prefix — Hostinger names are typically
      prefixed with the account id, e.g. `u853936014_…`).
- [ ] The **exact database username** hPanel shows for the production user
      (same rule: hPanel's spelling wins; do not invent a prefix).
- [ ] Whether the database's default charset/collation is `utf8mb4`
      (the migration relies on database defaults; verify with §4 step 5).

## 2. Production database and users (hPanel — the primary path)

> **Naming clarification (decided by Faisal, 2026-11-20):** the live
> database is `u853936014_aenural_dev` on `srv2224.hstgr.io:3306`, user
> `aenural_devuse`. It was created **for the live website** — the `_dev`
> in the name is just a name. It **IS** the production database. There is
> **no separate prod DB** to create and no dev/prod mixing concern.
> Production connects to it via loopback (`127.0.0.1`, §1/§3) from the
> Hostinger web server; `srv2224.hstgr.io` is for PC-side access only and
> must never appear in the production env vars.
>
> **Schema status (confirmed 2026-11-20):** the database has **zero
> tables** — the schema has never been imported. The 14-table import in §4
> is pending Step 10 work into this (empty) database. Local/dev testing
> against this same database writes test rows into the live DB — clean up
> test accounts/sessions before real users arrive.

Create/confirm these in hPanel → **Databases** → **MySQL Databases**.
The database and runtime user already exist — confirm them, do not create
a second set.

| Item | Value | Notes |
|---|---|---|
| Production database | `u853936014_aenural_dev` (confirmed in hPanel) | Already created; the live DB. Empty — zero tables until §4. |
| Runtime user | `aenural_devuse` (confirmed in hPanel) | Used by the app, every request. Least privilege (§2.1). |
| Migration user | *(only if not using phpMyAdmin import)* | One-time schema import. Separate from the runtime user (§2.2). |

### 2.1 Runtime user — least privilege (exact GRANTs)

The app at runtime needs only row-level data access on the production
database. Grant exactly this, and nothing else:

```sql
-- Run in phpMyAdmin (SQL tab) while logged in as the database owner/admin,
-- or the equivalent hPanel privilege screen. Replace the placeholders
-- with the exact hPanel values. The host part MUST be confirmed in
-- hPanel first (§1): '127.0.0.1' is the expected value for managed
-- Node.js hosting; if hPanel shows a different host for this user,
-- use hPanel's value instead. Never use '%' (any host) and never guess.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON `<prod-db-name>`.*
  TO '<prod-runtime-user>'@'127.0.0.1'
  IDENTIFIED BY '<prod-runtime-password>';
FLUSH PRIVILEGES;
```

Explicitly **do NOT** grant the runtime user: `DROP`, `ALTER`, `CREATE`,
`INDEX`, `REFERENCES`, `FILE`, `GRANT OPTION`, or any server-wide
privilege. The app never migrates at runtime — if it later needs a schema
change, that is a new reviewed migration applied by a human, not a
privilege escalation.

> **Confirm the `GRANT … IDENTIFIED BY` form against Hostinger's MySQL
> variant before the session.** The `GRANT … TO 'user'@'host' IDENTIFIED
> BY '…'` form is valid on MariaDB, but `IDENTIFIED BY` inside `GRANT`
> was removed in MySQL 8.0 (there it needs a separate `CREATE USER`
> first). Hostinger's MySQL variant/version for this account is not
> recorded anywhere — confirm in hPanel/phpMyAdmin which form it accepts
> before running the statements above.

Verify the grant (read-only, shows what the user can actually do):

```sql
SHOW GRANTS FOR '<prod-runtime-user>'@'127.0.0.1';
```

Expected output contains only `SELECT, INSERT, UPDATE, DELETE` on
`` `<prod-db-name>`.* ``. If it contains anything else, fix it before
deploying — do not "leave it, it's only one extra privilege".

### 2.2 Migration user — only if you are not using phpMyAdmin import

The **recommended** import path is phpMyAdmin (§4), which runs as the
database owner/admin — no separate migration user is needed for it.
Create a separate migration user **only** if you will import from a CLI
instead, and delete or revoke it after the import:

```sql
-- One-time import only. Same host rule as §2.1.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, REFERENCES, ALTER
  ON `<prod-db-name>`.*
  TO '<prod-migration-user>'@'127.0.0.1'
  IDENTIFIED BY '<prod-migration-password>';
FLUSH PRIVILEGES;
```

Why these: the migration creates 14 tables (`CREATE`), creates indexes
(`INDEX`), declares foreign keys (`REFERENCES`), and — only if a later
change-only migration needs it — alters a table (`ALTER`). It never needs
`DROP` (a migration that drops data is never applied to a live database;
see §4.4).

After a successful import, revoke the migration user:

```sql
DROP USER '<prod-migration-user>'@'127.0.0.1';
FLUSH PRIVILEGES;
```

### 2.3 Remote MySQL — leave it OFF for production

- [ ] Do **not** add your PC's IP to the production database's Remote
      MySQL list. Do **not** enable "Any Host".
- [ ] The production app connects via loopback (§1) and needs no remote
      access. Any step in this document that needs the production database
      from outside Hostinger (backup, verification) is done via phpMyAdmin
      or on the Hostinger host itself — never by opening remote access.
- [ ] If a future step genuinely needs remote access, that is a new
      decision with its own TLS + IP-allowlist review, not something to
      enable "temporarily" during this initialisation.

## 3. Production environment variables (hPanel Node.js app)

Set these in hPanel → your Node.js app → **Environment variables**.
Exact names — copy them character for character. **Restart the app after
saving**; env changes only take effect on restart (Hostinger docs).
All passwords/secrets below are `<placeholders>` — paste them only into
hPanel, never into git, chat, email, or a screenshot.

| Variable | Production value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Required for the production path in `server/membership/config.mjs`. |
| `AENURAL_MEMBERSHIP_ENABLED` | `1` | **Only after §4–§5 pass.** Without it, production is **FULLY DISABLED** (auth routes 404, no auth initialised). It does **not** fall back to owner-only SQLite mode; owner-only mode requires the explicit `AENURAL_OWNER_TEST_MODE=1` opt-in (see `docs/authentication/controlled-activation.md` §2). |
| `BETTER_AUTH_URL` | `https://aenural.com` | Must be `https:` — the app throws otherwise. |
| `SITE_URL` | `https://aenural.com` | Must share an origin with `BETTER_AUTH_URL` (`release:check` enforces this). |
| `BETTER_AUTH_SECRET` | `<fresh production secret>` | Fresh, different from dev. ≥32 chars. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` on a trusted machine. |
| `DB_HOST` | `<host shown in hPanel — expected 127.0.0.1, see §1>` | Never `localhost` (IPv6 `::1` access-denied), never `srv2224.hstgr.io` from inside Hostinger. |
| `DB_PORT` | `3306` | |
| `DB_NAME` | `u853936014_aenural_dev` | The live DB (see §2) — its name ends in `_dev`, but it **is** the production database. |
| `DB_USER` | `aenural_devuse` | Exact hPanel spelling. |
| `DB_PASSWORD` | `<prod-runtime-password>` | hPanel env vars only. |
| `DB_SSL_CA_FILE` | *(leave unset)* | Loopback needs no TLS. Only set if a test **on Hostinger** proves the local MySQL accepts TLS — do not set it blindly. |
| `DB_TLS_ALLOW_PUBLIC_CA` | *(leave unset)* | Loopback needs no TLS; the opt-in is for remote dev only. |
| `SMTP_HOST` | `smtp.hostinger.com` | Confirmed 2026-11-20: `support@aenural.com` is Hostinger Email, **not** Titan — `smtp.titan.email` does not apply. |
| `SMTP_PORT` | `465` | Fallback `587` only if 465 is blocked on the host. |
| `SMTP_SECURE` | `true` | `false` only with port 587 (STARTTLS). |
| `SMTP_USER` | `support@aenural.com` | Full mailbox address. |
| `SMTP_PASSWORD` | `<mailbox password>` | Mailbox password, not the hPanel password. |
| `MAIL_FROM` | `support@aenural.com` | **Not `SMTP_FROM`** — that name is wrong wherever it appears. |
| `AUTH_TRUSTED_IP_HEADER` | `x-real-ip` | Recommended value; only valid while Hostinger CDN is enabled for `aenural.com` and no Cloudflare/other proxy sits in front — re-confirm both in hPanel at deploy time. See `docs/authentication/trusted-proxy-ip.md`. |
| `AENURAL_MEMBERSHIP_DATABASE` | *(leave unset)* | Not needed in production (`NODE_ENV=production` + `AENURAL_MEMBERSHIP_ENABLED=1` selects MySQL). |
| `NEXT_PUBLIC_AENURAL_SITE_PREVIEW` | `0` | Preview is **OFF** unless explicitly set to `1` (opt-in only since Step 5, S5-19). |

**Do not set in production:** `AENURAL_OWNER_TEST_MODE=1`,
any `AENURAL_*_QA` / hybrid switches (`release:check` blocks them),
dev database values, or the dev secret.

Pre-deploy names check (no service contacted, no credentials needed
beyond the names above):

```powershell
npm run release:check
```

It must exit 0 with the production values in place. A pass proves the
*names* are complete; it does **not** prove the database is reachable,
the schema is imported, or mail delivers — §4–§5 prove those.

## 4. Schema initialisation — non-destructive, repeatable, idempotent-aware

### 4.1 Regenerate the migration from the deployed code (offline, local PC)

```powershell
cd D:\Work\online-tools-platform
git fetch origin
git checkout feature/hostinger-authentication
git pull origin feature/hostinger-authentication
git rev-parse HEAD
npm run membership:prepare-mysql
git status
git diff -- server/membership/migrations/001-initial-mysql.sql
```

- `git rev-parse HEAD` must show the approved release commit (`9abce77`,
  or its successor — see §0). **Never regenerate from `main`:** `main`
  does not contain the auth work (PR #21 is unmerged), so a migration
  regenerated from `main` would be missing the membership tables.

- `membership:prepare-mysql` generates the file offline from the deployed
  auth options. It never connects to or changes any database.
- `git diff` must show **no unexpected changes**. If the file differs from
  the committed version, an auth option changed since the dev import:
  review the diff, commit the regenerated file, and deploy that exact
  version. **Never hand-edit the SQL.**

### 4.2 Review the SQL before it touches production (mandatory)

Read `server/membership/migrations/001-initial-mysql.sql` once. It must
contain:

- The 5 Better Auth tables: `user`, `session`, `account`,
  `verification`, `rateLimit`.
- The 8 app tables: `aenural_activity`, `aenural_projects`,
  `aenural_caption_jobs`, `aenural_daily_usage`, `aenural_checkouts`,
  `aenural_orders`, `aenural_operation_limits`, `aenural_webhooks`.
- The delivery-audit table: `aenural_email_delivery_attempts`
  (migration 002) — **14 tables in total**.
- `SET NAMES utf8mb4;` at the top.
- **No `DROP`, no `DELETE`, no `TRUNCATE`, no `ALTER` of an existing
  table.** If it contains any of those, stop and ask — do not import it.

Know the idempotency of this file before you import (this is the most
commonly misunderstood property of it):

| Tables | Statement | Re-import safe? |
|---|---|---|
| All 14 tables (5 Better Auth + 8 app + `aenural_email_delivery_attempts`) | `CREATE TABLE IF NOT EXISTS` | **Yes — a second import is a no-op:** it skips every table that already exists. It is **not** a "protective failure". |
| Indexes (`session_userId_idx`, etc.) | Guarded `CREATE INDEX` (created only when missing — MySQL has no `CREATE INDEX IF NOT EXISTS`) | **Yes** — a second import skips indexes that already exist. |

Consequence: **import the file into an empty production database.**
A re-import is a no-op, not a migration and not a repair step — and
because it no longer fails, it no longer protects against an accidental
re-run: always check `SHOW TABLES;` first (§4.4) instead of relying on
an error to tell you the import already happened.

### 4.3 Import via phpMyAdmin (recommended path)

1. hPanel → **Databases** → the production database → **phpMyAdmin**.
2. In the phpMyAdmin left panel, click the **production database name**.
   Read it twice. The name must be the production database from §2 —
   `u853936014_aenural_dev` — **not** `mysql`, not
   `information_schema`. Importing into the wrong database is the most
   likely serious mistake in this phase.
3. **Import** → **Choose file** → select the regenerated
   `001-initial-mysql.sql` from §4.1 → **Go**.
4. phpMyAdmin must report success with no errors. Record the exact
   message. If it reports any error, **stop**: do not re-run the import,
   do not click Go again — go to §4.5 (failure reporting) first.

CLI alternative (only if phpMyAdmin is unavailable, and only from a
machine that can reach the production database — with Remote MySQL off
(§2.3) that means on the Hostinger host itself, e.g. via SSH if the plan
offers it). Password at the prompt, never on the command line:

```bash
mysql --host=127.0.0.1 --port=3306 --user=<prod-migration-user> -p <prod-db-name> \
  < server/membership/migrations/001-initial-mysql.sql
```

### 4.4 Compatibility checks (run immediately after import)

In phpMyAdmin → production database → **SQL** tab (all read-only except
the last line, which only reads):

```sql
-- 1. All 14 tables present, no extras from the import.
SHOW TABLES;

-- 2. Default charset is utf8mb4 (the migration relies on DB defaults).
SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
  FROM information_schema.SCHEMATA
  WHERE SCHEMA_NAME = DATABASE();

-- 3. Every table is utf8mb4.
SELECT TABLE_NAME, TABLE_COLLATION
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
  ORDER BY TABLE_NAME;

-- 4. Fresh database: every table is empty (a non-empty table means you
--    imported into the wrong database, or the database was not empty).
SELECT 'user' AS t, COUNT(*) AS n FROM `user`
UNION ALL SELECT 'session', COUNT(*) FROM `session`
UNION ALL SELECT 'account', COUNT(*) FROM `account`
UNION ALL SELECT 'verification', COUNT(*) FROM `verification`
UNION ALL SELECT 'rateLimit', COUNT(*) FROM `rateLimit`
UNION ALL SELECT 'aenural_activity', COUNT(*) FROM `aenural_activity`
UNION ALL SELECT 'aenural_projects', COUNT(*) FROM `aenural_projects`
UNION ALL SELECT 'aenural_caption_jobs', COUNT(*) FROM `aenural_caption_jobs`
UNION ALL SELECT 'aenural_daily_usage', COUNT(*) FROM `aenural_daily_usage`
UNION ALL SELECT 'aenural_checkouts', COUNT(*) FROM `aenural_checkouts`
UNION ALL SELECT 'aenural_orders', COUNT(*) FROM `aenural_orders`
UNION ALL SELECT 'aenural_operation_limits', COUNT(*) FROM `aenural_operation_limits`
UNION ALL SELECT 'aenural_webhooks', COUNT(*) FROM `aenural_webhooks`
UNION ALL SELECT 'aenural_email_delivery_attempts', COUNT(*) FROM `aenural_email_delivery_attempts`;
```

Expected: 14 tables, charset `utf8mb4`, all counts `0`.
Alternatively, run the app's read-only checker (only if you have a secure
way to provide production env vars — never paste production credentials
into a shared terminal):

> **Note:** `npm run membership:verify-mysql` run **from the PC cannot
> reach a loopback-only production DB** — `DB_HOST=127.0.0.1` is the
> Hostinger host, not the PC. Use the phpMyAdmin SQL checks above
> instead, and do **not** treat a PC-side verify failure as an import
> failure.

```powershell
npm run membership:verify-mysql
```

It must print `MySQL schema OK: all 14 required tables are present` and
exit 0. It never creates or alters tables.

### 4.5 If the import fails — failure reporting (do not improvise)

1. **Stop.** Do not re-run the import, do not delete tables, do not
   "clean up" by dropping anything.
2. Copy the **exact** error text from phpMyAdmin (or the CLI) and the
   exact database name shown in the phpMyAdmin left panel.
3. Check, in order:
   - Wrong database? (Most likely. Compare the left-panel name with §2.)
   - File regenerated from the wrong branch/code? (`git status` / `git log`
     on the PC — the file must be the one from §4.1.)
   - Database not empty? (`SHOW TABLES;` — if tables already exist, the
     import skips them (`IF NOT EXISTS`); it does not refuse and does not
     overwrite them. See below.)
   - Charset not utf8mb4? (Fix the database default in hPanel/phpMyAdmin
     first, on an *empty* database, then import once.)
   - Privileges? (`SHOW GRANTS FOR '<user>'@'<host>';` — the importing
     user needs `CREATE, INDEX, REFERENCES` on this database.)
4. **If tables already exist (partial import):** do not re-import the whole
   file. List which of the 14 tables exist and which are missing
   (`SHOW TABLES;`), and apply **only the missing `CREATE TABLE`
   statements** (copy them from the reviewed file, one at a time), or
   restore from the §6 backup if the partial state cannot be explained.
   If the schema later drifts (an auth option changed), regenerate with
   `membership:prepare-mysql`, review the diff, and apply **the change
   only** — never blindly re-import the whole file over a live database
   containing users, and never hand-edit the SQL.

### 4.6 What "done" looks like

- [ ] §4.3 import reported success, first attempt, into the production
      database only.
- [ ] §4.4 checks pass: 14 tables, utf8mb4, all counts 0.
- [ ] `npm run membership:verify-mysql` exits 0 (if run).
- [ ] Import date, database name, and the git commit of the deployed code
      recorded privately next to the backup (§6).

### 4.7 Pre-existing databases — add the missing foreign keys (only if the database was imported with the old 001)

> **Not needed for a fresh import.** The current 001 declares all 9
> foreign keys explicitly (see §4.2), so a database imported fresh from
> it already has them — skip this section. It applies only to a database
> imported with the old 001.

**Background (Phase 4 finding, proven against disposable MySQL 8.0.46):**
the 001 file shipped before Phase 4 declared the `session`/`account`/
application-table relationships as inline `REFERENCES`, which MySQL
**silently ignores** — no error, no constraint. A database imported with
that file has 13 tables and **zero** foreign keys, so deleting a user does
not cascade (their sessions survive). The Phase 4 001 declares all 9
relationships as explicit `FOREIGN KEY` constraints, and a fresh import
gets them. A database that already exists does **not** gain them by
re-importing (the `CREATE TABLE IF NOT EXISTS` statements skip existing
tables) — apply the `ALTER TABLE` statements below once, as the migration
user (§2.2, needs `ALTER` + `REFERENCES` on this database). This is
additive only: it creates constraints, never drops or deletes anything.
The delivery table (`aenural_email_delivery_attempts`, migration 002) is
**not** covered here — the wizard Stage D creates it as a missing table,
or import it from the current 001's `CREATE TABLE` statement for that
table alone.

**1. Check what is missing first** (phpMyAdmin SQL tab, read-only):

```sql
SELECT CONSTRAINT_NAME, TABLE_NAME
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
  ORDER BY TABLE_NAME;
```

If all 9 names below are listed, stop — nothing to do. If any is missing,
continue with step 2 for the missing ones only.

**2. Check for orphaned rows first** — an `ALTER` fails if a child row
points at a user that does not exist. Each query below must return 0 rows
before you add that table's constraint (a non-zero result means the
database has inconsistent data — stop and report it, do not delete rows
to force the constraint through):

```sql
SELECT COUNT(*) FROM `session` s LEFT JOIN `user` u ON u.id = s.userId WHERE u.id IS NULL;
SELECT COUNT(*) FROM `account` a LEFT JOIN `user` u ON u.id = a.userId WHERE u.id IS NULL;
SELECT COUNT(*) FROM `aenural_operation_limits` t LEFT JOIN `user` u ON u.id = t.owner_id WHERE u.id IS NULL;
SELECT COUNT(*) FROM `aenural_orders` t LEFT JOIN `user` u ON u.id = t.owner_id WHERE u.id IS NULL;
SELECT COUNT(*) FROM `aenural_checkouts` t LEFT JOIN `user` u ON u.id = t.owner_id WHERE u.id IS NULL;
SELECT COUNT(*) FROM `aenural_daily_usage` t LEFT JOIN `user` u ON u.id = t.owner_id WHERE u.id IS NULL;
SELECT COUNT(*) FROM `aenural_caption_jobs` t LEFT JOIN `user` u ON u.id = t.owner_id WHERE u.id IS NULL;
SELECT COUNT(*) FROM `aenural_projects` t LEFT JOIN `user` u ON u.id = t.owner_id WHERE u.id IS NULL;
SELECT COUNT(*) FROM `aenural_activity` t LEFT JOIN `user` u ON u.id = t.owner_id WHERE u.id IS NULL;
```

**3. Add the missing constraints** (one statement per missing constraint;
re-running a statement for a constraint that already exists errors with
`ER_DUP_KEYNAME` — that error means "already done", not a failure):

```sql
ALTER TABLE `session` ADD CONSTRAINT `session_userId_fk`
  FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE;
ALTER TABLE `account` ADD CONSTRAINT `account_userId_fk`
  FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE;
ALTER TABLE `aenural_operation_limits` ADD CONSTRAINT `aenural_operation_limits_owner_id_fk`
  FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;
ALTER TABLE `aenural_orders` ADD CONSTRAINT `aenural_orders_owner_id_fk`
  FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;
ALTER TABLE `aenural_checkouts` ADD CONSTRAINT `aenural_checkouts_owner_id_fk`
  FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;
ALTER TABLE `aenural_daily_usage` ADD CONSTRAINT `aenural_daily_usage_owner_id_fk`
  FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;
ALTER TABLE `aenural_caption_jobs` ADD CONSTRAINT `aenural_caption_jobs_owner_id_fk`
  FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;
ALTER TABLE `aenural_projects` ADD CONSTRAINT `aenural_projects_owner_id_fk`
  FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;
ALTER TABLE `aenural_activity` ADD CONSTRAINT `aenural_activity_owner_id_fk`
  FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;
```

**4. Verify:** re-run the step-1 query — all 9 constraints must be listed.
Then `npm run membership:verify-mysql` must still exit 0 (it checks
tables, not constraints, so the step-1 query is the real check here).

## 5. Post-import verification (before enabling membership)

- [ ] `release:check` exits 0 with the §3 values (§3, last step).
- [ ] App restarted in hPanel after saving env vars; app logs show a
      clean startup with no `ECONNREFUSED`, no access-denied, no missing
      env var error. A missing required var makes the app throw at
      startup — that is a good failure (loud, early). A silently wrong
      `DB_HOST` (e.g. `localhost` or the remote hostname) is a bad one.
- [ ] Only **after** §4 passes: set `AENURAL_MEMBERSHIP_ENABLED=1`,
      restart, and run the live smoke tests in
      `docs/authentication/production-checklist.md` §9 (signup → OTP →
      login → logout → password recovery, then check `session.ipAddress`
      shows a real IP, not a proxy address).
- [ ] Confirm the runtime user cannot change the schema (negative test,
      phpMyAdmin as the runtime user or `SHOW GRANTS` re-check from
      §2.1): no `CREATE`, `DROP`, or `ALTER` in its grants.

## 6. Backup and restore procedure

Do this **before** enabling membership, and repeat on a schedule
afterwards. Hostinger's own backups are not a substitute for knowing how
to restore this database yourself — note the plan's backup/retention and
its limits, and do not assume it covers MySQL at the granularity needed.

### 6.1 Backup via phpMyAdmin (primary path)

1. hPanel → **Databases** → production database → **phpMyAdmin** →
   select the production database → **Export** → **Quick**, format SQL
   → **Go**.
2. Save the `.sql` file **off** the hosting account (your PC / encrypted
   storage), labelled with the date:
   `aenural-prod-YYYY-MM-DD.sql`.
3. Verify the file: non-empty, starts with the expected table names,
   contains all 14 `CREATE TABLE` statements.

### 6.2 Backup via mysqldump (alternative)

Only from a machine with MySQL client access to the production database.
With Remote MySQL off (§2.3) that means **on the Hostinger host itself**
(e.g. via SSH, if available on the plan) or via phpMyAdmin (§6.1).
**Do not enable Remote MySQL just to take a backup.** Password at the
prompt, never on the command line, never in a script file:

```bash
mysqldump --host=127.0.0.1 --port=3306 --user=<prod-runtime-user> -p \
  --single-transaction --routines --triggers \
  <prod-db-name> > aenural-prod-YYYY-MM-DD.sql
```

Notes:

- `--single-transaction` gives a consistent snapshot of InnoDB tables
  without locking them (users can keep signing up during the backup).
- `--routines --triggers` includes stored routines/triggers if any are
  ever added (none exist in the initial schema; the flags cost nothing).
- `--single-transaction` does **not** protect MyISAM tables; all tables
  in this schema are InnoDB by MySQL 8.0 default. If
  `SHOW TABLE STATUS` ever shows a non-InnoDB table, note it — the
  backup procedure needs revisiting.
- Verify the dump the same way as §6.1 step 3.

### 6.3 Restore (and test-restore — a backup never restored is a hope)

Restore into an **empty** database only:

```bash
# Via CLI (same reachability rule as §6.2):
mysql --host=127.0.0.1 --port=3306 --user=<prod-migration-user> -p <prod-db-name> \
  < aenural-prod-YYYY-MM-DD.sql
```

Or via phpMyAdmin: select the (empty) target database → **Import** →
choose the `.sql` file → **Go**. Then verify:

```sql
SHOW TABLES;  -- must list all 14 tables
-- Compare row counts against the backup's expected counts (record them
-- at backup time). Counts must match the backup, not necessarily live
-- production if users signed up since the backup was taken.
SELECT 'user' AS t, COUNT(*) AS n FROM `user`;
```

**Test-restore once before enablement, not "someday":**

1. In hPanel create a throwaway database (e.g. `<prod-db-name>_restore_test`).
2. Import the §6.1/§6.2 backup into it via phpMyAdmin.
3. `SHOW TABLES;` must list all 14 tables; row counts must match the backup.
4. If the import errors or any table/count is wrong, the backup is broken
   — fix the backup procedure before enabling membership.
5. **Delete the throwaway database afterwards.** It contains copies of
   password hashes and sessions — do not leave it lying around.
6. Record the test-restore date next to the backup.

**Restore into live production** only if data is damaged, and only if you
accept losing signups since the backup. Never restore a **dev** database
backup into production. If production auth fails after enablement, the
first step is always to disable membership (remove
`AENURAL_MEMBERSHIP_ENABLED`, restart) and preserve the logs — see
`docs/authentication/production-checklist.md` §8 — not to restore.

## 7. Rollback

If production auth fails after enablement, in order:

1. Disable membership in production (hPanel env vars: remove / set
   `AENURAL_MEMBERSHIP_ENABLED` to `0`, restart). Production is then
   **FULLY DISABLED** — auth routes 404, no auth is initialised, and no
   new MySQL writes happen. The site itself stays up, but there is **no
   owner login fallback**: owner-only mode is a separate, explicit opt-in
   (`AENURAL_OWNER_TEST_MODE=1`) and does **not** activate by disabling
   membership.
2. Preserve evidence: copy the app logs and the exact error text before
   restarting anything else. Do not delete the production database.
3. Diagnose from this document: wrong `DB_HOST` (§1), missing env var
   (§3), schema not imported (§4), wrong `AUTH_TRUSTED_IP_HEADER`,
   SMTP failure (see `docs/authentication/production-smtp-verification.md`).
4. Restore the database only if data is damaged (§6.3).
5. Restore the previous code if the failure is a code failure
   (deploy the previous known-good commit; do not force-push).

## Sources

- Hostinger, "Connecting a Hostinger MySQL database to a Node.js
  application" (updated 2026-10-29) — `127.0.0.1:3306` for apps on the
  same host; remote hostname only from outside Hostinger; `localhost`
  → `::1` access-denied on Node 17+:
  https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/
- Repo: `server/membership/mysql-tls.mjs` (`REQUIRED_MYSQL_TABLES`,
  loopback vs remote profiles), `server/membership/database.mjs`,
  `scripts/membership/verify-mysql.mjs`,
  `scripts/membership/prepare-mysql.mjs`,
  `server/membership/migrations/001-initial-mysql.sql` (14 tables, all
  `CREATE TABLE IF NOT EXISTS`; indexes created only when missing, so a
  re-import is a no-op).
- `docs/authentication/production-checklist.md` (§1, §3, §4, §7, §8) —
  this document does not replace it; read both before executing.
