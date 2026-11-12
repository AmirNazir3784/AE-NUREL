import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {blogPosts,publishedPosts} from '../../src/content/blog/registry.ts';
import {BLOG_RELEASE_SLUGS} from '../../src/content/blog/releases/2026-11-12.ts';
import {inspectArticle} from './autopilot.mjs';

const [baseValue,output,expectedFile]=process.argv.slice(2);
if(!baseValue||!output)throw Error('Usage: node scripts/blog/verify-release.mjs ORIGIN REPORT.json [EXPECTED_LOCAL_REPORT.json]');
const base=new URL(baseValue);
const live=base.origin==='https://aenural.com';
if((!live&&!(base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname)))||base.pathname!=='/'||base.search||base.hash||base.username||base.password)
  throw Error('Use https://aenural.com or a loopback HTTP origin');
const expected=expectedFile?JSON.parse(await fs.readFile(expectedFile,'utf8')):null;
const release=blogPosts.filter(post=>BLOG_RELEASE_SLUGS.includes(post.slug));
if(release.length!==50||release.some(post=>post.status!=='published'||!post.publishedAt))throw Error('Release registry is incomplete');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function read(route){
 const r=await fetch(new URL(route,base),{redirect:'error',signal:AbortSignal.timeout(45000),headers:{'User-Agent':'AENural-Release-Verification/1.0'}});
 return {status:r.status,type:r.headers.get('content-type')??'',robots:r.headers.get('x-robots-tag')??'',bytes:Buffer.from(await r.arrayBuffer())};
}
async function parallel(items,fn){
 const result=[];
 for(let i=0;i<items.length;i+=4)result.push(...await Promise.all(items.slice(i,i+4).map(fn)));
 return result;
}
const [indexResponse,sitemapResponse,robotsResponse]=await Promise.all(['/blog','/sitemap.xml','/robots.txt'].map(read));
const indexDoc=new JSDOM(indexResponse.bytes.toString()).window.document;
const sitemapDoc=new JSDOM(sitemapResponse.bytes.toString(),{contentType:'application/xml'}).window.document;
const locs=[...sitemapDoc.querySelectorAll('loc')].map(n=>n.textContent),rules=robotsResponse.bytes.toString();
const errors=[];
if([indexResponse,sitemapResponse,robotsResponse].some(r=>r.status!==200))errors.push('Directory/sitemap/robots must return 200');
if(!/^(application|text)\/xml/.test(sitemapResponse.type)||sitemapDoc.querySelector('parsererror'))errors.push('Sitemap XML/MIME');
if(new Set(locs).size!==locs.length||locs.some(url=>!url.startsWith('https://aenural.com/')))errors.push('Sitemap duplicate or noncanonical URL');
if(!rules.includes('Sitemap: https://aenural.com/sitemap.xml'))errors.push('Robots sitemap rule');
if(!indexDoc.querySelector('meta[name="robots"]')?.content.includes('index, follow'))errors.push('Blog directory indexability');
const assets=new Set(['/social-card.png']),routes=new Set(),external=new Set();
const articles=await parallel(release,async post=>{
 const route=`/blog/${post.slug}`,response=await read(route),a=inspectArticle(response.bytes.toString()),d=a.document,fail=[];
 const canonical=`https://aenural.com${route}`;
 if(response.status!==200||!response.type.startsWith('text/html'))fail.push('HTTP/MIME');
 if(a.h1Count!==1||d.querySelector('main article h1')?.textContent!==post.title)fail.push('Visible H1');
 if(a.canonical!==canonical||a.title!==`${post.seoTitle} | AENural`||a.description!==post.description)fail.push('Title/description/canonical');
 if(a.robots!=='index, follow'||/noindex|none/i.test(response.robots))fail.push('Indexability');
 if(a.articleSchema?.url!==canonical||a.articleSchema?.datePublished!==post.publishedAt||a.articleSchema?.headline!==post.title||a.articleSchema?.author?.name!=='AENural')fail.push('Article schema');
 const graphs=[...d.querySelectorAll('script[type="application/ld+json"]')].flatMap(n=>{const j=JSON.parse(n.textContent);return j['@graph']??[j]});
 if(!graphs.some(g=>g['@type']==='BreadcrumbList'&&g.itemListElement?.at(-1)?.item===canonical))fail.push('Breadcrumb schema');
 if(a.mainWordCount<650||a.mainWordCount>750||a.faqCount!==10)fail.push('Main word/FAQ count');
 if(/browser-based|on-device|on your (?:computer|device)|TODO|lorem ipsum/i.test(a.mainText))fail.push('Copy preference/placeholder');
 if(d.querySelector('[class*="draftNotice"]'))fail.push('Draft notice');
 const ids=[...d.querySelectorAll('[id]')].map(n=>n.id);
 if(new Set(ids).size!==ids.length)fail.push('Duplicate IDs');
 for(const anchor of d.querySelectorAll('main a[href^="#"]'))if(!d.getElementById(anchor.getAttribute('href').slice(1)))fail.push('Broken section anchor');
 const cards=[...indexDoc.querySelectorAll(`main a[href="${route}"]`)];
 if(cards.length!==1||locs.filter(url=>url===canonical).length!==1)fail.push('Directory/sitemap missing or duplicate');
 if(expected){const previous=expected.articles.find(a=>a.slug===post.slug);if(!previous||previous.contentHash!==a.contentHash)fail.push('Live body differs from checked production preview');}
 for(const img of d.querySelectorAll('[data-blog-content] img')){
  const src=img.getAttribute('src');if(!img.hasAttribute('alt')||!img.getAttribute('width')||!img.getAttribute('height'))fail.push('Image semantics');
  if(src?.startsWith('/'))assets.add(src);
 }
 for(const href of a.links){
  if(href.startsWith('https://'))external.add(href);
  else if(href.startsWith('/tools/'))routes.add(href);
  else if(/^\/blog\/.*\.(?:srt|vtt|txt|json)$/.test(href))assets.add(href);
 }
 return {slug:post.slug,url:canonical,status:response.status,title:a.title,canonical:a.canonical,mainWords:a.mainWordCount,faqWords:a.faqWordCount,faqCount:a.faqCount,contentHash:a.contentHash,errors:fail};
});
const resourceChecks=await parallel([...assets].sort(),async route=>{
 const response=await read(route),original=await fs.readFile(path.join('public',route.slice(1))),fail=[];
 if(response.status!==200||!response.bytes.equals(original))fail.push('Resource response/bytes');
 if(route.endsWith('.svg')){
  const d=new JSDOM(response.bytes.toString(),{contentType:'image/svg+xml'}).window.document;
  if(d.querySelector('parsererror,script,image,foreignObject')||!response.type.includes('svg'))fail.push('SVG XML/MIME');
 }
 return {route,status:response.status,type:response.type,sha256:digest(response.bytes),errors:fail};
});
const toolChecks=await parallel([...routes].sort(),async route=>{
 const response=await read(route);return {route,status:response.status,errors:response.status===200?[]:['Internal tool HTTP']};
});
const guards=await parallel(['/blog/review','/blog/unapproved-release-check'],async route=>{
 const response=await read(route),d=new JSDOM(response.bytes.toString()).window.document;
 return {route,status:response.status,errors:response.status===404&&d.querySelector('meta[name="robots"]')?.content.includes('noindex')?[]:['Unknown/review route exposure']};
});
const existing=await parallel(blogPosts.filter(post=>!BLOG_RELEASE_SLUGS.includes(post.slug)&&post.status==='published'),async post=>{
 const response=await read(`/blog/${post.slug}`),d=new JSDOM(response.bytes.toString()).window.document;
 const ok=response.status===200&&d.querySelector('link[rel="canonical"]')?.href===`https://aenural.com/blog/${post.slug}`;
 return {slug:post.slug,status:response.status,errors:ok?[]:['Existing publication regression']};
});
const categoryLinks=[...indexDoc.querySelectorAll('nav[aria-label="Browse articles by topic"] a')];
if(categoryLinks.length!==5||categoryLinks.some(a=>!indexDoc.getElementById(a.getAttribute('href').slice(1))))errors.push('Directory category navigation');
const result={at:new Date().toISOString(),base:base.origin,live,deploymentVerified:false,
 browser:'Owner waived browser visual/responsive/keyboard checks for this release; not performed',
 articles,index:{status:indexResponse.status,publishedArticles:publishedPosts().length,topicLinks:categoryLinks.length},
 sitemap:{status:sitemapResponse.status,type:sitemapResponse.type,urls:locs.length},robots:{status:robotsResponse.status,rules},
 resources:resourceChecks,tools:toolChecks,guards,existing,citationURLs:[...external].sort(),
 errors:[...errors,...[...articles,...resourceChecks,...toolChecks,...guards,...existing].filter(r=>r.errors.length)]};
result.deploymentVerified=live&&result.errors.length===0;
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({base:result.base,articles:articles.length,resources:resourceChecks.length,tools:toolChecks.length,citationURLs:external.size,errors:result.errors,deploymentVerified:result.deploymentVerified},null,2));
if(result.errors.length)process.exitCode=1;
