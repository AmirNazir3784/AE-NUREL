import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {it} from 'node:test';
import {parseSrt} from '../src/lib/srt.ts';
import {parseVtt,openSubtitle} from '../src/lib/subtitle-editor.ts';
import {convertSrtDocument} from '../src/lib/srt-to-vtt.ts';
import {convertVttToSrt} from '../src/lib/vtt-to-srt.ts';
import {blogPosts} from '../src/content/blog/registry.ts';

const folder=new URL('../public/blog/srt-vs-vtt-subtitle-formats/',import.meta.url);
it('the downloadable original examples contain identical words and exact millisecond timings',async()=>{
  const srt=await readFile(new URL('sample.srt',folder),'utf8');
  const vtt=await readFile(new URL('sample.vtt',folder),'utf8');
  const values=cue=>({start:cue.start,end:cue.end,text:cue.text});
  const expected=[{start:1250,end:3750,text:'Keep the original subtitle file.'},{start:4000,end:6500,text:'Check the exported captions.'}];
  assert.deepEqual(parseSrt(srt).cues.map(values),expected);
  assert.deepEqual(parseVtt(vtt).cues.map(values),expected);
  const bytes=new TextEncoder().encode(srt);
  const converted=convertSrtDocument(openSubtitle({name:'sample.srt',size:bytes.length},bytes.buffer));
  assert.deepEqual(parseVtt(converted.content).cues.map(values),expected);
  assert.deepEqual(parseSrt(convertVttToSrt(vtt).content).cues.map(values),expected);
});
it('the worked conversion-loss example drops positioning and issues a warning',()=>{
  const result=convertVttToSrt('WEBVTT\n\n00:00:01.250 --> 00:00:03.750 line:10%\nKeep the original subtitle file.\n');
  assert.ok(result.warnings.length);
  assert.doesNotMatch(result.content,/line:10%/);
  assert.equal(parseSrt(result.content).cues[0].start,1250);
});
it('all registered article anchors and real download paths exist',async()=>{
  const source=await readFile(new URL('../src/content/blog/srt-vs-vtt-subtitle-formats.tsx',import.meta.url),'utf8');
  const post=blogPosts.find(p=>p.id==='subtitle-formats-guide');
  for(const section of post.sections)assert.ok(source.includes(`id="${section.id}"`),section.id);
  for(const filename of ['sample.srt','sample.vtt'])assert.ok(source.includes(`/blog/${post.slug}/${filename}`));
  assert.doesNotMatch(source,/browser-based|on-device|on your (?:device|computer)/i);
});
