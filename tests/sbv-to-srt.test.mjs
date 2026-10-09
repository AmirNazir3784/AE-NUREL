import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {parseSbv,parseSbvTime} from "../src/lib/sbv.ts";
import {convertSbvToSrt,openSbvToSrt} from "../src/lib/sbv-to-srt.ts";
import {parseSrt} from "../src/lib/srt.ts";
import {fixture,openFile,bytes} from "./conversion-helpers.mjs";
describe("SBV to SRT",()=>{
  it("converts real Unicode/multiline SBV with sequential SRT numbers",()=>{
    const out=openFile(openSbvToSrt,"youtube.sbv"),cues=parseSrt(out.content).cues;
    assert.equal(out.filename,"youtube.srt");assert.equal(out.cueCount,3);assert.deepEqual(cues.map(c=>c.number),["1","2","3"]);
    assert.equal(cues[0].text,"Hello 字幕 مرحبا\nSecond line.");assert.equal(cues[1].text,'He said "hello". C:\\work');assert.equal(cues[2].start,3723004);assert.equal(cues[2].end,3724999);
    assert.match(out.content,/00:00:01,003 --> 00:00:03,507/);
  });
  it("parses hour/minute/second/millisecond boundaries exactly",()=>{
    assert.equal(parseSbvTime("0:00:00.001"),1);assert.equal(parseSbvTime("01:02:03.004"),3723004);assert.equal(parseSbvTime("99:59:59.999"),359999999);
  });
  it("supports BOM, CRLF, extra blank lines and whitespace separators",()=>{
    const text="\uFEFF"+fixture("youtube.sbv").replace(/\n\n/g,"\n \t\n\n").replace(/\n/g,"\r\n");
    assert.equal(parseSbv(text).length,3);assert.equal(convertSbvToSrt(text,"folder/FILE.SBV").filename,"FILE.srt");
  });
  it("accepts multiple consecutive whitespace-only blank lines",()=>{
    const text=fixture("youtube.sbv").replace(/\n\n/g,"\n \t\n \t\n\n");
    assert.equal(parseSbv(text).length,3);
    assert.equal(convertSbvToSrt(text).content,convertSbvToSrt(fixture("youtube.sbv")).content);
  });
  it("preserves source cue ordering and overlap without inventing corrections",()=>{
    const cues=parseSrt(convertSbvToSrt("0:00:02.000,0:00:04.000\nA\n\n0:00:01.000,0:00:03.000\nB").content).cues;assert.deepEqual(cues.map(c=>c.text),["A","B"]);
  });
  it("rejects malformed clocks, precision, negative times and unsupported headers",()=>{
    for(const text of [fixture("malformed.sbv"),"00:01.000,00:02.000\nA","-1:00:00.000,0:00:02.000\nA","0:00:01.00,0:00:03.000\nA","[INFORMATION]\n[END INFORMATION]\n\n0:00:01.000,0:00:03.000\nA"])assert.throws(()=>convertSbvToSrt(text));
  });
  it("rejects empty files, absent text, reversed/zero durations and unreadable characters",()=>{
    for(const text of [" \n","0:00:01.000,0:00:03.000","0:00:01.000,0:00:01.000\nA","0:00:03.000,0:00:01.000\nA","0:00:01.000,0:00:03.000\nA\0"])assert.throws(()=>parseSbv(text));
  });
  it("rejects missing blank-line cue separation",()=>assert.throws(()=>parseSbv("0:00:01.000,0:00:02.000\nA\n0:00:03.000,0:00:04.000\nB"),/blank line/));
  it("rejects wrong extension, empty/oversized/truncated bytes and invalid encoding",()=>{
    const b=bytes(fixture("youtube.sbv"));for(const file of [{name:"a.srt",size:b.byteLength},{name:"a.sbv",size:0},{name:"a.sbv",size:10485761},{name:"a.sbv",size:b.byteLength+1}])assert.throws(()=>openSbvToSrt(file,b));
    assert.throws(()=>openSbvToSrt({name:"a.sbv",size:2},Uint8Array.from([255,255]).buffer));
  });
  it("accepts uppercase extension and UTF-16 BOM without altering Unicode",()=>{
    const buffer=Buffer.concat([Buffer.from([255,254]),Buffer.from(fixture("youtube.sbv"),"utf16le")]);assert.equal(openSbvToSrt({name:"a.SBV",size:buffer.length},buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.length)).cueCount,3);
  });
  it("rejects more than 10,000 cues",()=>assert.throws(()=>parseSbv(Array.from({length:10001},()=> "0:00:01.000,0:00:02.000\nA").join("\n\n")),/10,000/));
});
