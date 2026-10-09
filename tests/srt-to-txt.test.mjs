import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {convertSrtToTxt,openSrtToTxt} from "../src/lib/srt-to-txt.ts";
import {fixture,openFile,cue,bytes} from "./conversion-helpers.mjs";
describe("SRT to TXT",()=>{
  it("extracts cue lines without numbers/timestamps, preserving Unicode",()=>{
    const out=openFile(openSrtToTxt,"normal.srt");assert.equal(out.filename,"normal.txt");assert.equal(out.content,'Hello 字幕 مرحبا Second line.\nHe said "hello". C:\\work\nGoodbye.\n');assert.doesNotMatch(out.content,/-->|00:00/);
  });
  it("paragraph option joins readable cue text",()=>assert.equal(convertSrtToTxt(fixture("normal.srt"),"normal.srt","paragraph").content,'Hello 字幕 مرحبا Second line. He said "hello". C:\\work Goodbye.\n'));
  it("cleans known formatting, whitespace and references with truthful warning",()=>{
    const out=openFile(openSrtToTxt,"formatted.srt");assert.equal(out.content,"Hello & world Second line.\n字幕 مرحبا\n");assert.ok(out.warnings.length);
  });
  it("retains meaningful literal angle brackets and unknown text",()=>assert.equal(convertSrtToTxt(cue("2 < 3 and <speaker>")).content,"2 < 3 and <speaker>\n"));
  it("rejects markup-only text, malformed SRT, zero duration and invalid option",()=>{
    assert.throws(()=>convertSrtToTxt(cue("<b></b>")),/No readable/);assert.throws(()=>convertSrtToTxt("broken"));assert.throws(()=>convertSrtToTxt(cue("A","00:00:01,000","00:00:01,000")));assert.throws(()=>convertSrtToTxt(cue("A"),"a.srt","random"));
  });
  it("rejects wrong extension/empty/oversized/invalid encoding",()=>{
    const b=bytes(cue("A"));for(const file of [{name:"bad.txt",size:b.byteLength},{name:"a.srt",size:0},{name:"a.srt",size:10485761}])assert.throws(()=>openSrtToTxt(file,b));
    assert.throws(()=>openSrtToTxt({name:"bad.srt",size:2},Uint8Array.from([255,255]).buffer));
  });
});
