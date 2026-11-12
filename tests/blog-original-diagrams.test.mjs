import {it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {diagramCatalog,articleDiagrams} from '../src/content/blog/diagram-catalog.ts';
import {batchDrafts} from '../src/content/blog/batch-drafts.ts';
import {inspectArticle} from '../scripts/blog/autopilot.mjs';

it('places original instructional diagrams at existing article sections, with real SVG text and no external assets',()=>{
 for(const [slug,[id,section]] of Object.entries(articleDiagrams)){
  assert.ok(batchDrafts.find(a=>a.slug===slug)?.sections.some(s=>s.id===section),slug);
  const spec=diagramCatalog[id];
  const svg=readFileSync(new URL(`../public${spec.src}`,import.meta.url),'utf8');
  const doc=new JSDOM(svg,{contentType:'image/svg+xml'}).window.document;
  assert.equal(doc.documentElement.getAttribute('viewBox'),`0 0 ${spec.width} ${spec.height}`);
  assert.equal([...doc.querySelectorAll('text')].map(n=>n.textContent).join(' '),spec.text);
  assert.ok(spec.alt&&spec.label);
  assert.equal(doc.querySelectorAll('script,image,foreignObject,a').length,0);
 }
});

it('includes graphic words in measured main text and integrity hashes, without counting alt metadata',()=>{
 const html='<main><article><h1>Example</h1><header><p>Start.</p></header><div data-blog-content="test"><figure data-blog-diagram-text="Cue starts at two seconds"><img alt="Alt is excluded"/><figcaption>Original diagram.</figcaption></figure></div></article></main>';
 const result=inspectArticle(html);
 assert.match(result.mainText,/Cue starts at two seconds/);
 assert.doesNotMatch(result.mainText,/Alt is excluded/);
 assert.equal(result.mainWordCount,9);
 assert.notEqual(result.contentHash,inspectArticle(html.replace('two seconds','three seconds')).contentHash);
});
