// Real loopback HTTP + native CPU inference. No remote media destination, new
// model downloads, private fixture or mock engine. Run against opt-in dev QA.
import fs from 'node:fs/promises';
import os from 'node:os';
import assert from 'node:assert/strict';
import {captionDocument,captionExport} from '../../src/features/local-asr/asr-core.ts';
import {parseSrt} from '../../src/lib/srt.ts';
import {parseVtt} from '../../src/lib/subtitle-editor.ts';
const base=new URL(process.argv[2]??'http://127.0.0.1:3108');assert.equal(base.hostname,'127.0.0.1');
const token=(await fs.readFile('artifacts/hybrid/dev-access-token.txt','utf8')).trim();
const headers={Origin:base.origin,Authorization:'Bearer '+token,'Content-Type':'audio/wav','X-Upload-Consent':'yes','X-Spoken-Language':'en','X-Subtitle-Language':'same'};
const url=route=>new URL(route,base),api='/api/dev/hybrid/jobs';
const dirs=async()=>new Set((await fs.readdir(os.tmpdir())).filter(name=>name.startsWith('aenural-hybrid-')));
const initial=await dirs(),report={runtime:'Node 22 isolated Next dev server + real CPU worker',checks:[],stages:[],pageResponses:[]};
const warm=await fetch(url('/'));assert.equal(warm.status,200);
const caps=await fetch(url(api),{headers});assert.equal(caps.status,200);const capability=await caps.json();assert.equal(capability.cacheReady,true);assert.equal(capability.translation,false);
for(const [patch,expected] of [[{Authorization:''},401],[{Origin:'https://other.example'},403],[{'X-Upload-Consent':'no'},400],[{'X-Subtitle-Language':'ur'},422],[{'Content-Type':'video/mp4'},415]]){
 const response=await fetch(url(api),{method:'POST',headers:{...headers,...patch},body:Buffer.from('test')});assert.equal(response.status,expected);report.checks.push({expected,status:response.status});
}
const corrupt=await fetch(url(api),{method:'POST',headers,body:Buffer.from('not wav')});assert.equal(corrupt.status,400);
const recording=await fs.readFile('artifacts/local-subtitle-quality/editing-terminology.wav');
const begin=performance.now(),accepted=await fetch(url(api),{method:'POST',headers,body:recording});assert.equal(accepted.status,202);const {id}=await accepted.json();
const duplicate=await fetch(url(api),{method:'POST',headers,body:recording});assert.equal(duplicate.status,429);
let completed;
while(performance.now()-begin<190000){
 const status=await fetch(url(`${api}/${id}`),{headers});assert.equal(status.status,200);const job=await status.json();
 if(report.stages.at(-1)!==job.stage){report.stages.push(job.stage);console.log('CPU job stage: '+job.stage);}
 if(job.stage==='failed')throw Error(job.error);
 if(job.stage==='complete'){completed=job;break;}
 const start=performance.now(),page=await fetch(url('/'));report.pageResponses.push({status:page.status,ms:performance.now()-start});assert.equal(page.status,200);
 await new Promise(resolve=>setTimeout(resolve,1000));
}
assert.ok(completed?.result?.words?.length,'No actual timed CPU result');report.elapsedMs=performance.now()-begin;report.model=completed.result.model;report.revision=completed.result.revision;report.peakRssBytes=completed.result.peakRssBytes;
const doc=captionDocument(completed.result.words,completed.result.duration,'server-terminology.wav',true);assert.ok(doc.cues.length);report.text=doc.cues.map(c=>c.text).join(' ');
for(const format of ['srt','vtt']){const output=captionExport(doc,format);const parsed=format==='srt'?parseSrt(output.content):parseVtt(output.content);assert.equal(parsed.cues.length,doc.cues.length);await fs.writeFile(`artifacts/hybrid/server-small.${format}`,output.content);}
await fetch(url(`${api}/${id}`),{method:'DELETE',headers});assert.equal((await fetch(url(`${api}/${id}`),{headers})).status,404);
const second=await fetch(url(api),{method:'POST',headers,body:recording});assert.equal(second.status,202);const cancelledId=(await second.json()).id;
assert.equal((await fetch(url(`${api}/${cancelledId}`),{method:'DELETE',headers})).status,200);
for(let i=0;i<40;i++){const job=await(await fetch(url(`${api}/${cancelledId}`),{headers})).json();if(job.stage==='cancelled'){report.cancelled=true;break;}await new Promise(resolve=>setTimeout(resolve,100));}
assert.equal(report.cancelled,true);await fetch(url(`${api}/${cancelledId}`),{method:'DELETE',headers});
const after=await dirs();assert.deepEqual([...after].filter(name=>!initial.has(name)),[]);report.temporaryAudioCleaned=true;
await fs.writeFile('artifacts/hybrid/real-service-verification.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({complete:true,elapsedMs:report.elapsedMs,words:completed.result.words.length,cues:doc.cues.length,cancelled:true,temporaryAudioCleaned:true,pageRequestsWhileProcessing:report.pageResponses.length}));
