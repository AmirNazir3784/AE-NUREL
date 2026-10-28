import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { audioSections, mergeSection, coalesceWordTimings, normalizeWordAlignment } from '../src/features/local-asr/subtitle-timeline.ts';
import { captionDocument, captionExport } from '../src/features/local-asr/asr-core.ts';
import { validateSubtitleFile, validateSubtitleDuration, SPOKEN_LANGUAGES, SECTION_MAX_SECONDS, validateSpokenLanguage } from '../src/features/local-asr/subtitle-capabilities.ts';
import { applyCueTranslations, needsTranslation, SUBTITLE_LANGUAGES, languageFilename, validateTranslationPair, permittedTranslationAsset, TRANSLATION_MODEL, TRANSLATION_REVISION } from '../src/features/local-asr/translation-core.ts';
import { runSubtitleJob, clearSessionCheckpoints, cleanSessionCheckpoints } from '../src/features/local-asr/subtitle-job.ts';
import { subtitleFileKey } from '../src/features/local-asr/subtitle-checkpoints.ts';
import { AsrClient } from '../src/features/local-asr/asr-client.ts';
import { parseSrt } from '../src/lib/srt.ts';
import { parseVtt } from '../src/lib/subtitle-editor.ts';
const word = (text,start,end) => ({text,timestamp:[start,end]});
beforeEach(clearSessionCheckpoints);

function setup({duration=20, language='en', chunks=[word('Hello',.1,.6),word(' world.',.6,1.5)], fail=()=>false, storageFails=false}={}) {
 const records=new Map(), translations=new Map(), calls=[], translated=[], reads=[], events=[];
 let attempts=0, disposed=0, speechReleased=0, translationReleased=0;
 const store={async load(k){if(storageFails)throw Error('quota');return records.get(k)},async save(v){records.set(v.key,structuredClone(v))},async translation(k,l,c){return translations.get(`${k}/${l}/${c}`)},async saveTranslation(k,l,c,t){translations.set(`${k}/${l}/${c}`,t)},async clear(){records.clear();translations.clear()}};
 const decoder={duration,async read(s,e){reads.push([s,e]);return new Float32Array([s])},dispose(){disposed++}};
 const asr={cancel(){speechReleased++},async run(samples,backend,signal,report,options){signal.throwIfAborted();calls.push({...options,offset:samples[0]});if(fail(samples[0],++attempts))throw Error('chunk failed');return {chunks,text:chunks.map(w=>w.text).join(''),language}}};
 const translator={cancel(){translationReleased++},async translate(text,source,target,signal){signal.throwIfAborted();assert.ok(speechReleased>0,'speech model released before translation');translated.push({text,source,target});return 'こんにちは — مرحباً — '+text}};
 const options={filename:'lecture.wav',fileKey:'fixture',spoken:'en',target:'same',backend:'wasm',signal:new AbortController().signal,progress:p=>events.push(p)};
 const run=(changes={})=>runSubtitleJob({...options,...changes},{decoder,asr,translator,store});
 return {run,options,records,translations,calls,translated,reads,events,decoder,asr,translator,store,get disposed(){return disposed},get translationReleased(){return translationReleased}};
}

