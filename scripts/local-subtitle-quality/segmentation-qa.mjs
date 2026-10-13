// Replay saved real M2M100 output: typography/timing only, no model or network.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {localizeUnit,semanticUnits} from '../../src/features/local-asr/semantic-localization.ts';
import {emptyEditor,parseVtt} from '../../src/lib/subtitle-editor.ts';
import {parseSrt} from '../../src/lib/srt.ts';
import {captionExport} from '../../src/features/local-asr/asr-core.ts';
const stage=process.argv[2];
assert.ok(['before','after'].includes(stage));
const directory='artifacts/subtitle-workspace-finishing';
await fs.mkdir(directory,{recursive:true});
const results=JSON.parse(await fs.readFile('artifacts/local-subtitle-quality/integrity-repair.json','utf8'));
const fixture=parseSrt(await fs.readFile('tests/fixtures/localization/experiment.en.srt','utf8')).cues;
const cases=[{id:'experiment-ur',source:'en',cues:fixture},...JSON.parse(await fs.readFile('scripts/local-subtitle-quality/cases.json','utf8')).map(test=>({...test,cues:test.parts.map((text,index)=>({text,start:index*3000,end:(index+1)*3000}))}))];
const report=[];
for(const result of results){
 const test=cases.find(test=>test.id===result.id);
 assert.ok(test,'Missing original source fixture.');
 const source={...emptyEditor(),filename:test.id+'.srt',cues:test.cues.map((cue,index)=>({...cue,id:String(index+1),identifier:'',srtSettings:'',vttSettings:''}))};
 const originalUnits=semanticUnits(source,test.source);
 assert.equal(originalUnits.length,result.units.length);
 const units=result.units.map(unit=>{
  const original=originalUnits.find(original=>original.id===unit.id);
  assert.ok(original);
  assert.deepEqual([original.text,original.start,original.end],[unit.source,unit.start,unit.end]);
  const output=localizeUnit(original,unit.raw,result.target);
  assert.equal(output.cues.map(cue=>cue.text).join('').replace(/\s/gu,''),unit.raw.normalize('NFC').replace(/\s/gu,''));
  assert.ok(output.cues.every(cue=>cue.start>=unit.start&&cue.end<=unit.end));
  return {id:unit.id,raw:unit.raw,start:unit.start,end:unit.end,cues:output.cues,review:output.fast};
 });
 const document={...emptyEditor(),filename:result.id+'.srt',cues:units.flatMap(unit=>unit.cues)};
 for(const format of ['srt','vtt']){
  const content=captionExport(document,format).content;
  await fs.writeFile(`${directory}/${stage}-${result.id}.${format}`,content);
  const actual=await fs.readFile(`${directory}/${stage}-${result.id}.${format}`,'utf8');
  const parsed=(format==='srt'?parseSrt:parseVtt)(actual);
  assert.deepEqual(parsed.cues.map(cue=>[cue.start,cue.end,cue.text]),document.cues.map(cue=>[cue.start,cue.end,cue.text]));
 }
 report.push({id:result.id,target:result.target,units});
}
await fs.writeFile(`${directory}/${stage}.json`,JSON.stringify(report,null,2));
console.log(`${stage}: replayed ${report.length} saved model results; read and validated ${report.length*2} actual SRT/VTT files.`);
if(stage==='after'&&process.argv[3]==='browser'){
 const srt=parseSrt(await fs.readFile(`${directory}/browser-accurate-ur.srt`,'utf8')).cues;
 const vtt=parseVtt(await fs.readFile(`${directory}/browser-accurate-ur.vtt`,'utf8')).cues;
 assert.deepEqual(srt.map(c=>[c.start,c.end,c.text]),vtt.map(c=>[c.start,c.end,c.text]));
 const envelopes=report.find(result=>result.id==='experiment-ur').units;
 assert.equal(srt.length,8);assert.equal(srt[0].start,500);assert.equal(srt[0].end,3000);assert.match(srt[0].text,/تجربہ/u);
 for(const [index,c]of srt.entries()){
  assert.ok(envelopes.some(unit=>c.start>=unit.start&&c.end<=unit.end));
  assert.ok(c.end>c.start&&(!index||c.start>=srt[index-1].end));
  assert.ok(c.text.split('\n').every(line=>/[\p{L}\p{N}]/u.test(line)&&line.trim()!=='گا؟'));
 }
 for(const unit of envelopes){const cues=srt.filter(c=>c.start>=unit.start&&c.end<=unit.end);assert.ok(cues.length);assert.equal(cues[0].start,unit.start);assert.equal(cues.at(-1).end,unit.end)}
 assert.ok(srt.some(c=>c.text.includes('تخلیق کاروں')));assert.ok(srt.some(c=>c.text.includes('اس نقطہ تک')));
 await fs.writeFile(`${directory}/browser-exports-verified.json`,JSON.stringify({formats:['srt','vtt'],captions:srt.length,envelopes:envelopes.map(unit=>[unit.start,unit.end]),matchedTextAndTiming:true,unbrokenCompound:true,semanticAcceptance:false},null,2));
 console.log('Browser: read actual downloaded Urdu SRT/VTT; 8 matching cues, all 5 sentence envelopes accounted for, opening retained and reported compounds attached.');
}
