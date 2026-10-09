import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tools } from '../src/lib/tools.ts';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { captionDocument, captionExport, validateAsrFile } from '../src/features/local-asr/asr-core.ts';
describe('canonical subtitle generator scope and release hold',()=>{
 it('does not advertise either preview as a released tool or sitemap entry',async()=>{
  let source=await readFile(new URL('../src/app/sitemap.ts',import.meta.url),'utf8');
  source=source.replace('"@/lib/tools"',JSON.stringify(new URL('../src/lib/tools.ts',import.meta.url).href))
   .replace('"@/lib/site-origin"',JSON.stringify(new URL('../src/lib/site-origin.ts',import.meta.url).href));
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
  const {default:sitemap}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
  const previous=process.env.SITE_URL;
  let urls;
  try {process.env.SITE_URL='https://tools.example';urls=sitemap().map(entry=>new URL(entry.url).pathname);}
  finally {if(previous===undefined)delete process.env.SITE_URL;else process.env.SITE_URL=previous;}
  assert.equal(urls.length,23);
  assert.equal(tools.length,16);
  for(const route of ['/tools/podcast-to-captions','/tools/free-subtitle-generator']){
   assert.equal(tools.some(tool=>tool.href===route),false);
   assert.equal(urls.includes(route),false);
  }
 });
 it('preserves reviewed multiline Unicode and filenames in both formats',()=>{
  const document=captionDocument([{text:'draft',timestamp:[1,2]}],3,'lesson.MP3');
  document.cues[0].text='Café\nمرحبا 世界 🎬';
  for(const format of ['srt','vtt']){
   const result=captionExport(document,format);
   assert.equal(result.filename,'lesson.'+format);assert.match(result.content,/Café\nمرحبا 世界 🎬/);
   assert.match(result.content,format==='srt'?/00:00:01,000 --> 00:00:02,000/:/00:00:01\.000 --> 00:00:02\.000/);
  }
 });
 it('keeps unverified video containers out of the input scope',()=>{
  for(const name of ['original.mp4','recording.mov','recording.webm','song.m4a'])assert.throws(()=>validateAsrFile({name,size:100}));
 });
});
