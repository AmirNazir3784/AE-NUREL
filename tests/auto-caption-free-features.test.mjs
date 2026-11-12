import './helpers/auth-dom.mjs';
import {it} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
const {AUTO_CAPTION_FREE_FEATURES}=await import('../src/lib/auto-caption-features.ts');
const {freeCaptionAccess,captionAccess}=await import('../src/features/membership/caption-policy.ts');
const {StyleControls}=await import('../src/features/caption-studio/style-controls.tsx');
const {GenerationControls}=await import('../src/features/caption-studio/generation-controls.tsx');
const {CaptionEntry}=await import('../src/features/caption-studio/caption-entry.tsx');
const {CaptionEditorial}=await import('../src/features/caption-page/caption-editorial.tsx');
const {STUDIO_PRESETS}=await import('../src/features/caption-studio/studio-core.ts');
const {validateProject}=await import('../src/features/membership/project-validation.ts');
const noop=()=>{};
it('unlocks every caption preset, font and advanced control for a signed-out visitor',()=>{
 assert.equal(AUTO_CAPTION_FREE_FEATURES,true);
 const access=freeCaptionAccess();assert.equal(access.signedIn,false);assert.equal(access.watermark,false);assert.equal(access.dailyLimit,null);assert.equal(access.remaining,null);assert.equal(access.maxSeconds,120);
 const dom=new JSDOM(renderToStaticMarkup(React.createElement(StyleControls,{style:STUDIO_PRESETS[0],access,disabled:false,wordTimingAvailable:true,onChange:noop,onPreset:noop,onError:noop})));
 const doc=dom.window.document;
 assert.equal(doc.querySelectorAll('.preset').length,STUDIO_PRESETS.length);
 assert.equal(doc.querySelectorAll('.preset:disabled,fieldset:disabled,option:disabled').length,0);
 const words=[...doc.querySelectorAll('label')].find(e=>e.textContent.includes('Highlight spoken words')).querySelector('input');assert.equal(words.disabled,false);
 assert.doesNotMatch(doc.body.textContent,/Premium|Unlock all|Source Window package/);dom.window.close();
 // Existing account policies for other workflows are deliberately unchanged.
 const other=captionAccess(false,false);assert.equal(other.premium,false);assert.equal(other.watermark,true);assert.equal(other.dailyLimit,3);assert.equal(other.maxSeconds,60);
});
it('allows Accurate generation for a 120-second guest clip and keeps hard file limits visible',()=>{
 const dom=new JSDOM(renderToStaticMarkup(React.createElement(GenerationControls,{available:false,busy:false,transcribing:false,duration:120,hasAudio:true,stage:'',progress:null,access:freeCaptionAccess(),onGenerate:noop,onCancel:noop})));
 assert.equal(dom.window.document.querySelector('option[value="accurate"]').disabled,false);
 const button=[...dom.window.document.querySelectorAll('button')].find(e=>e.textContent==='Generate captions');assert.equal(button.disabled,false);
 dom.window.close();
 const entry=renderToStaticMarkup(React.createElement(CaptionEntry,{transcriptionAvailable:false,accessEnabled:true,freeFeatures:true}));
 assert.match(entry,/Up to 2 minutes.*200 MiB.*4K/);assert.doesNotMatch(entry,/Package|Free: 60 seconds/);
});
it('preserves advanced styles and 4K metadata in free auto-caption projects without granting account ownership',()=>{
 const input={schemaVersion:1,tool:'auto-caption-generator',title:'Caption project',source:{filename:'clip.mp4',durationSeconds:120,width:3840,height:2160},captions:{filename:'clip.srt',format:'srt',cues:[{id:'one',text:'A clear line.',start:0,end:2000}]},style:{...STUDIO_PRESETS[25],animation:'pop',wordHighlight:true},alignment:[],ownerId:'not-authorized',premium:true};
 const saved=validateProject(input,false);assert.equal(saved.tool,'auto-caption-generator');assert.equal(saved.style.preset,input.style.preset);assert.equal(saved.style.animation,'pop');assert.equal(saved.style.wordHighlight,true);assert.equal(saved.source.width,3840);assert.equal(saved.ownerId,undefined);assert.equal(saved.premium,undefined);
 assert.throws(()=>validateProject({...input,tool:undefined},false));
 const other=validateProject({...input,tool:undefined,source:{...input.source,width:640,height:360}},false);assert.equal(other.style.animation,'none');assert.equal(other.style.wordHighlight,false);
 assert.throws(()=>validateProject({...input,source:{...input.source,durationSeconds:121}},false));
 assert.throws(()=>validateProject({...input,source:{...input.source,width:4097,height:100}},false));
});
it('replaces the tool-page upsell with accurate free-feature information',()=>{
 const html=renderToStaticMarkup(React.createElement(CaptionEditorial));assert.match(html,/All caption features. Free to use./);assert.match(html,/No account or purchase is required/);assert.doesNotMatch(html,/\$20|View plans|One purchase|premium Auto Caption/);
});
