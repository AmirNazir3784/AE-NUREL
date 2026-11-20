# Guest (anonymous) free-tier quota — decision note (Step 5, S5-10)

- **Date:** 2026-11-19
- **Status:** DECIDED — accepted as a known residual risk (see below).
- **Related finding:** S5-10 in `phase5/SECURITY-REVIEW.md` (Medium).
- **Related open gate:** S5-01 / G4 — `AUTH_TRUSTED_IP_HEADER` still
  UNCONFIRMED with Hostinger (see `docs/authentication/trusted-proxy-ip.md`).

## What the guest quota is

Anonymous visitors get **3 free caption videos per day (UTC reset)** without
signing in. The quota is enforced server-side per guest identity
(`server/membership/guest.mjs` mints an HMAC-signed guest id in a cookie;
`server/membership/service.mjs` `reserve()` counts daily use per that id,
`used < 3` for non-premium). The same per-guest keying applies to the
anonymous API limits (30/min writes, 120/min reads).

## The bypass

The guest id is self-issued: **clearing cookies (or using a fresh browser
profile) mints a brand-new guest id with a fresh 3/day allowance.** A guest
id cannot be forged for *someone else's* id (the cookie is HMAC-signed),
but minting a *new* id is free. There is no IP, device, or fingerprint
backstop anywhere in the guest path.

## Decision: accepted as a known residual risk (for now)

Cookie-clearing bypass of the anonymous quota is **accepted business risk**
for the current launch. Reasons:

1. The anonymous tier exists so people can try the tool without signing
   in. Any backstop strong enough to stop cookie rotation (identity,
   fingerprinting, CAPTCHA) would defeat that purpose or add a tracking
   mechanism the product does not want.
2. The only proportionate backstop — a DB-backed **per-IP daily guest cap**
   alongside the per-cookie cap — needs a trustworthy client IP, which
   does not exist yet: S5-01 / G4 is still open (the trusted proxy-IP
   header is unconfirmed). Building a per-IP cap on an unconfirmed header
   would either be bypassable (spoofed header) or collapse into a shared
   counter that locks out legitimate visitors.
3. Impact is bounded: abuse of free-tier compute/quota only. It is not
   account takeover, not data exposure, and not a way into paid features —
   authenticated member routes are keyed on the verified member id and are
   unaffected.

## What is NOT claimed

No user-facing or handover text presents the cookie-based guest quota as
abuse-proof. Checked 2026-11-19:

- The pricing page says "No account quota" for open (unsigned-in) access
  and never states a "3 caption videos per day" limit for guests
  (pinned by `tests/membership-preview.test.mjs`).
- The dashboard "3 caption videos each day" wording describes the
  **signed-in free account** allowance, which *is* enforced per member id.
- `docs/authentication/controlled-activation.md` §"Account management"
  ("Ownership is enforced server-side… every query is scoped by the
  verified session user id") describes signed-in members, not guests.

If any future copy states a guest limit, it must state it as an allowance,
never as an enforced/abuse-proof cap, until the backstop below ships.

## Planned follow-up (after G4 closes)

When `AUTH_TRUSTED_IP_HEADER` is confirmed with Hostinger (S5-01 closed),
add a DB-backed per-IP daily guest-video cap alongside the per-cookie
3/day cap (in `src/app/api/membership/[...path]/route.ts`,
`src/app/api/membership/access/route.ts`, `server/membership/service.mjs`),
and re-check this decision. Related hygiene, tracked separately: guest
user rows accumulate without bound (S5-34) — a prune/retention rule is
still owed.

## What would change this decision

- Evidence of sustained, costly abuse of the anonymous tier (compute
  cost, not just quota counts), or
- a product decision to require sign-in for the free tier.

Until then, this residual is accepted and stays open in the review record
— it is not closed by this note.
