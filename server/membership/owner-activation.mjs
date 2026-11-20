import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { hashPassword } from 'better-auth/crypto';
import { MembershipError, dbTimestamp, isUniqueViolation } from './service.mjs';

const scryptAsync = promisify(scryptCallback);

// ---------------------------------------------------------------------------
// Owner activation — Step 5 security fixes (S5-04, S5-11, S5-12, S5-13,
// S5-22, S5-37). See docs/authentication/owner-activation-rotation.md.
//
// The activation token hash is NOT in the repo. It lives in the server env
// var AENURAL_OWNER_ACTIVATION_TOKEN_HASH, and the owner email in
// AENURAL_OWNER_EMAIL. server/membership/owner-bootstrap.json is inert:
// it holds no secret and is never read by this module. The old committed
// unsalted SHA-256 hash must be treated as compromised — rotate it with
// scripts/membership/generate-owner-token.mjs (see the rotation doc).
//
// Token verification uses scrypt (Node built-in, no new dependency), stored
// as `scrypt$N$r$p$<salt-b64>$<hash-b64>`. A malformed stored hash fails
// closed with the same generic 403 as a wrong token — never a 500, and
// never a different message (S5-04 / prior fix F-1, preserved here).
// ---------------------------------------------------------------------------

export const OWNER_TOKEN_SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 64 };
export const OWNER_ACTIVATION_GENERIC_ERROR = 'This activation could not be verified.';
export const OWNER_PLACEHOLDER_EMAIL = 'owner@aenural.com';

const GENERIC_403 = () => new MembershipError(OWNER_ACTIVATION_GENERIC_ERROR, 403);

// The owner email is an import-time snapshot for callers that read it as a
// plain value (src/lib/member-server.ts). activateOwner() itself always
// re-reads the env var at call time (see resolveOwnerEmail), so a value set
// after import is still honoured by activation.
export const ownerEmail = resolveOwnerEmail(process.env);

export function resolveOwnerEmail(env = process.env) {
  const value = typeof env?.AENURAL_OWNER_EMAIL === 'string' ? env.AENURAL_OWNER_EMAIL.trim().toLowerCase() : '';
  return value;
}

export function isUsableOwnerEmail(email) {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  return normalized.length > 0
    && normalized !== OWNER_PLACEHOLDER_EMAIL
    && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized);
}

