import './helpers/auth-dom.mjs';
import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {captionDocument} from '../src/features/local-asr/asr-core.ts';
import {buildStudioAlignment,currentStudioAlignment,studioWordSpans} from '../src/features/caption-studio/studio-alignment.ts';
import {STUDIO_PRESETS,parseStudioStyle,paintStudioCaptions} from '../src/features/caption-studio/studio-core.ts';
const words=[{text:' Hello',timestamp:[.5,1]},{text:' world.',timestamp:[1,1.8]},{text:' Next.',timestamp:[2.3,2.8]}];
const fixture=()=>captionDocument(words,3,'test.wav',true);
const bootstrap=new JSDOM('<html><body></body></html>');globalThis.window=bootstrap.window;globalThis.document=bootstrap.window.document;
const {createRoot}=await import('react-dom/client');
const {StyleControls}=await import('../src/features/caption-studio/style-controls.tsx');

describe('measured word alignment retained through studio editing',()=>{
 it('maps every measured group to exact cue identity/text/envelope and UTF-16 offsets',()=>{const doc=fixture(),a=buildStudioAlignment(doc,words);assert.equal(a.length,2);assert.deepEqual(a[0],{id:doc.cues[0].id,text:'Hello world.',start:500,end:1800,words:[{from:0,to:5,start:500,end:1000},{from:6,to:12,start:1000,end:1800}]});});
 it('switches at actual timestamps and highlights nothing in silence or cue gaps',()=>{const doc=fixture(),a=buildStudioAlignment(doc,words);for(const [time,expected]of [[499,[]],[500,[{from:0,to:5}]],[999,[{from:0,to:5}]],[1000,[{from:6,to:12}]],[1800,[]],[2100,[]]])assert.deepEqual(studioWordSpans([doc.cues[0]],a,time),expected);});
 it('invalidates edited text/timing but preserves untouched cues and restores exact undo snapshots',()=>{const original=fixture(),a=buildStudioAlignment(original,words),edited=structuredClone(original);edited.cues[0].text='Different words.';assert.deepEqual(currentStudioAlignment(edited,a).map(c=>c.id),[original.cues[1].id]);edited.cues[0]={...original.cues[0],start:600};assert.equal(currentStudioAlignment(edited,a).length,1);assert.equal(currentStudioAlignment(original,a).length,2);assert.deepEqual(studioWordSpans(edited.cues,a,700),[]);});
 it('does not invent timing for manual/imported text or accept incomplete source correspondence',()=>{const doc=fixture(),before=structuredClone(doc);assert.deepEqual(buildStudioAlignment(doc,[]),[]);assert.equal(buildStudioAlignment(doc,[words[1],words[2]]).length,1);assert.deepEqual(buildStudioAlignment(doc,[{text:'Hello',timestamp:[null,1]}]),[]);assert.deepEqual(doc,before);});
 it('distinguishes repeated words by exact source offsets, not text lookup guesses',()=>{const input=[{text:'go',timestamp:[0,.3]},{text:'go',timestamp:[.3,.6]},{text:'go.',timestamp:[.6,.9]}],doc=captionDocument(input,1,'x.wav',true),a=buildStudioAlignment(doc,input);assert.deepEqual(studioWordSpans(doc.cues,a,400),[{from:3,to:5}]);});
 it('retains Unicode, mixed RTL/LTR and space-free source offsets without translation substitutions',()=>{for(const text of [['字幕','です。'],['یہ','A-roll','ہے۔'],['مرحبا','AENural']]){const chunks=text.map((word,i)=>({text:word,timestamp:[i*.4,i*.4+.3]})),doc=captionDocument(chunks,2,'unicode.wav',true),a=buildStudioAlignment(doc,chunks);assert.equal(a.length,1);for(const word of a[0].words)assert.ok(doc.cues[0].text.slice(word.from,word.to).length);assert.equal(a[0].words.length,2===text.length?2:3);}});
 it('migrates earlier saved style files while rejecting malformed new settings',()=>{const old={...STUDIO_PRESETS[0]};delete old.wordHighlight;delete old.wordColor;delete old.wordBackground;delete old.wordBackgroundColor;const parsed=parseStudioStyle(JSON.stringify({version:1,style:old}));assert.equal(parsed.wordHighlight,false);assert.equal(parsed.wordColor,'#ffae58');assert.equal(parsed.wordBackground,false);assert.equal(parsed.wordBackgroundColor,'#243f36');for(const change of [{wordHighlight:null},{wordHighlight:'yes'},{wordColor:'url(bad)'},{wordBackground:null},{wordBackground:'yes'},{wordBackgroundColor:'url(bad)'}])assert.throws(()=>parseStudioStyle(JSON.stringify({version:1,style:{...STUDIO_PRESETS[0],...change}})));});
});

