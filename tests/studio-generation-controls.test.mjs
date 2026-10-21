import './helpers/auth-dom.mjs';
import {describe,it,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {validateDeviceTranscription} from '../src/features/caption-studio/studio-transcription.ts';
const bootstrap=new JSDOM('<html><body></body></html>');globalThis.window=bootstrap.window;globalThis.document=bootstrap.window.document;
const {createRoot}=await import('react-dom/client');
const {GenerationControls}=await import('../src/features/caption-studio/generation-controls.tsx');
describe('usable studio caption generation controls',()=>{
 let dom,root,calls,cancelled;
 const q=selector=>document.querySelector(selector);
 const label=text=>Array.from(document.querySelectorAll('label')).find(el=>el.firstChild.textContent===text);
 const action=()=>Array.from(document.querySelectorAll('button')).find(b=>/^Generat(?:e|ing) captions/.test(b.textContent));
 const mount=props=>act(()=>root.render(React.createElement(GenerationControls,{available:false,busy:false,transcribing:false,duration:90,hasAudio:true,stage:'',progress:null,onGenerate:s=>calls.push(s),onCancel:()=>cancelled++,...props})));
 const change=async(el,value)=>act(()=>{el.value=value;el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
 beforeEach(()=>{dom=new JSDOM('<div id="root"></div>');globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;calls=[];cancelled=0;root=createRoot(q('#root'));});
 afterEach(async()=>{await act(()=>root.unmount());dom.window.close();});
 it('enables genuine device generation without a configured server or credentials',async()=>{await mount();assert.equal(action().disabled,false);assert.equal(label('Processing').querySelector('select').value,'device');await act(()=>action().click());assert.deepEqual(calls,[{mode:'device',language:'auto',quality:'accurate',token:'',consent:false}]);assert.doesNotMatch(document.body.textContent,/Automatic transcription is unavailable here/);});
 it('passes independent source-language and quality choices; no hidden downgrade',async()=>{await mount();await change(label('Spoken language').querySelector('select'),'ja');await change(label('Quality').querySelector('select'),'fast');await act(()=>action().click());assert.equal(calls[0].language,'ja');assert.equal(calls[0].quality,'fast');assert.equal(calls[0].mode,'device');});
 it('keeps unavailable private mode disabled and requires explicit server consent and access',async()=>{await mount();assert.equal(q('option[value=server]').disabled,true);await mount({available:true,duration:30});await change(label('Processing').querySelector('select'),'server');assert.equal(action().disabled,true);const token=q('input[type=password]');await act(()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(token,'test-only-operator-access-1234567890');token.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});await act(()=>q('input[type=checkbox]').click());assert.equal(action().disabled,false);await act(()=>action().click());assert.equal(calls[0].mode,'server');assert.equal(calls[0].language,'en');assert.equal(calls[0].consent,true);});
 it('disables duplicate submission and supports cancellation with real per-file download progress',async()=>{await mount({busy:true,transcribing:true,stage:'Downloading speech model',progress:{stage:'download',loaded:100,total:400}});assert.equal(action().disabled,true);const meter=q('[role=progressbar]');assert.ok(meter);assert.equal(meter.getAttribute('aria-valuenow'),'25');assert.equal(meter.getAttribute('aria-valuemax'),'100');assert.equal(meter.querySelector('span').style.width,'25%');await act(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Cancel transcription').click());assert.equal(cancelled,1);});
 it('does not offer speech generation from silent media',async()=>{await mount({hasAudio:false});assert.equal(action().disabled,true);assert.match(document.body.textContent,/no audio track/);});
});
describe('pinned device inference policy and header repair',()=>{
 it('accepts 120-second device jobs and supported languages but refuses low-memory Accurate and unsupported settings',()=>{validateDeviceTranscription({language:'ja',quality:'accurate'},120,8);validateDeviceTranscription({language:'auto',quality:'fast'},120,2);for(const [options,duration,memory]of [[{language:'fake',quality:'fast'},20,8],[{language:'en',quality:'accurate'},20,4],[{language:'en',quality:'fast'},121,8],[{language:'en',quality:'invented'},20,8]])assert.throws(()=>validateDeviceTranscription(options,duration,memory));});
 it('reuses the actual worker with pinned selection/word timestamps and never calls a server as fallback',()=>{const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');const engine=read('src/features/caption-studio/studio-transcription.ts');assert.match(engine,/client\.run\(samples, "auto"/);assert.match(engine,/wordTimestamps: true/);assert.match(engine,/multilingual: options\.language !== "en"/);assert.match(engine,/captionDocument\(result.chunks/);assert.doesNotMatch(engine,/fetch\(|requestHybrid|replace\(/);const header=read('src/components/site/header.tsx');assert.doesNotMatch(header,/>Explore tools</);assert.match(header,/NODE_ENV === "development" && <button className="aen-sign-in/);const css=read('src/app/aenural.css');assert.match(css,/\.aen-nav-links \{[^}]*margin-left: auto/);assert.match(css,/\.aen-sign-in \{[^}]*background: var\(--action\)/);});
});
