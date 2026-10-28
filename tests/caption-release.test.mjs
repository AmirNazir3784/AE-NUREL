import './helpers/auth-dom.mjs';
import {it} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

function inspect(release='',qa='',preview='0') {
 const result=spawnSync(process.execPath,['--import','./tests/helpers/auth-dom.mjs','--input-type=module','-e',`import {autoCaptionAvailable,autoCaptionReleased} from './src/lib/caption-release.ts';import {tools} from './src/lib/tools.ts';console.log(JSON.stringify({available:autoCaptionAvailable(),released:autoCaptionReleased(),routes:tools.map(t=>t.href)}));`],{cwd:process.cwd(),encoding:'utf8',env:{...process.env,NODE_ENV:'production',NEXT_PUBLIC_AENURAL_AUTO_CAPTION_RELEASE:release,AENURAL_AUTO_CAPTION_QA:qa,NEXT_PUBLIC_AENURAL_SITE_PREVIEW:preview}});
 assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
}
it('restores the route hold when the public testing preview is disabled',()=>{const r=inspect();assert.equal(r.available,false);assert.equal(r.released,false);assert.equal(r.routes.length,16);});
it('opens the production testing preview without declaring a released tool',()=>{for(const preview of ['','1']){const r=inspect('','',preview);assert.equal(r.available,true);assert.equal(r.released,false);assert.equal(r.routes.length,16);}});
it('loopback production QA opens only the route, without publishing it in the catalog',()=>{const r=inspect('','1');assert.equal(r.available,true);assert.equal(r.released,false);assert.equal(r.routes.length,16);});
it('the explicit release switch exposes only Auto Caption Generator',()=>{const r=inspect('1');assert.equal(r.available,true);assert.equal(r.released,true);assert.equal(r.routes.length,17);assert.ok(r.routes.includes('/tools/auto-caption-generator'));assert.ok(!r.routes.some(p=>/podcast|lyrics|account|hybrid/.test(p)));});
