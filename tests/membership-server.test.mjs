import './helpers/auth-dom.mjs';
import {before,after,it} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID,createHmac} from 'node:crypto';
const {membershipAuth}=await import('../server/membership/auth.mjs');
const {membershipDatabase}=await import('../server/membership/database.mjs');
const {createMemberService}=await import('../server/membership/service.mjs');
const {createPaymentService,verifyPaymentSignature,paymentConfiguration}=await import('../server/membership/payments.mjs');
const {validateProject,accessibleStyle}=await import('../src/features/membership/project-validation.ts');
const {STUDIO_PRESETS}=await import('../src/features/caption-studio/studio-core.ts');
const {emptyEditor,addEditorCue}=await import('../src/lib/subtitle-editor.ts');
let directory,auth,db,service,alice,bob,cookie;
const origin='http://localhost:3000',password='QA-Sample-Creator-123456';
const call=(endpoint,body,session='',requestOrigin=origin)=>auth.handler(new Request(origin+'/api/auth/'+endpoint,{method:'POST',headers:{origin:requestOrigin,'content-type':'application/json','x-forwarded-for':'127.0.0.1',...session?{cookie:session}:{}},body:JSON.stringify(body)}));
async function mail(email,subject){const all=await Promise.all((await readdir(directory)).filter(n=>n.startsWith('mail-')).map(async n=>JSON.parse(await readFile(path.join(directory,n),'utf8'))));return all.filter(m=>m.to===email&&m.subject.includes(subject)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];}
async function register(email){const response=await call('sign-up/email',{name:'QA Creator',email,password,callbackURL:origin+'/sign-in'});assert.equal(response.status,200);const body=await response.json();assert.equal(body.token,null);const message=await mail(email,'Verify');assert.ok(message);return body.user;}
function sessionCookie(response){return response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');}
before(async()=>{
 directory=await mkdtemp(path.join(os.tmpdir(),'aenural-membership-'));process.env.NODE_ENV='test';process.env.AENURAL_MEMBERSHIP_ENABLED='1';process.env.AENURAL_LOCAL_DATA_DIR=directory;process.env.BETTER_AUTH_URL=origin;
 auth=await membershipAuth();({db}=await membershipDatabase());service=createMemberService(db,{local:true});
 alice=await register('alice@example.test');bob=await register('bob@example.test');
});
after(async()=>{await db?.destroy();const resolved=path.resolve(directory||'');const allowed=path.resolve(os.tmpdir())+path.sep+'aenural-membership-';if(resolved.toLowerCase().startsWith(allowed.toLowerCase()))await rm(resolved,{recursive:true,force:true});});

it('uses real password hashing and requires verification before a session is issued',async()=>{
 const blocked=await call('sign-in/email',{email:alice.email,password});assert.equal(blocked.status,403);
 const stored=await db.selectFrom('account').select('password').where('userId','=',alice.id).executeTakeFirst();assert.ok(stored.password&&!stored.password.includes(password));
 const verified=await auth.handler(new Request((await mail(alice.email,'Verify')).url));assert.equal(verified.status,302);
 const login=await call('sign-in/email',{email:alice.email,password});assert.equal(login.status,200);cookie=sessionCookie(login);assert.ok(cookie.includes('session_token='));
 const session=await auth.api.getSession({headers:new Headers({cookie})});assert.equal(session.user.id,alice.id);assert.equal(session.user.emailVerified,true);
});
it('rejects cross-origin credential requests and validates names on the server',async()=>{
 assert.equal((await call('sign-in/email',{email:alice.email,password},'','https://untrusted.example')).status,403);
 assert.equal((await call('update-user',{name:'x'.repeat(81)},cookie)).status,400);
});
it('enforces three daily slots atomically across concurrent requests and reuses retries',async()=>{
 const videoIds=Array.from({length:4},()=>randomUUID());
 const results=await Promise.allSettled(videoIds.map(videoId=>service.reserve(alice.id,{videoId,duration:10,quality:'fast'})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,3);assert.equal(results.find(r=>r.status==='rejected').reason.code,'DAILY_LIMIT');
 const retry=await service.reserve(alice.id,{videoId:videoIds[0],duration:10,quality:'fast'});assert.equal(retry.reused,true);assert.equal((await service.access(alice.id)).used,3);
 assert.equal((await service.access(bob.id)).used,0);
});
it('rejects Accurate and over-length Free generation, and resets by server UTC day',async()=>{
 await assert.rejects(service.reserve(bob.id,{videoId:randomUUID(),duration:61,quality:'fast'}),e=>e.code==='VIDEO_LIMIT');
 await assert.rejects(service.reserve(bob.id,{videoId:randomUUID(),duration:10,quality:'accurate'}),e=>e.code==='PREMIUM_REQUIRED');
 const tomorrow=new Date();tomorrow.setUTCDate(tomorrow.getUTCDate()+1);const next=createMemberService(db,{local:true,now:()=>tomorrow});assert.equal((await next.access(alice.id)).remaining,3);
});
it('rate limits signed-in writes atomically with bounded server records',async()=>{
 const results=await Promise.allSettled(Array.from({length:4},()=>service.limitOperation(alice.id,'test-write',3)));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,3);assert.equal(results.find(r=>r.status==='rejected').reason.code,'RATE_LIMIT');
 const later=createMemberService(db,{local:true,now:()=>new Date(Date.now()+120000)});await later.limitOperation(alice.id,'test-write',3);
 const rows=await db.selectFrom('aenural_operation_limits').select('id').where('id','=',alice.id+':test-write').execute();assert.equal(rows.length,1);
});
it('sanitizes imported Free styles and never grants precision highlighting by changing JSON',()=>{
 const locked=accessibleStyle({...STUDIO_PRESETS[25],animation:'pop',wordHighlight:true,wordBackground:true},false);assert.equal(locked.animation,'none');assert.equal(locked.wordHighlight,false);assert.equal(locked.wordBackground,false);assert.equal(locked.preset,'Clean');
});
it('stores caption data only, checks ownership and prevents stale project overwrite',async()=>{
 const document=addEditorCue(emptyEditor(),'cue-1');document.cues[0].text='A real caption.';
 const raw={schemaVersion:1,title:'Test project',source:{filename:'test.mp4',durationSeconds:10,width:640,height:360,video:'must-not-be-saved'},captions:document,style:STUDIO_PRESETS[0],alignment:[],ownerId:bob.id,video:'must-not-be-saved'};
 const data=validateProject(raw,false);assert.ok(!JSON.stringify(data).includes('must-not-be-saved'));assert.equal(data.ownerId,undefined);
 const saved=await service.saveProject(alice.id,data);assert.equal(saved.revision,1);assert.equal((await service.project(alice.id,saved.id)).captions.cues[0].text,'A real caption.');
 const overview=await service.overview(alice.id);for(const row of [...overview.projects,...overview.history,...overview.orders])assert.equal(Object.getPrototypeOf(row),Object.prototype,'Database rows must be plain objects before crossing the server/client boundary');
 await assert.rejects(service.project(bob.id,saved.id),e=>e.status===404);await assert.rejects(service.deleteProject(bob.id,saved.id),e=>e.status===404);
 const changed=await service.saveProject(alice.id,{...data,title:'Updated'},saved.id,1);assert.equal(changed.revision,2);
 await assert.rejects(service.saveProject(alice.id,data,saved.id,1),e=>e.code==='PROJECT_CONFLICT');
 await service.deleteProject(alice.id,saved.id);await assert.rejects(service.project(alice.id,saved.id),e=>e.status===404);
});
it('keeps password-reset responses generic and invalidates prior sessions and reused tokens',async()=>{
 const known=await call('request-password-reset',{email:alice.email,redirectTo:origin+'/reset-password'}),unknown=await call('request-password-reset',{email:'unknown@example.test',redirectTo:origin+'/reset-password'});assert.equal(known.status,unknown.status);assert.deepEqual(await known.json(),await unknown.json());
 const resetMail=await mail(alice.email,'Reset');const token=new URL(resetMail.url).pathname.split('/').at(-1);assert.ok(token);
 const nextPassword='QA-New-Sample-Password-123';const response=await call('reset-password',{token,newPassword:nextPassword});assert.equal(response.status,200);
 assert.equal(await auth.api.getSession({headers:new Headers({cookie})}),null);
 assert.equal((await call('sign-in/email',{email:alice.email,password})).status,401);
 const login=await call('sign-in/email',{email:alice.email,password:nextPassword});assert.equal(login.status,200);cookie=sessionCookie(login);
 assert.equal((await call('reset-password',{token,newPassword:password})).status,400);
});
it('grants the package only for signed, bound, matching provider orders; replay and refund are safe',async()=>{
 const configuration={apiKey:'test-api-key',storeId:'1',variantId:'2',secret:'test-webhook-secret-that-is-long-enough',testMode:true,origin};
 const checkoutId=randomUUID();await db.insertInto('aenural_checkouts').values({id:checkoutId,owner_id:bob.id,provider_id:'provider-checkout',created_at:new Date().toISOString()}).execute();
 let canonical={type:'orders',id:'123',attributes:{store_id:1,first_order_item:{variant_id:2,price:2000},currency:'USD',test_mode:true,status:'paid',refunded:false,discount_total:0,total:2000,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z'}};
 const request=async()=>new Response(JSON.stringify({data:canonical}),{headers:{'Content-Type':'application/json'}});
 const payments=createPaymentService(db,configuration,{request});
 const raw=JSON.stringify({meta:{event_name:'order_created',custom_data:{aenural_checkout:checkoutId}},data:{id:'123'}}),signature=createHmac('sha256',configuration.secret).update(raw).digest('hex');
 assert.equal(verifyPaymentSignature(raw,'not-a-signature',configuration.secret),false);
 await assert.rejects(payments.webhook(raw,'0'.repeat(64)),e=>e.status===401);assert.equal((await service.access(bob.id)).premium,false);
 assert.equal((await payments.webhook(raw,signature)).premium,true);assert.equal((await service.access(bob.id)).premium,true);assert.equal((await payments.webhook(raw,signature)).duplicate,true);
 canonical={...canonical,attributes:{...canonical.attributes,status:'refunded',refunded:true,updated_at:'2026-01-02T00:00:00Z'}};
 const refund=JSON.stringify({meta:{event_name:'order_refunded',custom_data:{aenural_checkout:checkoutId}},data:{id:'123'}}),refundSignature=createHmac('sha256',configuration.secret).update(refund).digest('hex');
 await payments.webhook(refund,refundSignature);assert.equal((await service.access(bob.id)).premium,false);await payments.webhook(raw,signature);assert.equal((await service.access(bob.id)).premium,false);
});
it('does not offer checkout without provider configuration or accept browser-supplied prices',()=>{
 assert.equal(paymentConfiguration({}),null);
});
it('can test package access locally without enabling a production plan-switch endpoint',async()=>{
 const premium=await service.developmentPlan(alice.id,true);assert.equal(premium.premium,true);assert.equal(premium.watermark,false);assert.equal(premium.accurate,true);assert.equal(premium.remaining,null);
 await assert.rejects(createMemberService(db,{local:false}).developmentPlan(alice.id,true),e=>e.status===404);
 const free=await service.developmentPlan(alice.id,false);assert.equal(free.premium,false);assert.equal(free.watermark,true);
});
