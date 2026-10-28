import { randomUUID } from 'node:crypto';
import { captionAccess } from '../../src/features/membership/caption-policy.ts';

export class MembershipError extends Error {
  constructor(message, status = 400, code = 'INVALID_REQUEST') { super(message); this.status = status; this.code = code; }
}
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function createMemberService(db, { local = false, testMode = local, now = () => new Date() } = {}) {
  async function limitOperation(ownerId,scope,maximum=30,windowMs=60000){
    const id=ownerId+':'+scope,timestamp=now().toISOString(),expires=new Date((Math.floor(now().getTime()/windowMs)+1)*windowMs).toISOString();
    await db.insertInto('aenural_operation_limits').values({id,owner_id:ownerId,used:0,expires_at:expires}).$if(local,q=>q.onConflict(c=>c.column('id').doNothing())).$if(!local,q=>q.onDuplicateKeyUpdate({id})).execute();
    const changed=await db.updateTable('aenural_operation_limits').set(eb=>({used:eb.case().when('expires_at','<=',timestamp).then(1).else(eb('used','+',1)).end(),expires_at:eb.case().when('expires_at','<=',timestamp).then(expires).else(eb.ref('expires_at')).end()})).where('id','=',id).where(eb=>eb.or([eb('used','<',maximum),eb('expires_at','<=',timestamp)])).executeTakeFirst();
    if(!Number(changed.numUpdatedRows))throw new MembershipError('Too many requests. Please wait a minute and try again.',429,'RATE_LIMIT');
  }
  async function access(ownerId) {
    const premium = !!await db.selectFrom('aenural_orders').select('id').where('owner_id','=',ownerId).where('status','=','paid').where('test_mode','=',testMode ? 1 : 0).executeTakeFirst();
    const day = now().toISOString().slice(0,10), row = await db.selectFrom('aenural_daily_usage').select('used').where('id','=',ownerId+':'+day).executeTakeFirst();
    return captionAccess(premium,true,row?.used || 0,now());
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
        .$if(local,q=>q.onConflict(c=>c.column('id').doNothing())).$if(!local,q=>q.onDuplicateKeyUpdate({id:dailyId})).execute();
      const increment = await tx.updateTable('aenural_daily_usage').set(eb=>({used:eb('used','+',1)})).where('id','=',dailyId).$if(!policy.premium,q=>q.where('used','<',3)).executeTakeFirst();
      const existing = await tx.selectFrom('aenural_caption_jobs').selectAll().where('owner_id','=',ownerId).where('video_id','=',input.videoId).where('day','=',day).executeTakeFirst();
      if (existing) {
        if (Number(increment.numUpdatedRows)>0) await tx.updateTable('aenural_daily_usage').set(eb=>({used:eb('used','-',1)})).where('id','=',dailyId).execute();
        if (Math.abs(existing.duration_ms-Math.round(input.duration*1000))>1) throw new MembershipError('Choose the same video to retry this generation.');
        return {jobId:existing.id,reused:true};
      }
      if (!Number(increment.numUpdatedRows)) throw new MembershipError('You have used your 3 free videos today. Return after the daily reset or choose the Source Window package.',429,'DAILY_LIMIT');
      const jobId=randomUUID();
      await tx.insertInto('aenural_caption_jobs').values({id:jobId,owner_id:ownerId,video_id:input.videoId,day,duration_ms:Math.round(input.duration*1000),quality:input.quality,status:'started',created_at:now().toISOString()}).execute();
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
    return {id:row.id,title:row.title,revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at,...JSON.parse(row.payload)};
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
