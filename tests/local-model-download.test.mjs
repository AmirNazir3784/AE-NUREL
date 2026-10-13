import {it} from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {downloadModel,clearModelParts,modelPartKey,MODEL_RANGE_BYTES} from '../src/features/local-asr/model-download.ts';
const url='https://huggingface.co/test/model/resolve/immutable/onnx/encoder.onnx';
function storage(){const parts=new Map();return {parts,async match(key){return parts.get(key)?.clone()},async put(key,response){parts.set(key,response.clone())}}}
const rangeResponse=(start,end,size)=>new Response(new Uint8Array(end-start+1).fill(start?2:1),{status:206,headers:{'content-range':`bytes ${start}-${end}/${size}`}});

it('resumes a failed large model download from cached ranges, without repeating completed data or transmitting text',async()=>{
 const size=MODEL_RANGE_BYTES+20,cache=storage(),calls=[],progress=[];let fail=true,received=0;
 const fetcher=async(request,options)=>{assert.equal(request,url);assert.equal(options.method,'GET');assert.equal(options.body,undefined);assert.equal(new URL(request).search,'');calls.push(options.headers.Range);const [,start,end]=/bytes=(\d+)-(\d+)/.exec(options.headers.Range).map(Number);if(start&&fail)throw Error('connection closed');return rangeResponse(start,end,size)};
 await assert.rejects(downloadModel(url,size,cache,fetcher,p=>progress.push(p),n=>received+=n).arrayBuffer(),/connection closed/);
 assert.deepEqual(calls,[`bytes=0-${MODEL_RANGE_BYTES-1}`,`bytes=${MODEL_RANGE_BYTES}-${size-1}`,`bytes=${MODEL_RANGE_BYTES}-${size-1}`,`bytes=${MODEL_RANGE_BYTES}-${size-1}`]);
 assert.equal(received,MODEL_RANGE_BYTES);fail=false;
 const result=new Uint8Array(await downloadModel(url,size,cache,fetcher,p=>progress.push(p),n=>received+=n).arrayBuffer());
 assert.equal(result.length,size);assert.equal(result[0],1);assert.equal(result.at(-1),2);assert.equal(calls.length,5);assert.equal(received,size);assert.equal(progress.at(-1).loaded,size);assert.equal(progress.at(-1).total,size);
});
it('rejects servers that ignore ranges, malformed ranges and incomplete model sections',async()=>{
 for(const response of [()=>new Response(new Uint8Array(16)),()=>new Response(new Uint8Array(16),{status:206,headers:{'content-range':'bytes 1-16/16'}}),()=>new Response(new Uint8Array(8),{status:206,headers:{'content-range':'bytes 0-15/16'}})]){
  const cache=storage();await assert.rejects(downloadModel(url,16,cache,async()=>response(),()=>{},()=>{}).arrayBuffer(),/section/);assert.equal(cache.parts.size,0);
 }
});
it('refetches an incomplete cached part instead of passing corrupt bytes to inference',async()=>{
 const cache=storage();cache.parts.set(modelPartKey(url,0),new Response(new Uint8Array(2)));let calls=0;
 const result=await downloadModel(url,16,cache,async()=>{calls++;return rangeResponse(0,15,16)},()=>{},()=>{}).arrayBuffer();assert.equal(result.byteLength,16);assert.equal(calls,1);
});
it('cleans temporary model ranges only after the completed asset has been stored',async()=>{
 const keys=[];await clearModelParts(url,MODEL_RANGE_BYTES+1,async key=>keys.push(key));assert.deepEqual(keys,[modelPartKey(url,0),modelPartKey(url,MODEL_RANGE_BYTES)]);
});
it('does not time out a slow range while real bytes keep arriving',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let body,signal;
 const response=new Response(new ReadableStream({start(controller){body=controller}}),{status:206,headers:{'content-range':'bytes 0-15/16'}});
 const pending=downloadModel(url,16,storage(),async(_url,options)=>{signal=options.signal;return response},()=>{},()=>{}).arrayBuffer();
 await setImmediate();t.mock.timers.tick(179999);body.enqueue(new Uint8Array(8));await setImmediate();
 t.mock.timers.tick(179999);assert.equal(signal.aborted,false);body.enqueue(new Uint8Array(8));body.close();assert.equal((await pending).byteLength,16);
});
