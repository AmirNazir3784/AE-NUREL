import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {convertSrtToAss,openSrtToAss} from "../src/lib/srt-to-ass.ts";
import {parseAss,formatAssTime} from "../src/lib/ass-subtitles.ts";
import {openFile,cue,bytes} from "./conversion-helpers.mjs";
describe("SRT to ASS",()=>{
  it("creates valid complete sections/default style and real dialogue",()=>{
    const out=openFile(openSrtToAss,"normal.srt");assert.equal(out.filename,"normal.ass");assert.match(out.content,/\[Script Info\]/);assert.match(out.content,/ScriptType: v4.00\+/);assert.match(out.content,/\[V4\+ Styles\]/);assert.match(out.content,/Style: Default,Arial/);assert.match(out.content,/\[Events\]/);const parsed=parseAss(out.content);assert.equal(parsed.cues.length,3);assert.equal(parsed.cues[0].text,"Hello 字幕 مرحبا\nSecond line.");assert.equal(parsed.cues[1].text,'He said "hello". C:\\work');
  });
  it("converts milliseconds to centiseconds and warns about rounding",()=>{
    const out=convertSrtToAss(cue("A","00:00:01,003","00:00:03,507"));assert.match(out.content,/0:00:01.00,0:00:03.51/);assert.match(out.warnings.join(" "),/nearest 10/);assert.equal(formatAssTime(359999999),"100:00:00.00");
  });
  it("normalizes inline styling without claiming rich styles preserved",()=>{
    const out=openFile(openSrtToAss,"formatted.srt");assert.equal(parseAss(out.content).cues[0].text,"Hello   & world\nSecond   line.");assert.match(out.warnings.join(" "),/formatting is removed/);
  });
  it("rejects unsafe literals instead of executing override syntax",()=>{
    for(const text of ["{\\pos(2,3)}words","Literal {brace}","literal \\N text"])assert.throws(()=>convertSrtToAss(cue(text)),/cannot be preserved safely/);
  });
  it("rejects sub-centisecond collapsed timing and no visible text",()=>{
    assert.throws(()=>convertSrtToAss(cue("A","00:00:00,001","00:00:00,002")),/too short/);assert.throws(()=>convertSrtToAss(cue("<b></b>")),/no useful/);
  });
  it("rejects rounding beyond the maximum supported timeline",()=>assert.throws(()=>convertSrtToAss(cue("A","99:59:59,000","99:59:59,999")),/beyond/));
  it("rejects malformed/empty/wrong extension/oversized inputs",()=>{
    assert.throws(()=>convertSrtToAss("broken"));const b=bytes(cue("A"));for(const file of [{name:"a.ass",size:b.byteLength},{name:"a.srt",size:0},{name:"a.srt",size:10485761}])assert.throws(()=>openSrtToAss(file,b));
  });
});
