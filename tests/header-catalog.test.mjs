import './helpers/auth-dom.mjs';
import { describe,it,beforeEach,afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {tools} from '../src/lib/tools.ts';
const bootstrap=new JSDOM('<html><body></body></html>');globalThis.window=bootstrap.window;globalThis.document=bootstrap.window.document;
const {createRoot}=await import('react-dom/client');
const {Header}=await import('../src/components/site/header.tsx');
describe('separate product and free tool navigation',()=>{
 let dom,root;
 const q=s=>document.querySelector(s);
 const click=async s=>act(()=>q(s).click());
 const key=async(el,key)=>act(()=>el.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true})));
 beforeEach(async()=>{
  dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'http://localhost:3000'});
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.Node=dom.window.Node;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new dom.window.Event('close'));};
  root=createRoot(q('#root'));await act(()=>root.render(React.createElement(Header)));
 });
 afterEach(async()=>{await act(()=>root.unmount());dom.window.close();});
 it('lists real product separately from all sixteen grouped public utilities',()=>{
  const product=q('.aen-product-menu'),free=q('.aen-free-menu');
  assert.equal(product.querySelector('summary').textContent,'Tools');assert.equal(free.querySelector('summary').textContent,'Free Tools');
  assert.deepEqual([...product.querySelectorAll('a')].map(a=>a.getAttribute('href')),['/source-window','/premium-tools']);
  assert.deepEqual([...free.querySelectorAll('section a')].map(a=>a.getAttribute('href')).sort(),tools.map(t=>t.href).sort());
  assert.equal(free.querySelector('.aen-mega-footer a').getAttribute('href'),'/tools');
  assert.equal(q('.aen-mobile-free').querySelectorAll('section a').length,16);
  assert.doesNotMatch(document.body.textContent,/Speech to Captions|Podcast to Captions/);
 });
 it('pins click, closes the other menu, supports outside click and restores Escape focus',async()=>{
  await click('.aen-product-menu summary');assert.equal(q('.aen-product-menu').open,true);
  await click('.aen-free-menu summary');assert.equal(q('.aen-product-menu').open,false);assert.equal(q('.aen-free-menu').open,true);
  await key(q('.aen-free-menu summary'),'Escape');assert.equal(q('.aen-free-menu').open,false);assert.equal(document.activeElement,q('.aen-free-menu summary'));
  await click('.aen-product-menu summary');await act(()=>document.body.dispatchEvent(new dom.window.Event('pointerdown',{bubbles:true})));assert.equal(q('.aen-product-menu').open,false);
 });
 it('provides arrow/Home/End traversal without trapping ordinary Tab navigation',async()=>{
  const menu=q('.aen-free-menu'),summary=menu.querySelector('summary');summary.focus();
  await key(summary,'ArrowDown');assert.equal(menu.open,true);assert.equal(document.activeElement,menu.querySelector('a'));
  await key(document.activeElement,'End');assert.equal(document.activeElement,menu.querySelector('.aen-mega-footer a'));
  await key(document.activeElement,'Home');assert.equal(document.activeElement,menu.querySelector('a'));
  await key(document.activeElement,'ArrowUp');assert.equal(document.activeElement,menu.querySelector('.aen-mega-footer a'));
 });
 it('opens on hover, closes on leave, and keeps a pinned menu open',async()=>{
  const menu=q('.aen-product-menu');await act(()=>menu.dispatchEvent(new dom.window.MouseEvent('mouseover',{bubbles:true})));assert.equal(menu.open,true);
  await act(()=>menu.dispatchEvent(new dom.window.MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body})));assert.equal(menu.open,false);
  await click('.aen-product-menu summary');await act(()=>menu.dispatchEvent(new dom.window.MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body})));assert.equal(menu.open,true);
 });
 it('keeps the existing search accessible and closes menus first',async()=>{
  await click('.aen-free-menu summary');await click('[aria-label="Search tools"]');
  assert.equal(q('.aen-free-menu').open,false);assert.equal(q('dialog').open,true);assert.equal(document.activeElement.id,'tool-search');
  await key(q('dialog'),'Escape');assert.equal(q('dialog').open,false);assert.equal(document.activeElement.getAttribute('aria-label'),'Search tools');
 });
});
it('reuses the retired URL for a focused development-only podcast workflow without publishing it',()=>{
 const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
 const retired=read('src/app/tools/podcast-to-captions/page.tsx');assert.match(retired,/process.env.NODE_ENV !== "development"\) notFound\(\)/);assert.match(retired,/PodcastWorkspace/);assert.doesNotMatch(retired,/TranscriptionWorkspace|Speech to Captions/);
 assert.match(read('src/app/tools/free-subtitle-generator/page.tsx'),/process.env.NODE_ENV === "production"\) notFound\(\)/);
 assert.ok(read('src/features/local-asr/asr.worker.ts').length>0);assert.ok(read('src/features/local-asr/caption-review.tsx').length>0);
 assert.match(read('src/app/premium-tools/page.tsx'),/products.map/);
});
