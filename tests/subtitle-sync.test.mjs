import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_TIMESTAMP_MS, parseSrt } from "../src/lib/srt.ts";
import { emptyEditor, formatEditorTime, parseVtt } from "../src/lib/subtitle-editor.ts";
import { correctionLabel, fixSubtitleSync, initialSyncPoints, mapSyncTime, openSyncSubtitle, parseSyncPoints, serializeSyncResult, syncFilename, SyncValidationError } from "../src/lib/subtitle-sync.ts";

const bytes = (text) => new TextEncoder().encode(text).buffer;
const open = (text, name = "movie.srt") => openSyncSubtitle({ name, size: bytes(text).byteLength }, bytes(text));
const source = (ranges = [[120000,123000],[1864000,1867000],[3608000,3611000]], texts = ["Hello 字幕 مرحبا\nSecond line.","Middle subtitle","Final subtitle"]) => open(ranges.map(([start,end],i)=>`${i*10+8}\n${formatEditorTime(start,"srt")} --> ${formatEditorTime(end,"srt")}\n${texts[i] ?? "Caption"}`).join("\n\n")+"\n");
const drift = { sourceFirst:120000,targetFirst:118000,sourceSecond:3608000,targetSecond:3600000 };
const shift = { sourceFirst:10000,targetFirst:8000,sourceSecond:100000,targetSecond:98000 };
const ranges = (doc) => doc.cues.map(c=>[c.start,c.end]);
const vtt = "WEBVTT Test\n\nNOTE Keep this note\n\nintro\n00:00:02.000 --> 00:00:04.000 align:start position:20%\nHello 字幕 مرحبا\nSecond line.\n\n00:00:10.000 --> 00:00:12.000\nLast subtitle\n";

describe("two-point subtitle correction",()=>{
  it("represents a constant offset with equal corrections",()=>assert.deepEqual(ranges(fixSubtitleSync(source([[10000,12000],[100000,102000]]),shift).document),[[8000,10000],[98000,100000]]));
  it("corrects progressive late drift rather than averaging offsets",()=>assert.deepEqual(ranges(fixSubtitleSync(source(),drift).document),[[118000,120995],[1859000,1861995],[3600000,3602995]]));
  it("corrects progressive early drift",()=>{const t={sourceFirst:10000,targetFirst:12000,sourceSecond:100000,targetSecond:108000}; assert.equal(mapSyncTime(55000,t).time,60000); assert.equal(mapSyncTime(100000,t).time,108000);});
  it("compresses cue durations as well as start times",()=>{const t={sourceFirst:0,targetFirst:0,sourceSecond:10000,targetSecond:5000}; assert.deepEqual(ranges(fixSubtitleSync(source([[2000,4000]]),t).document),[[1000,2000]]);});
  it("expands cue durations as well as start times",()=>{const t={sourceFirst:0,targetFirst:0,sourceSecond:10000,targetSecond:20000}; assert.deepEqual(ranges(fixSubtitleSync(source([[2000,4000]]),t).document),[[4000,8000]]);});
  it("maps the first sync point exactly",()=>assert.equal(mapSyncTime(drift.sourceFirst,drift).time,drift.targetFirst));
  it("maps the second sync point exactly",()=>assert.equal(mapSyncTime(drift.sourceSecond,drift).time,drift.targetSecond));
  it("maps an exact middle point correctly",()=>assert.equal(mapSyncTime(1864000,drift).time,1859000));
  it("rounds every original timestamp independently, with half milliseconds up",()=>{const t={sourceFirst:0,targetFirst:0,sourceSecond:4,targetSecond:2}; assert.deepEqual([1,2,3,4].map(n=>mapSyncTime(n,t).time),[1,1,2,2]);});
  it("handles large integer products without floating-point error",()=>{const t={sourceFirst:1,targetFirst:2,sourceSecond:MAX_TIMESTAMP_MS-2,targetSecond:MAX_TIMESTAMP_MS-1}; assert.equal(mapSyncTime(MAX_TIMESTAMP_MS-3,t).time,MAX_TIMESTAMP_MS-2);});
  it("is deterministic across repeated calculations and does not mutate input",()=>{const doc=source(); const before=JSON.stringify(doc); assert.deepEqual(fixSubtitleSync(doc,drift),fixSubtitleSync(doc,drift)); assert.equal(JSON.stringify(doc),before);});
  it("preserves multiline captions",()=>assert.equal(fixSubtitleSync(source(),drift).document.cues[0].text,"Hello 字幕 مرحبا\nSecond line."));
  it("preserves Unicode and RTL content",()=>assert.equal(fixSubtitleSync(source([[120000,123000]],["مرحبا 世界 café 🎬"]),drift).document.cues[0].text,"مرحبا 世界 café 🎬"));
  it("preserves the non-zero lead-in through the correction",()=>assert.equal(fixSubtitleSync(source(),drift).document.cues[0].start,118000));
  it("keeps unsorted source cues in their original order and samples chronologically",()=>{const doc=source([[3608000,3611000],[1864000,1867000],[120000,123000]],["Last","Middle","First"]); const result=fixSubtitleSync(doc,drift); assert.deepEqual(result.document.cues.map(c=>c.text),["Last","Middle","First"]); assert.deepEqual(result.samples,[2,1,0]);});
  it("supports an identity correction",()=>{const doc=source(); assert.deepEqual(ranges(fixSubtitleSync(doc,{...drift,targetFirst:drift.sourceFirst,targetSecond:drift.sourceSecond}).document),ranges(doc));});
  it("applies the same correction outside the chosen points",()=>assert.equal(mapSyncTime(5000,shift).time,3000));
});

