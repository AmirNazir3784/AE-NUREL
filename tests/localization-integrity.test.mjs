import {describe,it,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseSrt} from '../src/lib/srt.ts';
import {emptyEditor,editorExportErrors} from '../src/lib/subtitle-editor.ts';
import {semanticUnits,localizedDocument,localizeUnit,coverageExportIssues} from '../src/features/local-asr/semantic-localization.ts';
import {assertSourceCoverage} from '../src/features/local-asr/source-sentences.ts';
import {runSubtitleJob,clearSessionCheckpoints} from '../src/features/local-asr/subtitle-job.ts';
import {captionExport} from '../src/features/local-asr/asr-core.ts';
import {parseVtt} from '../src/lib/subtitle-editor.ts';
import {generateLocalTranslation,validateTranslationTokens} from '../src/features/local-asr/translation-generation.ts';
import {preservationIssues} from '../src/features/local-asr/translation-integrity.ts';
const cue=(text,start,end,id='cue-'+start)=>({text,start,end,id,identifier:'',srtSettings:'',vttSettings:''});
const doc=cues=>({...emptyEditor(),filename:'fixture.srt',cues});
const raw=await fs.readFile(new URL('./fixtures/localization/experiment.en.srt',import.meta.url),'utf8');
const fixture=doc(parseSrt(raw).cues.map((c,i)=>cue(c.text,c.start,c.end,String(i+1))));
const old= parseSrt(await fs.readFile(new URL('./fixtures/localization/experiment.old.ur.srt',import.meta.url),'utf8')).cues;
beforeEach(clearSessionCheckpoints);

describe('sentence identity, coverage and alignment contract',()=>{
 it('rejects reordered, text-mutated and timing-mutated source sentence identities',()=>{
  const units=semanticUnits(fixture);
  assert.throws(()=>assertSourceCoverage(fixture,[units[1],units[0],...units.slice(2)]),/reordered/);
  assert.throws(()=>assertSourceCoverage(fixture,[{...units[0],text:'Another sentence.'},...units.slice(1)]),/identity/);
  assert.throws(()=>assertSourceCoverage(fixture,[{...units[0],start:0},...units.slice(1)]),/identity/);
 });
 it('bounds a long unfinished utterance without losing any source fragment',()=>{
  const source=doc(Array.from({length:1000},(_,i)=>cue('continuous speech',i*3000,i*3000+2800,String(i))));
  const units=semanticUnits(source);assertSourceCoverage(source,units);
  assert.ok(units.every(u=>u.cues.length<=4&&u.end-u.start<=20000));
  assert.equal(units.flatMap(u=>u.fragments).length,1000);assert.ok(units.some(u=>u.continuation));
 });
 it('keeps every independent sentence in the six-cue report, joining only the final continuation',()=>{
  const units=semanticUnits(fixture,'en');assert.equal(units.length,5);
  assert.deepEqual(units.map(u=>[u.start,u.end]),[[500,3000],[3180,7600],[7940,8600],[8920,10600],[10980,19100]]);
  assert.deepEqual(units.map(u=>u.fragments.map(f=>f.cueId)),[['1'],['2'],['3'],['4'],['5','6']]);
  assert.equal(units[0].text,fixture.cues[0].text);assert.equal(units.at(-1).text,fixture.cues[4].text+' '+fixture.cues[5].text);
 });
 it('reports a missing opener and never fills it with the later question',()=>{
  const units=semanticUnits(fixture);const question=old.slice(0,2).map(c=>c.text).join(' ');
  const out=localizedDocument(fixture,units,[{id:units[1].id,text:question}],'ur');
  assert.equal(out.ledger[0].status,'failed');assert.equal(out.document.cues[0].text,'');
  assert.ok(out.document.cues.filter(c=>c.text).every(c=>c.start>=3180&&c.end<=7600));
  assert.ok(coverageExportIssues(out.document,out.ledger).length);assert.ok(editorExportErrors(out.document).length);
 });
 it('rejects missing source fragments, duplicate targets and unknown identities',()=>{
  const units=semanticUnits(fixture);assert.throws(()=>assertSourceCoverage(fixture,units.slice(1)),/coverage/);
  assert.throws(()=>localizedDocument(fixture,units,[{id:units[0].id,text:'Uno'},{id:units[0].id,text:'Dos'}],'es'),/identities/);
  assert.throws(()=>localizedDocument(fixture,units,[{id:'foreign',text:'Uno'}],'es'),/identities/);
 });
 it('associates out-of-order returned results by ID rather than array position',()=>{
  const source=doc([cue('First.',0,2000),cue('Second.',2100,4000)]),units=semanticUnits(source);
  const out=localizedDocument(source,units,[{id:units[1].id,text:'Segundo.'},{id:units[0].id,text:'Primero.'}],'es');
  assert.equal(out.document.cues[0].text,'Primero.');assert.equal(out.document.cues[1].start,2100);assert.equal(out.failed,0);
 });
 it('splits one source cue with multiple sentences only at measured word boundaries',()=>{
  const source=doc([cue('First sentence. Second sentence.',100,4000)]);
  const words=[{text:'First',timestamp:[.1,.7]},{text:' sentence.',timestamp:[.7,1.5]},{text:' Second',timestamp:[2,3]},{text:' sentence.',timestamp:[3,4]}];
  const units=semanticUnits(source,'en',words);assert.deepEqual(units.map(u=>[u.start,u.end,u.timingReliable]),[[100,1500,true],[2000,4000,true]]);
  const unknown=semanticUnits(source);assert.equal(unknown.length,2);assert.ok(unknown.every(u=>!u.timingReliable));
  const out=localizedDocument(source,unknown,unknown.map(u=>({id:u.id,text:'Texto.'})),'es');assert.equal(out.failed,2);assert.ok(coverageExportIssues(out.document,out.ledger).length);
 });
 it('keeps a sentence across multiple source cues while closing short complete sentences',()=>{
  const units=semanticUnits(doc([cue('We will',0,1000),cue('decide tomorrow.',1000,2000),cue('Fine.',2100,2500)]));
  assert.equal(units.length,2);assert.equal(units[0].text,'We will decide tomorrow.');assert.equal(units[1].start,2100);
 });
 it('blocks missing/empty/malformed results and allows manual correction without losing source identity',()=>{
  const source=doc([cue('First.',0,2000)]),units=semanticUnits(source);
  for(const text of [undefined,'','<bad>','00 --> 01']){const out=localizedDocument(source,units,[{id:units[0].id,text}],'es');assert.equal(out.failed,1);assert.ok(coverageExportIssues(out.document,out.ledger).length)}
  const out=localizedDocument(source,units,[],'es');out.document.cues[0].text='Primero.';assert.deepEqual(coverageExportIssues(out.document,out.ledger),[]);
  out.document.cues[0].end=2100;assert.ok(coverageExportIssues(out.document,out.ledger).length);
 });
});

