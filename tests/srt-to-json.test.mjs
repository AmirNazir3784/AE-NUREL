import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {convertSrtToJson,openSrtToJson} from "../src/lib/srt-to-json.ts";
import {fixture,openFile,cue,bytes} from "./conversion-helpers.mjs";
describe("SRT to JSON",()=>{
  it("exports real cues with exact schema and numeric milliseconds",()=>{
    const out=openFile(openSrtToJson,"normal.srt");assert.equal(out.filename,"normal.json");const data=JSON.parse(out.content);assert.equal(data.length,3);assert.deepEqual(data[0],{index:1,start:"00:00:01,003",end:"00:00:03,507",startMs:1003,endMs:3507,text:"Hello 字幕 مرحبا\nSecond line."});assert.deepEqual(Object.keys(data[0]),["index","start","end","startMs","endMs","text"]);
  });
  it("escapes quotes/backslashes/newlines without losing Unicode",()=>{
    const data=JSON.parse(convertSrtToJson(fixture("normal.srt")).content);assert.equal(data[1].text,'He said "hello". C:\\work');assert.match(convertSrtToJson(fixture("normal.srt")).content,/\\nSecond line/);
  });
  it("pretty prints and generates sequential indexes independent of source numbering",()=>{
    const out=openFile(openSrtToJson,"normal.srt");assert.ok(out.content.startsWith("[\n  {\n"));assert.deepEqual(JSON.parse(out.content).map(c=>c.index),[1,2,3]);
  });
  it("preserves caption markup instead of inventing a new schema",()=>assert.equal(JSON.parse(convertSrtToJson(cue("<b>Hello</b>")).content)[0].text,"<b>Hello</b>"));
  it("rejects malformed/zero-duration input and wrong/empty/oversized files",()=>{
    assert.throws(()=>convertSrtToJson("broken"));assert.throws(()=>convertSrtToJson(cue("A","00:00:01,000","00:00:01,000")));const b=bytes(cue("A"));for(const file of [{name:"a.json",size:b.byteLength},{name:"a.srt",size:0},{name:"a.srt",size:10485761}])assert.throws(()=>openSrtToJson(file,b));
  });
});
