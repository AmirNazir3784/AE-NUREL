# Pricing and account foundations — 26 October 2026

**Historical design checkpoint.** The owner authorized real application implementation on 28 October. Use [the current launch handoff](./hostinger-membership-launch.md) for implemented behavior and the remaining external setup; preview-only descriptions below record the earlier state.

## Current owner decision

Exactly two choices: Free, and **Source Window + Captions for $20 as a one-time package**. A Source Window purchase includes premium Auto Caption Generator features. There is no separate Caption Pro subscription. This supersedes the three illustrative products and prices in the supplied HTML concept and earlier notes. Final license duration, update rights, technical video limits and refund terms still need publication before sale; no lifetime/unlimited promise is made.

The proposed Free caption allowance remains three videos per day, up to 60 seconds, five starter styles, Fast recognition and a watermark. Those access rules are not enforced by this frontend preview. The existing editor retains its working access behavior until real account authorization is implemented.

## Local pages implemented

- `/pricing`: two cards, Free/package comparison, FAQs and package links.
- `/checkout?product=source-window`: $20 package review and a visibly unavailable checkout action. No order or payment is created. Unknown or obsolete product IDs return 404.
- `/sign-in`, `/sign-up`, `/forgot-password`, `/verify-email`: account-flow previews. Sample values only; no authentication, email delivery, cookies or persistence. Preview form controls cannot serialize credentials through native submission.
- `/account`, `/account/projects`, `/account/history`, `/account/subscription`, `/account/billing`, `/account/settings`: coherent account workspace, empty states and links. The existing `/account/subscription` path now displays **Plan & access** for the one-time package, not recurring renewal claims.

Pricing links appear in the header, mobile menu, homepage, footer and caption-page pricing section. The existing header sign-in dialog also links to the full sign-in page and account workspace.

These routes are development previews with `noindex,nofollow`. `accountPreviewAvailable()` keeps them closed in ordinary production; `AENURAL_ACCOUNT_QA=1` allows a deliberately configured local production review. Do not enable that switch on the public server. They are absent from the sitemap. This gate is a release hold, **not user authentication**. Auto Caption Generator's separate release controls remain intact.

## Storage boundary

`src/features/membership/account-contracts.ts` defines future records: account plan/access, invoices, dated tool actions and versioned caption projects. Projects contain caption text/timing, style, measured word alignment and source-file metadata; **no original video, base64 video, object URL or payment-card details**. There is currently no database or cloud saving.

When project storage is connected, reopening a project must ask the creator to reattach the original video. Verify the file against recorded duration/dimensions and an appropriate fingerprint before restoring preview and exports. Never claim a cloud project can reopen its original footage automatically.

## Later integration order

1. Choose an authentication service compatible with the final Hostinger Node setup and the owner's region. Use its supported server integration for verified email, recovery and sessions. Enforce authorization on the server, including project ownership on every read/write/download/delete. Use secure, HttpOnly session cookies, CSRF protection where needed and login/recovery rate limits. Replace the preview forms only when these flows work.
2. Connect a private database for small project records, purchase/access state and history. Validate record sizes and schema versions. Derive owner IDs from verified sessions, never browser-supplied ownership. Publish retention/deletion policy and provide project deletion/export. Confirm backups and limits against the actual Hostinger setup.
3. Select a hosted-checkout payment provider after verifying merchant-country eligibility, supported currencies, taxes, refund support and Hostinger compatibility. The server must create the checkout session from an approved product/price ID; never trust `$20` or premium access sent by the browser.
4. Grant both Source Window and premium caption access from verified, idempotently processed payment webhooks. A success-page visit does not prove payment. Handle delayed payment, duplicate events, refunds and disputes without granting duplicate or permanent unauthorized access. Protect license downloads and receipts with ownership checks.
5. Apply Free quotas and paid entitlements server-side before opening sales. Client-only counters, hidden buttons and localStorage are not account enforcement. Reconcile browser-local inference with the approved quota policy; do not pretend browser code alone prevents abuse.
6. Verify payment success/failure/cancel/refund, email delivery, account recovery, ownership isolation, project reattachment, license delivery and export access in a separate staging environment. Publish terms, privacy/refund details and actual compatibility, then obtain the owner's release approval.

Hosted checkout can keep payment entry with the payment provider. Stripe's [Checkout Sessions documentation](https://docs.stripe.com/api/checkout/sessions) is an example of that architecture, **not a provider selection or eligibility confirmation**. Session and authentication decisions should follow the [OWASP Authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) and [Session Management guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## Scope and deployment

Verification for this checkpoint: 37 focused tests passed, the changed TypeScript/TSX files passed ESLint, TypeScript passed, and a fresh production build completed. Isolated Chrome review covered 1440×900, 768×1024, 390×844 and 320×640 in system light/dark. The final two-card pricing and purchase pages had no page overflow or old price/subscription copy in all eight layout/theme combinations. Account and access previews were also reviewed. Sample signup validation focused errors correctly, cleared submitted sample fields and made no network submission. No AI/model requests occurred while opening these pages.

Local production checks confirmed pricing/account/checkout/sign-in and the held caption route remain 404 by default; homepage and the existing subtitle editor return 200, with preview links absent. The sitemap contains no new membership pages. A separate loopback-only production QA instance rendered the two-card pricing, purchase, plan/access, signup and caption routes with `noindex,nofollow` and no observed runtime exceptions. A final table-spacing CSS adjustment followed that build and was reviewed in development Chrome. This is page/design verification; transcription and rendered-video exports were intentionally not repeated during this assignment.

No new service dependencies, real auth, database, payment collection, model-hosting change or server inference were added. Original videos remain local in the current tool. No remote, branch or release switch was changed; no commit, push or deployment was performed. The actual local branch is `design/tools-rollout`; preserve its existing unrelated changes when reviewing this checkpoint.

Before later promotion, review the local diff, configure staging integrations and real authentication, replace the preview gates intentionally, run relevant checks and a fresh production build, and test the production server. Promote only the reviewed release to the separate production repository after the owner authorizes it. Do not enable other unfinished AI tools or development hybrid APIs as part of membership activation.
