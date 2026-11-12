import './helpers/auth-dom.mjs';
import {it} from 'node:test';
import assert from 'node:assert/strict';
import {AsrClient} from '../src/features/local-asr/asr-client.ts';
import {STUDIO_MODEL_REUSE} from '../src/features/caption-studio/studio-transcription.ts';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function setup(){
 const workers=[];
 const client=new AsrClient(()=>{const worker={onmessage:null,onerror:null,terminated:0,postMessage(message){this.message=message;},terminate(){this.terminated++;}};workers.push(worker);return worker;});
 const result={text:'An unchanged transcript.',chunks:[{text:'An unchanged transcript.',timestamp:[0,1]}],backend:'wasm',loadMs:0,inferenceMs:1,cacheHits:0,downloadedBytes:0,requests:[]};
 const options={quality:'accurate',multilingual:false,wordTimestamps:true,...STUDIO_MODEL_REUSE};
 function run(extra={},signal=new AbortController().signal,progress=()=>{}){return client.run(new Float32Array(16),'auto',signal,progress,{...options,...extra});}
 function finish(worker=workers.at(-1)){worker.onmessage({data:{id:worker.message.id,type:'result',result}});}
 return {client,workers,result,run,finish};
}
it('reuses the same worker across caption clips and releases it after the configured idle period',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=setup();
 try{
  let job=h.run();h.finish();assert.equal(await job,h.result);assert.equal(h.workers[0].terminated,0);
  t.mock.timers.tick(STUDIO_MODEL_REUSE.idleTimeoutMs-1);
  job=h.run();assert.equal(h.workers.length,1);h.finish();assert.equal(await job,h.result);
  t.mock.timers.tick(1);assert.equal(h.workers[0].terminated,0,'the first clip timer must not close a reused worker');
  t.mock.timers.tick(STUDIO_MODEL_REUSE.idleTimeoutMs-1);assert.equal(h.workers[0].terminated,1);
  job=h.run();assert.equal(h.workers.length,2);h.finish();await job;
 }finally{h.client.cancel();}
});
it('drops incompatible models when quality or language family changes',async()=>{
 const h=setup();try{
  for(const options of [{},{quality:'fast'},{quality:'fast',multilingual:true}]){const job=h.run(options);h.finish();await job;}
  assert.equal(h.workers.length,3);assert.equal(h.workers[0].terminated,1);assert.equal(h.workers[1].terminated,1);
 }finally{h.client.cancel();}
});
it('cancels active inference immediately and releases an idle model when the editor closes',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const h=setup();
 const abort=new AbortController(),job=h.run({},abort.signal);const rejected=assert.rejects(job,{name:'AbortError'});abort.abort();await rejected;assert.equal(h.workers[0].terminated,1);
 const next=h.run();h.finish();await next;h.client.cancel();assert.equal(h.workers[1].terminated,1);
 t.mock.timers.tick(STUDIO_MODEL_REUSE.idleTimeoutMs);assert.equal(h.workers[1].terminated,1);
});
it('ignores late completion/progress and never reuses a worker that failed while idle',async()=>{
 const h=setup(),seen=[];try{
  const job=h.run({},undefined,p=>seen.push(p));h.finish();await job;
  const worker=h.workers[0];worker.onmessage({data:{id:worker.message.id,type:'progress',progress:{stage:'download'}}});assert.deepEqual(seen,[]);
  worker.onerror(new Error('idle crash'));assert.equal(worker.terminated,1);
  const next=h.run();assert.equal(h.workers.length,2);h.finish();await next;
 }finally{h.client.cancel();}
});

it('runs the actual worker twice with one pipeline/runtime preparation, using controlled inference fixtures',async()=>{
 // Exercise the worker's actual control flow without model downloads or a
 // claim about real recognition quality/performance. Only inference/assets
 // and voice activity are replaced with explicit controlled fixtures.
 let loads=0,inferences=0,disposals=0;const reads=[],replies=[],wasm={};
 const pipeline=async()=>{loads++;const transcriber=async()=>{inferences++;return {text:'Same words.',chunks:[{text:'Same words.',timestamp:[0,1]}]};};transcriber.dispose=async()=>{disposals++;};return transcriber;};
 const ort={env:{wasm},InferenceSession:{create:async()=>({release:async()=>{}})}};
 const modules={
  './asr-core':await import('../src/features/local-asr/asr-core.ts'),
  './asset-progress':await import('../src/features/local-asr/asset-progress.ts'),
  './cached-asset':{cachedAsset:async url=>{reads.push(url);return new Uint8Array(1);}},
  './speech-activity':{VAD_URL:'https://example.test/vad.onnx',VAD_SHA256:'fixture',detectSpeech:async()=>({regions:[{start:0,end:1}]})},
  './speech-transcription':await import('../src/features/local-asr/speech-transcription.ts'),
  './subtitle-capabilities':await import('../src/features/local-asr/subtitle-capabilities.ts'),
  './subtitle-timeline':await import('../src/features/local-asr/subtitle-timeline.ts'),
  './model-download':await import('../src/features/local-asr/model-download.ts'),
  './model-preparation':await import('../src/features/local-asr/model-preparation.ts'),
  '@huggingface/transformers':{pipeline,env:{backends:{onnx:{wasm}}}},
  'onnxruntime-web/webgpu':ort,
 };
 const scope={fetch:()=>{throw Error('This regression must not access a network.');},location:{href:'https://example.test/worker'},navigator:{},postMessage:message=>replies.push(message)};
 const source=readFileSync(new URL('../src/features/local-asr/asr.worker.ts',import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{self:scope,exports:{},require:name=>{assert.ok(modules[name],'Unmocked dependency '+name);return modules[name];},URL,Blob,Float32Array,Uint8Array,Request,performance});
 const run=async(id,keepAlive=true)=>scope.onmessage({data:{id,samples:new Float32Array(16000).fill(.1),backend:'auto',quality:'accurate',language:'en',wordTimestamps:true,keepAlive}});
 await run(1);await run(2);
 assert.equal(loads,1);assert.equal(inferences,2);assert.equal(disposals,0);
 assert.equal(reads.filter(url=>url.endsWith('.wasm')).length,1);assert.equal(reads.filter(url=>url.endsWith('.mjs')).length,1);
 assert.equal(replies.filter(r=>r.type==='error').length,0);assert.equal(replies.filter(r=>r.type==='result').length,2);
 const ready=replies.find(r=>r.id===2&&r.type==='progress'&&r.progress.preparation);assert.ok(ready);assert.equal(ready.progress.preparation.loaded,ready.progress.preparation.total);
 await run(3,false);assert.equal(disposals,1);
 await run(4,false);assert.equal(loads,2);assert.equal(disposals,2);assert.equal(reads.filter(url=>url.endsWith('.wasm')).length,2);
});
