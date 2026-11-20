// MySQL TLS profiles for AENural membership (Better Auth + mysql2).
// Pure functions only: no mysql2/kysely/better-auth import, so this module
// is unit-testable without any dependency installed.
//
// Two explicit profiles, selected from the configured host — never by
// silently falling back from one to the other:
//   * loopback (127.0.0.1 / ::1 / localhost, incl. 127.x.x.x): plain TCP.
//     This is the Hostinger production profile: the app runs on the same
//     host as MySQL, traffic never leaves the host, and Hostinger's own
//     Node.js/MySQL guide shows a plain pool with no `ssl` option.
//     Production MUST use DB_HOST=127.0.0.1 (never `localhost`, which Node
//     resolves to IPv6 ::1 and Hostinger rejects, and never srv*.hstgr.io).
//   * remote (any other host, e.g. srv2224.hstgr.io for dev from the PC):
//     TLS is REQUIRED and verified, or the app refuses to start.
//     `rejectUnauthorized` is ALWAYS true; there is no flag that disables
//     verification. Either a CA bundle file is pinned via DB_SSL_CA_FILE
//     (path to a PEM file on disk — never PEM contents in an env var), or
//     the operator explicitly opts in to the public-CA trust store with
//     DB_TLS_ALLOW_PUBLIC_CA=1 (still verified against Node's built-in
//     trust store; only works if the server cert chains to a public CA).
//     Whether srv2224.hstgr.io offers TLS / a publicly-chained cert is
//     UNVERIFIED — probe it from the allowlisted PC before relying on
//     the public-CA opt-in; if it is privately signed, get the CA from
//     Hostinger support (or use an SSH tunnel) instead of disabling
//     verification.
import { readFileSync } from 'node:fs';

export const MYSQL_TLS_MIN_VERSION = 'TLSv1.2';

// Better Auth core tables + AENural application tables. Used by the
// MySQL readiness check (scripts/membership/verify-mysql.mjs).
export const REQUIRED_MYSQL_TABLES = [
  'user', 'session', 'account', 'verification', 'rateLimit',
  'aenural_operation_limits', 'aenural_orders', 'aenural_checkouts',
  'aenural_webhooks', 'aenural_daily_usage', 'aenural_caption_jobs',
  'aenural_projects', 'aenural_activity',
  'aenural_email_delivery_attempts',
];

export function isLoopbackHost(host) {
  if (!host) return true; // unset DB_HOST defaults to 127.0.0.1
  const value = String(host).trim().toLowerCase();
  return value === 'localhost' || value === '::1' || value === '[::1]'
    || /^127\.\d+\.\d+\.\d+$/.test(value);
}

// Validate the DB_TLS_ALLOW_PUBLIC_CA switch. Only '1' opts in; anything
// else that is set and non-empty is a configuration error, not a silent no.
export function publicCaOptIn(env = process.env) {
  const value = env.DB_TLS_ALLOW_PUBLIC_CA;
  if (value === undefined || value === '' || value === '0') return false;
  if (value === '1') return true;
  throw new Error('DB_TLS_ALLOW_PUBLIC_CA must be 1 to opt in, or 0/unset to require a CA file for remote MySQL.');
}

// Resolve the TLS settings for a MySQL host. Throws (fail-closed) for a
// remote host with no verifiable TLS configuration. Never returns
// rejectUnauthorized: false.
// verifyIdentity: true is REQUIRED, not optional: mysql2 3.24.6 ignores
// ssl.servername unless verifyIdentity is set, so without it a remote
// host presenting a valid CA-signed certificate for a DIFFERENT hostname
// would be accepted (proven by tests/membership-mysql.test.mjs, Phase 4).
export function resolveMysqlTls(env = process.env, readFile = readFileSync) {
  const host = String(env.DB_HOST || '127.0.0.1').trim();
  if (isLoopbackHost(host)) return { profile: 'loopback', host, ssl: undefined };
  const caFile = env.DB_SSL_CA_FILE ? String(env.DB_SSL_CA_FILE).trim() : '';
  if (caFile) {
    let ca;
    try {
      ca = readFile(caFile, 'utf8');
    } catch (error) {
      throw new Error(
        `DB_SSL_CA_FILE points to a file that cannot be read (${caFile}): ${error.code || error.name || 'read error'}. ` +
        'Set it to a readable PEM file on disk, or remove it and set DB_TLS_ALLOW_PUBLIC_CA=1 only if the server certificate chains to a public CA.',
      );
    }
    if (!ca || !ca.trim()) throw new Error(`DB_SSL_CA_FILE is empty (${caFile}). Provide a PEM CA bundle or remove the setting.`);
    return { profile: 'remote', host, ssl: { ca, rejectUnauthorized: true, minVersion: MYSQL_TLS_MIN_VERSION, servername: host, verifyIdentity: true } };
  }
  if (publicCaOptIn(env)) {
    return { profile: 'remote-public-ca', host, ssl: { rejectUnauthorized: true, minVersion: MYSQL_TLS_MIN_VERSION, servername: host, verifyIdentity: true } };
  }
  throw new Error(
    `Remote MySQL host (${host}) requires verified TLS. Set DB_SSL_CA_FILE to a readable PEM CA bundle, ` +
    'or set DB_TLS_ALLOW_PUBLIC_CA=1 only if the server certificate chains to a public CA. ' +
    'Unverified remote MySQL connections are refused; rejectUnauthorized is never disabled.',
  );
}

// mysql2 pool options for the configured host. Keeps the existing pool
// behaviour (connectionLimit 5, bounded queue, 10 s connect timeout,
// utf8mb4, timezone Z) and never disables mysql2's default
// CLIENT_FOUND_ROWS flag, which the Better Auth/Kysely adapter relies on.
export function buildMysqlPoolOptions(env = process.env) {
  const { ssl } = resolveMysqlTls(env);
  const options = {
    host: String(env.DB_HOST || '127.0.0.1').trim(),
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: 'utf8mb4',
    timezone: 'Z',
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 20,
    connectTimeout: 10000,
    multipleStatements: false,
  };
  if (ssl) options.ssl = ssl;
  return options;
}

// Pure check for a session TLS probe: SHOW SESSION STATUS LIKE
// 'Ssl_version' returns an empty value when the session is unencrypted.
// `sslVersion` is the raw value (string, null or undefined).
export function assertEncryptedSession(sslVersion, host) {
  const version = typeof sslVersion === 'string' ? sslVersion.trim() : '';
  if (!version) {
    throw new Error(
      `MySQL session to ${host} is NOT encrypted (Ssl_version is empty) but TLS is required for this host. ` +
      'Refusing to continue without an encrypted connection.',
    );
  }
  return version;
}

// Pure schema check: given the table names found in the database,
// return the required tables that are missing.
export function missingMysqlTables(foundTables) {
  const found = new Set((foundTables || []).map(name => String(name).toLowerCase()));
  return REQUIRED_MYSQL_TABLES.filter(name => !found.has(name.toLowerCase()));
}
