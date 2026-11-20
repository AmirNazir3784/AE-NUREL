# Production SMTP verification — AENural (Better Auth Email OTP)

> **Repo path (once committed):** `docs/authentication/production-smtp-verification.md`
> **Repo:** `faisalhere-afk/aenural-website`, branch `feature/hostinger-authentication`
> **Status: PREPARATION ONLY — do not execute until the gate in §0 is met.**
> **Do NOT touch the production repo `AmirNazir3784/AE-NUREL`.**
> **No real passwords or mailbox credentials in this document. The script
> in §3 reads every secret from environment variables at run time; never
> paste a password into the script, a chat message, or a ticket.**

This document is the executable companion to
`docs/authentication/production-checklist.md` §6 and
`docs/authentication/production-mysql-init.md` §3. It proves, in order:
(1) the production host can reach the SMTP server securely, (2) the
mailbox authenticates, (3) one test email is **accepted** by the server
(SMTP 250), and (4) that email is **confirmed in the inbox** with SPF and
DKIM passing. Steps 3 and 4 are different results and are recorded
separately — "the mail arrived" alone is not proof, and "SMTP accepted
it" alone is not delivery.

## 0. Gate — do not start

- [ ] The production database is initialised
      (`docs/authentication/production-mysql-init.md` §4–§5 passed).
- [ ] The mailbox `support@aenural.com` exists in hPanel → **Emails** →
      **Mailboxes**, and you know which product it is: **Hostinger Email**
      or **Titan Email**. This is still unconfirmed at the time of writing
      (Phase 3 open item 5) — §1 settles it before any test is sent.
      **Confirmed 2026-11-20: `support@aenural.com` is Hostinger Email
      (NOT Titan), so `SMTP_HOST=smtp.hostinger.com:465` applies and §2.2
      (Titan) can be skipped.** SPF/DKIM/DMARC status and the mailbox
      daily sending limit are still to-confirm.
- [ ] You have a test recipient address you control (not a customer's
      address, not a mailing list). One address, one test email.
- [ ] You have **not** yet enabled `AENURAL_MEMBERSHIP_ENABLED=1` for
      real users, or you are verifying in a window where a single test
      signup is acceptable. The §3 script sends a plain test message, not
      a verification code — no user account is created by it.

## 1. Confirm the mailbox product first — Hostinger Email vs Titan

The two products use **different server families**. Using the wrong one
is the most common SMTP failure for this setup. Do not guess: check
hPanel → **Emails** → **Mailboxes** and read what the mailbox is called
there.

| | Hostinger Email | Titan Email |
|---|---|---|
| SMTP host | `smtp.hostinger.com` | `smtp.titan.email` |
| SMTP port (implicit TLS) | `465`, `SMTP_SECURE=true` | `465`, `SMTP_SECURE=true` |
| SMTP port (STARTTLS fallback) | `587`, `SMTP_SECURE=false` | `587`, `SMTP_SECURE=false` |
| IMAP host | `imap.hostinger.com:993` | `imap.titan.email:993` |
| Username | Full mailbox address (`support@aenural.com`) | Full mailbox address |
| Password | Mailbox password (not the hPanel password) | Mailbox password (not the hPanel password) |

Sources: Hostinger's own SMTP documentation as reported in its support
guides (`smtp.hostinger.com:465`); Titan's official support docs
(`smtp.titan.email:465` SSL/TLS, `587` STARTTLS alternate, IMAP
`imap.titan.email:993`) — https://support.titan.email/hc/en-us/articles/900000750943-Configure-Titan-account-on-MacOS-Apple-Mail-App
and https://support.titan.email/hc/en-us/articles/900000573066-How-to-configure-IMAP-for-Android.
Titan additionally requires **third-party access enabled** in Titan
webmail (Settings → "Enable Titan on other apps") before any external
client — including the app's Nodemailer transport — can authenticate.
If Titan auth fails with correct credentials, check that setting first.

