// AENural membership — real MySQL integration tests.
//
// Runs against a DISPOSABLE MySQL database. Never points at the Hostinger
// dev/production database (srv2224.hstgr.io) and never at any production
// data. The suite is gated: it only runs when AENURAL_MYSQL_TEST_DB is set
// (see "Running" below), so `npm test` on a machine without MySQL skips it
// instead of failing.
//
// What this verifies, against the ACTUAL app code (not mocks):
//   * server/membership/mysql-tls.mjs — fail-closed TLS profiles
//   * server/membership/database.mjs — openMembershipDatabase /
//     verifyMysqlConnection / membershipDatabase (real mysql2 pool + Kysely)
//   * server/membership/auth.mjs — membershipAuth() / authOptions() with the
//     real Better Auth 1.7.14 instance (sign-up, OTP verify, sessions,
//     login/logout, password reset) over the real MySQL adapter
//   * server/membership/migrations/001-initial-mysql.sql — the exact file an
//     operator imports (the app never auto-migrates MySQL)
//
// Running (local, disposable MySQL 8.0):
//   mysql -u root -e "CREATE DATABASE aenural_mysql_test CHARACTER SET utf8mb4;
//     CREATE DATABASE aenural_mysql_test_empty CHARACTER SET utf8mb4;
//     CREATE DATABASE aenural_mysql_test_bad CHARACTER SET utf8mb4;
//     CREATE USER 'aenural_test'@'127.0.0.1' IDENTIFIED BY '<temp-password>';
//     GRANT ALL PRIVILEGES ON aenural_mysql_test.* TO 'aenural_test'@'127.0.0.1';
//     GRANT ALL PRIVILEGES ON aenural_mysql_test_empty.* TO 'aenural_test'@'127.0.0.1';
//     GRANT ALL PRIVILEGES ON aenural_mysql_test_bad.* TO 'aenural_test'@'127.0.0.1';"
//   AENURAL_MYSQL_TEST_DB=aenural_mysql_test \
//   AENURAL_MYSQL_TEST_USER=aenural_test \
//   AENURAL_MYSQL_TEST_PASSWORD='<temp-password>' \
//   AENURAL_MYSQL_TEST_EMPTY_DB=aenural_mysql_test_empty \
//   AENURAL_MYSQL_TEST_BAD_DB=aenural_mysql_test_bad \
//   node --test tests/membership-mysql.test.mjs
//
// TLS tests need a TLS-enabled mysqld plus a private CA (see
// MYSQL-REPORT.md for the exact local setup) and are skipped unless:
//   AENURAL_MYSQL_TLS_CA_FILE, AENURAL_MYSQL_TLS_WRONG_CA_FILE,
//   AENURAL_MYSQL_TLS_USER, AENURAL_MYSQL_TLS_PASSWORD, AENURAL_MYSQL_TLS_DB
// are set (host/port default to 127.0.0.1:3307). The remote-host end-to-end
// TLS test additionally needs AENURAL_MYSQL_TLS_REMOTE_HOST (e.g. `mysql`
// in GitHub Actions, where the service hostname resolves via Docker DNS).
// The hostname-SAN rejection test additionally needs
// AENURAL_MYSQL_TLS_MAIN_CA_FILE (the main mysqld's CA).
// mysql2 3.24.6 behaviour the TLS tests pin down: ssl.servername is
// IGNORED unless ssl.verifyIdentity is set. The app profile
// (resolveMysqlTls, Phase 4) now sets verifyIdentity: true on remote
// hosts, closing that gap; the driver-level test below still documents
// the raw mysql2 behaviour. See MYSQL-REPORT.md.
//
// Email: MySQL mode only sends mail via SMTP, so the suite starts a local
// implicit-TLS SMTP sink (tests/helpers/mysql-test-kit.mjs) and reads the
// real OTP codes / reset links out of the captured mail. Nothing is ever
// delivered to a real mailbox. The app verifies SMTP TLS, so Node must trust
// the sink's test CA — run with:
//   NODE_EXTRA_CA_CERTS=tests/fixtures/smtp-sink-ca.pem node --test tests/membership-mysql.test.mjs
// (the fixture cert/key are test-only, valid for 127.0.0.1/localhost only;
// see tests/fixtures/README.md). Without it, every sign-up fails at the
// mail health pre-check with "SMTP verification failed: ESOCKET".
//
// Hostinger compatibility assumptions under test: MySQL 8.0, utf8mb4,
// InnoDB, TLS 1.2+ for remote hosts.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createPool } from 'mysql2';
import {
  createSmtpSink,
  runMigration,
  dropAllTables,
} from './helpers/mysql-test-kit.mjs';

const ENABLED = Boolean(process.env.AENURAL_MYSQL_TEST_DB);
const ORIGIN = 'https://aenural-mysql.test';
const PASSWORD = 'Test-Password-1234';
const MIGRATION_PATH = new URL(
  '../server/membership/migrations/001-initial-mysql.sql',
  import.meta.url,
);

const TEST = {
  host: process.env.AENURAL_MYSQL_TEST_HOST || '127.0.0.1',
  port: Number(process.env.AENURAL_MYSQL_TEST_PORT || 3306),
  database: process.env.AENURAL_MYSQL_TEST_DB,
  user: process.env.AENURAL_MYSQL_TEST_USER || 'aenural_test',
  password: process.env.AENURAL_MYSQL_TEST_PASSWORD || '',
  emptyDatabase:
    process.env.AENURAL_MYSQL_TEST_EMPTY_DB ||
    `${process.env.AENURAL_MYSQL_TEST_DB}_empty`,
  badDatabase:
    process.env.AENURAL_MYSQL_TEST_BAD_DB ||
    `${process.env.AENURAL_MYSQL_TEST_DB}_bad`,
};

const TLS = {
  enabled: Boolean(process.env.AENURAL_MYSQL_TLS_CA_FILE),
  host: process.env.AENURAL_MYSQL_TLS_HOST || '127.0.0.1',
  port: Number(process.env.AENURAL_MYSQL_TLS_PORT || 3307),
  caFile: process.env.AENURAL_MYSQL_TLS_CA_FILE || '',
  wrongCaFile: process.env.AENURAL_MYSQL_TLS_WRONG_CA_FILE || '',
  user: process.env.AENURAL_MYSQL_TLS_USER || '',
  password: process.env.AENURAL_MYSQL_TLS_PASSWORD || '',
  database: process.env.AENURAL_MYSQL_TLS_DB || '',
  // Non-loopback hostname the TLS server's cert is valid for, when one is
  // available (CI service hostname `mysql`). Unset locally: this VM has no
  // resolvable non-loopback hostname for its mysqld (see MYSQL-REPORT.md).
  remoteHost: process.env.AENURAL_MYSQL_TLS_REMOTE_HOST || '',
  // CA of the main (non-TLS-test) mysqld, for the hostname-SAN rejection
  // test. Optional; the test skips without it.
  mainCaFile: process.env.AENURAL_MYSQL_TLS_MAIN_CA_FILE || '',
};

