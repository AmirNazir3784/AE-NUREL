import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {blogPosts} from '../../src/content/blog/registry.ts';

export const SITE_URL='https://aenural.com';
export const SITE_TIMEZONE='Asia/Karachi';
const root=fileURLToPath(new URL('../../',import.meta.url));
const store=path.join(root,'.aenural-local/editorial');
const day=value=>new Intl.DateTimeFormat('en-CA',{timeZone:SITE_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const hash=text=>createHash('sha256').update(text).digest('hex');
const normalize=text=>text.replace(/\s+/gu,' ').trim();

export function eligibility(posts,records=[],now=new Date()) {
  const today=day(now);
  const published=posts.filter(p=>p.status==='published'&&p.publishedAt&&day(p.publishedAt)===today);
  if(published.length)return {result:'ALREADY PUBLISHED TODAY',posts:published};
  const pending=records.find(r=>r.site===SITE_URL&&r.siteDate===today);
  return pending?{result:'RESUME',record:pending}:{result:'ELIGIBLE',siteDate:today};
}

export function inspectArticle(html) {
  const document=new JSDOM(html).window.document;
  const body=document.querySelector('[data-blog-content]');
  if(!body)throw Error('Missing auditable article content marker');
  const h1=document.querySelector('main article h1');
  const intro=document.querySelector('main article header p');
  const readingCopy=body.cloneNode(true);
  // Original SVG files contain visible instructional words. Include those words
  // in the reading copy/hash so graphics cannot silently evade the word target.
  for(const figure of readingCopy.querySelectorAll('[data-blog-diagram-text]')) {
    const image=figure.querySelector('img');
    image?.replaceWith(document.createTextNode(` ${figure.getAttribute('data-blog-diagram-text')} `));
  }
  // Preserve visible block/label boundaries without splitting inline link words.
  for(const block of readingCopy.querySelectorAll('p,h2,h3,li,td,th,figcaption,div,section,aside,details,summary,span,strong,svg text'))block.append(document.createTextNode(' '));
  const text=normalize([h1?.textContent,intro?.textContent,readingCopy.textContent].join(' '));
  const faqSections=[...readingCopy.querySelectorAll('[data-blog-faq]')];
  const faqText=normalize(faqSections.map(section=>section.textContent).join(' '));
  const faqCount=faqSections.reduce((sum,section)=>sum+section.querySelectorAll('details').length,0);
  for(const section of faqSections)section.remove();
  const mainText=normalize([h1?.textContent,intro?.textContent,readingCopy.textContent].join(' '));
  const schema=[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(n=>{const j=JSON.parse(n.textContent);return j['@graph']??[j];});
  return {document,text,wordCount:text.split(/\s+/u).length,
    mainText,mainWordCount:mainText.split(/\s+/u).length,
    faqWordCount:faqText?faqText.split(/\s+/u).length:0,faqCount,contentHash:hash(text),
    title:document.title,description:document.querySelector('meta[name="description"]')?.content,
    canonical:document.querySelector('link[rel="canonical"]')?.href,
    robots:document.querySelector('meta[name="robots"]')?.content,
    articleSchema:schema.find(n=>n['@type']==='BlogPosting'),
    h1Count:document.querySelectorAll('h1').length,
    links:[...body.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))};
}

export async function get(url) {
  const response=await fetch(url,{signal:AbortSignal.timeout(30000),redirect:'follow'});
  if(response.status!==200||response.url!==url)throw Error(`Expected direct HTTP 200 at ${url}; got ${response.status} at ${response.url}`);
  return {html:await response.text(),type:response.headers.get('content-type')};
}
export async function liveInventory() {
  const [{html:index},{html:xml,type}]=await Promise.all([get(`${SITE_URL}/blog`),get(`${SITE_URL}/sitemap.xml`)]);
  if(!/^(application|text)\/xml/.test(type??''))throw Error('Live sitemap has the wrong content type');
  const sitemap=new JSDOM(xml,{contentType:'application/xml'}).window.document;
  const indexDocument=new JSDOM(index).window.document;
  const urls=new Set([...sitemap.querySelectorAll('loc')].map(n=>n.textContent));
  for(const anchor of indexDocument.querySelectorAll('main a[href]'))urls.add(new URL(anchor.getAttribute('href'),SITE_URL).href);
  const posts=[];
  for(const url of urls) {
    if(!url.startsWith(`${SITE_URL}/blog/`))continue;
    const {html}=await get(url);
    const document=new JSDOM(html).window.document;
    const schema=[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(n=>{const j=JSON.parse(n.textContent);return j['@graph']??[j];});
    const article=schema.find(n=>n['@type']==='BlogPosting'||n['@type']==='Article');
    if(!article?.datePublished||!Number.isFinite(Date.parse(article.datePublished)))throw Error(`Cannot establish live publication date: ${url}`);
    posts.push({url,slug:url.split('/').at(-1),status:'published',publishedAt:article.datePublished,title:article.headline});
  }
  return posts;
}
async function records() {
  const names=await fs.readdir(store).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
  return Promise.all(names.filter(n=>/^\d{4}-\d{2}-\d{2}\.json$/.test(n)).map(async n=>JSON.parse(await fs.readFile(path.join(store,n),'utf8'))));
}
async function save(record) {
  const destination=path.join(store,`${record.siteDate}.json`);
  await fs.writeFile(destination+'.tmp',JSON.stringify(record,null,2)+'\n');
  await fs.rename(destination+'.tmp',destination);
}
async function main() {
  await fs.mkdir(store,{recursive:true});
  const lock=await fs.open(path.join(store,'run.lock'),'wx');
  try {
    const [command='audit',value]=process.argv.slice(2);
    const existing=await records();
    if(command==='audit'||command==='reserve') {
      const live=await liveInventory();
      // A staged registry entry is release intent, not proof of deployment.
      // Resume its reservation until the public article actually exists.
      const pending=existing.find(r=>r.site===SITE_URL&&r.siteDate===day(new Date())&&r.status!=='published');
      const local=blogPosts.filter(p=>!(pending?.slug===p.slug&&!live.some(item=>item.slug===p.slug)));
      const state=eligibility([...local,...live],existing);
      if(state.result==='ALREADY PUBLISHED TODAY'&&!live.some(p=>day(p.publishedAt)===day(new Date()))) {
        state.result='BLOCKED';state.reason='Registry contains a publication dated today but live deployment is unconfirmed; reconcile it before creating anything else.';
      }
      if(command==='audit'){console.log(JSON.stringify({site:SITE_URL,timeZone:SITE_TIMEZONE,livePosts:live,state},null,2));return;}
      if(state.result==='BLOCKED')throw Error(state.reason);
      if(state.result==='ALREADY PUBLISHED TODAY'){console.log(JSON.stringify(state,null,2));return;}
      if(state.result==='RESUME'){if(value&&value!==state.record.slug)throw Error('Resume the reserved article; no second candidate this day');console.log(JSON.stringify(state,null,2));return;}
      const post=blogPosts.find(p=>p.slug===value);
      if(!post||post.status!=='draft')throw Error('Reserve an existing unique draft');
      const record={site:SITE_URL,timeZone:SITE_TIMEZONE,siteDate:state.siteDate,startedAt:new Date().toISOString(),slug:post.slug,title:post.title,status:'draft',researchReport:`.aenural-local/editorial/${state.siteDate}-subtitle-sync/research.md`};
      await save(record);console.log(JSON.stringify(record,null,2));return;
    }
    const record=existing.find(r=>r.slug===value&&r.siteDate===day(new Date()));
    if(!record)throw Error('No reserved run for this article today');
    if(command==='capture') {
      const url=process.argv[4];
      if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+\/blog\//.test(url??''))throw Error('Capture only a loopback article preview');
      const {html}=await get(url);const article=inspectArticle(html);
      if(article.h1Count!==1||article.canonical!==`${SITE_URL}/blog/${record.slug}`)throw Error('Preview structure/canonical failed');
      record.contentHash=article.contentHash;record.wordCount=article.wordCount;record.expectedTitle=article.title;record.expectedDescription=article.description;
      record.countingConvention='Whitespace-delimited words in H1, introduction and complete article body, including headings, tables, lists, CTA and all FAQ answers; excludes shell/navigation, metadata, byline/date and notes.';
      record.checkedAt=new Date().toISOString();record.status='verified';await save(record);
      console.log(JSON.stringify({status:record.status,wordCount:record.wordCount,contentHash:record.contentHash},null,2));return;
    }
    if(command==='verify') {
      if(!record.contentHash)throw Error('Capture a checked preview before verifying publication');
      const live=await liveInventory();
      const other=live.filter(p=>day(p.publishedAt)===record.siteDate&&p.slug!==record.slug);
      if(other.length)throw Error('Another article was published today; do not publish a second');
      const post=live.find(p=>p.slug===record.slug);
      if(!post||day(post.publishedAt)!==record.siteDate)throw Error('Article is not live with today’s publication date');
      const url=`${SITE_URL}/blog/${record.slug}`;const {html}=await get(url);const article=inspectArticle(html);
      if(article.contentHash!==record.contentHash||article.h1Count!==1||article.title!==record.expectedTitle||article.description!==record.expectedDescription||article.canonical!==url||!/^index,\s*follow$/.test(article.robots??'')||article.articleSchema?.url!==url)throw Error('Live article does not match approved preview or SEO requirements');
      const [{html:xml},{html:index}]=await Promise.all([get(`${SITE_URL}/sitemap.xml`),get(`${SITE_URL}/blog`)]);
      const sitemap=new JSDOM(xml,{contentType:'application/xml'}).window.document;
      if([...sitemap.querySelectorAll('loc')].filter(n=>n.textContent===url).length!==1||!new JSDOM(index).window.document.querySelector(`main a[href="/blog/${record.slug}"]`))throw Error('Directory/sitemap publication missing or duplicated');
      record.status='published';record.publishedURL=url;record.publishedAt=post.publishedAt;record.verifiedLiveAt=new Date().toISOString();await save(record);console.log(JSON.stringify(record,null,2));return;
    }
    throw Error('Use audit, reserve SLUG, capture SLUG LOOPBACK_URL, or verify SLUG');
  } finally {await lock.close();await fs.unlink(path.join(store,'run.lock'));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
