import { describe,it } from "node:test";
import assert from "node:assert/strict";
import { convertVttToSrt,openVttToSrt } from "../src/lib/vtt-to-srt.ts";
import { parseSrt } from "../src/lib/srt.ts";
import { fixture,openFile,bytes } from "./conversion-helpers.mjs";
describe("VTT to SRT",()=>{
  it("converts real multiline/Unicode fixture with generated numbering and exact timing",()=>{
    const out=openFile(openVttToSrt,"normal.vtt");const cues=parseSrt(out.content).cues;
    assert.equal(out.filename,"normal.srt");assert.equal(cues.length,2);assert.deepEqual(cues.map(c=>c.number),["1","2"]);assert.equal(cues[0].end,3500);assert.equal(cues[0].text,"Hello 字幕 مرحبا\nSecond line.");assert.equal(cues[1].text,"<b>Welcome</b> & goodbye.");
  });
  it("drops VTT settings/metadata/voice/class/inline time with a warning",()=>{
    const out=openFile(openVttToSrt,"settings.vtt");assert.equal(parseSrt(out.content).cues[0].text,"Hello world");assert.ok(out.warnings.length);assert.doesNotMatch(out.content,/NOTE|STYLE|region:|<v |<c\.|<00:/);
  });
  it("keeps literal encoded angle brackets and basic emphasis",()=>{
    const out=convertVttToSrt("WEBVTT\n\n00:01.000 --> 00:03.000\n&lt;b&gt; <i>caption</i>\n");
    assert.match(out.content,/&lt;b&gt; <i>caption<\/i>/);
  });
  it("omits ruby pronunciation without duplicating caption words",()=>assert.equal(parseSrt(convertVttToSrt("WEBVTT\n\n00:01.000 --> 00:03.000\n<ruby>漢<rt>kan</rt></ruby>\n").content).cues[0].text,"漢"));
  it("rejects malformed timing fixture and missing header",()=>{
    assert.throws(()=>openFile(openVttToSrt,"malformed.vtt"),/Cue 1/);assert.throws(()=>convertVttToSrt("not WEBVTT\n"),/WEBVTT/);
  });
  it("rejects no cues, zero duration, invalid setting and out-of-order starts",()=>{
    for(const text of ["WEBVTT\n\nNOTE Nothing","WEBVTT\n\n00:01.000 --> 00:01.000\nA","WEBVTT\n\n00:01.000 --> 00:02.000 size:120%\nA","WEBVTT\n\n00:02.000 --> 00:03.000\nA\n\n00:01.000 --> 00:02.000\nB"])assert.throws(()=>convertVttToSrt(text));
  });
  it("rejects inline times outside duration and mismatched portable tags",()=>{
    assert.throws(()=>convertVttToSrt("WEBVTT\n\n00:01.000 --> 00:03.000\nA<00:04.000>B"),/inline/);assert.throws(()=>convertVttToSrt("WEBVTT\n\n00:01.000 --> 00:03.000\n<b>A</i>"),/formatting/);
  });
  it("accepts BOM and CRLF without losing content",()=>assert.equal(convertVttToSrt("\uFEFF"+fixture("normal.vtt").replace(/\n/g,"\r\n")).cueCount,2));
  it("wrong extensions, empty/oversized/truncated bytes cannot convert",()=>{
    const text=fixture("normal.vtt");const b=bytes(text);
    for(const file of [{name:"bad.srt",size:b.byteLength},{name:"empty.vtt",size:0},{name:"huge.vtt",size:10485761},{name:"cut.vtt",size:1}])assert.throws(()=>openVttToSrt(file,b));
  });
});
