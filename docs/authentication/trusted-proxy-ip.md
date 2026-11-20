# Trusted proxy IP header (`AUTH_TRUSTED_IP_HEADER`) — research note (Phase 3, 2026-11-18)

> **Repo path (once committed):** `docs/authentication/trusted-proxy-ip.md`
> **Status: UNCONFIRMED — do not treat the recommendation as verified until §4 is done and §9 is fully ticked.** Step 5 security review (2026-11-19, finding S5-01, High): the header VALUE is still unconfirmed with Hostinger. `x-real-ip` remains a researched recommendation only. Membership must not be enabled in production until §9 is complete (gate G4 stays PENDING; see `docs/authentication/production-handover.md` §A.3).

## 0. Recommendation

**Set `AUTH_TRUSTED_IP_HEADER=x-real-ip`.** This is a researched recommendation, not a guess — but it is only valid while the two conditions in §4 hold. If either fails, stop and ask Hostinger support (exact question in §5); do not substitute another header.

## 1. What the code does with this value

`server/membership/auth.mjs` (branch `feature/hostinger-authentication`, HEAD `9abce77`, updated 2026-11-20):

```js
advanced: { useSecureCookies: !config.local, ipAddress: { ipAddressHeaders: [config.local ? 'x-forwarded-for' : config.env.AUTH_TRUSTED_IP_HEADER] } }
```

So in non-local mode Better Auth reads **one** header — the value of `AUTH_TRUSTED_IP_HEADER`. There is **no fallback**: Step 5 (S5-07) removed the `|| 'x-real-ip'` fallback, and Step 5 (S5-06) requires the variable to be non-blank **whenever the app is not in local mode** — not only in MySQL mode. Only `x-real-ip` is accepted (allowlist in `server/membership/config.mjs`); `release:check` likewise accepts only `x-real-ip`.

Better Auth semantics (official docs, checked 2026-11-18):

