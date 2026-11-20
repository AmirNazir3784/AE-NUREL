// Email OTP configuration and pure helpers for AENural membership.
//
// This module is deliberately dependency-free (no better-auth, nodemailer
// or kysely import) so every export can be unit-tested with the plain
// Node test runner and no node_modules installed.
import { createHash } from 'node:crypto';
//
// Verified against Better Auth 1.7.14 (the version pinned in
// package.json), by reading the published package source and by running
// it locally against SQLite:
//   * Plugin import: `emailOTP` from "better-auth/plugins".
//   * Options used: otpLength, expiresIn, allowedAttempts, storeOTP,
//     resendStrategy, disableSignUp, sendVerificationOnSignUp,
//     overrideDefaultEmailVerification, rateLimit, sendVerificationOTP.
//   * OTP rows live in the existing `verification` table. Identifier
//     format is `${type}-otp-${email}` and the stored value is
//     `${storedOTP}:${attempts}` — see otpIdentifier() below, which must
//     stay identical to Better Auth's internal toOTPIdentifier().
//   * A new send with resendStrategy "rotate" deletes the previous
//     verification row for that identifier and stores a fresh one, so a
//     previous code stops working as soon as a new code is issued.
//   * The plugin declares no database models, so it adds no tables:
//     getMigrations() output with the plugin is the same five tables
//     (user, session, account, verification, rateLimit) as without it.
//
// Email transport rule (fail-closed, see resolveEmailTransport):
//   * SMTP (Nodemailer) is the only transport whenever SMTP is
//     configured. A send failure throws; there is deliberately NO
//     fallback to the local outbox, so a broken SMTP configuration can
//     never silently downgrade to writing codes to disk.
//   * The local outbox (mail-*.json in the local data directory) exists
//     ONLY when AENURAL_EMAIL_TRANSPORT=local-outbox AND the app runs in
//     local/SQLite mode. It is a development/testing aid: outbox files
//     contain live verification codes, are written with mode 0600 into
//     a 0700 directory outside public assets, and must never be enabled
//     in production (config.mjs rejects it at startup there).
//   * OTP values are never logged anywhere in this codebase.

// --- OTP policy (single source of truth; auth.mjs passes these through) ---
export const OTP_LENGTH = 6;
export const OTP_EXPIRES_IN_SECONDS = 300; // 5 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_RESEND_COOLDOWN_MS = OTP_RESEND_COOLDOWN_SECONDS * 1000;

// --- Per-email abuse budgets (S5-16, S5-09) ---------------------------------
// A resend with resendStrategy "rotate" deletes the previous verification
// row and stores a fresh one, so each resend used to grant a fresh
// 5-attempt budget: unlimited resends meant unlimited fresh 5-guess
// batches (5 guesses/min, 300/hour, 7,200/day per address) and unbounded
// inbox flooding at 1 mail/minute. These budgets bound that server-side,
// keyed by SHA-256 of the lower-cased address (never the address itself):
//   * OTP resends: max 10/hour and 20/day per address. Hitting either cap
//     starts a hard 1-hour cooling-off period during which every resend
//     answers the same generic success without sending.
//   * Wrong guesses: max 15/hour per address, counted across code
//     rotations (the per-code counter in the verification row does not
//     survive rotation; this one does). Past the cap, verify answers
//     TOO_MANY_ATTEMPTS/429 until the hour window rolls over.
//   * Password-reset mail: 60s per-email cooldown, mirroring the OTP
//     cooldown (S5-09). The per-IP customRules limit (3/min) alone does
//     not bound mail to one victim address.
// All three are in-memory, per process — the same single-process
// constraint as the OTP delivery tracker (otp-delivery.mjs) and the
// accepted deployment shape (single-process Hostinger hosting). A restart
// resets the counters to zero, which fails OPEN for at most one budget
// window after a restart; the per-IP rate limits and the 60s cooldown
// (which reads the durable verification row) still apply. Counters are
// never returned to clients and never logged. There is exactly ONE
// recorder: the plugin before-hook in auth.mjs (it runs for browser
// resends AND for the recovery route's server-side auth.api call —
// proven by test). The recovery handler only CHECKS the budget, so a
// recovery send is never counted twice.
export const OTP_RESEND_MAX_PER_HOUR = 10;
export const OTP_RESEND_MAX_PER_DAY = 20;
export const OTP_RESEND_COOL_OFF_MS = 60 * 60 * 1000; // 1 hour
export const OTP_WRONG_GUESS_MAX_PER_HOUR = 15;
export const OTP_WRONG_GUESS_WINDOW_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
export const PASSWORD_RESET_COOLDOWN_MS = PASSWORD_RESET_COOLDOWN_SECONDS * 1000;
const BUDGET_MAX_ENTRIES = 5000;