if (!ENABLED) {
  it('MySQL integration tests are gated on AENURAL_MYSQL_TEST_DB', () => {
    // Deliberately a passing no-op: without a disposable MySQL database
    // configured, `npm test` must skip this suite instead of failing.
    // Set AENURAL_MYSQL_TEST_DB (and friends) to run it; see the header.
    assert.ok(true, 'set AENURAL_MYSQL_TEST_DB to run the MySQL suite');
  });
}

describe('membership MySQL integration', { skip: !ENABLED }, () => {
  let tmpdir;
  let sink;
  let rawPool; // mysql2 promise pool for migration + direct SQL assertions
  let auth; // real Better Auth instance (membershipAuth)
  let migrationStatements = [];
  let emailCounter = 0;
  let ipCounter = 0;
  // Every { db, authDatabase } opened during the suite, closed in after().
  const closables = [];

  // App modules (loaded in before(), after env is configured).
  let mysqlTls;
  let databaseModule;
  let authModule;
  let configModule;

  const uniqueEmail = (tag) =>
    `${tag}-${++emailCounter}-${randomBytes(4).toString('hex')}@example.test`;

  /** Call the real Better Auth handler. IPs rotate to stay under per-IP rate limits. */
  async function call(endpoint, body, { cookie, method = 'POST' } = {}) {
    const ip = `10.20.30.${(ipCounter++ % 200) + 1}`;
    const headers = {
      origin: ORIGIN,
      'content-type': 'application/json',
      'x-real-ip': ip,
    };
    if (cookie) headers.cookie = cookie;
    return auth.handler(
      new Request(`${ORIGIN}/api/auth/${endpoint}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  }

  async function callJson(endpoint, body, options) {
    const response = await call(endpoint, body, options);
    let parsed = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }
    return { response, body: parsed };
  }

  function sessionCookie(response) {
    return (response.headers.getSetCookie?.() || [])
      .map((value) => value.split(';')[0])
      .join('; ');
  }

  /** Direct SQL against the test database (assertions + test setup). */
  async function q(sql, params = []) {
    const [rows] = await rawPool.query(sql, params);
    return rows;
  }

  /** Poll the SMTP sink for a new message to `email` after `sinceCount`. */
  async function mailAfter(email, subjectPart, sinceCount, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const found = sink.messages
        .slice(sinceCount)
        .find((m) => m.raw.includes(email) && m.raw.includes(subjectPart));
      if (found) return found;
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for "${subjectPart}" mail to ${email}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async function otpFor(email, sinceCount = 0) {
    const message = await mailAfter(email, 'Your AENural verification code', sinceCount);
    const code = message.text.match(/\b(\d{6})\b/)?.[1];
    assert.ok(code, `OTP mail to ${email} must contain a 6-digit code`);
    return { code, message };
  }

  async function resetTokenFor(email, sinceCount = 0) {
    const message = await mailAfter(email, 'Reset your AENural password', sinceCount);
    const url = message.text.match(/https?:\/\/[^\s]+/)?.[0];
    assert.ok(url, `reset mail to ${email} must contain a URL`);
    const token = new URL(url).pathname.split('/').filter(Boolean).at(-1);
    assert.ok(token, 'reset URL must carry a token');
    return { token, url, message };
  }

  async function register(email, name = 'Test User') {
    const { response, body } = await callJson('sign-up/email', {
      name,
      email,
      password: PASSWORD,
      callbackURL: `${ORIGIN}/sign-in`,
    });
    assert.equal(
      response.status,
      200,
      `sign-up ${email} -> ${response.status} ${JSON.stringify(body)}`,
    );
    assert.ok(body.user?.id, 'sign-up must return a user id');
    return body.user;
  }

  async function verifyOtp(email, otp) {
    return callJson('email-otp/verify-email', { email, otp });
  }

  async function registerAndVerify(email) {
    const since = sink.messages.length;
    const user = await register(email);
    const { code } = await otpFor(email, since);
    const { response, body } = await verifyOtp(email, code);
    assert.equal(
      response.status,
      200,
      `verify ${email} -> ${response.status} ${JSON.stringify(body)}`,
    );
    assert.equal(body.user?.emailVerified, true);
    return { user, cookie: sessionCookie(response) };
  }

  before(async () => {
    tmpdir = await mkdtemp(path.join(os.tmpdir(), 'aenural-mysql-test-'));
    sink = await createSmtpSink();

    // App configuration for MySQL mode. No Hostinger values anywhere:
    // loopback host, disposable database, local SMTP sink.
    process.env.NODE_ENV = 'development';
    process.env.AENURAL_MEMBERSHIP_DATABASE = 'mysql';
    process.env.BETTER_AUTH_URL = ORIGIN;
    process.env.BETTER_AUTH_SECRET = 'test-secret-that-is-at-least-32-chars-long';
    process.env.DB_HOST = TEST.host;
    process.env.DB_PORT = String(TEST.port);
    process.env.DB_NAME = TEST.database;
    process.env.DB_USER = TEST.user;
    process.env.DB_PASSWORD = TEST.password;
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = String(sink.port);
    process.env.SMTP_SECURE = 'true';
    process.env.SMTP_USER = 'test@aenural.test';
    process.env.SMTP_PASSWORD = 'test-smtp-password';
    process.env.MAIL_FROM = 'test@aenural.test';
    // 'x-real-ip' is the only header value that passes startup
    // validation (S5-02/S5-03/S5-06): request IPs are sent in the same
    // header (see call() above) so per-IP rate limits stay isolated.
    process.env.AUTH_TRUSTED_IP_HEADER = 'x-real-ip';
    process.env.AENURAL_LOCAL_DATA_DIR = tmpdir;

    mysqlTls = await import('../server/membership/mysql-tls.mjs');
    databaseModule = await import('../server/membership/database.mjs');
    authModule = await import('../server/membership/auth.mjs');
    configModule = await import('../server/membership/config.mjs');

    // Migration pool built by the app's own pool-options builder.
    rawPool = createPool(
      mysqlTls.buildMysqlPoolOptions(process.env),
    ).promise();
    await dropAllTables(rawPool, TEST.database);
    migrationStatements = await runMigration(rawPool, MIGRATION_PATH);

    const membership = await databaseModule.membershipDatabase();
    closables.push(membership);
    auth = await authModule.membershipAuth();
  });

  after(async () => {
    for (const database of [TEST.database, TEST.emptyDatabase, TEST.badDatabase]) {
      try {
        await dropAllTables(rawPool, database);
      } catch {
        // Disposable databases: best-effort cleanup only.
      }
    }
    for (const { db, authDatabase: pool } of closables) {
      try {
        await pool?.end?.();
      } catch {
        /* already closed */
      }
      try {
        await db?.destroy?.();
      } catch {
        /* already closed */
      }
    }
    try {
      await rawPool?.end?.();
    } catch {
      /* already closed */
    }
    await sink?.close?.();
    if (tmpdir) await rm(tmpdir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // 1. Secure config / TLS profiles (pure app code, no database needed)
  // -------------------------------------------------------------------------

  describe('secure config (fail-closed TLS)', () => {
    it('loopback hosts use a plain connection (no ssl option)', () => {
      for (const host of ['127.0.0.1', '127.9.8.7', 'localhost', '::1']) {
        const tls = mysqlTls.resolveMysqlTls({ DB_HOST: host });
        assert.equal(tls.profile, 'loopback');
        assert.equal(tls.ssl, undefined);
      }
    });

    it('a remote host without any TLS configuration throws (fail-closed)', () => {
      assert.throws(
        () => mysqlTls.resolveMysqlTls({ DB_HOST: 'srv2224.hstgr.io' }),
        /requires verified TLS/,
      );
    });

    it('a remote host with a CA file gets verified TLS (TLS 1.2+, SNI)', async () => {
      const caPath = TLS.caFile || path.join(tmpdir, 'missing-ca.pem');
      if (!TLS.enabled) {
        // No real CA file here: prove the missing-file branch throws instead.
        assert.throws(
          () => mysqlTls.resolveMysqlTls({ DB_HOST: 'db.example.test', DB_SSL_CA_FILE: caPath }),
          /cannot be read/,
        );
        return;
      }
      const tls = mysqlTls.resolveMysqlTls({
        DB_HOST: 'mysql-remote.test',
        DB_SSL_CA_FILE: TLS.caFile,
      });
      assert.equal(tls.profile, 'remote');
      assert.equal(tls.ssl.rejectUnauthorized, true);
      assert.equal(tls.ssl.minVersion, 'TLSv1.2');
      assert.equal(tls.ssl.servername, 'mysql-remote.test');
      assert.equal(tls.ssl.verifyIdentity, true, 'remote profile must verify the hostname (Phase 4)');
      assert.match(tls.ssl.ca, /BEGIN CERTIFICATE/);
    });

    it('public-CA opt-in still verifies (rejectUnauthorized stays true)', () => {
      const tls = mysqlTls.resolveMysqlTls({
        DB_HOST: 'db.example.test',
        DB_TLS_ALLOW_PUBLIC_CA: '1',
      });
      assert.equal(tls.profile, 'remote-public-ca');
      assert.equal(tls.ssl.rejectUnauthorized, true);
      assert.equal(tls.ssl.minVersion, 'TLSv1.2');
      assert.equal(tls.ssl.servername, 'db.example.test');
      assert.equal(tls.ssl.verifyIdentity, true, 'remote-public-ca profile must verify the hostname (Phase 4)');
    });

    it('an invalid public-CA opt-in value throws instead of silently disabling TLS', () => {
      assert.throws(
        () =>
          mysqlTls.resolveMysqlTls({
            DB_HOST: 'db.example.test',
            DB_TLS_ALLOW_PUBLIC_CA: 'yes',
          }),
        /DB_TLS_ALLOW_PUBLIC_CA must be 1/,
      );
    });

    it('pool options keep the app behaviour (limit 5, utf8mb4, UTC) and add ssl only for remote', () => {
      const local = mysqlTls.buildMysqlPoolOptions({
        DB_HOST: '127.0.0.1',
        DB_PORT: '3306',
        DB_USER: 'u',
        DB_PASSWORD: 'p',
        DB_NAME: 'd',
      });
      assert.equal('ssl' in local, false);
      assert.equal(local.connectionLimit, 5);
      assert.equal(local.charset, 'utf8mb4');
      assert.equal(local.timezone, 'Z');
      const remote = mysqlTls.buildMysqlPoolOptions({
        DB_HOST: 'db.example.test',
        DB_TLS_ALLOW_PUBLIC_CA: '1',
        DB_USER: 'u',
        DB_PASSWORD: 'p',
        DB_NAME: 'd',
      });
      assert.equal(remote.ssl.rejectUnauthorized, true);
      assert.equal(remote.ssl.servername, 'db.example.test');
      assert.equal(remote.ssl.verifyIdentity, true);
    });

    it('missingMysqlTables() finds exactly the missing required tables', () => {
      assert.deepEqual(mysqlTls.missingMysqlTables(mysqlTls.REQUIRED_MYSQL_TABLES), []);
      assert.deepEqual(
        mysqlTls.missingMysqlTables(['user', 'RateLimit']),
        mysqlTls.REQUIRED_MYSQL_TABLES.filter((t) => t !== 'user' && t !== 'rateLimit'),
      );
    });

    it('assertEncryptedSession() rejects an unencrypted session', () => {
      assert.throws(
        () => mysqlTls.assertEncryptedSession('', 'db.example.test'),
        /NOT encrypted/,
      );
      assert.equal(mysqlTls.assertEncryptedSession('TLSv1.3', 'db.example.test'), 'TLSv1.3');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Migration + schema
  // -------------------------------------------------------------------------

  describe('migration 001-initial-mysql.sql', () => {
    it('creates all 14 required tables', async () => {
      const rows = await q(
        'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
        [TEST.database],
      );
      const found = rows.map((r) => r.name).sort();
      assert.deepEqual(found, [...mysqlTls.REQUIRED_MYSQL_TABLES].sort());
    });

    it('uses InnoDB and utf8mb4 on every table', async () => {
      const rows = await q(
        `SELECT TABLE_NAME AS name, ENGINE AS engine, TABLE_COLLATION AS collation
         FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
        [TEST.database],
      );
      assert.equal(rows.length, 14);
      for (const row of rows) {
        assert.equal(row.engine, 'InnoDB', `${row.name} engine`);
        assert.match(row.collation, /^utf8mb4_/, `${row.name} collation`);
      }
    });

    it('creates the required columns on the five Better Auth tables', async () => {
      const expected = {
        user: ['id', 'name', 'email', 'emailVerified', 'image', 'createdAt', 'updatedAt'],
        session: ['id', 'expiresAt', 'token', 'createdAt', 'updatedAt', 'ipAddress', 'userAgent', 'userId'],
        account: ['id', 'accountId', 'providerId', 'userId', 'accessToken', 'refreshToken', 'idToken', 'accessTokenExpiresAt', 'refreshTokenExpiresAt', 'scope', 'password', 'createdAt', 'updatedAt'],
        verification: ['id', 'identifier', 'value', 'expiresAt', 'createdAt', 'updatedAt'],
        rateLimit: ['id', 'key', 'count', 'lastRequest'],
      };
      for (const [table, columns] of Object.entries(expected)) {
        const rows = await q(
          'SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
          [TEST.database, table],
        );
        assert.deepEqual(
          rows.map((r) => r.name).sort(),
          [...columns].sort(),
          `${table} columns`,
        );
      }
    });

    it('creates the required columns on the nine application tables', async () => {
      const spot = {
        aenural_daily_usage: ['id', 'owner_id', 'day', 'used'],
        aenural_orders: ['id', 'owner_id', 'provider', 'provider_order_id', 'status', 'amount_minor', 'currency', 'test_mode'],
        aenural_projects: ['id', 'owner_id', 'title', 'payload', 'revision'],
        aenural_caption_jobs: ['id', 'owner_id', 'video_id', 'day', 'status'],
        aenural_activity: ['id', 'owner_id', 'action', 'created_at'],
        aenural_checkouts: ['id', 'owner_id', 'created_at'],
        aenural_webhooks: ['id', 'processed_at'],
        aenural_operation_limits: ['id', 'owner_id', 'used', 'expires_at'],
        aenural_email_delivery_attempts: ['id', 'email', 'kind', 'status', 'attempted_at'],
      };
      for (const [table, columns] of Object.entries(spot)) {
        const rows = await q(
          'SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
          [TEST.database, table],
        );
        const found = rows.map((r) => r.name);
        for (const column of columns) {
          assert.ok(found.includes(column), `${table}.${column} must exist`);
        }
      }
    });

    it('creates the required indexes', async () => {
      const rows = await q(
        'SELECT DISTINCT INDEX_NAME AS name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ?',
        [TEST.database],
      );
      const found = new Set(rows.map((r) => r.name));
      for (const index of [
        'session_userId_idx',
        'account_userId_idx',
        'verification_identifier_idx',
        'aenural_orders_owner_idx',
        'aenural_projects_owner_idx',
        'aenural_activity_owner_idx',
        'aenural_checkouts_owner_idx',
      ]) {
        assert.ok(found.has(index), `index ${index} must exist`);
      }
    });

    it('creates the unique constraints', async () => {
      const rows = await q(
        `SELECT TABLE_NAME AS tableName, CONSTRAINT_NAME AS name
         FROM information_schema.TABLE_CONSTRAINTS
         WHERE TABLE_SCHEMA = ? AND CONSTRAINT_TYPE = 'UNIQUE'`,
        [TEST.database],
      );
      const found = new Set(rows.map((r) => `${r.tableName}.${r.name}`));
      for (const unique of [
        'user.email',
        'session.token',
        'rateLimit.key',
        'aenural_orders.aenural_orders_provider_unique',
        'aenural_caption_jobs.aenural_video_day_unique',
      ]) {
        assert.ok(found.has(unique), `unique constraint ${unique} must exist`);
      }
    });

    it('creates real foreign keys with ON DELETE CASCADE (Phase 4 fix)', async () => {
      // Phase 4: the migration now emits explicit FOREIGN KEY clauses —
      // Better Auth tables via prepare-mysql post-processing, application
      // tables via Kysely addForeignKeyConstraint in schema.mjs. MySQL
      // parses inline REFERENCES on a column definition but silently
      // IGNORES it, which used to leave zero FKs and orphaned rows when
      // a user was deleted (the old KNOWN LIMITATION test proved it).
      const rows = await q(
        `SELECT TABLE_NAME AS tableName, CONSTRAINT_NAME AS name
         FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ?`,
        [TEST.database],
      );
      const found = new Set(rows.map((r) => `${r.tableName}.${r.name}`));
      for (const fk of [
        'session.session_userId_fk',
        'account.account_userId_fk',
        'aenural_orders.aenural_orders_owner_id_fk',
        'aenural_caption_jobs.aenural_caption_jobs_owner_id_fk',
        'aenural_projects.aenural_projects_owner_id_fk',
      ]) {
        assert.ok(found.has(fk), `FK ${fk} must exist`);
      }
      const [create] = await q('SHOW CREATE TABLE `session`');
      assert.match(create['Create Table'], /FOREIGN KEY/i, 'SHOW CREATE TABLE must show the FK');
      // Prove the consequence: deleting a user cascades to its session.
      await q(
        "INSERT INTO `user` (id, name, email, emailVerified, createdAt, updatedAt) VALUES ('fk-probe-user', 'FK Probe', 'fk-probe@example.test', 0, NOW(3), NOW(3))",
      );
      await q(
        "INSERT INTO `session` (id, expiresAt, token, createdAt, updatedAt, userId) VALUES ('fk-probe-session', DATE_ADD(NOW(3), INTERVAL 7 DAY), 'fk-probe-token', NOW(3), NOW(3), 'fk-probe-user')",
      );
      await q("DELETE FROM `user` WHERE id = 'fk-probe-user'");
      const orphaned = await q("SELECT id FROM `session` WHERE id = 'fk-probe-session'");
      assert.equal(orphaned.length, 0, 'session row must be deleted with its user (cascade)');
    });

    it('the IF NOT EXISTS application tables are idempotent on re-run', async () => {
      const before = await q(
        'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
        [TEST.database],
      );
      const appStatements = migrationStatements.filter((s) =>
        s.toLowerCase().includes('if not exists'),
      );
      assert.ok(appStatements.length >= 9, 'migration must carry the 9 app tables');
      for (const statement of appStatements) {
        await rawPool.query(statement);
      }
      const afterCount = await q(
        'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
        [TEST.database],
      );
      assert.equal(afterCount[0].n, before[0].n, 're-running app tables must not change the schema');
    });

    it('a full re-run of the file is a no-op (IF NOT EXISTS + idempotent indexes, Phase 4 fix)', async () => {
      // Phase 4: every CREATE TABLE in the file uses IF NOT EXISTS and
      // every CREATE INDEX is wrapped in an only-when-missing block, so
      // a second import changes nothing and loses no data. (Before the
      // fix this failed with ER_TABLE_EXISTS_ERROR 1050 on `user`.)
      await q(
        "INSERT INTO aenural_webhooks (id, processed_at) VALUES ('migration-probe', '2026-11-19T00:00:00Z')",
      );
      await runMigration(rawPool, MIGRATION_PATH); // must not throw
      const tables = await q(
        'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
        [TEST.database],
      );
      assert.equal(tables[0].n, 14, 're-run must not change the table count');
      const probe = await q(
        "SELECT id FROM aenural_webhooks WHERE id = 'migration-probe'",
      );
      assert.equal(probe.length, 1, 're-run must not delete data');
      await q("DELETE FROM aenural_webhooks WHERE id = 'migration-probe'");
    });
  });

  // -------------------------------------------------------------------------
  // 3. Connection handling
  // -------------------------------------------------------------------------

  describe('connection handling', () => {
    it('verifyMysqlConnection() proves the loopback session (unencrypted, as designed)', async () => {
      const tls = mysqlTls.resolveMysqlTls(process.env);
      const result = await databaseModule.verifyMysqlConnection(rawPool, tls);
      assert.equal(result.profile, 'loopback');
      assert.equal(result.encrypted, false);
      assert.equal(result.host, TEST.host);
    });

    it('a wrong database password fails loudly (no silent fallback)', async () => {
      const badConfig = configModule.membershipConfig({
        ...process.env,
        DB_PASSWORD: 'definitely-not-the-password',
      });
      await assert.rejects(
        databaseModule.openMembershipDatabase(badConfig),
        (error) => error.code === 'ER_ACCESS_DENIED_ERROR' || error.errno === 1045,
      );
    });

    it('an unreachable database port fails loudly', async () => {
      const badConfig = configModule.membershipConfig({
        ...process.env,
        DB_PORT: '33999',
      });
      await assert.rejects(
        databaseModule.openMembershipDatabase(badConfig),
        (error) => ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code),
      );
    });

    it('a missing schema fails at first use, not at pool creation', async () => {
      const emptyConfig = configModule.membershipConfig({
        ...process.env,
        DB_NAME: TEST.emptyDatabase,
      });
      const opened = await databaseModule.openMembershipDatabase(emptyConfig);
      closables.push(opened);
      // Direct read proves the tables really are absent.
      await assert.rejects(
        opened.authDatabase.query('SELECT id FROM `user` LIMIT 1'),
        (error) => error.code === 'ER_NO_SUCH_TABLE' && error.errno === 1146,
      );
      // And the app surface fails loudly instead of silently creating
      // anything. Better Auth throws SCHEMA_MISMATCH on first use (it
      // checks the schema when the auth instance first handles a request);
      // accept either that throw or a 4xx/5xx response — both are loud
      // failures, neither creates data.
      let outcome;
      try {
        const emptyAuth = (await import('better-auth')).betterAuth(
          authModule.authOptions(opened.authDatabase, emptyConfig),
        );
        const response = await emptyAuth.handler(
          new Request(`${ORIGIN}/api/auth/sign-up/email`, {
            method: 'POST',
            headers: {
              origin: ORIGIN,
              'content-type': 'application/json',
              'x-real-ip': '10.20.30.99',
            },
            body: JSON.stringify({
              name: 'Nobody',
              email: uniqueEmail('missing-schema'),
              password: PASSWORD,
              callbackURL: `${ORIGIN}/sign-in`,
            }),
          }),
        );
        outcome = { status: response.status };
      } catch (error) {
        outcome = { thrown: error.code || error.name };
      }
      assert.ok(
        outcome.status >= 400 || outcome.thrown === 'SCHEMA_MISMATCH',
        `missing schema must fail loudly, got ${JSON.stringify(outcome)}`,
      );
      const tables = await q(
        'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
        [TEST.emptyDatabase],
      );
      assert.equal(tables[0].n, 0, 'failed sign-up must not create tables');
    });

    it('an incompatible schema (dropped column) fails loudly', async () => {
      await dropAllTables(rawPool, TEST.badDatabase);
      const badPool = createPool({
        ...mysqlTls.buildMysqlPoolOptions(process.env),
        database: TEST.badDatabase,
      }).promise();
      try {
        await runMigration(badPool, MIGRATION_PATH);
        await badPool.query('ALTER TABLE `user` DROP COLUMN emailVerified');
      } finally {
        await badPool.end();
      }
      // Direct proof on the bad database itself:
      const checkPool = createPool({
        ...mysqlTls.buildMysqlPoolOptions(process.env),
        database: TEST.badDatabase,
      }).promise();
      try {
        await assert.rejects(
          checkPool.query('SELECT emailVerified FROM `user` LIMIT 1'),
          (error) => error.code === 'ER_BAD_FIELD_ERROR' && error.errno === 1054,
        );
      } finally {
        await checkPool.end();
      }
      const badConfig = configModule.membershipConfig({
        ...process.env,
        DB_NAME: TEST.badDatabase,
      });
      const opened = await databaseModule.openMembershipDatabase(badConfig);
      closables.push(opened);
      // Better Auth throws SCHEMA_MISMATCH on first use; accept either
      // that throw or a 4xx/5xx response.
      let outcome;
      try {
        const badAuth = (await import('better-auth')).betterAuth(
          authModule.authOptions(opened.authDatabase, badConfig),
        );
        const response = await badAuth.handler(
          new Request(`${ORIGIN}/api/auth/sign-up/email`, {
            method: 'POST',
            headers: {
              origin: ORIGIN,
              'content-type': 'application/json',
              'x-real-ip': '10.20.30.98',
            },
            body: JSON.stringify({
              name: 'Nobody',
              email: uniqueEmail('bad-schema'),
              password: PASSWORD,
              callbackURL: `${ORIGIN}/sign-in`,
            }),
          }),
        );
        outcome = { status: response.status };
      } catch (error) {
        outcome = { thrown: error.code || error.name };
      }
      assert.ok(
        outcome.status >= 400 || outcome.thrown === 'SCHEMA_MISMATCH',
        `incompatible schema must fail loudly, got ${JSON.stringify(outcome)}`,
      );
    });
  });

  // -------------------------------------------------------------------------
  // 4. Registration, OTP, sessions, login/logout, password reset
  // -------------------------------------------------------------------------

  describe('auth flows over MySQL (real Better Auth)', () => {
    it('registration persists a user + hashed account and issues no session', async () => {
      const email = uniqueEmail('register');
      const since = sink.messages.length;
      const user = await register(email);
      const rows = await q('SELECT * FROM `user` WHERE id = ?', [user.id]);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].email, email);
      assert.equal(rows[0].emailVerified, 0);
      const accounts = await q('SELECT * FROM `account` WHERE userId = ?', [user.id]);
      assert.equal(accounts.length, 1);
      assert.equal(accounts[0].providerId, 'credential');
      assert.ok(accounts[0].password && !accounts[0].password.includes(PASSWORD));
      assert.ok(accounts[0].password.length > 20, 'password must be a real hash');
      // No session is created at sign-up (autoSignIn is false).
      const sessions = await q('SELECT * FROM `session` WHERE userId = ?', [user.id]);
      assert.equal(sessions.length, 0);
      await otpFor(email, since); // the code was sent; consumed by later tests' users, not this one
    });

    it('an OTP verification record is stored hashed with a 5-minute expiry', async () => {
      const email = uniqueEmail('otp-row');
      const since = sink.messages.length;
      const user = await register(email);
      const { code } = await otpFor(email, since);
      const rows = await q(
        'SELECT * FROM `verification` WHERE identifier = ?',
        [`email-verification-otp-${email}`],
      );
      assert.equal(rows.length, 1, 'one OTP verification row');
      assert.ok(!rows[0].value.includes(code), 'stored OTP value must not contain the plain code');
      assert.ok(rows[0].value.includes(':'), 'hashed OTP value carries the attempt counter');
      const created = new Date(rows[0].createdAt).getTime();
      const expires = new Date(rows[0].expiresAt).getTime();
      assert.ok(Math.abs(expires - created - 300_000) < 10_000, 'OTP expiry must be ~5 minutes');
      assert.ok(
        typeof rows[0].id === 'string' && rows[0].id.length > 0,
        'verification row must have an id',
      );
      // Clean up: verify so the row is consumed.
      const { response } = await verifyOtp(email, code);
      assert.equal(response.status, 200);
      assert.equal(user.emailVerified, false, 'sign-up response reports unverified user');
    });

    it('an unverified user cannot sign in', async () => {
      const email = uniqueEmail('unverified');
      await register(email);
      const { response } = await callJson('sign-in/email', { email, password: PASSWORD });
      assert.equal(response.status, 403);
    });

    it('a wrong OTP fails and the correct OTP verifies + creates a session', async () => {
      const email = uniqueEmail('verify');
      const since = sink.messages.length;
      const user = await register(email);
      const { code } = await otpFor(email, since);
      const wrong = code[0] === '9' ? `0${code.slice(1)}` : `9${code.slice(1)}`;
      const bad = await verifyOtp(email, wrong);
      assert.ok(bad.response.status >= 400, `wrong OTP must fail, got ${bad.response.status}`);
      const still = await q('SELECT emailVerified FROM `user` WHERE id = ?', [user.id]);
      assert.equal(still[0].emailVerified, 0, 'wrong OTP must not verify the user');
      const good = await verifyOtp(email, code);
      assert.equal(good.response.status, 200);
      assert.equal(good.body.status, true);
      assert.equal(good.body.user.emailVerified, true);
      assert.ok(good.body.token, 'a session token is issued only after verification');
      const cookie = sessionCookie(good.response);
      assert.match(cookie, /session_token=/);
      const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
      assert.equal(session?.user?.id, user.id);
      assert.equal(session?.user?.emailVerified, true);
    });

    it('five wrong OTP attempts invalidate the code', async () => {
      const email = uniqueEmail('attempts');
      const since = sink.messages.length;
      await register(email);
      const { code } = await otpFor(email, since);
      const wrong = code[0] === '9' ? `0${code.slice(1)}` : `9${code.slice(1)}`;
      for (let i = 0; i < 5; i++) {
        const attempt = await verifyOtp(email, wrong);
        assert.ok(attempt.response.status >= 400, `wrong attempt ${i + 1} must fail`);
      }
      const after = await verifyOtp(email, code);
      assert.ok(
        after.response.status >= 400,
        `correct code after 5 wrong attempts must fail, got ${after.response.status}`,
      );
      const rows = await q('SELECT emailVerified FROM `user` WHERE email = ?', [email]);
      assert.equal(rows[0].emailVerified, 0);
    });

    it('an expired OTP does not verify', async () => {
      const email = uniqueEmail('expired');
      const since = sink.messages.length;
      await register(email);
      const { code } = await otpFor(email, since);
      await q(
        'UPDATE `verification` SET expiresAt = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE identifier = ?',
        [`email-verification-otp-${email}`],
      );
      const attempt = await verifyOtp(email, code);
      assert.ok(attempt.response.status >= 400, `expired OTP must fail, got ${attempt.response.status}`);
    });

    it('login creates a session row and logout revokes it', async () => {
      const email = uniqueEmail('login');
      const { user, cookie: verifyCookie } = await registerAndVerify(email);
      const session = await auth.api.getSession({ headers: new Headers({ cookie: verifyCookie }) });
      assert.equal(session?.user?.id, user.id);
      const rows = await q('SELECT * FROM `session` WHERE userId = ?', [user.id]);
      assert.equal(rows.length, 1);
      assert.ok(rows[0].token.length > 20);
      const created = new Date(rows[0].createdAt).getTime();
      const expires = new Date(rows[0].expiresAt).getTime();
      assert.ok(Math.abs(expires - created - 7 * 86400_000) < 60_000, 'session expiry must be ~7 days');
      const login = await callJson('sign-in/email', { email, password: PASSWORD });
      assert.equal(login.response.status, 200);
      const loginCookie = sessionCookie(login.response);
      assert.match(loginCookie, /session_token=/);
      // Two sessions exist now: the verify-time session and the login one.
      const beforeOut = await q('SELECT COUNT(*) AS n FROM `session` WHERE userId = ?', [user.id]);
      assert.equal(beforeOut[0].n, 2, 'verify + login must each create a session');
      const out = await call('sign-out', {}, { cookie: loginCookie, method: 'POST' });
      assert.ok(out.status >= 200 && out.status < 300, `sign-out -> ${out.status}`);
      const gone = await auth.api.getSession({ headers: new Headers({ cookie: loginCookie }) });
      assert.equal(gone, null, 'signed-out session must not resolve');
      // Sign-out revokes only the signed-out session; the verify-time
      // session is untouched (that is Better Auth's per-session sign-out).
      const remaining = await q('SELECT * FROM `session` WHERE userId = ?', [user.id]);
      assert.equal(remaining.length, 1, 'sign-out must delete exactly the signed-out session row');
    });

    it('an expired session does not resolve', async () => {
      const email = uniqueEmail('session-expiry');
      const { user, cookie } = await registerAndVerify(email);
      await q('UPDATE `session` SET expiresAt = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE userId = ?', [user.id]);
      const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
      assert.equal(session, null);
    });

    it('password reset: generic responses, token works once, old password + old sessions die', async () => {
      const email = uniqueEmail('reset');
      const { user, cookie } = await registerAndVerify(email);
      const since = sink.messages.length;
      const known = await callJson('request-password-reset', {
        email,
        redirectTo: `${ORIGIN}/reset-password`,
      });
      const unknown = await callJson('request-password-reset', {
        email: uniqueEmail('unknown'),
        redirectTo: `${ORIGIN}/reset-password`,
      });
      assert.equal(known.response.status, unknown.response.status);
      assert.deepEqual(known.body, unknown.body, 'reset responses must not enumerate accounts');
      const { token } = await resetTokenFor(email, since);
      const reset = await callJson('reset-password', { token, newPassword: 'New-Test-Password-5678' });
      assert.equal(reset.response.status, 200, JSON.stringify(reset.body));
      const oldSession = await auth.api.getSession({ headers: new Headers({ cookie }) });
      assert.equal(oldSession, null, 'password reset must revoke prior sessions');
      const oldLogin = await callJson('sign-in/email', { email, password: PASSWORD });
      assert.equal(oldLogin.response.status, 401, 'old password must stop working');
      const newLogin = await callJson('sign-in/email', { email, password: 'New-Test-Password-5678' });
      assert.equal(newLogin.response.status, 200, 'new password must work');
      const reuse = await callJson('reset-password', { token, newPassword: PASSWORD });
      assert.ok(reuse.response.status >= 400, `reset token reuse must fail, got ${reuse.response.status}`);
      assert.equal(user.emailVerified, false, 'sign-up response reported unverified user');
    });

    it('duplicate registration creates no second user or account', async () => {
      const email = uniqueEmail('duplicate');
      const first = await register(email);
      const { response, body } = await callJson('sign-up/email', {
        name: 'Test User',
        email,
        password: PASSWORD,
        callbackURL: `${ORIGIN}/sign-in`,
      });
      // Phase 3 finding: with requireEmailVerification on, Better Auth
      // answers a duplicate sign-up with a generic 200 (no 422). The
      // invariant that matters is the database: still exactly one user.
      assert.equal(response.status, 200, `duplicate sign-up -> ${response.status} ${JSON.stringify(body)}`);
      const users = await q('SELECT * FROM `user` WHERE email = ?', [email]);
      assert.equal(users.length, 1, 'duplicate sign-up must not create a second user');
      assert.equal(users[0].id, first.id);
      const accounts = await q('SELECT * FROM `account` WHERE userId = ?', [first.id]);
      assert.equal(accounts.length, 1, 'duplicate sign-up must not create a second account');
    });

    // Pool-deadlock regression guard (Phase 4 fix, 2026-11-19): 8
    // parallel sign-ups must all complete. Before the fix the durable
    // delivery-audit insert was awaited inside Better Auth's per-request
    // transaction and deadlocked at the pool limit of 5 (5 mails sent,
    // then nothing). 4 parallel sign-ups pass even with the bug; 8 is
    // the meaningful threshold.
    it('concurrent sign-ups and sign-ins all succeed', async () => {
      const emails = Array.from({ length: 8 }, (_, i) => uniqueEmail(`concurrent${i}`));
      const signedUp = await Promise.all(emails.map((email) => register(email)));
      assert.equal(signedUp.length, 8);
      const counted = await q(
        `SELECT COUNT(*) AS n FROM \`user\` WHERE email IN (${emails.map(() => '?').join(',')})`,
        emails,
      );
      assert.equal(counted[0].n, 8);
      for (const email of emails) {
        const { code } = await otpFor(email, 0);
        const { response } = await verifyOtp(email, code);
        assert.equal(response.status, 200, `verify ${email}`);
      }
      const logins = await Promise.all(
        emails.map((email) => callJson('sign-in/email', { email, password: PASSWORD })),
      );
      for (const login of logins) {
        assert.equal(login.response.status, 200, JSON.stringify(login.body));
      }
    });

    it('OTP resend respects the 60s cooldown and rotates (invalidates) the prior code', async () => {
      const email = uniqueEmail('resend');
      const since = sink.messages.length;
      await register(email);
      const first = await otpFor(email, since);
      const beforeCount = sink.messages.length;
      const cooled = await callJson('email-otp/send-verification-otp', {
        email,
        type: 'email-verification',
      });
      assert.equal(cooled.response.status, 200);
      assert.equal(cooled.body.success, true);
      assert.equal(
        sink.messages.length,
        beforeCount,
        'a resend inside the cooldown must send no new mail',
      );
      const rowBefore = await q(
        'SELECT createdAt FROM `verification` WHERE identifier = ?',
        [`email-verification-otp-${email}`],
      );
      // Age the row past the 60s cooldown, then resend for real.
      await q(
        'UPDATE `verification` SET createdAt = DATE_SUB(NOW(), INTERVAL 120 SECOND) WHERE identifier = ?',
        [`email-verification-otp-${email}`],
      );
      const resent = await callJson('email-otp/send-verification-otp', {
        email,
        type: 'email-verification',
      });
      assert.equal(resent.response.status, 200);
      const second = await otpFor(email, beforeCount);
      assert.notEqual(second.code, first.code, 'resend must issue a different code');
      // The newest verification row must be newer than the pre-resend
      // row. Note the schema detail this asserts against: Better Auth's
      // rotate resend INSERTs a second row for the identifier (the
      // verification table has no unique index on identifier, so the
      // delete+recreate fallback in resolveOTP never fires) — the old
      // row stays until verify/delete cleans it up. So compare MAX
      // (createdAt), not the first row returned: without ORDER BY the
      // row order is clustered-index (id) order and the assertion was
      // a coin flip on the random row ids. The behaviour that matters
      // — old code dead, new code verifies — is asserted below.
      const rowAfter = await q(
        'SELECT MAX(createdAt) AS createdAt FROM `verification` WHERE identifier = ?',
        [`email-verification-otp-${email}`],
      );
      assert.ok(
        new Date(rowAfter[0].createdAt).getTime() >
          new Date(rowBefore[0].createdAt).getTime(),
        'resend must replace the verification row',
      );
      const stale = await verifyOtp(email, first.code);
      assert.ok(stale.response.status >= 400, 'the rotated-out code must fail');
      const fresh = await verifyOtp(email, second.code);
      assert.equal(fresh.response.status, 200, 'the new code must verify');
    });
  });

  // -------------------------------------------------------------------------
  // 5. Persistence across restart, pooling, cleanup
  // -------------------------------------------------------------------------

  describe('persistence, pooling and cleanup', () => {
    it('data survives an app restart (pools closed, modules reloaded, re-read)', async () => {
      const email = uniqueEmail('restart');
      const { user, cookie } = await registerAndVerify(email);
      // Simulate a restart: close every pool and drop the module caches.
      // One close per pool: db.destroy() ends the same mysql2 pool that
      // authDatabase wraps, so ending authDatabase first and then
      // destroying db double-ends the pool — racy in mysql2 3.24.6
      // (a connection still closing when the second end() runs throws
      // "Can't add new command when connection is in closed state").
      const first = await databaseModule.membershipDatabase();
      await first.db.destroy();
      delete globalThis[Symbol.for('aenural.membership.database.v1')];
      const freshAuthModule = await import(
        `../server/membership/auth.mjs?restart=${Date.now()}`
      );
      const auth2 = await freshAuthModule.membershipAuth();
      const second = await databaseModule.membershipDatabase();
      closables.push(second);
      const session = await auth2.api.getSession({ headers: new Headers({ cookie }) });
      assert.equal(session?.user?.id, user.id, 'pre-restart session must still resolve');
      assert.equal(session?.user?.emailVerified, true);
      const login = await auth2.handler(
        new Request(`${ORIGIN}/api/auth/sign-in/email`, {
          method: 'POST',
          headers: {
            origin: ORIGIN,
            'content-type': 'application/json',
            'x-real-ip': '10.20.30.77',
          },
          body: JSON.stringify({ email, password: PASSWORD }),
        }),
      );
      assert.equal(login.status, 200, 'sign-in must work after restart');
      const rows = await q('SELECT emailVerified FROM `user` WHERE id = ?', [user.id]);
      assert.equal(rows[0].emailVerified, 1);
    });

    it('the pool honours its connection limit and can be closed cleanly', async () => {
      const pool = createPool(mysqlTls.buildMysqlPoolOptions(process.env));
      const promisePool = pool.promise();
      try {
        const results = await Promise.all(
          Array.from({ length: 12 }, () => promisePool.query('SELECT 1 AS one')),
        );
        assert.equal(results.length, 12);
        for (const [rows] of results) assert.equal(rows[0].one, 1);
      } finally {
        await promisePool.end();
      }
      await assert.rejects(
        promisePool.query('SELECT 1'),
        /Pool is closed|Cannot enqueue/,
      );
      // The shared app pool is unaffected by closing the scratch pool.
      const rows = await q('SELECT 1 AS one');
      assert.equal(rows[0].one, 1);
    });
  });

  // -------------------------------------------------------------------------
  // 6. TLS against a real mysqld (separate TLS-only instance)
  // -------------------------------------------------------------------------

  describe('TLS against a real mysqld', { skip: !TLS.enabled }, () => {
    it('a TLS connection with the correct CA is encrypted (TLS 1.2+)', async () => {
      const { readFileSync } = await import('node:fs');
      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({
        host: TLS.host,
        port: TLS.port,
        user: TLS.user,
        password: TLS.password,
        database: TLS.database,
        ssl: {
          ca: readFileSync(TLS.caFile),
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2',
          servername: 'localhost',
        },
      });
      try {
        const [version] = await connection.query(
          "SHOW SESSION STATUS LIKE 'Ssl_version'",
        );
        assert.match(version[0].Value, /^TLSv1\.[23]$/, 'session must be TLS 1.2+');
        const [cipher] = await connection.query(
          "SHOW SESSION STATUS LIKE 'Ssl_cipher'",
        );
        assert.ok(cipher[0].Value.length > 0, 'a cipher must be negotiated');
        const [one] = await connection.query('SELECT 1 AS one');
        assert.equal(one[0].one, 1);
      } finally {
        await connection.end();
      }
    });

    it('an untrusted CA is rejected', async () => {
      const { readFileSync } = await import('node:fs');
      const mysql = await import('mysql2/promise');
      await assert.rejects(
        mysql.createConnection({
          host: TLS.host,
          port: TLS.port,
          user: TLS.user,
          password: TLS.password,
          database: TLS.database,
          ssl: {
            ca: readFileSync(TLS.wrongCaFile),
            rejectUnauthorized: true,
            minVersion: 'TLSv1.2',
            servername: 'localhost',
          },
        }),
        (error) =>
          /certificate|CERT|UNABLE_TO_VERIFY|self[- ]signed/i.test(error.message),
      );
    });

    it('mysql2 ignores ssl.servername without verifyIdentity (raw driver behaviour, not the app profile)', async () => {
      // mysql2 3.24.6 startTLS() derives the TLS server name from
      // config.host (undefined for IP hosts) and only verifies the
      // hostname when ssl.verifyIdentity is set — it never reads
      // ssl.servername. This test pins the RAW driver behaviour (no
      // verifyIdentity): a connection with servername
      // 'wrong-host.invalid' below SUCCEEDS. The CA chain is still
      // verified (the wrong-CA test above fails), so this is a
      // hostname-verification gap, not a missing-TLS gap. The APP
      // profile closed it in Phase 4 — resolveMysqlTls() now sets
      // `verifyIdentity: true` on remote hosts (asserted by the pure
      // tests above), so for DNS hosts (e.g. srv2224.hstgr.io) mysql2
      // verifies the cert against the host; IP hosts still cannot be
      // hostname-verified.
      // The connection opened here is closed explicitly: an un-ended
      // connection would keep the test runner alive.
      const { readFileSync } = await import('node:fs');
      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({
        host: TLS.host,
        port: TLS.port,
        user: TLS.user,
        password: TLS.password,
        database: TLS.database,
        ssl: {
          ca: readFileSync(TLS.caFile),
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2',
          servername: 'wrong-host.invalid',
        },
      });
      try {
        const [version] = await connection.query(
          "SHOW SESSION STATUS LIKE 'Ssl_version'",
        );
        assert.match(version[0].Value, /^TLSv1\.[23]$/, 'wrong servername still connects (gap)');
      } finally {
        await connection.end();
      }
    });

    it('hostname verification DOES work when requested (DNS host + verifyIdentity)', async () => {
      // Same TLS instance, host given as the DNS name 'localhost' (which
      // the server cert carries as a SAN) with verifyIdentity: true.
      const { readFileSync } = await import('node:fs');
      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({
        host: 'localhost',
        port: TLS.port,
        user: TLS.user,
        password: TLS.password,
        database: TLS.database,
        ssl: {
          ca: readFileSync(TLS.caFile),
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2',
          verifyIdentity: true,
        },
      });
      try {
        const [version] = await connection.query(
          "SHOW SESSION STATUS LIKE 'Ssl_version'",
        );
        assert.match(version[0].Value, /^TLSv1\.[23]$/);
      } finally {
        await connection.end();
      }
    });

    it('a cert without the hostname SAN is rejected (DNS host + verifyIdentity)', { skip: !TLS.mainCaFile }, async () => {
      // Main mysqld (port 3306) uses MySQL's auto-generated server cert,
      // whose CN is the generated name and which carries no SAN for
      // 'localhost'. With verifyIdentity requested, the handshake must
      // fail on the hostname — proving the mechanism the app does not
      // currently enable. Needs AENURAL_MYSQL_TLS_MAIN_CA_FILE (the main
      // server's CA, e.g. /var/lib/mysql/ca.pem).
      const { readFileSync } = await import('node:fs');
      const mysql = await import('mysql2/promise');
      await assert.rejects(
        mysql.createConnection({
          host: 'localhost',
          port: TEST.port,
          user: TEST.user,
          password: TEST.password,
          database: TEST.database,
          ssl: {
            ca: readFileSync(TLS.mainCaFile),
            rejectUnauthorized: true,
            minVersion: 'TLSv1.2',
            verifyIdentity: true,
          },
        }),
        (error) => /altnames|Hostname\/IP does not match/i.test(error.message),
      );
    });

    it('no CA (system trust store only) is rejected for a privately-signed server cert', async () => {
      const mysql = await import('mysql2/promise');
      await assert.rejects(
        mysql.createConnection({
          host: TLS.host,
          port: TLS.port,
          user: TLS.user,
          password: TLS.password,
          database: TLS.database,
          ssl: { rejectUnauthorized: true, minVersion: 'TLSv1.2', servername: 'localhost' },
        }),
        (error) => /certificate|CERT|UNABLE_TO_VERIFY|self[- ]signed/i.test(error.message),
      );
    });

    it('a plain connection to the TLS-only instance is rejected', async () => {
      const mysql = await import('mysql2/promise');
      await assert.rejects(
        mysql.createConnection({
          host: TLS.host,
          port: TLS.port,
          user: TLS.user,
          password: TLS.password,
          database: TLS.database,
        }),
        (error) => /Access denied|secure transport/i.test(error.message),
      );
    });

    it('the app remote-TLS profile connects encrypted (transport injected; see note)', async () => {
      // The app's remote profile is selected by DB_HOST, but this VM has no
      // resolvable non-loopback hostname for its mysqld (/etc/hosts is
      // read-only, and the cell's external IP stalls at the MySQL greeting
      // — see MYSQL-REPORT.md). So the pool is built by the app's own
      // buildMysqlPoolOptions() for a remote host, and only the TCP
      // transport is injected (mysql2 `stream` factory) to reach the local
      // TLS instance. The TLS verification itself — CA pinning, hostname
      // check against the cert SAN, TLS 1.2+ floor — is fully real: the
      // server cert carries SAN DNS:mysql-remote.test.
      const remoteEnv = {
        ...process.env,
        DB_HOST: 'mysql-remote.test',
        DB_PORT: String(TLS.port),
        DB_USER: TLS.user,
        DB_PASSWORD: TLS.password,
        DB_NAME: TLS.database,
        DB_SSL_CA_FILE: TLS.caFile,
      };
      const tlsProfile = mysqlTls.resolveMysqlTls(remoteEnv);
      assert.equal(tlsProfile.profile, 'remote');
      const options = mysqlTls.buildMysqlPoolOptions(remoteEnv);
      assert.equal(options.ssl.rejectUnauthorized, true);
      assert.equal(options.ssl.minVersion, 'TLSv1.2');
      assert.equal(options.ssl.servername, 'mysql-remote.test');
      const pool = createPool({
        ...options,
        stream: () => net.connect(TLS.port, '127.0.0.1'),
      }).promise();
      try {
        const result = await databaseModule.verifyMysqlConnection(pool, tlsProfile);
        assert.equal(result.encrypted, true);
        assert.match(result.tlsVersion, /^TLSv1\.[23]$/);
        assert.equal(result.profile, 'remote');
      } finally {
        await pool.end();
      }
    });

    it('the app remote-TLS profile connects to a real remote host (CI only)', { skip: !TLS.remoteHost }, async () => {
      const remoteEnv = {
        ...process.env,
        DB_HOST: TLS.remoteHost,
        DB_PORT: String(TLS.port),
        DB_USER: TLS.user,
        DB_PASSWORD: TLS.password,
        DB_NAME: TLS.database,
        DB_SSL_CA_FILE: TLS.caFile,
      };
      const tlsProfile = mysqlTls.resolveMysqlTls(remoteEnv);
      const pool = createPool(mysqlTls.buildMysqlPoolOptions(remoteEnv)).promise();
      try {
        const result = await databaseModule.verifyMysqlConnection(pool, tlsProfile);
        assert.equal(result.encrypted, true);
        assert.match(result.tlsVersion, /^TLSv1\.[23]$/);
      } finally {
        await pool.end();
      }
    });
  });
});
