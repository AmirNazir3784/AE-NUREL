import {it} from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {readKeywordWorkbook,compareKeywordCoverage,containsKeyword} from '../scripts/blog/keyword-coverage.mjs';
import {inspectArticle} from '../scripts/blog/autopilot.mjs';

function workbook(sheet){
  return zipSync(Object.fromEntries(Object.entries({
    'xl/workbook.xml':'<workbook xmlns:r="urn:relationships"><sheets><sheet name="Keywords" r:id="r1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':'<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/sharedStrings.xml':'<sst><si><t>Audio-to-text converter</t></si></sst>',
    'xl/worksheets/sheet1.xml':`<worksheet><sheetData>${sheet}</sheetData></worksheet>`,
  }).map(([name,text])=>[name,strToU8(text)])));
}

it('accounts for every keyword cell, deduplicates phrases and separates numeric cells',()=>{
  const result=readKeywordWorkbook(workbook('<row><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>audio to text converter</t></is></c><c r="C1" t="inlineStr"><is><t>14k</t></is></c><c r="D1" t="inlineStr"><is><t>10 mb</t></is></c></row>'));
  assert.equal(result.keywordCells,3);assert.equal(result.uniqueKeywords,2);assert.equal(result.duplicateCells,1);
  assert.equal(result.ignoredCells.length,1);assert.equal(result.ignoredCells[0].cell,'C1');
  assert.deepEqual(result.terms[0].sources.map(source=>source.cell),['A1','B1']);
  assert.equal(result.terms[1].term,'10 mb');
});

it('reports missing phrases even when every article already contains some keyword',()=>{
  const terms=['audio to text','video to audio','srt translator'].map(term=>({term,normalized:term,sources:[]}));
  const result=compareKeywordCoverage({terms},[
    {slug:'one',mainText:'Use audio-to-text for speech.',text:'Use audio-to-text for speech. An SRT translator needs review.'},
    {slug:'two',mainText:'Audio to text needs review.',text:'Audio to text needs review.'},
  ]);
  assert.equal(result.matched,2);assert.equal(result.missing,1);
  assert.equal(result.results[1].status,'missing');
  assert.equal(result.results[2].hits[0].mainMatch,false);
  assert.equal(containsKeyword('Convert audio to video','video to audio'),false);
  assert.equal(containsKeyword('Transcripts are useful','script'),false);
});

it('does not count metadata, URL targets, navigation or alt text as article keywords',()=>{
  const a=inspectArticle('<html><head><title>missing keyword</title></head><body><nav>missing keyword</nav><main><article><header><h1>Speech notes</h1><p>A useful guide.</p></header><div data-blog-content><p>Review the spoken words.</p><a href="/missing-keyword">Useful resource</a><img alt="missing keyword"/><section data-blog-faq><details><summary><h3>Why review?</h3></summary><p>Check names.</p></details></section></div></article></main></body></html>');
  assert.equal(containsKeyword(a.text,'missing keyword'),false);
  assert.equal(containsKeyword(a.text,'check names'),true);
  assert.equal(containsKeyword(a.mainText,'check names'),false);
});

it('stops for formulas rather than silently treating cached values as verified keywords',()=>{
  assert.throws(()=>readKeywordWorkbook(workbook('<row><c r="A1"><f>1+1</f><v>2</v></c></row>')),/Formula cell requires explicit review/);
});
