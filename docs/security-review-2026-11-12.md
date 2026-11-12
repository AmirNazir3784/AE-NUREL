# Targeted security review — 12 November 2026

The owner cancelled public signup/email-code implementation after confirming there is no sender configured. No signup, SMTP, storage or account-activation settings were changed. The existing private owner setup remains.

## Verified findings and changes

1. The shared JSON-LD component serialized data directly into a script tag. A string containing `</script>` could terminate that tag. The current inputs are controlled registry values; this is a latent injection weakness, not evidence of a current attacker-controlled entry point or compromise. Escape `<` as `\u003c`, preserving the JSON values, following [Next.js guidance](https://nextjs.org/docs/app/guides/json-ld). Blog-specific JSON-LD already did this and is preserved.
2. The public homepage response before this change lacked application `nosniff`, framing restrictions, referrer policy and HSTS; Hostinger supplied only CSP `upgrade-insecure-requests`. Add an application baseline: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, CSP `frame-ancestors 'self'; base-uri 'self'; object-src 'none'`, and a default cross-origin referrer policy. Keep stricter auth/reset referrer rules. Production adds HSTS for this host only, without preload or subdomain commitments. Disable the optional Next.js identifier header.
3. Explicitly mark account and authentication pages private/no-store, preserving existing API no-store and public media caching.

The CSP is intentionally limited to these directives. It is not a comprehensive nonce-based script policy; it avoids breaking the existing inference workers, WASM, media/export URLs and model loading. HTTP header protections are supported by [OWASP guidance](https://owasp.org/projects/secure-headers-project).

## Checks and limitations

`npm audit --omit=dev --json` and `npm audit --json` both reported zero known advisories across the installed dependency graph. Registry queried on the research date; a clean advisory scan is not proof that all dependencies are vulnerability-free. No speculative major upgrades were made.

Reviewed password/session settings, owner activation, account/project ownership checks, origin/body-size restrictions, signed guest identities, payment signatures/ownership checks and production guards on development services. Existing automated membership tests exercise verification requirements, CSRF, ownership, rate limits, password reset/session revocation and signed payment events. No email or payment provider was contacted, credentials printed, user data changed, or production signup opened.

This is a targeted source/configuration and automated-test review, not a penetration test or guarantee against hacking. Hostinger control-panel settings, filesystem permissions, trusted proxy-header behavior, backup operations and secret rotation were not audited. Actual public response headers must be checked after the Git-connected deployment because the hosting proxy can affect them.

The authorized repository release also includes the reviewed lower-homepage refinements and free Auto Caption Generator features. Preserve preview guards and exclude unrelated unfinished tool work and all private artifacts. Exact free-feature rollback records remain in the ignored checkpoint documented in `docs/auto-caption-free-features.md`.

Pre-release verification: scoped ESLint and 54 relevant tests passed. The isolated release build passed compilation, TypeScript and generation of 98 pages. Nine production-mode HTTP checks passed, including the public homepage/tool/blog pages, reset-page privacy headers, production exclusion of development APIs, and a 404 for the private credential-file path. JSON-LD tests confirm a crafted closing-script string stays data and does not create an executable element. No real private credentials were read or submitted. Browser visual testing remained unavailable because of the existing bridge error; media exports and inference algorithms were not changed or repeated.
