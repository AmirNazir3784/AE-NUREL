import './helpers/auth-dom.mjs';
import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {tools} from '../src/lib/tools.ts';
import {productIcons} from '../src/lib/icons.ts';
const {ToolCard}=await import('../src/components/home/tool-card.tsx');
const {ToolHeader}=await import('../src/components/tools/tool-layout.tsx');

describe('compact shared tool cards',()=>{
 it('keeps every released destination, full title and useful description accessible',()=>{
  assert.equal(tools.length,19);
  for(const tool of tools){const dom=new JSDOM(renderToStaticMarkup(React.createElement(ToolCard,{tool})));const card=dom.window.document.querySelector('a');assert.equal(card.getAttribute('href'),tool.href);assert.equal(card.querySelector('h3').textContent,tool.title);assert.equal(card.querySelector('p').textContent,tool.description);assert.equal(card.querySelector('.icon-tile').getAttribute('aria-hidden'),'true');dom.window.close();}
 });
 it('uses coordinated category tones rather than position-dependent colors',()=>{
  for(const tool of tools){const tone=productIcons[tool.icon].tone;assert.equal(tone,tool.icon==='video'?'media':tool.group==='Timing & Editing'?'editing':'conversion');}
  assert.equal(productIcons.subtitle.tone,'caption');
 });
 it('keeps the six editing operations distinguishable; format aliases may share glyphs',()=>{
  const editing=tools.filter(tool=>tool.group==='Timing & Editing');
  assert.equal(new Set(editing.map(tool=>tool.icon)).size,editing.length);
 });
 it('uses registry icons on tool headings without duplicating titles or inventing unknown icons',()=>{
  for(const tool of tools){const dom=new JSDOM(renderToStaticMarkup(React.createElement(ToolHeader,{title:tool.title,description:tool.description})));assert.equal(dom.window.document.querySelectorAll('h1').length,1);assert.equal(dom.window.document.querySelectorAll('.icon-tile').length,1);assert.equal(dom.window.document.querySelector('h1').textContent,tool.title);dom.window.close();}
  const markup=renderToStaticMarkup(React.createElement(ToolHeader,{title:'Other page',description:'Description'}));assert.doesNotMatch(markup,/icon-tile/);
 });
});
