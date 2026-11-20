// check-mysql-tls.mjs — probe Hostinger MySQL TLS from Faisal's PC.
//
// INTENDED REPO PATH: scripts/membership/check-mysql-tls.mjs
//   (run from the repo root:  node scripts/membership/check-mysql-tls.mjs)
//
// WHAT IT DOES
//   Connects to the database named in .env.local, prints the server TLS
//   state (have_ssl / tls_version / Ssl_version / Ssl_cipher), and exits
//   non-zero if TLS was required but NOT established. Read-only: it runs
//   SHOW / SELECT only and never creates, alters, or drops anything.
//
// PROFILES (see docs/authentication/hostinger-setup.md §5-§6)
//   * Remote host (e.g. srv2224.hstgr.io) -> TLS is REQUIRED. The script
//     connects with ssl { rejectUnauthorized: true, minVersion: "TLSv1.2",
//     servername: <host> }, plus ssl.ca from DB_SSL_CA_FILE when that
//     variable names a PEM file. If the session is not encrypted, or the
//     certificate cannot be verified, it exits 1.
//   * Loopback host (127.0.0.1 / localhost) -> plain loopback, TLS not
//     required (Hostinger's own Node.js guide uses no ssl here). The
//     script reports Ssl_version (expected empty) and exits 0.
//
// SAFETY
//   * Reads credentials ONLY from .env.local in the current directory
//     (the same file the app reads). No credentials on the command line.
//   * NEVER logs the password, a DSN/connection string, or certificate
//     contents. On error it prints only the error code/message.
//   * NEVER sets rejectUnauthorized: false. If verification fails, the
//     fix is a Hostinger CA bundle (DB_SSL_CA_FILE) or an SSH tunnel --
//     see the setup guide §6, outcome B/C. Do not "fix" it here.
//
// USAGE
//   1. Fill in .env.local (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD,
//      and DB_SSL_CA_FILE only if Hostinger gave you a CA file).
//   2. Run from the repo root on the allowlisted PC:
//        node scripts/membership/check-mysql-tls.mjs
//   3. Exit 0 + "Ssl_version: TLSv1.2/1.3" = TLS verified. Anything else:
//      read the message and follow docs/authentication/hostinger-setup.md §6.
//   NOTE: if this probe passes with NO CA file (outcome A — public CA),
//   the app still needs DB_TLS_ALLOW_PUBLIC_CA=1 in .env.local before it
//   will open a remote MySQL connection (fail-closed rule). If it passes
//   only WITH a CA file (outcome B), set DB_SSL_CA_FILE to that file's path.
//
// // DEPENDENCIES: mysql2 only (already in package.json), plus the
// dependency-free server/membership/mysql-tls.mjs (loopback definition).
// Node >= 20.

import { readFileSync, existsSync } from "node:fs";
import { createConnection } from "mysql2/promise";
import { isLoopbackHost } from "../../server/membership/mysql-tls.mjs";

