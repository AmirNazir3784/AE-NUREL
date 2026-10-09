import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {convertVttToTxt,openVttToTxt} from "../src/lib/vtt-to-txt.ts";
import {fixture,openFile,bytes} from "./conversion-helpers.mjs";
const cue = text => "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\n"+text+"\n";
describe("VTT to TXT",()=>{
  it("extracts visible words, Unicode, multiline and literal encoded tags",()=>{
    const out=openFile(openVttToTxt,"transcript.vtt");
    assert.equal(out.filename,"transcript.txt");assert.equal(out.cueCount,3);
    assert.equal(out.content,'Hello 字幕 مرحبا Second line & <b>literal</b>.\nHe said "hello". Goodbye.\n漢kan\n');
    assert.doesNotMatch(out.content,/WEBVTT|Alice|lime|Not visible|align:start|first-cue|-->/);
  });
  it("offers a paragraph with the same words",()=>assert.equal(convertVttToTxt(fixture("transcript.vtt"),"a.vtt","paragraph").content,'Hello 字幕 مرحبا Second line & <b>literal</b>. He said "hello". Goodbye. 漢kan\n'));
  it("handles common metadata/settings without leaking them",()=>assert.doesNotMatch(openFile(openVttToTxt,"settings.vtt").content,/STYLE|NOTE|REGION|position:|<v |<c\./));
  it("accepts BOM/CRLF, uppercase extension, safe filename and UTF-16 BOM",()=>{
    const text=cue("Unicode 字幕").replace(/\n/g,"\r\n");
    assert.equal(convertVttToTxt("\uFEFF"+text,"folder/name.VTT").filename,"name.txt");
    const buffer=Buffer.concat([Buffer.from([255,254]),Buffer.from(text,"utf16le")]);assert.equal(openVttToTxt({name:"a.VTT",size:buffer.length},buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.length)).content,"Unicode 字幕\n");
  });
  it("normalizes whitespace and numeric entities",()=>assert.equal(convertVttToTxt(cue("  A\t B &#x1F600;\n C &nbsp; D ")).content,"A B 😀 C D\n"));
  it("rejects malformed headers/times/settings and absent cues",()=>{
    for(const text of ["","not VTT","WEBVTT\n\nNOTE text",fixture("malformed.vtt"),"WEBVTT\n\n00:00:01.000 --> 00:00:03.000 nonsense:x\nA"])assert.throws(()=>convertVttToTxt(text));
  });
  it("rejects empty or markup-only cue text",()=>{assert.throws(()=>convertVttToTxt(cue("")));assert.throws(()=>convertVttToTxt(cue("<b></b>")),/No readable/);});
  it("rejects zero/reversed/out-of-order cue timing",()=>{
    for(const text of [cue("A").replace("03.000","01.000"),cue("A").replace("03.000","00.000"),cue("A")+"\n00:00:00.000 --> 00:00:00.500\nB"])assert.throws(()=>convertVttToTxt(text));
  });
  it("rejects bad inline timestamps and invalid output options",()=>{
    for(const text of ["<00:00:00.500>A","A<00:00:03.000>","A<00:99:01.000>","<00:00:02.000>A<00:00:01.500>B"])assert.throws(()=>convertVttToTxt(cue(text)),/inline timestamp/);
    assert.throws(()=>convertVttToTxt(cue("A"),"a.vtt","random"));
  });
  it("rejects wrong extension, empty/oversized/truncated files and invalid encoding",()=>{
    const b=bytes(cue("A"));for(const file of [{name:"a.srt",size:b.byteLength},{name:"a.vtt",size:0},{name:"a.vtt",size:10485761},{name:"a.vtt",size:b.byteLength+1}])assert.throws(()=>openVttToTxt(file,b));
    assert.throws(()=>openVttToTxt({name:"a.vtt",size:2},Uint8Array.from([255,255]).buffer));
  });
  it("rejects more than 10,000 cues",()=>assert.throws(()=>convertVttToTxt("WEBVTT\n\n"+Array.from({length:10001},()=> "00:00:01.000 --> 00:00:02.000\nA").join("\n\n")),/10,000/));
});
