import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { captionDocument, captionExport } from '../src/features/local-asr/asr-core.ts';
import { analyzeEditor, exportEditor, parseVtt } from '../src/lib/subtitle-editor.ts';
import { parseSrt } from '../src/lib/srt.ts';
import { editorSessionReducer as reduce, initialEditorSession } from '../src/features/srt-editor/editor-session.ts';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/local-asr/captured-tiny-en-segments.json',import.meta.url),'utf8'));
const make=()=>captionDocument(fixture.output.chunks,fixture.duration,fixture.filename);
describe('Podcast captions review and output',()=>{
 it('converts captured real model segments to valid SRT and VTT preserving the final word',()=>{
  const document=make();assert.equal(document.cues.length,6);assert.equal(analyzeEditor(document.cues).flatMap(i=>i.errors).length,0);
  for(const format of ['srt','vtt']){
   const content=exportEditor(document,format);const parsed=format==='srt'?parseSrt(content):parseVtt(content);
   assert.equal(parsed.cues.length,6);assert.match(parsed.cues.at(-1).text,/lighthouse/i);assert.equal(parsed.cues.at(-1).end,27240);
   assert.equal(captionExport(document,format).filename,'original-speech.'+format);
  }
 });
 it('supports correction, undo and both exports without invoking inference again',()=>{
  const document=make();let state={...initialEditorSession,document,saved:document};
  state=reduce(state,{type:'draft',id:document.cues[0].id,field:'text',value:'Café — corrected 🎬'});state=reduce(state,{type:'commit'});
  assert.match(exportEditor(state.document,'srt'),/Café — corrected 🎬/);assert.match(exportEditor(state.document,'vtt'),/Café — corrected 🎬/);
  state=reduce(state,{type:'undo'});assert.equal(state.document.cues[0].text,document.cues[0].text);
 });
 it('blocks an invalid edited timestamp before output can be downloaded',()=>{
  const document=make();let state={...initialEditorSession,document,saved:document};
  state=reduce(state,{type:'draft',id:document.cues[0].id,field:'end',value:'invalid'});
  assert.throws(()=>exportEditor(state.document,'srt'));assert.throws(()=>exportEditor(state.document,'vtt'));
 });
});
