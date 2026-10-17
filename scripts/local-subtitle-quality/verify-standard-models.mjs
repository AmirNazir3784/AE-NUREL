// Normal integration verification. Existing pinned models and public synthetic
// fixture only; all downloads/network fallback are deliberately disabled.
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {pipeline,env} from '@huggingface/transformers';
import {ACCURATE_ENGLISH_MODEL,ACCURATE_ENGLISH_REVISION,ACCURATE_MULTILINGUAL_MODEL,ACCURATE_MULTILINGUAL_REVISION} from '../../src/features/local-asr/subtitle-capabilities.ts';
import {TRANSLATION_MODEL,TRANSLATION_REVISION} from '../../src/features/local-asr/translation-core.ts';
import {generateLocalTranslation} from '../../src/features/local-asr/translation-generation.ts';
import {mixIntoMono,captionDocument,captionExport} from '../../src/features/local-asr/asr-core.ts';
import {normalizeWordAlignment} from '../../src/features/local-asr/subtitle-timeline.ts';
import {parseSrt} from '../../src/lib/srt.ts';
import {parseVtt} from '../../src/lib/subtitle-editor.ts';
const directory=path.resolve('artifacts/hybrid');await fs.mkdir(directory,{recursive:true});
const cacheRoot=path.resolve('artifacts/local-asr-qa/model-cache');
const cachePath=key=>path.join(cacheRoot,createHash('sha256').update(key).digest('hex')+'.bin');
const readJson=async file=>JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
const report={assets:[],asr:null,translation:[],networkDownloads:0};
for(const [model,revision,manifestFile,required] of [
 [ACCURATE_ENGLISH_MODEL,ACCURATE_ENGLISH_REVISION,'artifacts/local-subtitle-quality/onnx-community--whisper-small.en_timestamped.json',true],
 [ACCURATE_MULTILINGUAL_MODEL,ACCURATE_MULTILINGUAL_REVISION,'artifacts/local-subtitle-quality/onnx-community--whisper-small_timestamped.json',false],
 [TRANSLATION_MODEL,TRANSLATION_REVISION,'artifacts/hybrid/m2m-manifest.json',true],
]){
 const manifest=await readJson(manifestFile);assert.equal(manifest.sha,revision);
 for(const name of ['onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx']){
  const entry=manifest.siblings.find(item=>item.rfilename===name);assert.ok(entry?.lfs?.sha256);
  const file=cachePath(`https://huggingface.co/${model}/resolve/${revision}/${name}`);
  let size;try{size=(await fs.stat(file)).size;}catch{if(required)throw Error(`Pinned cache unavailable: ${model}/${name}`);report.assets.push({model,revision,name,availableInNativeCache:false});continue;}
  const hash=createHash('sha256');for await(const block of createReadStream(file))hash.update(block);
  const sha256=hash.digest('hex');assert.equal(size,entry.size);assert.equal(sha256,entry.lfs.sha256);
  report.assets.push({model,revision,name,size,sha256,upstreamLfsMatch:true});
 }
}
env.allowLocalModels=false;env.useFSCache=false;env.useBrowserCache=false;env.useWasmCache=false;
env.allowRemoteModels=true;env.remoteHost='https://huggingface.co/';env.useCustomCache=true;
env.fetch=()=>{throw Error('Cached-only verification: external request blocked.');};
env.customCache={async match(key){try{return new Response(await fs.readFile(cachePath(key)));}catch{return undefined;}},async put(){}};
const fixture='artifacts/local-subtitle-quality/editing-terminology.wav';
const bytes=await fs.readFile(fixture);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
let at=12,pcm,rate;
while(at+8<=bytes.length){const size=bytes.readUInt32LE(at+4),tag=bytes.toString('ascii',at,at+4);assert.ok(at+8+size<=bytes.length);
 if(tag==='fmt '){assert.equal(bytes.readUInt16LE(at+8),1);assert.equal(bytes.readUInt16LE(at+10),1);assert.equal(bytes.readUInt16LE(at+22),16);rate=bytes.readUInt32LE(at+12);}
 if(tag==='data')pcm=bytes.subarray(at+8,at+8+size);at+=8+size+size%2;
}
assert.ok(pcm?.length&&rate&&pcm.length/2/rate<=30);
const input=Float32Array.from({length:pcm.length/2},(_,i)=>pcm.readInt16LE(i*2)/32768),samples=new Float32Array(Math.ceil(input.length/rate*16000));mixIntoMono(samples,[input],rate,0);
env.remotePathTemplate='{model}/resolve/'+ACCURATE_ENGLISH_REVISION+'/';
let model=await pipeline('automatic-speech-recognition',ACCURATE_ENGLISH_MODEL,{revision:ACCURATE_ENGLISH_REVISION,device:'cpu',dtype:{encoder_model:'q8',decoder_model_merged:'q8'}});
try{
 const start=performance.now();const raw=await model(samples,{return_timestamps:'word',chunk_length_s:30,stride_length_s:5,do_sample:false});
 assert.ok(raw.text.trim());const normalized=normalizeWordAlignment(raw.chunks,samples.length/16000);
 const doc=captionDocument(normalized.chunks,samples.length/16000,'editing-terminology.wav',true);
 assert.ok(doc.cues.length);report.asr={model:ACCURATE_ENGLISH_MODEL,revision:ACCURATE_ENGLISH_REVISION,backend:'native CPU (not browser/Hostinger)',text:raw.text,words:normalized.chunks,inferenceMs:performance.now()-start,alignmentHeads:model.model.generation_config.alignment_heads};
 for(const format of ['srt','vtt']){const output=captionExport(doc,format);const parsed=format==='srt'?parseSrt(output.content):parseVtt(output.content);assert.equal(parsed.cues.length,doc.cues.length);await fs.writeFile(path.join(directory,'verified-small.'+format),output.content);}
}finally{await model.dispose();model=null;}
env.remotePathTemplate='{model}/resolve/'+TRANSLATION_REVISION+'/';
model=await pipeline('translation',TRANSLATION_MODEL,{revision:TRANSLATION_REVISION,device:'cpu',dtype:'q8'});
try{
 const cases=await readJson('scripts/local-subtitle-quality/cases.json');
 const selected=cases.filter(c=>['en/ur','de/es','ja/en','ar/fr','ur/en'].includes(c.source+'/'+c.target)).slice(0,6);
 assert.ok(selected.length>=4);
 for(const test of selected){const text=test.parts.join(' ').normalize('NFC'),start=performance.now();
  const upstream=(await model(text,{src_lang:test.source,tgt_lang:test.target,max_new_tokens:512,do_sample:false}))[0].translation_text.normalize('NFC').trim();
  const integrated=await generateLocalTranslation(model,text,test.source,test.target);
  report.translation.push({id:test.id,source:test.source,target:test.target,text,upstream,integrated,equal:upstream===integrated,ms:performance.now()-start});
  await fs.writeFile(path.join(directory,'model-verification.json'),JSON.stringify(report,null,2));
  assert.equal(integrated,upstream,'Wrapper changed ordinary upstream output: '+test.id);
 }
}finally{await model.dispose();}
report.memory=process.memoryUsage();await fs.writeFile(path.join(directory,'model-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({verifiedAssetFiles:report.assets.filter(a=>a.upstreamLfsMatch).length,asr:report.asr.text,translationCases:report.translation.length,allMatchUpstream:report.translation.every(t=>t.equal),networkDownloads:0}));