Record the confirmed product here (privately, not in the repo):

- Mailbox product: Hostinger Email / Titan Email (circle one)
- SMTP host used: ____________________
- Third-party access (Titan only): enabled / not applicable

The app reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASSWORD`, `MAIL_FROM` from the environment (see
`server/membership/email-otp.mjs`: SMTP is the only transport whenever
SMTP is configured; there is no silent fallback to the local outbox, and
`AENURAL_EMAIL_TRANSPORT=local-outbox` is rejected outside local mode).
Set the hPanel env vars to the confirmed product's values
(`docs/authentication/production-mysql-init.md` §3) and restart the app
before verifying.

## 2. DNS authentication — SPF / DKIM / DMARC (check before sending)

A test email that arrives with failing SPF/DKIM will go to spam for many
users. Check the records **before** the §3 test, and read the
authentication result **after** it (§4).

### 2.1 Expected records (Hostinger Email)

Source: Hostinger, "Set up a domain for Hostinger Mail manually"
(updated 2026-11-13) —
https://www.hostinger.com/support/8671319-set-up-a-domain-for-hostinger-email-manually/
— corroborated by EasyDMARC's Hostinger guide
(https://easydmarc.com/blog/hostinger-email-spf-and-dkim-configuration-step-by-step-guideline/).

| Record | Type | Name | Value |
|---|---|---|---|
| SPF | TXT | `@` (root domain) | `v=spf1 include:_spf.mail.hostinger.com ~all` |
| DKIM | CNAME | `hostingermail-a._domainkey` | `hostingermail-a.dkim.mail.hostinger.com` |
| DKIM | CNAME | `hostingermail-b._domainkey` | `hostingermail-b.dkim.mail.hostinger.com` |
| DKIM | CNAME | `hostingermail-c._domainkey` | `hostingermail-c.dkim.mail.hostinger.com` |
| DMARC | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@aenural.com` |

Rules that cause silent failures:

- **Exactly one SPF record per domain.** If Hostinger auto-added one,
  edit it to merge all senders into a single `v=spf1 …` string — never
  add a second SPF record (two records = PermError).
- **Exactly one DMARC record.** DMARC is **not** auto-added by Hostinger;
  add it by hand if missing. Start at `p=none` (monitor only); tighten
  to `quarantine`/`reject` only after SPF and DKIM are passing.
- DKIM for Hostinger Email is **CNAME, not TXT**. Adding the DKIM values
  as TXT records will not sign mail.
- If `aenural.com` does **not** use Hostinger nameservers, add all of the
  above manually at the DNS provider instead — records added in hPanel's
  DNS Zone Editor do nothing in that case.
- DNS changes can take up to 24 hours to propagate (Hostinger). Do not
  declare SPF/DKIM "broken" within the first hours of a change.

### 2.2 If the mailbox is Titan

Titan's SPF/DKIM/DMARC records are **different** from Hostinger Email's
and are shown in the Titan / hosting control panel for the domain.
**Unconfirmed at the time of writing:** the exact Titan DNS values for
`aenural.com` were not verified from an authoritative source during this
phase. Do not copy the Hostinger Email values in §2.1 for a Titan
mailbox — read the values from the Titan dashboard (or Hostinger's Titan
configuration documentation for the account) and record them before
sending. If the Titan panel shows no DKIM values, ask Hostinger support
for them; do not invent a selector.

### 2.3 How to check the records (read-only)

```powershell
# PowerShell (Windows) — replace aenural.com only if checking another domain:
Resolve-DnsName aenural.com -Type TXT
Resolve-DnsName _dmarc.aenural.com -Type TXT
Resolve-DnsName hostingermail-a._domainkey.aenural.com -Type CNAME
```

Or `dig aenural.com TXT +short`, `dig _dmarc.aenural.com TXT +short`.
Record the outputs privately with the date. A missing record is a
**finding**, not a reason to skip the §3 test — run the test, note the
authentication result in §4, and fix DNS before enabling membership.

