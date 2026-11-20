// Test-only TLS certificate authority for AENural SMTP tests.
//
// The app's mail transport verifies the SMTP server certificate
// (rejectUnauthorized: true, TLS 1.2+), so a local SMTP server —
// Mailpit or the fake server in fake-smtp.mjs — needs a certificate
// that chains to a CA the Node process trusts. Node only reads
// NODE_EXTRA_CA_CERTS at process startup, so the test file re-execs
// itself once with that variable pointed at the CA generated here
// (see tests/membership-smtp.test.mjs). The CA and server certificate
// are generated with the openssl CLI into the OS temp directory, are
// valid for 2 days, cover DNS:localhost and IP:127.0.0.1, and are
// test-only: they must never be copied into the repository or used
// for anything but loopback SMTP tests.
//
// Only Node built-ins are used, so this helper loads with no
// node_modules installed. When openssl is missing, ensureSmtpTestCa()
// returns null and the TLS-dependent tests skip with a clear reason
// instead of failing.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, chmodSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const SMTP_TEST_CA_DIR = path.join(os.tmpdir(), 'aenural-smtp-test-ca');
const CA_TTL_MS = 36 * 3_600_000; // Reuse a CA younger than 36 hours.

function freshEnough(file) {
  try {
    return Date.now() - statSync(file).mtimeMs < CA_TTL_MS;
  } catch {
    return false;
  }
}

function openssl(args, cwd) {
  execFileSync('openssl', args, { cwd, stdio: 'ignore', timeout: 30_000 });
}

// Generate (or reuse) the test CA + server certificate. Returns
// { dir, caPath, certPath, keyPath } or null when openssl is
// unavailable or generation fails.
export function ensureSmtpTestCa(dir = SMTP_TEST_CA_DIR) {
  const caPath = path.join(dir, 'ca.pem');
  const certPath = path.join(dir, 'server.pem');
  const keyPath = path.join(dir, 'server-key.pem');
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    try {
      chmodSync(dir, 0o700);
    } catch {
      // Best effort; the temp directory is already per-user.
    }
    if (
      existsSync(caPath) &&
      existsSync(certPath) &&
      existsSync(keyPath) &&
      freshEnough(caPath)
    ) {
      return { dir, caPath, certPath, keyPath };
    }
    openssl(
      ['req', '-x509', '-newkey', 'rsa:2048', '-keyout', 'ca-key.pem', '-out', 'ca.pem', '-days', '2', '-nodes', '-subj', '/CN=AENural SMTP Test CA'],
      dir,
    );
    openssl(
      ['req', '-newkey', 'rsa:2048', '-keyout', 'server-key.pem', '-out', 'server.csr', '-nodes', '-subj', '/CN=localhost'],
      dir,
    );
    writeFileSync(path.join(dir, 'ext.cnf'), 'subjectAltName=DNS:localhost,IP:127.0.0.1\n');
    openssl(
      ['x509', '-req', '-in', 'server.csr', '-CA', 'ca.pem', '-CAkey', 'ca-key.pem', '-CAcreateserial', '-out', 'server.pem', '-days', '2', '-extfile', 'ext.cnf'],
      dir,
    );
    return { dir, caPath, certPath, keyPath };
  } catch {
    return null;
  }
}

// The NODE_EXTRA_CA_CERTS value the test process must have for the
// test CA to be trusted. When the variable is already set to another
// CA file, the two are combined into one file (Node accepts a single
// path) instead of clobbering the existing trust.
export function trustedCaPath(caPath, dir = SMTP_TEST_CA_DIR) {
  const existing = process.env.NODE_EXTRA_CA_CERTS;
  if (!existing || existing === caPath) return caPath;
  try {
    const combined = path.join(dir, 'combined-ca.pem');
    const extra = readFileSync(existing, 'utf8');
    const mine = readFileSync(caPath, 'utf8');
    if (extra.includes(mine.trim())) return existing;
    writeFileSync(combined, `${extra.trim()}\n${mine.trim()}\n`);
    return combined;
  } catch {
    return caPath;
  }
}

export function isCaTrusted(wantedPath) {
  return process.env.NODE_EXTRA_CA_CERTS === wantedPath;
}
