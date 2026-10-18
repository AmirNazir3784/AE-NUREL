// Read-only loopback acceptance; never deploys or contacts the live site.
import assert from 'node:assert/strict';
import {tools} from '../../src/lib/tools.ts';
import {writeFile,mkdir} from 'node:fs/promises';
const base=new URL(process.argv[2]??'http://localhost:3107');
assert.ok(['localhost','127.0.0.1'].includes(base.hostname));
const development=process.argv[3]==='development', evidence=[];
for(const route of ['/','/premium-tools','/tools',...tools.map(t=>t.href),'/tools/free-subtitle-generator','/tools/auto-caption-generator','/tools/podcast-to-captions','/sitemap.xml']){
 const response=await fetch(new URL(route,base)),html=await response.text();
 const expected=route==='/tools/podcast-to-captions'||['/tools/free-subtitle-generator','/tools/auto-caption-generator'].includes(route)&&!development?404:200;
 assert.equal(response.status,expected,route);
 if(expected===200){
  assert.doesNotMatch(html,/Speech to Captions|href="\/tools\/podcast-to-captions"/,route);
  if(route!=='/sitemap.xml')assert.match(html,/aria-label="Search tools"/);
 }
 if(route==='/tools'){
  assert.equal((html.match(/class="aen-tool-card"/g)??[]).length,development?18:16);
  assert.equal(html.includes('href="/tools/free-subtitle-generator"'),development);
  assert.equal(html.includes('href="/tools/auto-caption-generator"'),development);
  assert.doesNotMatch(html,/aen-product-card/);
 }
 if(route==='/premium-tools'){
  assert.equal((html.match(/class="aen-tool-card aen-product-card"/g)??[]).length,1);
  assert.match(html,/AENural Tools/);
 }
 if(route==='/sitemap.xml'){
  assert.doesNotMatch(html,/free-subtitle-generator|podcast-to-captions|auto-caption-generator/);
  if(!development)assert.match(html,/\/premium-tools/);
 }
 evidence.push({route,status:response.status});
}
await mkdir('artifacts/hybrid',{recursive:true});
await writeFile(`artifacts/hybrid/phase2-${development?'development':'production'}-http.json`,JSON.stringify(evidence,null,2));
console.log(`${development?'Development':'Production'} catalog pass: 16 public tools, ${development?'two held AI listings':'AI gates'}, product directory, retired duplicate 404, search and sitemap.`);
