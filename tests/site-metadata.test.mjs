import {it} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function load(file){
 const source=(await readFile(new URL(file,import.meta.url),'utf8'))
  .replace('"./site-origin"',JSON.stringify(new URL('../src/lib/site-origin.ts',import.meta.url).href));
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
}
const {pageMetadata}=await load('../src/lib/site-metadata.ts');
const {siteJsonLd}=await load('../src/lib/structured-data.ts');
const restore=value=>{if(value===undefined)delete process.env.SITE_URL;else process.env.SITE_URL=value;};

it('puts the brand first in the homepage absolute title and social previews',()=>{
 const m=pageMetadata('Free Subtitle Tools & Source Window','Useful editing tools.','/');
 assert.deepEqual(m.title,{absolute:'AENural | Free Subtitle Tools & Source Window'});
 assert.equal(m.openGraph.title,m.title.absolute);assert.equal(m.twitter.title,m.title.absolute);
});
it('preserves child titles for the parent prefix template and keeps canonical routes unchanged',()=>{
 const old=process.env.SITE_URL;delete process.env.SITE_URL;
 try{
  const m=pageMetadata('SRT to VTT Converter','Convert subtitles.','/tools/srt-to-vtt');
  assert.equal(m.title,'SRT to VTT Converter');assert.equal(m.openGraph.title,'AENural | SRT to VTT Converter');
  assert.equal(m.twitter.title,m.openGraph.title);assert.equal(m.openGraph.siteName,'AENural');
  assert.equal(m.alternates.canonical,'https://aenural.com/tools/srt-to-vtt');
  assert.equal(m.openGraph.url,m.alternates.canonical);
 }finally{restore(old);}
});
it('provides the real WebSite and Organization name even when SITE_URL is absent',()=>{
 const old=process.env.SITE_URL;delete process.env.SITE_URL;
 try{
  const graph=siteJsonLd()['@graph'],site=graph.find(x=>x['@type']==='WebSite'),org=graph.find(x=>x['@type']==='Organization');
  assert.equal(site.name,'AENural');assert.equal(site.url,'https://aenural.com/');
  assert.equal(org.name,'AENural');assert.equal(site.publisher['@id'],org['@id']);
  assert.equal(org.logo,'https://aenural.com/branding/aenural-icon-180.png');
 }finally{restore(old);}
});
it('keeps configured site identity consistent with canonical and social URLs',()=>{
 const old=process.env.SITE_URL;process.env.SITE_URL='https://preview.example';
 try{const m=pageMetadata('Blog','Editing tutorials.','/blog'),site=siteJsonLd()['@graph'][1];
  assert.equal(site.url,'https://preview.example/');assert.equal(m.alternates.canonical,'https://preview.example/blog');
 }finally{restore(old);}
});
it('uses the prefix template and removes the audio page override that omitted the brand',async()=>{
 const layout=await readFile(new URL('../src/app/layout.tsx',import.meta.url),'utf8');
 assert.match(layout,/template: "AENural \| %s"/);assert.doesNotMatch(layout,/template: "%s \| AENural"/);
 assert.match(layout,/brqYgF8ye20H38M5iyS57eBtuvy2Ucna4Okpnr9owpE/);
 const audio=await readFile(new URL('../src/app/tools/free-audio-to-text-converter-online/page.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(audio,/title:\s*\{\s*absolute:/);
});
