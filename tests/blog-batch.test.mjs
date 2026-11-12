import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {batchState} from '../scripts/blog/batch.mjs';

describe('owner-authorized sequential 50-article batch',()=>{
  const now=new Date('2026-11-04T10:00:00Z');
  it('allows another verified publication on the same day below the limit',()=>{
    assert.equal(batchState({articles:[{status:'published'}]},[{publishedAt:now.toISOString()}],now).articleNumber,2);
  });
  it('resumes a pending article before selecting another',()=>{
    const pending={slug:'pending',status:'verified'};
    assert.equal(batchState({articles:[pending]},[],now).article,pending);
  });
  it('stops at 50 verified batch articles or 50 real same-day publications',()=>{
    assert.equal(batchState({articles:Array.from({length:50},()=>({status:'published'}))},[],now).result,'COMPLETE');
    assert.equal(batchState({articles:[]},Array.from({length:50},()=>({publishedAt:now.toISOString()})),now).result,'DAILY LIMIT');
  });
  it('counts the Asia/Karachi date and prioritizes shared blockers',()=>{
    const live=Array.from({length:50},()=>({publishedAt:'2026-11-03T20:00:00Z'}));
    assert.equal(batchState({articles:[]},live,now).result,'DAILY LIMIT');
    assert.equal(batchState({articles:[],blocker:{scope:'shared',reason:'deployment mismatch'}},[],now).result,'BLOCKED');
  });
  it('does not release a pending draft at the daily limit but allows reconciliation of an already live one',()=>{
    const batch={articles:[{status:'verified',slug:'pending'}]};
    const live=Array.from({length:50},(_,index)=>({slug:`post-${index}`,publishedAt:now.toISOString()}));
    assert.equal(batchState(batch,live,now).result,'DAILY LIMIT');
    live[0].slug='pending';
    assert.equal(batchState(batch,live,now).result,'RESUME');
  });
});