describe("sync-point and output validation",()=>{
  it("rejects identical source times",()=>assert.throws(()=>fixSubtitleSync(source(),{...drift,sourceSecond:drift.sourceFirst}),/must be different/));
  it("rejects reversed source times",()=>assert.throws(()=>fixSubtitleSync(source(),{...drift,sourceSecond:1000}),/later than the first/));
  it("rejects equal or reversed video times",()=>{for(const targetSecond of [118000,1000])assert.throws(()=>fixSubtitleSync(source(),{...drift,targetSecond}),/second correct video time/);});
  it("rejects negative targets",()=>assert.throws(()=>fixSubtitleSync(source(),{...drift,targetFirst:-1}),/valid sync-point times/));
  it("rejects fractional, infinite or out-of-range internal timestamps",()=>{for(const value of [1.25,NaN,Infinity,MAX_TIMESTAMP_MS+1]) assert.throws(()=>fixSubtitleSync(source(),{...drift,sourceFirst:value}),/valid sync-point times/);});
  it("identifies missing first and second points by field",()=>{assert.throws(()=>parseSyncPoints([{current:"",correct:"",cueId:""},{current:"",correct:"",cueId:""}],"srt"),e=>e instanceof SyncValidationError && Object.keys(e.fields).length===4);});
  it("rejects malformed and negative timestamp strings",()=>{for(const value of ["oops","-00:00:01,000","00:60:00,000"]) assert.throws(()=>parseSyncPoints([{current:"00:00:01,000",correct:value,cueId:""},{current:"00:00:10,000",correct:"00:00:09,000",cueId:""}],"srt"),e=>!!e.fields["first-correct"]);});
  it("parses SRT and VTT user times into integer milliseconds",()=>{for(const format of ["srt","vtt"]) assert.deepEqual(parseSyncPoints([{current:formatEditorTime(120000,format),correct:formatEditorTime(118000,format),cueId:"a"},{current:formatEditorTime(3608000,format),correct:formatEditorTime(3600000,format),cueId:"b"}],format),drift);});
  it("clamps negative starts only while preserving valid durations and counts cues",()=>{const result=fixSubtitleSync(source([[1000,4000],[10000,12000]]),shift); assert.deepEqual(ranges(result.document),[[0,2000],[8000,10000]]); assert.equal(result.clampedCues,1);});
  it("counts even a sub-millisecond negative timestamp before rounding",()=>{const t={sourceFirst:1,targetFirst:0,sourceSecond:3,targetSecond:1}; const result=fixSubtitleSync(source([[0,4]]),t); assert.equal(result.clampedCues,1); assert.deepEqual(ranges(result.document),[[0,2]]);});
  it("blocks cues collapsed to zero by clamping",()=>assert.throws(()=>fixSubtitleSync(source([[1000,2000]]),shift),/Cue 1.*no valid duration.*stopping/));
  it("blocks durations collapsed by extreme compression or rounding",()=>assert.throws(()=>fixSubtitleSync(source([[2000,4000]]),{sourceFirst:0,targetFirst:0,sourceSecond:100000,targetSecond:1}),/Cue 1.*rounding/));
  it("blocks timestamp overflow and identifies the cue",()=>assert.throws(()=>fixSubtitleSync(source([[2000,4000]]),{sourceFirst:0,targetFirst:0,sourceSecond:1000,targetSecond:MAX_TIMESTAMP_MS}),/Cue 1.*beyond/));
  it("warns for significant stretching without blocking valid outputs",()=>{const result=fixSubtitleSync(source([[2000,4000]]),{sourceFirst:0,targetFirst:0,sourceSecond:10000,targetSecond:12000}); assert.equal(result.significantChange,true); assert.equal(parseSrt(serializeSyncResult(result)).cues.length,1);});
  it("warns for significant compression and not ordinary drift",()=>{assert.equal(fixSubtitleSync(source([[2000,4000]]),{sourceFirst:0,targetFirst:0,sourceSecond:10000,targetSecond:8000}).significantChange,true); assert.equal(fixSubtitleSync(source(),drift).significantChange,false);});
  it("rejects empty source documents",()=>assert.throws(()=>fixSubtitleSync(emptyEditor(),drift),/at least one cue/));
  it("rejects invalid source durations before attempting correction",()=>{const doc=source(); doc.cues[0].end=doc.cues[0].start; assert.throws(()=>fixSubtitleSync(doc,drift),/Cue 1 has invalid timing/);});
});

