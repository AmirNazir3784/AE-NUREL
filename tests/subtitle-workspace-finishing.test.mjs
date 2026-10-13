import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {segmentSubtitleText} from '../src/features/local-asr/subtitle-segmentation.ts';
import {readableSourceDocument} from '../src/features/local-asr/source-caption-layout.ts';
import {captionReviewHints,processingReviewNotes} from '../src/features/local-asr/caption-review-hints.ts';
import {semanticUnits,localizeUnit,localizedDocument,coverageExportIssues} from '../src/features/local-asr/semantic-localization.ts';
import {emptyEditor,parseVtt} from '../src/lib/subtitle-editor.ts';
import {parseSrt} from '../src/lib/srt.ts';
import {captionExport} from '../src/features/local-asr/asr-core.ts';
import {editorSessionReducer,initialEditorSession} from '../src/features/srt-editor/editor-session.ts';
const compact=text=>text.normalize('NFC').replace(/\s/gu,'');
const cue=(text,start=10000,end=17000,id='source')=>({id,text,start,end,identifier:'',srtSettings:'',vttSettings:''});
const doc=cues=>({...emptyEditor(),filename:'test.srt',cues});

describe('global sentence layout and source boundaries',()=>{
 it('keeps a readable seven-second sentence in one cue instead of duration-forced two cues',()=>{
  const out=localizeUnit(semanticUnits(doc([cue('A sentence.')]))[0],'This sentence is comfortable to read in one caption.','en');
  assert.equal(out.cues.length,1);assert.deepEqual([out.cues[0].start,out.cues[0].end],[10000,17000]);
  const question='Is it possible to master editing A-roll to the point where B-roll becomes optional?';
  assert.equal(segmentSubtitleText(question,'en',4420).texts.length,1,'Do not detach becomes optional from a sentence that fits two lines');
 });
 it('splits a long sentence at clauses, preserves all text and exports stable Unicode SRT/VTT',()=>{
  const text='Although the preview looks smooth on my laptop, please check the exported file on another device before sending it to the client, because the last version dropped several frames near the end.';
  const unit=semanticUnits(doc([cue('Source.',10000,22000)]))[0],out=localizeUnit(unit,text,'en');
  assert.ok(out.cues.length>1);assert.equal(compact(out.cues.map(c=>c.text).join('')),compact(text));
  for(const c of out.cues){assert.ok(c.start>=10000&&c.end<=22000);assert.ok(c.text.split('\n').length<=2)}
  for(const format of ['srt','vtt']){const d=doc(out.cues),raw=captionExport(d,format).content;assert.equal(captionExport(d,format).content,raw);const parsed=(format==='srt'?parseSrt:parseVtt)(raw);assert.deepEqual(parsed.cues.map(c=>[c.start,c.end,c.text]),out.cues.map(c=>[c.start,c.end,c.text]))}
 });
 it('keeps the reported Urdu genitive compound, postposition phrase and suffix on attached lines',()=>{
  const text='آج کے ویڈیو میں، ہم کئی اعلی درجے کی ٹیکنالوجی کا جائزہ لیں گے جو عظیم مواد کے تخلیق کاروں کو ان کے A رول کو اچھے سے مہذب کرنے میں تبدیل کرنے کے لئے استعمال کرتے ہیں.';
  const out=segmentSubtitleText(text,'ur',8120),question=segmentSubtitleText('کیا یہ ممکن ہے کہ ایڈجسٹنگ A-roll کو اس نقطہ تک ماسٹر کریں جہاں B-roll اختیاری ہو جائے گا؟','ur',4420);
  assert.ok(out.texts.some(value=>value.includes('تخلیق کاروں')));
  assert.ok(question.texts.some(value=>value.includes('اس نقطہ تک')));
  assert.ok(!question.texts.flatMap(value=>value.split('\n')).some(line=>line.trim()==='گا؟'));
  assert.equal(compact(out.texts.join('')),compact(text));
  assert.ok(!question.texts.some(value=>/^کریں\b/u.test(value)),'Clause break should precede the relative clause rather than detach the preceding verb');
 });
 const texts={
  ar:'هل يمكن استخدام Adobe Premiere Pro و After Effects لتحرير A-roll و B-roll، مع الحفاظ على التوقيت الصحيح والأرقام 12 و 2026-10-10؟',
  ur:'کیا یہ ممکن ہے کہ اس پروگرام سے A-roll اور B-roll کو بہتر بنائیں، جبکہ تمام الفاظ اور صحیح وقت بھی برقرار رہے گا؟',
  en:'In this video, Maya uses Adobe Premiere Pro and After Effects for A-roll and B-roll; keep the 12 clips dated 2026-10-10.',
  de:'Maya verwendet Adobe Premiere Pro und After Effects für Bewegungsgrafiken; bitte löschen Sie die 12 Clips vom 2026-10-10 nicht.',
  es:'En este vídeo, Maya utiliza Adobe Premiere Pro y After Effects; no elimines los 12 clips del 2026-10-10, ¿de acuerdo?',
  ja:'まだ決めていません。最後に判断するのはあなたです。Adobe Premiere Pro と After Effects を使用します。すべての文字と句読点を残してください。',
 };
 for(const [lang,text]of Object.entries(texts))it('preserves every character and avoids punctuation-only/tiny suffix layouts for '+lang,()=>{
  for(const duration of [450,3000,10000,18000]){
   const out=segmentSubtitleText('… '+text,lang,duration);
   assert.equal(compact(out.texts.join('')),compact('… '+text));
   assert.ok(out.texts.flatMap(value=>value.split('\n')).every(line=>/[\p{L}\p{N}]/u.test(line)));
   assert.ok(out.texts.every(value=>value.split('\n').length<=2));
  }
 });
 it('flags impossible dense speech without dropping text or extending the speech interval',()=>{
  const unit=semanticUnits(doc([cue('Source.',10000,10450)]))[0],text='This very detailed sentence cannot be read comfortably in less than half a second.';
  const out=localizeUnit(unit,text,'en');assert.ok(out.fast);assert.equal(out.cues.length,1);assert.equal(out.cues[0].end,10450);assert.equal(compact(out.cues[0].text),compact(text));assert.ok(captionReviewHints(out.cues[0]).length);
 });
 it('combines source fragments only at actual speech times and does not invent interior timing',()=>{
  const source=doc([cue('This sentence is comfortable',1000,3500,'a'),cue('to read in one caption.',3700,7000,'b')]);
  const out=readableSourceDocument(source,'en');assert.equal(out.cues.length,1);assert.deepEqual([out.cues[0].start,out.cues[0].end],[1000,7000]);
  const ambiguous=doc([cue('First. Second.',1000,4000)]),coarse=readableSourceDocument(ambiguous,'en');assert.equal(coarse.cues.length,1);assert.deepEqual([coarse.cues[0].start,coarse.cues[0].end],[1000,4000]);
  const measured=readableSourceDocument(ambiguous,'en',[{text:'First.',timestamp:[1,2]},{text:'Second.',timestamp:[3,4]}]);assert.deepEqual(measured.cues.map(c=>[c.text,c.start,c.end]),[['First.',1000,2000],['Second.',3000,4000]]);
 });
 it('uses measured word boundaries when a source sentence needs several cues',()=>{
  const text='Although the preview looks smooth on my laptop, please check the exported file on another device before sending it to the client, because the previous version dropped several frames near the end.';
  const words=text.split(' ').map((text,i)=>({text,timestamp:[10+i*.3,10+i*.3+.25]}));
  const source=doc([cue(text,10000,Math.round(words.at(-1).timestamp[1]*1000))]),out=readableSourceDocument(source,'en',words);
  assert.ok(out.cues.length>1);assert.equal(compact(out.cues.map(c=>c.text).join('')),compact(text));
  for(const c of out.cues){assert.ok(words.some(w=>Math.round(w.timestamp[0]*1000)===c.start));assert.ok(words.some(w=>Math.round(w.timestamp[1]*1000)===c.end))}
 });
 it('bounds pathological layout work and retains indivisible identifiers',()=>{
  const text='W'.repeat(7900),out=segmentSubtitleText(text,'de',1000);assert.ok(out.layoutDense);assert.deepEqual(out.texts,[text]);
 });
});

