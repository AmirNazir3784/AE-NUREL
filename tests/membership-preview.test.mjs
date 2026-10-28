import './helpers/auth-dom.mjs';
import {it} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
const {purchaseProduct,captionPlans}=await import('../src/features/membership/plans.ts');
const {accountPreviewAvailable}=await import('../src/lib/account-preview.ts');
const {AccessForm}=await import('../src/features/membership/access-form.tsx');

it('accepts only known paid product choices without accepting redirect URLs or arbitrary products',()=>{
 for(const value of [undefined,null,[],['source-window'],'caption-pro','free','podcast','https://example.com','//example.com'])assert.equal(purchaseProduct(value),null);
 assert.equal(purchaseProduct('source-window').id,'source-window');
});
it('offers exactly Free and the $20 Source Window package with premium captions included',()=>{
 assert.deepEqual(captionPlans.map(p=>p.id),['free','source-window']);
 const paid=purchaseProduct('source-window');assert.equal(paid.amount,'$20');assert.equal(paid.period,'one-time package');
 assert.ok(paid.features.includes('Premium caption features included with your purchase'));
});
it('keeps membership previews closed in ordinary production',()=>{
 const original={NODE_ENV:process.env.NODE_ENV,AENURAL_ACCOUNT_QA:process.env.AENURAL_ACCOUNT_QA};
 try{
  process.env.NODE_ENV='production';delete process.env.AENURAL_ACCOUNT_QA;assert.equal(accountPreviewAvailable(),false);
  process.env.AENURAL_ACCOUNT_QA='true';assert.equal(accountPreviewAvailable(),false);
  process.env.AENURAL_ACCOUNT_QA='1';assert.equal(accountPreviewAvailable(),true);
  process.env.NODE_ENV='development';delete process.env.AENURAL_ACCOUNT_QA;assert.equal(accountPreviewAvailable(),true);
 }finally{for(const [key,value]of Object.entries(original)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
it('cannot serialize sample credentials through a native pre-hydration submission',()=>{
 for(const view of ['login','signup','recovery']){
  const dom=new JSDOM(renderToStaticMarkup(React.createElement(AccessForm,{view,product:'source-window'})));
  const form=dom.window.document.querySelector('form');
  for(const input of form.querySelectorAll('input'))input.value='sample-only';
  assert.equal(form.method,'post');assert.deepEqual([...new dom.window.FormData(form)],[]);
  dom.window.close();
 }
});