export function emailBudgetKey(email) {
  return createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex');
}

function pruneBudgetMap(map) {
  if (map.size <= BUDGET_MAX_ENTRIES) return;
  const overflow = map.size - BUDGET_MAX_ENTRIES;
  let removed = 0;
  for (const key of map.keys()) {
    map.delete(key);
    if (++removed >= overflow) break;
  }
}

const resendBudgets = new Map(); // key -> { hourStart, hourCount, dayStart, dayCount, blockedUntilMs }
const guessBudgets = new Map(); // key -> { windowStart, count }
const resetCooldowns = new Map(); // key -> lastAttemptMs

// Test/support hook: clear every in-memory budget (fresh auth instances in
// tests share this module, so suites must reset between groups).
export function resetOtpBudgets() {
  resendBudgets.clear();
  guessBudgets.clear();
  resetCooldowns.clear();
}

function utcDayStartMs(nowMs) {
  const d = new Date(nowMs);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export function isOtpResendBudgetExhausted(email, nowMs = Date.now()) {
  if (typeof email !== 'string' || !email) return false;
  const entry = resendBudgets.get(emailBudgetKey(email));
  if (!entry) return false;
  if (entry.blockedUntilMs && nowMs < entry.blockedUntilMs) return true;
  const hourStart = Math.floor(nowMs / OTP_WRONG_GUESS_WINDOW_MS) * OTP_WRONG_GUESS_WINDOW_MS;
  if (entry.hourStart === hourStart && entry.hourCount >= OTP_RESEND_MAX_PER_HOUR) return true;
  if (entry.dayStart === utcDayStartMs(nowMs) && entry.dayCount >= OTP_RESEND_MAX_PER_DAY) return true;
  return false;
}

export function recordOtpResend(email, nowMs = Date.now()) {
  if (typeof email !== 'string' || !email) return false;
  const key = emailBudgetKey(email);
  let entry = resendBudgets.get(key);
  if (!entry) {
    entry = { hourStart: 0, hourCount: 0, dayStart: 0, dayCount: 0, blockedUntilMs: 0 };
    resendBudgets.set(key, entry);
    pruneBudgetMap(resendBudgets);
  }
  const hourStart = Math.floor(nowMs / OTP_WRONG_GUESS_WINDOW_MS) * OTP_WRONG_GUESS_WINDOW_MS;
  const dayStart = utcDayStartMs(nowMs);
  if (entry.hourStart !== hourStart) { entry.hourStart = hourStart; entry.hourCount = 0; }
  if (entry.dayStart !== dayStart) { entry.dayStart = dayStart; entry.dayCount = 0; }
  entry.hourCount += 1;
  entry.dayCount += 1;
  if (entry.hourCount >= OTP_RESEND_MAX_PER_HOUR || entry.dayCount >= OTP_RESEND_MAX_PER_DAY) {
    entry.blockedUntilMs = nowMs + OTP_RESEND_COOL_OFF_MS;
  }
  return true;
}

export function isOtpGuessBudgetExhausted(email, nowMs = Date.now()) {
  if (typeof email !== 'string' || !email) return false;
  const entry = guessBudgets.get(emailBudgetKey(email));
  if (!entry) return false;
  const windowStart = Math.floor(nowMs / OTP_WRONG_GUESS_WINDOW_MS) * OTP_WRONG_GUESS_WINDOW_MS;
  return entry.windowStart === windowStart && entry.count >= OTP_WRONG_GUESS_MAX_PER_HOUR;
}

export function recordOtpWrongGuess(email, nowMs = Date.now()) {
  if (typeof email !== 'string' || !email) return false;
  const key = emailBudgetKey(email);
  const windowStart = Math.floor(nowMs / OTP_WRONG_GUESS_WINDOW_MS) * OTP_WRONG_GUESS_WINDOW_MS;
  let entry = guessBudgets.get(key);
  if (!entry || entry.windowStart !== windowStart) {
    entry = { windowStart, count: 0 };
    guessBudgets.set(key, entry);
    pruneBudgetMap(guessBudgets);
  }
  entry.count += 1;
  return true;
}

export function isPasswordResetCoolingDown(email, nowMs = Date.now()) {
  if (typeof email !== 'string' || !email) return false;
  const lastMs = resetCooldowns.get(emailBudgetKey(email));
  return typeof lastMs === 'number' && nowMs - lastMs < PASSWORD_RESET_COOLDOWN_MS;
}

export function recordPasswordResetAttempt(email, nowMs = Date.now()) {
  if (typeof email !== 'string' || !email) return false;
  resetCooldowns.set(emailBudgetKey(email), nowMs);
  pruneBudgetMap(resetCooldowns);
  return true;
}

export const SUPPORT_EMAIL = 'support@aenural.com';
export const OTP_EMAIL_SUBJECT = 'Your AENural verification code';

// Identifier for an OTP verification row. Must match Better Auth 1.7.14's
// internal toOTPIdentifier() exactly — the resend-cooldown hook in
// auth.mjs looks the row up by this identifier.
export function otpIdentifier(type, email) {
  return `${type}-otp-${email}`;
}

// Mask an email address for display: keep the first characters of the
// local part and the whole domain, e.g. alice@example.test ->
// "al***@example.test". Never returns the full local part for short names.
export function maskEmail(email) {
  if (typeof email !== 'string') return '***';
  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const shown = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${shown}***@${domain}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Build the branded OTP email. The OTP is treated as an opaque string and
// is never coerced to a number (a leading zero is significant).
// Throws on a malformed OTP or email instead of sending a broken code.
export function buildOtpEmail({ email, otp }) {
  if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    throw new Error('OTP must be a 6-digit string.');
  }
  if (typeof email !== 'string' || !email.includes('@')) {
    throw new Error('A valid recipient email is required to send a verification code.');
  }
  const safeEmail = escapeHtml(email);
  const text =
    `Your AENural verification code is:\n\n${otp}\n\n` +
    `This code expires in 5 minutes. Enter it on the AENural verification page to confirm your email address.\n\n` +
    `Never share this code with anyone. AENural staff will never ask for it.\n\n` +
    `If you did not request this code, you can ignore this email — no account change has been made.\n\n` +
    `Questions? Contact ${SUPPORT_EMAIL}.`;
  const html =
    `<div style="font-family:system-ui,-apple-system,sans-serif;color:#111827;max-width:480px">` +
    `<h1 style="font-size:20px;margin:0 0 8px">Your verification code</h1>` +
    `<p style="margin:0 0 16px">Enter this code on the AENural verification page to confirm your email address. ` +
    `This code was sent to ${safeEmail}.</p>` +
    `<p style="font-size:32px;font-weight:700;letter-spacing:6px;text-align:center;background:#f3f4f6;border-radius:8px;padding:16px 8px;margin:0 0 16px">${otp}</p>` +
    `<p style="margin:0 0 8px">This code expires in <strong>5 minutes</strong>.</p>` +
    `<p style="margin:0 0 8px">Never share this code with anyone. AENural staff will never ask for it.</p>` +
    `<p style="margin:0 0 8px">If you did not request this code, you can ignore this email — no account change has been made.</p>` +
    `<p style="margin:0">Questions? Contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>` +
    `</div>`;
  return { subject: OTP_EMAIL_SUBJECT, text, html };
}

// True when a code for this email was created less than the resend
// cooldown ago. `createdAt` is the verification row's createdAt as
// stored by Better Auth (Date, ISO string or millisecond number).
// A missing timestamp (null/undefined — no previous send on record)
// means there is no cooldown to enforce. A timestamp that IS present
// but unreadable (unparseable string, wrong type, non-finite number)
// fails CLOSED: it is treated as cooling down, because a row exists
// but its age cannot be proven — assuming "no cooldown" would let a
// send through that the cooldown was meant to block (S5-25).
export function isOtpResendCoolingDown(createdAt, nowMs = Date.now()) {
  if (createdAt === null || createdAt === undefined) return false;
  let createdMs;
  if (createdAt instanceof Date) createdMs = createdAt.getTime();
  else if (typeof createdAt === 'number') createdMs = createdAt;
  else if (typeof createdAt === 'string') createdMs = Date.parse(createdAt);
  else return true; // present but of an unknown type: fail closed
  if (!Number.isFinite(createdMs)) return true; // present but unparseable: fail closed
  return nowMs - createdMs < OTP_RESEND_COOLDOWN_MS;
}

function envFlag(env) {
  const raw = env?.AENURAL_EMAIL_TRANSPORT;
  if (raw === undefined || raw === null) return undefined;
  const value = String(raw).trim();
  return value === '' ? undefined : value;
}

function smtpConfigured(env) {
  return ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM']
    .every((key) => typeof env?.[key] === 'string' && env[key].trim() !== '');
}

// Validate only the AENURAL_EMAIL_TRANSPORT flag itself. Called from
// membershipConfig() at startup: an unknown value, or local-outbox
// outside local/SQLite mode, is a configuration error, not a silent
// default. This does NOT require a transport to exist — local development
// without mail configured must still start; the failure happens at send
// time (see resolveEmailTransport) with a clear server log.
export function assertEmailTransportFlag(env = process.env, { local, sqlite } = {}) {
  const flag = envFlag(env);
  if (flag === undefined) return;
  if (flag !== 'smtp' && flag !== 'local-outbox') {
    throw new Error('AENURAL_EMAIL_TRANSPORT must be "smtp" or "local-outbox".');
  }
  if (flag === 'local-outbox' && !(local || sqlite)) {
    throw new Error('AENURAL_EMAIL_TRANSPORT=local-outbox is for local development only. Production must use SMTP.');
  }
}

// Decide which email transport a send uses. Pure function of the
// environment and mode — never of a previous send outcome. That is the
// whole point: a failed SMTP send can never trigger a fallback to the
// local outbox, because no fallback branch exists here.
//   * SMTP configured -> 'smtp' (even in local mode; explicit SMTP wins).
//   * AENURAL_EMAIL_TRANSPORT=smtp -> 'smtp', or throw when SMTP is
//     not fully configured.
//   * AENURAL_EMAIL_TRANSPORT=local-outbox + local/SQLite mode ->
//     'local-outbox'.
//   * Anything else -> throw a clear configuration error. Callers log
//     the error server-side and surface only a generic message.
export function resolveEmailTransport(env = process.env, { local, sqlite } = {}) {
  const flag = envFlag(env);
  if (flag !== undefined && flag !== 'smtp' && flag !== 'local-outbox') {
    throw new Error('AENURAL_EMAIL_TRANSPORT must be "smtp" or "local-outbox".');
  }
  if (flag === 'local-outbox') {
    if (!(local || sqlite)) {
      throw new Error('AENURAL_EMAIL_TRANSPORT=local-outbox is for local development only. Production must use SMTP.');
    }
    return 'local-outbox';
  }
  if (flag === 'smtp') {
    if (!smtpConfigured(env)) {
      throw new Error('AENURAL_EMAIL_TRANSPORT=smtp requires SMTP_HOST, SMTP_USER, SMTP_PASSWORD and MAIL_FROM.');
    }
    return 'smtp';
  }
  if (smtpConfigured(env)) return 'smtp';
  if (local || sqlite) {
    throw new Error('No email transport configured for local mode. Set AENURAL_EMAIL_TRANSPORT=local-outbox to write account mail to the private local outbox, or configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD and MAIL_FROM.');
  }
  throw new Error('SMTP is required outside local mode. Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD and MAIL_FROM.');
}
