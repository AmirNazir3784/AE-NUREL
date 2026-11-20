# AENural account architecture

**28 October 2026 update:** The owner authorized account/database integration code, saved projects, allowances, watermarks and purchase unlocking. Application implementation and local acceptance are now complete; actual Hostinger/SMTP/merchant setup is still pending. The older blocked/design-only instructions below are historical and superseded. See [current handoff](./hostinger-membership-launch.md).

Revised 12 October 2026; implementation completed 28 October 2026 (see the update note above). **Phase 3 authentication is implemented** in `server/membership/` (Better Auth + MySQL/SQLite) — the "blocked" status below is historical. Hostinger-managed MySQL + Better Auth supersedes the earlier Supabase/PostgreSQL decision at the user's request. On 13 October the user separately authorized a development-only frontend preview: the modal/validation are implemented without auth dependencies, database, migration, credentials or deployment. Public tools and local-media processing stay independent of accounts. Hostinger/SMTP/merchant setup and live staging verification are still pending; see [current handoff](./hostinger-membership-launch.md).

## Decision and inspected baseline

Prefer the user's existing **Hostinger-managed MySQL**, with **Better Auth** running server-side inside this Next.js application. Better Auth documents direct MySQL support through `mysql2/promise` and a Next.js App Router integration. No ORM is needed for this small scope. This is documented compatibility, not a successful connection to the user's actual hosting account. Do not silently substitute Supabase if hosting prerequisites fail.

Inspected: Next.js 16.3.8 / React 19.2.8, Node 24.21.0, App Router, package/lockfile, empty Next configuration, current homepage, header, shared design styles and account sections in `references/AENural-design-reference.html`. There is no existing auth library, MySQL driver, account route, database config or mail transport. No `.env*` files or matching database/Better Auth/SMTP settings exist in this workspace/process. `SITE_URL` already supplies the optional canonical origin. No Hostinger management connector or account-specific plan/database evidence is available here.

Better Auth is pinned at 1.7.14 (`package.json`), with `mysql2` 3.24.6 and `nodemailer` 10.2.1; retain the lockfile. Do not use custom hashing, password tables, token cryptography or fake sessions.

## Required customer experience

The reference's account design is a **page/card**, not an accessible modal: `.auth` is 420px wide with a 20px radius, tab strip, Sora headings/labels, Inter fields, 11px input/button corners and orange primary action. Its demo uses anchor buttons and direct DOM tab toggling; do not copy those behaviors. The actual header has search, Explore tools and a mobile menu; there is no Sign in control or account component yet.

The development-only preview may be tested with sample details now; enable the real customer experience only once auth prerequisites are verified:

- Add one clean **Sign in** button at the top right, alongside the existing search/tools navigation. Keep it reachable on narrow screens rather than inheriting the reference's mobile-hidden login rule. Do not redesign the header, homepage or Source Window.
- As built, sign-in is page-based (`/sign-in`, `/sign-up`) using the shared accessible forms, not a header modal; the header links to `/sign-in` (or `/account` when signed in). The development-only preview modal is a separate demo and is not the real flow.
- Implement semantic tablist/tab/tabpanel relationships, selected state, roving focus and arrow/Home/End navigation. Closing clears passwords; switching tabs does not submit. Preserve deliberate input except passwords where needed. Explain that closing a dialog does not cancel an already submitted server request.
- Sign in: email/password plus Forgot password. Sign up: compact Name field as in the reference (Better Auth requires a name), email/password and concise password guidance. No extra profile information. Client hints plus server/library validation; do not trim or rewrite passwords. Proposed password limits: 12-128 characters, enforced through supported library options and tested with Unicode/password managers.
- Plain messages: “Check your email”, “Email or password is incorrect”, “Try again in a moment”. Inline field errors with `aria-describedby`, `aria-invalid`, status announcements and pending duplicate-submit protection. No oversized warning panels or model/DB diagnostics.
- Use current AENural semantic tokens (`--surface`, `--surface-soft`, `--foreground`, `--muted`, `--border-strong`, `--action`, `--accent`), existing fonts/focus styling and automatic system theme. Reference proportions adapt to viewport width, safe areas and on-screen keyboard with internal scrolling; 44px targets and visible close control. Do not hardcode the reference's old colors or inline handlers.
- Successful verified sign-in replaces the trigger with an **Account** disclosure/menu linking to `/account` and offering a POST logout. Keyboard/Escape/outside-close behavior follows existing navigation patterns. Client session state is display only; it never authorizes operations. During session loading show a neutral stable state; network failure must not pretend a user is logged in or clear a valid account silently.
- Public tools remain usable without opening a dialog or contacting the database to process a file. An auth outage should affect account actions only.