describe('bounded local subtitle jobs',()=>{
 it('keeps a short English job to one section and exports valid numbered SRT and headered VTT',async()=>{
  const h=setup(),out=await h.run({target:'en'});assert.equal(h.calls.length,1);assert.equal(h.translated.length,0);assert.equal(out.document.filename,'lecture.en.srt');
  assert.deepEqual(h.reads,[[0,20]]);assert.equal(h.calls[0].wordTimestamps,false,'preserves original short-English segment path');assert.equal(parseSrt(captionExport(out.document,'srt').content).cues.length,1);assert.equal(parseVtt(captionExport(out.document,'vtt').content).cues.length,1);
  assert.match(captionExport(out.document,'srt').content,/1\n00:00:00,100 --> 00:00:01,500/);assert.match(captionExport(out.document,'vtt').content,/^WEBVTT\n/);assert.equal(h.disposed,1);
 });
 it('passes an explicit source language to the local multilingual worker',async()=>{const h=setup({language:'ja'});await h.run({spoken:'ja'});assert.equal(h.calls[0].language,'ja');assert.equal(h.calls[0].multilingual,true)});
 it('requests measured word timestamps for a fresh Fast translation without changing the Tiny quality',async()=>{const h=setup();await h.run({target:'ur'});assert.equal(h.calls[0].quality,'fast');assert.equal(h.calls[0].wordTimestamps,true)});
 it('isolates Accurate checkpoints and reuses the original Fast checkpoints when switching back',async()=>{const h=setup();await h.run();await h.run({quality:'accurate'});await h.run();assert.equal(h.calls.length,2);assert.equal(h.calls[0].quality,'fast');assert.equal(h.calls[1].quality,'accurate');assert.equal(h.calls[1].wordTimestamps,true)});
 it('keeps Accurate multi-hour processing in the same bounded section pipeline',async()=>{const h=setup({duration:18000});await h.run({quality:'accurate'});assert.equal(h.calls.length,150);assert.ok(h.calls.every(call=>call.quality==='accurate'&&call.wordTimestamps));assert.ok(h.reads.every(([s,e])=>e-s<=SECTION_MAX_SECONDS))});
 it('requests actual auto detection and reuses the detected language for subsequent sections',async()=>{const h=setup({duration:260,language:'ar'});const out=await h.run({spoken:'auto'});assert.equal(h.calls[0].language,'auto');assert.equal(h.calls[1].language,'ar');assert.equal(h.calls[1].multilingual,true);assert.equal(out.language,'ar')});
 it('translates independently selected source/output languages with immutable timing and IDs',async()=>{
  const h=setup({language:'ja'}),out=await h.run({spoken:'ja',target:'es'});assert.equal(out.translated,true);assert.equal(h.translated[0].source,'ja');assert.equal(h.translated[0].target,'es');
  assert.deepEqual(out.document.cues.map(c=>[c.id,c.start,c.end]),out.source.cues.map(c=>[c.id,c.start,c.end]));assert.match(out.document.cues[0].text,/こんにちは — مرحباً/);assert.equal(out.document.filename,'lecture.es.srt');
 });
 it('skips loading any translation model for same language, including detected English',async()=>{const h=setup();await h.run({spoken:'auto',target:'en'});assert.equal(h.translated.length,0);assert.equal(needsTranslation('ja','same'),false);assert.equal(needsTranslation('en','en'),false)});
 it('localizes a complete thought and reuses it on retry without retranscribing',async()=>{
  const parts=[word("We'll see,",0,2),word('and in the end,',2,4),word("you are going to be the judge, right?",4,8)],h=setup({chunks:parts});
  const first=await h.run({target:'ur'});assert.ok(first.source.cues.length>1);assert.equal(h.translated.length,1);assert.equal(h.translated[0].text,"We'll see, and in the end, you are going to be the judge, right?");
  assert.ok(first.document.cues.every(c=>c.start>=0&&c.end<=8000));await h.run({target:'ur'});assert.equal(h.calls.length,1);assert.equal(h.translated.length,1);
 });
 it('handles a 5-hour timeline in 150 bounded sections with correct hour offsets',async()=>{
  const h=setup({duration:18000}),out=await h.run();assert.equal(h.calls.length,150);assert.ok(h.reads.every(([s,e])=>e-s<=SECTION_MAX_SECONDS));assert.equal(out.document.cues.at(-1).start,17875100);
  const srt=captionExport(out.document,'srt').content;assert.match(srt,/04:57:55,100/);assert.equal(parseSrt(srt).cues.length,150);assert.equal(parseVtt(captionExport(out.document,'vtt').content).cues.length,150);
 });
 it('reports actual completed sections and cues, never estimates time progress',async()=>{const h=setup({duration:260});await h.run({target:'fr'});assert.deepEqual(h.events.filter(e=>e.stage==='transcribing').map(e=>e.completed),[1,2,3]);assert.ok(h.events.some(e=>e.stage==='translating'&&e.completed===3&&e.sections===3))});
 it('retries only a failed section, not sections already completed',async()=>{const h=setup({duration:260,fail:(offset,n)=>offset===115&&n===2});await h.run();assert.deepEqual(h.calls.map(c=>c.offset),[0,115,115,235])});
 it('keeps source checkpoints on permanent failure and resumes at the failed section',async()=>{
  let failing=true;const h=setup({duration:260,fail:offset=>failing&&offset===115});await assert.rejects(h.run(),/chunk failed/);assert.equal(h.disposed,1);failing=false;await h.run();assert.deepEqual(h.calls.map(c=>c.offset),[0,115,115,115,115,235]);
 });
 it('reuses transcription and translated cues across output language runs',async()=>{const h=setup();await h.run({target:'fr'});await h.run({target:'es'});await h.run({target:'fr'});assert.equal(h.calls.length,1);assert.equal(h.translated.length,2)});
 it('retains completed translated cues after a later cue fails and resumes that cue only',async()=>{
  const h=setup({chunks:[word('First.',0,1),word('Second.',4,5)]}), original=h.translator.translate;let failing=true;const seen=[];
  h.translator.translate=async(text,...args)=>{seen.push(text);if(failing&&text==='Second.')throw Error('translation failed');return original(text,...args)};
  const partial=await h.run({target:'es'});assert.equal(partial.failedTranslations,1);assert.equal(partial.coverage[1].status,'failed');failing=false;const out=await h.run({target:'es'});
  assert.deepEqual(seen,['First.','Second.','Second.','Second.','Second.']);assert.equal(h.calls.length,1);assert.equal(out.document.cues.length,2);
 });
 it('supports browser refresh recovery through persisted checkpoints',async()=>{const h=setup();await h.run();clearSessionCheckpoints();await h.run({target:'ar'});assert.equal(h.calls.length,1);assert.equal(h.translated.length,1)});
 it('does not reuse old translated text when an expired source is transcribed differently',async()=>{
  const h=setup();await h.run({target:'es'});clearSessionCheckpoints();for(const checkpoint of h.records.values())checkpoint.expires=0;
  h.asr.run=async()=>({text:'New source.',chunks:[word('New source.',.1,1.5)],language:'en'});
  const out=await h.run({target:'es'});assert.equal(h.translated.length,2);assert.match(out.document.cues[0].text,/New source/);
 });
 it('retains in-tab recovery when IndexedDB is unavailable and warns honestly',async()=>{const h=setup({storageFails:true});await h.run();await h.run();assert.equal(h.calls.length,1);assert.ok(h.events.some(e=>e.warning?.includes('storage is unavailable')))});
 it('purges expired source and translated text from the memory fallback',async()=>{const h=setup({storageFails:true});await h.run({target:'es'});cleanSessionCheckpoints(Date.now()+25*60*60*1000);await h.run({target:'es'});assert.equal(h.calls.length,2);assert.equal(h.translated.length,2)});
 it('does not treat unsupported source translation as a successful translation',async()=>{const h=setup({language:'la'});await assert.rejects(h.run({spoken:'la',target:'en'}),/not by the local translation model/);const source=await h.run({spoken:'la'});assert.equal(h.calls.length,1);assert.equal(source.document.cues.length,1)});
 it('cancels before starting a section and releases resources',async()=>{const h=setup(),abort=new AbortController();abort.abort();await assert.rejects(h.run({signal:abort.signal}),{name:'AbortError'});assert.equal(h.calls.length,0);assert.equal(h.disposed,1);assert.equal(h.translationReleased,1)});
});

