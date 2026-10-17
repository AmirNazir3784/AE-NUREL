import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import {configuration,authorize} from '../server/hybrid/config.mjs';
import {inspectWav,MAX_UPLOAD_BYTES} from '../server/hybrid/wav.mjs';
import {HybridJobs,cleanupDirectory} from '../server/hybrid/jobs.mjs';
import {createApi} from '../server/hybrid/api.mjs';

const token='synthetic-development-test-token-1234567890';
const environment={NODE_ENV:'development',AENURAL_HYBRID_ENABLED:'1',AENURAL_HYBRID_DEV_TOKEN:token,AENURAL_HYBRID_MODEL_CACHE:path.resolve('artifacts/local-asr-qa/model-cache'),AENURAL_HYBRID_ORIGIN:'http://127.0.0.1:3108',AENURAL_HYBRID_MAX_RSS_MB:'2048'};
function wav(seconds=1){const b=Buffer.alloc(44+seconds*32000);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;}
const request=(method='POST',headers={},body=wav())=>new Request('http://127.0.0.1:3108/api/dev/hybrid/jobs',{method,headers:{origin:environment.AENURAL_HYBRID_ORIGIN,authorization:'Bearer '+token,'content-type':'audio/wav','x-upload-consent':'yes','x-spoken-language':'en',...headers},...(['GET','HEAD'].includes(method)?{}:{body})});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function settled(manager,id,owner){for(let i=0;i<100;i++){const job=manager.get(id,owner);if(['complete','failed','cancelled'].includes(job?.stage))return job;await wait(5);}throw Error('Test child did not finish');}
function fakeManager(){const children=[];const manager=new HybridJobs({spawn:()=>{const child=new EventEmitter();child.send=value=>{child.input=value;};child.kill=signal=>{child.killed=signal;queueMicrotask(()=>child.emit('close',1));return true;};children.push(child);return child;}});return {manager,children};}

