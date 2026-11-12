import {it} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseSrt} from '../src/lib/srt.ts';
import {splitSrt} from '../src/lib/srt-split.ts';
import {srtSplitterGuide} from '../src/content/blog/drafts/srt-splitter-guide.ts';

const fixture=await fs.readFile(new URL('../public/blog/srt-splitter/walkthrough.srt',import.meta.url),'utf8');
const source=parseSrt(fixture);
it('reproduces the guide’s original, interval-reset and count-reset examples from its downloadable sample',()=>{
  assert.equal(source.cues.length,5);
  const result=timestamps=>splitSrt(source,'walkthrough.srt',{method:'time',value:'1',timestamps});
  const original=result('original'),interval=result('zero');
  const balanced=splitSrt(source,'walkthrough.srt',{method:'parts',value:'2',timestamps:'zero'});
  assert.deepEqual(original.parts.map(p=>p.cues.length),[3,2]);
  assert.deepEqual(original.parts[1].cues.map(c=>[c.start,c.end]),[[65000,68000],[85000,88000]]);
  assert.deepEqual(interval.parts[1].cues.map(c=>[c.start,c.end]),[[5000,8000],[25000,28000]]);
  assert.deepEqual(balanced.parts[1].cues.map(c=>[c.start,c.end]),[[0,3000],[20000,23000]]);
  assert.deepEqual(interval.parts[0].cues[2],{start:59000,end:62000,text:'This caption crosses the interval boundary.',settings:''});
  for(const output of [original,interval,balanced]){
    assert.equal(output.parts.flatMap(p=>p.cues).length,5);
    for(const part of output.parts)assert.match(part.content,/^1\r?\n/);
  }
});

it('keeps the rewritten guide linked to the actual tool and reusable sample',()=>{
  const text=JSON.stringify(srtSplitterGuide);
  assert.match(text,/\/tools\/srt-splitter/);
  assert.match(text,/\/blog\/srt-splitter\/walkthrough\.srt/);
  for(const label of ['Choose SRT file','Time interval','Split every','Keep original times','Reset times for each part','Download all parts (ZIP)','Download part 01'])assert.ok(text.includes(label),label);
  assert.doesNotMatch(text,/browser-based|on-device|on your computer/i);
});
