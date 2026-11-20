# Controlled Production Activation — AENural Membership (Phase 4)

**Status:** design + implementation on `feature/hostinger-authentication`
(PR #21, unmerged). Ready for local integration testing only — **NOT
production-ready**. Live MySQL / SMTP / end-to-end checks still need
Faisal's PC (see §7).
**Update 2026-11-20:** CI is green — run #232 passed all four jobs on
`9abce77`, so release state 2 is closed. Still **NOT production-ready**:
gate G4 (`AUTH_TRUSTED_IP_HEADER` unconfirmed) is open and the live
checks are unverified.

## 1. The rule

Membership is controlled **only by environment flags**. It never
auto-activates on deploy, there is no admin UI toggle, and there is **no
public readiness/status endpoint** that reports activation state, env, or
diagnostics. Activation is a deliberate, admin-only act: set the flag in
Hostinger's Node application environment (production) or `.env.local`
(development), restart, then run the checks in §6.

Canonical definition: `server/membership/activation.mjs`
(`resolveMembershipActivation`). The render-thread mirror is
`src/lib/membership-config.ts` (`membershipEnabled()` /
`ownerTestEnabled()`); the two must agree and
`tests/membership-activation.test.mjs` pins them against the same env
matrix. Never add a second switch.

## 2. Truth table

| Environment | Flags | Mode |
|---|---|---|
| Any | `AENURAL_OWNER_TEST_MODE=1` | **owner-only** (explicit opt-in) |
| Production | `AENURAL_MEMBERSHIP_ENABLED=1` | **enabled** (public membership) |
| Production | anything else (unset, `0`, `true`, …) | **disabled** |
| Development | `AENURAL_MEMBERSHIP_DISABLED=1` | **disabled** (wins even if `ENABLED=1`) |
| Development | otherwise | **enabled** (local SQLite) |
| Other (`test`, unset) | `ENABLED=1` | **enabled** |
| Other | otherwise | **disabled** |

Only the exact string `"1"` enables anything. Values like `true`, `yes`,
`on` count as unset.

### What each mode means

- **enabled** — public membership is on. In production this requires
  MySQL + SMTP + `MAIL_FROM` + `AUTH_TRUSTED_IP_HEADER` (see §3); the
  app refuses to start auth without them. Local development uses SQLite.
- **owner-only** — only the pre-provisioned private owner account can
  sign in. Public sign-up is closed (`disableSignUp`), email recovery is
  refused, account deletion is disabled. SQLite in its own data
  directory (`.aenural-local/owner`). This is a deliberate private-test
  mode, never a fallback.
- **disabled** — no account services at all:
  - `GET/POST /api/auth/*` → `404` (empty body).
  - `/api/membership/*` (including `pending-verification`) → `404`
    `{"message":"Not found."}`.
  - `POST /api/payments/webhook` → `404` (note: disabling membership
    also pauses webhook processing; Lemon Squeezy retries deliveries).
  - `/sign-in`, `/sign-up`, `/forgot-password`, `/verify-email` render
    an unavailable state with **no working form** — no fields, no submit
    button, nothing is sent or saved. Free tools keep working.
  - `/account` renders the public preview workspace (not signed-in
    state); a stale session cookie is ignored.
  - No database, auth library, or mail transport is initialised for the
    request (all `server/membership/*` imports in routes are dynamic /
    lazy, and `memberFromHeaders` returns `null` before touching auth).
  - The header shows no Sign in link (except the development-only
    preview modal button, which only renders when `NODE_ENV ===
    'development'`).

### Change vs Phases 1–3 (breaking, deliberate)

The old code **implied owner-only mode in production whenever the flag
was not `1`** (and `OWNER_TEST_MODE` was not `0`). That meant
"disabled" in production still ran Better Auth on a SQLite owner
database, served `/api/auth/*` (owner sign-in, password reset) and
`/api/membership/*` (guest caption quota). There was no true off state,
and a deploy following `config/membership.env.example` (`ENABLED=0`,
no `OWNER_TEST_MODE`) silently ran owner-test auth. From Phase 4 on,
production with the flag off is **fully disabled**; owner testing in
production requires the explicit `AENURAL_OWNER_TEST_MODE=1` opt-in.
A second latent precedence bug was fixed at the same time: in
development, `ENABLED=1` used to override `DISABLED=1`; the explicit
disable now wins.

**Migration note for the owner:** if you were relying on the old
implied production owner mode, set `AENURAL_OWNER_TEST_MODE=1` explicitly
before deploying this change, or the owner account will stop working
until you do. Never set it to `1` on a public deploy unless you mean it.

## 3. Enabling (fail-closed)

When mode is `enabled` outside local/SQLite mode,
`server/membership/config.mjs` throws at startup (before any auth
object, database pool, or mail transport exists) unless **all** of these
are present and non-empty: `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`,
`AUTH_TRUSTED_IP_HEADER`. The server-side error names the missing keys
(names only, never values). Other fail-closed rules that already existed
and are unchanged:

- `BETTER_AUTH_URL` must be the exact site origin; production requires
  `https:`.
- Remote MySQL (`DB_HOST` other than loopback) requires verified TLS
  (`DB_SSL_CA_FILE` or the `DB_TLS_ALLOW_PUBLIC_CA=1` opt-in);
  `rejectUnauthorized` is always true. Loopback (`127.0.0.1`, the
  Hostinger production profile) uses plain TCP.
- `AENURAL_EMAIL_TRANSPORT=local-outbox` in production is a startup
  error. Production **never falls back to SQLite** for public
  membership: `openMembershipDatabase` throws loudly if the MySQL pool
  cannot be established (`SELECT 1` + encrypted-session proof), instead
  of swapping engines.
- A mail outage must not take down sign-in: the SMTP health pre-check
  runs only before OTP sends the app controls (sign-up, resend,
  recovery). Sign-in of verified users never depends on mail.
- Auth operations that hit a misconfigured/unavailable integration
  answer a generic `503` (`/api/auth/*`) or the route's generic `503`
  (`/api/membership/*`); no stack traces or provider details reach the
  client. The server log keeps the failure visible (error code only).

## 4. Activation procedure (admin only)

1. Complete the wizard / manual setup first:
   `npm run membership:setup` (Stages A–E: preflight, env, MySQL TLS
   verify, schema with explicit approval, SMTP test email). The wizard
   does **not** enable membership itself.
2. Confirm `npm run membership:verify-mysql` passes (connection, TLS
   where required, all 14 tables) and the Stage E test email arrived.
3. Set `AENURAL_MEMBERSHIP_ENABLED=1` in Hostinger's Node application
   environment (production) — never in code, never via a URL, never via
   a deploy hook. Restart the app.
4. Smoke-test from the outside: sign-up → OTP → session → `/account`;
   verified sign-in; unverified sign-in → verification resume (see §5);
   forgot/reset → sign in with the new password; sign-out → protected
   pages deny access. Confirm the free tools still work signed out.
5. Rollback is the same mechanism in reverse: set
   `AENURAL_MEMBERSHIP_ENABLED=0` (or remove it) and restart. Existing
   sessions stop resolving (the routes 404 before session lookup);
   existing accounts and data are untouched in MySQL.

Owner-only testing instead of public enabling: set
`AENURAL_OWNER_TEST_MODE=1` (and leave `ENABLED` off). Activate the
owner account with the token procedure in
`docs/authentication/owner-activation-rotation.md`, sign in as the
owner, verify the private-owner entitlement (full caption access, no
daily cap), then rotate the token. Remember: owner mode is SQLite, so
it is for private testing only — it is not a production membership
backend.

## 5. User flows (verified state)

- **Registration → OTP → session → dashboard.** Sign-up creates an
  unverified account (`autoSignIn: false`, no session) and sends a
  6-digit code (5-min expiry, 5 attempts, hashed storage, resend
  rotates the code, 60 s server cooldown). The pending email is kept in
  the short-lived httpOnly cookie `aenural_pending_verification`
  (10 min, email only); `/verify-email` shows the masked address and
  six code boxes — the email is never re-typed, never in a URL, never
  in browser storage. A correct code verifies the email, clears the
  cookie, creates the session (`autoSignInAfterVerification`) and goes
  to `/account`.
- **Login, unverified user (Phase 4 fix).** Signing in with the correct
  password as an unverified user sends a fresh code and fails with
  `EMAIL_NOT_VERIFIED` (verified live against Better Auth 1.7.14:
  `APIError`, status `FORBIDDEN`, `body.code
  EMAIL_NOT_VERIFIED`). The server now also sets the
  pending-verification cookie on exactly that failure, and the login
  form shows a "Continue to verification" link to `/verify-email` —
  the user lands on the code step without re-typing the email. A wrong
  password answers `INVALID_EMAIL_OR_PASSWORD` and sets no cookie and
  sends no code. If Better Auth ever changes the error shape, the
  helper returns null and the flow degrades to the recovery step
  (re-type the email once).
- **Password recovery → reset → sign in.** Forgot-password sends a
  link (still link-based, unchanged); the reset page accepts a token
  (1024-char cap), requires a 12–128 char password + confirmation,
  strips the token from the URL on success, revokes other sessions
  (`revokeSessionsOnPasswordReset`), and links to sign-in. When
  membership is disabled the reset page shows "currently unavailable"
  and submits nothing.
- **Account management.** `/account` (and its sub-views) require a
  verified session server-side (`requireMember` → redirect to
  `/sign-in` when enabled but unauthenticated). The dashboard shows
  only the signed-in user's own data: plan/access, remaining free
  videos today (3/day, UTC reset), saved projects (max 50, ownership
  checked per row), activity history, orders/receipts. Ownership is
  enforced server-side in `server/membership/service.mjs` (every query
  is scoped by the verified session user id); the client never decides
  entitlement. Profile (name ≤ 80 chars), password change (current
  password required, other sessions revoked), and account deletion
  (checkbox confirmation + current password; deletes the user's app
  rows in a transaction) are all server-enforced. The development-only
  "Test account access" controls render only when `NODE_ENV ===
  'development'`.
- **Logout.** Sign-out calls `POST /api/auth/sign-out`, which
  terminates the session server-side; the client then navigates home.
  A subsequent session lookup returns null and protected pages deny
  access again (verified live: sign-out `200 {success:true}`,
  `get-session` → `null`).

## 6. Pre-activation checklist (all must pass; never claim production-ready until they do)

- [ ] `npm run membership:setup` Stages A–E pass (or the manual
      equivalents in `docs/authentication/hostinger-setup.md`).
- [ ] `npm run membership:verify-mysql` passes against the production
      database (loopback `127.0.0.1`, correct 14 tables).
- [ ] SMTP test email received from `support@aenural.com` (Stage E);
      SPF/DKIM/DMARC confirmed in hPanel.
- [ ] `AUTH_TRUSTED_IP_HEADER` confirmed with Hostinger (see
      `docs/authentication/trusted-proxy-ip.md`) — do not guess.
- [ ] Full local flow test per §4 step 4, plus the negative cases in
      `docs/authentication/otp-test-checklist.md` (wrong/expired/reused
      codes, 5 attempts, resend cooldown, duplicate sign-up,
      unverified-login restriction, refresh/missing context, logout).
- [ ] `npm run lint`, `npm run typecheck`, `npm test`,
      `npm run build`, `npm run release:check` pass on the full checkout.
- [ ] Owner-activation token rotated after activation (see the rotation
      doc); placeholder `owner@aenural.com` replaced before activation.
      **Owner-only item — skip unless owner mode is being used.** Owner
      login is PAUSED (2026-11-20); this is not a gate on the normal
      signup/login go-live.
- [ ] CI workflow installed and green — run #232 passed on `9abce77`.
      (`docs/ci-retarget-patch.md` is superseded; do not apply it.)

## 7. What is still NOT verified (Faisal only, on his PC)

Live MySQL connectivity/TLS from the production host, real SMTP
delivery to a real inbox, and end-to-end OTP against MySQL were **not**
run here (no live DB/SMTP in this environment; DB is IP-restricted to
Faisal's PC). The same applies to a live-browser pass (mobile layout,
light/dark rendering, the disabled-state banner, the resume link):
checked by code review only — the wizard's Stage I and the UI checklist
(`docs/authentication/ui-verification-stage-h.md`) cover the local
visual pass. The residual Better Auth 1.7.14 OTP-send swallow (a send
failing *after* the transport pre-check still answers 200; only the
in-memory tracker + server log know) is unchanged — see
`docs/authentication/otp-delivery-failure.md`.
