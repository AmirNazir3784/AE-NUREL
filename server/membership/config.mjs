import path from 'node:path';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolveMysqlTls, isLoopbackHost } from './mysql-tls.mjs';
import { resolveMembershipActivation, missingEnabledConfig } from './activation.mjs';
import { assertEmailTransportFlag } from './email-otp.mjs';

// Step 5 security review (S5-02 / S5-03): single shared allowlist for the
// trusted proxy-IP header. Until Hostinger confirms the value (gate G4 /
// S5-01, still UNCONFIRMED), the only accepted value is 'x-real-ip'.
// scripts/membership/release-check.mjs imports this same constant, so the
// two gates cannot disagree. If Hostinger ever confirms a different header,
// update this list to exactly that value at the same time — never widen it
// speculatively. 'x-forwarded-for' is unsafe here (no trustedProxies are
// configured, so multi-entry values collapse to one shared rate-limit
// counter and the leftmost entry is client-forgeable); 'cf-connecting-ip'
// is unsafe here (Hostinger CDN strips it, so any visitor can forge it).
export const TRUSTED_IP_HEADERS = Object.freeze(['x-real-ip']);

// Validate AUTH_TRUSTED_IP_HEADER and throw on any blank or unrecognised
// value. Callers must invoke this on every non-local path that requires
// the header (enabled mode AND owner-only mode) — see membershipConfig().
// A typo such as 'x-realip' must fail loudly at startup, never silently
// disable per-IP rate limiting.
export function assertTrustedIpHeader(env = process.env) {
  const raw = typeof env?.AUTH_TRUSTED_IP_HEADER === 'string' ? env.AUTH_TRUSTED_IP_HEADER : '';
  const value = raw.trim().toLowerCase();
  if (!value) throw new Error('Configure AUTH_TRUSTED_IP_HEADER before enabling account services. Confirm the value with Hostinger support — do not guess (see docs/authentication/trusted-proxy-ip.md).');
  if (TRUSTED_IP_HEADERS.includes(value)) return value;
  if (value === 'x-forwarded-for') throw new Error("AUTH_TRUSTED_IP_HEADER must be the Hostinger-confirmed value (x-real-ip); got 'x-forwarded-for'. Without trustedProxies, x-forwarded-for collapses to a shared rate-limit counter and its leftmost entry is client-forgeable — see docs/authentication/trusted-proxy-ip.md.");
  if (value === 'cf-connecting-ip') throw new Error("AUTH_TRUSTED_IP_HEADER must be the Hostinger-confirmed value (x-real-ip); got 'cf-connecting-ip'. Hostinger CDN strips cf-connecting-ip, so any visitor can forge it — see docs/authentication/trusted-proxy-ip.md.");
  throw new Error(`AUTH_TRUSTED_IP_HEADER must be the Hostinger-confirmed value (x-real-ip); got unrecognised value '${value}' — see docs/authentication/trusted-proxy-ip.md.`);
}

