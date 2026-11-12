import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {JSDOM} from 'jsdom';
import {blogPosts} from '../../src/content/blog/registry.ts';
import {SITE_URL,SITE_TIMEZONE,get,liveInventory,inspectArticle} from './autopilot.mjs';

export const BATCH_TARGET=50,DAILY_LIMIT=50;
const project=fileURLToPath(new URL('../../',import.meta.url));
const common=execFileSync('git',['rev-parse','--path-format=absolute','--git-common-dir'],{cwd:project,encoding:'utf8'}).trim();
const store=path.join(path.dirname(common),'.aenural-local/editorial');
const filename=path.join(store,'batch-50-2026-11-04.json');
const siteDay=value=>new Intl.DateTimeFormat('en-CA',{timeZone:SITE_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function batchState(batch,live,now=new Date()){
  if(batch.blocker?.scope==='shared')return {result:'BLOCKED',reason:batch.blocker.reason};
  const verified=batch.articles.filter(a=>a.status==='published');
  if(verified.length>=BATCH_TARGET)return {result:'COMPLETE',published:verified.length,remaining:0};
  const pending=batch.articles.find(a=>a.status!=='published'&&a.status!=='failed');
  const atDailyLimit=live.filter(p=>siteDay(p.publishedAt)===siteDay(now)).length>=DAILY_LIMIT;
  if(atDailyLimit&&(!pending||!live.some(p=>p.slug===pending.slug)))return {result:'DAILY LIMIT',published:verified.length,remaining:BATCH_TARGET-verified.length};
  if(pending)return {result:'RESUME',article:pending,published:verified.length,remaining:BATCH_TARGET-verified.length};
  return {result:'ELIGIBLE',articleNumber:verified.length+1,published:verified.length,remaining:BATCH_TARGET-verified.length};
}
async function save(batch){await fs.writeFile(filename+'.tmp',JSON.stringify(batch,null,2)+'\n');await fs.rename(filename+'.tmp',filename);}
async function load(){try{return JSON.parse(await fs.readFile(filename,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;return {id:'aenural-50-2026-11-04',site:SITE_URL,timeZone:SITE_TIMEZONE,target:BATCH_TARGET,maxPerDay:DAILY_LIMIT,reviewMode:false,project,startedAt:new Date().toISOString(),articles:[]};}}
async function main(){
  await fs.mkdir(store,{recursive:true});const lock=await fs.open(path.join(store,'run.lock'),'wx');
  try{
    const [command='audit',slug,arg]=process.argv.slice(2),batch=await load();
    if(batch.site!==SITE_URL||batch.target!==BATCH_TARGET)throw Error('Batch configuration mismatch');
    if(command==='status'){console.log(JSON.stringify(batch,null,2));return;}
    if(batch.publishMode==='draft'&&command!=='audit')throw Error('Local review mode: publication operations are disabled until owner approval.');
    if(command==='audit'||command==='reserve'){
      const live=await liveInventory(),state=batchState(batch,live);
      // Registry-only publication intent must be reconciled before another release.
      const unconfirmed=blogPosts.filter(p=>p.status==='published'&&!live.some(l=>l.slug===p.slug)&&!batch.articles.some(a=>a.slug===p.slug&&['draft','verified'].includes(a.status)));
      if(unconfirmed.length)throw Error('Published registry entries missing live: '+unconfirmed.map(p=>p.slug).join(', '));
      const missing=batch.articles.filter(a=>a.status==='published'&&!live.some(p=>p.slug===a.slug));if(missing.length)throw Error('Previously verified batch articles are missing live; reconcile site integrity before continuing');
      batch.lastAuditAt=new Date().toISOString();batch.liveInventory=live;await save(batch);
      if(command==='audit'){console.log(JSON.stringify({batch:batch.id,live,state},null,2));return;}
      if(state.result==='RESUME'){if(slug&&slug!==state.article.slug)throw Error('Finish the pending article before selecting another');console.log(JSON.stringify(state,null,2));return;}
      if(state.result!=='ELIGIBLE')throw Error(state.result);
      if(live.some(p=>p.slug===slug)||batch.articles.some(a=>a.slug===slug))throw Error('Slug already live or reserved');
      const post=blogPosts.find(p=>p.slug===slug&&p.status==='draft');if(!post)throw Error('Reserve an existing unique draft');
      const article={number:state.articleNumber,slug:post.slug,title:post.title,status:'draft',siteDate:siteDay(new Date()),startedAt:new Date().toISOString(),researchReport:`.aenural-local/editorial/${batch.id}/${post.slug}/research.md`};
      batch.articles.push(article);await save(batch);console.log(JSON.stringify(article,null,2));return;
    }
    const article=batch.articles.find(a=>a.slug===slug);if(!article)throw Error('No reservation for this slug');
    if(command==='capture'){
      if(article.status==='published')throw Error('Already published; do not recapture');
      const url=new URL(arg);if(!['localhost','127.0.0.1'].includes(url.hostname)||url.protocol!=='http:'||url.pathname!==`/blog/${slug}`)throw Error('Capture this article at a loopback preview');
      const inspected=inspectArticle((await get(url.href)).html);
      if(inspected.h1Count!==1||inspected.canonical!==`${SITE_URL}/blog/${slug}`)throw Error('Preview structure/canonical failed');
      Object.assign(article,{status:'verified',contentHash:inspected.contentHash,wordCount:inspected.wordCount,expectedTitle:inspected.title,expectedDescription:inspected.description,checkedAt:new Date().toISOString(),countingConvention:'Whitespace-delimited H1, introduction and full article body including headings, examples, tables, lists, CTAs and FAQ answers; excludes shell, byline/dates, metadata and private notes.'});
      await save(batch);console.log(JSON.stringify(article,null,2));return;
    }
    if(command==='verify'){
      if(!article.contentHash)throw Error('Capture the checked preview first');
      const live=await liveInventory(),entry=live.find(p=>p.slug===slug);if(!entry)throw Error('Article is not in the live inventory');
      const post=blogPosts.find(p=>p.slug===slug);if(!post||post.status!=='published'||entry.publishedAt!==post.publishedAt)throw Error('Live publication date does not match release intent');
      const url=`${SITE_URL}/blog/${slug}`,inspected=inspectArticle((await get(url)).html);
      if(inspected.contentHash!==article.contentHash||inspected.h1Count!==1||inspected.title!==article.expectedTitle||inspected.description!==article.expectedDescription||inspected.canonical!==url||!/^index,\s*follow$/.test(inspected.robots??'')||inspected.articleSchema?.url!==url)throw Error('Live content or SEO does not match checked preview');
      const [{html:xml},{html:index}]=await Promise.all([get(`${SITE_URL}/sitemap.xml`),get(`${SITE_URL}/blog`)]),sitemap=new JSDOM(xml,{contentType:'application/xml'}).window.document;
      if([...sitemap.querySelectorAll('loc')].filter(n=>n.textContent===url).length!==1||!new JSDOM(index).window.document.querySelector(`main a[href="/blog/${slug}"]`))throw Error('Live discovery entries missing or duplicated');
      if(live.filter(p=>siteDay(p.publishedAt)===siteDay(entry.publishedAt)).length>DAILY_LIMIT)throw Error('Daily publication limit exceeded');
      Object.assign(article,{status:'published',publishedURL:url,publishedAt:entry.publishedAt,verifiedLiveAt:new Date().toISOString()});batch.liveInventory=live;await save(batch);console.log(JSON.stringify(article,null,2));return;
    }
    throw Error('Use audit, status, reserve SLUG, capture SLUG LOOPBACK_URL, or verify SLUG');
  }finally{await lock.close();await fs.unlink(path.join(store,'run.lock'));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
