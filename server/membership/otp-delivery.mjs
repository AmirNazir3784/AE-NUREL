// OTP delivery tracking for AENural membership.
//
// WHY THIS MODULE EXISTS — Better Auth 1.7.14 cannot tell the caller
// whether an OTP email was actually delivered (see
// docs/authentication/otp-delivery-failure.md for the full investigation
// with source references). In short:
//
//   * Every OTP send goes through `runInBackgroundOrAwait()` in
//     better-auth/dist/context/create-context.mjs, which catches any
//     error thrown by the app's `sendVerificationOTP` callback, logs it
//     ("Failed to run background task:") and returns success anyway.
//     There is no supported option, hook, return value or event that
//     surfaces the failure to the request.
//   * `sendVerificationOTP` returns `Promise<void>` — there is no
//     delivery result to inspect.
//   * The documented alternative, `advanced.backgroundTasks.handler`,
//     makes delivery strictly LESS observable: with a handler set the
//     send is not even awaited, so the response returns before the
//     send has finished. AENural deliberately does NOT configure it.
//
// The one place a send failure IS observable is inside the app's own
// `sendVerificationOTP` callback (server/membership/auth.mjs): it is
// the function that calls the mail transport, so it sees the throw
// before Better Auth swallows it. This module records that outcome —
// nothing else — so the verify page can tell the user honestly whether
// their code was sent.
//
// DESIGN (deliberately minimal, dependency-free so it can be unit
// tested with plain `node --test`):
//
//   * In-memory only, per process. A failed send is a transient
//     operational fact, not account state: the TRACKER entries
//     themselves are never written to the database, never survive a
//     restart, and never be used to decide whether an account exists.
//     Restarting the server resets every entry to "unknown", which is
//     the safe default — unless the durable audit (Phase 4,
//     email-delivery.mjs) repopulates them at startup from the
//     `aenural_email_delivery_attempts` table, which records send
//     attempts separately for operations and restart recovery.
//   * Keyed by lower-cased email. The key is never returned to the
//     client; the status endpoint only answers for the email in the
//     caller's own pending-verification cookie (see
//     pending-verification.mjs), and only ever returns one of
//     "sent" | "failed" | "unknown" — never an error code, never
//     provider internals, never the OTP.
//   * Entries expire after 10 minutes (OTP_DELIVERY_TTL_MS), the same
//     lifetime as the pending-verification cookie, and the map is
//     capped (OTP_DELIVERY_MAX_ENTRIES, oldest evicted first) so a
//     flood of sign-ups cannot grow memory without bound.
//   * Recording never throws and never changes the outcome of a send:
//     auth.mjs wraps the record calls so a tracking bug can neither
//     fail a delivery nor mask a real failure.
//
// RESIDUAL ENUMERATION NOTE (narrowed 2026-11-19, Phase 4): a "failed"
// status proves a send was attempted for that address, and a send is
// only attempted for an existing unverified account — so the status
// endpoint only reports delivery when the caller holds the
// sign-up signature cookie for that address (see
// pending-verification.mjs). The recovery route sets the email cookie
// for any well-formed address but NEVER the signature cookie, so
// probing an address through recovery now always reads 'unknown'.
// What remains: a duplicate sign-up returns a generic 200 whose
// synthetic user carries the submitted email, so the sign-up
// after-hook sets a signature cookie for it too — an attacker who
// re-signs-up with a victim's address within 10 minutes of the
// victim's own sign-up could read 'sent' for it. That window is
// bounded by the 10-minute entry TTL, reveals only that an unverified
// sign-up happened minutes ago, and needs the victim to have just
// signed up; closing it would require distinguishing a real sign-up
// from Better Auth's synthetic duplicate response inside the
// after-hook, which the supported API does not expose.

// 10 minutes: the same lifetime as the pending-verification cookie, so
// a delivery status is never shown for a code that could not still be
// valid, and a stale "failed" never lingers after the user has moved on.
export const OTP_DELIVERY_TTL_MS = 600_000;

// Upper bound on tracked addresses per process. Sign-up volume is low;
// 1000 entries is far above any plausible 10-minute window and bounds
// memory even under a sign-up flood.
export const OTP_DELIVERY_MAX_ENTRIES = 1000;

export const OTP_DELIVERY_STATUSES = Object.freeze(['sent', 'failed', 'unknown']);

function normaliseEmail(email) {
  if (typeof email !== 'string') return null;
  const value = email.trim().toLowerCase();
  return value.length >= 3 && value.length <= 254 && value.includes('@') ? value : null;
}

export function createOtpDeliveryTracker({ now = () => Date.now() } = {}) {
  // email -> { status: 'sent' | 'failed', atMs, errorCode?: string }
  // errorCode is server-side only (an SMTP/Nodemailer error code such as
  // ECONNREFUSED). It is kept for operator debugging via getEntry() in
  // tests and must NEVER be returned by any HTTP response.
  const entries = new Map();

  function prune(nowMs) {
    for (const [email, entry] of entries) {
      if (nowMs - entry.atMs > OTP_DELIVERY_TTL_MS) entries.delete(email);
    }
    while (entries.size > OTP_DELIVERY_MAX_ENTRIES) {
      // Map iteration order is insertion order: the first key is oldest.
      entries.delete(entries.keys().next().value);
    }
  }

  function record(email, status, errorCode) {
    const key = normaliseEmail(email);
    if (!key || (status !== 'sent' && status !== 'failed')) return false;
    prune(now());
    // Re-insert so a re-recorded address counts as newest for eviction.
    entries.delete(key);
    entries.set(key, {
      status,
      atMs: now(),
      ...(typeof errorCode === 'string' && errorCode ? { errorCode } : {}),
    });
    return true;
  }

  return {
    // Record a completed send. Returns false (never throws) for an
    // unusable address, so callers can ignore the result safely.
    recordSent(email) {
      try {
        return record(email, 'sent');
      } catch {
        return false;
      }
    },
    // Record a failed send. errorCode is the transport's error code
    // only (e.g. ECONNREFUSED, EAUTH) — never the recipient, the code,
    // or any credential.
    recordFailed(email, errorCode) {
      try {
        return record(email, 'failed', errorCode);
      } catch {
        return false;
      }
    },
    // 'sent' | 'failed' | 'unknown'. 'unknown' covers "no send was
    // attempted for this address" and "the entry expired" — the caller
    // cannot distinguish the two, which is intentional.
    statusFor(email) {
      try {
        const key = normaliseEmail(email);
        if (!key) return 'unknown';
        prune(now());
        return entries.get(key)?.status ?? 'unknown';
      } catch {
        return 'unknown';
      }
    },
    // Full entry for server-side debugging and tests only. NEVER
    // serialise this into an HTTP response: it carries errorCode.
    getEntry(email) {
      const key = normaliseEmail(email);
      if (!key) return null;
      prune(now());
      const entry = entries.get(key);
      return entry ? { ...entry } : null;
    },
    size() {
      prune(now());
      return entries.size;
    },
  };
}

// Process-wide singleton used by auth.mjs (records) and
// pending-verification.mjs (reads). Tests that need isolation should use
// createOtpDeliveryTracker() directly instead of this singleton.
export const otpDelivery = createOtpDeliveryTracker();

export function recordOtpDeliverySent(email) {
  return otpDelivery.recordSent(email);
}

export function recordOtpDeliveryFailed(email, errorCode) {
  return otpDelivery.recordFailed(email, errorCode);
}

export function getOtpDeliveryStatus(email) {
  return otpDelivery.statusFor(email);
}
