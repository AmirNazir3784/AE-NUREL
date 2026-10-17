import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { tools } from "../src/lib/tools.ts";

const expected = ["srt-to-vtt", "vtt-to-srt", "srt-to-ass", "srt-to-txt", "srt-to-json", "vtt-to-txt", "srt-to-mp4", "sbv-to-srt", "srt-to-sbv", "ass-to-srt"];
const added = ["vtt-to-txt", "sbv-to-srt", "srt-to-sbv", "srt-to-mp4"];
describe("completed Format Conversion discovery", () => {
  it("publishes exactly the ten approved format tools and sixteen free tools", () => {
    assert.deepEqual(tools.filter(t => t.group === "Format Conversion").map(t => t.href.split("/").at(-1)).sort(), [...expected].sort());
    assert.equal(tools.length, 16);
    assert.equal(new Set(tools.map(t => t.href)).size, 16);
  });
  it("gives the four new pages unique metadata, H1s, breadcrumbs and related tools", async () => {
    const titles = new Set();
    for (const route of added) {
      const page = await readFile(new URL("../src/app/tools/" + route + "/page.tsx", import.meta.url), "utf8");
      const title = /pageMetadata\("([^"]+)"/.exec(page)?.[1];
      assert.ok(title); titles.add(title);
      assert.ok(page.includes('ToolHeader title="' + title + '"'));
      assert.match(page, /<ToolLayout/); assert.match(page, /<RelatedTools/);
      assert.ok(page.includes('"/tools/' + route + '"'));
      assert.doesNotMatch(page, /index: false/);
    }
    assert.equal(titles.size, 4);
  });
  it("includes all released converters in the sitemap when a real origin is configured", async () => {
    let source = await readFile(new URL("../src/app/sitemap.ts", import.meta.url), "utf8");
    source = source.replace('"@/lib/tools"', JSON.stringify(new URL("../src/lib/tools.ts", import.meta.url).href))
      .replace('"@/lib/site-origin"', JSON.stringify(new URL("../src/lib/site-origin.ts", import.meta.url).href));
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
    const { default: sitemap } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
    const previous = process.env.SITE_URL;
    try {
      process.env.SITE_URL = "https://tools.example";
      const urls = sitemap().map(entry => entry.url);
      assert.equal(urls.length, 24);
      for (const route of expected) assert.ok(urls.includes("https://tools.example/tools/" + route));
      delete process.env.SITE_URL; assert.deepEqual(sitemap(), []);
    } finally { if (previous === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = previous; }
  });
  it("loads video encoding only after rendering is requested, with no file-upload endpoint", async () => {
    const component = await readFile(new URL("../src/features/srt-to-mp4/srt-to-mp4.tsx", import.meta.url), "utf8");
    const renderer = await readFile(new URL("../src/features/srt-to-mp4/render-mp4.ts", import.meta.url), "utf8");
    assert.ok(component.indexOf('import("./render-mp4")') > component.indexOf("async function render()"));
    assert.match(renderer, /await import\("mediabunny"\)/);
    assert.doesNotMatch(component + renderer, /fetch\(|XMLHttpRequest|FormData|\/api\//);
    assert.match(component, /video.id !== operation.current/);
  });
});
