import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {hardwareGpu,lyricCapacity} from '../src/features/local-asr/browser-capability.ts';
import {resilientSession} from '../src/features/eye-contact/inference-session.ts';
import {withProcessingLease} from '../src/features/local-asr/processing-lease.ts';
import {LYRIC_WEIGHT_ROOT,LYRIC_RUNTIME,permittedLyricAsset} from '../src/features/audio-captions/lyric-model.ts';
describe('capability-based bounded processing',()=>{
 it('permits pinned public lyric resources and blocks audio uploads or unpinned destinations',()=>{
  for(const base of[LYRIC_WEIGHT_ROOT,LYRIC_RUNTIME])assert.equal(permittedLyricAsset(new URL(base+'config.json'),'GET',false),true);
  for(const[link,method,body]of[[LYRIC_WEIGHT_ROOT+'config.json','POST',true],[LYRIC_WEIGHT_ROOT+'config.json?audio=private','GET',false],['https://example.com/model','GET',false],[LYRIC_WEIGHT_ROOT.replace(/\/resolve\/[^/]+\//,'/resolve/main/')+'config.json','GET',false]])assert.equal(permittedLyricAsset(new URL(link),method,body),false);
 });
 it('uses non-blocking cross-tab admission without incompatible signal options',async()=>{
  let called=0;const locks={async request(name,options,operation){assert.equal(name,'aenural-media-recognition');assert.deepEqual(options,{ifAvailable:true});return operation(null);}};
  await assert.rejects(withProcessingLease(new AbortController().signal,async()=>{called++;},locks),/Another AENural/);assert.equal(called,0);
  const available={async request(name,options,operation){return operation({name});}};
  assert.equal(await withProcessingLease(new AbortController().signal,async()=>42,available),42);
  const aborted=new AbortController();aborted.abort();await assert.rejects(withProcessingLease(aborted.signal,async()=>{called++;},available),{name:'AbortError'});assert.equal(called,0);
 });
 it('requires a real adapter and sufficient binding limits, with safe failure',async()=>{
  assert.equal(await hardwareGpu({}),false);assert.equal(await hardwareGpu({gpu:{requestAdapter:async()=>{throw Error('blocked')}}}),false);
  for(const adapter of[null,{isFallbackAdapter:true,limits:{maxStorageBufferBindingSize:2**30}},{info:{isFallbackAdapter:true},limits:{maxStorageBufferBindingSize:2**30}},{limits:{maxStorageBufferBindingSize:2**20}}])assert.equal(await hardwareGpu({gpu:{requestAdapter:async()=>adapter}}),false);
  assert.equal(await hardwareGpu({gpu:{requestAdapter:async()=>({limits:{maxStorageBufferBindingSize:2**30}})}}),true);
 });
 it('bounds CPU work and refuses known insufficient model memory without changing the model',()=>{
  assert.equal(lyricCapacity(2,true).seconds,0);assert.equal(lyricCapacity(4,true).seconds,30);assert.equal(lyricCapacity(8,false).seconds,30);assert.equal(lyricCapacity(8,true).seconds,300);assert.equal(lyricCapacity(undefined,false).seconds,30);
 });
 it('recovers from GPU device loss with the same graph and disposes both sessions',async()=>{
  const calls=[],released=[],bytes=new ArrayBuffer(4),signal=new AbortController().signal;
  const ort={InferenceSession:{async create(model,options){assert.equal(model,bytes);calls.push(options.executionProviders);const gpu=calls.length===1;return{outputNames:['x'],async run(feeds){if(gpu)throw Error('device lost');return feeds;},async release(){released.push(gpu)}}}}};
  const session=await resilientSession(ort,bytes,signal,true),feeds={x:1};assert.equal(await session.run(feeds),feeds);assert.equal(session.accelerated,false);await session.release();await session.release();assert.deepEqual(calls,[['webgpu','wasm'],['wasm']]);assert.deepEqual(released,[true,false]);await assert.rejects(session.run(feeds),/stopped/);
 });
 it('falls back after unsupported GPU initialization and propagates CPU errors',async()=>{
  let calls=0;const ort={InferenceSession:{async create(){if(++calls===1)throw Error('unsupported GPU');return{outputNames:[],async run(){throw Error('invalid model');},async release(){}}}}};
  const session=await resilientSession(ort,new ArrayBuffer(1),new AbortController().signal,true);assert.equal(calls,2);assert.equal(session.accelerated,false);await assert.rejects(session.run({}),/invalid model/);await session.release();
 });
});
