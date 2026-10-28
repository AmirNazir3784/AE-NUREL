import './helpers/auth-dom.mjs';
import {before,after,it} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {membershipAuth} from '../server/membership/auth.mjs';
import {membershipDatabase} from '../server/membership/database.mjs';
import {activateOwner} from '../server/membership/owner-activation.mjs';
import {createMemberService} from '../server/membership/service.mjs';
import {guestIdentity,guestAccess,ensureGuest} from '../server/membership/guest.mjs';
const token='test-only-owner-activation-token-with-sufficient-length',password='Test-Only-Owner-Password-123!';
const setup={email:'owner@example.test',activationTokenHash:createHash('sha256').update(token).digest('hex')};
const origin='http://localhost:3000';let auth,db,config,directory;
before(async()=>{
 directory=await mkdtemp(path.join(tmpdir(),'aenural-owner-'));process.env.NODE_ENV='test';process.env.AENURAL_OWNER_TEST_MODE='1';process.env.AENURAL_OWNER_DATA_DIR=directory;process.env.BETTER_AUTH_URL=origin;
 auth=await membershipAuth();({db,config}=await membershipDatabase());
});
after(async()=>{await db?.destroy();if(directory&&path.resolve(directory).startsWith(path.join(tmpdir(),'aenural-owner-')))await rm(directory,{recursive:true,force:true});});
function call(route,body){return auth.handler(new Request(origin+'/api/auth/'+route,{method:'POST',headers:{origin,'content-type':'application/json','x-forwarded-for':'127.0.0.1'},body:JSON.stringify(body)}));}
it('disables public registration in the private owner database',async()=>{const response=await call('sign-up/email',{email:'visitor@example.test',name:'Visitor',password});assert.equal(response.status,400);assert.equal((await response.json()).code,'EMAIL_PASSWORD_SIGN_UP_DISABLED');assert.equal(await db.selectFrom('user').select('id').executeTakeFirst(),undefined);});
it('requires the private activation token and stores only a hashed owner password',async()=>{
 await assert.rejects(activateOwner(db,config,{token:'wrong',password},setup),e=>e.status===403);
 assert.deepEqual(await activateOwner(db,config,{token,password},setup),{ok:true,email:setup.email});
 const stored=await db.selectFrom('account').select('password').executeTakeFirst();assert.ok(stored.password&&!stored.password.includes(password));
 await assert.rejects(activateOwner(db,config,{token,password:'New-password-that-must-not-replace!'},setup),e=>e.status===410);
});
it('issues a real session only after the correct owner email and password',async()=>{
 assert.equal((await call('sign-in/email',{email:'not-owner@example.test',password})).status,401);
 assert.equal((await call('sign-in/email',{email:setup.email,password:'Wrong-Password-123456'})).status,401);
 const response=await call('sign-in/email',{email:setup.email,password});assert.equal(response.status,200,await response.clone().text());
 const cookie=response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');const session=await auth.api.getSession({headers:new Headers({cookie})});assert.equal(session.user.email,setup.email);assert.equal(session.user.emailVerified,true);
 const service=createMemberService(db,{local:false,sqlite:true,ownerEmail:setup.email});const owner=await service.access(session.user.id);assert.equal(owner.owner,true);assert.equal(owner.premium,true);assert.equal(owner.watermark,false);
 for(let i=0;i<4;i++)await service.reserve(session.user.id,{videoId:randomUUID(),duration:120,quality:'accurate'});
});
it('signs guest identity without accepting a claimed premium role and enforces three server-side starts',async()=>{
 const identity=guestIdentity(new Headers(),config,true);assert.match(identity.cookie,/HttpOnly; SameSite=Lax/);
 const headers=new Headers({cookie:identity.cookie.split(';')[0]});assert.equal(guestIdentity(headers,config).id,identity.id);
 assert.equal(guestIdentity(new Headers({cookie:identity.cookie.split(';')[0]+'tamper'}),config),null);
 await ensureGuest(db,identity.id);
 const service=createMemberService(db,{local:false,sqlite:true,ownerEmail:setup.email});const policy=guestAccess(await service.access(identity.id));assert.equal(policy.premium,false);assert.equal(policy.signedIn,false);assert.equal(policy.guest,true);assert.equal(policy.watermark,true);assert.equal(policy.presets.length,5);
 await assert.rejects(service.reserve(identity.id,{videoId:randomUUID(),duration:61,quality:'fast'}),e=>e.code==='VIDEO_LIMIT');
 await assert.rejects(service.reserve(identity.id,{videoId:randomUUID(),duration:10,quality:'accurate'}),e=>e.code==='PREMIUM_REQUIRED');
 const results=await Promise.allSettled(Array.from({length:4},()=>service.reserve(identity.id,{videoId:randomUUID(),duration:10,quality:'fast'})));assert.equal(results.filter(r=>r.status==='fulfilled').length,3);assert.equal(results.find(r=>r.status==='rejected').reason.code,'DAILY_LIMIT');assert.equal((await service.access(identity.id)).remaining,0);
});
