// Offline generation only. This command never connects to or changes Hostinger.
import { Kysely, DummyDriver, MysqlAdapter, MysqlIntrospector, MysqlQueryCompiler } from 'kysely';
import { getMigrations } from 'better-auth/db/migration';
import { authOptions } from '../../server/membership/auth.mjs';
import { membershipTables, membershipIndexes } from '../../server/membership/schema.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const dialect={createDriver:()=>new DummyDriver(),createAdapter:()=>new MysqlAdapter(),createIntrospector:db=>new MysqlIntrospector(db),createQueryCompiler:()=>new MysqlQueryCompiler()};
const db=new Kysely({dialect});
// Schema generation only: the header value below is never a runtime
// trust decision — authOptions() throws in non-local mode when the
// header is blank, so offline generation must pass one explicitly.
// 'x-real-ip' here means "generate the schema", not "trust this header".
const options=authOptions({db,type:'mysql'},{local:false,origin:'https://aenural.com',secret:'offline-schema-generation-placeholder-not-a-runtime-secret',env:{AUTH_TRUSTED_IP_HEADER:'x-real-ip'}});
const migrations=await getMigrations(options);
let authSQL=await migrations.compileMigrations();
// Phase 4: make the generated Better Auth SQL safe to re-import.
// Better Auth emits plain `CREATE TABLE` (a second import fails with
// ER_TABLE_EXISTS_ERROR 1050) and inline `references ... on delete
// cascade` (MySQL parses inline REFERENCES but silently ignores it, so
// no foreign key is created — proven by tests/membership-mysql.test.mjs).
// Both are fixed here, in the generator, so every regeneration keeps
// them fixed; the script FAILS LOUDLY if either transformation does not
// apply (e.g. after a Better Auth upgrade changes the emitted SQL),
// instead of silently writing a non-idempotent / FK-less migration.
const authTables=['user','session','account','verification','rateLimit'];
let ifNotExistsCount=0;
for (const table of authTables) {
  const before=authSQL;
  authSQL=authSQL.replace(`create table \`${table}\``, `create table if not exists \`${table}\``);
  if (authSQL!==before) ifNotExistsCount++;
}
if (ifNotExistsCount!==authTables.length) throw new Error(`prepare-mysql: expected to mark ${authTables.length} Better Auth tables IF NOT EXISTS, marked ${ifNotExistsCount}. The generated SQL format changed — review before importing.`);
const authForeignKeys=[['session','userId','session_userId_fk'],['account','userId','account_userId_fk']];
for (const [table,column,constraint] of authForeignKeys) {
  // The inline REFERENCES sits mid-statement for `account` (more columns
  // follow userId) and last for `session`, so match the whole CREATE
  // TABLE statement, strip the inline clause, and append an explicit
  // table-level FOREIGN KEY constraint just before the closing ');'.
  const pattern=new RegExp('(create table if not exists `' + table + '` \\([\\s\\S]*?)`' + column + '` varchar\\(36\\) not null references `user` \\(`id`\\) on delete cascade([\\s\\S]*?\\);)');
  const before=authSQL;
  authSQL=authSQL.replace(pattern,(match,head,tail)=>`${head}\`${column}\` varchar(36) not null${tail.slice(0,-2)}, constraint \`${constraint}\` foreign key (\`${column}\`) references \`user\` (\`id\`) on delete cascade);`);
  if (authSQL===before) throw new Error(`prepare-mysql: expected inline REFERENCES for ${table}.${column} in the generated SQL; the format changed — review before importing.`);
}
const applicationSQL=[...membershipTables(db),...membershipIndexes(db)].map(statement=>statement.compile().sql+';').join('\n\n');
let fileSQL=authSQL+'\n\n'+applicationSQL;
// Idempotent indexes: MySQL has no CREATE INDEX IF NOT EXISTS, so a plain
// re-import of this file would fail with ER_DUP_KEYNAME (1061) on the
// second run. Each index is therefore created only when missing, via a
// conditional block that checks information_schema.STATISTICS first.
// The blocks run on ONE connection (see runMigration in
// tests/helpers/mysql-test-kit.mjs and the mysql CLI / phpMyAdmin import,
// both single-session), because the @variables are session-scoped.
// A failed block still fails loudly — nothing is silently skipped.
const indexPattern=/create index `([^`]+)` on `([^`]+)` \(([^)]+)\);/g;
let indexCount=0;
fileSQL=fileSQL.replace(indexPattern,(match,name,table,columns)=>{
  indexCount++;
  const create=`CREATE INDEX \`${name}\` ON \`${table}\` (${columns})`;
  return `-- Index ${name} on ${table} (${columns}): created only when missing (MySQL has no CREATE INDEX IF NOT EXISTS).\nSET @aenural_idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND INDEX_NAME = '${name}');\nSET @aenural_idx_sql := IF(@aenural_idx_exists = 0, '${create}', 'SELECT 1');\nPREPARE aenural_idx_stmt FROM @aenural_idx_sql;\nEXECUTE aenural_idx_stmt;\nDEALLOCATE PREPARE aenural_idx_stmt;`;
});
if (indexCount===0) throw new Error('prepare-mysql: expected at least one CREATE INDEX statement to make idempotent; the generated SQL format changed — review before importing.');
await mkdir('server/membership/migrations',{recursive:true});
const version=JSON.parse(await readFile('package.json','utf8')).dependencies['better-auth'];
await writeFile('server/membership/migrations/001-initial-mysql.sql','-- Fresh, dedicated AENural database only. Review before importing.\n-- Better Auth '+version+' generated schema plus application tables.\n-- No DROP, data reset or remote connection is performed by the generator.\n-- All CREATE TABLE statements use IF NOT EXISTS and all indexes are\n-- created only when missing, so re-importing this file is a no-op.\nSET NAMES utf8mb4;\n\n'+fileSQL+'\n');
await db.destroy();console.log('Generated server/membership/migrations/001-initial-mysql.sql offline. No database was changed.');