describe("sync input, serialization and defaults",()=>{
  it("serializes valid sequential SRT with corrected start/end times",()=>{const result=fixSubtitleSync(source(),drift); const parsed=parseSrt(serializeSyncResult(result)); assert.deepEqual(parsed.cues.map(c=>c.number),["1","2","3"]); assert.deepEqual(ranges(parsed),ranges(result.document));});
  it("preserves VTT format, header, identifiers, notes and settings",()=>{const doc=open(vtt,"movie.vtt"),result=fixSubtitleSync(doc,{sourceFirst:2000,targetFirst:1000,sourceSecond:10000,targetSecond:9000}); const out=serializeSyncResult(result),parsed=parseVtt(out); assert.match(out,/^WEBVTT Test/); assert.equal(result.document.format,"vtt"); assert.equal(parsed.cues[0].identifier,"intro"); assert.equal(parsed.cues[0].vttSettings,"align:start position:20%"); assert.deepEqual(parsed.vttBlocks,doc.vttBlocks); assert.deepEqual(ranges(parsed),[[1000,3000],[9000,11000]]);});
  it("preserves SRT positioning settings",()=>{const doc=open("8\n00:00:02,000 --> 00:00:04,000 X1:10 X2:20 Y1:30 Y2:40\nCaption\n"); assert.match(serializeSyncResult(fixSubtitleSync(doc,{sourceFirst:2000,targetFirst:1000,sourceSecond:4000,targetSecond:3000})),/X1:10 X2:20 Y1:30 Y2:40/);});
  it("handles LF and CRLF for both source formats",()=>{for(const [format,text] of [["srt","1\n00:00:02,000 --> 00:00:04,000\nCaption\n"],["vtt",vtt]]) for(const eol of ["\n","\r\n"]){const doc=open(text.replaceAll("\n",eol),`movie.${format}`); const out=serializeSyncResult(fixSubtitleSync(doc,{sourceFirst:2000,targetFirst:1000,sourceSecond:10000,targetSecond:9000})); assert.equal(out.replaceAll("\r\n","").includes("\n"),eol==="\n");}});
  it("supports UTF-8 BOM and BOM-marked UTF-16 encodings",()=>{assert.equal(open("\uFEFF"+vtt,"movie.vtt").cues.length,2);const le=Buffer.from("\uFEFF"+vtt,"utf16le"),be=Buffer.from(le);for(let i=0;i<be.length;i+=2){const a=be[i];be[i]=be[i+1];be[i+1]=a;}for(const b of [le,be])assert.equal(openSyncSubtitle({name:"movie.vtt",size:b.length},b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)).cues[0].text,"Hello 字幕 مرحبا\nSecond line.");});
  it("rejects wrong type, empty, malformed and no-cue files",()=>{for(const [text,name]of [["Anything","movie.txt"],["","movie.srt"],["14\nBad time\nCaption","movie.srt"],["WEBVTT\n\nNOTE Nothing here","movie.vtt"]])assert.throws(()=>open(text,name));});
  it("rejects oversized input with the established limit",()=>assert.throws(()=>openSyncSubtitle({name:"movie.srt",size:10*1024*1024+1},bytes("")),/10 MB/));
  it("rejects invalid source duration and unsorted VTT with cue context",()=>{assert.throws(()=>open("1\n00:00:02,000 --> 00:00:02,000\nCaption\n"),/Cue 1/);assert.throws(()=>open(vtt.replace("00:00:10.000","00:00:01.000"),"movie.vtt"),/Cue 2.*start-time order/);});
  it("defaults to earliest/latest subtitle starts, even for unsorted SRT",()=>{const doc=source([[3608000,3611000],[120000,123000]]);const points=initialSyncPoints(doc);assert.equal(points[0].current,"00:02:00,000");assert.equal(points[1].current,"01:00:08,000");assert.ok(points.every(p=>p.correct===""));});
  it("uses the end as a second manual suggestion when only one start is available",()=>{const points=initialSyncPoints(source([[2000,4000]]));assert.equal(points[1].current,"00:00:04,000");assert.equal(points[1].cueId,"");});
  it("generates filenames using the source format",()=>{assert.equal(syncFilename(source()),"movie-fixed.srt");assert.equal(syncFilename(open(vtt,"My movie.VTT")),"My movie-fixed.vtt");});
  it("corrects inline VTT timestamp metadata while preserving visible captions",()=>{const doc=open(vtt.replace("Jon","Jon").replace("Hello 字幕 مرحبا","Hello <00:00:03.000>字幕 مرحبا"),"movie.vtt");const result=fixSubtitleSync(doc,{sourceFirst:2000,targetFirst:1000,sourceSecond:10000,targetSecond:9000});assert.equal(result.document.cues[0].text,"Hello <00:00:02.000>字幕 مرحبا\nSecond line.");});
  it("blocks inline VTT times collapsed onto a cue boundary",()=>{const doc=open("WEBVTT\n\n00:00:00.000 --> 00:00:00.020\nA<00:00:00.001>B\n","tiny.vtt");assert.throws(()=>fixSubtitleSync(doc,{sourceFirst:0,targetFirst:0,sourceSecond:10,targetSecond:1}),/inline VTT time/);});
  it("formats concise signed correction labels",()=>{assert.equal(correctionLabel(-2000),"−2.0s");assert.equal(correctionLabel(8000),"+8.0s");assert.equal(correctionLabel(0),"0.0s");});
});
