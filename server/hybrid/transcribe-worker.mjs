// Separate process: native inference never blocks the page-serving JS event loop.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectWav} from './wav.mjs';
import {mixIntoMono,isDigitalSilence} from '../../src/features/local-asr/asr-core.ts';
import {normalizeWordAlignment} from '../../src/features/local-asr/subtitle-timeline.ts';
import {cleanupDirectory} from './jobs.mjs';
const MODEL='onnx-community/whisper-small.en_timestamped',REVISION='8085393831131554ad978a4e438295a734d3d2c0';
let started=false,recordingDirectory;
// An interrupted development server must not leave a detached inference job.
process.once('disconnect',async()=>{try{if(recordingDirectory)await cleanupDirectory(recordingDirectory);}finally{process.exit(1);}});
process.on('message',async ({file,cache,rssMB})=>{
 if(started)return;started=true;recordingDirectory=path.dirname(file);
 const monitor=setInterval(()=>{const rss=process.memoryUsage().rss;process.send?.({type:'memory',rss},()=>{if(rss>rssMB*1024**2)process.exit(1);});},250);
 let model;
 try{
  const bytes=await fs.readFile(file),info=inspectWav(bytes),frames=info.bytes/info.align;
  const channels=Array.from({length:info.channels},(_,channel)=>Float32Array.from({length:frames},(_,i)=>bytes.readInt16LE(info.offset+i*info.align+channel*2)/32768));
  const samples=new Float32Array(Math.ceil(info.duration*16000));mixIntoMono(samples,channels,info.rate,0);
  if(isDigitalSilence(samples))throw Error('No speech in digital silence.');
  const {pipeline,env}=await import('@huggingface/transformers');
  env.allowLocalModels=false;env.useFSCache=false;env.useBrowserCache=false;env.useWasmCache=false;
  env.remoteHost='https://huggingface.co/';env.remotePathTemplate='{model}/resolve/'+REVISION+'/';env.useCustomCache=true;
  env.fetch=()=>{throw Error('Model assets must already exist in the configured pinned cache.');};
  env.customCache={async match(key){try{return new Response(await fs.readFile(path.join(cache,createHash('sha256').update(key).digest('hex')+'.bin')));}catch{return undefined;}},async put(){}};
  process.send?.({type:'stage',stage:'loading'});
  model=await pipeline('automatic-speech-recognition',MODEL,{revision:REVISION,device:'cpu',dtype:{encoder_model:'q8',decoder_model_merged:'q8'},session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
  process.send?.({type:'stage',stage:'transcribing'});
  const raw=await model(samples,{return_timestamps:'word',chunk_length_s:30,stride_length_s:5,do_sample:false});
  const words=normalizeWordAlignment(raw.chunks??[],info.duration).chunks;
  process.send?.({type:'stage',stage:'building'});
  await model.dispose();model=null;clearInterval(monitor);
  process.send?.({type:'result',words},()=>process.exit(0));
 }catch{clearInterval(monitor);await model?.dispose().catch(()=>{});process.send?.({type:'error'},()=>process.exit(1));}
});
