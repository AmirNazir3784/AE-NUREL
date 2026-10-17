import './helpers/auth-dom.mjs';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
const bootstrap=new JSDOM('<html><body></body></html>');
globalThis.window=bootstrap.window;globalThis.document=bootstrap.window.document;
const { createRoot }=await import('react-dom/client');
const { HomeVideo }=await import('../src/components/home/home-video.tsx');
const { HomeVideoProvider }=await import('../src/components/home/home-video-modal.tsx');
const { SubtitleConversionIllustration }=await import('../src/components/home/subtitle-conversion-illustration.tsx');
const props={src:'/videos/source-window.mp4',poster:'/videos/source-window-poster.jpg',label:'Source Window overview',hero:true};
describe('two homepage previews and shared video modal',()=>{
  let dom,root,prefs,observers,plays,pauses;
  beforeEach(()=>{
    dom=new JSDOM('<html><body><div id="root"></div></body></html>',{pretendToBeVisual:true});
    globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
    prefs=[];observers=[];plays=[];pauses=[];
    globalThis.matchMedia=query=>{const p=new dom.window.EventTarget();p.media=query;p.matches=false;prefs.push(p);return p;};
    globalThis.IntersectionObserver=class {constructor(callback){observers.push({callback,disconnected:false});this.index=observers.length-1;}observe(){}disconnect(){observers[this.index].disconnected=true;}};
    dom.window.HTMLMediaElement.prototype.play=function(){plays.push(this);return Promise.resolve();};
    dom.window.HTMLMediaElement.prototype.pause=function(){pauses.push(this);};
    // Unit shims; actual top layer, native controls, sizing and focus containment need browser QA.
    dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
    dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
    root=createRoot(document.querySelector('#root'));
  });
  afterEach(async()=>{await act(()=>root.unmount());dom.window.close();});
  const mount=async()=>act(()=>root.render(React.createElement(React.StrictMode,null,React.createElement(HomeVideoProvider,null,
    React.createElement(HomeVideo,props),
    React.createElement(HomeVideo,{src:'/videos/source-window-feature.mp4',poster:'/videos/source-window-feature-poster.jpg',label:'Source Window features'}),
    React.createElement(SubtitleConversionIllustration)))));
  const live=()=>observers.filter(o=>!o.disconnected);
  const visible=()=>live().forEach(o=>o.callback([{isIntersecting:true,intersectionRatio:1}]));
  const click=async selector=>act(()=>document.querySelector(selector).click());
  it('autoplays both visible previews muted/looping/inline with no controls or eager preload',async()=>{
    await mount();assert.equal(plays.length,0);visible();assert.equal(plays.length,2);
    for(const v of document.querySelectorAll('video')){assert.equal(v.muted,true);assert.equal(v.loop,true);assert.equal(v.playsInline,true);assert.equal(v.controls,false);assert.equal(v.preload,'none');}
    assert.equal(document.querySelectorAll('svg[role="img"]').length,1);
    assert.equal(document.querySelectorAll('dialog').length,0);
  });
  it('supports mobile autoplay and respects reduced motion/data live',async()=>{
    await mount();assert.ok(!prefs.some(p=>p.media.includes('max-width')));
    prefs.forEach(p=>{p.matches=true;});visible();assert.equal(plays.length,0);
    prefs.forEach(p=>{p.matches=false;p.dispatchEvent(new dom.window.Event('change'));});assert.equal(plays.length,2);
    prefs[0].matches=true;prefs[0].dispatchEvent(new dom.window.Event('change'));assert.ok(pauses.length>0);
  });
  it('pauses offscreen and disconnects every observer',async()=>{
    await mount();visible();live().forEach(o=>o.callback([{isIntersecting:false,intersectionRatio:0}]));assert.ok(pauses.length>=2);
    await act(()=>root.render(null));assert.ok(observers.every(o=>o.disconnected));
  });
  it('opens either exact video in one shared dialog with audio and controls',async()=>{
    await mount();
    for(const index of [0,1]){
      const button=document.querySelectorAll('.aen-video-expand')[index];await act(()=>button.click());
      assert.equal(document.querySelectorAll('dialog').length,1);const video=document.querySelector('dialog video');
      assert.equal(video.getAttribute('src'),index?'/videos/source-window-feature.mp4':props.src);assert.equal(video.controls,true);assert.equal(video.muted,false);assert.equal(video.loop,false);
      assert.equal(document.activeElement.getAttribute('aria-label'),'Close video');assert.equal(document.body.style.overflow,'hidden');
      await click('[aria-label="Close video"]');assert.equal(document.querySelector('dialog'),null);assert.equal(document.activeElement,button);assert.equal(document.body.style.overflow,'');
    }
  });
  it('pauses previews while expanded, stops modal audio on close and preserves scroll styles',async()=>{
    await mount();document.body.style.overflow='clip';await click('.aen-video-expand');
    const modalVideo=document.querySelector('dialog video');assert.ok(pauses.some(v=>v.hasAttribute('data-home-preview')));
    await click('[aria-label="Close video"]');assert.ok(pauses.includes(modalVideo));assert.equal(document.body.style.overflow,'clip');
  });
  it('Escape closes and restores the originating control',async()=>{
    await mount();const origin=document.querySelectorAll('.aen-video-expand')[1];await act(()=>origin.click());
    await act(()=>document.querySelector('dialog').dispatchEvent(new dom.window.Event('cancel',{cancelable:true})));
    assert.equal(document.querySelector('dialog'),null);assert.equal(document.activeElement,origin);
  });
  it('backdrop dismissal is guarded against a drag starting inside',async()=>{
    await mount();await click('.aen-video-expand');const d=document.querySelector('dialog');
    const event=name=>new dom.window.MouseEvent(name,{bubbles:true,clientX:-1,clientY:-1});
    await act(()=>d.dispatchEvent(event('click')));assert.ok(document.querySelector('dialog'));
    await act(()=>{d.dispatchEvent(event('pointerdown'));d.dispatchEvent(event('click'));});assert.equal(document.querySelector('dialog'),null);
  });
  it('autoplay rejection leaves an accessible expand control',async()=>{
    dom.window.HTMLMediaElement.prototype.play=()=>Promise.reject(new Error('autoplay denied'));
    await mount();visible();await Promise.resolve();assert.equal(document.querySelectorAll('button[aria-haspopup="dialog"]').length,2);
  });
});
it('keeps exactly two homepage paths, one static illustration and no third video deployment',()=>{
  const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');const home=read('src/app/page.tsx');
  assert.equal((home.match(/<HomeVideo /g)||[]).length,2);assert.equal((home.match(/<SubtitleConversionIllustration /g)||[]).length,1);
  assert.doesNotMatch(home,/subtitle-tools\.mp4|HomeVideo utility/);assert.match(home,/<HomeVideoProvider>/);
  for(const name of ['source-window','source-window-feature']){
    assert.ok(home.includes('src="/videos/'+name+'.mp4"'));const poster=readFileSync(new URL('../public/videos/'+name+'-poster.jpg',import.meta.url));assert.equal(poster.readUInt16BE(0),0xffd8);
    assert.ok(statSync(new URL('../public/videos/'+name+'.mp4',import.meta.url)).size<100*1024**2);
  }
  assert.equal(existsSync(new URL('../public/videos/subtitle-tools.mp4',import.meta.url)),false);
  assert.match(read('src/app/source-window/page.tsx'),/<HeroVideoPlaceholder/);
  assert.match(read('src/app/aenural.css'),/\.aen-video-frame \.aen-video-screen \{ aspect-ratio: 16\/9/);
  assert.match(read('src/app/aenural.css'),/\.aen-home \.aen-feature:not\(:last-child\) \{ margin-bottom: 88px/);
});
