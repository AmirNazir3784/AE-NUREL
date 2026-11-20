// verify-mysql-schema.mjs — check the required tables exist in the dev DB.
//
// INTENDED REPO PATH: scripts/membership/verify-mysql-schema.mjs
//   (run from the repo root:  node scripts/membership/verify-mysql-schema.mjs)
//
// WHAT IT DOES
//   Connects to the database named in .env.local, lists its tables with
//   SHOW TABLES, and reports which required tables are present and which
//   are missing. Exits 0 when all required tables exist, 1 otherwise.
//
//   READ-ONLY. It never creates, alters, drops, inserts, or deletes
//   anything. If tables are missing, import
//   server/membership/migrations/001-initial-mysql.sql first -- see
//   docs/authentication/hostinger-setup.md §7.
//
// REQUIRED TABLES (Better Auth 1.7.14 + app tables, per
// server/membership/migrations/001-initial-mysql.sql):
//   user, session, account, verification, rateLimit,
//   aenural_activity, aenural_projects, aenural_caption_jobs,
//   aenural_daily_usage, aenural_checkouts, aenural_orders,
//   aenural_operation_limits, aenural_webhooks
//
// SAFETY
//   * Reads credentials ONLY from .env.local in the current directory.
//     No credentials on the command line.
//   * NEVER logs the password, a DSN/connection string, or table contents.
//     Only table NAMES and row counts are printed.
//   * Remote hosts use TLS with verification (ssl { rejectUnauthorized:
//     true, minVersion: "TLSv1.2", servername }), plus ssl.ca from
//     DB_SSL_CA_FILE when set. NEVER rejectUnauthorized: false.
//     Loopback (127.0.0.1) connects plain, per Hostinger's Node.js guide.
//
// USAGE
//   1. Fill in .env.local (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD).
//   2. Import the migration first if you have not yet (setup guide §7).
//   3. Run from the repo root on the allowlisted PC:
//        node scripts/membership/verify-mysql-schema.mjs
//
// // DEPENDENCIES: mysql2 only (already in package.json), plus the
// dependency-free server/membership/mysql-tls.mjs (loopback definition).
// Node >= 20.

import { readFileSync, existsSync } from "node:fs";
import { createConnection } from "mysql2/promise";
import { isLoopbackHost } from "../../server/membership/mysql-tls.mjs";

const REQUIRED_TABLES = [
  // Better Auth core
  "user",
  "session",
  "account",
  "verification",
  "rateLimit",
  // App tables
  "aenural_activity",
  "aenural_projects",
  "aenural_caption_jobs",
  "aenural_daily_usage",
  "aenural_checkouts",
  "aenural_orders",
  "aenural_operation_limits",
  "aenural_webhooks",
];

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

let ssl;
if (!isLoopback) {
  ssl = { rejectUnauthorized: true, minVersion: "TLSv1.2", servername: host };
  if (env.DB_SSL_CA_FILE) {
    if (!existsSync(env.DB_SSL_CA_FILE)) {
      fail(`DB_SSL_CA_FILE "${env.DB_SSL_CA_FILE}" does not exist.`);
    }
    ssl.ca = readFileSync(env.DB_SSL_CA_FILE, "utf8"); // used, never printed
  }
}

console.log(`Host: ${host}:${port}  Database: ${database}  User: ${user}`);

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

  // SHOW TABLES is read-only. Column name varies by server, so read the
  // first value of each row regardless of its key.
  const [rows] = await connection.query("SHOW TABLES");
  const present = new Set(rows.map((row) => Object.values(row)[0]));

  const missing = REQUIRED_TABLES.filter((table) => !present.has(table));
  const extra = [...present].filter((table) => !REQUIRED_TABLES.includes(table));

  console.log(`\nPresent (${REQUIRED_TABLES.length - missing.length}/${REQUIRED_TABLES.length} required):`);
  for (const table of REQUIRED_TABLES) {
    console.log(`  ${present.has(table) ? "[OK]     " : "[MISSING]"} ${table}`);
  }
  if (extra.length > 0) {
    console.log(`\nOther tables in this database (not required, left alone): ${extra.join(", ")}`);
  }

  // Row counts are read-only metadata (SELECT COUNT(*) only, no contents).
  if (missing.length === 0) {
    console.log("\nRow counts (sanity check only):");
    for (const table of REQUIRED_TABLES) {
      const [[row]] = await connection.query(
        `SELECT COUNT(*) AS n FROM \`${table}\``,
      );
      console.log(`  ${table}: ${row.n}`);
    }
    console.log("\nOK: all required tables exist.");
    process.exit(0);
  }

  fail(
    `Missing ${missing.length} table(s): ${missing.join(", ")}. ` +
      "Import server/membership/migrations/001-initial-mysql.sql into " +
      `'${database}' first (docs/authentication/hostinger-setup.md §7), ` +
      "then re-run this script.",
  );
} catch (error) {
  const code = error?.code ? ` [${error.code}]` : "";
  console.error(`Check failed${code}: ${error?.message ?? error}`);
  process.exit(1);
} finally {
  if (connection) await connection.end().catch(() => {});
}
