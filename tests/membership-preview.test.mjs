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
it('shows public testing pages and restores the production hold when explicitly disabled',()=>{
 const original={AENURAL_OWNER_TEST_MODE:process.env.AENURAL_OWNER_TEST_MODE,NODE_ENV:process.env.NODE_ENV,AENURAL_ACCOUNT_QA:process.env.AENURAL_ACCOUNT_QA,NEXT_PUBLIC_AENURAL_SITE_PREVIEW:process.env.NEXT_PUBLIC_AENURAL_SITE_PREVIEW};
 try{
  process.env.NODE_ENV='production';process.env.AENURAL_OWNER_TEST_MODE='0';delete process.env.AENURAL_ACCOUNT_QA;delete process.env.NEXT_PUBLIC_AENURAL_SITE_PREVIEW;assert.equal(accountPreviewAvailable(),true);
  process.env.NEXT_PUBLIC_AENURAL_SITE_PREVIEW='0';assert.equal(accountPreviewAvailable(),false);
  process.env.AENURAL_ACCOUNT_QA='true';assert.equal(accountPreviewAvailable(),false);
  process.env.AENURAL_ACCOUNT_QA='1';assert.equal(accountPreviewAvailable(),true);
  process.env.NODE_ENV='development';delete process.env.AENURAL_ACCOUNT_QA;assert.equal(accountPreviewAvailable(),true);
 }finally{for(const [key,value]of Object.entries(original)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
it('opens local captions normally and keeps account limits separate',async()=>{
 const {CaptionEntry}=await import('../src/features/caption-studio/caption-entry.tsx');
 const preview=renderToStaticMarkup(React.createElement(CaptionEntry,{transcriptionAvailable:false,accessEnabled:false}));
 assert.match(preview,/Up to 2 minutes/);assert.doesNotMatch(preview,/Live testing preview|Free: 60 seconds|Sign in/);
 const connected=renderToStaticMarkup(React.createElement(CaptionEntry,{transcriptionAvailable:false,accessEnabled:true}));
 assert.doesNotMatch(connected,/Live testing preview/);assert.match(connected,/Free: 60 seconds/);
});
it('describes actual open caption access without implying account quotas are enforced',async()=>{
 const {PricingPage}=await import('../src/features/membership/pricing-page.tsx');
 const markup=renderToStaticMarkup(React.createElement(PricingPage,{openAccess:true}));
 assert.match(markup,/Caption generation without sign-in/);assert.match(markup,/No account quota/);assert.match(markup,/Purchases are currently unavailable/);assert.doesNotMatch(markup,/planned|local preview|testing preview|3 caption videos per day/i);
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
