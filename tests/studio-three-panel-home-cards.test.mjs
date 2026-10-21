import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = pathname => readFileSync(new URL("../" + pathname, import.meta.url), "utf8");

describe("simultaneous three-panel Caption Studio",()=>{
 const studio=read("src/features/caption-studio/caption-studio.tsx");
 const css=read("src/features/caption-studio/studio.module.css");
 const guide=read("src/features/caption-studio/studio-guidance.tsx");
 it("keeps independent caption editor, central preview and live StyleControls",()=>{
   assert.match(studio,/styles\.previewPanel/);
   assert.match(studio,/styles\.captionSide/);
   assert.match(studio,/styles\.styleSide/);
   assert.match(studio,/Caption timeline and editing/);
   assert.match(studio,/Style presets and customization/);
   assert.match(studio,/<StyleControls/);
   assert.ok(!studio.includes('role="tablist"'));
   assert.ok(!studio.includes('setPanel('));
   assert.ok(!studio.includes('hidden={panel'));
 });
 it("uses a 3-column desktop grid and responsive 2/1-column fallbacks",()=>{
   assert.match(css,/grid-template-areas:"captions preview style"/);
   assert.match(css,/grid-template-areas:"preview preview" "captions style"/);
   assert.match(css,/grid-template-areas:"preview" "captions" "style"/);
   assert.match(css,/\.previewPanel \{ grid-area:preview/);
   assert.match(css,/\.captionSide \{ grid-area:captions/);
   assert.match(css,/\.styleSide \{ grid-area:style/);
 });
 it("gives each guide card custom animated decorations that respect reduced motion",()=>{
   assert.match(guide,/className=\{styles\.guideStepMotif\}/);
   assert.match(css,/\.guideStep:hover::before/);
   assert.match(css,/\.guideStep:nth-child\(2\)/);
   assert.match(css,/prefers-reduced-motion:reduce/);
 });
});
describe("non-generic AENural homepage cards",()=>{
 const home=read("src/app/page.tsx");
 const toolcard=read("src/components/home/tool-card.tsx");
 const css=read("src/app/aenural.css");
 it("adds step-specific icons and progress marks",()=>{
   assert.match(home,/aen-step-glyph/);
   assert.match(home,/number === "01" \? "subtitle"/);
   assert.match(home,/aen-step-dash/);
   assert.match(css,/\.aen-step:hover .aen-step-glyph/);
 });
 it("adds clear affordances to tool cards",()=>{
   assert.match(toolcard,/aen-card-open/);
   assert.match(css,/\.aen-home \.aen-tool-card:is\(:hover,:focus-visible\)/);
   assert.match(css,/var\(--accent\)/);
   assert.match(css,/var\(--action\)/);
 });
 it("supports light/dark themes, reduced motion and fine hover/focus treatment",()=>{
   assert.match(css,/\.aen-home \.aen-step:nth-child\(2\)/);
   assert.match(css,/color-mix\(in srgb,var\(--accent\)/);
   assert.match(css,/prefers-reduced-motion:reduce/);
   assert.match(css,/@supports\(animation-timeline:view\(\)\)/);
 });
});