describe('balanced multilingual segmentation adversaries',()=>{
 it('attaches leading ellipses and punctuation to speech rather than an isolated line or cue',()=>{
  const unit=semanticUnits(doc([cue('Source.',0,12000)]))[0];
  for(const [language,text]of [['en','… — A very long sentence with many words that needs several balanced subtitle lines, ending with a question?'],['ar','… — هل يمكن استخدام هذا البرنامج لتحرير مقاطع الفيديو الطويلة، مع الحفاظ على جميع الكلمات والتوقيت الصحيح؟'],['ja','…「これは長い文章です。すべての文字と句読点を残して読みやすい字幕にします。」']]){
   const out=localizeUnit(unit,text,language);assert.ok(out.cues.flatMap(c=>c.text.split('\n')).every(line=>/[\p{L}\p{N}]/u.test(line)));
   assert.equal(out.cues.map(c=>c.text).join('').replace(/\s/gu,''),text.replace(/\s/gu,''));
  }
 });
 const texts={
  ur:'کیا یہ ممکن ہے کہ ایڈجسٹنگ A-roll کو اس نقطہ تک ماسٹر کریں جہاں B-roll اختیاری ہو جائے گا؟',
  ar:'هل يمكن استخدام Adobe Premiere Pro و After Effects لتحرير A-roll و B-roll؟ لا تحذف 12 مقطعًا بتاريخ 2026-10-10.',
  ja:'まだ決めていません。最後に判断するのはあなたです。Adobe Premiere Pro と After Effects を使用します。',
  es:'En este vídeo, Maya utiliza Adobe Premiere Pro y After Effects; no elimines los 12 clips del 2026-10-10, ¿de acuerdo?',
  de:'Maya verwendet Adobe Premiere Pro und After Effects für Bewegungsgrafiken; bitte löschen Sie die 12 Clips vom 2026-10-10 nicht.',
  en:'In this video, Maya uses Adobe Premiere Pro and After Effects for A-roll and B-roll; keep the 12 clips dated 2026-10-10.',
 };
 for(const [language,text]of Object.entries(texts))it('preserves text, scripts, punctuation and timing for '+language,()=>{
  const unit=semanticUnits(doc([cue('Source sentence.',10000,22000)]))[0],out=localizeUnit(unit,text,language),cues=out.cues;
  assert.equal(cues.map(c=>c.text).join('').replace(/\s/gu,''),text.replace(/\s/gu,''));
  assert.equal(cues[0].start,10000);assert.equal(cues.at(-1).end,22000);
  assert.ok(cues.every(c=>c.start>=10000&&c.end<=22000&&c.end>c.start));
  for(const line of cues.flatMap(c=>c.text.split('\n')))assert.match(line,/[\p{L}\p{N}]/u);
  assert.ok(cues.every(c=>!/[\u2066-\u2069<>]/u.test(c.text)));
  const document=doc(cues);assert.equal(parseSrt(captionExport(document,'srt').content).cues.length,cues.length);assert.equal(parseVtt(captionExport(document,'vtt').content).cues.length,cues.length);
  if(language==='ur'){assert.ok(cues.some(c=>c.text.replace(/\n/gu,' ').includes('اس نقطہ تک')));assert.ok(cues.every(c=>c.text.split('\n').every(line=>line.trim()!=='گا؟')))}
  for(const token of ['A-roll','B-roll','2026-10-10','Adobe Premiere Pro','After Effects'])if(text.includes(token))assert.ok(cues.some(c=>c.text.includes(token)),token+' must not be split');
 });
 it('flags an indivisible very long word and dense speech without deleting content',()=>{
  const unit=semanticUnits(doc([cue('Source.',0,600)]))[0],text='W'.repeat(500),out=localizeUnit(unit,text,'de');assert.equal(out.fast,true);assert.equal(out.cues.map(c=>c.text).join(''),text);assert.equal(out.cues.at(-1).end,600);
 });
 it('rejects punctuation-only output instead of creating punctuation captions',()=>{const unit=semanticUnits(doc([cue('Source.',0,2000)]))[0];assert.throws(()=>localizeUnit(unit,'?!...','en'))});
});

