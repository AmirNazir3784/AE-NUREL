# OTP verification — guided browser test checklist

**Repo:** `faisalhere-afk/aenural-website` · **Branch:** `feature/hostinger-authentication`
**Applies to:** Phase 2 (Email OTP) + Phase 3 Stage F (delivery-failure mitigation)
**How to use:** work top to bottom in order — several steps depend on the
account created in step 1. For each item: run the step, write what you
observed, tick PASS or FAIL, and note inbox confirmation where asked.
Use a **real mailbox you control** (not `support@aenural.com`) for the test
account. Use a **different email per run** if you repeat the checklist —
reused addresses hit the duplicate-sign-up behaviour (step 12).

> **"Requires explicit approval / Faisal only"** marks steps that touch the
> real Hostinger dev database (`u853936014_aenural_dev` on
> `srv2224.hstgr.io`) or real SMTP delivery. Do not run those from any
> other machine, and do not run them against production. Steps without
> that mark run against local development (SQLite + local outbox or local
> SMTP) and are safe to repeat.

**Setup before you start** (local run): `git checkout
feature/hostinger-authentication && git pull && npm ci && npm run
release:check && npm test && npm run build && npm run dev`, then open
http://localhost:3000/sign-up. Keep the dev-server terminal visible —
several steps ask you to check it for the `[membership] Email send failed`
log line. For the live run, the same steps apply with
`AENURAL_MEMBERSHIP_DATABASE=mysql` and real SMTP configured; see the
setup guide (`docs/authentication/hostinger-setup.md` §10).

