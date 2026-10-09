import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {convertSrtToSbv,openSrtToSbv} from "../src/lib/srt-to-sbv.ts";
import {parseSbv,formatSbvTime} from "../src/lib/sbv.ts";
import {convertSbvToSrt} from "../src/lib/sbv-to-srt.ts";
import {parseSrt} from "../src/lib/srt.ts";
import {fixture,openFile,cue,bytes} from "./conversion-helpers.mjs";
describe("SRT to SBV",()=>{
  it("creates valid SBV with Unicode/multiline and no SRT indexes",()=>{
    const out=openFile(openSrtToSbv,"normal.srt"),cues=parseSbv(out.content);
    assert.equal(out.filename,"normal.sbv");assert.equal(out.cueCount,3);
    assert.match(out.content,/^0:00:01\.003,0:00:03\.507\nHello 字幕 مرحبا\nSecond line\./);
    assert.doesNotMatch(out.content,/-->|^\d+$/m);assert.equal(cues[1].text,'He said "hello". C:\\work');
  });
  it("uses correct hour/minute/second/millisecond syntax and bounds",()=>{
    for(const [ms,value] of [[0,"0:00:00.000"],[1,"0:00:00.001"],[3723004,"1:02:03.004"],[359999999,"99:59:59.999"]])assert.equal(formatSbvTime(ms),value);
    for(const value of [-1,0.5,Infinity,360000000])assert.throws(()=>formatSbvTime(value));
  });
  it("round trips exact timings, source order and text through both converters",()=>{
    const source=parseSrt(fixture("normal.srt")).cues;
    const result=parseSrt(convertSbvToSrt(openFile(openSrtToSbv,"normal.srt").content).content).cues;
    assert.deepEqual(result.map(({start,end,text})=>({start,end,text})),source.map(({start,end,text})=>({start,end,text})));
  });
  it("removes known styling and decodes entities with a truthful warning",()=>{
    const out=openFile(openSrtToSbv,"formatted.srt");assert.equal(parseSbv(out.content)[0].text,"Hello   & world\nSecond   line.");assert.match(out.warnings.join(" "),/formatting is removed/);
    assert.equal(parseSbv(convertSrtToSbv(cue("&lt;b&gt;literal&lt;/b&gt;")).content)[0].text,"<b>literal</b>");
  });
  it("warns when SRT positioning is omitted",()=>{
    const out=convertSrtToSbv(cue("A").replace(" --> 00:00:03,000"," --> 00:00:03,000 X1:0 X2:100 Y1:0 Y2:50"));assert.match(out.warnings.join(" "),/positioning/);
  });
  it("retains overlapping/out-of-order source cues without retiming",()=>{
    const text=cue("Later","00:00:02,000","00:00:04,000")+"\n2\n00:00:01,000 --> 00:00:03,000\nEarlier\n";
    assert.deepEqual(parseSbv(convertSrtToSbv(text).content).map(c=>c.text),["Later","Earlier"]);
  });
  it("rejects markup-only text, blank lines after formatting and ambiguous SBV clocks",()=>{
    for(const text of ["<b></b>","A<br><br>B","A\n0:00:03.000,0:00:04.000"])assert.throws(()=>convertSrtToSbv(cue(text)));
  });
  it("rejects malformed/empty/zero-duration SRT",()=>{
    for(const text of ["",fixture("malformed.srt"),cue("A","00:00:01,000","00:00:01,000")])assert.throws(()=>convertSrtToSbv(text));
  });
  it("supports BOM/CRLF/uppercase extension and safe filenames",()=>{
    const text="\uFEFF"+fixture("normal.srt").replace(/\n/g,"\r\n");assert.equal(convertSrtToSbv(text,"folder/name.SRT").filename,"name.sbv");
  });
  it("rejects wrong extension, empty/oversized/truncated files and invalid encoding",()=>{
    const b=bytes(fixture("normal.srt"));for(const file of [{name:"a.sbv",size:b.byteLength},{name:"a.srt",size:0},{name:"a.srt",size:10485761},{name:"a.srt",size:b.byteLength+1}])assert.throws(()=>openSrtToSbv(file,b));
    assert.throws(()=>openSrtToSbv({name:"a.srt",size:2},Uint8Array.from([255,255]).buffer));
  });
  it("rejects more than 10,000 cues",()=>assert.throws(()=>convertSrtToSbv(Array.from({length:10001},(_,i)=>String(i+1)+"\n00:00:01,000 --> 00:00:02,000\nA").join("\n\n")),/10,000/));
});
