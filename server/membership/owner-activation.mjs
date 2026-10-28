import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import bootstrap from './owner-bootstrap.json' with { type: 'json' };
import { MembershipError } from './service.mjs';

export const ownerEmail = bootstrap.email;
export async function activateOwner(db, config, input, setup = bootstrap) {
  const ownerEmail = setup.email;
  if (!config.ownerOnly) throw new MembershipError('Not found.', 404);
  const supplied = typeof input?.token === 'string' && input.token.length <= 128 ? input.token : '';
  const digest = createHash('sha256').update(supplied).digest();
  if (!timingSafeEqual(digest, Buffer.from(setup.activationTokenHash, 'hex'))) throw new MembershipError('This activation could not be verified.', 403);
  if (typeof input?.password !== 'string' || input.password.length < 16 || input.password.length > 128) throw new MembershipError('Use a password between 16 and 128 characters.');
  // Hash before opening the write transaction. Only the verified token holder
  // can initialize this account; an existing owner can never be overwritten.
  const password = await hashPassword(input.password), now = Date.now();
  const userId = randomUUID();
  await db.transaction().execute(async tx => {
    if (await tx.selectFrom('user').select('id').where('email', '=', ownerEmail).executeTakeFirst()) throw new MembershipError('This owner account is already activated.', 410);
    await tx.insertInto('user').values({ id: userId, name: 'Faisal', email: ownerEmail, emailVerified: 1, createdAt: now, updatedAt: now }).execute();
    await tx.insertInto('account').values({ id: randomUUID(), userId, accountId: userId, providerId: 'credential', password, createdAt: now, updatedAt: now }).execute();
  });
  return { ok: true, email: ownerEmail };
}
