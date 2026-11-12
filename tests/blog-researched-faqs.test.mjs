import {it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {articleQuestionSets} from '../src/content/blog/faqs/index.ts';
import {blogPosts} from '../src/content/blog/registry.ts';
import {tools} from '../src/lib/tools.ts';
import {inspectArticle} from '../scripts/blog/autopilot.mjs';
import {BLOG_RELEASE_SLUGS,BLOG_RELEASE_PUBLISHED_AT} from '../src/content/blog/releases/2026-11-12.ts';

const root=path.resolve(import.meta.dirname,'..');
const {discussions}=JSON.parse(readFileSync(path.join(root,'docs/blog/faq-discussion-sources.json'),'utf8'));
const {sources}=JSON.parse(readFileSync(path.join(root,'docs/blog/faq-answer-sources.json'),'utf8'));

it('gives every one of the 50 released articles ten distinct, specifically authored FAQs',()=>{
  const drafts=blogPosts.filter(post=>BLOG_RELEASE_SLUGS.includes(post.slug));
  assert.equal(articleQuestionSets.length,50);
  assert.deepEqual(new Set(articleQuestionSets.map(set=>set.slug)),new Set(drafts.map(post=>post.slug)));
  const questions=new Set();
  for(const set of articleQuestionSets){
    assert.ok(set.items.length>=10,set.slug);
    assert.ok(set.title&&set.verification.length);
    for(const item of set.items){
      const normalized=item.question.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
      assert.ok(!questions.has(normalized),`${set.slug}: repeated question ${item.question}`);
      questions.add(normalized);
      assert.ok(item.answer.trim()&&item.question.endsWith('?'));
      assert.doesNotMatch(item.answer,/browser-based|on-device|on your (?:device|computer)|lorem ipsum|TODO/i);
    }
  }
  assert.equal(questions.size,500);
});

it('keeps each question traceable without claiming every editorial follow-up was literally posted',()=>{
  for(const set of articleQuestionSets){
    for(const item of set.items){
      const source=discussions[item.discussion];
      assert.ok(source,`${set.slug}: unknown discussion ${item.discussion}`);
      assert.equal(new URL(source.url).protocol,'https:');
      assert.ok(source.title&&source.accessedAt&&source.access);
      assert.ok(['reported-problem','practical-follow-up'].includes(item.basis));
    }
    for(const id of set.verification){
      const source=sources[id];assert.ok(source,`${set.slug}: unknown answer reference ${id}`);
      if(source.paths)for(const file of source.paths)assert.ok(existsSync(path.join(root,file)),file);
      else assert.equal(new URL(source.url).protocol,'https:');
    }
  }
});

it('uses real contextual internal targets and publishes only the approved batch with its release date',()=>{
  const known=new Set(['/tools/free-audio-to-text-converter-online',...tools.map(t=>t.href),...blogPosts.map(p=>`/blog/${p.slug}`)]);
  for(const set of articleQuestionSets){
    const post=blogPosts.find(post=>post.slug===set.slug);
    assert.equal(post.status,'published');assert.equal(post.publishedAt,BLOG_RELEASE_PUBLISHED_AT);
    assert.ok(post.sections.some(s=>s.id===(set.slug==='srt-vs-vtt-subtitle-formats'?'format-questions':'reader-questions')));
    for(const item of set.items)for(const match of item.answer.matchAll(/\]\((\/[^)]+)\)/g)){
      const href=match[1];
      assert.ok(known.has(href)||(href.startsWith('/blog/')&&existsSync(path.join(root,'public',href.slice(1)))),`${set.slug}: ${href}`);
    }
  }
});

it('counts additional FAQs separately while preserving full-article audit text and legacy totals',()=>{
  const html='<main><article><h1>Timing guide</h1><header><p>Start here.</p></header><div data-blog-content="test"><section><h2>Main steps</h2><p>Keep words intact.</p></section><section data-blog-faq="test"><h2>Reader questions</h2><details><summary><h3>Why this timing?</h3></summary><p>Check the recording first.</p></details></section></div></article></main>';
  const result=inspectArticle(html);
  assert.equal(result.mainText,'Timing guide Start here. Main steps Keep words intact.');
  assert.equal(result.mainWordCount,9);assert.equal(result.faqCount,1);
  assert.ok(result.faqWordCount>0&&result.wordCount>result.mainWordCount);
  assert.match(result.text,/Why this timing/);assert.doesNotMatch(result.mainText,/Why this timing/);
  const legacy=inspectArticle(html.replace(/ data-blog-faq="test"/,''));
  assert.equal(legacy.mainWordCount,legacy.wordCount);assert.equal(legacy.faqCount,0);
});
