// Helpers for tests/membership-mysql.test.mjs — disposable-MySQL integration tests.
// Two pieces that are test infrastructure, not app code:
//   1. A minimal implicit-TLS SMTP sink. The app in MySQL mode only sends mail
//      via SMTP (local-outbox is rejected outside local/SQLite mode), so the
//      suite runs a real SMTP server on 127.0.0.1 and captures the OTP /
//      reset mail the app sends. It accepts any AUTH credentials, speaks
//      EHLO / AUTH PLAIN / AUTH LOGIN / MAIL / RCPT / DATA / RSET / QUIT,
//      and never delivers anything anywhere.
//   2. A migration runner that executes 001-initial-mysql.sql statement by
//      statement (the app never auto-migrates MySQL, so the test imports the
//      file exactly as an operator would) and exposes the statements for the
//      idempotency checks.
//
// No credentials here: everything is passed in by the caller / environment.
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// SMTP sink (implicit TLS, self-signed cert generated with openssl)
// ---------------------------------------------------------------------------

const FIXTURE_CERT = fileURLToPath(
  new URL('../fixtures/smtp-sink-cert.pem', import.meta.url),
);
const FIXTURE_KEY = fileURLToPath(
  new URL('../fixtures/smtp-sink-key.pem', import.meta.url),
);

async function fileExists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the sink certificate. Precedence:
 *   1. AENURAL_MYSQL_TEST_SMTP_CERT / AENURAL_MYSQL_TEST_SMTP_KEY (env)
 *   2. tests/fixtures/smtp-sink-{cert,key}.pem (shipped test fixtures)
 *   3. Fresh ephemeral cert in a temp dir (SMTP verification will then fail
 *      unless NODE_EXTRA_CA_CERTS points at the generated CA — prefer 1/2).
 */
async function resolveSinkCert() {
  const envCert = process.env.AENURAL_MYSQL_TEST_SMTP_CERT;
  const envKey = process.env.AENURAL_MYSQL_TEST_SMTP_KEY;
  if (envCert && envKey) return { cert: envCert, key: envKey };
  if (await fileExists(FIXTURE_CERT) && (await fileExists(FIXTURE_KEY))) {
    return { cert: FIXTURE_CERT, key: FIXTURE_KEY };
  }
  const directory = await mkdtemp(path.join(os.tmpdir(), 'aenural-smtp-cert-'));
  execFileSync(
    'openssl',
    [
      'req', '-x509', '-newkey', 'rsa:2048',
      '-keyout', path.join(directory, 'sink-key.pem'),
      '-out', path.join(directory, 'sink-cert.pem'),
      '-days', '2', '-nodes',
      '-subj', '/CN=127.0.0.1',
      '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost',
    ],
    { stdio: 'ignore' },
  );
  console.warn(
    '[mysql-test-kit] No SMTP sink fixtures found; generated an ephemeral cert. ' +
      'SMTP verification will fail unless NODE_EXTRA_CA_CERTS points at its CA.',
  );
  return {
    cert: path.join(directory, 'sink-cert.pem'),
    key: path.join(directory, 'sink-key.pem'),
  };
}

