import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {unzipSync} from 'fflate';
import {JSDOM} from 'jsdom';
import {inspectArticle} from './autopilot.mjs';
import {blogPosts} from '../../src/content/blog/registry.ts';
import {BLOG_RELEASE_SLUGS} from '../../src/content/blog/releases/2026-11-12.ts';
const batchSlugs=new Set(BLOG_RELEASE_SLUGS);

// Phrase coverage is deliberately narrower than semantic/topic coverage.
// Case, Unicode punctuation and hyphens are normalized; word order is retained.
export const normalizeKeyword=value=>value.normalize('NFKC').toLowerCase()
  .replace(/[\p{P}\p{S}]+/gu,' ').replace(/\s+/gu,' ').trim();
export const containsKeyword=(text,term)=>
  (` ${normalizeKeyword(text)} `).includes(` ${normalizeKeyword(term)} `);

export function readKeywordWorkbook(bytes) {
  const zip=unzipSync(bytes),decoder=new TextDecoder();
  const xml=name=>{
    if(!zip[name])throw Error(`Missing workbook part: ${name}`);
    const doc=new JSDOM(decoder.decode(zip[name]),{contentType:'application/xml'}).window.document;
    if(doc.querySelector('parsererror'))throw Error(`Invalid XML: ${name}`);
    return doc;
  };
  const shared=zip['xl/sharedStrings.xml']?[...xml('xl/sharedStrings.xml').querySelectorAll('si')]
    .map(si=>[...si.querySelectorAll('t')].map(t=>t.textContent).join('')):[];
  const rels=new Map([...xml('xl/_rels/workbook.xml.rels').querySelectorAll('Relationship')]
    .map(r=>[r.getAttribute('Id'),r.getAttribute('Target')]));
  const terms=new Map(),ignoredCells=[],sheets=[];
  let keywordCells=0;
  for(const sheet of xml('xl/workbook.xml').querySelectorAll('sheet')){
    const name=sheet.getAttribute('name'),target=rels.get(sheet.getAttribute('r:id'));
    if(!target)throw Error(`Missing worksheet relationship: ${name}`);
    const file=target.startsWith('/')?target.slice(1):path.posix.normalize(`xl/${target}`);
    if(!file.startsWith('xl/'))throw Error('Worksheet outside workbook');
    let count=0;
    for(const cell of xml(file).querySelectorAll('sheetData c')){
      if(cell.querySelector('f'))throw Error(`Formula cell requires explicit review: ${name}!${cell.getAttribute('r')}`);
      const type=cell.getAttribute('t'),cached=cell.querySelector('v')?.textContent??'';
      const value=type==='s'?shared[Number(cached)]:type==='inlineStr'
        ?[...cell.querySelectorAll('is t')].map(t=>t.textContent).join(''):cached;
      if(value===undefined)throw Error(`Invalid shared string: ${name}!${cell.getAttribute('r')}`);
      const term=value.trim();if(!term)continue;
      const source={sheet:name,cell:cell.getAttribute('r'),term};
      if(/^\d[\d.,]*\s*[kmb]?$/i.test(term)){
        ignoredCells.push({...source,reason:'Numeric/volume-looking cell, not a keyword; no volume claim verified.'});continue;
      }
      keywordCells++;count++;
      const normalized=normalizeKeyword(term);
      if(!terms.has(normalized))terms.set(normalized,{term,normalized,sources:[]});
      terms.get(normalized).sources.push(source);
    }
    sheets.push({name,keywordCells:count});
  }
  return {sha256:createHash('sha256').update(bytes).digest('hex'),sheets,keywordCells,
    uniqueKeywords:terms.size,duplicateCells:keywordCells-terms.size,ignoredCells,terms:[...terms.values()]};
}

export function compareKeywordCoverage(workbook,articles) {
  const results=workbook.terms.map(term=>{
    const hits=articles.filter(article=>containsKeyword(article.text,term.term)).map(article=>({
      slug:article.slug,mainMatch:containsKeyword(article.mainText,term.term),
    }));
    return {...term,status:hits.length?'matched':'missing',hits};
  });
  const inventory={...workbook};delete inventory.terms;
  return {...inventory,articleCount:articles.length,matched:results.filter(row=>row.hits.length).length,
    missing:results.filter(row=>!row.hits.length).length,results};
}

