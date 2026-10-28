import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { captionDocument, validateAsrFile, validateDuration, mixIntoMono, isDigitalSilence, permittedAssetRequest, ASR_MODEL, ASR_REVISION, ASR_MAX_BYTES } from '../src/features/local-asr/asr-core.ts';
import { AsrClient } from '../src/features/local-asr/asr-client.ts';
import { exportEditor, parseVtt } from '../src/lib/subtitle-editor.ts';
import { parseSrt } from '../src/lib/srt.ts';
const word = (text, start, end) => ({text, timestamp:[start,end]});

describe('local ASR input and timed cue pipeline', () => {
 it('bounds files and duration before allocating model input', () => {
  for(const name of ['test.MP3','speech.wav']) validateAsrFile({name,size:10});
  for(const f of [{name:'x.txt',size:10},{name:'x.wav',size:0},{name:'x.mp3',size:ASR_MAX_BYTES+1}]) assert.throws(()=>validateAsrFile(f));
  for(const n of [0,NaN,Infinity,60.001]) assert.throws(()=>validateDuration(n));
  validateDuration(60);
 });
 it('preserves actual intervals, punctuation and final words in both downloaded formats', () => {
  const doc=captionDocument([word(' Clear',.16,.6),word(' captions.',.6,1.5),word(' lighthouse',2,2.9)],3,'../lecture.mp3');
  assert.equal(doc.filename,'lecture.srt');
  assert.deepEqual(doc.cues.map(c=>[c.start,c.end,c.text]),[[160,1500,'Clear captions.'],[2000,2900,'lighthouse']]);
  assert.equal(parseSrt(exportEditor(doc,'srt')).cues.length,2);
  assert.equal(parseVtt(exportEditor(doc,'vtt')).cues.at(-1).text,'lighthouse');
 });
 it('preserves Unicode and groups only within actual timing spans', () => {
  const doc=captionDocument([word(' Café',0,.4),word(' مرحباً',.4,1),word(' 世界 🎬',1,1.5)],2,'日本語.wav');
  assert.equal(doc.filename,'日本語.srt');
  assert.equal(doc.cues[0].text,'Café مرحباً 世界 🎬');
 });
 it('breaks cues for long pauses or long spans without inventing splits', () => {
  const doc=captionDocument([word('one',0,1),word('two',2,3),word('three',3,9)],10,'x.wav');
  assert.equal(doc.cues.length,3);
  assert.equal(doc.cues.at(-1).end,9000);
 });
 it('rejects missing, invalid, overlapping and out-of-media timing', () => {
  for(const chunk of [word('x',null,1),word('x',0,null),word('x',NaN,1),word('x',1,1),word('x',-1,1),word('x',1,4)]) assert.throws(()=>captionDocument([chunk],3,'x.wav'));
  assert.throws(()=>captionDocument([word('a',0,1),word('a',.9,1.5)],3,'x.wav'));
 });
 it('does not invent a cue for an empty recognition result', () => assert.equal(captionDocument([],3,'silence.wav').cues.length,0));
 it('recognizes digital silence and rejects invalid samples', () => {
  assert.equal(isDigitalSilence(new Float32Array(160000)),true);
  assert.equal(isDigitalSilence(new Float32Array([0,.1,0])),false);
  assert.throws(()=>isDigitalSilence(new Float32Array([NaN])));
  assert.throws(()=>isDigitalSilence(new Float32Array([.1,NaN])));
 });
 it('permits only pinned public asset reads, never inference endpoints or request bodies', () => {
  const url=new URL('https://huggingface.co/'+ASR_MODEL+'/resolve/'+ASR_REVISION+'/config.json');
  assert.equal(permittedAssetRequest(url,'GET',false),true);
  assert.equal(permittedAssetRequest(url,'POST',true),false);
  assert.equal(permittedAssetRequest(url,'GET',true),false);
  for(const bad of ['https://api.example.com/transcribe','https://huggingface.co/'+ASR_MODEL+'/resolve/main/config.json',url.href+'?audio=secret']) assert.equal(permittedAssetRequest(new URL(bad),'GET',false),false);
 });
 it('mixes stereo to mono and places chunks on the original media timeline', () => {
  const output=new Float32Array(12);
  mixIntoMono(output,[new Float32Array([1,1,1,1]),new Float32Array([0,0,0,0])],16000,4/16000);
  assert.deepEqual([...output],[0,0,0,0,.5,.5,.5,.5,0,0,0,0]);
 });
 it('resamples 48kHz without growing beyond the bounded destination', () => {
  const output=new Float32Array(4); mixIntoMono(output,[Float32Array.from({length:12},(_,i)=>i/12)],48000,0);
  assert.deepEqual([...output],[0,.25,.5,.75]);
  assert.throws(()=>mixIntoMono(output,[new Float32Array(4)],192000,0));
 });
});

describe('local ASR worker lifecycle', () => {
 function setup() { const workers=[]; const client=new AsrClient(()=>{const worker={onmessage:null,onerror:null,terminated:false,postMessage(m){this.message=m},terminate(){this.terminated=true}}; workers.push(worker); return worker;});return {client,workers}; }
 const result={text:'real adapter result',chunks:[],backend:'wasm',loadMs:1,inferenceMs:2,cacheHits:0,downloadedBytes:0,requests:[]};
 it('cancels and terminates download or inference immediately', async () => {
  const {client,workers}=setup(), abort=new AbortController();
  const job=client.run(new Float32Array(1),'wasm',abort.signal,()=>{});
  const rejected=assert.rejects(job,{name:'AbortError'}); abort.abort(); await rejected;
  assert.equal(workers[0].terminated,true);
 });
 it('file replacement rejects old job and ignores stale messages', async () => {
  const {client,workers}=setup(), signal=new AbortController().signal, seen=[];
  const old=client.run(new Float32Array(1),'wasm',signal,p=>seen.push(p)); const rejected=assert.rejects(old,{name:'AbortError'});
  const next=client.run(new Float32Array(1),'wasm',signal,p=>seen.push(p)); await rejected;
  workers[0].onmessage({data:{id:workers[0].message.id,type:'result',result}});
  workers[0].onmessage({data:{id:workers[0].message.id,type:'progress',progress:{stage:'download'}}});
  assert.deepEqual(seen,[]);
  workers[1].onmessage({data:{id:workers[1].message.id,type:'result',result}});
  assert.equal(await next,result); assert.equal(workers[1].terminated,true);
 });
 it('worker exceptions become explicit errors and release resources', async () => {
  const {client,workers}=setup(); const job=client.run(new Float32Array(1),'auto',new AbortController().signal,()=>{});
  workers[0].onerror(new Error('test')); await assert.rejects(job,/Speech recognition stopped/); assert.equal(workers[0].terminated,true);
 });
 it('does not create a worker for an already cancelled job', () => {
  const {client,workers}=setup(), abort=new AbortController();abort.abort();
  assert.throws(()=>client.run(new Float32Array(1),'wasm',abort.signal,()=>{}),{name:'AbortError'});assert.equal(workers.length,0);
 });
 it('releases every worker across ten cancel and replacement cycles',async()=>{
  const {client,workers}=setup();
  for(let i=0;i<10;i++){
   const pending=client.run(new Float32Array(1),'wasm',new AbortController().signal,()=>{});
   const rejected=assert.rejects(pending,{name:'AbortError'});client.cancel();await rejected;
  }
  assert.equal(workers.length,10);assert.ok(workers.every(worker=>worker.terminated));
 });
});
