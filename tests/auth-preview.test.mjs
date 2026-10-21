import './helpers/auth-dom.mjs';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { validateAuthPreview } from '../src/components/site/auth-preview-validation.ts';
const bootstrap = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = bootstrap.window;
globalThis.document = bootstrap.window.document;
const { createRoot, hydrateRoot } = await import('react-dom/client');
const { renderToString } = await import('react-dom/server');
const { Header } = await import('../src/components/site/header.tsx');

const valid = { name: 'Sample Reviewer', email: 'sample@example.test', password: 'sample-only-123', confirmation: 'sample-only-123' };
describe('preview field validation', () => {
  it('reports all required signup fields', () => assert.deepEqual(Object.keys(validateAuthPreview('signup', { name:'', email:'', password:'', confirmation:'' })), ['name','email','password','confirmation']));
  it('accepts sample signup and checks email syntax/limits', () => {
    assert.deepEqual(validateAuthPreview('signup', valid), {});
    for (const email of ['sample', 'a@@b.test', 'a b@c.test', 'a@b', 'a'.repeat(250)+'@b.test']) assert.ok(validateAuthPreview('login', {...valid, email}).email);
  });
  it('does not trim passwords or confuse confirmation', () => {
    assert.ok(validateAuthPreview('signup', {...valid, confirmation:valid.password+' '}).confirmation);
    assert.ok(validateAuthPreview('signup', {...valid, password:'short', confirmation:'short'}).password);
    assert.ok(validateAuthPreview('signup', {...valid, password:'x'.repeat(129)}).password);
    assert.deepEqual(validateAuthPreview('login', {...valid, password:'short'}), {});
  });
  it('allows Unicode names/passwords and validates recovery independently', () => {
    assert.deepEqual(validateAuthPreview('signup', {...valid, name:'نمونہ 山田', password:'サンプル専用パスワード１２３', confirmation:'サンプル専用パスワード１２３'}), {});
    assert.deepEqual(validateAuthPreview('recovery', {...valid, password:'', confirmation:'', name:''}), {});
    assert.ok(validateAuthPreview('signup', {...valid, name:' '.repeat(4)}).name);
    assert.ok(validateAuthPreview('signup', {...valid, name:'x'.repeat(81)}).name);
  });
});

