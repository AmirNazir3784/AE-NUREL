# OTP delivery failure — Better Auth 1.7.14 investigation and mitigation (Stage F)

**Date:** 2026-11-18 · **Repo:** `faisalhere-afk/aenural-website`, branch `feature/hostinger-authentication`
**Versions pinned:** Better Auth **1.7.14** (package.json), Next 16.4.6, nodemailer 10.2.1
**Status:** mitigated as far as the supported 1.7.14 API allows. **Not fully fixed** — see §5.

## 1. The problem

An OTP request can answer success while no email arrives. Sign-up (or resend)
returns 200, the user lands on `/verify-email`, and the code never comes.
Before Stage F the only trace was a server log line. This document states
exactly why, with source references, what was done about it, and what remains
impossible in 1.7.14.

## 2. Investigation — exact findings

All references are to the published `better-auth@1.7.14` package source
(tarball `better-auth-1.7.14.tgz`, verified 2026-11-18). The same code is
unchanged in **1.7.25** (the latest 1.7.x at the time of writing), so
upgrading within 1.7.x does not fix this.

### 2.1 Where send errors are swallowed

`package/dist/context/create-context.mjs`, lines 215–229:

```js
async runInBackgroundOrAwait(promise) {
  try {
    if (options.advanced?.backgroundTasks?.handler) {
      if (promise instanceof Promise) options.advanced.backgroundTasks.handler(promise.catch((e) => {
        logger.error("Failed to run background task:", e);
      }));
    } else await promise;
  } catch (e) {
    logger.error("Failed to run background task:", e);
  }
},
```

Every OTP send is awaited through this function, and **any throw is caught,
logged, and discarded**. The endpoint then returns its normal success body.
The send is awaited by default (no fire-and-forget), but the error still
never reaches the response.

Call sites for the email-verification OTP (all the same pattern):

| Caller | File:line (dist) |
|---|---|
| `POST /email-otp/send-verification-otp` (resend) | `plugins/email-otp/routes.mjs:108–112` |
| `POST /email-otp/request-password-reset` | `plugins/email-otp/routes.mjs:476` (disabled in AENural, still swallowed) |
| `POST /forget-password/email-otp` | `plugins/email-otp/routes.mjs:530` (disabled, still swallowed) |
| `POST /email-otp/request-email-change` | `plugins/email-otp/routes.mjs:652` (disabled, still swallowed) |
| Sign-up / sign-in / send-verification-email via `overrideDefaultEmailVerification` | `plugins/email-otp/index.mjs:26` (wraps the send action) and `:67` (after-hook path) |
| Core link verification sends (pre-OTP transition links) | `api/routes/sign-up.mjs:245`, `api/routes/sign-in.mjs:344`, `api/routes/email-verification.mjs:201,266` |
| Password-reset link sends — **same swallow, out of OTP scope** | `api/routes/password.mjs:82` |

### 2.2 No supported API exposes delivery failure

