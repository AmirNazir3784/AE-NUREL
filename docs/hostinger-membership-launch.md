# Account and caption launch handoff — 28 October 2026

The owner authorized real application implementation, while retaining responsibility for creating the Hostinger database and external accounts. This replaces the previous design-only restriction. No hosted database, merchant account, live payment, push or deployment was performed.

**Later owner-authorized live testing:** both GitHub `main` branches were updated. Public caption, pricing and account pages are now visible by default in production, independently of backend configuration. The homepage/AI directory/mobile navigation offer a working caption link instead of a Coming soon card. Caption processing/styles/exports work locally without sign-in, with all styles available and no enforced account quota or watermark. The normal tool interface has no testing/development banner. Pricing reflects the current open caption access; unavailable sign-in, cloud saving and purchasing remain honestly unavailable, without fabricating accounts or payments. Preview pages remain noindex; the temporary caption preview is not added to the released-tool registry or sitemap. Set `NEXT_PUBLIC_AENURAL_SITE_PREVIEW=0` during both build and runtime to restore the previous route hold. Enabling real membership restores server-authorized plan controls; no test purchase grants or private hybrid APIs are opened by this preview switch.

Public-visibility checkpoint: 43 focused tests passed; edited files passed ESLint; the final production build and TypeScript passed. With membership disabled and no QA override, all 16 checked public/account/checkout pages returned 200. The AI directory has an Open tool link and no Coming soon card. Chrome accepted a real video, enabled Generate captions and both quality options, and made zero membership API requests. Auth/payment/private hybrid APIs remain gated; checkout POST returned 404. No new transcription model or inference engine changes were made.

## Responsibility split

| Work | Application work completed here | Owner setup |
|---|---|---|
| Accounts | Better Auth signup/sign-in, verification, recovery, profile/password changes, logout and account deletion | Sender mailbox, SMTP and domain email authentication |
| Database | MySQL pool, generated SQL, ownership checks, transactions and request limits | Dedicated Hostinger MySQL database/user, schema import, credentials and backups |
| Projects | Save/open/delete, history, conflict detection and original-file matching | Storage/retention decisions and backups |
| Caption access | Daily Free allowance, feature locks, watermarks and paid entitlements | Approve final product/license/refund terms |
| Payments | Lemon Squeezy checkout, signed webhooks, idempotency, order verification, refunds and receipts | Merchant approval, $20 product, Source Window files/license delivery and provider settings |
| Release | Local acceptance, production build and configuration checker | Actual-service staging checks, business information and deployment approval |

Once those services exist, I can help connect and verify them. Local tests do not replace actual Hostinger, SMTP and merchant acceptance.

## Implemented behavior

Free requires a verified account for three new caption-video starts per UTC day: up to 60 seconds, five starter presets, basic fonts/size/colours/placement, Fast recognition and an AENural watermark on preview/video exports. SRT/VTT retain valid text/timing. Retrying the same uploaded video in the open editor reuses its slot; a new upload/reload creates a new slot. Cancellation does not refund a slot based on a browser claim. Editing and repeated downloads do not consume new generation slots.

The $20 one-time Source Window package unlocks all 30 presets, advanced typography/animations, Accurate recognition, measured-word highlighting and watermark-free video export. Current safety limits remain 120 seconds, 200 MiB and 1080p. There is no fixed paid daily count, unlimited-duration promise or lifetime-update promise.

A signed webhook must match a server-issued checkout and the configured store/variant/$20 USD product. The provider's current order is fetched before granting access. Duplicate/stale events are safe; full refunds/fraud revoke that order. Success URLs do not grant access. After checkout, the account page polls authoritative access; an open editor refreshes access on focus.

Projects contain captions, timing, style, measured alignment and bounded source metadata/fingerprint, never the original video or object URL. They support up to 50 projects of 512 KiB each. Reopening requires the matching original video. Conflicting saves are rejected. Other released subtitle utilities keep their no-account workflow. Whisper still runs in the browser; this backend does not upload recordings or perform inference.

Server records authorize account access and daily grants. Local preview/export is not unbreakable DRM against someone modifying their own browser code. Strict tamper-proof rendering would need a different server-rendering architecture, which was not introduced.

## Owner setup, in order

