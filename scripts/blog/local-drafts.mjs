import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';
import {blogPosts} from '../../src/content/blog/registry.ts';
import {batchDrafts} from '../../src/content/blog/batch-drafts.ts';
import {articleQuestionSets} from '../../src/content/blog/faqs/index.ts';
import {inspectArticle,SITE_URL} from './autopilot.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const common=execFileSync('git',['rev-parse','--path-format=absolute','--git-common-dir'],{cwd:root,encoding:'utf8'}).trim();
const store=path.join(path.dirname(common),'.aenural-local/editorial');
const batchFile=path.join(store,'batch-50-2026-11-04.json');
const reports=path.join(store,'aenural-50-2026-11-04');
const drafts=blogPosts.filter(post=>post.status==='draft');
const base=new URL(process.argv[3]??'http://localhost:3000');
if(base.protocol!=='http:'||!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Only a loopback preview can be checked.');
const textBlock=block=>block.type==='p'?block.text:block.type==='note'?`${block.title} ${block.text}`:block.type==='code'?`${block.label}\n${block.text}`:block.type==='caption-example'?[block.label,...block.variants.flatMap(variant=>[variant.label,variant.text])].join(' '):block.type==='table'?[block.caption,...block.headers,...block.rows.flat()].join(' '):block.type==='faq'?block.items.map(item=>`${item.question} ${item.answer}`).join(' '):block.type==='decisions'?block.items.map(item=>`${item.label} ${item.action} ${item.detail}`).join(' '):block.type==='illustration'?'':block.items.join(' ');
const links=text=>[...text.matchAll(/\[[^\]]+\]\((https:\/\/[^\s)]+|\/[^\s)]+)\)/g)].map(match=>match[1]);
const unique=items=>[...new Set(items)];

