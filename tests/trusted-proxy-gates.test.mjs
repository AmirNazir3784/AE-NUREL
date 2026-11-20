// Trusted-proxy gates (Step 5 security review: S5-01/S5-02/S5-03/S5-06/
// S5-19 release-check part / S5-21).
//
// Pure startup + release-check tests only: membershipConfig() and the
// release:check script run without node_modules (no better-auth, mysql2
// or nodemailer is imported on these paths) and never touch a real
// database, network or mailbox. The release:check cases spawn the script
// as a child process with an explicit, disposable environment.
//
// NOTE on the 6-digit OTP literals: this file contains none. Do not add
// any — the fetch pipeline corrupts them (see production-handover §A.5).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  membershipConfig, TRUSTED_IP_HEADERS, assertTrustedIpHeader,
} from '../server/membership/config.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let directory;
before(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'aenural-trusted-proxy-'));
});
after(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

const SECRET = 'x'.repeat(40);

function prodMysqlEnv(overrides = {}) {
  return {
    NODE_ENV: 'production',
    AENURAL_MEMBERSHIP_ENABLED: '1',
    BETTER_AUTH_URL: 'https://aenural.com',
    BETTER_AUTH_SECRET: SECRET,
    DB_HOST: '127.0.0.1',
    DB_NAME: 'aenural_test', DB_USER: 'aenural_test', DB_PASSWORD: 'test-password',
    SMTP_HOST: 'smtp.hostinger.com', SMTP_USER: 'support@aenural.com',
    SMTP_PASSWORD: 'test-password', MAIL_FROM: 'support@aenural.com',
    AUTH_TRUSTED_IP_HEADER: 'x-real-ip',
    ...overrides,
  };
}

function devMysqlEnv(overrides = {}) {
  return {
    NODE_ENV: 'development',
    AENURAL_MEMBERSHIP_DATABASE: 'mysql',
    BETTER_AUTH_URL: 'http://localhost:3000',
    BETTER_AUTH_SECRET: SECRET,
    DB_HOST: 'srv2224.hstgr.io',
    DB_NAME: 'aenural_test', DB_USER: 'aenural_test', DB_PASSWORD: 'test-password',
    DB_TLS_ALLOW_PUBLIC_CA: '1',
    SMTP_HOST: 'smtp.hostinger.com', SMTP_USER: 'support@aenural.com',
    SMTP_PASSWORD: 'test-password', MAIL_FROM: 'support@aenural.com',
    ...overrides,
  };
}

// Run scripts/membership/release-check.mjs as a child process with exactly
// the environment given (plus PATH so `node` resolves). Resolves with the
// exit code and captured output instead of throwing on a non-zero exit.
function runReleaseCheck(envOverrides) {
  const env = { PATH: process.env.PATH, ...envOverrides };
  return new Promise((resolve) => {
    execFile('node', ['scripts/membership/release-check.mjs'], { cwd: repoRoot, env }, (error, stdout, stderr) => {
      resolve({ code: error ? error.code : 0, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

function releaseEnv(overrides = {}) {
  return {
    NODE_ENV: 'production',
    AENURAL_MEMBERSHIP_ENABLED: '1',
    SITE_URL: 'https://aenural.com',
    BETTER_AUTH_URL: 'https://aenural.com',
    BETTER_AUTH_SECRET: SECRET,
    DB_HOST: '127.0.0.1', DB_PORT: '3306',
    DB_NAME: 'aenural_test', DB_USER: 'aenural_test', DB_PASSWORD: 'test-password',
    SMTP_HOST: 'smtp.hostinger.com', SMTP_PORT: '465', SMTP_SECURE: 'true',
    SMTP_USER: 'support@aenural.com', SMTP_PASSWORD: 'test-password',
    MAIL_FROM: 'support@aenural.com',
    AUTH_TRUSTED_IP_HEADER: 'x-real-ip',
    NEXT_PUBLIC_AENURAL_AUTO_CAPTION_RELEASE: '1',
    NEXT_PUBLIC_AENURAL_SITE_PREVIEW: '0',
    ...overrides,
  };
}

describe('trusted-proxy gates — shared allowlist (S5-02 / S5-03)', () => {
  it('the shared allowlist contains only x-real-ip until Hostinger confirms otherwise (S5-01)', () => {
    assert.deepEqual([...TRUSTED_IP_HEADERS], ['x-real-ip']);
    assert.equal(Object.isFrozen(TRUSTED_IP_HEADERS), true);
  });

  it('release:check imports the shared allowlist from config.mjs, so the two gates cannot disagree', async () => {
    const source = await readFile(path.join(repoRoot, 'scripts/membership/release-check.mjs'), 'utf8');
    assert.match(source, /TRUSTED_IP_HEADERS/);
    assert.match(source, /from '\.\.\/\.\.\/server\/membership\/config\.mjs'/);
    assert.doesNotMatch(source, /'x-forwarded-for','cf-connecting-ip'/);
  });

  it("a typo'd header value throws at startup in enabled mode (S5-03)", () => {
    assert.throws(
      () => membershipConfig(prodMysqlEnv({ AUTH_TRUSTED_IP_HEADER: 'x-realip' })),
      /unrecognised value 'x-realip'/,
    );
    assert.throws(
      () => assertTrustedIpHeader({ AUTH_TRUSTED_IP_HEADER: 'x-realip' }),
      /must be the Hostinger-confirmed value \(x-real-ip\)/,
    );
  });

  it('a typo\'d header value throws at startup in owner-only mode too (S5-03)', () => {
    const ownerEnv = {
      NODE_ENV: 'production',
      AENURAL_OWNER_TEST_MODE: '1',
      AENURAL_OWNER_DATA_DIR: directory,
      BETTER_AUTH_SECRET: SECRET,
      BETTER_AUTH_URL: 'https://aenural.com',
      AUTH_TRUSTED_IP_HEADER: 'x-realip',
    };
    assert.throws(() => membershipConfig(ownerEnv), /unrecognised value 'x-realip'/);
  });

  it('unsafe header values throw with a reason naming why each is unsafe (S5-03)', () => {
    assert.throws(
      () => assertTrustedIpHeader({ AUTH_TRUSTED_IP_HEADER: 'x-forwarded-for' }),
      /shared rate-limit counter/,
    );
    assert.throws(
      () => assertTrustedIpHeader({ AUTH_TRUSTED_IP_HEADER: 'cf-connecting-ip' }),
      /strips cf-connecting-ip/,
    );
    // Owner-only mode gets the same value check, not just a blank check.
    const ownerEnv = (header) => ({
      NODE_ENV: 'production',
      AENURAL_OWNER_TEST_MODE: '1',
      AENURAL_OWNER_DATA_DIR: directory,
      BETTER_AUTH_SECRET: SECRET,
      BETTER_AUTH_URL: 'https://aenural.com',
      AUTH_TRUSTED_IP_HEADER: header,
    });
    assert.throws(() => membershipConfig(ownerEnv('x-forwarded-for')), /shared rate-limit counter/);
    assert.throws(() => membershipConfig(ownerEnv('cf-connecting-ip')), /strips cf-connecting-ip/);
  });

  it("accepts 'x-real-ip' (case-insensitively) in both modes", () => {
    assert.equal(membershipConfig(prodMysqlEnv({ AUTH_TRUSTED_IP_HEADER: 'X-Real-IP' })).sqlite, false);
    const owner = membershipConfig({
      NODE_ENV: 'production',
      AENURAL_OWNER_TEST_MODE: '1',
      AENURAL_OWNER_DATA_DIR: directory,
      BETTER_AUTH_SECRET: SECRET,
      BETTER_AUTH_URL: 'https://aenural.com',
      AUTH_TRUSTED_IP_HEADER: 'x-real-ip',
    });
    assert.equal(owner.ownerOnly, true);
  });
});

describe('trusted-proxy gates — header required whenever !local (S5-06)', () => {
  it('requires the header with remote MySQL in development (NODE_ENV=development)', () => {
    assert.throws(() => membershipConfig(devMysqlEnv()), /AUTH_TRUSTED_IP_HEADER/);
    assert.equal(membershipConfig(devMysqlEnv({ AUTH_TRUSTED_IP_HEADER: 'x-real-ip' })).local, false);
  });

  it('requires the header with remote MySQL when NODE_ENV is unset', () => {
    const { NODE_ENV, ...noNodeEnv } = devMysqlEnv();
    assert.equal(NODE_ENV, 'development'); // guard: the helper sets it, so strip it
    // NODE_ENV unset + ENABLED=1 is the "enabled outside production" path.
    const env = { ...noNodeEnv, AENURAL_MEMBERSHIP_ENABLED: '1' };
    assert.throws(() => membershipConfig(env), /AUTH_TRUSTED_IP_HEADER/);
    assert.equal(
      membershipConfig({ ...env, AUTH_TRUSTED_IP_HEADER: 'x-real-ip' }).local,
      false,
    );
  });

  it('local SQLite mode still needs no header', () => {
    const config = membershipConfig({
      NODE_ENV: 'development',
      AENURAL_LOCAL_DATA_DIR: directory,
      BETTER_AUTH_URL: 'http://localhost:3000',
    });
    assert.equal(config.local, true);
    assert.equal(config.sqlite, true);
  });
});

describe('trusted-proxy gates — fully disabled deploy needs no header (S5-21)', () => {
  it('production with membership disabled returns null without the header', () => {
    assert.equal(membershipConfig({ NODE_ENV: 'production', AENURAL_LOCAL_DATA_DIR: directory }), null);
    assert.equal(
      membershipConfig({ NODE_ENV: 'production', AENURAL_MEMBERSHIP_ENABLED: '0', AENURAL_LOCAL_DATA_DIR: directory }),
      null,
    );
  });

  it('a fully disabled deploy does not start auth at all, even with a garbage header value', () => {
    assert.equal(
      membershipConfig({
        NODE_ENV: 'production',
        AENURAL_LOCAL_DATA_DIR: directory,
        AUTH_TRUSTED_IP_HEADER: 'x-realip',
      }),
      null,
    );
  });
});

describe('trusted-proxy gates — release:check (S5-02 / S5-19)', () => {
  it("passes with x-real-ip and NEXT_PUBLIC_AENURAL_SITE_PREVIEW=0", async () => {
    const result = await runReleaseCheck(releaseEnv());
    assert.equal(result.code, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Configuration names are complete/);
  });

  it('rejects x-forwarded-for with a distinct message about the shared counter', async () => {
    const result = await runReleaseCheck(releaseEnv({ AUTH_TRUSTED_IP_HEADER: 'x-forwarded-for' }));
    assert.equal(result.code, 1);
    assert.match(result.stderr, /x-forwarded-for is not safe here/);
    assert.match(result.stderr, /shared rate-limit counter/);
  });

  it('rejects cf-connecting-ip with a distinct message about Hostinger stripping it', async () => {
    const result = await runReleaseCheck(releaseEnv({ AUTH_TRUSTED_IP_HEADER: 'cf-connecting-ip' }));
    assert.equal(result.code, 1);
    assert.match(result.stderr, /cf-connecting-ip is not safe here/);
    assert.match(result.stderr, /strips cf-connecting-ip/);
  });

  it("rejects a typo'd header value", async () => {
    const result = await runReleaseCheck(releaseEnv({ AUTH_TRUSTED_IP_HEADER: 'x-realip' }));
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Only the Hostinger-confirmed value is accepted/);
  });

  it("fails when NEXT_PUBLIC_AENURAL_SITE_PREVIEW is not '0' (S5-19)", async () => {
    const result = await runReleaseCheck(releaseEnv({ NEXT_PUBLIC_AENURAL_SITE_PREVIEW: '1' }));
    assert.equal(result.code, 1);
    assert.match(result.stderr, /NEXT_PUBLIC_AENURAL_SITE_PREVIEW=0/);
    const unset = releaseEnv();
    delete unset.NEXT_PUBLIC_AENURAL_SITE_PREVIEW;
    const unsetResult = await runReleaseCheck(unset);
    assert.equal(unsetResult.code, 1);
    assert.match(unsetResult.stderr, /NEXT_PUBLIC_AENURAL_SITE_PREVIEW=0/);
  });
});

describe('trusted-proxy gates — non-loopback origin requires NODE_ENV=production (S5-32)', () => {
  it('development + non-loopback origin fails loudly at startup', () => {
    assert.throws(
      () => membershipConfig(prodMysqlEnv({ NODE_ENV: 'development', AENURAL_LOCAL_DATA_DIR: directory })),
      /NODE_ENV=production on a non-loopback origin/,
    );
  });

  it('unset NODE_ENV + non-loopback origin fails loudly at startup', () => {
    const env = prodMysqlEnv({ AENURAL_LOCAL_DATA_DIR: directory });
    delete env.NODE_ENV;
    assert.throws(() => membershipConfig(env), /NODE_ENV=production on a non-loopback origin/);
  });

  it('NODE_ENV=test + non-loopback origin is exempt (automated-test harness only)', () => {
    const config = membershipConfig(prodMysqlEnv({ NODE_ENV: 'test', AENURAL_LOCAL_DATA_DIR: directory }));
    assert.equal(config.origin, 'https://aenural.com');
  });

  it('reserved test-only hostnames are exempt in development (MySQL suite uses https://aenural-mysql.test)', () => {
    const config = membershipConfig(prodMysqlEnv({ NODE_ENV: 'development', BETTER_AUTH_URL: 'https://aenural-mysql.test', AENURAL_LOCAL_DATA_DIR: directory }));
    assert.equal(config.origin, 'https://aenural-mysql.test');
  });

  it('development + loopback origin is unaffected', () => {
    const config = membershipConfig(devMysqlEnv({ AUTH_TRUSTED_IP_HEADER: 'x-real-ip' }));
    assert.equal(config.origin, 'http://localhost:3000');
  });
});