export function membershipConfig(env = process.env) {
  const local = env.NODE_ENV !== 'production' && env.AENURAL_MEMBERSHIP_DATABASE !== 'mysql';
  // "production" is the deployment environment, NOT the database engine
  // (Phase 4 audit F1). The old code keyed the HTTPS and trusted-header
  // requirements on `!local`, which is false for remote-MySQL development
  // too — so the documented dev setup (DATABASE=mysql +
  // BETTER_AUTH_URL=http://localhost:3000, AUTH_TRUSTED_IP_HEADER left
  // blank per the wizard/guide) threw on EVERY auth call.
  const production = env.NODE_ENV === 'production';
  // Single source of truth for the on/off switch (Phase 4, Worker D):
  // see server/membership/activation.mjs. Production with the flag off
  // is now fully disabled — owner-only mode is entered only with the
  // explicit AENURAL_OWNER_TEST_MODE=1 opt-in, never implied by
  // "not enabled".
  const activation = resolveMembershipActivation(env);
  const ownerOnly = activation.ownerOnly;
  const sqlite = local || ownerOnly;
  if (!activation.enabled) return null;
  const origin = new URL(env.BETTER_AUTH_URL || (production ? 'https://aenural.com' : 'http://localhost:3000'));
  if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password || !['http:', 'https:'].includes(origin.protocol)) throw new Error('Set BETTER_AUTH_URL to the exact website origin.');
  // HTTPS is a production requirement. Loopback origins are excepted:
  // MySQL mode is not the same as production — local MySQL integration
  // testing runs the app on http://localhost:3000 against a loopback
  // database, and the traffic never leaves the machine. Any non-loopback
  // origin in production must still be HTTPS.
  if (production && origin.protocol !== 'https:' && !isLoopbackHost(origin.hostname)) throw new Error('Production account services require HTTPS.');
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
  // Fail closed when public membership is enabled without its secure
  // configuration: the missing key NAMES (never values) are listed in the
  // server-side error, and no auth object, database pool or mail transport
  // is created. Production never falls back to SQLite here (sqlite is
  // false in this branch — see openMembershipDatabase).
  // Step 5 security review (S5-06): the trusted proxy-IP header is
  // required whenever the app is NOT local (!local), regardless of
  // NODE_ENV. The old code dropped the header from the missing list
  // whenever NODE_ENV was not 'production', so a non-local dev/staging
  // deploy (remote MySQL, NODE_ENV unset/development) started auth with
  // no header requirement. This intentionally tightens the documented
  // local-MySQL dev setup too: devs set
  // AUTH_TRUSTED_IP_HEADER=x-real-ip in .env.local (already the
  // documented value in config/membership.env.example:95).
  let missing = !local && !ownerOnly ? missingEnabledConfig(env) : [];
  if (missing.length) throw new Error('Configure MySQL, email and the trusted proxy-IP header before enabling account services. Missing: ' + missing.join(', ') + '.');
  // Step 5 security review (S5-03): validate the header VALUE against
  // the shared allowlist (TRUSTED_IP_HEADERS) on every non-local path
  // that requires it — enabled mode AND owner-only mode. A blank value
  // in owner-only mode throws here (missingEnabledConfig does not cover
  // owner-only mode); a typo or unsafe value throws in both modes.
  // Local/SQLite mode (local === true) is unaffected: it reads
  // 'x-forwarded-for' from localhost traffic per auth.mjs.
  if (!local) assertTrustedIpHeader(env);
  // Step 5 security review (S5-32, second half): a non-loopback origin
  // with NODE_ENV !== 'production' is a misconfiguration cliff — Secure
  // cookies and the trusted IP header would both be keyed off dev
  // assumptions on a public host. Fail loudly instead of serving auth
  // that way. Two exemptions, both test-only: NODE_ENV=test (the
  // automated test harness), and reserved test-only hostnames (RFC 2606
  // .test / .example / .invalid / .localhost — the MySQL integration
  // suite deliberately runs development mode against the fake origin
  // https://aenural-mysql.test, and those names can never be a real
  // deployment origin). A real deployment never runs with NODE_ENV=test,
  // and release:check already fails any non-production NODE_ENV with
  // membership on. Loopback origins (local dev / tests on
  // http://localhost:3000) are unaffected. This runs after the header
  // validation above so missing-header errors keep their own message.
  const testOnlyHost = ['.test', '.example', '.invalid', '.localhost'].some((suffix) => origin.hostname.toLowerCase().endsWith(suffix));
  if (!production && env.NODE_ENV !== 'test' && !testOnlyHost && !isLoopbackHost(origin.hostname)) throw new Error('Account services require NODE_ENV=production on a non-loopback origin (BETTER_AUTH_URL must be a loopback address for development/test runs).');
  // --- Email transport (AENURAL_EMAIL_TRANSPORT) ---
  //   * unset (default): SMTP whenever SMTP_HOST/SMTP_USER/SMTP_PASSWORD/
  //     MAIL_FROM are configured; in local mode with no SMTP, sending
  //     fails loudly at send time instead of silently writing mail to
  //     disk (see resolveEmailTransport in email-otp.mjs).
  //   * "smtp": require the SMTP variables; a missing one is a send-time
  //     configuration error, never a silent downgrade.
  //   * "local-outbox": write account mail as mail-*.json into the local
  //     data directory. Local/SQLite mode ONLY, for development and
  //     tests — outbox files contain live verification codes. This
  //     assertion rejects it (and any unknown value) at startup.
  assertEmailTransportFlag(env, { local, sqlite });
  // MySQL TLS (fail-closed). Loopback (production on Hostinger, 127.0.0.1)
  // uses a plain connection; any remote host requires verified TLS — either
  // a readable CA bundle (DB_SSL_CA_FILE) or the explicit public-CA opt-in
  // (DB_TLS_ALLOW_PUBLIC_CA=1, still rejectUnauthorized: true). This throws
  // here, before any pool is created, so a bad TLS configuration can never
  // silently connect unencrypted. Production with membership enabled never
  // falls back to SQLite: sqlite is false here, and openMembershipDatabase
  // throws loudly if the MySQL pool cannot be established.
  const mysqlTls = !sqlite ? resolveMysqlTls(env) : null;
  return { local, sqlite, ownerOnly, mode: activation.mode, origin: origin.origin, directory, secret, env, mysqlTls };
}
