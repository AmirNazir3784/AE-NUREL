import {it} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
let source=await readFile(new URL('../src/lib/site-metadata.ts',import.meta.url),'utf8');
source=source.replace('"./site-origin"',JSON.stringify(new URL('../src/lib/site-origin.ts',import.meta.url).href));
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {pageMetadata}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
it('prefixes tool and directory titles and social previews without changing their URLs',()=>{
 for(const route of ['/tools','/tools/srt-editor','/tools/subtitle-tools','/tools/free-audio-to-text-converter-online']){
  const m=pageMetadata('Editing Tools','Original description',route);
  assert.deepEqual(m.title,{absolute:'AENural | Editing Tools'});
  assert.equal(m.openGraph.title,'AENural | Editing Tools');assert.equal(m.twitter.title,m.openGraph.title);
  assert.equal(m.description,'Original description');assert.equal(new URL(m.alternates.canonical).pathname,route);
 }
});
it('preserves the existing non-tool title conventions',()=>{
 for(const route of ['/blog','/about','/blog/srt-vs-vtt-subtitle-formats','/toolshed']){
  const m=pageMetadata('Original Title','Original description',route);
  assert.equal(m.title,'Original Title');assert.equal(m.openGraph.title,'Original Title | AENural');
 }
 const home=pageMetadata('Home','Original description','/');assert.deepEqual(home.title,{absolute:'Home | AENural'});
});