| # | Check | What to do | What to observe / expected result | Result |
|---|---|---|---|---|
| 1 | **Registration creates an unverified account** | Sign up with a real mailbox you control, name + password (12+ chars). | You land on `/verify-email`; no session exists yet (you are not signed in — `/account` redirects to sign-in). | ☐ PASS ☐ FAIL — Observed: _____________ |
| 2 | **A code is sent automatically at sign-up** | Check the test mailbox (and spam) immediately after step 1. | One email "Your AENural verification code" from `support@aenural.com`, containing a 6-digit code, no verification link. Note the time it arrived: ______ Inbox confirmed: ☐ yes ☐ no | ☐ PASS ☐ FAIL — Observed: _____________ |
| 3 | **Email is retained — you are never asked to re-type it** | On `/verify-email`, look at the page. | Your address is shown masked (e.g. `jo••••@gmail.com`); there is no email field in the normal flow. | ☐ PASS ☐ FAIL — Observed: _____________ |
| 4 | **Correct code verifies** | Enter the 6-digit code from step 2 (type or paste). | "Email verified. Taking you to your account…" then `/account` loads already signed in. | ☐ PASS ☐ FAIL — Observed: _____________ |
| 5 | **Incorrect code is rejected** | (Use a second test address, or repeat from step 1.) Enter a wrong 6-digit code. | Error "That code didn't match. Check the code and try again." (or equivalent); you stay on `/verify-email`; no session is created. | ☐ PASS ☐ FAIL — Observed: _____________ |
| 6 | **Expired code is rejected** | Request a code, wait **more than 5 minutes** without entering it, then enter it. | Error "This code has expired. Request a new code."; the old code never works again. | ☐ PASS ☐ FAIL — Observed: _____________ |
| 7 | **Reused code is rejected** | Verify successfully (step 4), log out, then try the same code again on `/verify-email` via recovery. | The used code is rejected ("That code didn't match" / invalid); a used code can never verify twice. | ☐ PASS ☐ FAIL — Observed: _____________ |
| 8 | **Resend + 60s cooldown** | On `/verify-email`, watch the resend area immediately after a code is sent. | "Resend code in 01:00" counts down; the Resend button is unavailable until it reaches zero. After it ends, Resend sends a fresh code (check inbox — a second code arrives). Inbox confirmed: ☐ yes ☐ no | ☐ PASS ☐ FAIL — Observed: _____________ |
| 9 | **Previous code is invalidated by a resend** | After step 8's resend, enter the **old** code, then the **new** code. | Old code rejected; new code verifies. Only the latest code ever works. | ☐ PASS ☐ FAIL — Observed: _____________ |
| 10 | **Refresh mid-flow keeps the email** | On `/verify-email` with a code pending, refresh the page (F5). | The same masked email is still shown; the code step returns (no re-typing, no recovery form). | ☐ PASS ☐ FAIL — Observed: _____________ |
| 11 | **Missing context shows recovery** | Open `/verify-email` in a fresh private/incognito window (no pending cookie). | Recovery step appears: "We couldn't find an email to verify… enter your email and we'll send a fresh code." Entering the unverified address sends a fresh code and shows the code step. | ☐ PASS ☐ FAIL — Observed: _____________ |
| 12 | **Duplicate sign-up creates nothing twice** | Sign up again with the **same** email as step 1. | You still land on `/verify-email` with a generic response; only **one** account exists and only **one** code was sent for that address (check inbox count: ______). No error leaks whether the address is registered. | ☐ PASS ☐ FAIL — Observed: _____________ |
| 13 | **Unverified login is restricted** | Before verifying, go to `/sign-in` and sign in with the new account's email/password. | Sign-in is refused ("Verify your email before signing in."); no session, no dashboard access. | ☐ PASS ☐ FAIL — Observed: _____________ |
| 14 | **Verification establishes the session** | Complete step 4, then check `/account` and the browser's cookies. | `/account` shows the signed-in workspace; a `better-auth.session_token` cookie exists; the pending-verification cookie is gone (Max-Age=0). | ☐ PASS ☐ FAIL — Observed: _____________ |
| 15 | **Dashboard access after verification** | On `/account`, check the workspace (free quota shown, e.g. 3 videos remaining). | Dashboard renders for this user only; free quota/entitlement matches the account (used 0, remaining 3, not premium). | ☐ PASS ☐ FAIL — Observed: _____________ |
| 16 | **Logout revokes the session** | From `/account`, log out, then try opening `/account` again and reusing the old tab. | You are signed out; `/account` redirects to sign-in; the old session no longer works. | ☐ PASS ☐ FAIL — Observed: _____________ |
| 17 | **Email/password login after verification** | After step 16, sign in at `/sign-in` with the same email/password. | Sign-in succeeds and lands on `/account`. Password login is unchanged by the OTP work. | ☐ PASS ☐ FAIL — Observed: _____________ |
| 18 | **Forgot-password + reset (link flow, unchanged)** | On `/sign-in`, use "Forgot password" for the verified address; open the reset link from the inbox; set a new password. | Reset email arrives with a link (not a code). After reset: the **old** session is revoked, the **old** password stops working, the **new** password works, and reusing the reset link fails. Inbox confirmed: ☐ yes ☐ no | ☐ PASS ☐ FAIL — Observed: _____________ |
| 19 | **Mobile responsiveness** | Repeat steps 1–4 on a phone (or narrow the browser to ~360 px wide). | Six code boxes fit, wrap or scroll cleanly; buttons and the resend timer are tappable; no horizontal overflow; no clipped text. Device/width used: _____________ | ☐ PASS ☐ FAIL — Observed: _____________ |
| 20 | **Light / dark themes** | Toggle the site theme (or OS theme) on `/verify-email` and `/account`. | Code boxes, notices, error banner and buttons stay readable in both themes; no invisible text or broken contrast. | ☐ PASS ☐ FAIL — Observed: _____________ |
| 21 | **Automated checks pass locally** | In the repo: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. | All four pass (record the test count: ______). These are the isolated/disposable-DB tests — they prove the code, not the live services. | ☐ PASS ☐ FAIL — Observed: _____________ |
| 22 | **Live Hostinger MySQL / SMTP integration — REQUIRES EXPLICIT APPROVAL / FAISAL ONLY** | With `AENURAL_MEMBERSHIP_DATABASE=mysql` and real SMTP configured, repeat steps 1, 2, 4, 13, 17, 18 against the dev database; then check MySQL (§11 of the setup guide) that the user row is `emailVerified` and a session row exists. | Real code email arrives from `support@aenural.com`; verification, login and reset all work against MySQL; rows are present in `u853936014_aenural_dev`. If **no** email arrives: check the dev-server terminal for `[membership] Email send failed` — and the verify page must now show "We couldn't send the verification code…" instead of leaving you guessing. | ☐ PASS ☐ FAIL — Observed: _____________ |

## Delivery-failure spot checks (Stage F — do these while running the list)

- **Transport down at sign-up:** stop the mail path (e.g. point SMTP at a
  wrong host/port in `.env.local`, or stop the local mail setup) and try
  signing up with a fresh address. Expected: a generic "Account services
  are temporarily unavailable. Try again." error and **no account is
  created** — retrying the same sign-up after restoring mail works and
  creates exactly one account.
- **Send fails after the check:** harder to force in a browser; the
  automated suite covers it (`tests/otp-delivery.test.mjs`). In the
  browser, the visible sign is the verify-page banner: "We couldn't send
  the verification code. Please try resending once the timer below ends…"
  with the resend countdown still enforced.

## If something fails

- Note the step number, what you observed, and the exact error text.
- Check the dev-server terminal for `[membership] Email send failed`,
  `[membership] SMTP verification failed`, and `[membership] Verification
  recovery failed` — those lines carry only an error code, never an
  address or a code.
- Check the mailbox spam folder before concluding a code never arrived.
- Do **not** paste codes, passwords, or `.env.local` values into chat or
  tickets — report only the step, the observed behaviour, and the log
  code (e.g. `ESOCKET`, `EAUTH`).