export async function hashOwnerActivationToken(token) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(token, salt, OWNER_TOKEN_SCRYPT.keyLength, { N: OWNER_TOKEN_SCRYPT.N, r: OWNER_TOKEN_SCRYPT.r, p: OWNER_TOKEN_SCRYPT.p });
  return `scrypt$${OWNER_TOKEN_SCRYPT.N}$${OWNER_TOKEN_SCRYPT.r}$${OWNER_TOKEN_SCRYPT.p}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

// Returns true only for a well-formed scrypt hash that matches the token.
// Every malformed input (legacy unsalted SHA-256 hex, truncated value,
// bad parameters, wrong lengths) returns false — never throws — so the
// caller answers with the same generic 403 as a wrong token.
export async function verifyOwnerActivationToken(token, storedHash) {
  try {
    if (typeof token !== 'string' || token.length === 0 || token.length > 128) return false;
    if (typeof storedHash !== 'string') return false;
    const parts = storedHash.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
    if (N < 2 || (N & (N - 1)) !== 0 || N > 1 << 20 || r < 1 || r > 8 || p < 1 || p > 8) return false;
    const salt = Buffer.from(parts[4], 'base64');
    const expected = Buffer.from(parts[5], 'base64');
    if (salt.length !== 16 || expected.length !== OWNER_TOKEN_SCRYPT.keyLength) return false;
    const derived = await scryptAsync(token, salt, expected.length, { N, r, p, maxmem: 64 * 1024 * 1024 });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// Owner password complexity floor (S5-22), on top of the 16–128 length
// rule: at least 3 of the 4 character classes (lowercase, uppercase,
// digit, non-alphanumeric). Length alone (`aaaaaaaaaaaaaaaa`) is not
// enough for the single most powerful account in the system.
export function isStrongOwnerPassword(password) {
  if (typeof password !== 'string' || password.length < 16 || password.length > 128) return false;
  let classes = 0;
  if (/[a-z]/.test(password)) classes += 1;
  if (/[A-Z]/.test(password)) classes += 1;
  if (/[0-9]/.test(password)) classes += 1;
  if (/[^A-Za-z0-9]/.test(password)) classes += 1;
  return classes >= 3;
}

// ---------------------------------------------------------------------------
// Attempt tracking for the activation route (S5-12). In-memory, per
// process: after 5 consecutive failed attempts from one IP, that IP is
// locked out for 10 minutes. A success clears the IP's failure count.
// This is a backstop behind the DB-backed per-IP + global limitOperation
// buckets in the route — it survives no restart, and it is deliberately
// NOT the only control. The tracker never sees the token or password.
// ---------------------------------------------------------------------------
export function createOwnerActivationAttemptTracker({ now = () => Date.now(), maxFailures = 5, lockoutMs = 10 * 60 * 1000 } = {}) {
  const failures = new Map();
  return {
    isLockedOut(ip) {
      const entry = failures.get(ip);
      return !!entry && entry.lockedUntil !== null && now() < entry.lockedUntil;
    },
    failureCount(ip) {
      return failures.get(ip)?.count ?? 0;
    },
    recordFailure(ip) {
      const entry = failures.get(ip) ?? { count: 0, lockedUntil: null };
      entry.count += 1;
      if (entry.count >= maxFailures && entry.lockedUntil === null) entry.lockedUntil = now() + lockoutMs;
      failures.set(ip, entry);
    },
    recordSuccess(ip) {
      failures.delete(ip);
    },
  };
}

// Client IP for rate limiting / logging ONLY (S5-12) — never for
// authentication. Reads the configured trusted header when set, else
// `x-real-ip`; takes the first comma-separated entry. Anything missing
// or unusable collapses to 'unknown' (one shared bucket, plus the global
// bucket as backstop) rather than to a caller-controlled value.
export function ownerActivationClientIp(headers, trustedHeader) {
  const name = typeof trustedHeader === 'string' && trustedHeader.trim() ? trustedHeader.trim().toLowerCase() : 'x-real-ip';
  const raw = headers?.get?.(name);
  if (typeof raw !== 'string') return 'unknown';
  const first = raw.split(',')[0].trim();
  if (!first || first.length > 45 || /[\s<>\"']/.test(first)) return 'unknown';
  return first;
}

// Maps a storage error from the owner insert to the outcome the caller
// should report (S5-37): a unique-violation (concurrent double activation
// — the loser of the race) is the same generic 403 as every other
// activation failure, never a 500 and never a distinct "already activated"
// signal. Any other error is rethrown unchanged.
export function mapOwnerActivationError(error) {
  if (error instanceof MembershipError) return error;
  if (isUniqueViolation(error)) return GENERIC_403();
  return error;
}

// ---------------------------------------------------------------------------
// Token invalidation (S5-11). The hash lives in an env var, so there is no
// file to rewrite at runtime. Invalidation is therefore two in-process
// layers, and one durable layer:
//   1. The consumed hash is remembered in this process (module-level set)
//      — even if the owner row is later deleted, the same token can never
//      activate again in this process.
//   2. The in-memory env value is replaced with a fresh random unknown
//      scrypt hash, so a later read of the env var in this process finds
//      a value nobody knows.
//   3. Durable: the owner row itself blocks re-activation, AND the
//      operator must rotate the env var after activation (rotation doc
//      §2) — a server restart restores the env value from deployment
//      config, so rotation is what keeps a used token dead across
//      restarts. This is stated in the rotation doc, not hidden.
// ---------------------------------------------------------------------------
const consumedTokenHashes = new Set();

async function replaceStoredHashWithUnknown(config, env) {
  try {
    const unknown = await hashOwnerActivationToken(randomBytes(32).toString('base64url'));
    if (env && typeof env === 'object') env.AENURAL_OWNER_ACTIVATION_TOKEN_HASH = unknown;
    if (process.env && process.env !== env) process.env.AENURAL_OWNER_ACTIVATION_TOKEN_HASH = unknown;
  } catch {
    // Invalidation layer 1 (consumed set) + layer 3 (owner row) still hold.
  }
}

export async function activateOwner(db, config, input, setup = {}) {
  if (!config?.ownerOnly) throw new MembershipError('Not found.', 404);
  // `setup` is a test/override escape hatch only. Production callers pass
  // nothing and everything below is read from the environment at call time.
  const env = config?.env ?? process.env;
  const storedHash = typeof setup?.activationTokenHash === 'string'
    ? setup.activationTokenHash
    : (typeof env?.AENURAL_OWNER_ACTIVATION_TOKEN_HASH === 'string' ? env.AENURAL_OWNER_ACTIVATION_TOKEN_HASH : '');
  const supplied = typeof input?.token === 'string' && input.token.length <= 128 ? input.token : '';
  // One identical generic 403 for: wrong token, malformed stored hash,
  // consumed (already-used) token, weak password, placeholder/unconfigured
  // owner email, owner already exists. No status or message may distinguish
  // them (S5-11 oracle fix) — the token check runs first so an
  // already-activated account costs an attacker the same scrypt work.
  if (!storedHash || consumedTokenHashes.has(storedHash) || !(await verifyOwnerActivationToken(supplied, storedHash))) throw GENERIC_403();
  if (!isStrongOwnerPassword(input?.password)) throw GENERIC_403();
  const email = typeof setup?.email === 'string' && setup.email ? setup.email.trim().toLowerCase() : resolveOwnerEmail(env);
  if (!isUsableOwnerEmail(email)) throw GENERIC_403();
  // Hash before opening the write transaction. Only the verified token holder
  // can initialize this account; an existing owner can never be overwritten.
  // createdAt/updatedAt use dbTimestamp(): a millisecond epoch fails in
  // MySQL strict mode (timestamp(3) columns) — see service.mjs.
  const password = await hashPassword(input.password);
  const now = dbTimestamp();
  const userId = randomUUID();
  try {
    await db.transaction().execute(async tx => {
      if (await tx.selectFrom('user').select('id').where('email', '=', email).executeTakeFirst()) throw GENERIC_403();
      await tx.insertInto('user').values({ id: userId, name: 'Faisal', email, emailVerified: 1, createdAt: now, updatedAt: now }).execute();
      await tx.insertInto('account').values({ id: randomUUID(), userId, accountId: userId, providerId: 'credential', password, createdAt: now, updatedAt: now }).execute();
    });
  } catch (error) {
    throw mapOwnerActivationError(error);
  }
  // Invalidate the token now that the insert has committed (S5-11).
  consumedTokenHashes.add(storedHash);
  await replaceStoredHashWithUnknown(config, env);
  return { ok: true, email };
}
