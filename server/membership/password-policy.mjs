// Step 5 (S5-36): small LOCAL common-password screen for sign-up and
// password change. Dependency-free and offline: no network calls at
// runtime — no external breach API is ever contacted from the server.
// (A HIBP k-anonymity lookup was considered and rejected: it would make
// account creation depend on an outside service and send password-prefix
// hashes out of the server.)
//
// Scope is deliberately narrow. Better Auth already enforces length
// (12–128 chars, server/membership/auth.mjs), so this module only rejects
// passwords that are long enough to pass the length rule but are still
// guessable: well-known common passwords, one repeated character, one
// short unit repeated to fill the password, long straight runs
// (abcdefgh / 87654321) and long keyboard rows (qwertyui / asdfghjkl).
// Anything shorter than 12 characters returns null here — Better Auth's
// own length error covers it, and this screen must never mask that.
//
// Wiring (NOT done in this file — server/membership/auth.mjs is owned by
// another worker; the coordinator adds this one block at merge time,
// inside hooks.before, after the DISABLED_OTP_PATHS check):
//   import { passwordPolicyMessage } from './password-policy.mjs';
//   if (ctx.path === '/sign-up/email' || ctx.path === '/change-password') {
//     const reason = passwordPolicyMessage(ctx.body?.password ?? ctx.body?.newPassword);
//     if (reason) throw new APIError('BAD_REQUEST', { message: reason });
//   }
// The same helper can screen the owner password later (see S5-22).

// Well-known common passwords that are still >= 12 characters, so the
// length rule alone lets them through. Sourced from published
// most-common-password lists (SplashData/NCSC-style top entries) plus
// the product name, which is a common guessing base. Shorter classics
// ('password', '123456', 'qwerty') need no entry: min length 12 already
// rejects them.
export const COMMON_PASSWORDS = Object.freeze([
  'password1234', 'password12345', 'password123456', 'password1234567',
  'passwordpassword', 'passw0rd123456', 'p@ssw0rd123456', 'password1password',
  'qwerty123456', 'qwertyuiop123', 'qwertyuiop1234',
  '123456789012', '1234567890123', '1234567891011', '012345678901',
  'abcdefghijkl', 'abcdefghijk1', 'abcdefghijklmnopqrstuvwxyz',
  'letmein123456', 'welcome12345', 'welcome123456',
  'admin12345678', 'admin1234567', 'administrator123',
  'iloveyou1234', 'iloveyou12345', 'monkey123456', 'dragon123456',
  'football1234', 'sunshine1234', 'master123456', 'superman1234',
  'michael12345', 'shadow123456', 'whatever1234', 'computer1234',
  'michelle1234', 'thomas123456',
  'aenural123456', 'aenuralpassword',
]);

const COMMON_SET = new Set(COMMON_PASSWORDS);

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

function hasLongStraightRun(lower) {
  let run = 1;
  for (let i = 1; i < lower.length; i += 1) {
    const step = lower.charCodeAt(i) - lower.charCodeAt(i - 1);
    run = step === 1 || step === -1 ? run + 1 : 1;
    if (run >= 8) return true;
  }
  return false;
}

function hasLongKeyboardRun(lower) {
  for (const row of KEYBOARD_ROWS) {
    for (const sequence of [row, [...row].reverse().join('')]) {
      for (let length = 8; length <= sequence.length; length += 1) {
        for (let start = 0; start + length <= sequence.length; start += 1) {
          if (lower.includes(sequence.slice(start, start + length))) return true;
        }
      }
    }
  }
  return false;
}

function isRepeatedUnit(lower) {
  for (let unit = 1; unit <= 4; unit += 1) {
    if (lower.length % unit !== 0) continue;
    const piece = lower.slice(0, unit);
    if (piece.repeat(lower.length / unit) === lower) return true;
  }
  return false;
}

// Returns a short user-facing reason when the password is a known-weak
// value, or null when it passes this screen. Null does NOT mean "strong"
// — it only means "not on this list and not matching a weak pattern";
// length and any other rules are enforced elsewhere.
export function passwordPolicyMessage(password) {
  if (typeof password !== 'string' || password.length < 12) return null;
  const lower = password.toLowerCase();
  if (COMMON_SET.has(lower)) return 'Choose a less common password. This one is widely used and easy to guess.';
  if (isRepeatedUnit(lower)) return 'Choose a less predictable password. Repeating the same characters is easy to guess.';
  if (hasLongStraightRun(lower)) return 'Choose a less predictable password. Long runs of characters in order are easy to guess.';
  if (hasLongKeyboardRun(lower)) return 'Choose a less predictable password. Long keyboard patterns are easy to guess.';
  return null;
}

export function isCommonPassword(password) {
  return passwordPolicyMessage(password) !== null;
}
