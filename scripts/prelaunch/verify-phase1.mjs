// Read-only local HTTP checks. Start the actual production build separately.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {tools} from '../../src/lib/tools.ts';
const origin=new URL(process.argv[2]??'http://localhost:3107');
assert.ok(['localhost','127.0.0.1'].includes(origin.hostname));
const results=[];
for(const [route,status] of [['/tools',200],['/',200],['/source-window',200],['/tools/srt-editor',200],['/tools/srt-to-vtt',200],['/tools/free-subtitle-generator',404],['/tools/podcast-to-captions',404],['/sitemap.xml',200]]){
 const response=await fetch(new URL(route,origin)),html=await response.text();
 assert.equal(response.status,status,route);
 if(status===200){
  assert.doesNotMatch(html,/aenural-theme-init|data-theme=|theme-toggle|directory-search/);
  assert.doesNotMatch(html,/\/tools\/(free-subtitle-generator|podcast-to-captions)/);
 }
 if(route==='/tools'){
  assert.equal((html.match(/class="aen-tool-card"/g)??[]).length,16);
  for(const tool of tools)assert.ok(html.includes('href="'+tool.href+'"'));
  assert.match(html,/aria-label="Search tools"/);
  assert.doesNotMatch(html,/aria-label="Tool groups"|Free online utilities|focused subtitle tools/);
  const styles=[...new Set([...html.matchAll(/href="([^" ]+\.css[^" ]*)"/g)].map(match=>match[1]))];
  assert.ok(styles.length);
  const css=(await Promise.all(styles.map(async path=>(await fetch(new URL(path,origin))).text()))).join('\n');
  assert.match(css,/@media\s*\(prefers-color-scheme:\s*dark\)/);
  assert.doesNotMatch(css,/data-theme|theme-toggle/);
 }
 results.push({route,status});
}
await fs.mkdir('artifacts/prelaunch',{recursive:true});
await fs.writeFile('artifacts/prelaunch/phase1-http.json',JSON.stringify(results,null,2));
console.log('Production HTTP/CSS checks pass: 16 public cards, header search, category links, system CSS, held previews excluded.');
