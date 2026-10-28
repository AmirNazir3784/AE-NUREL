import path from 'node:path';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';

export function membershipConfig(env = process.env) {
  const local = env.NODE_ENV !== 'production' && env.AENURAL_MEMBERSHIP_DATABASE !== 'mysql';
  const ownerOnly = env.AENURAL_OWNER_TEST_MODE === '1' || env.NODE_ENV === 'production' && env.AENURAL_MEMBERSHIP_ENABLED !== '1' && env.AENURAL_OWNER_TEST_MODE !== '0';
  const sqlite = local || ownerOnly;
  const enabled = ownerOnly || env.AENURAL_MEMBERSHIP_ENABLED === '1' || env.NODE_ENV === 'development' && env.AENURAL_MEMBERSHIP_DISABLED !== '1';
  if (!enabled) return null;
  const origin = new URL(env.BETTER_AUTH_URL || (local ? 'http://localhost:3000' : 'https://aenural.com'));
  if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password || !['http:', 'https:'].includes(origin.protocol)) throw new Error('Set BETTER_AUTH_URL to the exact website origin.');
  if (!local && origin.protocol !== 'https:') throw new Error('Production account services require HTTPS.');
  const directory = path.resolve(ownerOnly ? env.AENURAL_OWNER_DATA_DIR || '.aenural-local/owner' : env.AENURAL_LOCAL_DATA_DIR || '.aenural-local');
  const publicDirectory = path.resolve('public') + path.sep;
  if (directory === path.resolve('public') || directory.startsWith(publicDirectory)) throw new Error('Account data must stay outside public website assets.');
  let secret = env.BETTER_AUTH_SECRET;
  if (sqlite) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (!secret) {
      const location = path.join(directory, 'auth-secret');
      try { fs.writeFileSync(location, randomBytes(48).toString('base64url'), { flag: 'wx', mode: 0o600 }); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      secret = fs.readFileSync(location, 'utf8');
    }
  }
  if (!secret || secret.length < 32) throw new Error('Set a strong BETTER_AUTH_SECRET of at least 32 characters.');
  if (!local && !ownerOnly && !['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM','AUTH_TRUSTED_IP_HEADER'].every(key => env[key])) throw new Error('Configure MySQL, email and the trusted proxy-IP header before enabling account services.');
  return { local, sqlite, ownerOnly, origin: origin.origin, directory, secret, env };
}
