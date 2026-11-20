import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { dbTimestamp } from './service.mjs';
// Whether guest cookies get the Secure flag and the __Host- prefix
// (S5-32): derived from the configured origin's protocol — https:
// origins get Secure + __Host-, plain-http origins (local development
// on http://localhost:3000) get neither. Falls back to !config.local
// only when no origin is configured.
export function guestSecureCookies(config) {
  if (typeof config?.origin === 'string' && config.origin) return config.origin.startsWith('https:');
  return !config?.local;
}
export function guestIdentity(headers, config, create = false) {
  const secure = guestSecureCookies(config);
  const name = secure ? '__Host-aenural-guest' : 'aenural-guest';
  const value = headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(name + '='))?.slice(name.length + 1);
  const sign = id => createHmac('sha256', config.secret).update('caption-guest:' + id).digest('base64url');
  if (value && /^g[a-f0-9]{32}\.[A-Za-z0-9_-]{43}$/.test(value)) {
    const [id, signature] = value.split('.');
    if (timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id)))) return { id, cookie: null };
  }
  if (!create) return null;
  const id = 'g' + randomBytes(16).toString('hex');
  return { id, cookie: `${name}=${id}.${sign(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2678400${secure ? '; Secure' : ''}` };
}
export function guestAccess(access) { return { ...access, premium: false, signedIn: false, owner: false, guest: true }; }
export async function ensureGuest(db, id) {
  // An unverified, non-login identity owns the quota rows. It has no password,
  // cannot sign in, and cannot be upgraded through a public registration route.
  // createdAt/updatedAt use dbTimestamp(): a millisecond epoch fails in
  // MySQL strict mode (timestamp(3) columns) and a Date object cannot be
  // bound by node:sqlite — see service.mjs.
  const now = dbTimestamp();
  await db.insertInto('user').values({ id, email: id + '@guest.invalid', name: 'Guest', emailVerified: 0, createdAt: now, updatedAt: now }).onConflict(conflict => conflict.column('id').doNothing()).execute();
}
// Guest-row prune (S5-34) — retention decision: guest user rows are
// anonymous, single-use identities with no password and no way back
// (clearing the cookie orphans the row forever), so they are deleted
// once they are older than `olderThanDays` (default 90) AND have no
// rows in any activity/quota table (aenural_daily_usage,
// aenural_caption_jobs, aenural_activity). A guest with any such row
// is kept: its quota history is still meaningful for abuse review.
// Runs best-effort at startup (see membershipAuth in auth.mjs); a
// failure must never block startup. Returns the number of rows
// deleted. The createdAt comparison uses the dbTimestamp() string
// format ('YYYY-MM-DD HH:MM:SS.mmm', UTC), which compares correctly
// lexicographically in SQLite and against MySQL timestamp(3) columns.
export async function pruneStaleGuests(db, { olderThanDays = 90, nowMs = Date.now() } = {}) {
  const cutoff = dbTimestamp(nowMs - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await db.deleteFrom('user')
    .where('email', 'like', '%@guest.invalid')
    .where('createdAt', '<', cutoff)
    .where((eb) => eb.not(eb.exists(
      eb.selectFrom('aenural_daily_usage').select('id').whereRef('aenural_daily_usage.owner_id', '=', 'user.id'),
    )))
    .where((eb) => eb.not(eb.exists(
      eb.selectFrom('aenural_caption_jobs').select('id').whereRef('aenural_caption_jobs.owner_id', '=', 'user.id'),
    )))
    .where((eb) => eb.not(eb.exists(
      eb.selectFrom('aenural_activity').select('id').whereRef('aenural_activity.owner_id', '=', 'user.id'),
    )))
    .executeTakeFirst();
  return Number(result.numDeletedRows || 0);
}
