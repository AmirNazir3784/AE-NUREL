import './helpers/auth-dom.mjs';
import {it} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import config from '../next.config.ts';
const {JsonLd}=await import('../src/components/site/json-ld.tsx');
const {POST: authPost, GET: authGet}=await import('../src/app/api/auth/[...all]/route.ts');
const {POST: webhookPost}=await import('../src/app/api/payments/webhook/route.ts');
const {sitePreviewEnabled}=await import('../src/lib/site-preview.ts');

it('keeps HTML-sensitive structured data inside one JSON script and preserves its actual values',()=>{
 const data={'@type':'Thing',name:'</script><script id="injected">alert(1)</script>',description:'<img src=x onerror=alert(1)> & text',nested:{name:'A < B'}};
 const html=renderToStaticMarkup(React.createElement(JsonLd,{data}));
 const dom=new JSDOM(html);const scripts=dom.window.document.querySelectorAll('script');
 assert.equal(scripts.length,1);assert.equal(dom.window.document.querySelector('#injected,img'),null);
 assert.deepEqual(JSON.parse(scripts[0].textContent),data);assert.ok(!scripts[0].textContent.includes('<'));
 assert.equal(renderToStaticMarkup(React.createElement(JsonLd,{data:null})),'');dom.window.close();
});
it('sets compatible production protections without blocking worker/WASM or network capabilities',async()=>{
 const previous=process.env.NODE_ENV;try{
  process.env.NODE_ENV='production';const rules=await config.headers();
  const headers=Object.fromEntries(rules.find(rule=>rule.source==='/:path*').headers.map(h=>[h.key.toLowerCase(),h.value]));
  assert.equal(headers['x-content-type-options'],'nosniff');assert.equal(headers['x-frame-options'],'SAMEORIGIN');
  assert.match(headers['content-security-policy'],/frame-ancestors 'self'/);assert.match(headers['content-security-policy'],/base-uri 'self'/);assert.match(headers['content-security-policy'],/object-src 'none'/);
  // Step 5 (S5-18): style-src is tightened (same-origin + the inline
  // styles the app already uses); HSTS covers subdomains.
  assert.match(headers['content-security-policy'],/style-src 'self' 'unsafe-inline'/);
  assert.equal(headers['strict-transport-security'],'max-age=31536000; includeSubDomains');
  // script-src / worker-src / connect-src / default-src are still NOT set:
  // Next.js App Router streams inline RSC scripts and the caption studio
  // compiles WASM, so a script-src without a per-request nonce (or
  // 'wasm-unsafe-eval') would break the app. Tightening script-src needs
  // nonce-based CSP via middleware plus a full `next build` and a
  // caption-studio regression pass — tracked as follow-up, not dropped.
  assert.doesNotMatch(headers['content-security-policy'],/script-src|worker-src|connect-src|default-src/);
  assert.equal(config.poweredByHeader,false);
  for(const route of ['/api/auth/:path*','/api/membership/:path*','/account/:path*','/sign-in','/sign-up','/verify-email','/forgot-password','/reset-password'])assert.ok(rules.find(r=>r.source===route).headers.some(h=>h.key==='Cache-Control'&&h.value.includes('no-store')),route);
  for(const route of ['/api/auth/:path*','/reset-password'])assert.ok(rules.find(r=>r.source===route).headers.some(h=>h.key==='Referrer-Policy'&&h.value==='no-referrer'));
  process.env.NODE_ENV='development';const dev=await config.headers();assert.ok(!dev.find(rule=>rule.source==='/:path*').headers.some(h=>h.key==='Strict-Transport-Security'));
 }finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
});
it('S5-17: rejects cross-origin and origin-less POSTs to /api/auth even with a session cookie',async()=>{
 // Defence-in-depth on top of Better Auth's own CSRF check: the route's
 // explicit same-origin gate must fire before any auth work happens.
 const keys=['NODE_ENV','BETTER_AUTH_URL','AENURAL_MEMBERSHIP_DISABLED','AENURAL_LOCAL_DATA_DIR'];
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 const dir=await mkdtemp(path.join(os.tmpdir(),'aenural-auth-origin-'));
 try{
  process.env.NODE_ENV='development';process.env.BETTER_AUTH_URL='http://localhost:3000';
  delete process.env.AENURAL_MEMBERSHIP_DISABLED;process.env.AENURAL_LOCAL_DATA_DIR=dir;
  const url='http://localhost:3000/api/auth/sign-in/email';
  const cross=await authPost(new Request(url,{method:'POST',headers:{origin:'https://evil.example',cookie:'better-auth.session_token=looks-valid','content-type':'application/json'},body:'{}'}));
  assert.equal(cross.status,403);
  const noOrigin=await authPost(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:'{}'}));
  assert.equal(noOrigin.status,403);
  // Same-origin POST passes the gate: it reaches Better Auth, which
  // answers 400 for the empty body. The point is only that it is not 403.
  const same=await authPost(new Request(url,{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json'},body:'{}'}));
  assert.notEqual(same.status,403);
  // GET requests are exempt from the gate.
  const get=await authGet(new Request('http://localhost:3000/api/auth/get-session',{method:'GET',headers:{origin:'https://evil.example'}}));
  assert.notEqual(get.status,403);
 }finally{for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}await rm(dir,{recursive:true,force:true});}
});
it('S5-19: site preview is opt-in only — production no longer defaults it open',()=>{
 const keys=['NODE_ENV','NEXT_PUBLIC_AENURAL_SITE_PREVIEW'];
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  process.env.NODE_ENV='production';delete process.env.NEXT_PUBLIC_AENURAL_SITE_PREVIEW;assert.equal(sitePreviewEnabled(),false);
  process.env.NEXT_PUBLIC_AENURAL_SITE_PREVIEW='0';assert.equal(sitePreviewEnabled(),false);
  process.env.NEXT_PUBLIC_AENURAL_SITE_PREVIEW='1';assert.equal(sitePreviewEnabled(),true);
  process.env.NODE_ENV='development';delete process.env.NEXT_PUBLIC_AENURAL_SITE_PREVIEW;assert.equal(sitePreviewEnabled(),false);
 }finally{for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}}
});
it('S5-31: caps Lemon Squeezy webhook POSTs per IP before any DB work',async()=>{
 // No payment env is configured, so an un-limited request reaches the
 // payment-config check and answers 503 — the limiter must fire first
 // (429) once the 60/min/IP budget for one address is spent, while a
 // different address keeps its own fresh budget.
 const keys=['NODE_ENV','AENURAL_MEMBERSHIP_DISABLED','LEMONSQUEEZY_API_KEY','LEMONSQUEEZY_STORE_ID','LEMONSQUEEZY_VARIANT_ID','LEMONSQUEEZY_WEBHOOK_SECRET'];
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  process.env.NODE_ENV='development';delete process.env.AENURAL_MEMBERSHIP_DISABLED;
  for(const k of keys.slice(2))delete process.env[k];
  const url='http://localhost:3000/api/payments/webhook';
  const post=(ip)=>webhookPost(new Request(url,{method:'POST',headers:{'x-forwarded-for':ip,'x-signature':'invalid'},body:'{}'}));
  for(let i=0;i<60;i+=1)assert.equal((await post('203.0.113.17')).status,503,`request ${i+1} should reach the (unconfigured) payment check, not the limiter`);
  assert.equal((await post('203.0.113.17')).status,429);
  assert.equal((await post('203.0.113.18')).status,503);
 }finally{for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}}
});