Checked against `plugins/email-otp/types.d.mts` (`EmailOTPOptions`) and the
official docs (https://better-auth.com/docs/plugins/email-otp):

- `sendVerificationOTP: (data: { email, otp, type }, ctx?) => Promise<void>` —
  returns **void**. There is no delivery result to inspect, no boolean, no
  status object. The only observable signal is whether the callback itself
  throws, and only inside the callback.
- **No delivery callback/hook exists.** `EmailOTPOptions` is:
  `sendVerificationOTP, otpLength, expiresIn, generateOTP,
  sendVerificationOnSignUp, disableSignUp, allowedAttempts, storeOTP,
  resendStrategy, changeEmail, overrideDefaultEmailVerification, rateLimit`.
  There is no `onOTP`, `onSend`, `onError` or delivery-event option.
- **Hooks cannot see it either.** A `hooks.after` handler sees
  `ctx.context.returned`, which is the endpoint's success payload — the
  send failure happened inside `runInBackgroundOrAwait` before the
  endpoint returned, so the after-hook cannot distinguish a failed send
  from a successful one.
- **`getVerificationOTP` (server-only) does not help.** It returns the
  stored OTP, not a delivery status — and with `storeOTP: "hashed"` it
  throws instead. Using it to "check" delivery would also put live codes
  in server code paths. Not used.
- **The custom `logger` option was considered and rejected.** The swallow
  logs through `createLogger(options.logger)` (`context/create-context.mjs:58`),
  so a custom logger *could* pattern-match the message `"Failed to run
  background task:"`. That couples AENural to Better Auth's internal log
  text, which is not a public contract and can change in any release; it
  also cannot tell *which* send failed (the log carries no email/type).
  Not used.
- **Do not "fix" it by monkey-patching.** Patching `node_modules`,
  wrapping `runInBackgroundOrAwait`, or reaching into plugin internals
  was ruled out: it breaks on every upgrade, is invisible to reviewers,
  and the app's own callback already provides a supported observation
  point (see §3).

### 2.3 The documented alternative makes it worse

The official docs recommend **not** awaiting the send (timing-attack
resistance: an awaited send makes response latency differ between existing
and non-existing addresses) and using `advanced.backgroundTasks.handler`
(e.g. `waitUntil`) so the send runs after the response. With a handler set,
`runInBackgroundOrAwait` does **not** await at all — the response returns
before the send has finished. AENural deliberately does **not** configure
`backgroundTasks.handler`: the default awaited path is what makes the
mitigation in §3 accurate at response time, and the anti-enumeration
concern is already handled by generic responses, the 500 ms cooldown floor,
and per-IP rate limits. **Do not add a backgroundTasks handler without
re-reading this section** — it would make even the tracker race the
verify page.

### 2.4 What happens on resend

Resend (`POST /email-otp/send-verification-otp`) resolves the OTP first
(`resolveOTP`, `routes.mjs:31–55`: with `resendStrategy: "rotate"` a new
code is generated and stored, invalidating the previous one) and only then
calls the send callback through the same swallowing wrapper. So a failed
resend still rotates the code: the old code is dead and the new code was
never delivered. The user must resend again (after the 60 s cooldown) —
which is exactly why the verify page must show the failure instead of
claiming a code was sent.

## 3. Mitigation implemented (supported APIs only)

All changes are in the files named in this section (`server/membership/otp-delivery.mjs`, `server/membership/auth.mjs`, `server/membership/pending-verification.mjs`, `member-client.ts`, `email-verification-form.tsx`; tests in `tests/otp-delivery.test.mjs`, `tests/otp-integration.test.mjs`, `tests/email-otp.test.mjs`). There is no `MANIFEST.md` on the branch — that was a Phase 3 staging artifact, not a committed file. Nothing in
Better Auth was modified, no internals are imported, no monkey patching.

### 3.1 Delivery tracking — `server/membership/otp-delivery.mjs` (new)

The app's own `sendVerificationOTP` callback is the one place a failure is
observable before Better Auth swallows it, so `auth.mjs` records the
outcome there (see §3.2). The tracker is:

- **In-memory only, per process.** A failed send is transient operational
  state, not account state. It is never written to the database, never
  survives a restart (restart resets everything to `"unknown"`, the safe
  default), and never influences whether an account exists.
- **Values are only `"sent" | "failed" | "unknown"`.** No error code, no
  provider internals, no OTP ever leaves the server through this channel.
  (The transport error code is kept in the entry for server-side debugging
  only and is never serialised into a response.)
- **10-minute TTL** (same as the pending-verification cookie) and a
  **1,000-entry cap** (oldest evicted first), so it cannot grow without bound.
- **Recording never throws and never changes a send's outcome** — the
  callback wraps the record calls so a tracking bug can neither fail a
  delivery nor mask a real failure.

### 3.2 Wiring — `server/membership/auth.mjs`

- `sendVerificationOTP` callback: `try { sendOtpMail } catch { recordFailed; throw }`
  then `recordSent` on success. The throw is preserved so the failure is
  still logged by `sendMail` (`[membership] Email send failed: <code>`)
  and by Better Auth.
- **Transport health pre-check** (`requireHealthyEmailTransport()`, via the
  existing `checkEmailTransportHealth()` — `nodemailer verify()`, once per
  process on success, re-probed after failure) in the before-hook for:
  - `POST /sign-up/email` — fails fast with a generic 503 **before** the
    account is created, so a broken transport never creates an account
    whose code never arrives, and retrying the sign-up can never create a
    duplicate (the first attempt created nothing).
  - `POST /email-otp/send-verification-otp` — after the 60 s cooldown
    short-circuit (a cooled-down request sends nothing, so there is nothing
    to pre-check). Same generic 503 for every address.
  - `POST /send-verification-email` (legacy resend path) — same, after its
    cooldown short-circuit.
  - The 503 message is identical for every address and is checked before
    any account lookup, so it cannot enumerate accounts.
- `advanced.backgroundTasks.handler` is **not** configured (see §2.3).

### 3.3 Status endpoint — `server/membership/pending-verification.mjs`

`GET /api/membership/pending-verification` now returns
`{ email, emailMasked, delivery }` where `delivery` is `"sent" | "failed" |
"unknown"` for the address in the caller's own pending-verification cookie
(`"unknown"` when there is no cookie, no send was attempted, or the entry
expired). No new route was needed and no new cookie was introduced.

### 3.4 Frontend — `member-client.ts`, `email-verification-form.tsx`

- `pendingVerification()` returns the `delivery` status (defaults to
  `"unknown"` for older server responses).
- The verify form reads it on mount and re-checks it after every resend
  and after recovery (the send endpoints answer success even when mail
  fails, so their responses cannot be trusted on this). When delivery is
  `"failed"` it shows:

  > "We couldn't send the verification code. Please try resending once the
  > timer below ends — if it still doesn't arrive, check your spam folder
  > or contact support@aenural.com."

- **Retry preserves the limits:** the 60 s per-email cooldown and the
  per-IP rate limits still apply — a failed send created a code row, so
  the cooldown is keyed to it. The form's resend countdown is unchanged.

## 4. What the tests prove

`tests/otp-delivery.test.mjs` (13 tests) and `tests/otp-integration.test.mjs`
(8 tests), plus the updated `tests/email-otp.test.mjs` — **71/71 pass, twice**
— and the full SMTP suite — **39/39 pass** (current figures, verified
2026-11-20; the Phase 3-era figures of 28 email-otp tests / 68-pass full
suite are superseded). Run on Node v24.22.1 against real Better Auth 1.7.14 +
temporary SQLite. Notably:

- Transport down at check time (SMTP pointed at closed loopback port
  127.0.0.1:15991): sign-up → generic 503, **no account created**;
  resend and recovery → identical generic 503 for known and unknown
  addresses; sign-up works again after recovery.
- Transport healthy at check time but dead at send time (local-outbox
  directory removed after startup): sign-up still answers **200** — the
  1.7.14 swallow, reproduced on purpose — but the status endpoint reports
  `"failed"`; retry after the cooldown succeeds and the rotated code verifies.
- Duplicate sign-up: Better Auth answers a **generic 200 with a synthetic
  user** (not 422) when `requireEmailVerification` is on — one account,
  one code. (Found while writing these tests; the 422 only applies when
  email verification is not required.)

## 5. What remains impossible in 1.7.14 — open blocker

Be explicit: **the swallow itself cannot be fixed from inside the supported
API.** The mitigation makes failures visible and blocks sends up front, but:

1. **A send that fails after the pre-check still answers success.** The
   pre-check (`verify()`) and the send are two separate operations; the
   transport can die between them, the recipient can be rejected at send
   time (`verify()` only proves connect + authenticate), or a quota can be
   hit mid-send. In all those cases the response is 200 and only the
   tracker + server log know. This is the residual blocker: it needs either
   a Better Auth change (an error-propagating send path or a delivery
   callback) or a different verification design (e.g. the app sending the
   code itself outside the plugin — a bigger change, not attempted here).
2. **Sign-in-triggered sends are not pre-checked.** Sign-in of an unverified
   user also sends an OTP via the override, but the before-hook cannot tell
   verified from unverified before authentication, and blocking all
   sign-ins when mail is down would lock out verified users. A failure
   there is still recorded by the tracker and shown on the verify page.
3. **Password-reset link mail has the same swallow** (`password.mjs:82`).
   Out of OTP scope; flagged as follow-up, not fixed here.
4. **Tracker is in-memory.** A server restart clears all delivery state
   (safe default: `"unknown"`), and in a multi-process deployment each
   process tracks only its own sends. If AENural ever runs more than one
   Node process, the tracker must move to shared storage — not needed for
   the current single-process deployment.
5. **Residual enumeration note (narrowed 2026-11-19, Phase 4).** A
   `"failed"` (or `"sent"`) status proves a send was attempted, and a
   send is only attempted for an existing unverified account — so the
   status endpoint now reports delivery ONLY when the caller holds the
   sign-up signature cookie for that address (HMAC of the auth secret,
   set by the sign-up after-hook; see `pending-verification.mjs`). The
   recovery route sets the email cookie for any well-formed address but
   NEVER the signature cookie, so probing an address through recovery
   always reads `"unknown"` now. What remains: a duplicate sign-up
   returns a generic 200 whose synthetic user carries the submitted
   email, so the after-hook sets a signature cookie for it too — an
   attacker who re-signs-up with a victim's address within 10 minutes
   of the victim's own sign-up could read `"sent"` for it. That window
   is bounded by the 10-minute entry TTL and reveals only that an
   unverified sign-up happened minutes ago. Recovery-originated
   sessions no longer get the honest-error banner (their delivery
   reads `"unknown"`); the sign-up flow — the common path — is
   unaffected.

## 6. Operator notes

- Watch the server log for `[membership] Email send failed: <code>` and
  `[membership] SMTP verification failed: <code>` — code only, never an
  address, a code, or a credential.
- A `"failed"` status on the verify page means: check SMTP
  (`smtp.hostinger.com:465`, `support@aenural.com` credentials, Hostinger
  sending limits, SPF/DKIM/DMARC) and the dev-server terminal; tell the
  user to wait out the 60 s resend timer and try again.
- Local development without any mail configured now fails sign-up with a
  generic 503 instead of silently creating an account with no code. That
  is intentional (fail fast). Set `AENURAL_EMAIL_TRANSPORT=local-outbox`
  for mail-free local development, as documented in Phase 2.

## 6.1 Runbook — password-reset mail outage (S5-27)

Password-reset mail has **no user-facing delivery signal by design**:
the reset response is the same generic success for known and unknown
addresses (anything else would let anyone probe whether an address has
an account), so a user can never be told "your reset mail failed".
When users report "I requested a reset link and nothing arrived",
check in this order:

1. **Server log** for `[membership] Email send failed: <code>` and
   `[membership] SMTP verification failed: <code>` (code only — never
   an address, a code, or a credential). A fresh 503 on
   `/request-password-reset` means the transport pre-check is already
   failing fast; the user sees "Account services are temporarily
   unavailable. Try again." and no reset is attempted.
2. **Durable audit table** — reset attempts are recorded with kind
   `'password-reset'` (never the token or URL):
   `SELECT email, status, error_code, created_at FROM aenural_email_delivery_attempts WHERE kind = 'password-reset' ORDER BY created_at DESC LIMIT 20;`
   A `failed` row for the address proves the send was attempted and
   failed; no row at all (and no 503 in the log) means the request
   never reached a send — check the 60-second per-email reset cooldown
   and the 3/min per-IP limit first.
3. **SMTP health** — same checks as for OTP mail: `smtp.hostinger.com:465`,
   `support@aenural.com` credentials, Hostinger sending limits,
   SPF/DKIM/DMARC. Fix the transport, then tell the user to request a
   fresh reset link (old reset tokens are single-use and expire after
   30 minutes; there is nothing to re-send for a failed attempt).
