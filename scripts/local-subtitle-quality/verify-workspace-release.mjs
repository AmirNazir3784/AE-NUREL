import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=new URL(process.argv[2]??'http://localhost:3107');
assert.ok(['localhost','127.0.0.1'].includes(origin.hostname),'QA only addresses the local production build.');
const results=[];
for(const [route,expected]of [['/tools',200],['/tools/free-subtitle-generator',404],['/tools/podcast-to-captions',404],['/sitemap.xml',200]]){
 const response=await fetch(new URL(route,origin)),body=await response.text();
 assert.equal(response.status,expected,route);
 if(route==='/tools'||route==='/sitemap.xml')for(const hidden of ['/tools/free-subtitle-generator','/tools/podcast-to-captions'])assert.ok(!body.includes(hidden),'Unreleased route leaked into '+route);
 results.push({route,status:response.status,previewsExcluded:true});
}
await fs.writeFile('artifacts/subtitle-workspace-finishing/production-release.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
