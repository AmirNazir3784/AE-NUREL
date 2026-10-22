import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
describe("SRT workspace and upload centering", () => {
  const globals = css("src/app/globals.css");
  const tools = css("src/app/aenural-tools.css");
  it("centers the narrower timing, merger and sync tool frames without changing widths", () => {
    for (const [name, width] of [["timing",760],["merge",1180],["sync",960]]) {
      const target = ".tool-page:has(.v1-" + name + "-workspace) .tool-frame";
      assert.ok(globals.includes(target + " { max-width: " + width + "px; width: 100%; margin-inline: auto; }"), name);
    }
  });
  it("centers the standalone splitter before any output manifest exists", () => {
    assert.match(globals, /\.v1-split-workspace:not\(:has\(\.v1-split-manifest\)\)\s*\{[^}]*margin-inline:\s*auto;/);
  });
  it("centers only initial converter upload content, retaining loaded file rows", () => {
    assert.match(tools, /\.aen-tool-page \.aen-file-converter \.upload-zone:not\(\.has-file\)\s*\{[^}]*align-items:\s*center;[^}]*text-align:\s*center;/);
    assert.ok(!tools.includes(".aen-file-converter .upload-zone.has-file { text-align: center"));
  });
  it("centers confirmation dialogs and makes model loading visibly animated", () => {
    assert.match(globals, /\.v1-leave-dialog\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;[^}]*margin:\s*auto;/);
    const component = css("src/features/caption-studio/generation-controls.tsx");
    const style = css("src/features/caption-studio/studio.module.css");
    assert.match(component, /generationMeterBusy/);
    assert.match(style, /background:var\(--action\)/);
    assert.match(style, /@keyframes aenuralCaptionMeterMove/);
  });
  it("centers empty file-upload invitations in all six Timing & Editing tools", () => {
    const selector = ".aen-tool-page :is(.aen-timing, .aen-merger, .aen-splitter, .aen-editor, .aen-sync, .aen-overlap) .upload-zone:not(.has-file)";
    const start = tools.indexOf(selector + " {");
    assert.notEqual(start, -1);
    const block = tools.slice(start, tools.indexOf("}", start) + 1);
    for (const rule of ["display: flex;", "flex-direction: column;", "align-items: center;", "text-align: center;"]) assert.ok(block.includes(rule), rule);
    assert.ok(tools.includes(selector + " .button { margin: 4px 0 0; max-width: 100%; }"));
    assert.ok(!tools.includes(".upload-zone.has-file { text-align: center"));
    for (const name of ["aen-timing", "aen-merger", "aen-splitter", "aen-editor", "aen-sync", "aen-overlap"]) assert.ok(selector.includes(name), name);
  });
});
