import {it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openSubtitle,analyzeEditor,updateEditorCue,exportEditor} from '../src/lib/subtitle-editor.ts';
import {prepareSubtitleVideo} from '../src/lib/subtitle-video.ts';
import {fixSubtitleSync} from '../src/lib/subtitle-sync.ts';

const sample=readFileSync(new URL('../public/blog/caption-readability/walkthrough.srt',import.meta.url));
const open=()=>openSubtitle({name:'walkthrough.srt',size:sample.length},sample.buffer.slice(sample.byteOffset,sample.byteOffset+sample.byteLength));

it('the CPS walkthrough produces the stated labels without overlapping the next cue',()=>{
  const document=open(),first=document.cues[0];
  const original=analyzeEditor(document.cues)[0];
  assert.equal(original.cps,20);assert.equal(original.speed,'caution');
  const edited=updateEditorCue(document,first.id,'end','00:00:14,000');
  const revised=analyzeEditor(edited.cues)[0];
  assert.equal(revised.cps,15);assert.equal(revised.speed,'normal');
  assert.equal(edited.cues[0].text,first.text);
  assert.ok(edited.cues[0].end<edited.cues[1].start);
});

it('the line-break walkthrough preserves the dialogue and both cue boundaries in its exported file',()=>{
  const document=open(),cue=document.cues[1];
  const revised='We spoke to Dr. Maya Chen\nafter the recording.';
  const edited=updateEditorCue(document,cue.id,'text',revised);
  assert.equal(edited.cues[1].text.replace(/\s+/g,' '),cue.text.replace(/\s+/g,' '));
  assert.equal(edited.cues[1].start,15000);assert.equal(edited.cues[1].end,20000);
  assert.match(exportEditor(edited,'srt'),/00:00:15,000 --> 00:00:20,000\nWe spoke to Dr\. Maya Chen\nafter the recording\./);
});

it('the SRT-to-MP4 article sample has the stated opening gap and 6.5-second timeline',()=>{
  const source=readFileSync(new URL('../public/blog/srt-vs-vtt-subtitle-formats/sample.srt',import.meta.url),'utf8');
  const plan=prepareSubtitleVideo(source);
  assert.equal(plan.cues[0].start,1250);assert.equal(plan.durationMs,6500);
  assert.ok(plan.warnings.some(warning=>warning.includes('silent')));
});

it('the frame-rate guide maps a known constant speed change at an independent middle cue',()=>{
  const document=open();
  document.cues=[{...document.cues[0],start:50000,end:52000}];
  const result=fixSubtitleSync(document,{sourceFirst:10000,targetFirst:9600,sourceSecond:100000,targetSecond:96000});
  assert.equal(result.document.cues[0].start,48000);
  assert.equal(result.document.cues[0].end,49920);
  assert.equal(result.document.cues[0].text,document.cues[0].text);
});
