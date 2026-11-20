import { randomUUID } from 'node:crypto';
import { captionAccess } from '../../src/features/membership/caption-policy.ts';

export class MembershipError extends Error {
  constructor(message, status = 400, code = 'INVALID_REQUEST') { super(message); this.status = status; this.code = code; }
}
// Database timestamp for direct Kysely inserts into Better Auth tables
// (`user.createdAt`, `account.createdAt` — `timestamp(3)` in MySQL).
// Direct inserts bypass Better Auth's own date handling, so the value
// must be storable by BOTH engines:
//   * A millisecond epoch number works in SQLite but FAILS in MySQL
//     strict mode: MySQL reads a number as YYYYMMDDHHMMSS, and a
//     13-digit epoch is not a valid datetime (ERROR 1292). That broke
//     guest-account creation and owner activation in MySQL mode.
//   * A Date object is converted by mysql2 but node:sqlite REFUSES to
//     bind it ("Provided value cannot be bound to SQLite parameter").
//   * An ISO string ('...T...Z') is rejected by MySQL timestamp
//     columns (the trailing Z is not accepted).
// 'YYYY-MM-DD HH:MM:SS.mmm' (UTC) is the native format for MySQL
// TIMESTAMP(3) and stores as plain text in SQLite. It is write-only
// audit data for these rows (nothing parses it back into a Date), so
// the UTC choice needs no timezone conversion on read.
export function dbTimestamp(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`;
}
// True when a failed insert was rejected by a UNIQUE constraint (the
// concurrent-reserve path in reserve()). MySQL reports ER_DUP_ENTRY
// (1062); SQLite reports SQLITE_CONSTRAINT_UNIQUE / "UNIQUE constraint
// failed". Kysely surfaces the driver error, so match on code + message.
export function isUniqueViolation(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '');
  return code === 'ER_DUP_ENTRY' || code === 'SQLITE_CONSTRAINT_UNIQUE'
    || /UNIQUE constraint failed/i.test(message) || /Duplicate entry/i.test(message);
}
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
// Read-side whitelist for stored project payloads (S5-33). Returns only
// the known fields, each within the same bounds validateProject()
// enforces on save; anything else in the stored JSON is dropped, never
// echoed back to the client. Pure function, unit-tested directly.
export function sanitizeStoredProject(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const out = {};
  if (payload.schemaVersion === 1) out.schemaVersion = 1;
  if (payload.tool === 'auto-caption-generator') out.tool = 'auto-caption-generator';
  if (typeof payload.title === 'string' && payload.title.trim()) out.title = payload.title.trim().slice(0, 100);
  const source = payload.source;
  if (source && typeof source === 'object' && !Array.isArray(source)
    && typeof source.filename === 'string' && source.filename.length <= 240
    && typeof source.durationSeconds === 'number' && Number.isFinite(source.durationSeconds) && source.durationSeconds > 0 && source.durationSeconds <= 120
    && Number.isInteger(source.width) && Number.isInteger(source.height) && source.width >= 1 && source.height >= 1 && source.width * source.height <= 1920 * 1080) {
    const cleanSource = {
      filename: source.filename.replace(/[\\/\x00-\x1f]/g, '_'),
      durationSeconds: source.durationSeconds,
      width: source.width,
      height: source.height,
    };
    if (typeof source.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(source.fingerprint)) cleanSource.fingerprint = source.fingerprint;
    out.source = cleanSource;
  }
  const captions = payload.captions;
  if (captions && typeof captions === 'object' && !Array.isArray(captions)
    && Array.isArray(captions.cues) && captions.cues.length <= 500
    && (captions.format === 'srt' || captions.format === 'vtt')) {
    const ids = new Set();
    const cues = [];
    let valid = true;
    for (const cue of captions.cues) {
      if (!cue || typeof cue !== 'object'
        || typeof cue.id !== 'string' || !cue.id || cue.id.length > 100 || ids.has(cue.id)
        || typeof cue.text !== 'string' || cue.text.length > 2000
        || !Number.isSafeInteger(cue.start) || !Number.isSafeInteger(cue.end)) { valid = false; break; }
      ids.add(cue.id);
      cues.push({
        id: cue.id, text: cue.text, start: cue.start, end: cue.end,
        srtSettings: typeof cue.srtSettings === 'string' ? cue.srtSettings.slice(0, 256) : '',
        vttSettings: typeof cue.vttSettings === 'string' ? cue.vttSettings.slice(0, 256) : '',
        identifier: typeof cue.identifier === 'string' ? cue.identifier.slice(0, 256) : '',
      });
    }
    if (valid) {
      out.captions = {
        filename: typeof captions.filename === 'string' ? captions.filename.slice(0, 240) : 'captions.srt',
        format: captions.format, cues, lineEnding: '\n', vttHeader: 'WEBVTT', vttBlocks: [],
      };
    }
  }
  // Style is produced by parseStudioStyle on save; on read only
  // scalar-valued entries survive, each capped, so a tampered payload
  // cannot smuggle nested objects, arrays or large values into the
  // response. (Keys are not allowlisted: preset entries may carry
  // extra scalar style keys, and dropping them would change rendering
  // for legitimate projects.)
  const style = payload.style;
  if (style && typeof style === 'object' && !Array.isArray(style)) {
    const cleanStyle = {};
    for (const [key, value] of Object.entries(style)) {
      if (key.length > 64) continue;
      if (typeof value === 'string' && value.length <= 256) cleanStyle[key] = value;
      else if (typeof value === 'number' && Number.isFinite(value)) cleanStyle[key] = value;
      else if (typeof value === 'boolean') cleanStyle[key] = value;
    }
    if (Object.keys(cleanStyle).length) out.style = cleanStyle;
  }
  if (Array.isArray(payload.alignment) && payload.alignment.length <= 500) {
    const alignment = [];
    let valid = true;
    for (const entry of payload.alignment) {
      if (!entry || typeof entry !== 'object'
        || typeof entry.id !== 'string' || typeof entry.text !== 'string' || entry.text.length > 2000
        || !Number.isSafeInteger(entry.start) || !Number.isSafeInteger(entry.end)
        || !Array.isArray(entry.words) || entry.words.length > 2000) { valid = false; break; }
      const words = [];
      for (const word of entry.words) {
        if (!word || typeof word !== 'object'
          || !['from', 'to', 'start', 'end'].every((key) => Number.isSafeInteger(word[key]))
          || word.from < 0 || word.to <= word.from || word.to > entry.text.length
          || word.start < entry.start || word.end <= word.start || word.end > entry.end) { valid = false; break; }
        words.push({ from: word.from, to: word.to, start: word.start, end: word.end });
      }
      if (!valid) break;
      alignment.push({ id: entry.id, text: entry.text, start: entry.start, end: entry.end, words });
    }
    if (valid) out.alignment = alignment;
  }
  return out;
}
export function createMemberService(db, { local = false, sqlite = local, ownerEmail = '', testMode = local, now = () => new Date() } = {}) {
  async function limitOperation(ownerId,scope,maximum=30,windowMs=60000){
    const id=ownerId+':'+scope,timestamp=now().toISOString(),expires=new Date((Math.floor(now().getTime()/windowMs)+1)*windowMs).toISOString();
    await db.insertInto('aenural_operation_limits').values({id,owner_id:ownerId,used:0,expires_at:expires}).$if(sqlite,q=>q.onConflict(c=>c.column('id').doNothing())).$if(!sqlite,q=>q.onDuplicateKeyUpdate({id})).execute();
    const changed=await db.updateTable('aenural_operation_limits').set(eb=>({used:eb.case().when('expires_at','<=',timestamp).then(1).else(eb('used','+',1)).end(),expires_at:eb.case().when('expires_at','<=',timestamp).then(expires).else(eb.ref('expires_at')).end()})).where('id','=',id).where(eb=>eb.or([eb('used','<',maximum),eb('expires_at','<=',timestamp)])).executeTakeFirst();
    if(!Number(changed.numUpdatedRows))throw new MembershipError('Too many requests. Please wait a minute and try again.',429,'RATE_LIMIT');
  }
  async function access(ownerId) {
    const owner = !!ownerEmail && !!await db.selectFrom('user').select('id').where('id','=',ownerId).where('email','=',ownerEmail).where('emailVerified','=',1).executeTakeFirst();
    const premium = owner || !!await db.selectFrom('aenural_orders').select('id').where('owner_id','=',ownerId).where('status','=','paid').where('test_mode','=',testMode ? 1 : 0).executeTakeFirst();
    const day = now().toISOString().slice(0,10), row = await db.selectFrom('aenural_daily_usage').select('used').where('id','=',ownerId+':'+day).executeTakeFirst();
    return {...captionAccess(premium,true,row?.used || 0,now()),owner};
  }
  async function activity(ownerId, action, projectId = null, transaction = db) {
    await transaction.insertInto('aenural_activity').values({ id:randomUUID(), owner_id:ownerId, action, project_id:projectId, created_at:now().toISOString() }).execute();
  }
  async function reserve(ownerId, input) {
    if (!uuid(input.videoId) || !Number.isFinite(input.duration) || input.duration <= 0 || !['fast','accurate'].includes(input.quality)) throw new MembershipError('Choose a valid video and processing option.');
    const policy = await access(ownerId);
    if (input.duration > policy.maxSeconds) throw new MembershipError(`Your plan supports videos up to ${policy.maxSeconds} seconds.`,403,'VIDEO_LIMIT');
    if (input.quality === 'accurate' && !policy.accurate) throw new MembershipError('Accurate processing is included with the Source Window package.',403,'PREMIUM_REQUIRED');
    const day = now().toISOString().slice(0,10), dailyId = ownerId+':'+day;
    return db.transaction().execute(async tx => {
      // An insert-ignore plus conditional UPDATE provides a single shared daily
      // counter across tabs/processes. There is no localStorage quota authority.
      await tx.insertInto('aenural_daily_usage').values({id:dailyId,owner_id:ownerId,day,used:0})
        .$if(sqlite,q=>q.onConflict(c=>c.column('id').doNothing())).$if(!sqlite,q=>q.onDuplicateKeyUpdate({id:dailyId})).execute();
      const increment = await tx.updateTable('aenural_daily_usage').set(eb=>({used:eb('used','+',1)})).where('id','=',dailyId).$if(!policy.premium,q=>q.where('used','<',3)).executeTakeFirst();
      const existing = await tx.selectFrom('aenural_caption_jobs').selectAll().where('owner_id','=',ownerId).where('video_id','=',input.videoId).where('day','=',day).executeTakeFirst();
      if (existing) {
        if (Number(increment.numUpdatedRows)>0) await tx.updateTable('aenural_daily_usage').set(eb=>({used:eb('used','-',1)})).where('id','=',dailyId).execute();
        if (Math.abs(existing.duration_ms-Math.round(input.duration*1000))>1) throw new MembershipError('Choose the same video to retry this generation.');
        return {jobId:existing.id,reused:true};
      }
      if (!Number(increment.numUpdatedRows)) throw new MembershipError('You have used your 3 free videos today. Return after the daily reset or choose the Source Window package.',429,'DAILY_LIMIT');
      const jobId=randomUUID();
      // Two concurrent reserves for the same video can both pass the
      // `existing` check above and reach this insert; the
      // (owner_id, video_id, day) unique constraint lets exactly one
      // win. Turn the loser's constraint error into the same reuse
      // result as a sequential retry (and refund its counter increment,
      // mirroring the `existing` path) instead of a 500.
      try {
        await tx.insertInto('aenural_caption_jobs').values({id:jobId,owner_id:ownerId,video_id:input.videoId,day,duration_ms:Math.round(input.duration*1000),quality:input.quality,status:'started',created_at:now().toISOString()}).execute();
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        await tx.updateTable('aenural_daily_usage').set(eb=>({used:eb('used','-',1)})).where('id','=',dailyId).execute();
        const raced = await tx.selectFrom('aenural_caption_jobs').selectAll().where('owner_id','=',ownerId).where('video_id','=',input.videoId).where('day','=',day).executeTakeFirst();
        if (!raced) throw error;
        if (Math.abs(raced.duration_ms-Math.round(input.duration*1000))>1) throw new MembershipError('Choose the same video to retry this generation.');
        return {jobId:raced.id,reused:true};
      }
      await activity(ownerId,'transcribe',null,tx);
      return {jobId,reused:false};
    });
  }
  async function complete(ownerId, jobId) {
    if (!uuid(jobId)) throw new MembershipError('Choose a valid caption job.');
    await db.updateTable('aenural_caption_jobs').set({status:'complete'}).where('id','=',jobId).where('owner_id','=',ownerId).execute();
  }
  async function overview(ownerId) {
    const [policy,projects,history,orders] = await Promise.all([
      access(ownerId),db.selectFrom('aenural_projects').select(['id','title','revision','created_at','updated_at']).where('owner_id','=',ownerId).orderBy('updated_at','desc').limit(50).execute(),
      db.selectFrom('aenural_activity').select(['id','action','project_id','created_at']).where('owner_id','=',ownerId).orderBy('created_at','desc').limit(100).execute(),
      db.selectFrom('aenural_orders').select(['id','provider_order_id','provider','status','amount_minor','currency','test_mode','created_at']).where('owner_id','=',ownerId).where('test_mode','=',testMode?1:0).orderBy('created_at','desc').limit(100).execute(),
    ]);return {access:policy,projects:projects.map(row=>({...row})),history:history.map(row=>({...row})),orders:orders.map(row=>({...row}))};
  }
  async function developmentPlan(ownerId,premium) {
    if (!local) throw new MembershipError('Not found.',404);
    const id='development-'+ownerId;
    await db.deleteFrom('aenural_orders').where('id','=',id).where('owner_id','=',ownerId).execute();
    if (premium) await db.insertInto('aenural_orders').values({id,owner_id:ownerId,provider:'development',provider_order_id:ownerId,status:'paid',amount_minor:2000,currency:'USD',test_mode:1,created_at:now().toISOString(),provider_updated_at:now().toISOString()}).execute();
    return access(ownerId);
  }
  async function project(ownerId,id) {
    if(!uuid(id)) throw new MembershipError('Project not found.',404);
    const row=await db.selectFrom('aenural_projects').selectAll().where('id','=',id).where('owner_id','=',ownerId).executeTakeFirst();
    if(!row) throw new MembershipError('Project not found.',404);
    // S5-33: the stored payload is re-validated on read instead of
    // being spread raw into the response. validateProject() itself is
    // not reused here — it needs the caller's premium flag and its
    // studio imports are not loadable from this module — so this is a
    // read-side whitelist with the same bounds (titles, filenames,
    // cue counts/sizes, source dimensions). Unknown keys, oversized
    // values and wrong-typed fields are dropped, never echoed.
    let payload={};
    try { payload=JSON.parse(row.payload); } catch { payload={}; }
    return {id:row.id,title:row.title,revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at,...sanitizeStoredProject(payload)};
  }
  async function saveProject(ownerId,data,id,revision) {
    const payload=JSON.stringify(data),timestamp=now().toISOString();
    if(Buffer.byteLength(payload)>512*1024) throw new MembershipError('Keep saved project data under 512 KiB. Your video is never included.',413);
    if(id){
      if(!uuid(id)||!Number.isSafeInteger(revision)||revision<1) throw new MembershipError('Reload this project before saving.');
      const updated=await db.updateTable('aenural_projects').set({title:data.title,payload,updated_at:timestamp,revision:revision+1}).where('id','=',id).where('owner_id','=',ownerId).where('revision','=',revision).executeTakeFirst();
      if(!Number(updated.numUpdatedRows))throw new MembershipError('This project changed in another tab. Reload it before saving again.',409,'PROJECT_CONFLICT');
    }else{
      const rows=await db.selectFrom('aenural_projects').select('id').where('owner_id','=',ownerId).limit(50).execute();
      if(rows.length>=50)throw new MembershipError('Your library holds up to 50 projects. Remove a project before saving another.',409);
      id=randomUUID();await db.insertInto('aenural_projects').values({id,owner_id:ownerId,title:data.title,payload,revision:1,created_at:timestamp,updated_at:timestamp}).execute();
    }
    await activity(ownerId,'save',id);return project(ownerId,id);
  }
  async function deleteProject(ownerId,id){
    if(!uuid(id))throw new MembershipError('Project not found.',404);
    const result=await db.deleteFrom('aenural_projects').where('id','=',id).where('owner_id','=',ownerId).executeTakeFirst();
    if(!Number(result.numDeletedRows))throw new MembershipError('Project not found.',404);
  }
  return {access,reserve,complete,activity,overview,developmentPlan,project,saveProject,deleteProject,limitOperation};
}
