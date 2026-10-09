import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { observeAsset } from '../src/features/local-asr/asset-progress.ts';
describe('real local-model asset byte progress',()=>{
 it('counts consumed bytes and preserves downloaded content and headers',async()=>{
  let count=0;const progress=[];
  const source=new ReadableStream({start(controller){controller.enqueue(new Uint8Array([1,2]));controller.enqueue(new Uint8Array([3,4,5]));controller.close();}});
  const response=observeAsset(new Response(source,{headers:{'content-length':'5','content-type':'application/octet-stream'}}),'model.onnx',value=>progress.push(value),bytes=>count+=bytes);
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[1,2,3,4,5]);
  assert.equal(count,5);assert.deepEqual(progress.map(p=>p.loaded),[2,5]);assert.ok(progress.every(p=>p.total===5));
  assert.equal(response.headers.get('content-type'),'application/octet-stream');
 });
 it('does not report a misleading denominator for compressed content',async()=>{
  const progress=[];const response=observeAsset(new Response('longer decoded body',{headers:{'content-length':'4','content-encoding':'gzip'}}),'config.json',p=>progress.push(p),()=>{});
  await response.text();assert.equal(progress.at(-1).total,undefined);
 });
 it('propagates stream failure and cancels the original reader',async()=>{
  const failed=new ReadableStream({pull(controller){controller.error(new Error('network interrupted'));}});
  await assert.rejects(observeAsset(new Response(failed),'asset',()=>{},()=>{}).arrayBuffer(),/network interrupted/);
  let cancelled;
  const source=new ReadableStream({cancel(reason){cancelled=reason;}});
  await observeAsset(new Response(source),'asset',()=>{},()=>{}).body.cancel('user cancelled');
  assert.equal(cancelled,'user cancelled');
 });
});
