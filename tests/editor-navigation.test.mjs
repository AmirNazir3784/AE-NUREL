import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { initializeHistory, historyInitializationScript } from "../src/lib/history-navigation.ts";
function browser() {
  const entries = [{url:"https://aenural.example/tools",state:{__NA:true,tree:"tools"}}];
  let cursor=0; const listeners=[], queue=[], routed=[]; let prompts=0, resume;
  const host = {location:{href:entries[0].url}, addEventListener(type,fn){if(type==="popstate")listeners.push(fn);}};
  host.history={
    get state(){return entries[cursor].state;},get length(){return entries.length;},
    pushState(state,unused,url){entries.splice(cursor+1);entries.push({state,url:new URL(url??host.location.href,host.location.href).href});cursor++;host.location.href=entries[cursor].url;},
    replaceState(state,unused,url){entries[cursor]={state,url:new URL(url??host.location.href,host.location.href).href};host.location.href=entries[cursor].url;},
    go(delta){queue.push(()=>{const next=cursor+delta;if(next<0||next>=entries.length)return;cursor=next;host.location.href=entries[cursor].url;let stopped=false;const event={state:entries[cursor].state,stopImmediatePropagation(){stopped=true;}};for(const fn of listeners){if(stopped)break;fn(event);}if(!stopped)routed.push(entries[cursor].url);});}
  };
  const api=initializeHistory(host);
  const flush=()=>{let steps=0;while(queue.length){assert.ok(++steps<20,"history must not loop");queue.shift()();}};
  const dirty=()=>api.block(fn=>{prompts++;resume=fn;});
  return {host,api,entries,routed,flush,dirty,get prompts(){return prompts;},approve(){resume();},get cursor(){return cursor;}};
}
describe("editor history navigation protection",()=>{
  it("rolls Back back before Next unmounts the dirty editor; cancel preserves history",()=>{
    const b=browser();b.host.history.pushState({__NA:true,tree:"editor"},"","/tools/srt-editor");b.dirty();
    b.host.history.go(-1);b.flush();assert.equal(b.cursor,1);assert.equal(b.prompts,1);assert.deepEqual(b.routed,[]);
    b.api.cancel();assert.equal(b.host.history.length,2);assert.equal(b.host.history.state.tree,"editor");
  });
  it("approves Back exactly once with the actual Next state and no new entries",()=>{
    const b=browser();b.host.history.pushState({__NA:true,tree:"editor"},"","/tools/srt-editor");b.dirty();b.host.history.go(-1);b.flush();b.approve();b.flush();
    assert.equal(b.cursor,0);assert.equal(b.prompts,1);assert.equal(b.host.history.length,2);assert.equal(b.host.history.state.tree,"tools");assert.equal(b.routed.length,1);
  });
  it("protects dirty Forward and permits an intentional Forward discard",()=>{
    const b=browser();b.host.history.pushState({__NA:true,tree:"editor"},"","/tools/srt-editor");b.host.history.pushState({__NA:true,tree:"help"},"","/help");b.host.history.go(-1);b.flush();b.dirty();b.routed.length=0;
    b.host.history.go(1);b.flush();assert.equal(b.cursor,1);assert.equal(b.prompts,1);assert.deepEqual(b.routed,[]);b.approve();b.flush();assert.equal(b.cursor,2);assert.equal(b.routed.length,1);
  });
  it("allows clean Back and Forward without prompts or additional entries",()=>{
    const b=browser();b.host.history.pushState({__NA:true},"","/tools/srt-editor");b.host.history.go(-1);b.flush();b.host.history.go(1);b.flush();assert.equal(b.prompts,0);assert.equal(b.routed.length,2);assert.equal(b.entries.length,2);
  });
  it("removing the dirty subscription restores normal navigation",()=>{
    const b=browser();b.host.history.pushState({__NA:true},"","/tools/srt-editor");const clean=b.dirty();clean();b.host.history.go(-1);b.flush();assert.equal(b.cursor,0);assert.equal(b.prompts,0);
  });
  it("preserves Next fields when replacing and never duplicates entries",()=>{
    const b=browser();b.host.history.replaceState({__NA:true,tree:{segment:"editor"}},"","/tools/srt-editor");assert.equal(b.entries.length,1);assert.deepEqual(b.host.history.state.tree,{segment:"editor"});assert.equal(b.host.history.state.__NA,true);
  });
  it("can cancel repeated attempts without trapping later clean navigation",()=>{
    const b=browser();b.host.history.pushState({__NA:true},"","/tools/srt-editor");const clean=b.dirty();
    for(let i=0;i<4;i++){b.host.history.go(-1);b.flush();b.api.cancel();assert.equal(b.cursor,1);}
    clean();b.host.history.go(-1);b.flush();assert.equal(b.cursor,0);assert.equal(b.entries.length,2);
  });
  it("rolls a multi-entry traversal back and replays its exact delta",()=>{
    const b=browser();b.host.history.pushState({__NA:true},"","/help");b.host.history.pushState({__NA:true},"","/tools/srt-editor");b.dirty();b.host.history.go(-2);b.flush();assert.equal(b.cursor,2);b.approve();b.flush();assert.equal(b.cursor,0);assert.equal(b.entries.length,3);
  });
  it("same-page hash history does not discard the document or prompt",()=>{
    const b=browser();b.host.history.replaceState({__NA:true},"","/tools/srt-editor");b.host.history.pushState({__NA:true},"","#main-content");b.dirty();b.host.history.go(-1);b.flush();assert.equal(b.cursor,0);assert.equal(b.prompts,0);
  });
  it("setup is idempotent and does not stack wrappers",()=>{
    const b=browser();assert.equal(initializeHistory(b.host),b.api);b.host.history.pushState({__NA:true},"","/help");assert.equal(b.host.history.state.__aenuralPosition,1);assert.equal(b.entries.length,2);
  });
  it("does not repeat the prompt while an earlier history attempt is pending",()=>{
    const b=browser();b.host.history.pushState({__NA:true},"","/tools/srt-editor");b.dirty();
    b.host.history.go(-1);b.flush();b.host.history.go(-1);b.flush();
    assert.equal(b.cursor,1);assert.equal(b.prompts,1);b.approve();b.flush();assert.equal(b.cursor,0);assert.equal(b.entries.length,2);
  });
  it("handles rapid queued traversals without a history loop",()=>{
    const b=browser();b.host.history.pushState({__NA:true},"","/help");b.host.history.pushState({__NA:true},"","/tools/srt-editor");b.dirty();b.host.history.go(-1);b.host.history.go(-1);b.flush();assert.equal(b.cursor,2);assert.equal(b.prompts,1);b.api.cancel();assert.equal(b.entries.length,3);
  });
  it("the serialized initialization script needs no module-scoped helpers",()=>{
    const b=browser();delete b.host.aenuralHistory;assert.doesNotThrow(()=>runInNewContext(historyInitializationScript,{window:b.host,URL}));assert.ok(b.host.aenuralHistory);
  });
});