describe('real Header and AuthPreviewModal component interactions', () => {
  let dom, root, previousEnv, errors;
  const query = selector => document.querySelector(selector);
  const click = async selector => { const element=query(selector); assert.ok(element,selector); await act(()=>element.click()); };
  const input = async (name,value) => { const element=query(`[name="${name}"]`); assert.ok(element,name); await act(()=>{element.value=value;element.dispatchEvent(new dom.window.Event('input',{bubbles:true}));}); };
  const submit = async () => { await act(()=>query('dialog[open] form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}))); };
  const key = async (element,value,shift=false) => { await act(()=>element.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:value,shiftKey:shift,bubbles:true,cancelable:true}))); };
  const open = async () => click('.aen-sign-in-desktop');

  beforeEach(async () => {
    previousEnv=process.env.NODE_ENV;process.env.NODE_ENV='development';
    dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost:3000'});
    for(const name of ['window','document','HTMLElement','HTMLDialogElement','HTMLInputElement','Node','FormData']) globalThis[name]=name==='window'?dom.window:dom.window[name];
    globalThis.IS_REACT_ACT_ENVIRONMENT=true;
    // jsdom has no showModal/top-layer layout implementation. These shims test our wiring only.
    dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
    dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
    dom.window.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{left:0,right:440,top:0,bottom:600}];};
    errors=[];root=createRoot(query('#root'),{onRecoverableError:error=>errors.push(error)});
    await act(()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Header))));
  });
  afterEach(async()=>{await act(()=>root.unmount());dom.window.close();if(previousEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previousEnv;});

  it('opens the real dialog with labels, initial focus and scroll lock under Strict Mode',async()=>{
    assert.match(query('.aen-topbar').textContent,/ — /);assert.match(query('.aen-topbar').textContent,/→/);
    assert.match(query('.aen-mega-product small').textContent,/AENural’s/);
    await open();assert.ok(query('dialog[open]'));assert.equal(query('#auth-title').textContent,'Welcome to AENural');
    assert.match(query('#auth-preview-note').textContent,/Use sample details only/);assert.equal(document.activeElement.id,'auth-email');
    assert.equal(document.documentElement.style.overflow,'hidden');assert.equal(document.body.style.overflow,'hidden');assert.deepEqual(errors,[]);
  });
  it('switches tabs using clicks/arrows/Home/End with roving focus and panel labels',async()=>{
    await open();await click('#auth-tab-signup');assert.ok(query('[name="confirmation"]'));assert.equal(query('#auth-panel').getAttribute('aria-labelledby'),'auth-tab-signup');
    await key(query('#auth-tab-signup'),'ArrowLeft');assert.equal(document.activeElement.id,'auth-tab-login');assert.equal(query('[name="confirmation"]'),null);
    await key(query('#auth-tab-login'),'End');assert.equal(query('#auth-tab-signup').tabIndex,0);
    await key(query('#auth-tab-signup'),'Home');assert.equal(query('#auth-tab-signup').tabIndex,-1);
  });
  it('opens recovery and returns to login with meaningful focus',async()=>{
    await open();await click('form .textButton');assert.match(query('h3').textContent,/Reset/);assert.equal(query('[name="password"]'),null);assert.equal(document.activeElement.id,'auth-email');
    await click('.footer button');assert.equal(query('#auth-tab-login').getAttribute('aria-selected'),'true');assert.equal(document.activeElement.id,'auth-tab-login');
  });
  it('toggles password and confirmation visibility independently',async()=>{
    await open();await click('#auth-tab-signup');await input('password',valid.password);await input('confirmation',valid.confirmation);
    await click('[aria-label="Show password"]');assert.equal(query('[name="password"]').type,'text');assert.equal(query('[name="confirmation"]').type,'password');
    await click('[aria-label="Show confirm password"]');assert.equal(query('[name="confirmation"]').type,'text');await click('[aria-label="Hide password"]');assert.equal(query('[name="password"]').type,'password');
  });
  it('validates actual empty login submission and focuses the first error',async()=>{
    await open();await submit();assert.equal(document.activeElement.id,'auth-email');assert.match(query('#auth-email-error').textContent,/Enter your email/);assert.equal(query('[name="email"]').getAttribute('aria-invalid'),'true');assert.match(query('[role="status"]').textContent,/highlighted/);
    await input('email','bad email');await submit();assert.match(query('#auth-email-error').textContent,/valid email/);
  });
  it('checks signup confirmation and clears a corrected field error',async()=>{
    await open();await click('#auth-tab-signup');for(const [name,value]of Object.entries({...valid,confirmation:'different'}))await input(name,value);
    await submit();assert.match(query('#auth-confirmation-error').textContent,/don’t match/);assert.equal(document.activeElement.id,'auth-confirmation');
    await input('confirmation',valid.password);assert.equal(query('#auth-confirmation-error'),null);await submit();assert.match(query('[role="status"]').textContent,/Account access is unavailable/);
  });
  it('does not send/persist credentials or simulate successful signup/login/reset',async()=>{
    let calls=0;const savedFetch=globalThis.fetch;globalThis.fetch=()=>{calls++;throw Error('unexpected network');};
    try{
      await open();await input('email',valid.email);await input('password',valid.password);await submit();assert.match(query('[role="status"]').textContent,/Nothing was sent or saved/);assert.equal(query('[name="password"]').value,'');
      await click('#auth-tab-signup');for(const [name,value]of Object.entries(valid))await input(name,value);await submit();assert.equal(query('[name="confirmation"]').value,'');
      await click('#auth-tab-login');await click('form .textButton');await input('email',valid.email);await submit();assert.match(query('[role="status"]').textContent,/Account access is unavailable/);
      assert.equal(calls,0);assert.equal(dom.window.localStorage.length,0);assert.equal(dom.window.sessionStorage.length,0);assert.equal(document.cookie,'');
    }finally{globalThis.fetch=savedFetch;}
  });
  it('closes using X, restores existing scroll settings/focus, and erases input on reopen',async()=>{
    document.body.style.overflow='clip';await open();await input('password',valid.password);await click('[aria-label="Close account dialog"]');
    assert.equal(query('#auth-title'),null);assert.equal(document.activeElement.className,'aen-sign-in aen-sign-in-desktop');assert.equal(document.body.style.overflow,'clip');assert.equal(document.documentElement.style.overflow,'');
    await open();assert.equal(query('[name="password"]').value,'');
  });
  it('handles the native Escape cancel event and mobile focus restoration',async()=>{
    query('.aen-mobile-menu').open=true;await click('.aen-sign-in-mobile');assert.equal(query('.aen-mobile-menu').open,false);
    await act(()=>query('dialog[open]').dispatchEvent(new dom.window.Event('cancel',{cancelable:true})));
    assert.equal(query('#auth-title'),null);assert.equal(query('.aen-mobile-menu').open,true);assert.ok(document.activeElement.classList.contains('aen-sign-in-mobile'));
  });
  it('wraps Tab in both directions',async()=>{
    await open();const first=query('[aria-label="Close account dialog"]'),last=query('.footer button');
    last.focus();await key(last,'Tab');assert.equal(document.activeElement,first);await key(first,'Tab',true);assert.equal(document.activeElement,last);
  });
  it('restores a visible navigation control if resize hides the original entry',async()=>{
    await open();query('.aen-sign-in-desktop').getClientRects=()=>[];await click('[aria-label="Close account dialog"]');
    assert.equal(document.activeElement.getAttribute('aria-label'),'Navigation menu');
  });
  it('dismisses only a pointer sequence starting and ending on the backdrop',async()=>{
    await open();const dialog=query('dialog[open]');dialog.getBoundingClientRect=()=>({left:100,right:540,top:100,bottom:700});
    const pointer=async(type,target,x,y)=>act(()=>target.dispatchEvent(new dom.window.MouseEvent(type,{bubbles:true,clientX:x,clientY:y})));
    await pointer('pointerdown',query('#auth-title'),150,150);await pointer('click',dialog,20,20);assert.ok(query('#auth-title'));
    await pointer('pointerdown',dialog,110,110);await pointer('click',dialog,110,110);assert.ok(query('#auth-title'));
    await pointer('pointerdown',dialog,20,20);await pointer('click',dialog,20,20);assert.equal(query('#auth-title'),null);
  });
  it('leaves search, tool links and header menus working after dismissal',async()=>{
    await open();await click('[aria-label="Close account dialog"]');await click('[aria-label="Search tools"]');
    assert.ok(query('[data-search-panel]'));assert.equal(document.activeElement.id,'tool-search');assert.equal(document.querySelectorAll('[data-search-panel] a').length,0);
    const searchInput=query('#tool-search');const setSearchValue=Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set;
    await act(()=>{setSearchValue.call(searchInput,'vtt');searchInput.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
    const link=query('[data-search-panel] a[href="/tools/srt-to-vtt"]');assert.ok(link);link.addEventListener('click',event=>event.preventDefault());await act(()=>link.click());assert.equal(query('[data-search-panel]'),null);
    assert.equal(query('.aen-nav-cta[href="/tools"]'),null);assert.ok(query('.aen-sign-in-desktop'));assert.ok(query('.aen-brand[href="/"]'));
  });
  it('renders no account entries in production',async()=>{
    await act(()=>root.unmount());process.env.NODE_ENV='production';root=createRoot(query('#root'));await act(()=>root.render(React.createElement(Header)));
    assert.equal(query('.aen-sign-in'),null);assert.equal(query('#auth-title'),null);assert.ok(query('[aria-label="Search tools"]'));
  });
  it('hydrates the server-rendered development header without recoverable mismatches',async()=>{
    await act(()=>root.unmount());query('#root').innerHTML=renderToString(React.createElement(Header));
    await act(()=>{root=hydrateRoot(query('#root'),React.createElement(Header),{onRecoverableError:error=>errors.push(error)});});
    assert.deepEqual(errors,[]);await open();assert.ok(query('dialog[open]'));
  });
});

describe('preview design and isolation contracts',()=>{
  const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
  it('uses native theme tokens with bounded responsive scrolling and no new palette',()=>{
    const css=read('src/components/site/auth-preview.module.css');assert.match(css,/min\(440px, calc\(100% - 32px\)\)/);assert.match(css,/max-height: calc\(100dvh - 32px\)/);assert.match(css,/overflow: auto/);
    assert.doesNotMatch(css,/#(?:[a-f\d]{3}){1,2}\b/i);assert.match(css,/var\(--surface\)/);assert.match(css,/var\(--error\)/);
    assert.match(read('src/app/globals.css'),/@media \(prefers-color-scheme: dark\)/);
  });
  it('has no backend/storage/session side effects and guards all entry points',()=>{
    const modal=read('src/components/site/auth-preview-modal.tsx'),header=read('src/components/site/header.tsx');
    assert.doesNotMatch(modal,/fetch\(|localStorage|sessionStorage|document\.cookie|console\.|supabase|signIn\.email/);
    assert.equal((header.match(/process\.env\.NODE_ENV === "development"/g)||[]).length,3);
    assert.match(header,/aen-sign-in-desktop/);assert.match(header,/aen-sign-in-mobile/);
  });
});
