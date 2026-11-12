import './helpers/auth-dom.mjs';
import {it} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import config from '../next.config.ts';
const {JsonLd}=await import('../src/components/site/json-ld.tsx');

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
  assert.doesNotMatch(headers['content-security-policy'],/script-src|worker-src|connect-src|default-src/);
  assert.equal(headers['strict-transport-security'],'max-age=31536000');assert.equal(config.poweredByHeader,false);
  for(const route of ['/api/auth/:path*','/api/membership/:path*','/account/:path*','/sign-in','/sign-up','/verify-email','/forgot-password','/reset-password'])assert.ok(rules.find(r=>r.source===route).headers.some(h=>h.key==='Cache-Control'&&h.value.includes('no-store')),route);
  for(const route of ['/api/auth/:path*','/reset-password'])assert.ok(rules.find(r=>r.source===route).headers.some(h=>h.key==='Referrer-Policy'&&h.value==='no-referrer'));
  process.env.NODE_ENV='development';const dev=await config.headers();assert.ok(!dev.find(rule=>rule.source==='/:path*').headers.some(h=>h.key==='Strict-Transport-Security'));
 }finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
});
