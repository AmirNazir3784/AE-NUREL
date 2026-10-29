import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_KEY, keyPixels, detectScreen, rgb, hex, outputSize, imagePlacement, validateKey } from '../src/features/green-screen-remover/key-core.ts';
import { validateCompressionMedia } from '../src/features/video-compressor/compression-core.ts';
const pixel = (r,g,b,a=255) => new Uint8ClampedArray([r,g,b,a]);
describe('green screen keying and output geometry',()=>{
 it('removes the chosen screen and its shaded equivalents, preserving contrasting subjects',()=>{
  const green={...DEFAULT_KEY,color:'#00ff00'};
  for(const shade of [40,100,180,255]) assert.equal(keyPixels(pixel(0,shade,0),green)[3],0);
  for(const color of [[255,0,0],[0,0,255],[210,130,100],[255,255,255],[0,0,0]]) assert.equal(keyPixels(pixel(...color),green)[3],255);
 });
 it('supports a blue or custom screen without removing unrelated colors',()=>{
  assert.equal(keyPixels(pixel(0,0,200),{...DEFAULT_KEY,color:'#0000ff'})[3],0);
  assert.equal(keyPixels(pixel(0,255,0),{...DEFAULT_KEY,color:'#0000ff'})[3],255);
  assert.equal(keyPixels(pixel(200,0,0),{...DEFAULT_KEY,color:'#ff0000'})[3],0);
 });
 it('creates soft partial alpha at the boundary and preserves input alpha',()=>{
  const key={...DEFAULT_KEY,color:'#00ff00',strength:20,softness:60,spill:0};
  const edge=keyPixels(pixel(20,180,20),key); assert.ok(edge[3]>0&&edge[3]<255);
  assert.equal(keyPixels(pixel(255,0,0,100),key)[3],100);
 });
 it('matte values describe transparency and are opaque grayscale',()=>{
  const key={...DEFAULT_KEY,color:'#00ff00'};
  assert.deepEqual(Array.from(keyPixels(pixel(0,255,0),key,true)),[0,0,0,255]);
  assert.deepEqual(Array.from(keyPixels(pixel(255,0,0),key,true)),[255,255,255,255]);
 });
 it('suppresses green spill without altering alpha, other channels or distant colors',()=>{
  const key={...DEFAULT_KEY,color:'#00ff00',strength:10,softness:20};
  const plain=keyPixels(pixel(40,180,40),{...key,spill:0}), clean=keyPixels(pixel(40,180,40),{...key,spill:100});
  assert.ok(clean[1]<plain[1]); assert.equal(clean[0],plain[0]); assert.equal(clean[2],plain[2]); assert.equal(clean[3],plain[3]);
  assert.deepEqual(Array.from(keyPixels(pixel(0,0,255),key)),[0,0,255,255]);
 });
 it('auto-detects green/blue from edge samples and declines an ambiguous scene',()=>{
  assert.equal(detectScreen([[0,200,80],[0,180,70],[0,220,90],[255,100,0]]),'#00c850');
  assert.equal(detectScreen([[0,30,200],[0,30,200],[200,100,0]]),'#001ec8');
  assert.equal(detectScreen([[0,255,0],[200,100,20],[100,100,100]]),null);
 });
 it('caps both landscape and portrait output, never upscales, and uses even dimensions',()=>{
  assert.deepEqual(outputSize({width:3840,height:2160},'1080'),{width:1920,height:1080});
  assert.deepEqual(outputSize({width:3840,height:2160},'original'),{width:3840,height:2160});
  assert.deepEqual(outputSize({width:3840,height:2160},'2160'),{width:3840,height:2160});
  assert.deepEqual(outputSize({width:2160,height:3840},'original'),{width:2160,height:3840});
  assert.deepEqual(outputSize({width:4096,height:2160},'original'),{width:4096,height:2160});
  assert.deepEqual(outputSize({width:2160,height:3840},'720'),{width:720,height:1280});
  assert.deepEqual(outputSize({width:640,height:360},'1080'),{width:640,height:360});
  assert.deepEqual(outputSize({width:3840,height:1000},'720'),{width:1280,height:332});
 });
 it('accepts UHD and DCI 4K in both orientations through the shared inspector contract, rejecting 8K',()=>{
  const metadata={duration:3,videoBitrate:8_000_000,audioBitrate:0,frameRate:24,audioTracks:0,videoCodec:'avc',audioCodec:null};
  for(const [width,height] of [[3840,2160],[2160,3840],[4096,2160],[2160,4096]]) assert.doesNotThrow(()=>validateCompressionMedia({...metadata,width,height}));
  assert.throws(()=>validateCompressionMedia({...metadata,width:7680,height:4320}));
 });
 it('computes centered cover/contain placements without stretching backgrounds',()=>{
  assert.deepEqual(imagePlacement({width:200,height:200},{width:640,height:360},'contain'),{x:140,y:0,width:360,height:360});
  assert.deepEqual(imagePlacement({width:200,height:200},{width:640,height:360},'cover'),{x:0,y:-140,width:640,height:640});
 });
 it('validates colors and settings instead of silently accepting malformed controls',()=>{
  assert.deepEqual(rgb('#00c853'),[0,200,83]); assert.equal(hex([0,200,83]),'#00c853');
  for(const color of ['red','#123','#zzzzzz','']) assert.throws(()=>rgb(color));
  for(const strength of [-1,101,NaN,Infinity]) assert.throws(()=>validateKey({...DEFAULT_KEY,strength}));
  assert.throws(()=>outputSize({width:0,height:1080},'720')); assert.throws(()=>outputSize({width:1920,height:1080},'fake'));
 });
});
