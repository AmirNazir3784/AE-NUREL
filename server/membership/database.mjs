import { Kysely, MysqlDialect, SqliteDialect } from 'kysely';
import { membershipConfig } from './config.mjs';
import { createPool } from 'mysql2';
import { buildMysqlPoolOptions, resolveMysqlTls, assertEncryptedSession } from './mysql-tls.mjs';

const key = Symbol.for('aenural.membership.database.v1');

// Connect once, run SELECT 1, and prove the session is encrypted when the
// configured profile requires TLS. Logs/throws only the host, TLS version,
// cipher and error code — never credentials or connection strings.
// `promisePool` is a mysql2/promise pool (or a duck-typed stand-in in tests).
export async function verifyMysqlConnection(promisePool, tls) {
  const connection = await promisePool.getConnection();
  try {
    await connection.query('SELECT 1');
    const [rows] = await connection.query("SHOW SESSION STATUS LIKE 'Ssl_version'");
    const sslVersion = rows?.[0]?.Value ?? rows?.[0]?.value ?? '';
    const [cipherRows] = await connection.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'");
    const sslCipher = cipherRows?.[0]?.Value ?? cipherRows?.[0]?.value ?? '';
    if (tls?.ssl) {
      assertEncryptedSession(sslVersion, tls.host);
      return { host: tls.host, profile: tls.profile, encrypted: true, tlsVersion: String(sslVersion), cipher: String(sslCipher || '') };
    }
    return { host: tls?.host, profile: tls?.profile || 'loopback', encrypted: Boolean(String(sslVersion || '').trim()), tlsVersion: String(sslVersion || ''), cipher: String(sslCipher || '') };
  } finally {
    connection.release();
  }
}

export async function openMembershipDatabase(config) {
  if (!(config.sqlite ?? config.local)) {
    // MySQL mode. Production never falls back to SQLite: if the pool
    // cannot be established (or a remote host cannot prove an encrypted
    // session), this throws loudly instead of swapping engines.
    const env = config.env;
    const tls = config.mysqlTls || resolveMysqlTls(env);
    const pool = createPool(buildMysqlPoolOptions(env));
    // Idle-connection failures must not crash the process unhandled, and
    // must never leak credentials: log only the error code/name.
    pool.on('error', error => console.error('[membership] MySQL pool error:', error?.code || error?.name || 'POOL_ERROR'));
    const promisePool = pool.promise();
    const connection = await verifyMysqlConnection(promisePool, tls);
    if (tls.ssl) console.log(`[membership] MySQL connected to ${connection.host} over ${connection.tlsVersion}${connection.cipher ? ` (${connection.cipher})` : ''}.`);
    return { db: new Kysely({ dialect: new MysqlDialect({ pool }) }), authDatabase: promisePool, dialect: 'mysql', config, connection };
  }
  const { DatabaseSync } = await import('node:sqlite');
  const native = new DatabaseSync(config.directory + '/accounts.sqlite');
  native.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  // Kysely's better-sqlite3 protocol over Node's built-in SQLite. Better Auth
  // itself accepts DatabaseSync directly; no extra native package is required.
  const database = { close: () => native.close(), prepare(sql) {
    const statement = native.prepare(sql);
    return { reader: statement.columns().length > 0, all: parameters => statement.all(...parameters), run: parameters => statement.run(...parameters), iterate: parameters => statement.iterate(...parameters) };
  } };
  return { db: new Kysely({ dialect: new SqliteDialect({ database }) }), authDatabase: native, dialect: 'sqlite', config };
}
export async function membershipDatabase() {
  const config = membershipConfig();
  if (!config) throw new Error('Account services are unavailable.');
  globalThis[key] ||= openMembershipDatabase(config);
  return globalThis[key];
}
