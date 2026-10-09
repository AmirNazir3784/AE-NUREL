import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {prepareSubtitleVideo,activeCaption,wrapCaption,videoDimensions,openSrtForMp4} from "../src/lib/subtitle-video.ts";
import {fixture,openFile,cue,bytes} from "./conversion-helpers.mjs";
import {videoFixture} from "./mp4-fixtures.mjs";
describe("subtitle video planning",()=>{
  it("prepares real Unicode/multiline input with exact boundaries and duration",()=>{
    const plan=prepareSubtitleVideo(fixture("video.srt"));assert.equal(plan.durationMs,5500);
    for(const time of [0,503,2507,3003,5500])assert.ok(plan.boundaries.includes(time));
    assert.equal(activeCaption(plan,503),"AENural caption video\nHello 字幕 مرحبا");assert.equal(activeCaption(plan,502),"");assert.equal(activeCaption(plan,2507),"");
  });
  it("keeps overlapping captions and source ordering visible",()=>{
    const plan=prepareSubtitleVideo(cue("A","00:00:02,000","00:00:04,000")+"\n2\n00:00:01,000 --> 00:00:03,000\nB");assert.equal(activeCaption(plan,2000),"A\nB");
  });
  it("creates continuous positive sample intervals without timing quantization",()=>{
    const plan=prepareSubtitleVideo(fixture("video.srt"));let duration=0;
    for(let i=0;i<plan.boundaries.length-1;i++){const d=plan.boundaries[i+1]-plan.boundaries[i];assert.ok(d>0&&d<=1000);duration+=d;}
    assert.equal(duration,5500);assert.equal(prepareSubtitleVideo(cue("A","00:00:00,001","00:00:00,002")).durationMs,2);
  });
  it("uses only the two intended sizes/backgrounds",()=>{
    assert.deepEqual(videoDimensions({resolution:"480",background:"black"}),{width:854,height:480});assert.equal(videoDimensions({resolution:"720",background:"white"}).width,1280);
    assert.throws(()=>videoDimensions({resolution:"1080",background:"black"}));assert.throws(()=>videoDimensions({resolution:"480",background:"red"}));
  });
  it("wraps readable words and explicit line breaks",()=>{
    assert.deepEqual(wrapCaption("one two three\nfour",7,t=>t.length),["one two","three","four"]);
  });
  it("wraps unbroken CJK and emoji without breaking graphemes",()=>{
    assert.deepEqual(wrapCaption("字幕字幕",2,t=>[...t].length),["字幕","字幕"]);
    const family="👨‍👩‍👧‍👦";assert.deepEqual(wrapCaption(family+family,1,t=>[...new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(t)].length),[family,family]);
    assert.throws(()=>wrapCaption("A",0,t=>t.length),/cannot fit/);
  });
  it("normalizes styling safely and warns about default styling",()=>{
    const plan=prepareSubtitleVideo(cue("<b>Hello</b> &amp; &lt;literal&gt;"));assert.equal(plan.cues[0].text,"Hello & <literal>");assert.match(plan.warnings.join(" "),/default style/);
  });
  it("rejects timelines over two minutes, over 500 cues and excessive text",()=>{
    assert.throws(()=>prepareSubtitleVideo(cue("A","00:00:00,000","00:02:00,001")),/2 minutes/);
    assert.throws(()=>prepareSubtitleVideo(Array.from({length:501},(_,i)=>String(i+1)+"\n00:00:00,000 --> 00:00:01,000\nA").join("\n\n")),/500 cues/);
    assert.throws(()=>prepareSubtitleVideo(cue("A".repeat(2001))),/too much text/);
  });
  it("accepts a single cue ending exactly at two minutes, preserving its long blank lead-in",()=>{
    const plan=prepareSubtitleVideo(videoFixture(1,120000));
    assert.equal(plan.cues.length,1);assert.equal(plan.durationMs,120000);
    assert.equal(activeCaption(plan,118999),"");assert.match(activeCaption(plan,119000),/AENural/);
    assert.match(activeCaption(plan,119999),/字幕/);assert.equal(activeCaption(plan,120000),"");
  });
  it("identifies the actual timeline problem for a single late cue without blaming cue count",()=>{
    assert.throws(()=>prepareSubtitleVideo(videoFixture(1,120001)),/ends at 2:00\.001.*1 cue is within the 500-cue limit/);
  });
  it("accepts all 500 valid cues within the supported timeline with gaps and the final cue intact",()=>{
    const plan=prepareSubtitleVideo(videoFixture(500,120000));
    assert.equal(plan.cues.length,500);assert.equal(plan.durationMs,120000);
    for (const caption of plan.cues) assert.equal(activeCaption(plan,caption.start),caption.text);
    assert.equal(activeCaption(plan,121),"");assert.equal(activeCaption(plan,119999),plan.cues[499].text);
  });
  it("rejects one-cue and 500-cue five/ten-minute files for duration alone, without retiming",()=>{
    for(const duration of [300000,600000])for(const count of [1,500]){
      const source=videoFixture(count,duration);
      assert.throws(()=>prepareSubtitleVideo(source),new RegExp("ends at "+duration/60000+":00.*"+count+(count===1?" cue is":" cues are")+" within"));
    }
  });
  it("rejects empty/malformed/markup-only/zero-duration input",()=>{
    for(const text of ["",fixture("malformed.srt"),cue("<b></b>"),cue("A","00:00:01,000","00:00:01,000")])assert.throws(()=>prepareSubtitleVideo(text));
  });
  it("validates files and returns a correct MP4 filename without pretending SRT bytes are media",()=>{
    const out=openFile(openSrtForMp4,"video.srt");assert.equal(out.filename,"video.mp4");assert.equal(out.content,fixture("video.srt"));assert.equal(out.cueCount,2);
    const b=bytes(cue("A"));for(const file of [{name:"a.mp4",size:b.byteLength},{name:"a.srt",size:0},{name:"a.srt",size:10485761},{name:"a.srt",size:b.byteLength+1}])assert.throws(()=>openSrtForMp4(file,b));
    assert.throws(()=>openSrtForMp4({name:"a.srt",size:2},Uint8Array.from([255,255]).buffer));
  });
});
