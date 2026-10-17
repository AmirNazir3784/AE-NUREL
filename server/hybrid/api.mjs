import {open,readFile} from 'node:fs/promises';
import path from 'node:path';
import {HybridJobs,cleanupDirectory} from './jobs.mjs';
import {configuration,authorize} from './config.mjs';
import {inspectWav,MAX_UPLOAD_BYTES,MAX_SECONDS} from './wav.mjs';

const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function receiveAudio(request,file){
 if(!request.body)throw Error('Choose a PCM WAV recording.');
 const declared=request.headers.get('content-length');if(declared&&(!/^\d+$/.test(declared)||Number(declared)>MAX_UPLOAD_BYTES))throw Error('Choose a file no larger than 8 MiB.');
 const reader=request.body.getReader(),handle=await open(file,'wx',0o600);let bytes=0,timedOut=false;
 const abort=()=>{void reader.cancel().catch(()=>{});};request.signal.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>{timedOut=true;abort();},15000);timer.unref?.();
 try{
  while(true){request.signal.throwIfAborted();const {done,value}=await reader.read();if(timedOut)throw Error('Upload timed out. Try a smaller file.');if(done)break;bytes+=value.byteLength;if(bytes>MAX_UPLOAD_BYTES)throw Error('Choose a file no larger than 8 MiB.');let offset=0;while(offset<value.length){const written=await handle.write(value.subarray(offset));if(!written.bytesWritten)throw Error('Temporary storage is unavailable.');offset+=written.bytesWritten;}}
  if(!bytes)throw Error('This file is empty.');
 }finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);await reader.cancel().catch(()=>{});await handle.close();}
}
export function createApi(manager=new HybridJobs(),environment=()=>process.env){
 function gate(request){const config=configuration(environment());if(!config)return {response:json({error:'Not found.'},404)};
  if(!manager.rate('requests',120))return {response:json({error:'Too many development requests. Wait a minute.'},429)};
  const auth=authorize(request,config);return auth.status?{response:json({error:auth.error},auth.status)}:{config,owner:auth.owner};
 }
 return {
  async capabilities(request){const access=gate(request);if(access.response)return access.response;return json({transcription:true,translation:false,video:false,languages:['en'],formats:['PCM WAV'],maxBytes:MAX_UPLOAD_BYTES,maxSeconds:MAX_SECONDS,concurrency:1,cacheReady:await manager.cacheReady(access.config.cache)});},
  async submit(request){
   const access=gate(request);if(access.response)return access.response;
   if(request.headers.get('x-upload-consent')!=='yes')return json({error:'Confirm that this recording may be uploaded to the development server.'},400);
   if(request.headers.get('x-spoken-language')!=='en'||!['same','en'].includes(request.headers.get('x-subtitle-language')??'same'))return json({error:'This server currently transcribes English only. Server translation is unavailable; no browser fallback was used.'},422);
   if(!/^(audio\/(?:wav|x-wav|wave)|application\/octet-stream)(?:;|$)/i.test(request.headers.get('content-type')??''))return json({error:'The development server currently accepts PCM WAV only.'},415);
   if(!await manager.cacheReady(access.config.cache))return json({error:'The configured pinned model cache is incomplete. Server processing is unavailable.'},503);
   let release;try{release=manager.reserve();}catch{return json({error:manager.cleanupBlocked?'Temporary storage needs operator attention.':'The CPU worker is busy. Try again after the current job.'},manager.cleanupBlocked?503:429);}
   if(!manager.rate('uploads',4)){release();return json({error:'Too many uploads. Wait a minute.'},429);}
   let directory,response;
   try{directory=await manager.prepare();const file=path.join(directory,'recording.wav');await receiveAudio(request,file);inspectWav(await readFile(file));const id=await manager.start(access.owner,directory,access.config);directory=null;response=json({id,stage:'loading'},202);}
   catch(error){response=json({error:error instanceof Error&&/PCM WAV|8 MiB|empty|timed out|memory/.test(error.message)?error.message:'The upload could not be processed. Check the audio and server configuration.'},400);}
   finally{if(directory)try{await cleanupDirectory(directory);}catch{manager.cleanupBlocked=true;response=json({error:'Temporary recording cleanup failed. Server processing needs operator attention.'},503);}release();}
   return response;
  },
  async status(request,id){const access=gate(request);if(access.response)return access.response;const job=manager.get(id,access.owner);return job?json(job):json({error:'Job not found or expired.'},404);},
  async cancel(request,id){const access=gate(request);if(access.response)return access.response;return manager.cancel(id,access.owner)?json({stage:manager.get(id,access.owner)?.stage??'removed'}):json({error:'Job not found or expired.'},404);},
 };
}
// One bounded coordinator per Node process, also across development HMR reloads.
const key=Symbol.for('aenural.hybrid.development.jobs.v1');
globalThis[key]??=new HybridJobs();
export const hybridApi=createApi(globalThis[key]);
