import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import nano from 'next/dist/compiled/cssnano-simple/index.js';
import { JSDOM } from 'jsdom';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
describe('production CSS minifier regression',()=>{
  const minify=css=>postcss([nano({colormin:false},postcss)]).process(css,{from:undefined});
  it('reproduces the exact generated escaped-space failure',async()=>{
    await assert.rejects(minify(String.raw`:is(.editor-row-buttons,.merge-row-actions) button:is([aria-label^=Delete\ ],[aria-label^=Remove\ ]):not(:disabled){color:var(--error)}`),/Cannot read properties of undefined/);
  });
  it('minifies the actual replacement rules with the production minifier',async()=>{
    const rules=read('src/app/globals.css').split('\n').filter(line=>line.includes('button.destructive-action'));
    assert.equal(rules.length,2);const result=await minify(rules.join('\n'));assert.match(result.css,/button\.destructive-action/);assert.match(result.css,/:hover:not\(:disabled\)/);
    assert.doesNotMatch(read('src/app/globals.css'),/aria-label\^="(?:Delete|Remove) "/);
    assert.match(read('src/features/srt-editor/cue-editor.tsx'),/className="text-button destructive-action"[^>]+aria-label=\{`Delete cue/);
    assert.match(read('src/features/srt-merger/file-list.tsx'),/className="merge-icon-button destructive-action"[^>]+aria-label=\{`Remove file/);
  });
  it('keeps exactly the same enabled action targets and specificity',()=>{
    const dom=new JSDOM('<div class="editor-row-buttons"><button id="add" aria-label="Add below"></button><button class="destructive-action" id="delete" aria-label="Delete cue 1"></button><button disabled class="destructive-action" id="disabled" aria-label="Delete cue 2"></button></div><div class="merge-row-actions"><button id="replace" aria-label="Replace file 1"></button><button class="destructive-action" id="remove" aria-label="Remove file 1, sample.srt"></button></div>');
    const old=':is(.editor-row-buttons,.merge-row-actions) button:is([aria-label^="Delete "],[aria-label^="Remove "]):not(:disabled)';
    const replacement=':is(.editor-row-buttons,.merge-row-actions) button.destructive-action:not(:disabled)';
    const ids=selector=>Array.from(dom.window.document.querySelectorAll(selector),el=>el.id);
    assert.deepEqual(ids(replacement),ids(old));assert.deepEqual(ids(replacement),['delete','remove']);dom.window.close();
  });
});
describe('UI finishing and branding contracts',()=>{
  it('prevents the invisible first-selector bug and pins viewport positioning',()=>{
    const css=read('src/components/site/auth-preview.module.css');assert.equal(css.charCodeAt(0),46);assert.ok(!css.includes('\uFEFF'));assert.match(css,/\.dialog \{ position: fixed; inset: 0; margin: auto;/);
    assert.equal(postcss.parse(css).first.selector,'.dialog');assert.match(css,/overflow: auto/);
  });
  it('uses the official transparent image without retyped branding or generated paths',()=>{
    const brand=read('src/components/site/brand.tsx');assert.match(brand,/aenural-official-logo-transparent\.png/);assert.match(brand,/width=\{1000\} height=\{1000\}/);assert.match(brand,/unoptimized/);assert.doesNotMatch(brand,/<svg|<path|>AE</);
    const png=readFileSync(new URL('../public/branding/aenural-official-logo-transparent.png',import.meta.url));assert.equal(png.readUInt32BE(16),1000);assert.equal(png.readUInt32BE(20),1000);assert.equal(png[25],6);
    assert.match(read('src/app/layout.tsx'),/url: "\/branding\/aenural-icon-96\.png", sizes: "96x96"/);
  });
  it('removes the requested directory intro/buttons while preserving cards and anchor',()=>{
    assert.doesNotMatch(read('src/app/tools/page.tsx'),/Free online utilities|focused subtitle tools|aen-category-badge">Free tools/);
    const directory=read('src/components/tools/tool-directory.tsx');assert.doesNotMatch(directory,/<nav|Tool groups|v1-group-links/);assert.match(directory,/id="free-tools"/);assert.match(directory,/<ToolCard/);
  });
  it('removes developer copy while keeping real route gates and honest account behavior',()=>{
    for(const file of ['src/app/tools/free-subtitle-generator/page.tsx']){
      const page=read(file);assert.doesNotMatch(page,/Development Preview|Development preview|release verification pending|This preview/);assert.match(page,/process\.env\.NODE_ENV === "production"\) notFound\(\)/);assert.match(page,/redirect\("\/tools\/free-audio-to-text-converter-online"\)/);
    }
    const modal=read('src/components/site/auth-preview-modal.tsx');assert.doesNotMatch(modal,/Development preview|backend.*connected/);assert.match(modal,/Use sample details only/);assert.match(modal,/Nothing was sent or saved/);
    assert.match(JSON.parse(read('package.json')).scripts.build,/^next build --webpack$/);
  });
});
