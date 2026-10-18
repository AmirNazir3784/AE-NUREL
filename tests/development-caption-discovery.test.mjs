import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {directoryTools} from '../src/lib/tool-directory-catalog.ts';
import {tools,categories,searchTools} from '../src/lib/tools.ts';
describe('development caption directory and production hold',()=>{
 it('adds the audio generator and video studio under Caption Generation only in development',async()=>{
  const catalog=directoryTools('development'),previews=catalog.filter(tool=>tool.categoryId==='caption-generation');
  assert.equal(catalog.length,18);assert.deepEqual(previews.map(tool=>tool.href),['/tools/auto-caption-generator','/tools/free-subtitle-generator']);
  assert.ok(previews.every(tool=>tool.group==='Caption Generation'&&tool.processing==='local'));
  assert.deepEqual(searchTools('caption generation',catalog),previews);
  for(const tool of previews){await access(new URL('../src/app'+tool.href+'/page.tsx',import.meta.url));const page=await readFile(new URL('../src/app'+tool.href+'/page.tsx',import.meta.url),'utf8');assert.match(page,/process\.env\.NODE_ENV (?:=== "production"|!== "development")\) notFound\(\)/);assert.match(page,/index: false, follow: false/)}
 });
 it('excludes previews from production/test/unknown directory, public search, registry and categories',()=>{
  for(const env of ['production','test',undefined,''])assert.equal(directoryTools(env),tools);
  assert.equal(tools.length,16);assert.deepEqual(categories.map(c=>c.id),['subtitle-tools']);
  for(const query of ['Audio to SRT / VTT','Auto Caption Generator','Speech to Captions','Free Subtitle Generator','Podcast to Captions','Caption Generation'])assert.deepEqual(searchTools(query),[]);
 });
 it('uses server-selected serializable directory data and existing cards, leaving sitemap public-only',async()=>{
  const page=await readFile(new URL('../src/app/tools/page.tsx',import.meta.url),'utf8'),directory=await readFile(new URL('../src/components/tools/tool-directory.tsx',import.meta.url),'utf8'),sitemap=await readFile(new URL('../src/app/sitemap.ts',import.meta.url),'utf8');
  assert.match(page,/directoryTools\(process\.env\.NODE_ENV\)/);assert.match(page,/<ToolDirectory catalog=\{catalog\}/);
  assert.match(directory,/<ToolCard key=\{tool.href\} tool=\{tool\}/);assert.match(directory,/catalog.filter/);
  assert.doesNotMatch(directory,/directory-search|<input|useState|searchTools/);
  assert.doesNotMatch(sitemap,/directoryTools|free-subtitle-generator|podcast-to-captions/);
 });
});
