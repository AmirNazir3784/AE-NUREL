import {it} from 'node:test';
import assert from 'node:assert/strict';
import {batchDrafts} from '../src/content/blog/batch-drafts.ts';
import {blogPosts,publishedPosts,readablePosts} from '../src/content/blog/registry.ts';
import {tools} from '../src/lib/tools.ts';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {BLOG_RELEASE_SLUGS,BLOG_RELEASE_PUBLISHED_AT,blogReleaseDateForSlug} from '../src/content/blog/releases/2026-11-12.ts';

it('releases the 50 approved articles and preserves the two existing publications',()=>{
  assert.equal(batchDrafts.length,49);
  assert.equal(BLOG_RELEASE_SLUGS.length,50);
  assert.equal(new Set(BLOG_RELEASE_SLUGS).size,50);
  assert.equal(publishedPosts().length,52);
  assert.ok(Number.isFinite(Date.parse(BLOG_RELEASE_PUBLISHED_AT)));
  assert.equal(blogReleaseDateForSlug('future-unapproved-article'),undefined);
  assert.deepEqual(new Set(BLOG_RELEASE_SLUGS),new Set(['srt-vs-vtt-subtitle-formats',...batchDrafts.map(a=>a.slug)]));
  for(const field of ['id','slug','title','seoTitle'])assert.equal(new Set(blogPosts.map(post=>post[field])).size,blogPosts.length,field);
  for(const article of batchDrafts){
    assert.match(article.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(article.keyword&&article.intent&&article.introduction&&article.description);
    const post=blogPosts.find(post=>post.slug===article.slug);
    assert.equal(post.status,'published');assert.equal(post.publishedAt,BLOG_RELEASE_PUBLISHED_AT);
    assert.ok(article.sections.length>=3);
    assert.equal(new Set(article.sections.map(section=>section.id)).size,article.sections.length);
  }
});

it('validates table shapes, purposeful blocks and every contextual tool/article target',()=>{
  // The public audio landing page is explicitly listed in the sitemap outside
  // the subtitle/video tool registry.
  const known=new Set(['/tools/free-audio-to-text-converter-online',...tools.map(tool=>tool.href),...blogPosts.map(post=>`/blog/${post.slug}`)]);
  const designs=new Set();
  for(const article of batchDrafts){
    const all=JSON.stringify(article);assert.doesNotMatch(all,/browser-based|on-device|on your (?:device|computer)|local review set|TODO|lorem ipsum/i);
    designs.add(article.kind);
    for(const section of article.sections){
      assert.ok(section.blocks.length>0);
      for(const block of section.blocks)if(block.type==='table'){
        assert.ok(Array.isArray(block.headers)&&block.headers.length>=2);
        assert.ok(block.rows.length>0);
        assert.ok(block.rows.every(row=>row.length===block.headers.length));
      }
    }
    for(const match of all.matchAll(/\]\((\/[^)]+)\)/g)){
      const href=match[1];
      const sample=/^\/blog\/[a-z0-9-]+\/[a-z0-9-]+\.(srt|vtt|txt|json)$/.test(href)&&existsSync(path.join(import.meta.dirname,'../public',href.slice(1)));
      assert.ok(known.has(href)||sample,`${article.slug}: ${href}`);
    }
  }
  assert.equal(designs.size,5);
});

it('does not expose local drafts to production readers',()=>{
  const before=process.env.NODE_ENV;
  try{process.env.NODE_ENV='production';assert.deepEqual(readablePosts(),publishedPosts());}
  finally{if(before===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=before;}
});