// --- Minimal .env.local parser (no extra dependency) -----------------------
// Lines: KEY=VALUE, # comments, optional surrounding quotes. No expansion.
function loadEnvFile(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function fail(message, code = 1) {
  console.error(`FAIL: ${message}`);
  process.exit(code);
}

const env = loadEnvFile(".env.local");
const host = env.DB_HOST || "127.0.0.1";
if (env.DB_PORT && !/^\d+$/.test(env.DB_PORT)) fail("DB_PORT must be a number (3306).");
const port = Number(env.DB_PORT || 3306);
const database = env.DB_NAME;
const user = env.DB_USER;
const password = env.DB_PASSWORD;

if (!database || !user || !password) {
  fail(
    "DB_NAME, DB_USER and DB_PASSWORD must be set in .env.local. " +
      "See docs/authentication/hostinger-setup.md §3.",
  );
}

const isLoopback = isLoopbackHost(host);
const isRemote = !isLoopback;

// Remote: TLS required. Loopback: plain (per Hostinger's Node.js guide).
let ssl;
if (isRemote) {
  ssl = { rejectUnauthorized: true, minVersion: "TLSv1.2", servername: host };
  if (env.DB_SSL_CA_FILE) {
    const caPath = env.DB_SSL_CA_FILE;
    if (!existsSync(caPath)) {
      fail(
        `DB_SSL_CA_FILE is set to "${caPath}" but that file does not exist. ` +
          "Check the path, or leave DB_SSL_CA_FILE blank and retry.",
      );
    }
    ssl.ca = readFileSync(caPath, "utf8"); // contents used, never printed
    console.log(`CA file: ${caPath} (loaded, contents not shown)`);
  }
}

console.log(`Host: ${host}:${port}  Database: ${database}  User: ${user}`);
console.log(`Profile: ${isRemote ? "remote — TLS REQUIRED" : "loopback — plain"}`);

let connection;
try {
  connection = await createConnection({
    host,
    port,
    user,
    password, // never logged
    database,
    connectTimeout: 10000,
    ...(ssl ? { ssl } : {}),
  });

  const [[versionRow]] = await connection.query("SELECT VERSION() AS version");
  const [[haveSsl]] = await connection.query("SHOW VARIABLES LIKE 'have_ssl'");
  const [[tlsVersion]] = await connection.query("SHOW VARIABLES LIKE 'tls_version'");
  const [[requireSecure]] = await connection.query(
    "SHOW VARIABLES LIKE 'require_secure_transport'",
  );
  const [[sslVersion]] = await connection.query(
    "SHOW SESSION STATUS LIKE 'Ssl_version'",
  );
  const [[sslCipher]] = await connection.query(
    "SHOW SESSION STATUS LIKE 'Ssl_cipher'",
  );

  console.log(`Server version: ${versionRow?.version ?? "unknown"}`);
  console.log(`have_ssl: ${haveSsl?.Value ?? "unknown"}`);
  console.log(`tls_version: ${tlsVersion?.Value ?? "unknown"}`);
  console.log(`require_secure_transport: ${requireSecure?.Value ?? "unknown"}`);
  console.log(`Ssl_version: ${sslVersion?.Value || "(empty — NOT encrypted)"}`);
  console.log(`Ssl_cipher: ${sslCipher?.Value || "(empty)"}`);

  if (isRemote) {
    const version = sslVersion?.Value || "";
    if (!version) {
      fail(
        "Remote host but this session is NOT encrypted (Ssl_version is empty). " +
          "Refusing to proceed. See setup guide §6: ask Hostinger for a CA " +
          "bundle (DB_SSL_CA_FILE) or use an SSH tunnel. " +
          "NEVER fix this with rejectUnauthorized: false.",
      );
    }
    if (!/^TLSv1\.[23]/.test(version)) {
      fail(
        `Remote session uses ${version}, not TLS 1.2/1.3. Refusing to proceed. ` +
          "See setup guide §6.",
      );
    }
    console.log(`OK: remote session is encrypted (${version}).`);
  } else {
    console.log("OK: loopback connection (no TLS expected here).");
  }
  process.exit(0);
} catch (error) {
  // Log code/message only — mysql2 errors never include the password,
  // and we print nothing else that could carry it.
  const code = error?.code ? ` [${error.code}]` : "";
  console.error(`Connection/probe failed${code}: ${error?.message ?? error}`);
  if (isRemote && /self-signed|unable to verify|UNABLE_TO_VERIFY|CERT/i.test(error?.message ?? "")) {
    console.error(
      "Hint: the server certificate is not verifiable with the default trust " +
        "store. Ask Hostinger support for the CA certificate for this MySQL " +
        "host and set DB_SSL_CA_FILE to its path (setup guide §6, outcome B). " +
        "Do NOT set rejectUnauthorized: false.",
    );
  }
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(error?.code ?? "") || /timed out/i.test(error?.message ?? "")) {
    console.error(
      "Hint: check hPanel -> Databases -> Remote MySQL — the allowlisted IP " +
        "may be stale (setup guide §5.1). This is an allowlist problem, " +
        "not a TLS problem.",
    );
  }
  process.exit(1);
} finally {
  if (connection) await connection.end().catch(() => {});
}
