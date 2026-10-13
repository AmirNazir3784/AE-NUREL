import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {semanticUnits,localizeUnit,localizedDocument} from '../src/features/local-asr/semantic-localization.ts';
import {emptyEditor} from '../src/lib/subtitle-editor.ts';
import {captionExport,captionDocument,permittedAssetRequest} from '../src/features/local-asr/asr-core.ts';
import {accurateDeviceReason,validateTranscriptionQuality,ACCURATE_ENGLISH_MODEL,ACCURATE_ENGLISH_REVISION,speechBackend} from '../src/features/local-asr/subtitle-capabilities.ts';
import {parseSrt} from '../src/lib/srt.ts';
import {parseVtt} from '../src/lib/subtitle-editor.ts';
const cue=(text,start,end,id='c'+start)=>({id,text,start,end,identifier:'',srtSettings:'',vttSettings:''});
const doc=cues=>({...emptyEditor(),filename:'test.srt',cues});
describe('transcription quality and private model loading',()=>{
 it('guards known weak devices while keeping Fast and unknown-capability browsers available',()=>{assert.ok(accurateDeviceReason(2));assert.ok(accurateDeviceReason(4));assert.equal(accurateDeviceReason(8),null);assert.equal(accurateDeviceReason(),null);validateTranscriptionQuality('fast');validateTranscriptionQuality('accurate');assert.throws(()=>validateTranscriptionQuality('fake'))});
 it('uses the measured compatible Accurate backend while preserving Fast automatic GPU and explicit choices',()=>{assert.equal(speechBackend('accurate','auto',true),'wasm');assert.equal(speechBackend('fast','auto',true),'webgpu');assert.equal(speechBackend('fast','auto',false),'wasm');assert.equal(speechBackend('accurate','webgpu',true),'webgpu');assert.equal(speechBackend('fast','wasm',true),'wasm');assert.throws(()=>speechBackend('accurate','webgpu',false),/unavailable/)});
 it('allows only bodyless pinned model downloads, never media/text-bearing requests',()=>{const url=new URL(`https://huggingface.co/${ACCURATE_ENGLISH_MODEL}/resolve/${ACCURATE_ENGLISH_REVISION}/onnx/encoder_model_quantized.onnx`);assert.ok(permittedAssetRequest(url,'GET',false));assert.equal(permittedAssetRequest(url,'POST',true),false);assert.equal(permittedAssetRequest(url,'GET',true),false);assert.equal(permittedAssetRequest(new URL(url.href+'?text=private'),'GET',false),false);assert.equal(permittedAssetRequest(new URL(url.href.replace(ACCURATE_ENGLISH_REVISION,'main')),'GET',false),false)});
 it('joins measured tokenizer subwords such as hyphenated terms without replacing vocabulary',()=>{const out=captionDocument([{text:'A',timestamp:[0,1]},{text:'-roll',timestamp:[1,2]},{text:'and B',timestamp:[2,3]},{text:'-roll.',timestamp:[3,4]}],5,'test.wav',true);assert.equal(out.cues[0].text,'A-roll and B-roll.');const legitimate=captionDocument([{text:'aero',timestamp:[0,1]}],2,'test.wav');assert.equal(legitimate.cues[0].text,'aero')});
 it('keeps a very brief final word with its measured sentence instead of a word flash',()=>{const text='Is it possible to master editing A-roll to the point where B-roll becomes';const out=captionDocument([{text,timestamp:[.24,4.28]},{text:'optional?',timestamp:[4.28,4.32]}],6,'test.wav',true);assert.equal(out.cues.length,1);assert.equal(out.cues[0].text,text+' optional?');assert.deepEqual([out.cues[0].start,out.cues[0].end],[240,4320])});
});
describe('bounded sentence/thought localization',()=>{
 it('presents the entire conversational thought to the model across three source cues',()=>{
  const source=doc([cue("We'll see,",0,2000),cue('and in the end,',2200,4000),cue("you're going to be the judge, right?",4000,8000)]);
  const units=semanticUnits(source);assert.equal(units.length,1);assert.equal(units[0].text,"We'll see, and in the end, you're going to be the judge, right?");assert.equal(units[0].start,0);assert.equal(units[0].end,8000);
 });
 it('keeps independently complete sentences separate even when short and adjacent',()=>{
  const units=semanticUnits(doc([cue("Don't spill the beans.",0,2000),cue('The launch is still a secret.',2200,6000)]));
  assert.equal(units.length,2);assert.equal(units[0].text,"Don't spill the beans.");
 });
 it('does not cross large pauses, unrelated complete thoughts or bounded windows',()=>{
  const source=doc(Array.from({length:1000},(_,i)=>cue('words without sentence endings',i*5000,i*5000+4000)));
  const units=semanticUnits(source);assert.ok(units.every(u=>u.cues.length<=4&&u.end-u.start<=20000&&u.text.length<=480));
  assert.equal(semanticUnits(doc([cue('Hello.',0,1000),cue('New subject.',3000,4000)])).length,2);
  assert.equal(semanticUnits(doc([cue('This completed sentence is deliberately longer than sixty characters.',0,4000),cue('Another topic.',4100,6000)])).length,2);
 });
 it('groups Japanese sentence fragments without introducing spaces inside words',()=>{
  const units=semanticUnits(doc([cue('最後に判断',0,2000),cue('するのはあなたです。',2000,4000)]));assert.equal(units[0].text,'最後に判断するのはあなたです。');
 });
 it('passes original names, numbers, negatives, dates and technical terms unchanged',()=>{
  const text='Maya uses Adobe Premiere Pro and After Effects. Do not delete the 12 clips dated 2026-10-10.';
  const units=semanticUnits(doc([cue(text.slice(0,47),0,4000),cue(text.slice(48),4100,8000)]));assert.equal(units.map(u=>u.text).join(' '),text);
 });
 it('rejects invalid source timelines and oversized source cues before translation',()=>{
  for(const cues of [[cue('text',null,2000)],[cue('text',1000,1000)],[cue('one',0,2000),cue('two',1000,3000)],[cue('x'.repeat(1201),0,2000)]])assert.throws(()=>semanticUnits(doc(cues)));
 });
});
describe('localized target segmentation within source time envelopes',()=>{
 const source=doc([cue("We'll see,",10000,12000),cue('and in the end,',12000,14000),cue("you're going to be the judge, right?",14000,18000),cue('Another topic.',22000,24000)]);
 it('redistributes target grammar only inside the active thought, preserving unrelated timing',()=>{
  const units=semanticUnits(source),result=localizedDocument(source,units,units.map((unit,index)=>({id:unit.id,text:['دیکھتے ہیں، آخر میں فیصلہ تو آپ ہی نے کرنا ہے، ہے نا؟','موضوع آخر.'][index]})),'ur').document;
  const first=result.cues.filter(c=>c.start<18000);assert.equal(first[0].start,10000);assert.equal(first.at(-1).end,18000);assert.ok(first.every(c=>c.start>=10000&&c.end<=18000));
  assert.equal(result.cues.at(-1).start,22000);assert.equal(result.cues.at(-1).end,24000);assert.deepEqual(source.cues.map(c=>c.text),["We'll see,",'and in the end,',"you're going to be the judge, right?",'Another topic.']);
 });
 it('retains original timings when the localized text fits those cues comfortably',()=>{
  const single=semanticUnits(doc([cue('Hello.',10000,13000)]))[0];const out=localizeUnit(single,'Hola.','es');assert.deepEqual(out.cues.map(c=>[c.start,c.end]),[[10000,13000]]);
 });
 it('preserves all text, complete names and dates while producing readable subtitles',()=>{
  const unit=semanticUnits(doc([cue('Technical source thought.',0,18000)]))[0];
  const text='Maya uses Adobe Premiere Pro and After Effects for motion graphics. Do not delete the 12 clips dated 2026-10-10.';
  const out=localizeUnit(unit,text,'en');assert.equal(out.cues.map(c=>c.text).join(' ').replace(/\s+/g,' '),text);assert.ok(out.cues.some(c=>c.text.includes('Adobe Premiere Pro')));assert.ok(out.cues.some(c=>c.text.includes('2026-10-10')));
  assert.ok(out.cues.every(c=>c.end-c.start>=900));assert.equal(out.cues.at(-1).end,18000);
 });
 it('handles Japanese graphemes and Arabic-script text without compatibility markup',()=>{
  const unit=semanticUnits(doc([cue('A complete thought.',0,12000)]))[0];
  for(const [lang,text]of [['ja','まだ決めていません。最後に判断するのはあなたです。名前や数字を変更しないでください。'],['ar','هي مهندسة وليست طبيبة. سيقررون غدًا، أليس كذلك؟'],['ur','دیکھتے ہیں، آخر میں فیصلہ آپ ہی نے کرنا ہے، ہے نا؟']]){
   const out=localizeUnit(unit,text,lang);assert.equal(out.cues.map(c=>c.text).join(lang==='ja'?'':' ').replace(/\s+/gu,''),text.replace(/\s+/gu,''));assert.ok(out.cues.every(c=>!/[<>]|\uFFFD/u.test(c.text)));
   const d={...emptyEditor(),cues:out.cues};assert.equal(parseSrt(captionExport(d,'srt').content).cues.length,out.cues.length);assert.equal(parseVtt(captionExport(d,'vtt').content).cues.length,out.cues.length);
  }
 });
 it('flags impossible reading speeds rather than dropping text or extending source timing',()=>{
  const unit=semanticUnits(doc([cue('A thought.',0,1000)]))[0],text='This very detailed subtitle contains far too many words to read in a single second.';
  const result=localizeUnit(unit,text,'en');assert.equal(result.fast,true);assert.equal(result.cues[0].start,0);assert.equal(result.cues.at(-1).end,1000);assert.equal(result.cues.map(c=>c.text).join(' ').replace(/\s+/g,' '),text);
 });
 it('rejects malformed output and explicitly reports incomplete unit results',()=>{const units=semanticUnits(source);for(const text of ['', '00 --> 01','text\n\ncomment','<script>'])assert.throws(()=>localizeUnit(units[0],text,'es'));assert.equal(localizedDocument(source,units,[{id:units[0].id,text:'Hola'}],'es').failed,1)});
});
