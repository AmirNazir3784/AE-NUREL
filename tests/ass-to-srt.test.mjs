import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {convertAssToSrt,openAssToSrt} from "../src/lib/ass-to-srt.ts";
import {parseAss} from "../src/lib/ass-subtitles.ts";
import {parseSrt} from "../src/lib/srt.ts";
import {fixture,openFile,bytes} from "./conversion-helpers.mjs";
const header="[Script Info]\n[Events]\nFormat: Start, End, Text\n";
describe("ASS and SSA to SRT",()=>{
  it("parses real ASS timing, commas, hard breaks and Unicode",()=>{
    const out=openFile(openAssToSrt,"basic.ass");const cues=parseSrt(out.content).cues;assert.equal(out.filename,"basic.srt");assert.equal(cues[0].text,"Hello, world\nSecond line.");assert.equal(cues[0].start,1000);assert.equal(cues[0].end,3500);assert.equal(cues[1].text,"字幕 مرحبا");
  });
  it("supports real SSA Marked records",()=>assert.equal(parseSrt(openFile(openAssToSrt,"basic.ssa").content).cues[0].text,"SSA caption\nSecond line."));
  it("normalizes override tags and warns about unsupported rich styles",()=>{
    const out=openFile(openAssToSrt,"styled.ass");assert.equal(parseSrt(out.content).cues[0].text,"Styled\nSecond line.");assert.equal(parseSrt(out.content).cues[1].text,"字幕 مرحبا");assert.match(out.warnings.join(" "),/styling cannot/);assert.doesNotMatch(out.content,/\\pos|\\k20|\\b1/);
  });
  it("honors arbitrary Format order and commas in a middle Text field",()=>{
    const out=convertAssToSrt("[Script Info]\n[Events]\nFormat: End, Text, Start\nDialogue: 0:00:03.00,Hello, with commas,0:00:01.00");assert.equal(parseSrt(out.content).cues[0].text,"Hello, with commas");
  });
  it("sorts start times stably and describes reordering",()=>{
    const out=convertAssToSrt(header+"Dialogue: 0:00:03.00,0:00:04.00,Later\nDialogue: 0:00:01.00,0:00:02.00,First\nDialogue: 0:00:01.00,0:00:02.00,Second");assert.deepEqual(parseSrt(out.content).cues.map(c=>c.text),["First","Second","Later"]);assert.match(out.warnings.join(" "),/sorted/);
  });
  it("omits drawing-only/comments but keeps text after drawing mode ends",()=>{
    const out=convertAssToSrt(header+"Comment: ignored\nDialogue: 0:00:01.00,0:00:02.00,{\\p1}m 0 0 l 10 10\nDialogue: 0:00:03.00,0:00:04.00,{\\p1}m 0 0{\\p0}Words");assert.equal(out.cueCount,1);assert.equal(parseSrt(out.content).cues[0].text,"Words");assert.match(out.warnings.join(" "),/2 comment/);
  });
  it("rejects malformed Events fixture, duplicate Format and unsupported records",()=>{
    assert.throws(()=>openFile(openAssToSrt,"malformed.ass"),/Format/);assert.throws(()=>parseAss("[Script Info]\n[Events]\nFormat: Start, Start, Text"),/unique/);assert.throws(()=>parseAss(header+"Picture: unsupported"),/Unsupported Events/);
  });
  it("rejects malformed timing, incomplete fields and unmatched overrides",()=>{
    for(const record of ["Dialogue: bad,0:00:03.00,A","Dialogue: 0:00:03.00,0:00:02.00,A","Dialogue: 0:00:01.00","Dialogue: 0:00:01.00,0:00:02.00,{\\b1A"])assert.throws(()=>parseAss(header+record));
  });
  it("rejects no useful cues and wrong/empty/oversized file",()=>{
    assert.throws(()=>parseAss(header+"Dialogue: 0:00:01.00,0:00:02.00,{\\p1}m 0 0"),/No useful/);const b=bytes(fixture("basic.ass"));for(const file of [{name:"bad.srt",size:b.byteLength},{name:"bad.ass",size:0},{name:"bad.ssa",size:10485761}])assert.throws(()=>openAssToSrt(file,b));
  });
});
