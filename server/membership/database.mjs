import { Kysely, MysqlDialect, SqliteDialect } from 'kysely';
import { membershipConfig } from './config.mjs';
import { createPool } from 'mysql2';

const key = Symbol.for('aenural.membership.database.v1');
export async function openMembershipDatabase(config) {
  if (!(config.sqlite ?? config.local)) {
    const env = config.env;
    const pool = createPool({ host: env.DB_HOST || '127.0.0.1', port: Number(env.DB_PORT || 3306), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME, charset: 'utf8mb4', timezone: 'Z', connectionLimit: 5, waitForConnections: true, queueLimit: 20, connectTimeout: 10000, multipleStatements: false });
    return { db: new Kysely({ dialect: new MysqlDialect({ pool }) }), authDatabase: pool.promise(), dialect: 'mysql', config };
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
