import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseEditTime, formatEditTime, addClaim, updateClaim, removeClaim, buildTimeline, outputToSource, sourceToOutput, newHistory, applyEdit, undoEdit, redoEdit} from '../src/features/copyright-claim-fixer/timeline.ts';
const base = {duration: 100, claims: []};
const mute = (id,start,end) => ({id,start,end,kind:'audio',repair:{mode:'mute'}});
test('parses time safely, accepts hours and rejects impossible clock fields',()=>{
  assert.equal(parseEditTime('01:12'),72);assert.equal(parseEditTime('1:02:03.450'),3723.45);assert.equal(parseEditTime('12.125'),12.125);
  assert.equal(formatEditTime(3723.45),'1:02:03.450');
  for(const bad of ['-1','abc','01:75','1:60:01','1:2:3:4','2.3456',''])assert.throws(()=>parseEditTime(bad));
});
test('multiple claims preserve source-relative positions after cut',()=>{
  let p=addClaim(base,{id:'cut',start:12,end:28,kind:'both',repair:{mode:'remove'}});
  p=addClaim(p,mute('mute',50,60));const t=buildTimeline(p);
  assert.equal(t.duration,84);assert.equal(outputToSource(t,12).time,28);assert.equal(outputToSource(t,34).time,50);
  assert.equal(sourceToOutput(t,22),null);assert.equal(sourceToOutput(t,51),35);
  assert.equal(t.slices[2].repair.mode,'mute');
});
test('adjacent claims valid; overlapping, duplicate, invalid volume blocked',()=>{
  const p=addClaim(base,mute('a',10,20));assert.equal(addClaim(p,mute('b',20,30)).claims.length,2);
  assert.throws(()=>addClaim(p,mute('b',19.99,30)),/overlap/i);
  assert.throws(()=>addClaim(p,mute('a',40,50)),/Duplicate/);
  assert.throws(()=>addClaim(base,{...mute('q',0,5),repair:{mode:'lower-volume',volume:2}}),/volume/i);
  assert.throws(()=>addClaim(base,mute('a',2,102)),/inside/);
});
test('replace source slice duration maps output independently',()=>{
  const p=addClaim(base,{id:'replace',start:12,end:28,kind:'video',repair:{mode:'replace-video',assetId:'owned-video',replacementDuration:7}});
  const t=buildTimeline(p);assert.equal(t.duration,91);assert.equal(outputToSource(t,13).source,'replacement');assert.equal(outputToSource(t,13).time,1);
  assert.equal(outputToSource(t,19).time,28);assert.equal(sourceToOutput(t,20),null);
});
test('edit update remove undo and redo keep immutable history',()=>{
  let h=newHistory(100);h=applyEdit(h,addClaim(h.present,mute('one',10,20)));
  h=applyEdit(h,updateClaim(h.present,mute('one',10,25)));assert.equal(h.present.claims[0].end,25);
  h=undoEdit(h);assert.equal(h.present.claims[0].end,20);h=redoEdit(h);assert.equal(h.present.claims[0].end,25);
  h=applyEdit(h,removeClaim(h.present,'one'));assert.equal(h.present.claims.length,0);assert.equal(h.future.length,0);
});
test('protect all-deleted, no misleading playable output',()=>{
  const p=addClaim(base,{id:'delete',start:0,end:100,kind:'video',repair:{mode:'remove'}});
  assert.throws(()=>buildTimeline(p),/entire video/i);
});