describe('overlap reconciliation and subtitle timing',()=>{
 it('uses shared word context once and preserves words before and after the seam',()=>{
  const section=audioSections(260)[1];const left=[word('before',110,111),word('shared',118,119),word('boundary',120,121),word('after',122,123)];
  const merged=mergeSection(left,[word('shared',3,4),word('boundary',5,6),word('after',7,8),word('later',15,16)],section);
  assert.deepEqual(merged.map(w=>w.text),['before','shared','boundary','after','later']);assert.deepEqual(merged.at(-1).timestamp,[130,131]);
 });
 it('preserves intentional repeated words at a chunk boundary',()=>{const merged=mergeSection([word('yes',118,119),word('yes',120,121)],[word('yes',3,4),word('yes',5,6),word('please',8,9)],audioSections(260)[1]);assert.deepEqual(merged.map(w=>w.text),['yes','yes','please'])});
 it('chooses a shared phrase seam with compatible measured timing',()=>{
  const out=mergeSection([word('before',117,118.2),word('shared',118.2,119.2),word('phrase',119.2,120.2)],[word('shared',3,4),word('phrase',4.3,5.3),word('after',6,7)],audioSections(260)[1]);
  assert.deepEqual(out.map(w=>w.text),['before','shared','phrase','after']);assert.equal(out[2].timestamp[0],119.3);
 });
 it('rejects conflicting boundary hypotheses rather than silently losing text',()=>{assert.throws(()=>mergeSection([word('different',118,121)],[word('hypothesis',3,5)],audioSections(260)[1]),/disagrees/)});
 it('rejects missing, out-of-section, reversed and overlapping local timestamps',()=>{for(const words of [[word('x',null,1)],[word('x',1,0)],[word('x',0,140)],[word('a',0,1),word('b',.9,2)]])assert.throws(()=>mergeSection([],words,audioSections(260)[1]))});
 it('attaches zero-width subwords only to measured spans',()=>{assert.deepEqual(coalesceWordTimings([word('Hello',0,1),word('!',1,1)]),[word('Hello!',0,1)]);assert.throws(()=>coalesceWordTimings([word('unmeasured',1,1)]),/no usable timing/)});
 it('groups minor real aligner overlaps without losing words or inventing a boundary',()=>{const out=normalizeWordAlignment([word(' synthetic',1,2),word(' test',1.96,2.5)],3);assert.deepEqual(out.chunks,[word(' synthetic test',1,2.5)]);assert.equal(out.joined,1);assert.throws(()=>captionDocument(normalizeWordAlignment([word('a',0,1),word('b',.5,2)],3).chunks,3,'x.wav',true))});
 it('bounds model padding to the available section audio and rejects larger drift',()=>{const out=normalizeWordAlignment([word('last',4,5.7),word('padding',5.7,6)],5);assert.deepEqual(out.chunks,[word('last',4,5)]);assert.equal(out.clipped,2);assert.throws(()=>normalizeWordAlignment([word('bad',4,10)],5),/extends too far/)});
 it('leaves a truncated context-edge word to the following overlap, but rejects it at the original audio end',()=>{const words=[word('and',8,8.8),word('finally',9,9)];assert.deepEqual(normalizeWordAlignment(words,10,true).chunks,[words[0]]);assert.throws(()=>normalizeWordAlignment(words,10,false),/no usable timing/)});
 it('builds readable Japanese/Arabic Unicode cues and valid files without changing their measured spans',()=>{const doc=captionDocument([word('日本',0,1),word('語。',1,2),word('مرحبا',7,8)],18000,'日本語.wav',true);assert.equal(doc.cues[0].text,'日本語。');assert.equal(doc.cues[1].start,7000);assert.equal(parseSrt(captionExport(doc,'srt').content).cues.length,2);assert.match(captionExport(doc,'vtt').content,/مرحبا/)});
 it('rejects translation structure changes and only copies validated text',()=>{const doc=captionDocument([word('Hi',0,1)],2,'x.wav');for(const values of [[],[{id:'wrong',text:'Hi'}],[{id:doc.cues[0].id,text:''}],[{id:doc.cues[0].id,text:'00:00 --> 00:01'}]])assert.throws(()=>applyCueTranslations(doc,values,'en'));const out=applyCueTranslations(doc,[{id:doc.cues[0].id,text:'こんにちは'}],'ja');assert.equal(out.cues[0].start,doc.cues[0].start);assert.equal(doc.cues[0].text,'Hi')});
});

