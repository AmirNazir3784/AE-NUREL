import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { asrSessionReducer as reduce, initialAsrSession as empty, asrBusy } from '../src/features/local-asr/asr-session.ts';
const ready=()=>reduce(reduce(empty,{type:'check',id:1}),{type:'ready',id:1,filename:'original.wav',duration:27});
const result={text:'hello',chunks:[{text:'hello',timestamp:[0,1]}],backend:'wasm',loadMs:1,inferenceMs:2,downloadedBytes:100,cacheHits:0,requests:[]};
describe('ASR workspace session safety',()=>{
 it('treats speech detection as cancellable work and ignores its late progress',()=>{
  const state=reduce(reduce(ready(),{type:'generate',id:2}),{type:'progress',id:2,progress:{stage:'detecting'}});
  assert.equal(asrBusy(state),true);assert.equal(state.stage,'detecting');
  const cancelled=reduce(state,{type:'cancel',id:3});
  assert.equal(reduce(cancelled,{type:'progress',id:2,progress:{stage:'detecting'}}),cancelled);
 });
 it('keeps the previous good recording after a failed replacement',()=>{
  const state=reduce(reduce(ready(),{type:'check',id:2}),{type:'failed',id:2,message:'Invalid audio'});
  assert.equal(state.filename,'original.wav');assert.equal(state.duration,27);assert.equal(state.stage,'ready');assert.equal(state.error,'Invalid audio');
 });
 it('ignores out-of-order decoding and old transcription results',()=>{
  const state=reduce(ready(),{type:'check',id:2});
  assert.equal(reduce(state,{type:'ready',id:1,filename:'stale.mp3',duration:1}),state);
  assert.equal(reduce(state,{type:'complete',id:1,result}),state);
 });
 it('cancel invalidates progress, errors and results from an old worker',()=>{
  const loading=reduce(ready(),{type:'generate',id:2});assert.equal(asrBusy(loading),true);
  const state=reduce(loading,{type:'cancel',id:3});assert.equal(asrBusy(state),false);
  for(const action of [{type:'progress',id:2,progress:{stage:'transcribing'}},{type:'complete',id:2,result},{type:'failed',id:2,message:'late'}])assert.equal(reduce(state,action),state);
 });
 it('retains cache warnings through later phases and completion',()=>{
  let state=reduce(ready(),{type:'generate',id:2});
  state=reduce(state,{type:'progress',id:2,progress:{stage:'loading',warning:'Cache quota exhausted'}});
  state=reduce(state,{type:'progress',id:2,progress:{stage:'transcribing'}});
  state=reduce(state,{type:'complete',id:2,result});
  assert.deepEqual(state.warnings,['Cache quota exhausted']);assert.equal(state.stage,'complete');assert.equal(state.result,result);
 });
 it('reports silence without presenting a fabricated subtitle result',()=>{
  const state=reduce(reduce(ready(),{type:'generate',id:2}),{type:'complete',id:2,result:{...result,text:'',chunks:[]}});
  assert.match(state.notice,/No speech detected/);assert.equal(state.result.chunks.length,0);
 });
 it('reset clears results and never admits a late successful message',()=>{
  let state=reduce(reduce(ready(),{type:'generate',id:2}),{type:'complete',id:2,result});
  state=reduce(state,{type:'reset',id:3});assert.equal(state.filename,'');assert.equal(state.result,null);
  assert.equal(reduce(state,{type:'complete',id:2,result}),state);
 });
});
