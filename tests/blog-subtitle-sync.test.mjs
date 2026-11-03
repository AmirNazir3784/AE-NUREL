import './helpers/auth-dom.mjs';
import {it} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {blogPosts} from '../src/content/blog/registry.ts';
import {mapSyncTime} from '../src/lib/subtitle-sync.ts';
const {default:SubtitleSyncArticle}=await import('../src/content/blog/fix-subtitles-out-of-sync.tsx');

it('the independently chosen worksheet maps all three checkpoints, not just endpoints',()=>{
 const times={sourceFirst:20000,targetFirst:22000,sourceSecond:620000,targetSecond:628000};
 for(const [before,after] of [[20000,22000],[320000,325000],[620000,628000]])assert.equal(mapSyncTime(before,times).time,after);
});
it('article navigation, accessible table and limited public tool references are complete',()=>{
 const d=new JSDOM(renderToStaticMarkup(React.createElement(SubtitleSyncArticle))).window.document;
 const post=blogPosts.find(p=>p.id==='subtitle-sync-guide');
 const ids=[...d.querySelectorAll('[id]')].map(n=>n.id);
 assert.equal(new Set(ids).size,ids.length);
 for(const section of post.sections)assert.ok(d.getElementById(section.id)?.querySelector('h2'));
 for(const link of d.querySelectorAll('a[href^="#"]'))assert.ok(d.getElementById(link.getAttribute('href').slice(1)));
 assert.equal(d.querySelectorAll('table th[scope="col"]').length,4);
 assert.equal(d.querySelectorAll('table th[scope="row"]').length,3);
 assert.equal(d.querySelectorAll('details').length,3);
 const publicTargets=new Set(['/tools/srt-timing-adjuster','/tools/subtitle-sync-fixer','/tools/srt-editor']);
 for(const link of d.querySelectorAll('a[href^="/tools/"]'))assert.ok(publicTargets.has(link.getAttribute('href')));
 const images=[...d.querySelectorAll('img')];
 assert.equal(images.length,4);
 assert.ok(images.every(image=>image.alt&&Number(image.getAttribute('width'))>0&&Number(image.getAttribute('height'))>0));
 assert.equal(d.querySelectorAll('figure a[href^="/images/blog/subtitle-sync/"]').length,4);
});
