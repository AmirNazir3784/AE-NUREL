import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import * as editor from '../src/lib/subtitle-editor.ts';
import * as sessionApi from '../src/features/srt-editor/editor-session.ts';
import * as localization from '../src/features/local-asr/semantic-localization.ts';
import {captionExport} from '../src/features/local-asr/asr-core.ts';
import {captionReviewHints} from '../src/features/local-asr/caption-review-hints.ts';
import {preservationIssues} from '../src/features/local-asr/translation-integrity.ts';
const require=createRequire(import.meta.url);
const source=readFileSync(new URL('../src/features/local-asr/caption-review.tsx',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function render(document,coverage,compare=false){
 const evaluated={exports:{}},downloads=[];let stateCalls=0;
 const dependencies={
  react:{...React,useReducer:()=>[{...sessionApi.initialEditorSession,document,saved:document},()=>{}],useState:()=>[stateCalls++===0?0:compare,()=>{}]},
  '@/lib/subtitle-editor':editor,'@/features/srt-editor/editor-session':sessionApi,
  '@/components/tools/download-button':{DownloadButton:props=>{downloads.push(props);return React.createElement('button',{disabled:props.disabled},props.label)}},
  '@/features/srt-editor/unsaved-navigation':{UnsavedNavigation:()=>null},
  '@/components/ui/status-message':{StatusMessage:({tone,children})=>React.createElement('div',{className:'status-'+tone,role:tone==='error'?'alert':'status'},children)},
  './transcription.module.css':{default:new Proxy({},{get:(_,name)=>name})},'./asr-core':{captionExport},
  './semantic-localization':localization,'./caption-review-hints':{captionReviewHints},'./translation-integrity':{preservationIssues},
 };
 new Function('require','module','exports',compiled)(id=>dependencies[id]??require(id),evaluated,evaluated.exports);
 return {html:renderToStaticMarkup(React.createElement(evaluated.exports.CaptionReview,{initialDocument:document,coverage})),downloads};
}
const cue=(text,start=0,end=500,id='test')=>({id,text,start,end,identifier:'',srtSettings:'',vttSettings:''});
const doc=cues=>({...editor.emptyEditor(),filename:'captions.ur.srt',cues});
describe('calm caption review presentation',()=>{
 it('makes reading advice optional and nonblocking, with no orange warning panel',()=>{
  const document=doc([cue('This caption is too long to read in half a second and needs review.')]),{html,downloads}=render(document);
  assert.match(html,/<details class="suggestions"><summary>Review suggestions \(1\)/);
  assert.doesNotMatch(html,/status-warning|role="alert"/);assert.match(html,/Check reading time/);
  assert.ok(downloads.every(button=>!button.disabled));assert.match(html,/aria-describedby="caption-0-error caption-hint-0"/);
 });
 it('keeps missing translations visibly blocking and never serves incomplete exports',()=>{
  const source=doc([cue('First sentence.',0,2000)]),units=localization.semanticUnits(source),out=localization.localizedDocument(source,units,[],'ur');
  const {html,downloads}=render(out.document,out.ledger);assert.match(html,/role="alert"/);assert.match(html,/Some captions need text or corrected timing/);
  assert.ok(downloads.every(button=>button.disabled));for(const button of downloads)assert.throws(()=>button.content(),/needs translated text/);
  out.document.cues[0].text='Corrected translation.';
  const corrected=render(out.document,out.ledger);assert.doesNotMatch(corrected.html,/role="alert"/);assert.ok(corrected.downloads.every(button=>!button.disabled));
 });
 it('offers source comparison without repeating source controls by default',()=>{
  const source=doc([cue('First sentence.',0,2000)]),units=localization.semanticUnits(source),out=localization.localizedDocument(source,units,[{id:units[0].id,text:'پہلا جملہ۔'}],'ur');
  const closed=render(out.document,out.ledger),open=render(out.document,out.ledger,true);
  assert.match(closed.html,/Compare with source/);assert.doesNotMatch(closed.html,/Source sentence 1/);
  assert.match(open.html,/Source sentence 1/);assert.match(open.html,/First sentence\./);assert.match(open.html,/aria-pressed="true"/);
  assert.doesNotMatch(closed.html,/status-warning|model segments|semanticVerified|Automatic draft check/);
 });
 it('updates review hints after an edit, preserves RTL and exports both corrected formats',()=>{
  const initial=doc([cue('x'.repeat(100),0,1000)]);assert.match(render(initial).html,/This caption is long/);
  const updated={...initial,cues:[cue('مرحباً',0,1000)]},{html,downloads}=render(updated);
  assert.doesNotMatch(html,/Review suggestions/);assert.match(html,/dir="auto"/);
  assert.ok(downloads.every(button=>!button.disabled));for(const button of downloads)assert.match(button.content(),/مرحباً/);
 });
 it('keeps observable identifier-loss hints subtle and removes them when corrected',()=>{
  const source=doc([cue('Keep 12 clips.',0,3000)]),units=localization.semanticUnits(source),out=localization.localizedDocument(source,units,[{id:units[0].id,text:'Keep the clips.'}],'en');
  const warning=render(out.document,out.ledger);assert.match(warning.html,/Compare numbers and identifiers/);assert.ok(warning.downloads.every(button=>!button.disabled));
  out.document.cues[0].text='Keep 12 clips.';assert.doesNotMatch(render(out.document,out.ledger).html,/Compare numbers and identifiers/);
 });
});