## 3. Verification procedure — connectivity, auth, one test email

### 3.1 The script

Save this as `scripts/membership/verify-smtp.mjs` **locally only**
(it reads secrets from the environment; it must never be committed with
values in it — the committed copy, if any, must contain no credentials
and no defaults). It uses only `nodemailer`, which is already a
dependency. It sends **one** plain test message — no verification code,
no link, no user data.

```js
// Production SMTP verification for AENural — ONE test email only.
// Reads SMTP_HOST/SMTP_PORT/SMTP_SECURE/SMTP_USER/SMTP_PASSWORD/
// MAIL_FROM and SMTP_TEST_RECIPIENT from the environment.
// Exits 0 only when the server ACCEPTS the message (SMTP 250).
// Acceptance is NOT inbox delivery: confirm delivery separately (§4).
// Never paste a password into this file, a chat message, or a ticket.
import nodemailer from 'nodemailer';

const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM', 'SMTP_TEST_RECIPIENT'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exitCode = 1;
  process.exit();
}

const port = Number(process.env.SMTP_PORT);
const secure = process.env.SMTP_SECURE === 'true';
if (![465, 587].includes(port)) {
  console.error(`SMTP_PORT must be 465 (implicit TLS) or 587 (STARTTLS); got ${process.env.SMTP_PORT}.`);
  process.exitCode = 1;
  process.exit();
}
if ((port === 465) !== secure) {
  console.error('SMTP_PORT=465 requires SMTP_SECURE=true; SMTP_PORT=587 requires SMTP_SECURE=false.');
  process.exitCode = 1;
  process.exit();
}

const runId = `${new Date().toISOString().slice(0, 10)}-${process.pid}`;
const subject = `AENural production SMTP test ${runId}`;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  // No other options: TLS verification stays on (never rejectUnauthorized: false).
});

try {
  await transporter.verify();
  console.log(`SMTP verify() OK: ${process.env.SMTP_HOST}:${port} greeted and accepted authentication.`);
} catch (error) {
  console.error(`SMTP verify() FAILED (${error.code || error.name}): ${error.message}`);
  console.error('Checklist: wrong host/port for the mailbox product (§1), mailbox password (not hPanel password), Titan third-party access (§1), or the host blocking the port.');
  process.exitCode = 1;
  process.exit();
}

try {
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: process.env.SMTP_TEST_RECIPIENT,
    subject,
    text: `AENural production SMTP test.\n\nSubject: ${subject}\n\nThis is a connectivity test from the production host. It contains no verification code and no link. If you received it, reply to this checklist with the date/time and the SPF/DKIM result from "show original" (§4).\n`,
  });
  console.log(`SMTP ACCEPTED the message. Response: ${info.response}`);
  console.log(`Message-ID: ${info.messageId}`);
  console.log(`Subject (for the inbox search): ${subject}`);
  console.log('This proves acceptance only. Confirm inbox delivery separately (§4) — do not mark SMTP "verified" yet.');
} catch (error) {
  console.error(`SMTP send FAILED (${error.code || error.name}): ${error.message}`);
  console.error('The message was NOT accepted. Check the sending limit (§5) — a 100/day mailbox that already sent 100 messages in the last 24h will refuse new mail.');
  process.exitCode = 1;
}
```

### 3.2 Run it (from the production host, or a machine with the production env)

The honest place to run it is **on the production host** (the same
network path the app will use). If the plan offers SSH to the Node.js
host, run it there with the hPanel env vars exported in that shell
only (never write them to a file on a shared machine). If SSH is not
available, run it from the PC **only as a mailbox check** — a pass from
the PC proves the mailbox and DNS, not the production host's network
path; record which machine ran it.

