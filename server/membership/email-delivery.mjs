// Durable email-delivery audit for AENural membership (Phase 4).
//
// WHY THIS MODULE EXISTS — the in-memory tracker in otp-delivery.mjs
// answers "did the last OTP send for this address succeed?" for the
// verify page, but it dies with the process and exists once per Node
// instance. That is fine for a single-instance deployment while the
// server is up, and it is NOT fine for three questions operators and
// users ask after a restart or an outage:
//
//   * "Did the code for this address ever get sent?" (restart recovery)
//   * "How often is mail failing, and with which error?" (operations)
//   * "Did the password-reset mail go out?" (reset sends were never
//     recorded anywhere — the OTP tracker only covers OTP mail)
//
// This module is the durable half of the answer: an append-only audit
// table (`aenural_email_delivery_attempts`, migration 002) that records
// one row per send attempt — OTP and password-reset — with the outcome
// and the transport error code. It is the audit/recovery layer, NOT a
// replacement for the in-memory tracker:
//
//   * The verify-page status endpoint stays synchronous and backed by
//     the in-memory tracker (see pending-verification.mjs): the route
//     returns the handler's result directly, and making that read async
//     would change the handler contract every existing caller relies
//     on. At runtime the in-memory tracker is authoritative — it is
//     written in the same callback as the send, so it always agrees
//     with what just happened.
//   * The durable table backs it: membershipAuth() repopulates the
//     in-memory tracker from recent durable rows at startup, so a
//     restart no longer resets every status to "unknown".
//   * Multi-instance deployments are the known gap: an instance only
//     knows its own sends plus what was in the table when it started.
//     AENural on Hostinger runs a single Node process, so this is
//     accepted and documented, not silently fixed. If multi-instance
//     is ever adopted, the status read must become an async DB lookup.
//
// PRIVACY — what is stored and what is never exposed:
//   * Stored per attempt: the recipient email (lower-cased), the kind
//     ('otp' | 'password-reset'), the outcome ('sent' | 'failed'), the
//     transport error code (e.g. ECONNREFUSED, EAUTH — never a message
//     body), and the attempt time. The email is already stored in the
//     `user` table; this table adds no new PII surface and is never
//     serialised into any HTTP response, log line, or status endpoint.
//   * NEVER stored: OTP values, reset tokens/URLs, message subjects or
//     bodies, passwords, or any credential. The error code is the only
//     failure detail, and it stays server-side (operators query the
//     table directly; the status endpoint returns only sent/failed/
//     unknown).
//   * Retention: rows older than EMAIL_DELIVERY_RETENTION_DAYS (30)
//     are pruned best-effort by the store itself (at most once an hour
//     per process). The table is append-only otherwise: no UPDATE, no
//     DELETE of recent rows, no DROP anywhere.
//
// FAILURE MODE — the store can never break mail. Every method catches
// its own errors and returns a safe default (false / 'unknown' / []),
// so a missing table (002 not applied yet), a dead database, or a
// tracking bug can neither fail a delivery nor mask a real failure.
// The first record failure per process logs one warning line (error
// code only) so operators notice a broken audit without log spam.

import { randomUUID } from 'node:crypto';

export const EMAIL_DELIVERY_TABLE = 'aenural_email_delivery_attempts';
export const EMAIL_DELIVERY_KINDS = Object.freeze(['otp', 'password-reset']);
export const EMAIL_DELIVERY_STATUSES = Object.freeze(['sent', 'failed']);
// How far back the startup repopulation looks (same lifetime as the
// in-memory tracker TTL and the pending-verification cookie, so a
// repopulated status is never shown for a code that could not still
// be valid).
export const EMAIL_DELIVERY_REPOPULATE_MS = 600_000;
// Audit retention. Pruning is best-effort and never blocks a send.
export const EMAIL_DELIVERY_RETENTION_DAYS = 30;
const PRUNE_INTERVAL_MS = 3_600_000;

