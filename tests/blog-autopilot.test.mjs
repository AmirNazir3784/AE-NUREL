import {it} from 'node:test';
import assert from 'node:assert/strict';
import {eligibility,inspectArticle,SITE_URL} from '../scripts/blog/autopilot.mjs';

it('uses the Karachi calendar boundary and content records rather than a missing manifest',()=>{
 const now='2026-11-03T00:01:00+05:00';
 const post={status:'published',publishedAt:'2026-11-02T19:00:30Z',slug:'existing'};
 assert.equal(eligibility([post],[],now).result,'ALREADY PUBLISHED TODAY');
 assert.equal(eligibility([{...post,publishedAt:'2026-11-02T18:59:59Z'}],[],now).result,'ELIGIBLE');
 assert.equal(eligibility([{...post,status:'draft'}],[],now).result,'ELIGIBLE');
});
it('resumes even failed daily reservations rather than silently selecting a second article',()=>{
 const record={site:SITE_URL,siteDate:'2026-11-03',slug:'same-topic',status:'failed'};
 assert.equal(eligibility([],[record],'2026-11-03T12:00:00+05:00').record,record);
 assert.equal(eligibility([],[{...record,siteDate:'2026-11-02'}],'2026-11-03T12:00:00+05:00').result,'ELIGIBLE');
});
it('counts block-separated body words and hidden FAQ answers, excluding the site shell',()=>{
 const result=inspectArticle('<title>Test</title><nav>Excluded navigation</nav><main><article><header><h1>Fix sync</h1><p>Start here.</p></header><div data-blog-content="test"><h2>Check times</h2><p>First paragraph.</p><p>Second paragraph.</p><details><summary>A question?</summary><p>An answer.</p></details></div></article></main>');
 assert.equal(result.wordCount,14);
 assert.equal(result.text.includes('navigation'),false);
 assert.equal(result.text.includes('paragraph.Second'),false);
 assert.throws(()=>inspectArticle('<main>No body marker</main>'),/content marker/);
});