describe('actual language capabilities, formats and local-only network rules',()=>{
 it('exposes separate verified language sets with no unsupported promises',()=>{assert.equal(SPOKEN_LANGUAGES.length,99);assert.equal(SUBTITLE_LANGUAGES.length,100);assert.ok(SPOKEN_LANGUAGES.some(x=>x.code==='ur'));assert.ok(SUBTITLE_LANGUAGES.some(x=>x.code==='es'));assert.ok(!SPOKEN_LANGUAGES.some(x=>x.code==='yue'));assert.throws(()=>validateSpokenLanguage('made-up'));assert.throws(()=>validateTranslationPair('la','en'))});
 it('validates type, empty files, formats, size and duration without a 60-second restriction',()=>{for(const name of ['test.mp3','test.wav','test.m4a','test.aac','test.flac','test.ogg'])validateSubtitleFile({name,size:100});for(const f of [{name:'x.wav',size:0},{name:'x.wav',size:100,type:'image/png'},{name:'x.exe',size:100},{name:'x.mp4',size:100},{name:'x.wav',size:5*1024**3}])assert.throws(()=>validateSubtitleFile(f));for(const d of [20,300,1800,3600,18000])validateSubtitleDuration(d);for(const d of [NaN,0,-1,18000.1])assert.throws(()=>validateSubtitleDuration(d))});
 it('permits only pinned public translation assets, never text-bearing requests or APIs',()=>{const url=new URL(`https://huggingface.co/${TRANSLATION_MODEL}/resolve/${TRANSLATION_REVISION}/config.json`);assert.equal(permittedTranslationAsset(url,'GET',false),true);assert.equal(permittedTranslationAsset(url,'POST',true),false);assert.equal(permittedTranslationAsset(new URL(url.href+'?text=private'),'GET',false),false);assert.equal(permittedTranslationAsset(new URL('https://api.example.com/translate'),'GET',false),false)});
 it('identifies language and format safely in Unicode output filenames',()=>{assert.equal(languageFilename('日本語.srt','ja'),'日本語.ja.srt');assert.throws(()=>languageFilename('x.srt','../x'))});
 it('hashes all file blocks, so changed middle content cannot resume an unrelated job',async()=>{const a=new Uint8Array(9*1024**2),b=a.slice();b[4*1024**2+10]=1;const signal=new AbortController().signal;assert.notEqual(await subtitleFileKey(new Blob([a]),signal),await subtitleFileKey(new Blob([b]),signal))});
});

