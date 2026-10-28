import { sql } from 'kysely';
// Application tables only; Better Auth generates its own auth tables.
export function membershipTables(db) {
  const owner = col => col.notNull().references('user.id').onDelete('cascade');
  return [
    db.schema.createTable('aenural_operation_limits').ifNotExists()
      .addColumn('id','varchar(128)',c=>c.primaryKey()).addColumn('owner_id','varchar(36)',owner)
      .addColumn('used','integer',c=>c.notNull().defaultTo(0)).addColumn('expires_at','varchar(32)',c=>c.notNull()),
    db.schema.createTable('aenural_orders').ifNotExists()
      .addColumn('id','varchar(128)',c=>c.primaryKey()).addColumn('owner_id','varchar(36)',owner)
      .addColumn('provider','varchar(32)',c=>c.notNull()).addColumn('provider_order_id','varchar(128)',c=>c.notNull())
      .addColumn('status','varchar(20)',c=>c.notNull()).addColumn('amount_minor','integer',c=>c.notNull()).addColumn('currency','varchar(3)',c=>c.notNull())
      .addColumn('test_mode','integer',c=>c.notNull()).addColumn('provider_updated_at','varchar(32)',c=>c.notNull())
      .addColumn('created_at','varchar(32)',c=>c.notNull()).addUniqueConstraint('aenural_orders_provider_unique',['provider','provider_order_id','test_mode']),
    db.schema.createTable('aenural_checkouts').ifNotExists()
      .addColumn('id','varchar(36)',c=>c.primaryKey()).addColumn('owner_id','varchar(36)',owner)
      .addColumn('provider_id','varchar(128)').addColumn('created_at','varchar(32)',c=>c.notNull()),
    db.schema.createTable('aenural_webhooks').ifNotExists()
      .addColumn('id','varchar(64)',c=>c.primaryKey()).addColumn('processed_at','varchar(32)',c=>c.notNull()),
    db.schema.createTable('aenural_daily_usage').ifNotExists()
      .addColumn('id','varchar(80)',c=>c.primaryKey()).addColumn('owner_id','varchar(36)',owner)
      .addColumn('day','varchar(10)',c=>c.notNull()).addColumn('used','integer',c=>c.notNull().defaultTo(0)),
    db.schema.createTable('aenural_caption_jobs').ifNotExists()
      .addColumn('id','varchar(36)',c=>c.primaryKey()).addColumn('owner_id','varchar(36)',owner)
      .addColumn('video_id','varchar(36)',c=>c.notNull()).addColumn('day','varchar(10)',c=>c.notNull())
      .addColumn('duration_ms','integer',c=>c.notNull()).addColumn('quality','varchar(16)',c=>c.notNull())
      .addColumn('status','varchar(16)',c=>c.notNull()).addColumn('created_at','varchar(32)',c=>c.notNull())
      .addUniqueConstraint('aenural_video_day_unique',['owner_id','video_id','day']),
    db.schema.createTable('aenural_projects').ifNotExists()
      .addColumn('id','varchar(36)',c=>c.primaryKey()).addColumn('owner_id','varchar(36)',owner)
      .addColumn('title','varchar(100)',c=>c.notNull()).addColumn('payload',sql`longtext`,c=>c.notNull())
      .addColumn('revision','integer',c=>c.notNull().defaultTo(1)).addColumn('created_at','varchar(32)',c=>c.notNull()).addColumn('updated_at','varchar(32)',c=>c.notNull()),
    db.schema.createTable('aenural_activity').ifNotExists()
      .addColumn('id','varchar(36)',c=>c.primaryKey()).addColumn('owner_id','varchar(36)',owner)
      .addColumn('action','varchar(24)',c=>c.notNull()).addColumn('project_id','varchar(36)')
      .addColumn('created_at','varchar(32)',c=>c.notNull()),
  ];
}
export function membershipIndexes(db){return [['aenural_orders','owner_id','test_mode'],['aenural_projects','owner_id','updated_at'],['aenural_activity','owner_id','created_at'],['aenural_checkouts','owner_id','created_at']].map(([table,...columns])=>db.schema.createIndex(table+'_owner_idx').on(table).columns(columns));}
export async function ensureMembershipSchema(db) { for (const statement of membershipTables(db)) await statement.execute();for(const statement of membershipIndexes(db))await statement.ifNotExists().execute(); }