```powershell
# PowerShell — set the variables in this shell only, then run.
# Never put the password in a script file or chat message.
$env:SMTP_HOST = "<from §1>"
$env:SMTP_PORT = "465"
$env:SMTP_SECURE = "true"
$env:SMTP_USER = "support@aenural.com"
$env:SMTP_PASSWORD = "<mailbox password — type it here only>"
$env:MAIL_FROM = "support@aenural.com"
$env:SMTP_TEST_RECIPIENT = "<your test address>"
node scripts/membership/verify-smtp.mjs
```

Record, privately, with date/time:

- [ ] `SMTP verify() OK` — host, port, and authentication accepted.
      If it failed, record the exact error code/message and stop (see §3.3).
- [ ] `SMTP ACCEPTED` — the server's 250 response, the Message-ID, and
      the subject line (needed for the §4 inbox search).

### 3.3 If verify() or send fails — do not retry blindly

| Symptom | Most likely cause | Check |
|---|---|---|
| `ECONNREFUSED` / timeout | Wrong host/port, or the port blocked on the host | §1 product table; try 587 + `SMTP_SECURE=false` only if 465 is blocked on the host. |
| `EAUTH` / 535 | Wrong password, or Titan third-party access off | Mailbox password (not hPanel password); Titan webmail Settings → "Enable Titan on other apps". |
| 550 / 554 on send | Sending limit reached, or sender rejected | §5 limits; check hPanel → Emails → Mailboxes → View limits. |
| TLS / certificate error | Hostname mismatch, or a proxy intercepting | Never disable TLS verification. Record the exact error and ask Hostinger support. |
| Works from the PC, fails on the host | Host network/egress rule | Ask Hostinger support whether outbound 465/587 is open for the Node.js app. |

Each failed attempt can consume sending quota. Fix the cause, then send
**one** more test — do not hammer the server.

## 4. Inbox-delivery confirmation (the part most checklists skip)

SMTP acceptance (§3) is not delivery. Complete all of these:

1. Open the test recipient's inbox (and spam folder). Search for the
   exact subject recorded in §3.2.
2. Record: arrived / not arrived, date/time, inbox or spam.
3. Open the message → **Show original** / **View message source** /
   **Authentication results**. Record verbatim:
   - `spf=pass` or `spf=fail` (and the domain it checked).
   - `dkim=pass` or `dkim=fail` (and the selector, e.g.
     `hostingermail-a`).
   - `dmarc=pass` or `dmarc=fail`.
4. **Pass condition:** message arrived in the inbox (not spam) **and**
   SPF **and** DKIM pass. If either fails, fix DNS (§2) and re-test —
   do not enable membership on "it arrived, that's enough".
5. If the message does not arrive within 15 minutes, check spam, check
   the sender's mailbox for a bounce, and check the §5 limit before
   re-sending. A second send to the same address with a new subject is a
   new test — record it as one.

Only when §3 **and** §4 pass is production SMTP "verified". Then run one
real end-to-end check through the app itself: a test signup on
`https://aenural.com` with a controlled address, confirm the OTP email
arrives with the same authentication results, and delete the test account
afterwards (never leave test accounts in production).

## 5. Sending limits (know the ceiling before launch)

**Authority:** hPanel → **Emails** → **Mailboxes** → **View limits** for
this mailbox is the authority for this account. The figures below are
as reported by secondary sources in November 2026 and **must be
confirmed in hPanel** — Hostinger changes plan limits, and the free/trial
allowance changed in April 2025.

| Plan (per mailbox) | Reported daily sending limit | Source |
|---|---|---|
| Free / trial mailbox (bundled with hosting, 1 GB) | **100/day** | HostAdvice SMTP review + settings guide; Mailmeteor; HostingRevelations (all Nov 2026 reports, consistent) |
| Business Starter (5 GB) | **1,000/day** | Same sources |
| Business Standard / Premium (20–50 GB) | **3,000/day** | Same sources |

Rules reported consistently across those sources (confirm in hPanel):

- Limits are **per mailbox**, counted over a **rolling 24 hours**
  (not a calendar day): 100 messages sent at 15:00 means the quota
  does not fully reset until 15:00 the next day.
