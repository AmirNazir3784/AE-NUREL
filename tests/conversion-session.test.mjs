import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {conversionReducer as reduce,initialConversion as initial} from "../src/features/conversion/conversion-session.ts";
const result={content:"valid output",filename:"out.srt",cueCount:1,warnings:[]}, file={name:"in.vtt",size:123};
const ready=()=>reduce(reduce(initial,{type:"read",id:1}),{type:"ready",id:1,file,result});
describe("new conversion session lifecycle",()=>{
  it("does not report ready before a valid result exists",()=>{
    const state=reduce(initial,{type:"read",id:1});assert.equal(state.busy,true);assert.equal(state.result,null);assert.equal(state.message,"");
  });
  it("replacement removes old output and prior download/copy feedback",()=>{
    const state=reduce(reduce(ready(),{type:"feedback",id:1,message:"Copied"}),{type:"read",id:2});assert.equal(state.result,null);assert.equal(state.file,null);assert.equal(state.message,"");
  });
  it("failed replacement cannot download stale output",()=>{
    const state=reduce(reduce(ready(),{type:"read",id:2}),{type:"failed",id:2,message:"Bad cue"});assert.equal(state.result,null);assert.equal(state.error,"Bad cue");assert.equal(state.busy,false);
  });
  it("reset cancels an in-flight read and ignores its late completion",()=>{
    const state=reduce(reduce(initial,{type:"read",id:1}),{type:"reset",id:2});assert.equal(reduce(state,{type:"ready",id:1,file,result}),state);
  });
  it("ignores old read failures and async clipboard feedback",()=>{
    const state=reduce(ready(),{type:"read",id:2});for(const action of [{type:"failed",id:1,message:"old failure"},{type:"feedback",id:1,message:"old copy",error:true}])assert.equal(reduce(state,action),state);
  });
  it("download/copy failures retain current output for retry",()=>{
    const state=reduce(ready(),{type:"feedback",id:1,message:"Copy unavailable",error:true});assert.equal(state.result,result);assert.equal(state.error,"Copy unavailable");
  });
});
