import './helpers/auth-dom.mjs';
import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const {CaptionEditorial}=await import('../src/features/caption-page/caption-editorial.tsx');
const {captionCopy}=await import('../src/features/caption-page/caption-copy.ts');
describe('caption website content',()=>{
 it('renders one approved FAQ and all revised editorial copy',()=>{
  const dom=new JSDOM(renderToStaticMarkup(React.createElement(CaptionEditorial)));
  const d=dom.window.document,normalize=s=>s.replace(/\*\*/g,'').replace(/\s+/g,' ').trim(),text=normalize(d.body.textContent);
  assert.equal([...d.querySelectorAll('h2')].filter(e=>/frequently asked questions/i.test(e.textContent)).length,1);
  assert.deepEqual([...d.querySelectorAll('#caption-faq summary')].map(e=>e.textContent.replace(/\+$/,'').trim()),captionCopy[7].children.map(c=>c.heading));
  for(const section of captionCopy){assert.ok(text.includes(normalize(section.heading)));for(const p of section.paragraphs)assert.ok(text.includes(normalize(p)));for(const child of section.children){assert.ok(text.includes(normalize(child.heading)));for(const p of child.paragraphs)assert.ok(text.includes(normalize(p)));}}
  assert.equal(d.querySelector('.cap-index'),null);
  const route=readFileSync(new URL('../src/app/tools/auto-caption-generator/page.tsx',import.meta.url),'utf8');
  assert.ok(!route.includes('StudioGuidance'),'Do not add a second FAQ through the editor guide');
  dom.window.close();
 });
 it('retains the original SEO phrases while describing the video tool accurately',()=>{
  const copy=JSON.stringify(captionCopy).replace(/\*\*/g,'').toLowerCase();
  const phrases=['AI caption generator','online caption generator','Instagram caption generator','free Instagram caption generator','Instagram post caption generator','Instagram Reels caption generator','reel caption generator','TikTok caption generator','Facebook caption generator','LinkedIn caption generator','Pinterest caption generator','Twitter caption generator','YouTube Shorts caption generator','photo caption generator','AI image caption generator','Instagram caption generator from photo','meme caption generator','video caption generator','AI video caption generator','AI caption generator for video','auto caption generator for video','closed caption generator','audio to caption generator','free AI caption generator for social media','caption generator free','AI social media caption generator'];
  for(const phrase of phrases)assert.ok(copy.includes(phrase.toLowerCase()),phrase);
  assert.match(captionCopy[1].children[0].paragraphs[0],/video with spoken audio/);
  assert.match(captionCopy[7].children[2].paragraphs[0],/does not analyze photos/);
  assert.ok(!captionCopy[2].heading.includes('Photos'));
 });
});
