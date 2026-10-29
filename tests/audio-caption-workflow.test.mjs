import './helpers/auth-dom.mjs';
import {describe,it,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {validateRecording,recordingDuration,recordingStage} from '../src/features/audio-captions/recording.ts';
import {openSubtitle,emptyEditor} from '../src/lib/subtitle-editor.ts';
const bootstrap=new JSDOM('<html><body></body></html>');globalThis.window=bootstrap.window;globalThis.document=bootstrap.window.document;
const {createRoot}=await import('react-dom/client');
const {AudioCaptionEditor}=await import('../src/features/audio-captions/audio-caption-editor.tsx');
describe('bounded audio caption input',()=>{
 it('keeps a genuine MP3/WAV-only size and duration contract',()=>{for(const name of ['clip.mp3','clip.WAV'])validateRecording({name,type:'',size:100});for(const file of [{name:'x.wav',type:'text/html',size:100},{name:'x.mp4',type:'audio/mpeg',size:100},{name:'x.wav',size:0},{name:'x.mp3',size:30*1024**2+1}])assert.throws(()=>validateRecording(file));for(const t of [1,60,300])recordingDuration(t);for(const t of [0,NaN,301,Infinity])assert.throws(()=>recordingDuration(t));});
 it('uses honest stage-based progress rather than an invented percentage',()=>{assert.equal(recordingStage(null),'Preparing recording');assert.equal(recordingStage({stage:'transcribing'}),'Transcribing, please wait…');});
});
describe('shared audio caption editor interactions',()=>{
 let dom,root,seeks;
 const q=s=>document.querySelector(s);
 const change=async(selector,value)=>act(()=>{const input=q(selector),proto=input.tagName==='TEXTAREA'?dom.window.HTMLTextAreaElement.prototype:dom.window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(input,value);input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
 const click=selector=>act(()=>q(selector).click());
 beforeEach(async()=>{dom=new JSDOM('<div id="root"></div>',{url:'http://localhost:3000/tools/podcast-to-captions'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.Element=dom.window.Element;globalThis.Node=dom.window.Node;globalThis.IS_REACT_ACT_ENVIRONMENT=true;root=createRoot(q('#root'));seeks=[];const bytes=new TextEncoder().encode('1\n00:00:01,000 --> 00:00:03,000\nAENural café 日本語\n');const doc=openSubtitle({name:'captions.srt',size:bytes.length},bytes.buffer);await act(()=>root.render(React.createElement(AudioCaptionEditor,{initialDocument:doc,duration:5,onSeek:t=>seeks.push(t)})));});
 afterEach(async()=>{await act(()=>root.unmount());dom.window.close();});
 it('edits Unicode text with actual Undo/Redo and seeks to measured start',async()=>{await change('textarea','Edited مرحبا');await click('.body > .actions button:nth-of-type(2)');assert.match(q('textarea').value,/AENural/);await click('.body > .actions button:nth-of-type(3)');assert.equal(q('textarea').value,'Edited مرحبا');await click('.cue .actions button');assert.deepEqual(seeks,[1]);});
 it('blocks downloads for missing or out-of-recording text/times',async()=>{await change('textarea','');assert.ok([...document.querySelectorAll('.exports button')].every(b=>b.disabled));await change('textarea','Complete text');await change('.times label:last-child input','00:00:06,000');assert.ok(q('[role="alert"]'));assert.ok([...document.querySelectorAll('.exports button')].every(b=>b.disabled));});
 it('adds and deletes actual editable captions without inventing speech',async()=>{await click('.body > .actions button');assert.equal(document.querySelectorAll('textarea').length,2);await click('[aria-label="Delete caption 2"]');assert.equal(document.querySelectorAll('textarea').length,1);});
 it('blocks stale-result downloads while retaining editing and blocks an empty manual result',async()=>{await act(()=>root.render(React.createElement(AudioCaptionEditor,{initialDocument:emptyEditor(),duration:5,onSeek:()=>{},exportBlocked:true})));assert.equal(q('textarea').disabled,false);assert.ok([...document.querySelectorAll('.exports button')].every(b=>b.disabled));await act(()=>root.render(React.createElement(AudioCaptionEditor,{key:'empty',initialDocument:emptyEditor(),duration:5,onSeek:()=>{}})));assert.equal(document.querySelectorAll('textarea').length,0);assert.ok([...document.querySelectorAll('.exports button')].every(b=>b.disabled));});
});
