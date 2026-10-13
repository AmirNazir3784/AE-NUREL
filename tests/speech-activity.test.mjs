import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { speechRegions, detectSpeech, VAD_URL, VAD_SHA256 } from '../src/features/local-asr/speech-activity.ts';
import { isDigitalSilence, permittedAssetRequest } from '../src/features/local-asr/asr-core.ts';
import { transcribeSpeech } from '../src/features/local-asr/speech-transcription.ts';
import { cachedAsset } from '../src/features/local-asr/cached-asset.ts';

describe('measured Silero 6.2.3 speech activity policy',()=>{
 for(const name of ['silence','tones','noise','clear','quiet','separated','noisy'])it('classifies captured '+name+' without word or volume special cases',async()=>{
  const fixture=JSON.parse(await readFile(new URL('./fixtures/local-asr/vad/'+name+'-probabilities.json',import.meta.url),'utf8'));
  const result=speechRegions(fixture.probabilities,fixture.samples);
  assert.equal(result.regions.length>0,['clear','quiet','separated','noisy'].includes(name));
  if(name==='separated'){assert.equal(result.regions.length,2);assert.ok(result.regions[1].start-result.regions[0].end>4);}
  if(['clear','quiet','noisy'].includes(name))assert.ok(result.regions.at(-1).end>27.2,'last spoken word remains inside padded region');
 });
 it('does not call quiet nonzero samples digital silence',()=>{
  assert.equal(isDigitalSilence(new Float32Array([0,0])),true);
  assert.equal(isDigitalSilence(new Float32Array([0,1e-8])),false);
 });
 it('rejects invalid confidence and timelines instead of claiming no speech',()=>{
  for(const value of [NaN,-.1,1.1])assert.throws(()=>speechRegions([value],512));
  assert.throws(()=>speechRegions([],512));assert.throws(()=>speechRegions([.9],960001));
 });
 it('rejects isolated spikes while keeping sustained short speech with original timing',()=>{
  assert.equal(speechRegions([.9,...Array(20).fill(.1)],21*512).regions.length,0);
  const probabilities=[...Array(20).fill(.1),...Array(10).fill(.9),...Array(20).fill(.1)];
  const result=speechRegions(probabilities,probabilities.length*512);
  assert.equal(result.regions.length,1);assert.ok(result.regions[0].start>.3);
 });
 it('permits only the exact immutable VAD asset, with no media or query payload',()=>{
  const url=new URL(VAD_URL);assert.equal(permittedAssetRequest(url,'GET',false),true);
  assert.equal(permittedAssetRequest(url,'POST',true),false);
  assert.equal(permittedAssetRequest(new URL(url.href+'?audio=private'),'GET',false),false);
  assert.equal(permittedAssetRequest(new URL(url.href.replace(/[a-f0-9]{40}/,'master')),'GET',false),false);
  assert.equal(VAD_SHA256.length,64);
 });
});

describe('recurrent detector lifecycle and timestamped transcription',()=>{
 it('passes real context/recurrent state between frames and resets each recording',async()=>{
  const samples=Float32Array.from({length:1024},(_,i)=>i/1024);let calls=0;
  await detectSpeech(samples,async(input,state)=>{
   assert.equal(input.length,576);assert.equal(state.length,256);
   if(!calls){assert.ok(input.subarray(0,64).every(x=>x===0));assert.ok(state.every(x=>x===0));}
   else{assert.deepEqual(input.subarray(0,64),samples.subarray(448,512));assert.equal(state[0],7);}
   calls++;return{probability:.9,state:new Float32Array(256).fill(7)};
  });assert.equal(calls,2);
  await detectSpeech(samples,async(_,state)=>{assert.equal(state[0],0);return{probability:0,state:new Float32Array(256)};});
 });
 it('propagates failure/cancellation and rejects invalid recurrent state',async()=>{
  const controller=new AbortController();controller.abort();
  await assert.rejects(detectSpeech(new Float32Array(512),()=>assert.fail('no run'),controller.signal),{name:'AbortError'});
  await assert.rejects(detectSpeech(new Float32Array(512),async()=>{throw Error('detector failed');}),/detector failed/);
  await assert.rejects(detectSpeech(new Float32Array(512),async()=>({probability:.9,state:new Float32Array(2)})),/invalid state/);
 });
 it('never invokes Whisper or fabricates captions for rejected audio',async()=>{
  const output=await transcribeSpeech(new Float32Array(16000),[],()=>assert.fail('Whisper must not run'));
  assert.deepEqual(output,{text:'',chunks:[]});
 });
 it('preserves full context, silence offsets and actual model segment times',async()=>{
  let calls=0;const original=new Float32Array(160000);
  const output=await transcribeSpeech(original,[{start:1,end:3},{start:6,end:9}],async samples=>{
   assert.equal(samples,original);calls++;
   return{text:'real words and unsupported silence output',chunks:[{text:'first',timestamp:[1.2,2.5]},{text:'unsupported',timestamp:[4,5]},{text:'lighthouse',timestamp:[6.2,7.5]}]};
  });assert.equal(calls,1);assert.equal(output.text,'first lighthouse');assert.deepEqual(output.chunks.map(c=>c.timestamp),[[1.2,2.5],[6.2,7.5]]);
 });
 it('rejects overlapping regions or incomplete model timing',async()=>{
  await assert.rejects(transcribeSpeech(new Float32Array(16000),[{start:0,end:2}],()=>assert.fail('no run')),/timeline/);
  await assert.rejects(transcribeSpeech(new Float32Array(16000),[{start:0,end:1}],async()=>({text:'word',chunks:[]})),/usable timestamps/);
 });
 it('keeps guarded long-section contexts on the real timeline without concatenating silence',async()=>{
  const calls=[];
  const output=await transcribeSpeech(new Float32Array(125*16000),[{start:5,end:10},{start:105,end:120}],async samples=>{calls.push(samples.length/16000);return {text:'measured',chunks:[{text:'measured',timestamp:[1,2]}]}},true);
  assert.deepEqual(calls,[7,17]);assert.deepEqual(output.chunks.map(c=>c.timestamp),[[5,6],[105,106]]);
 });
});

describe('integrity-checked local speech assets',()=>{
 it('reuses cached assets without network or re-writing cache',async()=>{
  const bytes=await cachedAsset('https://assets.example/model',{match:async()=>new Response('cached'),put:()=>assert.fail('no write')},()=>assert.fail('no download'));
  assert.equal(new TextDecoder().decode(bytes),'cached');
 });
 it('rejects failed or corrupted assets before they can bypass detection',async()=>{
  const cache={match:async()=>undefined,put:()=>assert.fail('must not cache invalid asset')};
  await assert.rejects(cachedAsset(VAD_URL,cache,async()=>new Response('bad',{status:503}),VAD_SHA256),/HTTP 503/);
  await assert.rejects(cachedAsset(VAD_URL,cache,async()=>new Response('corrupt'),VAD_SHA256),/integrity check/);
 });
 it('stores a verified asset and preserves the bytes',async()=>{
  const content=new Uint8Array([1,2,3]);let saved;
  const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',content))].map(value=>value.toString(16).padStart(2,'0')).join('');
  const bytes=await cachedAsset('https://assets.example/model',{match:async()=>undefined,put:async(_,response)=>{saved=new Uint8Array(await response.arrayBuffer());}},async()=>new Response(content),sha);
  assert.deepEqual(bytes,content);assert.deepEqual(saved,content);
 });
});