export async function createSmtpSink() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'aenural-smtp-sink-'));
  const { key, cert } = await resolveSinkCert();
  const messages = [];
  const waiters = [];

  function notify() {
    for (let i = waiters.length - 1; i >= 0; i--) {
      const waiter = waiters[i];
      const found = messages.find(waiter.predicate);
      if (found) {
        waiters.splice(i, 1);
        waiter.resolve(found);
      }
    }
  }

  // Track live sockets so close() can destroy them: server.close() alone
  // waits for open connections, which would hang the test runner if a
  // client (e.g. a failed SMTP verify) left one half-open.
  const sockets = new Set();
  const server = tls.createServer(
    { key: await readFile(key), cert: await readFile(cert), minVersion: 'TLSv1.2' },
    (socket) => {
      socket.setEncoding('utf8');
      socket.write('220 aenural-mysql-test ESMTP sink\r\n');
      let buffer = '';
      let inData = false;
      let dataLines = [];
      let current = { from: '', to: [] };
      let authStep = 0; // 0 = idle, 1 = AUTH LOGIN username, 2 = AUTH LOGIN password

      function reply(line) {
        socket.write(`${line}\r\n`);
      }

      function handleLine(line) {
        if (inData) {
          if (line === '.') {
            inData = false;
            const raw = dataLines.join('\n');
            dataLines = [];
            const splitAt = raw.indexOf('\n\n');
            // Nodemailer sends text as quoted-printable: long lines (like
            // the reset URL) are soft-wrapped with `=` at end of line. Join
            // those breaks back, or URL/token extraction sees a truncated
            // value. (`=3D` etc. in the query string do not matter here:
            // callers only use the URL path.)
            const text = (splitAt >= 0 ? raw.slice(splitAt + 2) : raw).replace(/=\n/g, '');
            messages.push({ ...current, raw, text, receivedAt: new Date() });
            current = { from: '', to: [] };
            notify();
            reply('250 OK: message accepted');
          } else {
            dataLines.push(line);
          }
          return;
        }
        if (authStep === 1) {
          authStep = 2;
          reply('334 UGFzc3dvcmQ6'); // "Password:"
          return;
        }
        if (authStep === 2) {
          authStep = 0;
          reply('235 Authentication successful');
          return;
        }
        const upper = line.toUpperCase();
        if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
          reply('250-localhost\r\n250 AUTH PLAIN LOGIN');
        } else if (upper.startsWith('AUTH PLAIN')) {
          reply('235 Authentication successful');
        } else if (upper.startsWith('AUTH LOGIN')) {
          authStep = 1;
          reply('334 VXNlcm5hbWU6'); // "Username:"
        } else if (upper.startsWith('MAIL FROM:')) {
          current.from = line.slice('MAIL FROM:'.length).trim();
          reply('250 OK');
        } else if (upper.startsWith('RCPT TO:')) {
          current.to.push(line.slice('RCPT TO:'.length).trim());
          reply('250 OK');
        } else if (upper === 'DATA') {
          inData = true;
          dataLines = [];
          reply('354 End data with <CR><LF>.<CR><LF>');
        } else if (upper === 'RSET') {
          inData = false;
          dataLines = [];
          current = { from: '', to: [] };
          reply('250 OK');
        } else if (upper === 'NOOP') {
          reply('250 OK');
        } else if (upper === 'QUIT') {
          reply('221 Bye');
          socket.end();
        } else if (upper.startsWith('VRFY')) {
          reply('252 Send some mail, I will try my best');
        } else {
          reply('502 Command not implemented');
        }
      }

      socket.on('data', (chunk) => {
        buffer += chunk;
        let index;
        while ((index = buffer.indexOf('\r\n')) >= 0) {
          const line = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          handleLine(line);
        }
      });
      socket.on('error', () => { /* sink sockets are disposable */ });
    },
  );

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  return {
    port: server.address().port,
    directory,
    messages,
    /** Resolve with the first captured message matching `predicate`. */
    waitForMail(predicate, timeoutMs = 15000) {
      const found = messages.find(predicate);
      if (found) return Promise.resolve(found);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const index = waiters.findIndex((w) => w.resolve === resolve);
          if (index >= 0) waiters.splice(index, 1);
          reject(new Error('Timed out waiting for expected mail'));
        }, timeoutMs);
        waiters.push({
          predicate,
          resolve: (message) => {
            clearTimeout(timer);
            resolve(message);
          },
        });
      });
    },
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

// ---------------------------------------------------------------------------
// Migration runner
// ---------------------------------------------------------------------------

/** Split a .sql migration file into executable statements (no `;` inside). */
export function splitSql(sqlText) {
  return sqlText
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

/**
 * Execute every statement of a migration file, in order, on a mysql2
 * promise pool. Returns the executed statements. Throws on the first
 * failing statement (the caller decides whether that failure is expected).
 */
export async function runMigration(pool, sqlPath) {
  const sqlText = await readFile(sqlPath, 'utf8');
  const statements = splitSql(sqlText);
  // ONE dedicated connection: the idempotent-index blocks in
  // 001-initial-mysql.sql use session-scoped @variables (SET then
  // PREPARE/EXECUTE), which are only visible on the same connection.
  // A pool would silently run them on different connections. (Real
  // operators import with the mysql CLI / phpMyAdmin, also single-session.)
  const connection = await pool.getConnection();
  try {
    for (const statement of statements) {
      await connection.query(statement);
    }
  } finally {
    connection.release();
  }
  return statements;
}

/** Drop every table in a database (test databases are disposable).
 * Uses ONE dedicated connection (SET FOREIGN_KEY_CHECKS is session-scoped)
 * and schema-qualified names, so it drops tables in `database` — never in
 * the pool's default database. */
export async function dropAllTables(pool, database) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [database],
    );
    await connection.query('SET FOREIGN_KEY_CHECKS=0');
    try {
      for (const row of rows) {
        await connection.query(`DROP TABLE IF EXISTS \`${database}\`.\`${row.name}\``);
      }
    } finally {
      await connection.query('SET FOREIGN_KEY_CHECKS=1');
    }
    return rows.length;
  } finally {
    connection.release();
  }
}