## Routes and real flows

| Route / operation | Contract |
| --- | --- |
| Header Sign in | Opens the modal with Sign in selected; tabs use the same real auth client. |
| `/sign-in` | Direct-link/email-flow entry using the shared accessible forms; no redirect loop if the header opens the modal. Fixed return destination `/account`, not arbitrary external `next`. |
| `/api/auth/[...all]` | Better Auth's `toNextJsHandler` GET/POST adapter, explicitly Node runtime; no handcrafted credential endpoint. |
| Signup | `signUp.email`; email/password enabled, require verification and disable automatic signup sign-in. Generic check-email response for duplicate/existing-account cases; test actual pinned-library behavior and public response/timing before acceptance. |
| `/verify-email` (as built; no `/check-email` route exists) | Six-digit code entry page; the pending email is retained server-side (httpOnly cookie) and shown masked. Never asks for the email in the normal flow. Resend is rate limited (60s server cooldown). |
| Verification code (Email OTP) | Better Auth `emailOTP` plugin (`overrideDefaultEmailVerification: true`); 6-digit code, 5-minute expiry, 5 attempts, hashed storage in the existing `verification` table, previous code invalidated on resend. No custom token generation. Links issued before this change still verify until their 1-hour expiry (transition window). |
| `/account` (as built; no `/email-verified` route exists) | Post-verification destination. A session is created only when the OTP is verified (`autoSignInAfterVerification: true`); sign-in afterwards still requires the verified session. No automatic verified session assumption. |
| `/forgot-password` | Full-page email form calling `requestPasswordReset`; generic response whether account exists or not. Modal's Forgot password link opens this real page. |
| `/reset-password` | Email link goes through the library handler to this page. Validate token via `resetPassword`; handle malformed, expired and reused tokens. No existing login required to reset using a valid recovery token. Enable `revokeSessionsOnPasswordReset`, then offer sign-in. |
| `/account` | Server-verified, nonexpired session and verified email required before returning minimal profile. Updates derive identity from the session, never a client-supplied user ID. |
| Logout | `signOut` POST; revoke the stored session and clear library cookies; update header state. No GET logout mutation. |

Only allow configured same-origin callbacks. Recovery/verification pages must work in a fresh browser, outside the modal and without the original tab. Use no-store and appropriate referrer protection; exclude tokens from analytics/logs and third-party assets on recovery pages. Show errors without exposing tokens or email account existence. Confirmation, expired-link handling, resend and reset must be tested using delivered messages, not handcrafted success URLs.

## Server sessions and access control

- As built: server-only `server/membership/auth.mjs` owns Better Auth, the MySQL pool and email callbacks; the client uses raw `fetch` in `src/features/membership/member-client.ts` (`authRequest` to `/api/auth/*`) and session state from `GET /api/membership/access` — there is no `src/lib/auth.ts` and no `better-auth/react` client. Database/mail credentials and auth secret must never enter client imports or `NEXT_PUBLIC_` variables.
- Follow documented Next.js APIs: asynchronous `headers()` for `auth.api.getSession`. A supported `nextCookies()` plugin belongs last if Server Actions are used for cookie-setting auth calls. Route-handler client calls already return cookies through the library adapter.
- Keep auth cookies library-managed: HttpOnly, Secure in HTTPS production and appropriate SameSite; no custom localStorage JWTs. Use fixed `BETTER_AUTH_URL` and exact trusted origins, not arbitrary incoming Host/forwarded headers. Preserve library origin/CSRF checks.
- Proposed initial policy: database-backed 7-day session, refreshed at most daily (rolling lifetime), explicit sign-out and password-reset revocation. This is a rolling expiry, not a 7-day absolute maximum. No paid service is required to configure library session lifetime. Disable cookie session caching initially so protected operations consult stored session state and revocation is not masked by a cache.
- Every protected page, handler and Server Action checks the authoritative server session, expiration and verified-email status. Cookie presence or client `useSession` is insufficient. No need for a global proxy/database query on all pages; if an optimistic `/account` proxy is added, it cannot replace these checks. Root layout remains independent of request-time account data.
- No shared CDN/ISR cache for auth, account or Set-Cookie responses. Restrict auth requests and inputs; use Better Auth's database-backed rate-limit storage for shared counters (include its generated table). Verify trusted client-IP handling behind Hostinger; never trust arbitrary spoofable forwarding headers. No Redis or broad security exemptions needed by default.
- MySQL is server-only and has **no Supabase-style per-user RLS** here. Ownership is enforced by server data-access functions using the verified session ID and parameterized queries, plus least-privilege database credentials. Test two users and anonymous requests at every exposed account operation. Do not authorize using editable names or metadata.

