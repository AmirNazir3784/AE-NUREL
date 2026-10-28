import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
export function guestIdentity(headers, config, create = false) {
  const name = config.local ? 'aenural-guest' : '__Host-aenural-guest';
  const value = headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(name + '='))?.slice(name.length + 1);
  const sign = id => createHmac('sha256', config.secret).update('caption-guest:' + id).digest('base64url');
  if (value && /^g[a-f0-9]{32}\.[A-Za-z0-9_-]{43}$/.test(value)) {
    const [id, signature] = value.split('.');
    if (timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id)))) return { id, cookie: null };
  }
  if (!create) return null;
  const id = 'g' + randomBytes(16).toString('hex');
  return { id, cookie: `${name}=${id}.${sign(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2678400${config.local ? '' : '; Secure'}` };
}
export function guestAccess(access) { return { ...access, premium: false, signedIn: false, owner: false, guest: true }; }
export async function ensureGuest(db, id) {
  // An unverified, non-login identity owns the quota rows. It has no password,
  // cannot sign in, and cannot be upgraded through a public registration route.
  const now = Date.now();
  await db.insertInto('user').values({ id, email: id + '@guest.invalid', name: 'Guest', emailVerified: 0, createdAt: now, updatedAt: now }).onConflict(conflict => conflict.column('id').doNothing()).execute();
}
