# Owner activation — rotation & revocation procedure (Phase 3, 2026-11-18; rewritten Step 5/6, 2026-11-19)

> **⏸️ PAUSED — owner login is PAUSED (2026-11-20).** Skip this document
> for the normal signup/login go-live; **do not block Steps 8, 10, or 11
> on it.** Use it only if/when owner activation is resumed. The procedure
> itself is factually current. The old owner token is compromised and must
> never be reused.

> **Repo path (once committed):** `docs/authentication/owner-activation-rotation.md`
> **Scope:** `server/membership/owner-bootstrap.json` + `server/membership/owner-activation.mjs` + `scripts/membership/generate-owner-token.mjs` on branch `feature/hostinger-authentication`. No token or hash value appears in this document — the values are described by name only. Never paste a token or a hash into chat, a ticket, a screenshot, or a commit message.

## 0. How activation works (verified from the branch code, Step 5 fix)

- The activation token hash is **not in the repo**. It lives only in the server env var **`AENURAL_OWNER_ACTIVATION_TOKEN_HASH`**, in scrypt format `scrypt$N$r$p$<salt-b64>$<hash-b64>` (N=16384, r=8, p=1, 64-byte key — Node's built-in `crypto.scrypt`, no new dependency). The owner email lives only in **`AENURAL_OWNER_EMAIL`**.
- `server/membership/owner-bootstrap.json` is **inert**: it holds no secret and the code never reads a hash (or an email) from it. It is kept only because the import path is load-bearing and the push path cannot do file deletions; its `_note` field says so.
- `activateOwner()` (`server/membership/owner-activation.mjs`) only runs when `config.ownerOnly` is true. It verifies the supplied token (max 128 chars) against the env hash with scrypt + `timingSafeEqual`, requires a 16–128 character password with at least 3 of 4 character classes (lowercase, uppercase, digit, symbol), requires a real non-placeholder owner email, then creates the owner user (`emailVerified: 1`) and credential account inside one transaction.
- **One identical generic 403** (`"This activation could not be verified."`) is returned for every failure — wrong token, malformed stored hash, weak password, placeholder/unconfigured email, owner already exists, token already used. No status or message distinguishes them, so probing cannot confirm whether a token is valid.
- **The token is invalidated on first successful activation (S5-11):** after the insert commits, the hash is remembered as consumed in the running process and the in-memory env value is replaced with a fresh random unknown scrypt hash. Even if the owner row is later deleted, the same token can never activate again in that process. This is in-process only — a server restart restores the env value from deployment config — so **always rotate the env var after activation (§2)**. The owner row itself is the durable backstop while the env var still holds the used hash.
- **Attempt limits (S5-12):** the route (`src/app/api/membership/activate-owner/route.ts`) enforces a global 5/min bucket, a per-IP 5/min bucket (DB-backed, keyed under the `owner-activation` guest row), and a progressive lockout — 5 consecutive failures from one IP lock that IP out for 10 minutes. Every attempt is logged server-side with timestamp, IP and outcome code only — never the token or the password.
- **Origin check (S5-23):** the route checks `Origin` only as a CSRF control. It is not authentication — the token is the only credential.

## 1. Security assessment — what the OLD committed hash does and does not reveal

- **The old committed hash is compromised — treat it as such.** `server/membership/owner-bootstrap.json` used to hold an **unsalted SHA-256** hash of the token. SHA-256 is fast, so if the token was short, predictable, or human-chosen, anyone with repo read access could brute-force / dictionary-attack the hash offline at billions of guesses per second and recover the token. The hash does not reveal the token directly, and it cannot be reversed without guessing — but "cannot be reversed" is not the same as "safe": its safety depended entirely on the token having enough entropy, and nothing in the code generated, checked, or recorded the token.
- **What it does not reveal:** the owner password (not stored here), the `BETTER_AUTH_SECRET`, or any database credential.
- **Exposure window:** the hash is committed in a private repo, but every clone, fork, and the full git history contains it forever. Rotating the token does **not** remove the old hash from history — assume any token whose hash was ever committed is known to anyone who ever had repo access. **Never reuse a token whose hash was ever committed.**
- **Practical risk today:** low *if* the token was generated randomly (32+ bytes) and has never been shared, because brute-forcing a high-entropy token is infeasible even with fast SHA-256 — and the new scrypt hash makes offline guessing expensive even for a mediocre token. The risk becomes real if the token was short, typed by hand, reused from another service, or pasted anywhere (chat, ticket, screenshot, terminal history). If any of those happened, treat the token as compromised and rotate immediately (§2).
- **Placeholder email:** the old committed email was `owner@aenural.com`, a placeholder, not a real mailbox. The code now **refuses activation** when the owner email is that placeholder or is unconfigured — the owner account can never be created under it. The real address must come from `AENURAL_OWNER_EMAIL` before any activation.
- **No attempt limit on the endpoint itself (fixed):** the code previously had no per-IP/per-token attempt counter on activation (the 5-attempt limit in the repo was for OTP codes, not this endpoint). Step 5 added the per-IP bucket, global bucket backstop, progressive lockout, and attempt logging (§0). Do not rely on those alone — rely on token entropy + rotation.

## 2. How to rotate the activation token

Do this whenever the token may have leaked, when moving from dev to production, and **after every activation** (a used token must be replaced, because a server restart restores the env value). Dev and production must have **different** tokens (see §4).

**Prerequisites:** the dev server / production app is stopped or the change is deployed normally; you are on branch `feature/hostinger-authentication` (dev) or the production deployment flow (prod).

1. **Generate a new token** — do not type one. In PowerShell (project folder) or any trusted terminal:
   ```powershell
   node scripts/membership/generate-owner-token.mjs
   ```
   That prints the token **once** plus the scrypt hash to put in the env var. Copy the token once, into a password manager or a private note — **never into chat, email, or a ticket**. The script never writes the token to any file. This is the only time the plaintext token exists outside your store; the repo will only ever hold the env-var name, never a value.
2. **Set the env vars** (Hostinger Node app environment for production; git-ignored `.env.local` for local dev). The exact names are also in `config/membership.env.example`:
   ```text
   AENURAL_OWNER_EMAIL=<the real owner email address, not owner@aenural.com>
   AENURAL_OWNER_ACTIVATION_TOKEN_HASH=<the scrypt hash printed by the script>
   ```
   Restart the app / dev server so the new values are picked up. Do **not** put either value in `server/membership/owner-bootstrap.json` (inert — the code ignores it), in any committed file, or in `.env` that is committed.
3. **Verify the old token is dead:** attempt activation with the old token (owner-only mode, test database). Expected: the generic `403` ("could not be verified"). If it still succeeds, the env var that is actually deployed was not replaced — stop and check the deployed environment, not the repo.
4. **Verify the new token works:** activate with the new token on the test database. Expected: owner account created, `emailVerified: 1`. Then rotate again before production use (a token used in a test should not be the production token).
5. **Record privately** (never in the repo): rotation date, environment, and where the new token is stored. Do not record the token value itself in any shared note.

## 3. How to revoke

There is no "revoke token" button. Revocation is rotation to a value nobody knows, plus (if needed) removing the account:

- **Revoke the token only (owner account stays):** follow §2 with a fresh random token, then **do not use or store the new token anywhere accessible** — generate it, set the env hash, and discard the plaintext. The old token now fails verification (`403`). The existing owner account is unaffected. (Since Step 5 the token is also invalidated in-process on use, so a used token is dead in the running server even before rotation — rotation is what keeps it dead across a restart.)
- **Revoke everything (owner account must go too):** do the token rotation above, then delete the owner user row from the database (phpMyAdmin: delete from `account` where `userId` = the owner id, then from `user` where `email` = the owner email — or use the app's own delete-account flow while signed in as the owner). Deleting the row without rotating the token would re-open activation to anyone holding the old token on the next restart, so **always rotate first, delete second**.
- **Emergency (token leaked and owner account exists):** the owner account itself is not at risk from the token alone — activation cannot overwrite an existing owner (generic `403`). The urgent action is still rotation (§2), because the token becomes live again the moment the owner row is ever deleted and the server restarts without a rotated env var. Change the owner password as well (sign in → Account → Password and security → Change password, which revokes other sessions).

## 4. Separate dev vs production activation credentials

- **Different token per environment, different email if applicable.** The dev token (if one was ever used locally) must never be the production token. The production token is generated once, stored in the owner's password manager, used once to activate, and then rotated (§2) so the used value is dead.
- **Different owner email handling:** the repo placeholder `owner@aenural.com` must be replaced with the real owner address via `AENURAL_OWNER_EMAIL` before any activation — the code refuses the placeholder. If dev and production need different owner addresses, that is a config difference to make deliberately — do not activate production against the placeholder and "fix the email later" (the account's email is its identity for login, reset, and receipts).
- **Never copy env values from dev to production** (or vice versa). Each environment gets its own token hash and email via its own rotation.
- **Production activation happens once, then the endpoint is dead weight:** after production activation + rotation, the endpoint can only return the generic `403`. Leave it that way — do not remove the file (the import is load-bearing for the module) and do not "disable" it by editing code on the server.

## 5. What NOT to do

- **Never commit the plaintext token or its hash** — not in `owner-bootstrap.json`, not in `.env`, not in a test file, not in a comment. The hash belongs in the server env var only.
- **Never reuse a token across environments** (dev token ≠ production token).
- **Never reuse a token after it has been used once** — rotate after every activation, even a test one.
- **Never paste the token or the hash into chat, email, a support ticket, a screenshot, or terminal output you share.** The hash is less sensitive than the token, but it is the exact input to an offline brute-force — treat it as sensitive too.
- **Never choose a short or memorable token.** If you can remember it, it is too weak. Generate 32 random bytes every time (the script does this).
- **Never assume rotation erases history.** The old hash remains in git history forever. Rotation limits future damage; it does not retroactively secure a token that was already brute-forced or shared.
- **Never delete the owner row without rotating first** (§3) — deletion re-arms the old token on the next restart.