## Minimal database and migration boundary

Use the library-generated MySQL schema for `user`, `session`, `account` and `verification`, plus the database rate-limit table required by the selected configuration. Name mappings may be applied consistently to avoid collisions in a dedicated database. Do not handwrite a competing auth schema.

Stored data: user identifier, name (bounded to 80 characters), unique email/verification flag and library timestamps; credential password hash in the library account record; expiring session and verification data; bounded anti-abuse counters. No password plaintext, audio, transcripts, captions, payment details or saved projects. Leave profile image unset and do not add a separate profile table. Review library-default IP/user-agent fields and expired-record cleanup/retention before launch; do not promise zero metadata collection.

Use a dedicated AENural database with `utf8mb4`, supported MySQL engine/version, indexed/unique keys and UTC handling. Better Auth's MySQL documentation uses `mysql2/promise`, `timezone: "Z"`; retain default matched-row semantics (`FOUND_ROWS`) and a bounded pool compatible with the plan's connection limit. Confirm server version, timezone, charset, permissions and connection limits with actual read-only checks before proposing DDL.

Runtime DB user gets only needed SELECT/INSERT/UPDATE/DELETE on AENural auth tables. Separate schema privileges from routine runtime access if hPanel permits; if Hostinger cannot supply restricted grants, record that limitation before approval. No database exposure to the browser. Backups and recovery responsibilities must be established before live migration.

**No live creation, schema generation against a live target, migration or alteration without explicit authorization for the named database and reviewed changes.** Once configured, use the pinned library CLI's help/generate workflow to prepare a reviewable schema, test it on an explicitly authorized disposable development database, and request approval before applying to live. Do not run automatic startup migrations or `auth@latest migrate` as an experiment. The app never auto-migrates MySQL on boot; import `server/membership/migrations/001-initial-mysql.sql` manually, then prove readiness with `npm run membership:verify-mysql` (checks connection, TLS where required, and that all 13 tables exist).

## Hostinger compatibility and required settings

Hostinger officially documents Next.js Node apps on Business/Cloud plans, and Node 24 support. MySQL availability alone does not prove this hosting subscription can run SSR. Confirm the user's exact plan and that **Node.js Web Apps** is present. Static export/PHP-only hosting cannot run this architecture; do not buy upgrades or deploy automatically.

Hostinger documents MySQL connection environment settings and a usually-local host for its Node apps. Use hPanel's actual host/port, not an assumed `localhost`. For local Windows development, `localhost` means this computer: remote Hostinger access requires a real hostname and a specifically authorized IP allowlist. Do not select “Any Host” or change remote access without authorization. Confirm TLS/certificate support for remote DB access; do not bypass certificate validation. If secure remote access is unavailable, use an explicitly authorized isolated local MySQL development database and later verify the actual Hostinger runtime separately; this does not complete live-host acceptance.

Required application environment variable **names only** (architecture choices, not credentials already supplied):

| Names | Purpose |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | MySQL server-side connection, using Hostinger's documented naming. |
| `DB_SSL_CA_FILE`, `DB_TLS_ALLOW_PUBLIC_CA` | Remote MySQL TLS (see `server/membership/mysql-tls.mjs`). `DB_SSL_CA_FILE` is a path to a PEM CA bundle on disk (never PEM contents in env). `DB_TLS_ALLOW_PUBLIC_CA=1` opts in to Node's public-CA trust store, still with `rejectUnauthorized: true`. A non-loopback `DB_HOST` requires one of the two; otherwise the app refuses to start. Production on Hostinger uses `DB_HOST=127.0.0.1` loopback with no TLS. There is no flag that disables verification. |
| `BETTER_AUTH_SECRET` | Locally generated high-entropy secret meeting pinned-library requirements; never print or commit. |
| `BETTER_AUTH_URL` | Fixed absolute local/production auth origin. |
| `SITE_URL` | Existing canonical origin; must agree with production auth origin. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Server-side SMTP transport settings as implemented (`server/membership/auth.mjs`). Port 465 = implicit TLS (`SMTP_SECURE=true`); 587 = STARTTLS (`SMTP_SECURE=false`). Nodemailer TLS is verified (`tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2', servername: SMTP_HOST }`). |

