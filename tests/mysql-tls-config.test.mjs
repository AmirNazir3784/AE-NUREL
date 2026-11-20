// Unit tests for the fail-closed MySQL TLS configuration.
// Pure functions only (server/membership/mysql-tls.mjs + config.mjs):
// no mysql2, kysely or better-auth is imported, so these run without
// node_modules and never touch a real database, network or mailbox.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  isLoopbackHost, resolveMysqlTls, buildMysqlPoolOptions,
  assertEncryptedSession, missingMysqlTables, REQUIRED_MYSQL_TABLES,
} from '../server/membership/mysql-tls.mjs';
import { membershipConfig } from '../server/membership/config.mjs';

const CA_PEM = '-----BEGIN CERTIFICATE-----\nZmFrZS1jYS1mb3ItdGVzdHMtb25seQ==\n-----END CERTIFICATE-----\n';
let directory;
let caFile;
before(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'aenural-mysql-tls-'));
  caFile = path.join(directory, 'ca.pem');
  await writeFile(caFile, CA_PEM, { mode: 0o600 });
});
after(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

function mysqlEnv(overrides = {}) {
  return {
    NODE_ENV: 'production',
    AENURAL_MEMBERSHIP_ENABLED: '1',
    BETTER_AUTH_URL: 'https://aenural.com',
    BETTER_AUTH_SECRET: 'x'.repeat(40),
    DB_NAME: 'aenural_test', DB_USER: 'aenural_test', DB_PASSWORD: 'test-password',
    SMTP_HOST: 'smtp.hostinger.com', SMTP_USER: 'support@aenural.com',
    SMTP_PASSWORD: 'test-password', MAIL_FROM: 'support@aenural.com',
    AUTH_TRUSTED_IP_HEADER: 'x-real-ip',
    ...overrides,
  };
}

describe('isLoopbackHost', () => {
  it('treats 127.0.0.1, ::1 and localhost as loopback', () => {
    for (const host of ['127.0.0.1', '127.0.0.2', '::1', '[::1]', 'localhost', 'LOCALHOST', undefined, '']) {
      assert.equal(isLoopbackHost(host), true, String(host));
    }
  });
  it('treats Hostinger remote hostnames as remote', () => {
    for (const host of ['srv2224.hstgr.io', 'srv123.hstgr.io', '192.0.2.10', 'db.example.com']) {
      assert.equal(isLoopbackHost(host), false, host);
    }
  });
});

describe('resolveMysqlTls — loopback profile', () => {
  it('returns no ssl for 127.0.0.1 (Hostinger production)', () => {
    const tls = resolveMysqlTls({ DB_HOST: '127.0.0.1' });
    assert.equal(tls.profile, 'loopback');
    assert.equal(tls.ssl, undefined);
  });
  it('returns no ssl when DB_HOST is unset (defaults to loopback)', () => {
    assert.equal(resolveMysqlTls({}).profile, 'loopback');
  });
});

describe('resolveMysqlTls — remote profile (fail-closed)', () => {
  it('throws for a remote host with no TLS configuration', () => {
    assert.throws(() => resolveMysqlTls({ DB_HOST: 'srv2224.hstgr.io' }), /requires verified TLS/);
  });
  it('throws when the CA file is missing', () => {
    assert.throws(
      () => resolveMysqlTls({ DB_HOST: 'srv2224.hstgr.io', DB_SSL_CA_FILE: path.join(directory, 'no-such-ca.pem') }),
      /cannot be read/,
    );
  });
  it('throws when the CA file is empty', async () => {
    const empty = path.join(directory, 'empty.pem');
    await writeFile(empty, '\n');
    assert.throws(() => resolveMysqlTls({ DB_HOST: 'srv2224.hstgr.io', DB_SSL_CA_FILE: empty }), /empty/);
  });
  it('pins the CA file with verification always on', () => {
    const tls = resolveMysqlTls({ DB_HOST: 'srv2224.hstgr.io', DB_SSL_CA_FILE: caFile });
    assert.equal(tls.profile, 'remote');
    assert.equal(tls.ssl.ca, CA_PEM);
    assert.equal(tls.ssl.rejectUnauthorized, true);
    assert.equal(tls.ssl.minVersion, 'TLSv1.2');
    assert.equal(tls.ssl.servername, 'srv2224.hstgr.io');
  });
  it('allows the explicit public-CA opt-in, still verified', () => {
    const tls = resolveMysqlTls({ DB_HOST: 'srv2224.hstgr.io', DB_TLS_ALLOW_PUBLIC_CA: '1' });
    assert.equal(tls.profile, 'remote-public-ca');
    assert.equal(tls.ssl.rejectUnauthorized, true);
    assert.equal(tls.ssl.minVersion, 'TLSv1.2');
    assert.equal(tls.ssl.servername, 'srv2224.hstgr.io');
    assert.equal('ca' in tls.ssl, false);
  });
  it('rejects any other DB_TLS_ALLOW_PUBLIC_CA value', () => {
    assert.throws(() => resolveMysqlTls({ DB_HOST: 'srv2224.hstgr.io', DB_TLS_ALLOW_PUBLIC_CA: 'yes' }), /DB_TLS_ALLOW_PUBLIC_CA/);
    assert.throws(() => resolveMysqlTls({ DB_HOST: 'srv2224.hstgr.io', DB_TLS_ALLOW_PUBLIC_CA: '2' }), /DB_TLS_ALLOW_PUBLIC_CA/);
  });
  it('never returns rejectUnauthorized: false', () => {
    for (const env of [
      { DB_HOST: '127.0.0.1' },
      { DB_HOST: 'srv2224.hstgr.io', DB_SSL_CA_FILE: caFile },
      { DB_HOST: 'srv2224.hstgr.io', DB_TLS_ALLOW_PUBLIC_CA: '1' },
    ]) {
      const { ssl } = resolveMysqlTls(env);
      if (ssl) assert.notEqual(ssl.rejectUnauthorized, false);
    }
  });
});

describe('buildMysqlPoolOptions', () => {
  it('keeps the existing pool behaviour and never disables FOUND_ROWS', () => {
    const options = buildMysqlPoolOptions({ DB_HOST: '127.0.0.1', DB_NAME: 'db', DB_USER: 'u', DB_PASSWORD: 'p' });
    assert.equal(options.charset, 'utf8mb4');
    assert.equal(options.timezone, 'Z');
    assert.equal(options.connectionLimit, 5);
    assert.equal(options.multipleStatements, false);
    assert.equal('flags' in options, false); // mysql2 default CLIENT_FOUND_ROWS stays on
    assert.equal(options.ssl, undefined);
  });
  it('attaches verified ssl for a remote host with a CA file', () => {
    const options = buildMysqlPoolOptions({ DB_HOST: 'srv2224.hstgr.io', DB_SSL_CA_FILE: caFile });
    assert.equal(options.ssl.rejectUnauthorized, true);
  });
});

describe('assertEncryptedSession / missingMysqlTables', () => {
  it('accepts a non-empty Ssl_version and rejects an empty one', () => {
    assert.equal(assertEncryptedSession('TLSv1.3', 'srv2224.hstgr.io'), 'TLSv1.3');
    assert.throws(() => assertEncryptedSession('', 'srv2224.hstgr.io'), /NOT encrypted/);
    assert.throws(() => assertEncryptedSession(null, 'srv2224.hstgr.io'), /NOT encrypted/);
  });
  it('reports exactly the missing required tables', () => {
    assert.deepEqual(REQUIRED_MYSQL_TABLES.length, 14);
    assert.deepEqual(missingMysqlTables(REQUIRED_MYSQL_TABLES), []);
    assert.deepEqual(
      missingMysqlTables(['user', 'session', 'account', 'verification', 'rateLimit']),
      ['aenural_operation_limits', 'aenural_orders', 'aenural_checkouts', 'aenural_webhooks', 'aenural_daily_usage', 'aenural_caption_jobs', 'aenural_projects', 'aenural_activity', 'aenural_email_delivery_attempts'],
    );
  });
});

describe('membershipConfig — TLS validation', () => {
  it('accepts loopback production MySQL without TLS settings', () => {
    const config = membershipConfig(mysqlEnv({ DB_HOST: '127.0.0.1' }));
    assert.equal(config.sqlite, false);
    assert.equal(config.mysqlTls.profile, 'loopback');
  });
  it('rejects a remote host with no TLS configuration', () => {
    assert.throws(() => membershipConfig(mysqlEnv({ DB_HOST: 'srv2224.hstgr.io' })), /requires verified TLS/);
  });
  it('accepts a remote host with a readable CA file', () => {
    const config = membershipConfig(mysqlEnv({ DB_HOST: 'srv2224.hstgr.io', DB_SSL_CA_FILE: caFile }));
    assert.equal(config.mysqlTls.profile, 'remote');
    assert.equal(config.mysqlTls.ssl.rejectUnauthorized, true);
  });
  it('keeps the SQLite dev default untouched', () => {
    const config = membershipConfig({ NODE_ENV: 'development', AENURAL_LOCAL_DATA_DIR: directory, BETTER_AUTH_URL: 'http://localhost:3000' });
    assert.equal(config.sqlite, true);
    assert.equal(config.mysqlTls, null);
  });
});

describe('membershipConfig — development MySQL (Phase 4 audit, tightened Step 5 S5-06)', () => {
  // The documented dev setup the wizard writes: remote MySQL from the PC,
  // http://localhost:3000, AUTH_TRUSTED_IP_HEADER=x-real-ip in .env.local
  // (config/membership.env.example:95). Phase 4 deliberately left the
  // header blank in non-production mode ("do not guess"); Step 5 (S5-06)
  // removes that exemption — the header is now required whenever the app
  // is not local (!local), regardless of NODE_ENV, so a non-local
  // dev/staging deploy cannot start auth with no header requirement.
  // Local SQLite mode (local === true) is unaffected and needs no header.
  const devMysqlEnv = (overrides = {}) => ({
    NODE_ENV: 'development',
    AENURAL_MEMBERSHIP_DATABASE: 'mysql',
    BETTER_AUTH_URL: 'http://localhost:3000',
    BETTER_AUTH_SECRET: 'x'.repeat(40),
    DB_HOST: 'srv2224.hstgr.io',
    DB_NAME: 'aenural_test', DB_USER: 'aenural_test', DB_PASSWORD: 'test-password',
    DB_TLS_ALLOW_PUBLIC_CA: '1',
    SMTP_HOST: 'smtp.hostinger.com', SMTP_USER: 'support@aenural.com',
    SMTP_PASSWORD: 'test-password', MAIL_FROM: 'support@aenural.com',
    ...overrides,
  });
  it('requires the trusted header with remote MySQL in development too (Step 5, S5-06)', () => {
    assert.throws(() => membershipConfig(devMysqlEnv()), /AUTH_TRUSTED_IP_HEADER/);
    const config = membershipConfig(devMysqlEnv({ AUTH_TRUSTED_IP_HEADER: 'x-real-ip' }));
    assert.equal(config.local, false);
    assert.equal(config.sqlite, false);
    assert.equal(config.origin, 'http://localhost:3000');
    assert.equal(config.mysqlTls.profile, 'remote-public-ca');
  });
  it('still requires HTTPS in production', () => {
    assert.throws(
      () => membershipConfig(devMysqlEnv({ NODE_ENV: 'production', AENURAL_MEMBERSHIP_ENABLED: '1', BETTER_AUTH_URL: 'http://aenural.com', AUTH_TRUSTED_IP_HEADER: 'x-real-ip' })),
      /require HTTPS/,
    );
  });
  it('requires the trusted header in production and in development MySQL mode (Step 5, S5-06)', () => {
    assert.throws(
      () => membershipConfig(devMysqlEnv({ NODE_ENV: 'production', AENURAL_MEMBERSHIP_ENABLED: '1', BETTER_AUTH_URL: 'https://aenural.com' })),
      /trusted proxy-IP header/,
    );
    assert.throws(
      () => membershipConfig(devMysqlEnv({ BETTER_AUTH_URL: 'https://aenural.com' })),
      /AUTH_TRUSTED_IP_HEADER/,
    );
    const production = membershipConfig(devMysqlEnv({ NODE_ENV: 'production', AENURAL_MEMBERSHIP_ENABLED: '1', BETTER_AUTH_URL: 'https://aenural.com', AUTH_TRUSTED_IP_HEADER: 'x-real-ip' }));
    assert.equal(production.sqlite, false);
    assert.equal(production.origin, 'https://aenural.com');
  });
});
