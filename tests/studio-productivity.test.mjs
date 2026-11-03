import {it} from 'node:test';
import assert from 'node:assert/strict';
import {emptyEditor,replaceEditorText} from '../src/lib/subtitle-editor.ts';
import {captionReview,regroupStudioCaptions,adjustTimelineCue} from '../src/features/caption-studio/studio-productivity.ts';
import {buildStudioAlignment,currentStudioAlignment} from '../src/features/caption-studio/studio-alignment.ts';
const cue=(id,text,start,end)=>({id,text,start,end,srtSettings:'',vttSettings:'',identifier:''});
const doc=()=>({...emptyEditor(),cues:[cue('a','One two three four.',0,1800),cue('b','Next sentence.',2500,3400)]});
const words=[['One',0,.3],['two',.4,.7],['three',.8,1.1],['four.',1.2,1.8],['Next',2.5,2.8],['sentence.',2.9,3.4]].map(([text,start,end])=>({text,timestamp:[start,end]}));
it('regroups complete measured words without changing their text or timestamps',()=>{
 const source=doc(),before=structuredClone(source),alignment=buildStudioAlignment(source,words);let n=0;
 const result=regroupStudioCaptions(source,alignment,2,()=>`group-${++n}`);
 assert.deepEqual(result.document.cues.map(c=>c.text),['One two','three four.','Next sentence.']);
 assert.deepEqual(result.alignment.flatMap(c=>c.words.map(w=>[c.text.slice(w.from,w.to),w.start,w.end])),words.map(w=>[w.text,Math.round(w.timestamp[0]*1000),Math.round(w.timestamp[1]*1000)]));
 assert.deepEqual(source,before);
 assert.equal(currentStudioAlignment(source,[...alignment,...result.alignment]).length,2,'old alignment can be restored by Undo');
 assert.equal(currentStudioAlignment(result.document,[...alignment,...result.alignment]).length,3);
});
it('declines imported, edited, incomplete or overlapping alignment rather than inventing or losing words',()=>{
 const source=doc(),alignment=buildStudioAlignment(source,words);
 assert.throws(()=>regroupStudioCaptions(source,[],2,()=>''),/measured/);
 assert.throws(()=>regroupStudioCaptions({...source,cues:[{...source.cues[0],text:'Edited'},source.cues[1]]},alignment,2,()=>''),/measured/);
 assert.throws(()=>regroupStudioCaptions(source,[{...alignment[0],words:alignment[0].words.slice(0,1)},alignment[1]],2,()=>''),/incomplete/);
 assert.throws(()=>regroupStudioCaptions(source,[{...alignment[0],words:[]},alignment[1]],2,()=>''),/missing/);
 assert.throws(()=>regroupStudioCaptions(source,alignment,0,()=>''),/1 and 12/);
 const overlapping=structuredClone(alignment);overlapping[0].words[1].start=100;
 assert.throws(()=>regroupStudioCaptions(source,overlapping,2,()=>''),/overlap/);
});
it('reviews speed, long lines and overlaps without changing the document',()=>{
 const source={...emptyEditor(),cues:[cue('a','This caption contains a lot of text for a very brief interval.',0,200),cue('b','Hello',100,1000)]},before=structuredClone(source);
 const review=captionReview(source);assert.equal(review.length,2);assert.ok(review[0].messages.some(s=>s.includes('characters/sec')));assert.ok(review[0].messages.some(s=>s.includes('Long line')));assert.ok(review[0].messages.some(s=>s.includes('Overlaps')));assert.deepEqual(source,before);
});
it('clamps timeline moves without changing duration and resizes without negative or reversed timing',()=>{
 assert.deepEqual(adjustTimelineCue(100,500,-1000,'move',2000),{start:0,end:400});
 assert.deepEqual(adjustTimelineCue(100,500,2000,'move',2000),{start:1600,end:2000});
 assert.deepEqual(adjustTimelineCue(100,500,1000,'start',2000),{start:400,end:500});
 assert.deepEqual(adjustTimelineCue(100,500,-1000,'end',2000),{start:100,end:200});
 assert.deepEqual(adjustTimelineCue(100,150,1000,'start',2000),{start:100,end:150});
 assert.throws(()=>adjustTimelineCue(500,100,0,'move',2000));
});
it('bulk literal replacement preserves all timing, IDs and unaffected cue alignment',()=>{
 const source=doc(),alignment=buildStudioAlignment(source,words),next=replaceEditorText(source,'One','1',true);
 assert.equal(next.count,1);assert.deepEqual(next.document.cues.map(c=>[c.id,c.start,c.end]),source.cues.map(c=>[c.id,c.start,c.end]));assert.equal(currentStudioAlignment(next.document,alignment).length,1);assert.equal(currentStudioAlignment(source,alignment).length,2);
});
