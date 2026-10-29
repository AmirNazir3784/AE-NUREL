import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ASPECTS, DEFAULT_CROP_SETTINGS as settings, fullCrop, presetCrop, moveCrop, resizeCrop, editCrop, cropOutput, croppedFilename } from '../src/features/video-cropper/crop-core.ts';

describe('precise video crop geometry', () => {
 const frame = { width:1920, height:1080 };
 const valid = (crop, source = frame) => {
  assert.ok(crop.x >= 0 && crop.y >= 0 && crop.x + crop.width <= source.width && crop.y + crop.height <= source.height);
  assert.equal(crop.width % 2, 0); assert.equal(crop.height % 2, 0);
  assert.ok(crop.width >= 2 && crop.height >= 2);
 };
 it('centers an exact, encodable portrait inside widescreen footage', () => {
  assert.deepEqual(presetCrop(frame,'9:16'),{x:663,y:12,width:594,height:1056});
  assert.deepEqual(fullCrop({width:641,height:361}),{x:0,y:0,width:640,height:360});
 });
 it('preserves the subject center where possible and clamps movement at each edge', () => {
  const crop = {x:10,y:20,width:200,height:200};
  assert.deepEqual(moveCrop(crop,frame,-99,2000),{...crop,x:0,y:880});
  const next = presetCrop(frame,'1:1',crop); valid(next); assert.equal(next.x,0); assert.equal(next.y,0);
  assert.equal(presetCrop(frame,'free',crop),crop);
 });
 it('keeps every locked resize inside bounds with the opposite corner anchored', () => {
  for(const aspect of Object.keys(ASPECTS).filter(key=>key!=='free')) for(const corner of ['nw','ne','sw','se']) {
   const crop=presetCrop(frame,aspect), resized=resizeCrop(crop,frame,aspect,corner,corner.includes('w')?-500:3000,corner.includes('n')?-500:2000);
   valid(resized); const [w,h]=ASPECTS[aspect]; assert.equal(resized.width*h,resized.height*w);
   assert.equal(corner.includes('w')?resized.x+resized.width:resized.x,corner.includes('w')?crop.x+crop.width:crop.x);
   assert.equal(corner.includes('n')?resized.y+resized.height:resized.y,corner.includes('n')?crop.y+crop.height:crop.y);
  }
 });
 it('does not cross the fixed corner and supports free, independent dimensions', () => {
  const crop={x:100,y:100,width:400,height:300};
  assert.deepEqual(resizeCrop(crop,frame,'free','nw',999,999),{x:498,y:398,width:2,height:2});
  assert.deepEqual(editCrop(crop,frame,'free','width',301),{...crop,width:300});
  assert.equal(editCrop(crop,frame,'free','x',9999).x,1520);
  assert.throws(()=>editCrop(crop,frame,'free','width',NaN));
 });
 it('numeric edits preserve exact ratios and prevent overflow', () => {
  const crop=presetCrop(frame,'9:16'); const next=editCrop(crop,frame,'9:16','width',400);
  valid(next); assert.equal(next.width*16,next.height*9); assert.equal(next.width,396);
 });
 it('caps the short edge without upscaling or losing preset ratios', () => {
  const crop=presetCrop(frame,'9:16'); assert.deepEqual(cropOutput(frame,crop,'9:16',settings),{width:594,height:1056});
  assert.deepEqual(cropOutput(frame,crop,'9:16',{...settings,resolution:'480'}),{width:468,height:832});
  assert.deepEqual(cropOutput(frame,crop,'9:16',{...settings,resolution:'1080'}),{width:594,height:1056});
 });
 it('rejects invalid geometry, settings and impossible exact presets', () => {
  for(const crop of [{x:-1,y:0,width:200,height:200},{x:0,y:0,width:201,height:200},{x:1900,y:0,width:200,height:200},{x:0,y:0,width:0,height:2}]) assert.throws(()=>cropOutput(frame,crop,'free',settings));
  assert.throws(()=>cropOutput(frame,fullCrop(frame),'9:16',settings));
  assert.throws(()=>cropOutput(frame,fullCrop(frame),'free',{...settings,format:'gif'}));
  assert.throws(()=>presetCrop({width:8,height:8},'9:16'));
 });
 it('names downloads safely and deterministically',()=>assert.equal(croppedFilename('my clip.MOV',{width:594,height:1056},'mp4'),'my-clip-cropped-594x1056.mp4'));
 it('stays bounded across varied frames, preset changes and edits',()=>{
  for(const source of [{width:1920,height:1080},{width:1080,height:1920},{width:641,height:361},{width:3840,height:2160}]) for(const aspect of Object.keys(ASPECTS)) {
   let crop=presetCrop(source,aspect); valid(crop,source);
   for(const value of [-1000,2,99,300,99999]) { crop=editCrop(crop,source,aspect,'width',value); valid(crop,source); crop=moveCrop(crop,source,value,value); valid(crop,source); cropOutput(source,crop,aspect,settings); }
  }
 });
});
