import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (file) => readFileSync(new URL("../" + file, import.meta.url),"utf8");
describe("Caption Studio uncluttered editing workspace",()=>{
  const ui=read("src/features/caption-studio/caption-studio.tsx");
  const css=read("src/features/caption-studio/studio.module.css");
  const motion=read("src/features/caption-studio/style-controls.tsx");
  it("groups generation separately without removing ASR controls or import",()=>{
    assert.match(ui,/className=\{styles\.workflowSection\}/);
    assert.match(ui,/defaultOpen=\{!document\.cues\.length\}/);
    assert.match(ui,/Generate \/ import/);
    assert.match(ui,/<GenerationControls/);
    assert.match(ui,/Import SRT \/ VTT/);
  });
  it("makes timeline, search, edit and undo easier to scan",()=>{
    assert.match(ui,/className=\{styles\.captionToolbar\}/);
    assert.match(ui,/className=\{styles\.cueList\}/);
    assert.match(ui,/className=\{styles\.cueEditor\}/);
    assert.match(ui,/Find a caption…/);
    assert.match(ui,/No captions match/);
    assert.match(css,/-webkit-line-clamp:2/);
    assert.match(css,/\.cueList \.selectedCue/);
  });
  it("exposes motion at the top instead of behind a collapsed Motion dropdown",()=>{
    assert.match(motion,/STUDIO_ANIMATIONS/);
    assert.match(motion,/Animation duration/);
    assert.ok(!motion.includes("<summary>Motion</summary>"));
  });
  it("keeps 25 presets and access to existing caption editing actions",()=>{
    assert.match(motion,/STUDIO_PRESETS\.map\(presetButton\)/);
    for (const text of ["Split at playhead","Merge with next","Sort by time","Apply shift","Delete caption","Undo","Redo"])
      assert.ok(ui.includes(text),text);
  });
});
