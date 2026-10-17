// Read-only loopback checks against the real optimized production server.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=new URL(process.argv[2]??'http://127.0.0.1:3107');
assert.ok(['127.0.0.1','localhost'].includes(base.hostname));
const evidence=[];
for(const [route,methods] of [['/dev/hybrid-processing',['GET']],['/api/dev/hybrid/jobs',['GET','POST','OPTIONS']],['/api/dev/hybrid/jobs/00000000-0000-0000-0000-000000000000',['GET','DELETE','OPTIONS']]]){
 for(const method of methods){const response=await fetch(new URL(route,base),{method,headers:{Origin:base.origin}});assert.equal(response.status,404,method+' '+route);evidence.push({route,method,status:response.status});}
}
const home=await(await fetch(base)).text();
assert.equal((home.match(/<video\b/g)??[]).length,2);
assert.ok(home.includes('/videos/source-window.mp4'));assert.ok(home.includes('/videos/source-window-feature.mp4'));
assert.ok(!home.includes('subtitle-tools.mp4'));
for(const asset of ['/videos/source-window.mp4','/videos/source-window-feature.mp4']){const response=await fetch(new URL(asset,base),{headers:{Range:'bytes=0-31'}});assert.equal(response.status,206);assert.equal((await response.arrayBuffer()).byteLength,32);evidence.push({asset,status:response.status});}
assert.equal((await fetch(new URL('/videos/subtitle-tools.mp4',base))).status,404);
const sitemap=await(await fetch(new URL('/sitemap.xml',base))).text();assert.doesNotMatch(sitemap,/hybrid-processing|free-subtitle-generator|podcast-to-captions/);
await fs.writeFile('artifacts/hybrid/final-production-boundaries.json',JSON.stringify(evidence,null,2));
console.log('Production gates: hybrid page/API/methods 404; exactly two videos with real range delivery; no removed video or held tools in sitemap.');