1. Confirm a **Hostinger Node.js application**, not a static `out/` upload, with Node 22/24; local acceptance uses Node 24. Confirm actual plan support. No GPU/VPS inference service is required.
2. Create a fresh dedicated MySQL database/user in hPanel. Import [the generated SQL](../server/membership/migrations/001-initial-mysql.sql); review it before importing, and do not apply blindly to a populated auth database. Configure full prefixed names, `DB_HOST=127.0.0.1`, port 3306, credentials and backups. [Hostinger's instructions](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/).
3. Configure a real sender, SMTP and SPF/DKIM/DMARC. Port 465 uses `SMTP_SECURE=true`; port 587 uses `false` with required TLS. Test verification/recovery delivery in staging. Development writes a private local outbox instead of sending email.
4. Open and obtain approval for the merchant account. Lemon Squeezy lists Pakistan for bank payouts, subject to approval. Create a **$20 USD one-time** variant, quantity one, no subscription/discounts. Upload the approved Source Window files and configure license/receipt delivery. Finalize product, update and refund terms before sales. [Supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries).
5. Configure `/api/payments/webhook` on the actual staging/live HTTPS origin for `order_created` and `order_refunded`, with a strong signing secret. Use a separate staging database/provider test mode to verify paid, canceled, delayed, duplicate and refunded orders. [Provider webhook guide](https://docs.lemonsqueezy.com/guides/developer-guide/webhooks).
6. Enter server settings using [membership.env.example](../config/membership.env.example). Never put credentials in Git, chat or `NEXT_PUBLIC_*`. Generate your own strong auth secret. `SITE_URL` and `BETTER_AUTH_URL` must match the canonical HTTPS origin. Ask Hostinger which proxy header it overwrites with the real client IP; set `AUTH_TRUSTED_IP_HEADER` and verify it cannot be spoofed by a visitor.
7. Supply the operator identity/privacy contact, actual retention/logging facts and final sale/license/refund terms. The existing Privacy page explicitly identifies these missing business facts. Do not enable sales while Source Window delivery/listing is unfinished.
8. After staging passes, set `AENURAL_MEMBERSHIP_ENABLED=1` and `NEXT_PUBLIC_AENURAL_AUTO_CAPTION_RELEASE=1` for the approved release, **during both build and runtime**. Keep QA/hybrid switches off. Enable `AENURAL_SALES_ENABLED=1` separately only after the paid product and real checkout pass acceptance. Live sales must not use `LEMONSQUEEZY_TEST_MODE=1`.

Run `npm run release:check` with the target environment. It checks configuration names without printing secrets or contacting services; a pass does not prove external services work. Run the checks/build and supported `npm start` command. Promote only reviewed changes to the separate production repository after owner approval; preserve unrelated changes and do not force-push.

## Local behavior and performance

`npm run dev` enables local-only accounts with Node SQLite and a private email outbox in `.aenural-local/`, excluded from Git and deployment tracing. Verified local accounts have Development account controls for Free/package testing. That endpoint is unavailable in production and cannot grant access against a production MySQL configuration. `AENURAL_MEMBERSHIP_DISABLED=1` restores frontend-only preview behavior.

The caption editor loads after video selection. Anonymous account status avoids initializing auth/database/mail. Responsive compressed images have hashed cacheable filenames. Windows development disables the observed slow persistent-cache compactions, retaining in-memory cache; `AENURAL_DEV_DISK_CACHE=1` opts back in on a faster disk. This trades cross-restart cache reuse for less disk activity and does not fix a physical drive. Production uses an optimized build. Dark Reader was left alone as requested.

## Acceptance and remaining external verification

Chrome covered signup, private-outbox verification, sign-in, Free five versus paid 30 styles, quality locks, project save/reopen and development package switching. Actual Free/paid MP4 downloads were opened and played: watermark present only on Free. Both are 1920×1080 AVC, 4.1 seconds and preserve all 189 original AAC packets with identical hashes. The pinned transcription engine was preserved rather than repeatedly downloading models.

Server tests cover sessions/verification, reset/revocation, CSRF, atomic daily/request limits, retries/reset, project ownership/conflicts, Free style sanitization, signed-order replay/refund behavior and production exclusion of development grants. Payment tests use controlled signed fixtures, **not a real merchant sandbox**. Schema generation is verified offline. Actual Hostinger MySQL connectivity, SMTP delivery, provider checkout/webhooks and product/license delivery require owner setup and subsequent staging verification.

Final local checkpoint: **900 tests passed**, ESLint exited successfully with four existing unused-variable warnings, TypeScript passed and the fresh production build passed. All 16 released tool routes returned HTTP 200. Default production kept caption/account/payment release restrictions in place. The explicit loopback QA preview returned the caption page in 145 ms and reached DOM-ready in approximately 402 ms on this machine; these are local measurements, not a live-hosting guarantee. Desktop 1440×900, tablet 768×1024 and mobile 390×844/320×640 checks in system light/dark had no horizontal overflow. Initial landing requests did not fetch AI models, the full editor or advanced editor fonts. Deployment file traces contained neither private local account data nor QA artifacts.

Checkpoint remains on local branch `design/tools-rollout`, preserving existing working changes. No commit, remote change, push or deployment was made. Temporary production QA servers were stopped after verification; the owner's development server was preserved.
