import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DEFAULT_GAZE, EYES, alignedAngle, anchorTensor, eyeGeometry, smoothAngle, validateGaze, vectorCorrection, warpEye, warpEyeDetail } from '../src/features/eye-contact/gaze-core.ts';
const require = createRequire(import.meta.url);
const { onnx } = require('../node_modules/onnxruntime-web/lib/onnxjs/ort-schema/protobuf/onnx.js');
describe('eye-contact correction safeguards', () => {
  const eye = [{x:.30,y:.40},{x:.32,y:.38},{x:.36,y:.38},{x:.38,y:.40},{x:.36,y:.42},{x:.32,y:.42}];
  it('preserves valid crop geometry and declines cropped, closed, tilted or tiny eyes', () => {
    const indices = [0,1,2,3,4,5];
    const geometry = eyeGeometry(eye,indices,1000,600); assert.ok(geometry); assert.equal(geometry.width,120); assert.equal(geometry.height,90);
    assert.equal(eyeGeometry(eye.map(p=>({...p,y:.4})),indices,1000,600),null);
    assert.equal(eyeGeometry(eye,indices,100,60),null);
    assert.equal(eyeGeometry(eye.map(p=>({...p,x:p.x-.3})),indices,1000,600),null);
    assert.equal(eyeGeometry(eye.map((p,i)=>({...p,y:i===3?.5:p.y})),indices,1000,600),null);
  });
  it('builds independent x/y landmark planes in model pixel coordinates', () => {
    const anchors=anchorTensor([{x:20,y:10}]); assert.equal(anchors[10*64+20],0); assert.equal(anchors[3072+10*64+20],0); assert.equal(anchors[0],-20); assert.equal(anchors[3072],-10);
  });
  it('normalizes moderate head roll without changing eye span or target direction',()=>{
    const theta=.2,cos=Math.cos(theta),sin=Math.sin(theta),cx=340,cy=240;
    const tilted=eye.map(p=>{const x=p.x*1000-cx,y=p.y*600-cy;return{x:(cx+x*cos-y*sin)/1000,y:(cy+x*sin+y*cos)/600}});
    const box=eyeGeometry(tilted,[0,1,2,3,4,5],1000,600);assert.ok(box);assert.ok(Math.abs(box.rotation-theta)<1e-8);assert.ok(Math.abs(box.span-80)<1e-8);
    const restored=alignedAngle(alignedAngle([10,5],theta),-theta);assert.ok(Math.abs(restored[0]-10)<1e-8&&Math.abs(restored[1]-5)<1e-8);
  });
  it('bounds automatic corrections and respects manual values and zero strength', () => {
    assert.deepEqual(vectorCorrection([0,0,1],{...DEFAULT_GAZE,automatic:false,vertical:10,horizontal:-6,strength:50}),[5,-3]);
    assert.ok(vectorCorrection([.2,.1,1],{...DEFAULT_GAZE,strength:0}).every(n=>n===0));
    assert.throws(()=>validateGaze({...DEFAULT_GAZE,strength:NaN})); assert.throws(()=>validateGaze({...DEFAULT_GAZE,vertical:26})); assert.throws(()=>validateGaze({...DEFAULT_GAZE,horizontal:31}));
  });
  it('composites BGR into RGBA with a transparent rim and rejects nonfinite model data', () => {
    const image=new Float32Array(9216); image.fill(1,6144); const flow=new Float32Array(6144), light=new Float32Array(6144); light.fill(1,0,3072);
    const pixels=warpEye(image,flow,light), center=(24*64+32)*4;
    assert.deepEqual(Array.from(pixels.slice(center,center+4)),[255,0,0,255]); assert.equal(pixels[3],0);
    flow[20]=NaN; assert.throws(()=>warpEye(image,flow,light)); assert.throws(()=>warpEye(new Float32Array(1),flow,light));
  });
  it('ships separate real left/right neural graphs with expected model inputs and no training optimizer', () => {
    const bytes=EYES.map(eye=>readFileSync(new URL(`../public/models/eye-contact/${eye.name}.onnx`,import.meta.url)));
    assert.notDeepEqual(bytes[0],bytes[1]);
    for(const data of bytes){const model=onnx.ModelProto.decode(data); assert.deepEqual(model.graph.input.map(n=>n.name),['image','anchors','angle']); assert.deepEqual(model.graph.output.map(n=>n.name),['flow','light']); assert.ok(model.graph.node.some(n=>n.opType==='Conv')); assert.ok(model.graph.initializer.every(n=>!n.name.includes('Adam')));}
  });
  it('retains original-resolution iris texture for zero relative flow and moves it in original pixels', () => {
    const width=256,height=192,source=Uint8ClampedArray.from({length:width*height*4},(_,i)=>i%4===3?255:(Math.floor(i/4)%width)%2?255:0),zero=new Float32Array(6144);
    const identity=warpEyeDetail(source,width,height,zero,zero),center=(96*width+128)*4;
    assert.deepEqual(Array.from(identity.slice(center,center+4)),Array.from(source.slice(center,center+4)));
    const motion=new Float32Array(6144);motion.fill(2/width,0,3072);
    const shifted=warpEyeDetail(source,width,height,motion,zero); assert.deepEqual(Array.from(shifted.slice(center,center+3)),Array.from(source.slice(center+4,center+7)));
    assert.equal(shifted[3],0);motion[2]=Infinity;assert.throws(()=>warpEyeDetail(source,width,height,motion,zero));
  });
  it('smooths consecutive angles but resets on seek, setting changes, jumps and repeat frames', () => {
    const box={x:100,y:100,span:80},first=smoothAngle([0,0],0,box,'a');
    const next=smoothAngle([10,10],1/30,box,'a',first);assert.ok(next.angle.every(n=>n>0&&n<10));
    assert.deepEqual(smoothAngle([10,10],0,box,'a',first).angle,[10,10]);
    assert.deepEqual(smoothAngle([10,10],2,box,'a',first).angle,[10,10]);
    assert.deepEqual(smoothAngle([10,10],1/30,box,'b',first).angle,[10,10]);
    assert.deepEqual(smoothAngle([10,10],1/30,{...box,x:500},'a',first).angle,[10,10]);
  });
  it('matches the upstream native-size sampling grid while retaining original pixel data',()=>{
    const rgba=Uint8ClampedArray.from({length:64*48*4},(_,i)=>i%4===3?255:(i*31)%256),bgr=new Float32Array(9216),flow=new Float32Array(6144),light=new Float32Array(6144);
    for(let i=0;i<3072;i++)for(let c=0;c<3;c++)bgr[c*3072+i]=rgba[i*4+2-c]/255;
    flow.fill(.02,0,3072);flow.fill(-.01,3072);light.fill(1,0,3072);
    const reference=warpEye(bgr,flow,light),detail=warpEyeDetail(rgba,64,48,flow);
    assert.ok(detail.every((value,i)=>Math.abs(value-reference[i])<=1));
  });
  it('redirects the learned camera-coordinate gaze toward the lens and rejects unusable vectors',()=>{
    const settings={...DEFAULT_GAZE,strength:100};
    assert.ok(vectorCorrection([.2,.1,1],settings).every(n=>n<0));
    assert.ok(vectorCorrection([-.2,-.1,1],settings).every(n=>n>0));
    assert.equal(vectorCorrection([0,0,-1],settings),null);assert.equal(vectorCorrection([NaN,0,1],settings),null);assert.equal(vectorCorrection([1,0,.1],settings),null);
    assert.deepEqual(vectorCorrection([0,0,1],{...settings,vertical:5,horizontal:-3}),[5,-3]);
  });
  it('keeps the unfinished route out of production and public sitemap discovery', () => {
    const route=readFileSync(new URL('../src/app/tools/ai-eye-contact/page.tsx',import.meta.url),'utf8');
    assert.match(route,/process\.env\.NODE_ENV !== "development"\) notFound\(\)/); assert.match(route,/index: false/);
    const registry=readFileSync(new URL('../src/lib/tools.ts',import.meta.url),'utf8'); assert.ok(!registry.includes('/tools/ai-eye-contact'));
  });
});
