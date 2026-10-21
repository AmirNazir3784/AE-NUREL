import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STUDIO_ANIMATIONS, studioMotionFrame } from "../src/features/caption-studio/studio-motion.ts";
import { STUDIO_PRESETS, validateStudioStyle, parseStudioStyle } from "../src/features/caption-studio/studio-core.ts";

const identity = { opacity:1, scale:1, x:0, y:0, rotation:0, blur:0 };
describe("shared preview/export caption animations",()=>{
  it("offers twenty-four distinct animations and validates each one",()=>{
    assert.equal(STUDIO_ANIMATIONS.length,24);
    assert.equal(new Set(STUDIO_ANIMATIONS.map(([id])=>id)).size,24);
    for(const [animation] of STUDIO_ANIMATIONS)validateStudioStyle({...STUDIO_PRESETS[0],animation});
    assert.throws(()=>validateStudioStyle({...STUDIO_PRESETS[0],animation:"random"}));
  });
  it("finishes every animation in exactly the normal caption position and size",()=>{
    for(const [animation] of STUDIO_ANIMATIONS){
      assert.deepEqual(studioMotionFrame(animation,400,400,false),identity,animation);
      assert.deepEqual(studioMotionFrame(animation,900,400,false),identity,animation);
      assert.deepEqual(studioMotionFrame(animation,0,400,true),identity,animation);
    }
  });
  it("keeps every intermediate frame finite, visible and bounded",()=>{
    for(const [animation] of STUDIO_ANIMATIONS)for(const progress of [0,.1,.25,.5,.75,.99]){
      const f=studioMotionFrame(animation,progress*440,440,false);
      for(const x of Object.values(f))assert.ok(Number.isFinite(x),animation);
      assert.ok(f.opacity>=0 && f.opacity<=1,animation);
      assert.ok(f.scale>=.5 && f.scale<1.5,animation);
      assert.ok(Math.abs(f.x)<=3 && Math.abs(f.y)<=2,animation);
      assert.ok(f.blur>=0 && f.blur<=.2,animation);
    }
  });
  it("includes glitch/RGB split and punchy motion without repeated opacity flashing",()=>{
    const names = STUDIO_ANIMATIONS.map(([key])=>key);
    for(const name of ["glitch","rgb-split","typewriter","elastic","whip-left","whip-right","snap","jitter"])
      assert.ok(names.includes(name),name);
    for(const name of ["glitch","rgb-split","jitter"]){
      const frames = Array.from({length:31},(_,i)=>studioMotionFrame(name,i*20,600,false));
      const opacityChanges = frames.slice(1).filter((f,i)=>f.opacity<frames[i].opacity-.001);
      assert.equal(opacityChanges.length,0,name+": brightness should not flash");
    }
    assert.notDeepEqual(studioMotionFrame("glitch",30,600,false),identity);
    assert.deepEqual(studioMotionFrame("glitch",30,600,true),identity);
  });
  it("keeps old style JSON valid and saves new animation names unchanged",()=>{
    const old=JSON.stringify({version:1,style:STUDIO_PRESETS[0]});
    assert.equal(parseStudioStyle(old).animation,"none");
    const custom={...STUDIO_PRESETS[0],animation:"swing"};
    assert.equal(parseStudioStyle(JSON.stringify({version:1,style:custom})).animation,"swing");
  });
});