- Inbound and outbound are counted **separately** (receiving 50 does
  not consume the sending allowance).
- **Max 100 recipients per message** (To + Cc + Bcc combined), all plans.
- Outbound message size cap **35 MB** total, attachments **25 MB**;
  inbound cap 50 MB (reported by HostAdvice, 2026-08-09).
- The app sends **one email per signup (OTP), one per resend, one per
  password reset**. At 100/day, a free mailbox supports at most ~100
  such sends per rolling day — including resends and test emails.
  If expected verification/reset volume is anywhere near that, upgrade
  the mailbox **before** launch; do not discover the limit from user
  complaints.

**Titan sending limits: UNCONFIRMED.** No authoritative Titan limit
figure for this account was verified during this phase. Check the Titan
panel / Hostinger's Titan documentation for the account's limit and
record it here before launch. Do not assume the Hostinger Email figures
above apply to a Titan mailbox.

Volume planning (fill in at deploy time):

- Expected signups/day: ____  Resends/day: ____  Resets/day: ____
- Total worst-case sends/day: ____  Mailbox daily limit (hPanel): ____
- Headroom: ____  (if headroom is under 2× expected volume, upgrade first)

## 6. After verification — ongoing

- [ ] Re-run §3–§4 after **any** change to the mailbox, DNS, hosting
      plan, or SMTP env vars. A working setup is not proof it still
      works after a change.
- [ ] Watch the app logs for `[membership] Email send failed` (Better
      Auth 1.7.14 swallows mail-send errors in the OTP path — see
      `docs/authentication/otp-delivery-failure.md` — so a user-facing
      success does not prove delivery; the server log and the delivery
      tracker are the only witnesses).
- [ ] Never use the production mailbox for bulk mail, newsletters, or
      marketing. It is a transactional mailbox; bulk sends will burn the
      daily limit and harm deliverability.
- [ ] Never enable `AENURAL_EMAIL_TRANSPORT=local-outbox` in production
      (rejected at startup; see `server/membership/email-otp.mjs`).

## Sources

- Hostinger, "Set up a domain for Hostinger Mail manually" (updated
  2026-11-13) — SPF `v=spf1 include:_spf.mail.hostinger.com ~all`,
  DKIM CNAMEs `hostingermail-a/b/c`, DMARC `p=none` starter:
  https://www.hostinger.com/support/8671319-set-up-a-domain-for-hostinger-email-manually/
- Titan support, "Configure Titan account on MacOS/Apple Mail App"
  (`smtp.titan.email:465` SSL/TLS) and "How to configure IMAP for
  Android" (`587` STARTTLS alternate):
  https://support.titan.email/hc/en-us/articles/900000750943-Configure-Titan-account-on-MacOS-Apple-Mail-App
  https://support.titan.email/hc/en-us/articles/900000573066-How-to-configure-IMAP-for-Android
- Hostinger sending limits (secondary sources, Nov 2026 — confirm in
  hPanel): HostAdvice, "Hostinger SMTP Settings: Ports, DNS Records,
  SPF, DKIM, & DMARC" (100/1,000/3,000 per day, rolling 24h, 100
  recipients/message, 35 MB outbound / 25 MB attachments);
  https://hostadvice.com/blog/web-hosting/email/hostinger-smtp-settings/
  Mailmeteor, "How to Send Bulk Emails from Hostinger (2026 Guide)";
  https://mailmeteor.com/blog/send-bulk-emails-hostinger
  HostingRevelations, "Hostinger Email Sending Limit" (checked
  2026-10-17); https://hostingrevelations.com/hostinger-email-sending-limit/
- Repo: `server/membership/email-otp.mjs` (transport rules, SMTP-only
  when configured), `server/membership/config.mjs` (required SMTP vars),
  `docs/authentication/otp-delivery-failure.md` (Better Auth 1.7.14
  mail-send error swallowing), `docs/authentication/production-checklist.md` §6.
