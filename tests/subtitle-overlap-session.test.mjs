import assert from "node:assert/strict";
import { describe,it } from "node:test";
import { emptyEditor } from "../src/lib/subtitle-editor.ts";
import { detectOverlaps, openOverlapSubtitle } from "../src/lib/subtitle-overlap.ts";
import { activeOverlapDocument, initialOverlapSession,overlapSessionReducer as reduce, serializeOverlapSession } from "../src/features/subtitle-overlap-fixer/session.ts";
const document=(filename="movie.srt")=>({...emptyEditor(),filename,cues:[[5000,8500],[8000,11000]].map(([start,end],i)=>({id:String(i),start,end,text:"Caption",srtSettings:"",vttSettings:"",identifier:""}))});
const loaded=()=>reduce(reduce(initialOverlapSession,{type:"read",id:1}),{type:"ready",id:1,source:{document:document(),size:100}});
const fixed=()=>reduce(loaded(),{type:"fix"});
describe("overlap repair sessions",()=>{
  it("scans immediately on load with defaults and no premature errors",()=>{const s=loaded();assert.equal(s.issues.length,1);assert.equal(s.gap,"0.1");assert.equal(s.mode,"shorten");assert.equal(s.result,null);assert.equal(s.error,"");});
  it("fixes only after explicit action",()=>assert.equal(fixed().result.document.cues[0].end,7900));
  it("undo restores original timing with one level of history",()=>{const s=reduce(fixed(),{type:"undo"});assert.equal(s.result,null);assert.equal(s.source.document.cues[0].end,8500);assert.match(s.message,/Original/);});
  it("changing mode invalidates previous output",()=>{const s=reduce(fixed(),{type:"mode",mode:"move"});assert.equal(s.result,null);assert.equal(reduce(s,{type:"fix"}).result.document.cues[1].start,8600);});
  it("changing gap clears output and download state",()=>{const s=reduce(reduce(fixed(),{type:"download",filename:"movie-fixed.srt"}),{type:"gap",value:"0.5"});assert.equal(s.result,null);assert.equal(s.downloaded,false);assert.equal(s.message,"");assert.equal(reduce(s,{type:"fix"}).result.document.cues[0].end,7500);});
  it("exclusion toggle clears output and remains reviewable",()=>{const s=reduce(fixed(),{type:"exclude",index:0});assert.equal(s.result,null);assert.deepEqual(s.excluded,[0]);assert.equal(reduce(s,{type:"fix"}).result.remaining.length,1);assert.deepEqual(reduce(s,{type:"exclude",index:0}).excluded,[]);});
  it("invalid gap yields plain error with no output",()=>{const s=reduce(reduce(loaded(),{type:"gap",value:"-1"}),{type:"fix"});assert.match(s.error,/gap/);assert.equal(s.result,null);});
  it("replacement immediately clears previous analysis, exclusions and fixes",()=>{const s=reduce(reduce(fixed(),{type:"exclude",index:0}),{type:"read",id:2});assert.equal(s.source,null);assert.equal(s.issues.length,0);assert.equal(s.result,null);assert.deepEqual(s.excluded,[]);assert.equal(s.busy,true);const next=reduce(s,{type:"ready",id:2,source:{document:document("new.srt"),size:120}});assert.equal(next.source.document.filename,"new.srt");assert.equal(next.gap,"0.1");});
  it("Start over clears every field",()=>assert.deepEqual(reduce(reduce(fixed(),{type:"download",filename:"x.srt"}),{type:"reset",id:10}),{...initialOverlapSession,requestId:10}));
  it("stale successes and failures cannot restore a replaced/reset session",()=>{for(const state of[reduce(loaded(),{type:"read",id:2}),reduce(fixed(),{type:"reset",id:3})])for(const action of[{type:"ready",id:1,source:{document:document(),size:100}},{type:"failed",id:1,message:"old error"}])assert.equal(reduce(state,action),state);});
  it("invalid replacement does not leak previous data",()=>{const s=reduce(reduce(fixed(),{type:"read",id:2}),{type:"failed",id:2,message:"bad.vtt: malformed"});assert.equal(s.source,null);assert.equal(s.result,null);assert.equal(s.busy,false);assert.match(s.error,/bad.vtt/);});
  it("preflight upload rejection clears the previous session and invalidates stale reads",()=>{const s=reduce(fixed(),{type:"upload-error",id:2,message:"Choose an .srt or .vtt subtitle file."});assert.equal(s.source,null);assert.equal(s.result,null);assert.equal(s.issues.length,0);assert.deepEqual(s.excluded,[]);assert.equal(s.gap,"0.1");assert.equal(reduce(s,{type:"ready",id:1,source:{document:document(),size:100}}),s);assert.equal(s.busy,false);assert.match(s.error,/subtitle file/);});
  it("does not download pending or absent output",()=>{const s=loaded();assert.equal(reduce(s,{type:"download",filename:"x.srt"}),s);});
});

