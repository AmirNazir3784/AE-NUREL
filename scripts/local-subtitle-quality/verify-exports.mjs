import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {parseSrt} from '../../src/lib/srt.ts';
import {parseVtt,emptyEditor} from '../../src/lib/subtitle-editor.ts';
import {semanticUnits} from '../../src/features/local-asr/semantic-localization.ts';
const prefixes=process.argv.slice(2);
let units;
if(prefixes[0]==='--source'){
 prefixes.shift();const source=prefixes.shift();
 if(!source)throw Error('Pass a source filename prefix after --source.');
 const cues=parseSrt(await fs.readFile(source+'.srt','utf8')).cues;
 units=semanticUnits({...emptyEditor(),cues:cues.map((cue,index)=>({...cue,id:String(index)}))});
}
if(!prefixes.length)throw Error('Pass one or more local filename prefixes, without .srt/.vtt; optionally --source source-prefix first.');
for(const prefix of prefixes){
 const srt=await fs.readFile(prefix+'.srt','utf8'),vtt=await fs.readFile(prefix+'.vtt','utf8');
 const cues=parseSrt(srt).cues,other=parseVtt(vtt).cues;
 assert.ok(cues.length);assert.match(vtt,/^WEBVTT\r?\n\r?\n/);assert.ok(!srt.includes('\uFFFD')&&!vtt.includes('\uFFFD'));
 assert.deepEqual(cues.map(c=>[c.start,c.end,c.text]),other.map(c=>[c.start,c.end,c.text]));
 cues.forEach((cue,index)=>{assert.equal(cue.number,String(index+1));assert.ok(cue.start>=0&&cue.end>cue.start);if(index)assert.ok(cue.start>=cues[index-1].end)});
 if(units){
  for(const cue of cues)assert.ok(units.some(unit=>cue.start>=unit.start&&cue.end<=unit.end),'Target cue exceeds its source thought envelope.');
  for(const unit of units){
   const contained=cues.filter(cue=>cue.start>=unit.start&&cue.end<=unit.end);
   assert.ok(contained.length,'A source thought has no target cues.');
   assert.equal(contained[0].start,unit.start);assert.equal(contained.at(-1).end,unit.end);
  }
 }
 console.log(JSON.stringify({prefix,cues:cues.length,first:cues[0].start,last:cues.at(-1).end,...(units?{sourceEnvelopes:'preserved'}:{})}));
}