async function check(){
  const results=[];
  for(const post of drafts){
    const url=new URL(`/blog/${post.slug}`,base),response=await fetch(url,{signal:AbortSignal.timeout(60000)});
    const article=inspectArticle(await response.text()),doc=article.document;
    const missing=unique([...doc.querySelectorAll('main a[href^="#"]')].map(a=>a.getAttribute('href').slice(1))).filter(id=>!doc.getElementById(id));
    const ids=[...doc.querySelectorAll('[id]')].map(node=>node.id);
    const errors=[];
    if(response.status!==200)errors.push(`HTTP ${response.status}`);
    if(article.h1Count!==1||article.canonical!==`${SITE_URL}/blog/${post.slug}`||article.robots!=='noindex, nofollow'||article.articleSchema)errors.push('Draft SEO boundary failed');
    if(missing.length||new Set(ids).size!==ids.length)errors.push('Missing anchors or duplicate IDs');
    if(article.mainWordCount<650||article.mainWordCount>750)errors.push(`Main article must contain 650–750 words; found ${article.mainWordCount}`);
    if(article.faqCount<10)errors.push(`Article needs at least 10 researched FAQs; found ${article.faqCount}`);
    const internal=unique(article.links.filter(href=>href.startsWith('/')));
    for(const href of internal){
      if(href.startsWith('/blog/')&&!href.endsWith('.srt')&&!href.endsWith('.vtt')&&!blogPosts.some(p=>`/blog/${p.slug}`===href))errors.push(`Unknown article link ${href}`);
    }
    results.push({slug:post.slug,status:response.status,wordCount:article.mainWordCount,totalWordCount:article.wordCount,faqWordCount:article.faqWordCount,faqCount:article.faqCount,contentHash:article.contentHash,canonical:article.canonical,robots:article.robots,h1Count:article.h1Count,internalLinks:internal,externalLinks:unique(article.links.filter(href=>href.startsWith('https://'))),missingAnchors:missing,errors});
  }
  const index=await fetch(new URL('/blog/review',base)),indexDoc=new JSDOM(await index.text()).window.document;
  const missingFromReview=drafts.filter(post=>!indexDoc.querySelector(`main a[href="/blog/${post.slug}"]`)).map(post=>post.slug);
  const result={checkedAt:new Date().toISOString(),base:base.href,count:results.length,reviewIndexStatus:index.status,missingFromReview,articles:results,browserQA:'Pending; browser navigation/screenshots were unavailable in the previous session. HTTP/DOM structure checks are not visual or keyboard tests.'};
  await fs.mkdir(reports,{recursive:true});await fs.writeFile(path.join(reports,'local-route-checks.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({drafts:results.length,wordCount:results.reduce((sum,item)=>sum+item.wordCount,0),range:[Math.min(...results.map(item=>item.wordCount)),Math.max(...results.map(item=>item.wordCount))],reviewIndexStatus:index.status,errors:results.filter(item=>item.errors.length),missingFromReview},null,2));
  if(results.some(item=>item.errors.length)||missingFromReview.length||index.status!==200)process.exitCode=1;
}

async function references(){
  const urls=unique([
    ...batchDrafts.flatMap(article=>article.sections.flatMap(section=>section.blocks.flatMap(block=>links(textBlock(block))))),
    ...articleQuestionSets.flatMap(set=>set.items.flatMap(item=>links(item.answer))),
  ].filter(href=>href.startsWith('https://')));
  const records=[];
  let previous=[];try{previous=JSON.parse(await fs.readFile(path.join(reports,'reference-checks.json'),'utf8'));}catch{/* First check has no cache. */}
  for(let offset=0;offset<urls.length;offset+=4){
    const group=await Promise.all(urls.slice(offset,offset+4).map(async url=>{
      const checked=previous.find(item=>item.url===url&&item.status>=200&&item.status<400&&Date.now()-Date.parse(item.checkedAt)<30*60*1000);
      if(checked)return checked;
      try{const response=await fetch(url,{signal:AbortSignal.timeout(30000)});await response.body?.cancel();return {url,status:response.status,finalURL:response.url,checkedAt:new Date().toISOString()};}
      catch(error){return {url,status:null,error:error.message,checkedAt:new Date().toISOString()};}
    }));records.push(...group);
  }
  await fs.writeFile(path.join(reports,'reference-checks.json'),JSON.stringify(records,null,2)+'\n');
  console.log(JSON.stringify({references:records.length,resolved:records.filter(r=>r.status>=200&&r.status<400).length,issues:records.filter(r=>!(r.status>=200&&r.status<400))},null,2));
}

async function record(){
  const batch=JSON.parse(await fs.readFile(batchFile,'utf8'));
  if(batch.publishMode!=='draft'||!batch.reviewMode)throw Error('Record only under owner-requested local review mode');
  let checks;try{checks=JSON.parse(await fs.readFile(path.join(reports,'local-route-checks.json'),'utf8'));}catch{throw Error('Run local checks before recording the draft inventory');}
  const old=new Map(batch.articles.map(article=>[article.slug,article]));
  batch.articles=drafts.map((post,index)=>{
    const article=batchDrafts.find(item=>item.slug===post.slug),qa=checks.articles.find(item=>item.slug===post.slug);
    const previous=old.get(post.slug);
    const revision=previous?.revision;
    const complete=qa.errors.length===0&&revision&&['research','content','screenshots','browser','qa'].every(gate=>revision[gate]==='passed'||revision[gate]==='not needed');
    return {...previous,number:index+1,slug:post.slug,title:post.title,topic:article?.intent??'Subtitle format choice',primaryKeyword:article?.keyword??'SRT vs VTT',searchIntent:article?.kind??'comparison',status:'draft',draftComplete:!!complete,reviewStatus:complete?'awaiting owner review':'revision checks incomplete',previewURL:new URL(`/blog/${post.slug}`,base).href,researchReport:previous?.researchReport??`.aenural-local/editorial/aenural-50-2026-11-04/${post.slug}/research.md`,wordCount:qa.wordCount,draftContentHash:qa.contentHash,totalWordCount:qa.totalWordCount,faqWordCount:qa.faqWordCount,faqCount:qa.faqCount,countingConvention:'650–750 main words including H1, introduction, headings, examples, code, tables and visible diagrams. FAQ heading/questions/answers are additional, per owner confirmation 10 November 2026. Excludes shell, metadata and private notes.',checks:{...previous?.checks,http:qa.status,canonical:qa.canonical,robots:qa.robots,structure:qa.errors.length?'issues':'passed',browser:revision?.browser??'pending',publication:'disabled; local review only'}};
  });
  batch.drafted=drafts.length;batch.remainingDrafts=50-drafts.length;batch.updatedAt=new Date().toISOString();batch.project=root;batch.reviewURL=new URL('/blog/review',base).href;
  delete batch.blocker;
  await fs.writeFile(batchFile,JSON.stringify(batch,null,2)+'\n');
  const titles=drafts.map((post,index)=>`${String(index+1).padStart(2,'0')}. ${post.title}\nPrimary keyword: ${batch.articles[index].primaryKeyword}\nLocal page: /blog/${post.slug}\n`).join('\n');
  await fs.mkdir(path.join(root,'docs/blog'),{recursive:true});await fs.writeFile(path.join(root,'docs/blog/50-local-article-titles.txt'),'AENURAL — 50 LOCAL DRAFT ARTICLES\nOwner review required. No publication or measured ranking claims.\n\n'+titles);
  console.log(JSON.stringify({drafts:drafts.length,remaining:50-drafts.length,published:0,reviewURL:batch.reviewURL},null,2));
}

async function production(){
  const pages=[];
  for(const pathname of [...drafts.map(post=>`/blog/${post.slug}`),'/blog/review']){
    const response=await fetch(new URL(pathname,base),{signal:AbortSignal.timeout(30000)}),html=await response.text();
    const robots=new JSDOM(html).window.document.querySelector('meta[name="robots"]')?.content;
    if(response.status!==404||!robots?.includes('noindex'))throw Error(`Draft leaked into production: ${pathname} (${response.status})`);
    pages.push({pathname,status:response.status,robots});
  }
  const [indexResponse,sitemapResponse]=await Promise.all([fetch(new URL('/blog',base)),fetch(new URL('/sitemap.xml',base))]);
  const index=new JSDOM(await indexResponse.text()).window.document;
  const xml=new JSDOM(await sitemapResponse.text(),{contentType:'application/xml'}).window.document;
  if(indexResponse.status!==200||sitemapResponse.status!==200||!sitemapResponse.headers.get('content-type')?.includes('xml')||xml.querySelector('parsererror'))throw Error('Production discovery response invalid');
  for(const post of drafts)if(index.querySelector(`a[href="/blog/${post.slug}"]`)||[...xml.querySelectorAll('loc')].some(loc=>loc.textContent===`${SITE_URL}/blog/${post.slug}`))throw Error(`Draft in production discovery: ${post.slug}`);
  const report={checkedAt:new Date().toISOString(),pages,blogIndexStatus:indexResponse.status,sitemapStatus:sitemapResponse.status,sitemapContentType:sitemapResponse.headers.get('content-type'),draftDiscoveryEntries:0};
  await fs.writeFile(path.join(reports,'production-boundaries.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({unpublishedRoutes:pages.length,all404Noindex:true,blogIndexStatus:200,sitemapStatus:200,draftDiscoveryEntries:0},null,2));
}

switch(process.argv[2]){case 'check':await check();break;case 'references':await references();break;case 'record':await record();break;case 'production':await production();break;default:console.log('Use check, references, record, or production [http://localhost:PORT]. No publication operation is provided.');}