describe("active overlap session download regressions", () => {
  for (const format of ["srt", "vtt"]) {
    const separator = format === "srt" ? "," : ".";
    const sourceText = `${format === "vtt" ? "WEBVTT\n\n" : ""}1\n00:00:05${separator}000 --> 00:00:08${separator}500\nFirst subtitle.\n\n2\n00:00:08${separator}000 --> 00:00:11${separator}000\nSecond subtitle.\n\n3\n00:00:12${separator}000 --> 00:00:15${separator}000\nThird subtitle.\n`;
    const originalRange = `00:00:05${separator}000 --> 00:00:08${separator}500`;
    const correctedRange = `00:00:05${separator}000 --> 00:00:07${separator}900`;
    function load() {
      const bytes = new TextEncoder().encode(sourceText);
      const source = openOverlapSubtitle({ name: `regression.${format}`, size: bytes.byteLength }, bytes.buffer);
      return reduce(reduce(initialOverlapSession, { type: "read", id: 1 }), { type: "ready", id: 1, source: { document: source, size: bytes.byteLength } });
    }
    async function downloadedDocument(state) {
      // This is the session serializer invoked by DownloadButton before Blob creation.
      const blob = new Blob([serializeOverlapSession(state)], { type: format === "vtt" ? "text/vtt;charset=utf-8" : "application/x-subrip;charset=utf-8" });
      const content = await blob.text();
      const document = openOverlapSubtitle({ name: `regression-fixed.${format}`, size: blob.size }, await blob.arrayBuffer());
      return { content, document };
    }
    it(`${format.toUpperCase()} download Blob serializes the active corrected cues, not the uploaded source`, async () => {
      const state = reduce(reduce(reduce(load(), { type: "mode", mode: "shorten" }), { type: "gap", value: "0.1" }), { type: "fix" });
      assert.equal(state.result.fixed, 1);
      assert.equal(state.result.remaining.length, 0);
      assert.equal(activeOverlapDocument(state), state.result.document);
      assert.equal(state.source.document.cues[0].end, 8500);
      const output = await downloadedDocument(state);
      assert.ok(output.content.includes(correctedRange));
      assert.ok(!output.content.includes(originalRange));
      assert.equal(output.content, sourceText.replace(originalRange, correctedRange));
      assert.deepEqual(output.document.cues.map(({ start, end, text }) => [start, end, text]), [[5000, 7900, "First subtitle."], [8000, 11000, "Second subtitle."], [12000, 15000, "Third subtitle."]]);
      assert.deepEqual(detectOverlaps(output.document), []);
      assert.equal(output.document.format, format);
    });
    it(`${format.toUpperCase()} fix, undo, and reapply use corrected, original, then corrected download state`, async () => {
      const first = reduce(load(), { type: "fix" });
      assert.ok((await downloadedDocument(first)).content.includes(correctedRange));
      const undone = reduce(first, { type: "undo" });
      assert.equal(activeOverlapDocument(undone), undone.source.document);
      assert.equal((await downloadedDocument(undone)).content, sourceText);
      assert.equal(detectOverlaps(activeOverlapDocument(undone)).length, 1);
      const reapplied = reduce(undone, { type: "fix" });
      const output = await downloadedDocument(reapplied);
      assert.ok(output.content.includes(correctedRange));
      assert.ok(!output.content.includes(originalRange));
      assert.deepEqual(detectOverlaps(activeOverlapDocument(reapplied)), []);
    });
  }
  it("does not serialize absent, pending, or errored session state", () => {
    for (const state of [initialOverlapSession, reduce(fixed(), { type: "read", id: 2 }), reduce(fixed(), { type: "error", message: "Review this file." })]) assert.throws(() => serializeOverlapSession(state), /resolve any errors/);
  });
});
