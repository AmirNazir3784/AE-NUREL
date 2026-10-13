// Public regression text only. Cached native CPU inference, not browser QA.
// No network fallback: this repair does not download additional models.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pipeline,env} from '@huggingface/transformers';
import {parseSrt} from '../../src/lib/srt.ts';
import {emptyEditor} from '../../src/lib/subtitle-editor.ts';
import {semanticUnits,localizedDocument} from '../../src/features/local-asr/semantic-localization.ts';
import {TRANSLATION_MODEL,TRANSLATION_REVISION} from '../../src/features/local-asr/translation-core.ts';
import {captionExport} from '../../src/features/local-asr/asr-core.ts';
import {generateLocalTranslation} from '../../src/features/local-asr/translation-generation.ts';
const phase=process.argv[2];
if(phase!=='repair')throw Error('Pass repair. Uses already cached M2M100 only. The pre-repair baseline is a historical artifact, not reproducible with the repaired algorithm.');
const directory=path.resolve('artifacts/local-subtitle-quality');
const cacheRoot=path.resolve('artifacts/local-asr-qa/model-cache');
env.allowLocalModels=false;env.useFSCache=false;env.useBrowserCache=false;env.useWasmCache=false;
env.remoteHost='https://huggingface.co/';env.remotePathTemplate='{model}/resolve/'+TRANSLATION_REVISION+'/';
env.fetch=()=>{throw Error('Cached-only benchmark: no network download permitted.');};
env.useCustomCache=true;env.customCache={
 async match(key){try{return new Response(await fs.readFile(path.join(cacheRoot,createHash('sha256').update(key).digest('hex')+'.bin')));}catch{return undefined;}},
 async put(){},
};
const p=await pipeline('translation',TRANSLATION_MODEL,{revision:TRANSLATION_REVISION,device:'cpu',dtype:'q8'});
const fixture=parseSrt(await fs.readFile('tests/fixtures/localization/experiment.en.srt','utf8')).cues;
const cases=[{id:'experiment-ur',source:'en',target:'ur',cues:fixture},...JSON.parse(await fs.readFile('scripts/local-subtitle-quality/cases.json','utf8')).map(test=>({...test,cues:test.parts.map((text,index)=>({text,start:index*3000,end:(index+1)*3000}))}))];
const results=[];
try{
 for(const test of cases){
  const document={...emptyEditor(),filename:test.id+'.srt',cues:test.cues.map((cue,index)=>({...cue,id:String(index+1),identifier:'',srtSettings:'',vttSettings:''}))};
  const units=semanticUnits(document,test.source),translations=[],outputs=[];
  for(const unit of units){
   const begin=performance.now();
   const raw=await generateLocalTranslation(p,unit.text,test.source,test.target);
   translations.push({id:unit.id,text:raw});outputs.push({id:unit.id,sourceCueIds:unit.cues.map(cue=>cue.id),source:unit.text,start:unit.start,end:unit.end,raw,ms:performance.now()-begin});
  }
  const localized=localizedDocument(document,units,translations,test.target);
  const result={id:test.id,source:test.source,target:test.target,units:outputs,coverage:localized.ledger,cues:localized.document.cues};results.push(result);
  for(const format of ['srt','vtt'])await fs.writeFile(path.join(directory,phase+'-'+test.id+'.'+format),captionExport(localized.document,format).content);
  await fs.writeFile(path.join(directory,'integrity-'+phase+'.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(result));
 }
}finally{await p.dispose();}
