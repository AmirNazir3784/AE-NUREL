import {it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fitImage,imageHeader,imageSize,imageFilename,validateImageDimensions} from '../src/features/image-compressor/image-core.ts';
it('reads the real PNG header, bounds pixels and rejects fake or animated input',()=>{
 const b=new Uint8Array(45),v=new DataView(b.buffer);b.set([137,80,78,71,13,10,26,10]);v.setUint32(8,13);b.set([73,72,68,82],12);v.setUint32(16,1920);v.setUint32(20,1080);v.setUint32(33,0);b.set([73,69,78,68],37);
 assert.deepEqual(imageHeader(b.buffer),{width:1920,height:1080});b.set([97,99,84,76],37);assert.throws(()=>imageHeader(b.buffer),/Animated/);
 assert.throws(()=>imageHeader(new ArrayBuffer(20)));assert.throws(()=>validateImageDimensions(16000,16000));assert.throws(()=>validateImageDimensions(NaN,1));
});
it('reads static and rejects animated extended WebP before decoding',()=>{
 const b=new Uint8Array(30),v=new DataView(b.buffer);b.set(Buffer.from('RIFF'),0);b.set(Buffer.from('WEBPVP8X'),8);v.setUint32(16,10,true);b[24]=99;b[27]=49;
 assert.deepEqual(imageHeader(b.buffer),{width:100,height:50});b[20]=2;assert.throws(()=>imageHeader(b.buffer),/Animated/);
});
it('retains aspect ratio without upscaling and produces honest output extensions',()=>{
 assert.deepEqual(imageSize(2000,1000,500),{width:500,height:250});assert.deepEqual(imageSize(100,200,500),{width:100,height:200});assert.throws(()=>imageSize(100,100,0));assert.equal(imageFilename('logo.png','jpeg'),'logo-compressed.jpg');assert.equal(imageFilename('logo.png','webp'),'logo-compressed.webp');
});
it('searches for a measured under-budget quality and refuses oversized fixed dimensions',async()=>{
 const signal=new AbortController().signal,encode=async(w,h,q)=>new Blob([new Uint8Array(Math.ceil(w*h*q))]);
 const r=await fitImage(encode,200,100,10000,false,signal,()=>{});assert.ok(r.blob.size<=10000&&r.blob.size>9700);assert.equal(r.width,200);
 await assert.rejects(fitImage(encode,1000,1000,1000,false,signal,()=>{}),/cannot fit/);
 const resized=await fitImage(encode,1000,500,2000,true,signal,()=>{});assert.ok(resized.width<1000&&resized.blob.size<=2000);assert.ok(Math.abs(resized.width/resized.height-2)<.02);
});
it('stops canceled searches and rejects invalid budgets',async()=>{
 const controller=new AbortController();controller.abort();await assert.rejects(fitImage(async()=>new Blob(),100,100,20000,true,controller.signal,()=>{}),{name:'AbortError'});
 await assert.rejects(fitImage(async()=>new Blob(),100,100,NaN,true,new AbortController().signal,()=>{}),/budget/);
});
it('holds new compression previews out of production until review',()=>{
 for(const route of ['compress-mp4','reduce-video-file-size','compress-video-for-whatsapp','mov-compressor','compress-image-to-20kb']){const page=readFileSync(new URL('../src/app/tools/'+route+'/page.tsx',import.meta.url),'utf8');assert.match(page,/notFound\(\)/);assert.match(page,/index:\s*false/);}
});
