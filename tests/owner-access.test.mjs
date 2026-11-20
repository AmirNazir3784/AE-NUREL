import './helpers/auth-dom.mjs';
import {before,after,it} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {membershipAuth} from '../server/membership/auth.mjs';
import {membershipDatabase} from '../server/membership/database.mjs';
import {activateOwner,hashOwnerActivationToken,OWNER_ACTIVATION_GENERIC_ERROR} from '../server/membership/owner-activation.mjs';
import {createMemberService} from '../server/membership/service.mjs';
import {guestIdentity,guestAccess,ensureGuest} from '../server/membership/guest.mjs';
const token='test-only-owner-activation-token-with-sufficient-length',password='Test-Only-Owner-Password-123!';
let setup;
const origin='http://localhost:3000';let auth,db,config,directory;
before(async()=>{
 directory=await mkdtemp(path.join(tmpdir(),'aenural-owner-'));process.env.NODE_ENV='test';process.env.AENURAL_OWNER_TEST_MODE='1';process.env.AENURAL_OWNER_DATA_DIR=directory;process.env.BETTER_AUTH_URL=origin;
 // Step 5 fix (S5-04/S5-13): the token hash and owner email come from env
 // vars, not from a committed file. The setup override below is the test
 // escape hatch; the main activation test also exercises the env path by
 // omitting the 4th argument (see 'requires the private activation token').
 setup={email:'owner@example.test',activationTokenHash:await hashOwnerActivationToken(token)};
 process.env.AENURAL_OWNER_EMAIL=setup.email;
 process.env.AENURAL_OWNER_ACTIVATION_TOKEN_HASH=setup.activationTokenHash;
 auth=await membershipAuth();({db,config}=await membershipDatabase());
});
after(async()=>{await db?.destroy();if(directory&&path.resolve(directory).startsWith(path.join(tmpdir(),'aenural-owner-')))await rm(directory,{recursive:true,force:true});});
function call(route,body){return auth.handler(new Request(origin+'/api/auth/'+route,{method:'POST',headers:{origin,'content-type':'application/json','x-forwarded-for':'127.0.0.1'},body:JSON.stringify(body)}));}
it('disables public registration in the private owner database',async()=>{const response=await call('sign-up/email',{email:'visitor@example.test',name:'Visitor',password});assert.equal(response.status,400);assert.equal((await response.json()).code,'EMAIL_PASSWORD_SIGN_UP_DISABLED');assert.equal(await db.selectFrom('user').select('id').executeTakeFirst(),undefined);});
it('rejects the placeholder owner email and an unconfigured owner email (S5-13)',async()=>{
 const fresh=await hashOwnerActivationToken('test-only-fresh-token-for-placeholder-email');
 await assert.rejects(activateOwner(db,config,{token:'test-only-fresh-token-for-placeholder-email',password},{email:'owner@aenural.com',activationTokenHash:fresh}),e=>e.status===403&&e.message===OWNER_ACTIVATION_GENERIC_ERROR);
 const savedEmail=process.env.AENURAL_OWNER_EMAIL;delete process.env.AENURAL_OWNER_EMAIL;
 try {
   await assert.rejects(activateOwner(db,config,{token:'test-only-fresh-token-for-placeholder-email',password},{email:'',activationTokenHash:fresh}),e=>e.status===403&&e.message===OWNER_ACTIVATION_GENERIC_ERROR);
 } finally { process.env.AENURAL_OWNER_EMAIL=savedEmail; }
});
it('rejects a malformed stored hash with the generic 403, never a 500 (S5-04)',async()=>{
 for (const badHash of ['not-a-scrypt-hash','',createHash('sha256').update(token).digest('hex'),'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==']) {
   await assert.rejects(activateOwner(db,config,{token,password},{email:setup.email,activationTokenHash:badHash}),e=>e.status===403&&e.message===OWNER_ACTIVATION_GENERIC_ERROR,`stored hash ${badHash.slice(0,20)}`);
 }
});
it('rejects weak owner passwords with the generic error (S5-22)',async()=>{
 const fresh=await hashOwnerActivationToken('test-only-fresh-token-for-weak-password');
 for (const weak of ['aaaaaaaaaaaaaaaa','Passwordpassword','short1!','1234567890123456']) {
   await assert.rejects(activateOwner(db,config,{token:'test-only-fresh-token-for-weak-password',password:weak},{email:setup.email,activationTokenHash:fresh}),e=>e.status===403&&e.message===OWNER_ACTIVATION_GENERIC_ERROR,weak);
 }
});
it('requires the private activation token and stores only a hashed owner password',async()=>{
 await assert.rejects(activateOwner(db,config,{token:'wrong',password},setup),e=>e.status===403&&e.message===OWNER_ACTIVATION_GENERIC_ERROR);
 // Production path: no setup override — hash + email are read from env.
 assert.deepEqual(await activateOwner(db,config,{token,password}),{ok:true,email:setup.email});
 const stored=await db.selectFrom('account').select('password').executeTakeFirst();assert.ok(stored.password&&!stored.password.includes(password));
 // Second use (and a different password) gets the SAME generic 403 as a
 // wrong token (S5-11 oracle fix) — the old test expected a distinct 410.
 await assert.rejects(activateOwner(db,config,{token,password:'New-password-that-must-not-replace!'},setup),e=>e.status===403&&e.message===OWNER_ACTIVATION_GENERIC_ERROR);
});
it('issues a real session only after the correct owner email and password',async()=>{
 assert.equal((await call('sign-in/email',{email:'not-owner@example.test',password})).status,401);
 assert.equal((await call('sign-in/email',{email:setup.email,password:'Wrong-Password-123456'})).status,401);
 const response=await call('sign-in/email',{email:setup.email,password});assert.equal(response.status,200,await response.clone().text());
 const cookie=response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');const session=await auth.api.getSession({headers:new Headers({cookie})});assert.equal(session.user.email,setup.email);assert.equal(session.user.emailVerified,true);
 const service=createMemberService(db,{local:false,sqlite:true,ownerEmail:setup.email});const owner=await service.access(session.user.id);assert.equal(owner.owner,true);assert.equal(owner.premium,true);assert.equal(owner.watermark,false);
 for(let i=0;i<4;i++)await service.reserve(session.user.id,{videoId:randomUUID(),duration:120,quality:'accurate'});
});
it('invalidates the token after activation: deleting the owner row does not re-arm it (S5-11)',async()=>{
 const ownerRow=await db.selectFrom('user').select('id').where('email','=',setup.email).executeTakeFirst();assert.ok(ownerRow,'owner must exist before the invalidation check');
 await db.deleteFrom('account').where('userId','=',ownerRow.id).execute();
 await db.deleteFrom('user').where('id','=',ownerRow.id).execute();
 // Same token again: the owner row is gone, but the consumed token must
 // still fail with the generic 403 — not succeed, not 410.
 await assert.rejects(activateOwner(db,config,{token,password},setup),e=>e.status===403&&e.message===OWNER_ACTIVATION_GENERIC_ERROR);
 // Rotating to a fresh token re-arms activation exactly once (the
 // operator procedure in the rotation doc), so the system is not bricked.
 const token2='test-only-second-owner-activation-token-with-length';
 const setup2={email:setup.email,activationTokenHash:await hashOwnerActivationToken(token2)};
 assert.deepEqual(await activateOwner(db,config,{token:token2,password},setup2),{ok:true,email:setup.email});
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
it('enforces a per-IP activation bucket independently per IP (S5-12)',async()=>{
 const service=createMemberService(db,{local:false,sqlite:true,ownerEmail:setup.email});
 await ensureGuest(db,'owner-activation');
 for (const ip of ['203.0.113.7','198.51.100.9']) for (let i=0;i<5;i++) await service.limitOperation('owner-activation','activate:'+ip,5);
 await assert.rejects(service.limitOperation('owner-activation','activate:203.0.113.7',5),e=>e.status===429);
 await assert.rejects(service.limitOperation('owner-activation','activate:198.51.100.9',5),e=>e.status===429);
 // A fresh IP still has its own budget — the limit is per IP, not global.
 await service.limitOperation('owner-activation','activate:192.0.2.55',5);
});
