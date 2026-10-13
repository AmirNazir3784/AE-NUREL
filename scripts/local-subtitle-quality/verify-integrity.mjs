// Read actual cached-inference exports and an optional browser SRT. No models,
// network, translation substitutions or semantic-pass claims are involved.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {parseSrt} from '../../src/lib/srt.ts';
import {parseVtt,emptyEditor} from '../../src/lib/subtitle-editor.ts';
import {semanticUnits} from '../../src/features/local-asr/semantic-localization.ts';
const directory='artifacts/local-subtitle-quality/';
const results=JSON.parse(await fs.readFile(directory+'integrity-repair.json','utf8'));
const summary=[];
function validate(cues,envelopes){
 assert.ok(cues.length);
 cues.forEach((cue,i)=>{
  assert.equal(cue.number,String(i+1));assert.ok(cue.start>=0&&cue.end>cue.start);
  if(i)assert.ok(cue.start>=cues[i-1].end);
  assert.ok(cue.text.trim()&&!cue.text.includes('\uFFFD'));
  assert.ok(envelopes.some(unit=>cue.start>=unit.start&&cue.end<=unit.end));
 });
 for(const unit of envelopes){
  const output=cues.filter(cue=>cue.start>=unit.start&&cue.end<=unit.end);
  assert.ok(output.length,'Missing source sentence interval');
  assert.equal(output[0].start,unit.start);assert.equal(output.at(-1).end,unit.end);
 }
}
for(const result of results){
 const srt=parseSrt(await fs.readFile(directory+'repair-'+result.id+'.srt','utf8')).cues;
 const vtt=parseVtt(await fs.readFile(directory+'repair-'+result.id+'.vtt','utf8')).cues;
 validate(srt,result.units);
 assert.deepEqual(srt.map(c=>[c.start,c.end,c.text]),vtt.map(c=>[c.start,c.end,c.text]));
 assert.deepEqual(result.coverage.map(entry=>entry.id),result.units.map(unit=>unit.id));
 assert.ok(result.coverage.every(entry=>entry.semanticVerified===false));
 summary.push({id:result.id,sentences:result.units.length,cues:srt.length,formats:'SRT/VTT',structuralCoverage:true,semanticAcceptance:'not certified'});
}
if(process.argv[2]){
 const file=process.argv[2],cues=parseSrt(await fs.readFile(file,'utf8')).cues;
 const source=parseSrt(await fs.readFile('tests/fixtures/localization/experiment.en.srt','utf8')).cues;
 const envelopes=semanticUnits({...emptyEditor(),cues:source.map((cue,i)=>({...cue,id:String(i+1)}))});
 validate(cues,envelopes);
 assert.equal(cues[0].start,500);assert.equal(cues[0].end,3000);
 assert.ok(cues.filter(c=>c.start>=3180&&c.end<=7600).length);
 assert.ok(cues.every(c=>c.text.split('\n').every(line=>line.trim()!=='گا؟')));
 summary.push({id:'browser-experiment-ur',file,sentences:envelopes.length,cues:cues.length,formats:'downloaded SRT only',structuralCoverage:true,semanticAcceptance:'not passed'});
}
await fs.writeFile(directory+'repair-verified-files.json',JSON.stringify(summary,null,2));
for(const result of summary)console.log(JSON.stringify(result));
