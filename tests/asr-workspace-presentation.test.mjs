import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { asrBusy, initialAsrSession } from "../src/features/local-asr/asr-session.ts";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/features/local-asr/transcription-workspace.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function render(kind, session = initialAsrSession) {
  const evaluated = { exports: {} };
  const dependencies = {
    react: { ...React, useReducer: () => [session, () => {}], useEffect: () => {}, useRef: value => ({ current: value }), useState: value => [value, () => {}] },
    "@/components/tools/file-upload": { FileUpload: ({ title }) => React.createElement("h2", null, title) },
    "@/components/ui/status-message": { StatusMessage: ({ children }) => React.createElement("p", null, children) },
    "./asr-core": { ASR_CACHE: "test-cache" },
    "./asr-session": { asrBusy, initialAsrSession },
    "./caption-review": { CaptionReview: () => null },
    "./transcription.module.css": { default: {} },
  };
  new Function("require", "module", "exports", compiled)(id => dependencies[id] ?? require(id), evaluated, evaluated.exports);
  return renderToStaticMarkup(React.createElement(evaluated.exports.TranscriptionWorkspace, { kind }));
}
describe("AI preview presentation", () => {
  it("keeps diagnostics out of both preview workspaces, including populated session metadata", () => {
    for (const kind of ["podcast", "subtitle"]) {
      const html = render(kind, { ...initialAsrSession, stage: "complete", result: { backend: "webgpu", loadMs: 123456, inferenceMs: 987654, cacheHits: 777, chunks: [] } });
      assert.doesNotMatch(html, /<pre|revision|Backend:|Cache reads:|123456|987654|777|webgpu/);
      assert.match(html, /Your recording stays on your device/);
      assert.match(html, /about 95 MB/);
      assert.match(html, /<details><summary>Advanced options/);
      assert.ok(html.indexOf("Generate ") < html.indexOf("Advanced options"));
      assert.ok(html.indexOf("Clear downloaded model cache") > html.indexOf("<details>"));
      assert.match(html, /Model licenses and runtime notices/);
      assert.doesNotMatch(html, /<details open/);
    }
  });
  it("shows measured asset bytes with a determinate bar only when total is known", () => {
    const session = { ...initialAsrSession, stage: "download", progress: { stage: "download", file: "raw-revision-model.onnx", loaded: 1250000, total: 5000000 } };
    const known = render("podcast", session);
    assert.match(known, /Current download: 1.25 MB of 5.00 MB/);
    assert.match(known, /<progress[^>]*max="5000000"[^>]*value="1250000"/);
    assert.doesNotMatch(known, /raw-revision-model|ETA|%/);
    const unknown = render("subtitle", { ...session, progress: { ...session.progress, total: undefined } });
    assert.match(unknown, /total unavailable/);
    assert.doesNotMatch(unknown, /<progress/);
    assert.match(unknown, />Cancel</);
  });
  it("preserves raw diagnostic output in the separate development lab", () => {
    const lab = readFileSync(new URL("../src/features/local-asr/engine-lab.tsx", import.meta.url), "utf8");
    assert.match(lab, /ASR_REVISION/);
    assert.match(lab, /JSON.stringify/);
  });
});