async function main(){
  const [source,output,base='http://localhost:3000']=process.argv.slice(2);
  if(!source||!output)throw Error('Usage: node scripts/blog/keyword-coverage.mjs WORKBOOK OUTPUT.json [LOOPBACK_URL]');
  const url=new URL(base);
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.protocol!=='http:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password)
    throw Error('Use a loopback HTTP origin for local draft review');
  const workbook=readKeywordWorkbook(await fs.readFile(source)),articles=[],articleChecks=[];
  const titles=new Set(),descriptions=new Set();
  for(const post of blogPosts){
    const response=await fetch(new URL(`/blog/${post.slug}`,url),{redirect:'error',signal:AbortSignal.timeout(90000)});
    if(response.status!==200)throw Error(`${post.slug}: HTTP ${response.status}; no saved-text fallback`);
    let html=await response.text();
    // The original published tutorial predates the audit marker. Scope its
    // supplemental reading copy to registered content sections, excluding TOCs.
    if(post.status==='published'){
      const document=new JSDOM(html).window.document;
      if(!document.querySelector('[data-blog-content]')){
        const wrapper=document.createElement('div');wrapper.setAttribute('data-blog-content','');
        for(const section of post.sections){
          const node=document.getElementById(section.id);
          if(!node)throw Error(`Missing published article section: ${section.id}`);
          wrapper.append(node);
        }
        document.querySelector('main article').append(wrapper);html=document.documentElement.outerHTML;
      }
    }
    const article=inspectArticle(html);
    articles.push({slug:post.slug,status:post.status,text:article.text,mainText:article.mainText});
    if(batchSlugs.has(post.slug)){
      const errors=[],d=article.document;
      if(article.mainWordCount<650||article.mainWordCount>750)errors.push('Main article outside 650–750 words');
      if(article.faqCount<10)errors.push('Fewer than ten FAQs');
      if(article.h1Count!==1)errors.push('H1 count');
      if(article.canonical!==`https://aenural.com/blog/${post.slug}`)errors.push('Canonical');
      if(post.status==='published'){
        if(article.robots!=='index, follow'||article.articleSchema?.url!==`https://aenural.com/blog/${post.slug}`||article.articleSchema?.datePublished!==post.publishedAt)
          errors.push('Published metadata/schema boundary');
      }else if(article.robots!=='noindex, nofollow'||article.articleSchema||post.publishedAt)errors.push('Draft publication boundary');
      if(!article.title||!article.description||titles.has(article.title)||descriptions.has(article.description))errors.push('Missing/duplicate metadata');
      titles.add(article.title);descriptions.add(article.description);
      const ids=[...d.querySelectorAll('[id]')].map(node=>node.id);
      if(new Set(ids).size!==ids.length)errors.push('Duplicate IDs');
      for(const anchor of d.querySelectorAll('main a[href^="#"]'))
        if(!d.getElementById(anchor.getAttribute('href').slice(1)))errors.push('Missing section anchor');
      if(/browser-based|on-device|on your (?:computer|device)|TODO|lorem ipsum/i.test(article.mainText))errors.push('Copy preference/placeholder');
      articleChecks.push({slug:post.slug,publicationStatus:post.status,status:response.status,mainWords:article.mainWordCount,
        faqWords:article.faqWordCount,faqCount:article.faqCount,contentHash:article.contentHash,errors});
    }
  }
  const report={checkedAt:new Date().toISOString(),source:path.basename(source),base:url.origin,
    method:'Visible article text, including FAQs and original diagram words; excludes shell, metadata, URL destinations and alt metadata. Normalized whole phrases, original word order. No semantic-equivalence claim.',
    scope:'The 50 articles in the explicit 12 November release, regardless of current draft/published status; existing publications checked separately.',
    ...compareKeywordCoverage(workbook,articles.filter(article=>batchSlugs.has(article.slug))),
    articleChecks,publishedSupplement:compareKeywordCoverage(workbook,articles.filter(article=>article.status==='published'&&!batchSlugs.has(article.slug)))};
  await fs.mkdir(path.dirname(output),{recursive:true});
  await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({output,articles:report.articleCount,keywords:report.uniqueKeywords,matched:report.matched,missing:report.missing,articleErrors:articleChecks.filter(article=>article.errors.length)}));
  if(articleChecks.some(article=>article.errors.length))process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