Keep local values in ignored `.env.local` and production secrets in Hostinger's environment settings. No Supabase variables or public database/auth-secret variables are required. Client calls use same-origin `/api/auth`; no public secret configuration.

Prefer the existing Hostinger mailbox if available and suitable for transactional verification/recovery mail. Hostinger documents authenticated SMTP with TLS; actual account provider, sender ownership, sending limits, SPF/DKIM/DMARC, outbound connectivity and delivery to two owned inboxes remain unverified. Better Auth requires real email callbacks; it does not send messages by itself. Use a supported SMTP transport, bounded retries and observable safe operational errors; never log links or claim a console-printed email is delivery. Verify delivery completion on the actual Node lifecycle rather than using unobserved fire-and-forget sends. No paid email service has been selected or authorized.

Hosting, mailbox and database quotas may already be included; the user's actual limits and backups must be checked. Better Auth is self-hosted software, not a paid auth API. No resource purchase or migration away from Hostinger is planned.

## Phase 3 prerequisites and acceptance

Before implementation: confirm Hostinger plan/Node runtime; designate the AENural development DB and secure connection; provide ignored server settings; authorize the specific test DB/schema changes; confirm SMTP sender and two test inboxes; establish canonical domain/HTTPS and trusted origins. No real database connection was attempted because these details and permissions are absent.

Then verify:

1. Real registration, delivered verification, verified/unverified sign-in, duplicate signup, invalid credentials, helpful validation, resend throttling and no enumeration through responses/timing.
2. Real password recovery in a fresh browser; invalid/expired/replayed tokens; reset revokes previous sessions; successful logout, reload persistence, session expiry/renewal and revocation denial.
3. Anonymous protected-route denial, A/B profile isolation, forged IDs/metadata, server validation, SQL parameterization, runtime grants and no private fields in client responses/bundles.
4. Header/modal and Account menu: keyboard/tab arrows, Escape/close/focus restoration, screen reader labels/errors, password managers, mobile keyboard/scrolling, desktop/mobile and both system themes. Verify authentication succeeds through the modal and email-link pages, not merely visual rendering.
5. Provider CSRF/origin protection, safe callbacks, shared rate limits/restart behavior, secure cookie attributes, no token logs and no shared auth response cache. Hostinger DB/SMTP outages fail account actions clearly without breaking public file processing.
6. All 16 free public tools remain anonymous; preview tools remain development-only and absent from production search/sitemap. No media/transcript is sent to auth/database/email endpoints.

Phase 3 implementation is done; it cannot be called passed until real backend/email evidence exists (staging verification against MySQL/SMTP). Phase 4 hardening and Phase 5 final integration QA remain not started. Existing production AI release hold is unchanged.

## Official sources checked

Design evidence: `references/AENural-design-reference.html` account styles/markup and `src/components/site/header.tsx`, homepage/styles. Installed Next.js authentication and route-handler guides were read. Official documentation below supports the architecture; it does not prove compatibility with the user's uninspected plan or successful account flows.

- [Hostinger MySQL for Node.js](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/), [Node plans/runtime support](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) and [remote MySQL](https://www.hostinger.com/support/1583546-how-to-set-up-remote-mysql-access-in-hostinger/)
- [Hostinger SMTP settings](https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email/)
- [Better Auth MySQL](https://better-auth.com/docs/adapters/mysql), [Next.js integration](https://better-auth.com/docs/integrations/next) and [generated database schema](https://better-auth.com/docs/concepts/database)
- [Better Auth email/password flows](https://better-auth.com/docs/authentication/email-password), [email delivery](https://better-auth.com/docs/concepts/email), [sessions](https://better-auth.com/docs/concepts/session-management), [rate limits](https://better-auth.com/docs/concepts/rate-limit) and [security](https://better-auth.com/docs/reference/security)
