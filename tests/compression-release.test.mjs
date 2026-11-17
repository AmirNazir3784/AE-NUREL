import './helpers/auth-dom.mjs';
import {it} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {compressionTools} from '../src/lib/compression-tools.ts';
import {tools,searchTools} from '../src/lib/tools.ts';
import {directoryTools} from '../src/lib/tool-directory-catalog.ts';
const {default:sitemap}=await import('../src/app/sitemap.ts');

it('makes the six approved workflows discoverable once without promoting other previews',()=>{
 const urls=sitemap().map(entry=>new URL(entry.url).pathname);
 for(const tool of compressionTools){
  assert.equal(tools.filter(t=>t.href===tool.href).length,1);
  assert.equal(directoryTools('development').filter(t=>t.href===tool.href).length,1);
  assert.equal(urls.filter(url=>url===tool.href).length,1);
  assert.ok(searchTools(tool.title).some(t=>t.href===tool.href));
 }
 for(const route of ['/tools/ai-eye-contact','/tools/lyrics-to-captions','/tools/podcast-to-captions']){
  assert.ok(!tools.some(t=>t.href===route));assert.ok(!urls.includes(route));
 }
});
it('renders all six production pages with an upload workflow and indexable canonical metadata',async()=>{
 const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';
 try{for(const tool of compressionTools){
  const page=await import('../src/app'+tool.href+'/page.tsx');
  const document=new JSDOM(renderToStaticMarkup(React.createElement(page.default))).window.document;
  assert.equal(document.querySelectorAll('h1').length,1,tool.title);
  assert.ok(document.querySelector('input[type=file]'),tool.title);
  assert.equal(new URL(page.metadata.alternates.canonical).pathname,tool.href);
  assert.notEqual(page.metadata.robots?.index,false,tool.title);
 }}finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
});
