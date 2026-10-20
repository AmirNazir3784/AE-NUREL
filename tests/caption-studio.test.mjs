import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyEditor,openSubtitle,exportEditor} from '../src/lib/subtitle-editor.ts';
import {STUDIO_PRESETS,STUDIO_LIMITS,validateStudioFile,validateStudioMedia,validateStudioStyle,parseStudioStyle,studioIssues,activeStudioCues,splitStudioCue,mergeStudioCue,paintStudioCaptions,studioFilename,studioPlacement} from '../src/features/caption-studio/studio-core.ts';
const bytes=readFileSync(new URL('./fixtures/conversions/normal.srt',import.meta.url));
const fixture=()=>openSubtitle({name:'normal.srt',size:bytes.length},bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const style=()=>({...STUDIO_PRESETS[0]});
function canvas(){
 const writes=[],transforms=[],rects=[];const context={letterSpacing:'0px',wordSpacing:'0px',save(){},restore(){},translate(...args){transforms.push(args);},rotate(v){this.angle=v;},scale(x,y){this.scaleValue=[x,y];},beginPath(){},roundRect(...args){rects.push({args,color:this.fillStyle});},fill(){},strokeText(){},fillText(text,x,y){writes.push({text,x,y,color:this.fillStyle,font:this.font,direction:this.direction,alpha:this.globalAlpha,shadow:this.shadowColor,spacing:this.letterSpacing});},measureText(text){const size = Number(this.font.match(/(\d+(?:\.\d+)?)px\b/)?.[1]);return {width:Array.from(text).length*size*.48};}};return {context,writes,transforms,rects};
}
describe('Caption Studio integrity and safety',()=>{
 it('retains the real subtitle parser/exporter including Unicode and exact timing',()=>{const doc=fixture();assert.deepEqual(studioIssues(doc,21.376),[]);for(const ext of ['srt','vtt']){const text=exportEditor(doc,ext),data=new TextEncoder().encode(text),opened=openSubtitle({name:'captions.'+ext,size:data.length},data.buffer);assert.deepEqual(opened.cues.map(c=>[c.start,c.end,c.text]),doc.cues.map(c=>[c.start,c.end,c.text]));}});
 it('reports empty, invalid, out-of-video and excessive source content without deleting it',()=>{assert.ok(studioIssues(emptyEditor(),10).length);const doc=fixture();doc.cues[0].end=30_000;assert.match(studioIssues(doc,10).join(' '),/after your video/);doc.cues[0].start=null;assert.match(studioIssues(doc,10).join(' '),/Check text and timing/);assert.equal(doc.cues.length,3);const many={...fixture(),cues:Array.from({length:501},()=>fixture().cues[0])};assert.match(studioIssues(many,21).join(' '),/500/);});
 it('enforces bounded local upload/container/codec preparation policy',()=>{validateStudioFile({name:'video.mp4',size:100,type:'video/mp4'});for(const file of [{name:'empty.mp4',size:0,type:'video/mp4'},{name:'fake.txt',size:10,type:'video/mp4'},{name:'bad.mp4',size:10,type:'text/html'},{name:'huge.webm',size:STUDIO_LIMITS.bytes+1,type:'video/webm'}])assert.throws(()=>validateStudioFile(file));});
 it('supports portrait dimensions and rejects invalid duration, oversized frames and multiple audio tracks',()=>{const media={width:1080,height:1920,duration:20,audioTracks:1,videoCodec:'avc',audioCodec:'aac'};validateStudioMedia(media);for(const change of [{duration:121},{duration:NaN},{width:3840},{audioTracks:2},{width:0}])assert.throws(()=>validateStudioMedia({...media,...change}));});
 it('keeps start-inclusive/end-exclusive cue timing and float-exact seeks',()=>{const doc=fixture();assert.equal(activeStudioCues(doc,1.003*1000)[0].id,doc.cues[0].id);assert.equal(activeStudioCues(doc,3507).length,0);assert.equal(activeStudioCues(doc,900).length,0);});
 it('splits only at explicit text and playhead boundaries, preserving every word and neighboring cue',()=>{const doc=fixture(),original=structuredClone(doc);const cursor=doc.cues[0].text.indexOf('Second');const split=splitStudioCue(doc,doc.cues[0].id,2000,cursor,'split');assert.deepEqual(split.cues.slice(0,2).map(c=>[c.start,c.end]),[[1003,2000],[2000,3507]]);assert.equal(split.cues.slice(0,2).map(c=>c.text).join('\n'),original.cues[0].text);assert.deepEqual(split.cues[2],original.cues[1]);assert.deepEqual(doc,original);assert.throws(()=>splitStudioCue(doc,doc.cues[0].id,1000,cursor,'x'));assert.throws(()=>splitStudioCue(doc,doc.cues[0].id,2000,2,'x'));});
 it('merges only the requested pair and keeps their text and timing envelope',()=>{const doc=fixture(),merged=mergeStudioCue(doc,doc.cues[0].id);assert.equal(merged.cues[0].text,doc.cues[0].text+'\n'+doc.cues[1].text);assert.deepEqual([merged.cues[0].start,merged.cues[0].end],[1003,7450]);assert.deepEqual(merged.cues[1],doc.cues[2]);assert.throws(()=>mergeStudioCue(doc,doc.cues[2].id));});
 it('produces language-neutral output names',()=>{assert.equal(studioFilename('動画.final.mov','mp4'),'動画.final-captioned.mp4');assert.equal(studioFilename('فيديو.webm','vtt'),'فيديو-captioned.vtt');});
});
describe('real caption style settings, without word timing guesses',()=>{
 it('has 30 valid, distinct caption presets',()=>{assert.equal(STUDIO_PRESETS.length,30);for(const preset of STUDIO_PRESETS)validateStudioStyle(preset);assert.equal(new Set(STUDIO_PRESETS.map(preset=>JSON.stringify({...preset,preset:undefined}))).size,30);});
 it('round-trips custom style files and rejects invalid values/unknown fonts/executable colors',()=>{const custom={...style(),size:8.3,rotation:-8,shadowBlur:80,background:true};assert.deepEqual(parseStudioStyle(JSON.stringify({version:1,style:custom})),custom);for(const change of [{font:'javascript:alert(1)'},{color:'url(bad)'},{size:Infinity},{maxLines:2.5},{opacity:-1},{background:'yes'}])assert.throws(()=>validateStudioStyle({...style(),...change}));for(const input of ['{}','bad','x'.repeat(32769)])assert.throws(()=>parseStudioStyle(input));});
 it('draws all Unicode text without altering the caption document',()=>{const doc=fixture(),before=structuredClone(doc),c=canvas();paintStudioCaptions(c.context,1920,1080,doc,1500,style(),'Arial',false);assert.equal(c.writes.map(x=>x.text).join('\n'),doc.cues[0].text);assert.deepEqual(doc,before);});
 it('uses RTL context for Arabic-script leading text and no phrase replacements',()=>{const doc=fixture();doc.cues[0].text='مرحبا بالعالم';const c=canvas();paintStudioCaptions(c.context,1920,1080,doc,1500,style(),'Arial',false);assert.equal(c.writes[0].direction,'rtl');assert.equal(c.writes[0].text,'مرحبا بالعالم');});
 it('applies typography, background, outline, shadow and position settings to the real painter',()=>{const doc=fixture(),s={...style(),weight:800,background:true,backgroundOpacity:.5,highlight:'#f08020',x:0,y:20,rotation:10,letterSpacing:4,color:'#abc123',opacity:.8,shadowColor:'#123456',shadowOpacity:1};const c=canvas();paintStudioCaptions(c.context,1920,1080,doc,1500,s,'Arial',false);assert.match(c.writes[0].font,/^800 /);assert.equal(c.writes[0].color,'#abc123');assert.equal(c.writes[0].alpha,.8);assert.equal(c.writes[0].shadow,'#123456ff');assert.equal(c.rects[0].color,'#f0802080');assert.ok(c.context.angle>0);assert.ok(c.transforms[0][0]<960);});
 it('re-centers Broadcast and resets horizontal origin on selecting a placement',()=>{
   const broadcast=STUDIO_PRESETS.find(p=>p.preset==='Broadcast');
   assert.equal(broadcast.x,50);
   assert.equal(studioPlacement({...broadcast,x:0},'middle').x,50);
   assert.equal(studioPlacement({...broadcast,x:0},'middle').y,50);
   assert.equal(studioPlacement({...broadcast,x:10},'top').y,18);
   assert.equal(studioPlacement({...broadcast,x:10},'bottom').y,84);
   assert.equal(studioPlacement({...broadcast,x:10},'custom').x,10);
 });
 it('adds premium font options and validates new decorations and active-word opacity',()=>{
   const s=style();
   for(const font of ['Impact','Arial Black','Trebuchet MS','Segoe UI','Consolas','Palatino Linotype'])validateStudioStyle({...s,font});
   validateStudioStyle({...s,italic:true,underline:true,strikethrough:true,wordBackgroundOpacity:0});
   assert.throws(()=>validateStudioStyle({...s,italic:'yes'}));
   assert.throws(()=>validateStudioStyle({...s,underline:null}));
   assert.throws(()=>validateStudioStyle({...s,strikethrough:1}));
   assert.throws(()=>validateStudioStyle({...s,wordBackgroundOpacity:2}));
   const legacy={...s};delete legacy.italic;delete legacy.underline;delete legacy.strikethrough;delete legacy.wordBackgroundOpacity;
   const migrated=parseStudioStyle(JSON.stringify({version:1,style:legacy}));
   assert.equal(migrated.italic,false);assert.equal(migrated.underline,false);
   assert.equal(migrated.strikethrough,false);assert.equal(migrated.wordBackgroundOpacity,.9);
 });
 it('paints italic, underline and strikethrough in the same canvas used for export',()=>{
   const s={...style(),italic:true,underline:true,strikethrough:true},c=canvas(),rects=[];
   c.context.fillRect=(...args)=>rects.push({args,color:c.context.fillStyle});
   paintStudioCaptions(c.context,1920,1080,fixture(),1500,s,'Arial',false);
   assert.match(c.writes[0].font,/^italic /);
   // Fixture wraps onto two lines: underline and strikethrough on each.
   assert.equal(rects.length,4);
   for (const line of [0, 1]) {
     const underline = rects[line * 2], strike = rects[line * 2 + 1];
     assert.ok(underline.args[2] > 0 && strike.args[2] > 0);
     assert.equal(underline.args[0], strike.args[0]);
     assert.equal(underline.args[2], strike.args[2]);
     assert.ok(underline.args[1] > strike.args[1]);
   }
 });
 it('renders true chromatic glitch offsets and a progressive typewriter clip without changing caption text',()=>{
   const doc=fixture();
   const first=doc.cues[0].start+1;
   const glitch=canvas(),base={...style(),motionDuration:600,animation:'glitch'};
   paintStudioCaptions(glitch.context,1920,1080,doc,first,base,'Arial',false);
   assert.ok(glitch.writes.length>1,'glitch draws transient red/cyan ghost text');
   assert.ok(doc.cues[0].text.includes(glitch.writes.at(-1).text));
   const still=canvas();
   paintStudioCaptions(still.context,1920,1080,doc,first,base,'Arial',true);
   assert.equal(still.writes.map(x=>x.text).join('\\n'),doc.cues[0].text,'reduced motion disables glitch duplicates');
   const reveal=canvas(),clips=[],rectangles=[];
   reveal.context.rect=(...args)=>rectangles.push(args);
   reveal.context.clip=()=>clips.push(true);
   paintStudioCaptions(reveal.context,1920,1080,doc,first,{...style(),animation:'typewriter',motionDuration:600},'Arial',false);
   assert.equal(clips.length,1);assert.equal(rectangles.length,1);
   assert.ok(rectangles[0][2]>0 && rectangles[0][2]<1920);
   assert.equal(reveal.writes.map(x=>x.text).join('\\n'),doc.cues[0].text);
 });
 it('reports impossible layouts instead of truncating text',()=>{const doc=fixture();doc.cues[0].text='This is a very long caption. '.repeat(100);assert.throws(()=>paintStudioCaptions(canvas().context,1920,1080,doc,1500,style(),'Arial',false),/cannot fit/);assert.ok(doc.cues[0].text.endsWith('caption. '));});
 it('respects reduced motion and leaves source speech times immutable',()=>{const doc=fixture(),s={...style(),animation:'pop'};const animated=canvas(),still=canvas();paintStudioCaptions(animated.context,1920,1080,doc,1004,s,'Arial',false);paintStudioCaptions(still.context,1920,1080,doc,1004,s,'Arial',true);assert.ok(animated.context.scaleValue[0]<1);assert.equal(still.context.scaleValue[0],1);assert.equal(doc.cues[0].start,1003);});
 it('keeps the customer route development-only, explicit generation modes and local rendering',()=>{const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');assert.match(read('src/app/tools/auto-caption-generator/page.tsx'),/NODE_ENV !== "development"\) notFound\(\)/);const source=read('src/features/caption-studio/caption-studio.tsx');assert.doesNotMatch(source,/fetch\(|setInterval/);assert.match(source,/<GenerationControls/);assert.match(source,/transcribeStudioOnDevice/);assert.doesNotMatch(read('src/features/caption-studio/studio-media.ts'),/fetch\(|renderMp4|ffmpeg/);});
});
