import {fork} from 'node:child_process';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {inspectWav} from './wav.mjs';

const MODEL='onnx-community/whisper-small.en_timestamped',REVISION='8085393831131554ad978a4e438295a734d3d2c0';
export async function cleanupDirectory(directory){const resolved=path.resolve(directory);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('aenural-hybrid-'))throw Error('Unsafe temporary cleanup path.');await rm(resolved,{recursive:true,force:true,maxRetries:3,retryDelay:100});}
export class HybridJobs {
 constructor({spawn=fork,now=Date.now}={}){this.spawn=spawn;this.now=now;this.jobs=new Map();this.reserved=false;this.buckets=new Map();this.cleanupBlocked=false;}
 rate(key,limit=120){
  const now=this.now();for(const [id,b] of this.buckets)if(now-b.start>60000)this.buckets.delete(id);
  const bucket=this.buckets.get(key)??{start:now,count:0};bucket.count++;this.buckets.set(key,bucket);return bucket.count<=limit;
 }
 sweep(){for(const [id,job] of this.jobs)if(job.finished&&this.now()-job.finished>10*60000)this.jobs.delete(id);}
 reserve(){this.sweep();if(this.cleanupBlocked)throw Error('Temporary storage cleanup needs operator attention.');if(this.reserved||[...this.jobs.values()].some(j=>!j.finished))throw Error('The CPU worker is busy. Try again when the current job finishes.');this.reserved=true;return ()=>{this.reserved=false;};}
 async cacheReady(cache){for(const [name,size] of [['encoder_model_quantized.onnx',92240508],['decoder_model_merged_quantized.onnx',156794981]]){const key=`https://huggingface.co/${MODEL}/resolve/${REVISION}/onnx/${name}`;try{if((await stat(path.join(cache,createHash('sha256').update(key).digest('hex')+'.bin'))).size!==size)return false;}catch{return false;}}return true;}
 async prepare(){return mkdtemp(path.join(os.tmpdir(),'aenural-hybrid-'));}
 async start(owner,directory,config){
  const file=path.join(directory,'recording.wav'),info=inspectWav(await readFile(file));
  const available=typeof process.availableMemory==='function'?process.availableMemory():os.freemem();
  if(available<config.rssMB*1024**2+256*1024**2)throw Error('Not enough available server memory for the configured CPU job budget.');
  while(this.jobs.size>=4){const old=[...this.jobs].find(([,j])=>j.finished);if(!old)throw Error('Job capacity is unavailable.');this.jobs.delete(old[0]);}
  const id=randomUUID(),job={id,owner,stage:'loading',duration:info.duration,created:this.now(),directory,child:null,result:null,error:null,finished:0};
  this.jobs.set(id,job);
  let child;
  try{child=this.spawn(path.resolve('server/hybrid/transcribe-worker.mjs'),[],{execArgv:['--max-old-space-size=768'],stdio:['ignore','ignore','ignore','ipc'],env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,NODE_ENV:'development'}});}catch{this.jobs.delete(id);throw Error('The isolated CPU worker could not start.');}
  job.child=child;let pendingResult=null,peakRss=0;
  const stop=reason=>{if(!job.child)return;job.error=reason;job.stage='stopping';child.kill('SIGKILL');};
  const timer=setTimeout(()=>stop('This CPU job timed out. Retry a shorter recording.'),config.timeoutMs);timer.unref?.();
  child.on('message',message=>{
   if(!message||typeof message!=='object')return;
   if(message.type==='memory'&&Number.isFinite(message.rss)){peakRss=Math.max(peakRss,message.rss);if(message.rss>config.rssMB*1024**2)stop('This job exceeded the configured server memory budget.');}
   if(message.type==='stage'&&['loading','transcribing','building'].includes(message.stage)&&job.stage!=='stopping')job.stage=message.stage;
   if(message.type==='error')stop('The local CPU model could not complete this job. Verify the pinned cache and runtime, or retry shorter audio.');
   if(message.type==='result'){
    const words=message.words;let previous=0;
    if(!Array.isArray(words)||!words.length||words.length>3000){stop('The CPU model returned no usable timed speech.');return;}
    for(const word of words){const [start,end]=word?.timestamp??[];if(typeof word?.text!=='string'||!word.text.trim()||word.text.length>4096||!Number.isFinite(start)||!Number.isFinite(end)||start<previous||end<=start||end>info.duration+.001){stop('The CPU model returned invalid word timing.');return;}previous=end;}
    if(Buffer.byteLength(JSON.stringify(words),'utf8')>256000){stop('The transcript exceeded its bounded result size.');return;}
    pendingResult={words,duration:info.duration,language:'en',model:MODEL,revision:REVISION};job.stage='building';
   }
  });
  const finish=async code=>{clearTimeout(timer);job.child=null;try{await cleanupDirectory(directory);job.directory=null;}catch{this.cleanupBlocked=true;job.error='Temporary recording cleanup failed. Server processing is stopped until the operator resolves it.';}job.finished=this.now();if(code===0&&pendingResult&&!job.error){job.result={...pendingResult,peakRssBytes:peakRss};job.stage='complete';}else{job.stage=job.error==='Cancelled.'?'cancelled':'failed';job.error??='The CPU worker stopped before producing valid captions.';}setTimeout(()=>this.sweep(),10*60000+1).unref?.();};
  child.once('close',finish);child.once('error',()=>stop('The isolated CPU worker could not run.'));
  try{child.send({file,cache:config.cache,rssMB:config.rssMB});}catch{stop('The isolated CPU worker could not receive this job.');}
  return id;
 }
 get(id,owner){this.sweep();const job=this.jobs.get(id);if(!job||job.owner!==owner)return null;return {id:job.id,stage:job.stage,error:job.error,...(job.result?{result:job.result}:{})};}
 cancel(id,owner){const job=this.jobs.get(id);if(!job||job.owner!==owner)return false;if(!job.finished){job.error='Cancelled.';job.stage='stopping';job.child?.kill('SIGKILL');}else this.jobs.delete(id);return true;}
}