describe('review advisory versus export blocker and editing history',()=>{
 it('groups nonblocking processing notices in plain language without diagnostic internals',()=>{
  assert.deepEqual(processingReviewNotes(['Small word-alignment overlaps were grouped within their measured outer spans.','Model output in a padded context edge was bounded to available audio.','Some localized captions are too dense for comfortable reading.']),['Check caption timing against the recording.']);
  assert.match(processingReviewNotes(['Browser recovery storage is unavailable.'])[0],/Keep this tab open/);
  assert.match(processingReviewNotes(['Accurate could not initialize on this GPU. Retrying the same model on CPU.'])[0],/compatible mode/);
 });
 it('keeps layout advice nonblocking, but blank translations block both export paths',()=>{
  const units=semanticUnits(doc([cue('Source.',10000,10450)])),out=localizedDocument(doc([cue('Source.',10000,10450)]),units,[{id:units[0].id,text:'A long translated sentence that needs a review of its reading time.'}],'en');
  assert.ok(captionReviewHints(out.document.cues[0]).length);assert.deepEqual(coverageExportIssues(out.document,out.ledger),[]);
  const missing=localizedDocument(doc([cue('Source.',10000,10450)]),units,[],'en');assert.ok(coverageExportIssues(missing.document,missing.ledger).length);
  let session={...initialEditorSession,document:missing.document,saved:missing.document};
  session=editorSessionReducer(session,{type:'draft',id:session.document.cues[0].id,field:'text',value:'Corrected translation.'});session=editorSessionReducer(session,{type:'commit'});
  assert.deepEqual(coverageExportIssues(session.document,missing.ledger),[]);
  for(const format of ['srt','vtt'])assert.match(captionExport(session.document,format).content,/Corrected translation/);
  session=editorSessionReducer(session,{type:'undo'});assert.ok(coverageExportIssues(session.document,missing.ledger).length);
  session=editorSessionReducer(session,{type:'redo'});assert.deepEqual(coverageExportIssues(session.document,missing.ledger),[]);
 });
 it('has no benchmark phrase/translation substitutions in segmentation code',async()=>{
  const source=await readFile(new URL('../src/features/local-asr/subtitle-segmentation.ts',import.meta.url),'utf8');
  for(const phrase of ['تخلیق','کاروں','اس نقطہ تک','A-roll','B-roll','judge','spill the beans'])assert.ok(!source.includes(phrase));
 });
});
