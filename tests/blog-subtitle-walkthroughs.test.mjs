import {it} from 'node:test';
import assert from 'node:assert/strict';
import {parseSrt} from '../src/lib/srt.ts';
import {mergeSrt} from '../src/lib/srt-merge.ts';
import {convertSrtToTxt} from '../src/lib/srt-to-txt.ts';
import {openOverlapSubtitle,repairOverlaps} from '../src/lib/subtitle-overlap.ts';

it('the merger tutorial preserves the second chapter lead-in without counting it twice',()=>{
  const chapterA=parseSrt('1\n00:01:53,000 --> 00:01:56,000\nChapter A ends.\n');
  const chapterB=parseSrt('1\n00:00:02,000 --> 00:00:05,000\nChapter B begins.\n');
  const files=[{name:'chapter-a.srt',document:chapterA},{name:'chapter-b.srt',document:chapterB}];
  assert.equal(mergeSrt(files,4000).cues[1].start,122000);
  assert.equal(mergeSrt(files,0).cues[1].start,118000);
  assert.equal(mergeSrt(files,4000).cues[1].number,'2');
});
it('the transcript tutorial correctly distinguishes the actual line and single-paragraph exports',()=>{
  const srt='1\n00:00:01,000 --> 00:00:02,000\nWe tested the first version\n\n2\n00:00:02,000 --> 00:00:03,000\non Tuesday, then changed\n\n3\n00:00:03,000 --> 00:00:04,000\nthe export settings.\n';
  assert.equal(convertSrtToTxt(srt,'demo.srt','lines').content,'We tested the first version\non Tuesday, then changed\nthe export settings.\n');
  assert.equal(convertSrtToTxt(srt,'demo.srt','paragraph').content,'We tested the first version on Tuesday, then changed the export settings.\n');
});
it('both overlap examples reproduce the documented trade-off without changing dialogue',()=>{
  const bytes=new TextEncoder().encode('1\n00:00:10,000 --> 00:00:12,400\nFirst speaker.\n\n2\n00:00:12,100 --> 00:00:14,000\nSecond speaker.\n');
  const input=openOverlapSubtitle({name:'overlap.srt',size:bytes.length},bytes.buffer);
  const shortened=repairOverlaps(input,'shorten',100),moved=repairOverlaps(input,'move',100);
  assert.equal(shortened.document.cues[0].end,12000);
  assert.deepEqual(moved.document.cues.map(c=>[c.start,c.end]),[[10000,12400],[12500,14400]]);
  for(const result of [shortened,moved]){
    assert.equal(result.remaining.length,0);
    assert.deepEqual(result.document.cues.map(c=>c.text),['First speaker.','Second speaker.']);
  }
});