describe('persistent speech worker lifecycle',()=>{
 it('does not reuse an incompatible model when quality, language model, timestamps or backend change',async()=>{
  const workers=[];const client=new AsrClient(()=>{const worker={onmessage:null,onerror:null,postMessage(m){this.message=m},terminate(){this.terminated=true}};workers.push(worker);return worker;});const signal=new AbortController().signal;
  const cases=[['wasm',{}],['wasm',{quality:'accurate'}],['wasm',{quality:'accurate',multilingual:true}],['wasm',{quality:'accurate',multilingual:true,wordTimestamps:true}],['webgpu',{quality:'accurate',multilingual:true,wordTimestamps:true}]];
  for(const [backend,options] of cases){const pending=client.run(new Float32Array(1),backend,signal,()=>{},{...options,keepAlive:true});const worker=workers.at(-1);worker.onmessage({data:{id:worker.message.id,type:'result',result:{chunks:[],text:''}}});await pending;}
  assert.equal(workers.length,cases.length);assert.ok(workers.slice(0,-1).every(w=>w.terminated));client.cancel();assert.ok(workers.every(w=>w.terminated));
 });
 it('reuses one model worker between sections and terminates it on job cleanup',async()=>{
  const workers=[];const client=new AsrClient(()=>{const w={onmessage:null,onerror:null,postMessage(m){this.message=m},terminate(){this.terminated=true}};workers.push(w);return w});const signal=new AbortController().signal;
  for(let i=0;i<2;i++){const p=client.run(new Float32Array(1),'wasm',signal,()=>{},{keepAlive:true});const w=workers[0];w.onmessage({data:{id:w.message.id,type:'result',result:{chunks:[],text:''}}});await p;assert.ok(!w.terminated)}
  assert.equal(workers.length,1);client.cancel();assert.equal(workers[0].terminated,true);
 });
 it('times out an unresponsive section and releases its worker',async()=>{let terminated=false;const client=new AsrClient(()=>({onmessage:null,onerror:null,postMessage(){},terminate(){terminated=true}}));await assert.rejects(client.run(new Float32Array(1),'wasm',new AbortController().signal,()=>{},{timeoutMs:5}),/took too long/);assert.equal(terminated,true)});
 it('counts real model download activity when timing out a larger model',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let worker;
  const client=new AsrClient(()=>worker={onmessage:null,onerror:null,postMessage(m){this.message=m},terminate(){this.terminated=true}});
  const pending=client.run(new Float32Array(1),'wasm',new AbortController().signal,()=>{},{timeoutMs:10});
  t.mock.timers.tick(9);worker.onmessage({data:{id:worker.message.id,type:'progress',progress:{stage:'download',loaded:100,total:200}}});t.mock.timers.tick(9);
  assert.ok(!worker.terminated);worker.onmessage({data:{id:worker.message.id,type:'result',result:{chunks:[],text:''}}});await pending;assert.ok(worker.terminated);
 });
});
