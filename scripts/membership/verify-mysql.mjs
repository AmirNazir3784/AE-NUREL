// MySQL readiness check. Read-only: connects, proves the session is
// encrypted when the configured profile requires TLS, and checks that the
// Better Auth + AENural schema was imported. It NEVER runs migrations and
// NEVER creates or alters tables — import
// server/membership/migrations/001-initial-mysql.sql manually first.
// Usage: npm run membership:verify-mysql
// Exit 0 only when the connection, TLS (if remote) and schema all pass.
// Logs host, TLS version/cipher and table names only — never credentials.
import { membershipConfig } from '../../server/membership/config.mjs';
import { openMembershipDatabase } from '../../server/membership/database.mjs';
import { missingMysqlTables, REQUIRED_MYSQL_TABLES } from '../../server/membership/mysql-tls.mjs';

const problems = [];
let pool;
try {
  const config = membershipConfig();
  if (!config) throw new Error('Account services are unavailable (membership is disabled).');
  if (config.sqlite) throw new Error('MySQL mode is not active (SQLite mode). Set AENURAL_MEMBERSHIP_DATABASE=mysql in development, or NODE_ENV=production with AENURAL_MEMBERSHIP_ENABLED=1, before running this check.');
  const { authDatabase, connection, dialect } = await openMembershipDatabase(config);
  pool = authDatabase;
  if (dialect !== 'mysql') throw new Error('Expected a MySQL database, got ' + dialect + '.');
  // openMembershipDatabase already connected and, for a remote host,
  // proved the session is encrypted. Re-report what it observed.
  console.log(`MySQL connection OK: host ${connection.host}, profile ${connection.profile}, encrypted: ${connection.encrypted ? 'yes (' + connection.tlsVersion + (connection.cipher ? ', ' + connection.cipher : '') + ')' : 'no (loopback)'}.`);
  const [rows] = await authDatabase.query(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()",
  );
  const found = rows.map(row => row.name);
  const missing = missingMysqlTables(found);
  if (missing.length) {
    problems.push(
      'MySQL schema is not imported. Missing tables: ' + missing.join(', ') + '. ' +
      'Import server/membership/migrations/001-initial-mysql.sql into the dedicated database first (review it before importing; it performs no DROP and no remote connection). ' +
      'Found ' + found.length + ' tables; ' + REQUIRED_MYSQL_TABLES.length + ' are required.',
    );
  } else {
    console.log(`MySQL schema OK: all ${REQUIRED_MYSQL_TABLES.length} required tables are present (${found.sort().join(', ')}).`);
  }
} catch (error) {
  problems.push(error.message || String(error));
} finally {
  if (pool && typeof pool.end === 'function') { try { await pool.end(); } catch { /* already closing */ } }
}
if (problems.length) {
  console.error('MySQL readiness check failed:\n' + [...new Set(problems)].map(p => ' - ' + p).join('\n'));
  process.exitCode = 1;
} else {
  console.log('MySQL is ready: connection, TLS (where required) and schema all verified. No migration was run.');
}