describe('sentence retry and partial recovery',()=>{
 it('reports ambiguous sentence timing in recovered coarse Fast captions without unnecessary retranscription',async()=>{
  let asrCalls=0,translated=0;const records=new Map();
  const deps={store:{async load(k){return records.get(k)},async save(v){records.set(v.key,v)},async translation(){},async saveTranslation(){}},decoder:{duration:4,async read(){return new Float32Array(1)},dispose(){}},asr:{cancel(){},async run(){asrCalls++;return {text:'First. Second.',chunks:[{text:'First. Second.',timestamp:[0,3]}],language:'en'}}},translator:{cancel(){},async translate(){translated++;return 'Texto.'}}};
  const options={filename:'coarse.wav',fileKey:'coarse',spoken:'en',target:'same',backend:'wasm',signal:new AbortController().signal,progress(){}};
  await runSubtitleJob(options,deps);clearSessionCheckpoints();const out=await runSubtitleJob({...options,target:'es'},deps);
  assert.equal(asrCalls,1);assert.equal(translated,0);assert.equal(out.failedTranslations,2);assert.ok(out.coverage.every(entry=>entry.issues.some(issue=>/timing/i.test(issue))));
 });
 it('cancels during translation and recovers completed sentences without retranscribing',async()=>{
  const records=new Map(),texts=new Map(),calls=[],controller=new AbortController();let asrCalls=0,disposed=0;
  const store={async load(k){return records.get(k)},async save(v){records.set(v.key,v)},async translation(k,l,c){return texts.get(k+l+c)},async saveTranslation(k,l,c,t){texts.set(k+l+c,t)}};
  let shouldCancel=true;
  const translator={cancel(){},async translate(text,source,target,signal){calls.push(text);if(shouldCancel&&text===fixture.cues[1].text){controller.abort();signal.throwIfAborted()}return 'Traducción.'}};
  const deps={store,translator,asr:{cancel(){},async run(){asrCalls++;return {text:'fixture',chunks:fixture.cues.map(c=>({text:c.text,timestamp:[c.start/1000,c.end/1000]})),language:'en'}}},decoder:{duration:20,async read(){return new Float32Array(1)},dispose(){disposed++}}};
  const options={filename:'cancel.wav',fileKey:'cancel',spoken:'en',target:'es',quality:'accurate',backend:'wasm',signal:controller.signal,progress(){}};
  await assert.rejects(runSubtitleJob(options,deps),{name:'AbortError'});assert.equal(texts.size,1);assert.equal(disposed,1);
  shouldCancel=false;clearSessionCheckpoints();const recovered=await runSubtitleJob({...options,signal:new AbortController().signal},deps);
  assert.equal(recovered.failedTranslations,0);assert.equal(asrCalls,1);assert.equal(calls.filter(t=>t===fixture.cues[0].text).length,1);assert.equal(disposed,2);
 });
 it('rejects malformed cached text and retries only that sentence',async()=>{
  let stored,translated=0;const store={async load(){},async save(){},async translation(){return '<invalid>'},async saveTranslation(k,l,c,t){stored=t}};
  const source=[{text:'One sentence.',timestamp:[0,2]}];
  const out=await runSubtitleJob({filename:'bad-cache.wav',fileKey:'bad-cache',spoken:'en',target:'es',backend:'wasm',signal:new AbortController().signal,progress(){}},{store,decoder:{duration:3,async read(){return new Float32Array(1)},dispose(){}},asr:{cancel(){},async run(){return {text:'One sentence.',chunks:source,language:'en'}}},translator:{cancel(){},async translate(){translated++;return 'Una frase.'}}});
  assert.equal(translated,1);assert.equal(stored,'Una frase.');assert.equal(out.failedTranslations,0);
 });
 it('exposes source, raw, coverage and final cues only through an opt-in development callback',async()=>{
  const original=process.env.NODE_ENV,seen=[];
  const deps={store:{async load(){},async save(){},async translation(){},async saveTranslation(){}},decoder:{duration:3,async read(){return new Float32Array(1)},dispose(){}},asr:{cancel(){},async run(){return {text:'Source.',chunks:[{text:'Source.',timestamp:[0,2]}],language:'en'}}},translator:{cancel(){},async translate(){return 'Texto.'}}};
  const options={filename:'diagnostic.wav',fileKey:'diagnostic',spoken:'en',target:'es',backend:'wasm',signal:new AbortController().signal,progress(){},diagnostics:value=>seen.push(value)};
  try {
   process.env.NODE_ENV='development';await runSubtitleJob(options,deps);
   assert.deepEqual(seen.map(v=>v.stage),['source','raw','coverage']);
   assert.equal(seen[0].unit.fragments[0].cueId,seen[2].coverage.sourceCueIds[0]);assert.equal(seen[2].cues[0].text,'Texto.');
   seen.length=0;process.env.NODE_ENV='production';clearSessionCheckpoints();await runSubtitleJob({...options,fileKey:'production-diagnostic'},deps);assert.deepEqual(seen,[]);
  }finally{if(original===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=original}
 });
 it('retains valid sentences, exposes a failed opener, retries only failure and reuses ASR across targets',async()=>{
  const saved=new Map(),texts=new Map(),seen=[],sourceWords=fixture.cues.map(c=>({text:c.text,timestamp:[c.start/1000,c.end/1000]}));let failing=true,asrCalls=0;
  const store={async load(k){return saved.get(k)},async save(v){saved.set(v.key,v)},async translation(k,l,c){return texts.get(k+l+c)},async saveTranslation(k,l,c,t){texts.set(k+l+c,t)}};
  const asr={cancel(){},async run(){asrCalls++;return {text:'fixture',chunks:sourceWords,language:'en'}}};
  const translator={cancel(){},async translate(text){seen.push(text);if(failing&&text===fixture.cues[0].text)throw Error('Model returned incomplete output.');return 'Texto traducido.'}};
  const options={filename:'fixture.wav',fileKey:'integrity',spoken:'en',target:'es',quality:'accurate',backend:'wasm',signal:new AbortController().signal,progress(){}};
  const deps={store,asr,translator,decoder:{duration:20,async read(){return new Float32Array(1)},dispose(){}}};
  const first=await runSubtitleJob(options,deps);assert.equal(first.failedTranslations,1);assert.equal(first.coverage[0].status,'failed');assert.equal(first.document.cues[0].text,'');
  failing=false;clearSessionCheckpoints();const second=await runSubtitleJob(options,deps);assert.equal(second.failedTranslations,0);assert.equal(asrCalls,1);
  assert.equal(seen.filter(t=>t===fixture.cues[0].text).length,4);assert.equal(seen.filter(t=>t===fixture.cues[1].text).length,1);
  await runSubtitleJob({...options,target:'ja'},deps);assert.equal(asrCalls,1);
 });
});

describe('observable integrity checks without fake semantic certification',()=>{
 it('does not certify a fluent partial translation as meaning-preserving',()=>{
  const source=doc([cue("We'll see, and in the end you decide.",0,3000)]),units=semanticUnits(source);
  const out=localizedDocument(source,units,[{id:units[0].id,text:'You decide.'}],'en');
  assert.equal(out.ledger[0].semanticVerified,false);assert.equal(out.failed,0,'No reliable generic test proves the fluent omission');
 });
 it('rejects output-budget truncation even when the final token is EOS',()=>{
  validateTranslationTokens([2n,100n,101n,2n],8);
  assert.throws(()=>validateTranslationTokens([2,10,11,12,2],4),/limit/);
  assert.throws(()=>validateTranslationTokens([2,10,11],8),/incompletely/);
 });
 it('uses explicit language tokens, NFC, no source truncation and no forced output EOS',async()=>{
  let input,generated;
  const translator={tokenizer:{_build_translation_inputs(text,tokenizerOptions,options){input={text,tokenizerOptions,options};options.forced_bos_token_id=128022;return {input_ids:{dims:[1,4]}}},batch_decode(){return ['翻訳。']}},model:{async generate(options){generated=options;return {tolist(){return [[2n,128022n,100n,2n]]}}}}};
  assert.equal(await generateLocalTranslation(translator,'Cafe\u0301','jw','ja'),'翻訳。');
  assert.equal(input.text,'Café');assert.equal(input.options.src_lang,'jv');assert.equal(input.options.tgt_lang,'ja');assert.equal(input.tokenizerOptions.truncation,false);assert.equal(generated.forced_eos_token_id,null);assert.equal(generated.forced_bos_token_id,128022);
 });
 it('rejects oversized source tokens before inference and blank model text',async()=>{
  const translator={tokenizer:{_build_translation_inputs(){return {input_ids:{dims:[1,1025]}}}},model:{async generate(){assert.fail('Oversized input must not run')}}};
  await assert.rejects(generateLocalTranslation(translator,'source','en','ur'),/input limit/);
  translator.tokenizer._build_translation_inputs=()=>({input_ids:{dims:[1,4]}});translator.tokenizer.batch_decode=()=>[''];translator.model.generate=async()=>({tolist:()=>[[2,100,2]]});
  await assert.rejects(generateLocalTranslation(translator,'source','en','ur'),/no usable/);
 });
 it('compares digit values across scripts without treating translated names or word order as errors',()=>{
  assert.deepEqual(preservationIssues('Maya has 12 clips dated 2026-10-10.','مایا کے پاس ۱۲ کلپس ہیں، ۲۰۲۶-۱۰-۱۰۔'),[]);
  assert.ok(preservationIssues('Keep 12 clips and RTX4090.','Keep the clips.').length);
 });
 it('flags observable numeric loss while leaving semantics unverified and avoiding weak length rules',()=>{
  const source=doc([cue('Keep 12 clips.',0,2000)]),units=semanticUnits(source),out=localizedDocument(source,units,[{id:units[0].id,text:'Conserva los clips.'}],'es');
  assert.equal(out.ledger[0].status,'needs-review');assert.equal(out.ledger[0].semanticVerified,false);assert.equal(out.failed,0);
  const short=doc([cue('This source sentence has several words.',0,3000)]),one=semanticUnits(short),valid=localizedDocument(short,one,[{id:one[0].id,text:'はい。'}],'ja');
  assert.equal(valid.ledger[0].status,'translated','Short text alone is not proof of a bad translation');
 });
});
