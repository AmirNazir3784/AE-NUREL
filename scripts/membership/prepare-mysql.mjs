// Offline generation only. This command never connects to or changes Hostinger.
import { Kysely, DummyDriver, MysqlAdapter, MysqlIntrospector, MysqlQueryCompiler } from 'kysely';
import { getMigrations } from 'better-auth/db/migration';
import { authOptions } from '../../server/membership/auth.mjs';
import { membershipTables, membershipIndexes } from '../../server/membership/schema.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const dialect={createDriver:()=>new DummyDriver(),createAdapter:()=>new MysqlAdapter(),createIntrospector:db=>new MysqlIntrospector(db),createQueryCompiler:()=>new MysqlQueryCompiler()};
const db=new Kysely({dialect});
const options=authOptions({db,type:'mysql'},{local:false,origin:'https://aenural.com',secret:'offline-schema-generation-placeholder-not-a-runtime-secret',env:{}});
const migrations=await getMigrations(options);
const authSQL=await migrations.compileMigrations();
const applicationSQL=[...membershipTables(db),...membershipIndexes(db)].map(statement=>statement.compile().sql+';').join('\n\n');
await mkdir('server/membership/migrations',{recursive:true});
const version=JSON.parse(await readFile('package.json','utf8')).dependencies['better-auth'];
await writeFile('server/membership/migrations/001-initial-mysql.sql','-- Fresh, dedicated AENural database only. Review before importing.\n-- Better Auth '+version+' generated schema plus application tables.\n-- No DROP, data reset or remote connection is performed by the generator.\nSET NAMES utf8mb4;\n\n'+authSQL+'\n\n'+applicationSQL+'\n');
await db.destroy();console.log('Generated server/membership/migrations/001-initial-mysql.sql offline. No database was changed.');
