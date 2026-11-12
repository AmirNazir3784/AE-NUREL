import './helpers/auth-dom.mjs';
import {it} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
const {pricingAvailable}=await import('../src/lib/pricing-visibility.ts');
const {PricingLink}=await import('../src/components/site/pricing-link.tsx');
const {Header}=await import('../src/components/site/header.tsx');
const {Footer}=await import('../src/components/site/footer.tsx');
const {AccountNavigation}=await import('../src/features/membership/account-navigation.tsx');
it('hides production pricing links even when account and public-preview switches are enabled',()=>{
 const keys=['NODE_ENV','NEXT_PUBLIC_AENURAL_SITE_PREVIEW','AENURAL_MEMBERSHIP_ENABLED','AENURAL_ACCOUNT_QA'];
 const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 try{
  Object.assign(process.env,{NODE_ENV:'production',NEXT_PUBLIC_AENURAL_SITE_PREVIEW:'1',AENURAL_MEMBERSHIP_ENABLED:'1',AENURAL_ACCOUNT_QA:'1'});
  assert.equal(pricingAvailable(),false);
  assert.equal(renderToStaticMarkup(React.createElement(PricingLink,{href:'/pricing#plans'},'Pricing')),'');
  for(const Component of [Header,Footer,AccountNavigation]){
   const html=renderToStaticMarkup(React.createElement(Component,{membershipPreview:true}));
   const dom=new JSDOM(html);assert.equal(dom.window.document.querySelector('a[href^="/pricing"]'),null);dom.window.close();
  }
  process.env.NODE_ENV='development';assert.equal(pricingAvailable(),true);
  const dom=new JSDOM(renderToStaticMarkup(React.createElement(PricingLink,{href:'/pricing#plans',className:'preview'},'Compare plans')));
  assert.equal(dom.window.document.querySelector('a').getAttribute('href'),'/pricing#plans');dom.window.close();
 }finally{for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
});