function drawing(){
 const layers=[],draws=[],plain=[];
 const ownerDocument={createElement(){const layer={writes:[],fills:[],font:'',fillText(text,x,y){this.writes.push({text,x,y,color:this.fillStyle});},fillRect(x,y,w,h){this.fills.push({x,y,w,h,color:this.fillStyle,operation:this.globalCompositeOperation});}};const canvas={width:0,height:0,getContext:()=>layer};layers.push({layer,canvas});return canvas;}};
 const ctx={canvas:{ownerDocument},letterSpacing:'0px',wordSpacing:'0px',fontKerning:'auto',save(){},restore(){},translate(){},rotate(){},scale(){},beginPath(){},roundRect(){},fill(){},strokeText(){},measureText(text){return {width:Array.from(text).length*10};},fillText(text,x,y){plain.push({text,x,y,color:this.fillStyle});},drawImage(canvas,x,y){draws.push({x,y,width:canvas.width,height:canvas.height,opacity:this.globalAlpha});}};
 return {ctx,layers,draws,plain};
}
describe('shared preview/export highlighting painter',()=>{
 it('renders the complete shaped line once, recolors timed glyphs and applies opacity once',()=>{const doc=fixture(),a=buildStudioAlignment(doc,words),d=drawing(),calls=[],style={...STUDIO_PRESETS[0],wordHighlight:true,wordColor:'#ff1234',opacity:.4};paintStudioCaptions(d.ctx,1920,1080,doc,1100,style,'Arial',false,a,(_,line,from,to)=>{calls.push({line,from,to});return [{left:60,right:120}];});assert.deepEqual(calls,[{line:'Hello world.',from:6,to:12}]);assert.equal(d.layers[0].layer.writes[0].text,'Hello world.');assert.equal(d.layers[0].layer.fills[0].color,'#ff1234');assert.equal(d.layers[0].layer.fills[0].operation,'source-atop');assert.equal(d.draws[0].opacity,.4);assert.equal(d.layers[0].canvas.width,0);assert.equal(d.plain.length,0);});
 it('keeps source timing immutable and draws ordinary captions when no measured spans exist',()=>{const doc=fixture(),before=structuredClone(doc),d=drawing();paintStudioCaptions(d.ctx,1920,1080,doc,1100,{...STUDIO_PRESETS[0],wordHighlight:true},'Arial',false,[],()=>{throw Error('must not measure guessed words');});assert.equal(d.plain.length,1);assert.equal(d.layers.length,0);assert.deepEqual(doc,before);});
 it('maps case expansions and multiple physical bidi fragments without drawing isolated words',()=>{const chunks=[{text:'Straße',timestamp:[0,1]}],doc=captionDocument(chunks,2,'x.wav',true),a=buildStudioAlignment(doc,chunks),d=drawing();let interval;paintStudioCaptions(d.ctx,1920,1080,doc,500,{...STUDIO_PRESETS[0],wordHighlight:true,textCase:'upper'},'Arial',false,a,(_,line,from,to)=>{interval={line,from,to};return [{left:0,right:20},{left:40,right:70}];});assert.deepEqual(interval,{line:'STRASSE',from:0,to:7});assert.equal(d.layers[0].layer.fills.length,2);assert.equal(d.layers[0].layer.writes.length,1);});
 it('places a custom background behind only the measured active word and keeps the original text shaping',()=>{
   const doc=fixture(),a=buildStudioAlignment(doc,words),d=drawing(),rects=[];
   d.ctx.roundRect=(x,y,width,height,radius)=>rects.push({x,y,width,height,radius,color:d.ctx.fillStyle,shadow:d.ctx.shadowColor});
   let rectangles=0;d.ctx.fill=()=>{rectangles++;};
   paintStudioCaptions(d.ctx,1920,1080,doc,1100,{...STUDIO_PRESETS[0],wordHighlight:true,wordBackground:true,wordBackgroundColor:'#b851cc'},'Arial',false,a,()=>[{left:60,right:120}]);
   assert.equal(rectangles,1);assert.equal(rects.length,1);assert.equal(rects[0].color,'#b851cc');
   assert.equal(rects[0].shadow,'transparent');
   assert.equal(d.layers[0].layer.writes[0].text,'Hello world.');
   assert.equal(d.layers[0].layer.fills[0].operation,'source-atop');
 });
 it('renders no word background when disabled or when real timing is unavailable',()=>{
   const doc=fixture(),a=buildStudioAlignment(doc,words);
   for(const [enabled,available] of [[false,true],[true,false]]){
     const d=drawing();let draws=0;d.ctx.fill=()=>{draws++;};
     paintStudioCaptions(d.ctx,1920,1080,doc,1100,{...STUDIO_PRESETS[0],wordHighlight:true,wordBackground:enabled,wordBackgroundColor:'#b851cc'},'Arial',false,available?a:[],()=>[{left:0,right:50}]);
     assert.equal(draws,0);
   }
 });
 it('draws separate physical fragments for bidirectional word ranges, without coloring the full caption',()=>{
   const chunks=[{text:'Straße',timestamp:[0,1]}],doc=captionDocument(chunks,2,'x.wav',true),a=buildStudioAlignment(doc,chunks),d=drawing(),rects=[];
   d.ctx.roundRect=(x,y,width,height)=>rects.push({x,y,width,height});d.ctx.fill=()=>{};
   paintStudioCaptions(d.ctx,1920,1080,doc,500,{...STUDIO_PRESETS[0],wordHighlight:true,wordBackground:true,wordBackgroundColor:'#00af89',textCase:'upper'},'Arial',false,a,()=>[{left:0,right:20},{left:40,right:70}]);
   assert.equal(rects.length,2);assert.ok(rects[0].width<rects[1].width);
   assert.equal(d.layers[0].layer.writes[0].text,'STRASSE');
 });
 it('uses the same alignment in preview/preflight/encoded frames and browser bidi shaping rather than word-width estimates',()=>{const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');assert.equal((read('src/features/caption-studio/studio-media.ts').match(/reducedMotion, alignment\)/g)||[]).length,2);assert.match(read('src/features/caption-studio/caption-studio.tsx'),/preference.matches, usableAlignment/);const shape=read('src/features/caption-studio/studio-text-ranges.ts');assert.match(shape,/range.getClientRects\(\)/);assert.match(shape,/span.textContent = line/);assert.match(shape,/finally \{ span.remove\(\)/);});
});

describe('real style-control interactions',()=>{
 async function exercise(available,task){const dom=new JSDOM('<div id="root"></div>');globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;const root=createRoot(document.querySelector('#root'));let style={...STUDIO_PRESETS[0]};function render(){root.render(React.createElement(StyleControls,{style,disabled:false,wordTimingAvailable:available,onChange:patch=>{style={...style,...patch};render();},onPreset:value=>{style=value;render();},onError:message=>{throw Error(message);}}));}await act(render);try{await task(dom,()=>style);}finally{await act(()=>root.unmount());dom.window.close();}}
 it('makes background color immediately visible and the background switch actually toggles it',()=>exercise(false,async(dom,style)=>{const label=text=>Array.from(document.querySelectorAll('label')).find(el=>el.firstChild.textContent===text);const input=label('Background color').querySelector('input');await act(()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(input,'#aa5500');input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});assert.equal(style().background,true);assert.equal(style().highlight,'#aa5500');const checkbox=Array.from(document.querySelectorAll('label')).find(el=>el.textContent==='Highlight background').querySelector('input');await act(()=>checkbox.click());assert.equal(style().background,false);}));
 it('toggles per-word background independently of the whole-caption highlight',()=>exercise(true,async(dom,style)=>{
   const checkbox=label=>Array.from(document.querySelectorAll('label')).find(el=>el.textContent.trim()===label).querySelector('input');
   const colors=label=>Array.from(document.querySelectorAll('label')).find(el=>el.firstChild.textContent===label).querySelector('input');
   const word=checkbox('Highlight spoken words'),background=checkbox('Background behind active word only');
   assert.equal(background.disabled,true);
   await act(()=>word.click());assert.equal(background.disabled,false);
   await act(()=>background.click());assert.equal(style().wordBackground,true);assert.equal(style().background,false);
   const input=colors('Active word background color');
   await act(()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(input,'#24a06b');input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
   assert.equal(style().wordBackgroundColor,'#24a06b');
   assert.equal(style().highlight,'#187e70');
 }));
 it('shows all premium presets without a hidden gallery and offers a one-click horizontal center action',()=>exercise(false,async(_,style)=>{
   const buttons=Array.from(document.querySelectorAll('button[aria-pressed]'));
   assert.equal(buttons.length,30);
   assert.equal(Array.from(document.querySelectorAll('summary')).some(el=>el.textContent.includes('More styles')),false);
   const center=Array.from(document.querySelectorAll('button')).find(el=>el.textContent==='Center caption horizontally');
   assert.ok(center);
   await act(()=>center.click());
   assert.equal(style().x,50);assert.equal(style().align,'center');
   const font=Array.from(document.querySelectorAll('label')).find(el=>el.firstChild.textContent==='Font');
   assert.ok(Array.from(font.querySelectorAll('option')).some(option=>option.value==='Impact'));
 }));
 it('supports new italic and underline settings without affecting original caption text',()=>exercise(false,async(_,style)=>{
   const labels=['Italic','Underline','Strikethrough'];
   for(const label of labels) {
     const input=Array.from(document.querySelectorAll('label')).find(el=>el.textContent.trim()===label).querySelector('input');
     await act(()=>input.click());
   }
   assert.equal(style().italic,true);assert.equal(style().underline,true);assert.equal(style().strikethrough,true);
 }));
 it('controls spoken-word background opacity independently from the caption background',()=>exercise(true,async(_,style)=>{
   const toggle=(label)=>Array.from(document.querySelectorAll('label')).find(el=>el.textContent.trim()===label).querySelector('input');
   await act(()=>toggle('Highlight spoken words').click());
   await act(()=>toggle('Background behind active word only').click());
   const label=Array.from(document.querySelectorAll('label')).find(el=>el.firstChild.textContent==='Active word background opacity');
   assert.ok(label);
   const input=label.querySelector('input');
   await act(()=>{Object.getOwnPropertyDescriptor(input.ownerDocument.defaultView.HTMLInputElement.prototype,'value').set.call(input,'.4');input.dispatchEvent(new input.ownerDocument.defaultView.Event('input',{bubbles:true}));});
   assert.equal(style().wordBackgroundOpacity,.4);assert.equal(style().background,false);
 }));
 it('enables real word highlighting only with source alignment, rather than a permanently disabled control',async()=>{for(const available of [false,true])await exercise(available,async(_,style)=>{const checkbox=Array.from(document.querySelectorAll('label')).find(el=>el.textContent.trim()==='Highlight spoken words').querySelector('input');assert.equal(checkbox.disabled,!available);await act(()=>checkbox.click());assert.equal(style().wordHighlight,available);});});
});