- `ipAddressHeaders`: "Header names to read the client IP address from. The first header with a valid address is used. … List only headers that your proxy or server code sets on every request. It must replace any value the client sent. If your proxies append to the header instead, list them in `trustedProxies`." (https://better-auth.com/docs/reference/options)
- Rate-limit doc: "By default, it reads the address from the `X-Forwarded-For` header. Clients can send this header themselves… | A proxy puts the client address in its own header | `ipAddressHeaders` with only that header | … | Clients connect directly | `ipAddressHeaders: []`… List only the header that your proxy sets. Your proxy must replace any value that the client sent." And: "Some requests have no valid address. For example, `X-Forwarded-For` can contain several addresses while `trustedProxies` is not set. These requests share one counter for each path, and Better Auth logs a warning the first time this happens." (https://better-auth.com/docs/concepts/rate-limit)

This code sets **no** `trustedProxies`. Consequences:

- `x-forwarded-for` is **not safe here**: it is a comma-separated list that each proxy appends to. Without `trustedProxies`, Better Auth cannot pick the entry its own proxy added, so multi-entry values collapse into one shared rate-limit counter (and log a warning) — and the leftmost entry, which a client can forge outright, must never be trusted on its own.
- `cf-connecting-ip` is **wrong for Hostinger**: Hostinger CDN removes it (see §2). A client can send any value for it, and nothing in front of the app overwrites it.
- `x-real-ip` is a **single value** that Hostinger CDN overwrites with the visitor's address. That is exactly the shape Better Auth wants: one header, set by the proxy on every request, replacing anything the client sent.

## 2. What Hostinger actually says

Hostinger support doc **"Hostinger CDN: Visitor IP addresses in logs and analytics"** (published 2026-09-23, updated 2026-10-29 — read in full 2026-11-18):

- "The real visitor IP address is passed to your website in the `X-Forwarded-For` and `X-Real-IP` request headers."
- "Custom code should read `HTTP_X_REAL_IP`, or the last entry of `HTTP_X_FORWARDED_FOR` — both hold the address that connected to Hostinger CDN. The first entry of `X-Forwarded-For` is the visitor only when no other proxy sits in front of the CDN and the client sent no such header itself; any client can send one, so never trust it on its own."
- "**Do not rely on the `CF-Connecting-IP` header. Hostinger CDN removes it from incoming requests because any client could send it.**"
- "Node.js websites behind Hostinger CDN": "Node.js apps on Hostinger read the visitor IP address and protocol from the request headers themselves. Read `X-Real-IP` for the visitor IP address, or only the last entry of `X-Forwarded-For`. Read `X-Forwarded-Proto` to check whether the visitor used HTTPS." (Express example: `app.set('trust proxy', 1)`.)
- Caveat, same doc: "This setting is reliable only for requests that pass through Hostinger CDN. Requests sent directly to the hosting server's IP address skip the CDN and can carry any header value."
- "Another proxy in front of Hostinger CDN": if Cloudflare or similar proxies before Hostinger CDN, "`X-Real-IP` and the last entry of `X-Forwarded-For` contain the Cloudflare address… The visitor's address is the earlier `X-Forwarded-For` entry that Cloudflare added, which is trustworthy only when the request really came from a Cloudflare address."

Source: https://www.hostinger.com/support/hostinger-cdn-visitor-ip-addresses-in-logs-and-analytics/

Hostinger's Node.js deployment docs confirm the general shape (app runs on an internal port behind a reverse proxy that terminates TLS; users never touch the Node process directly), but **no Hostinger doc names the header for the managed Node.js app (Phusion Passenger / hPanel) specifically** — the CDN doc above is the closest authoritative statement, and it is written for "Node.js websites behind Hostinger CDN". That is why §4's confirmations are still required.

## 3. Why blindly trusting a forwarded header is dangerous

Rate limiting, OTP-attempt limits and session IP logging all key on this value:

- If the header is one **any visitor can set** (e.g. `cf-connecting-ip` on Hostinger, or the first entry of `x-forwarded-for`), an attacker can send a different fake IP on every request and bypass every per-IP limit — unlimited signup, sign-in and OTP attempts. Or they can send *someone else's* IP and get that person rate-limited.
- If the header is one the proxy **overwrites** (`x-real-ip` from Hostinger CDN), the attacker cannot forge it: whatever they send is replaced before the app sees it.
- The safe default is to trust **no** forwarded header and use the direct connection IP — but behind Hostinger's proxy the direct connection IP is a CDN address shared by all visitors, so per-IP limits would collapse into one shared bucket (everyone rate-limited together, nobody individually). That is why the header must be the one the proxy itself overwrites, and why it must be confirmed rather than guessed.

## 4. Confirm before relying on it (hPanel checks)

Do these in hPanel for `aenural.com` (Cloud Startup plan) **before** treating production rate limiting as verified:

1. **Hostinger CDN is enabled** for the domain. Look under Websites → Dashboard → CDN / Performance (panel names vary by hPanel version). If you cannot find a CDN toggle, ask support — do not assume it is on.
2. **No Cloudflare or other proxy sits in front of Hostinger CDN.** Check where `aenural.com` DNS points: if the A record is proxied through Cloudflare (orange cloud) or any other CDN/WAF, `X-Real-IP` holds that proxy's address, not the visitor's. Keep one service active (Hostinger's own doc says the same).

If either check fails or you cannot determine it, ask support (§5) and **do not** switch to `x-forwarded-for` or `cf-connecting-ip` in the meantime. For local dev testing the value is not load-bearing (local mode uses `x-forwarded-for` per `auth.mjs`, and requests come from `localhost`), so `x-real-ip` can stay in `.env.local` while you confirm.

## 5. Exact question to ask Hostinger support

Live chat or ticket, verbatim:

> "For a Node.js app on Hostinger Cloud Startup (domain aenural.com), which incoming HTTP header does your trusted proxy overwrite with the visitor's real IP address — `x-real-ip`, `x-forwarded-for`, or `cf-connecting-ip`? My auth library (Better Auth) uses this header for rate limiting, so I need the exact header your proxy sets and that a visitor cannot spoof. Is Hostinger CDN enabled for this domain, and is there any other proxy in front of it?"

Record the answer with date + ticket/chat reference. If Hostinger names a different header, use exactly that value and report it — `npm run release:check` accepts only `x-real-ip` (Step 5 security review, S5-02); anything else means stop and report, do not force one of the three.

## 6. Rule for when to set the header

- **Local dev (MySQL mode):** set `AUTH_TRUSTED_IP_HEADER=x-real-ip` (startup requires it non-blank). The value is not security-critical locally.
- **Production:** set it to the recommended `x-real-ip` **only after** §4 passes. If §4 fails, do not enable membership in production until support answers (§5).
- **Never** set it to a header because a blog post, a forum answer, or another framework's default says so. Only the proxy in front of *this* app can say which header it overwrites.

## 7. How to verify after deploy

1. Sign in to the live site from a known IP address (note it down).
2. In phpMyAdmin, run `SELECT ipAddress FROM session ORDER BY createdAt DESC LIMIT 5;` against the production database.
3. The newest session row must show **your real IP**, not a CDN/proxy address. If it shows a proxy address, rate limiting is keying on the wrong IP — disable membership (`AENURAL_MEMBERSHIP_ENABLED=0`, restart) and re-open §5 with support.
4. Also check the app logs for Better Auth's "could not determine a client IP" warning: its presence means the header is not arriving as expected.

## 8. What could / could not be confirmed (2026-11-18)

- **Confirmed from Hostinger's own docs:** Node.js apps behind Hostinger CDN should read `X-Real-IP` (or last entry of `X-Forwarded-For`); `CF-Connecting-IP` is stripped and untrusted; the advice holds only for traffic through Hostinger CDN; direct-to-server requests can carry any header value.
- **Confirmed from Better Auth's own docs:** `ipAddressHeaders` takes the first valid header; only list a header the proxy overwrites; multi-entry `X-Forwarded-For` without `trustedProxies` shares one rate-limit counter.
- **Could NOT be confirmed from public sources:** whether Hostinger CDN is enabled for `aenural.com` on this account; whether any other proxy (Cloudflare etc.) sits in front; the exact proxy software/headers of the managed Cloud Startup Node.js app (Hostinger publishes no per-header statement for it); whether the production app is directly reachable at its origin IP. All four need hPanel/support ( §4–§5 ) or a live deploy check (§7).

## 9. Pending-confirmation checklist (S5-01 — still open, 2026-11-19)

**Status: PENDING — nothing below is done.** Membership must NOT be enabled in production until every item is ticked and the answer is recorded. Gate G4 (`docs/authentication/production-handover.md` §A.3) stays PENDING until then.

| # | What is needed | Who must confirm it | Done? / date + ticket or chat reference |
|---|---|---|---|
| 1 | hPanel check (§4.1): Hostinger CDN is enabled for `aenural.com` | Faisal (in hPanel) | ☐ Date: ________ |
| 2 | hPanel/DNS check (§4.2): no Cloudflare or other proxy sits in front of Hostinger CDN | Faisal (hPanel + DNS check) | ☐ Date: ________ |
| 3 | Hostinger support answers the exact §5 question: which header its trusted proxy overwrites with the visitor's real IP (`x-real-ip`, `x-forwarded-for`, or `cf-connecting-ip`), whether CDN is enabled for this domain, and whether any other proxy is in front | Hostinger support, asked by Faisal (live chat or ticket) | ☐ Date: ________ / Ticket or chat ref: ________ |
| 4 | The confirmed header value is recorded here (§4/§5) and in the production checklist sign-off, with the date + ticket/chat reference from item 3 | Faisal | ☐ Date: ________ |
| 5 | Live check after deploy (§7): sign in from a known IP and confirm `session.ipAddress` shows the real IP, not a CDN/proxy address | Faisal (after deploy) | ☐ Date: ________ |

If Hostinger names a header other than `x-real-ip`, do not just change the value: update the shared allowlist in `server/membership/config.mjs` (`TRUSTED_IP_HEADERS`, also used by `scripts/membership/release-check.mjs`) to exactly that value at the same time, and re-run the trusted-proxy tests. If Hostinger names `x-forwarded-for`, `trustedProxies` must also be added from the exact proxy IPs/CIDRs Hostinger provides (see S5-08) — never just swap the variable.