describe('hybrid development capability and upload boundaries',()=>{
 it('is disabled in production even with every enable flag/credential present',async()=>{
  assert.equal(configuration({...environment,NODE_ENV:'production'}),null);
  const api=createApi(new HybridJobs(),()=>({...environment,NODE_ENV:'production'}));
  for(const response of [await api.capabilities(request('GET')),await api.submit(request()),await api.status(request('GET'),'missing'),await api.cancel(request('DELETE'),'missing')])assert.equal(response.status,404);
 });
 it('requires explicit complete loopback configuration and bounded memory/time settings',()=>{
  assert.ok(configuration(environment));for(const patch of [{AENURAL_HYBRID_ENABLED:''},{AENURAL_HYBRID_DEV_TOKEN:'short'},{AENURAL_HYBRID_ORIGIN:'https://aenural.com'},{AENURAL_HYBRID_MAX_RSS_MB:'999999'},{AENURAL_HYBRID_TIMEOUT_MS:'0'},{AENURAL_HYBRID_MODEL_CACHE:path.resolve('public/models')}])assert.equal(configuration({...environment,...patch}),null);
 });
 it('rejects absent/wrong access tokens, cross-site Origin and unsafe method requests',()=>{
  const config=configuration(environment);assert.equal(authorize(request('POST',{authorization:''}),config).status,401);assert.equal(authorize(request('POST',{authorization:'Bearer wrong'}),config).status,401);
  assert.equal(authorize(request('POST',{origin:'https://other.example'}),config).status,403);assert.equal(authorize(request('POST',{'sec-fetch-site':'cross-site'}),config).status,403);
  const normalized=new Request('http://localhost:3108/api/dev/hybrid/jobs',{headers:request('GET',{host:'127.0.0.1:3108'}).headers});assert.ok(authorize(normalized,config).owner);
  assert.equal(authorize(request('GET',{host:'other.example'}),config).status,403);
  const get=request('GET');get.headers.delete('origin');assert.ok(authorize(get,config).owner);get.headers.delete('authorization');assert.equal(authorize(get,config).status,401);
 });
 it('validates actual RIFF/PCM structure, duration, channels, alignment and truncation',()=>{
  assert.equal(inspectWav(wav()).duration,1);
  for(const mutate of [b=>b.write('MP3!',0),b=>b.writeUInt32LE(99999999,4),b=>b.writeUInt16LE(3,20),b=>b.writeUInt16LE(3,22),b=>b.writeUInt16LE(1,32),b=>b.writeUInt32LE(9999999,40)]){const b=wav();mutate(b);assert.throws(()=>inspectWav(b),/PCM WAV/);}
  assert.throws(()=>inspectWav(wav(61)),/PCM WAV/);assert.throws(()=>inspectWav(Buffer.alloc(MAX_UPLOAD_BYTES+1)),/PCM WAV/);
 });
 it('requires informed upload consent and rejects unsupported languages/translation/media without fallback',async()=>{
  const api=createApi(new HybridJobs(),()=>environment);
  assert.equal((await api.submit(request('POST',{'x-upload-consent':'no'}))).status,400);
  assert.equal((await api.submit(request('POST',{'x-spoken-language':'auto'}))).status,422);
  assert.equal((await api.submit(request('POST',{'x-subtitle-language':'ur'}))).status,422);
  assert.equal((await api.submit(request('POST',{'content-type':'video/mp4'}))).status,415);
 });
 it('fails honestly if pinned model files are unavailable',async()=>{
  const api=createApi(new HybridJobs(),()=>({...environment,AENURAL_HYBRID_MODEL_CACHE:path.resolve('artifacts/hybrid/nonexistent-cache')}));assert.equal((await api.submit(request())).status,503);
 });
 it('bounds rate and upload concurrency and permits a later retry',()=>{
  let now=10;const manager=new HybridJobs({now:()=>now});const release=manager.reserve();assert.throws(()=>manager.reserve(),/busy/);release();manager.reserve()();
  assert.equal(manager.rate('uploads',1),true);assert.equal(manager.rate('uploads',1),false);now+=60001;assert.equal(manager.rate('uploads',1),true);
 });
 it('cleans corrupt/oversized/empty uploads before launching any model',async()=>{
  const {manager,children}=fakeManager();manager.cacheReady=async()=>true;const directories=[];const prepare=manager.prepare.bind(manager);manager.prepare=async()=>{const dir=await prepare();directories.push(dir);return dir;};const api=createApi(manager,()=>environment);
  for(const req of [request('POST',{},Buffer.from('corrupt')),request('POST',{'content-length':String(MAX_UPLOAD_BYTES+1)}),request('POST',{},Buffer.alloc(0))])assert.equal((await api.submit(req)).status,400);
  assert.equal(children.length,0);for(const dir of directories)await assert.rejects(fs.access(dir));assert.equal(manager.reserved,false);
 });
});
describe('isolated hybrid jobs lifecycle (test child; real inference verified separately)',()=>{
 async function setup(){const {manager,children}=fakeManager(),directory=await manager.prepare();await fs.writeFile(path.join(directory,'recording.wav'),wav());const config={...configuration(environment),rssMB:1};const id=await manager.start('owner-a',directory,config);return {manager,child:children[0],directory,id};}
 it('accepts actual child output only after cleanup, validates ownership and hides server paths',async()=>{
  const {manager,child,directory,id}=await setup();assert.equal(manager.get(id,'owner-b'),null);assert.equal(manager.cancel(id,'owner-b'),false);
  child.emit('message',{type:'result',words:[{text:'Synthetic fixture.',timestamp:[0,.5]}]});assert.notEqual(manager.get(id,'owner-a').stage,'complete');child.emit('close',0);
  const job=await settled(manager,id,'owner-a');assert.equal(job.stage,'complete');assert.equal(job.result.words[0].text,'Synthetic fixture.');await assert.rejects(fs.access(directory));assert.ok(!JSON.stringify(job).includes(directory));
  manager.cancel(id,'owner-a');assert.equal(manager.get(id,'owner-a'),null);
 });
 it('kills and cleans invalid/empty/timing-disordered child output',async()=>{
  for(const words of [[],[{text:'bad',timestamp:[1,0]}],[{text:'too late',timestamp:[0,2]}]]){const {manager,child,directory,id}=await setup();child.emit('message',{type:'result',words});assert.equal((await settled(manager,id,'owner-a')).stage,'failed');assert.equal(child.killed,'SIGKILL');await assert.rejects(fs.access(directory));}
 });
 it('terminates on memory-budget excess and deletes temporary audio',async()=>{
  const {manager,child,directory,id}=await setup();child.emit('message',{type:'memory',rss:2*1024**2});const job=await settled(manager,id,'owner-a');assert.match(job.error,/memory budget/);await assert.rejects(fs.access(directory));
 });
 it('times out a stuck isolated job and cleans its audio',async()=>{
  const {manager,children}=fakeManager(),directory=await manager.prepare();await fs.writeFile(path.join(directory,'recording.wav'),wav());
  const id=await manager.start('owner',directory,{...configuration(environment),rssMB:1,timeoutMs:5});
  const job=await settled(manager,id,'owner');assert.equal(job.stage,'failed');assert.match(job.error,/timed out/);assert.equal(children[0].killed,'SIGKILL');await assert.rejects(fs.access(directory));
 });
 it('cancels an individual running job and releases resources for retry',async()=>{
  const {manager,child,directory,id}=await setup();assert.equal(manager.cancel(id,'owner-a'),true);assert.equal((await settled(manager,id,'owner-a')).stage,'cancelled');assert.equal(child.killed,'SIGKILL');await assert.rejects(fs.access(directory));manager.reserve()();
 });
 it('expires results from memory and refuses cleanup outside its own temporary root',async()=>{
  const {manager,child,id}=await setup();child.emit('message',{type:'result',words:[{text:'test',timestamp:[0,.2]}]});child.emit('close',0);await settled(manager,id,'owner-a');manager.now=()=>Date.now()+11*60000;assert.equal(manager.get(id,'owner-a'),null);await assert.rejects(cleanupDirectory(process.cwd()),/Unsafe/);
 });
});