// UTC 'YYYY-MM-DD HH:mm:ss.SSS'. Lexicographic order is chronological
// order. The column is varchar(32) on both engines (see schema.mjs
// and migration 002 — the same convention the other application
// tables use), so the string is stored verbatim with no timezone
// conversion anywhere.
export function toDbTimestamp(ms) {
  const d = new Date(ms);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`
  );
}

export function fromDbTimestamp(value) {
  // The MySQL driver returns DATETIME columns as Date objects, while
  // SQLite returns the stored string. Accept both.
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : Number.NaN;
  }
  if (typeof value !== 'string') return Number.NaN;
  const ms = Date.parse(value.replace(' ', 'T') + 'Z');
  return Number.isFinite(ms) ? ms : Number.NaN;
}

function normaliseEmail(email) {
  if (typeof email !== 'string') return null;
  const value = email.trim().toLowerCase();
  return value.length >= 3 && value.length <= 254 && value.includes('@') ? value : null;
}

// The active store for this process, set by authOptions() when a Kysely
// database is available. Recording helpers use it; when it is unset
// (offline schema generation, unit tests) recording is a silent no-op.
let activeStore = null;
export function setActiveEmailDeliveryStore(store) {
  activeStore = store ?? null;
  return activeStore;
}
export function getActiveEmailDeliveryStore() {
  return activeStore;
}

// Record one attempt through the active store, if any. Never throws,
// never returns provider detail — the boolean only says whether the
// durable row was written.
export async function recordEmailDeliveryAttempt(attempt) {
  if (!activeStore) return false;
  try {
    return await activeStore.recordAttempt(attempt);
  } catch {
    return false;
  }
}

export function createEmailDeliveryStore(db, { now = () => Date.now() } = {}) {
  let lastPruneMs = 0;
  let warnedUnavailable = false;
  // Monotonic attempt timestamps: two attempts in the same millisecond
  // (easy to hit — a resend follows a sign-up within ms in tests, and
  // bursts happen in production too) would otherwise tie on
  // attempted_at, and "latest" would be decided by the random id —
  // a coin flip. The timestamp is therefore strictly increasing per
  // process (at most a few ms ahead of wall time under burst). A tie
  // across processes in the same millisecond is still possible, but
  // the in-memory tracker — not this table — is authoritative at
  // runtime, and repopulation only needs the latest row per address.
  let lastAttemptMs = 0;
  function nextAttemptMs() {
    const nowMs = now();
    lastAttemptMs = Math.max(nowMs, lastAttemptMs + 1);
    return lastAttemptMs;
  }

  function warnUnavailable(error) {
    if (warnedUnavailable) return;
    warnedUnavailable = true;
    console.error(
      '[membership] Email delivery audit unavailable:',
      error?.code || error?.name || 'AUDIT_UNAVAILABLE',
    );
  }

  async function pruneIfDue() {
    const nowMs = now();
    if (nowMs - lastPruneMs < PRUNE_INTERVAL_MS) return;
    lastPruneMs = nowMs;
    try {
      await db
        .deleteFrom(EMAIL_DELIVERY_TABLE)
        .where('attempted_at', '<', toDbTimestamp(nowMs - EMAIL_DELIVERY_RETENTION_DAYS * 86_400_000))
        .execute();
    } catch {
      // Retention pruning must never affect the send it rode along with.
    }
  }

  return {
    // Write one audit row. Returns true when the row was written, false
    // for invalid input or any database error. Never throws.
    //
    // CALLER CONTRACT (Phase 4 pool-deadlock fix, 2026-11-19): never
    // await this from inside a Better Auth endpoint callback (e.g. the
    // sendVerificationOTP callback in auth.mjs) — the endpoint runs
    // inside a Kysely transaction holding one pool connection, and an
    // awaited second query on the same pool deadlocks at >=5 concurrent
    // sends. Call it fire-and-forget there (see recordDelivery); the
    // in-memory tracker is the synchronous status source, this table
    // is the lagging durable audit.
    async recordAttempt({ email, kind, status, errorCode } = {}) {
      try {
        const address = normaliseEmail(email);
        if (!address) return false;
        if (!EMAIL_DELIVERY_KINDS.includes(kind)) return false;
        if (!EMAIL_DELIVERY_STATUSES.includes(status)) return false;
        const code =
          typeof errorCode === 'string' && errorCode ? errorCode.slice(0, 64) : null;
        await db
          .insertInto(EMAIL_DELIVERY_TABLE)
          .values({
            id: randomUUID(),
            email: address,
            kind,
            status,
            error_code: code,
            attempted_at: toDbTimestamp(nextAttemptMs()),
          })
          .execute();
        // Best-effort retention, after the write so it cannot delay it.
        await pruneIfDue();
        return true;
      } catch (error) {
        warnUnavailable(error);
        return false;
      }
    },

    // Latest outcome for one address + kind, or 'unknown' when nothing
    // is on record. Never throws; never returns an error code.
    async latestStatus(email, kind) {
      try {
        const address = normaliseEmail(email);
        if (!address || !EMAIL_DELIVERY_KINDS.includes(kind)) return 'unknown';
        const row = await db
          .selectFrom(EMAIL_DELIVERY_TABLE)
          .select(['status'])
          .where('email', '=', address)
          .where('kind', '=', kind)
          .orderBy('attempted_at', 'desc')
          .orderBy('id', 'desc')
          .limit(1)
          .executeTakeFirst();
        return row && EMAIL_DELIVERY_STATUSES.includes(row.status) ? row.status : 'unknown';
      } catch (error) {
        warnUnavailable(error);
        return 'unknown';
      }
    },

    // Recent attempts (all kinds) for startup repopulation and operator
    // inspection. Rows carry email/kind/status/attemptedAtMs only — no
    // OTP, no token, no message content. Never throws.
    async recentAttempts(sinceMs, { limit = 1000 } = {}) {
      try {
        const rows = await db
          .selectFrom(EMAIL_DELIVERY_TABLE)
          .select(['email', 'kind', 'status', 'attempted_at'])
          .where('attempted_at', '>=', toDbTimestamp(sinceMs))
          .orderBy('attempted_at', 'asc')
          .limit(limit)
          .execute();
        return rows
          .filter(
            (row) =>
              normaliseEmail(row.email) &&
              EMAIL_DELIVERY_KINDS.includes(row.kind) &&
              EMAIL_DELIVERY_STATUSES.includes(row.status),
          )
          .map((row) => ({
            email: normaliseEmail(row.email),
            kind: row.kind,
            status: row.status,
            attemptedAtMs: fromDbTimestamp(row.attempted_at),
          }))
          .filter((row) => Number.isFinite(row.attemptedAtMs));
      } catch (error) {
        warnUnavailable(error);
        return [];
      }
    },
  };
}

// Repopulate an in-memory OTP tracker from durable rows (called once at
// startup by membershipAuth). Applies the latest row per address within
// the repopulation window, oldest first so the newest wins, OTP kind
// only — password-reset rows have no in-memory tracker to restore.
// Never throws; returns how many addresses were restored.
export async function repopulateOtpDeliveryFromStore({ store, tracker, now = () => Date.now() } = {}) {
  try {
    if (!store || !tracker) return 0;
    const rows = await store.recentAttempts(now() - EMAIL_DELIVERY_REPOPULATE_MS);
    const latestByEmail = new Map();
    for (const row of rows) {
      if (row.kind !== 'otp') continue;
      latestByEmail.set(row.email, row.status);
    }
    let restored = 0;
    for (const [email, status] of latestByEmail) {
      const ok =
        status === 'sent' ? tracker.recordSent(email) : tracker.recordFailed(email);
      if (ok) restored += 1;
    }
    return restored;
  } catch {
    return 0;
  }
}
