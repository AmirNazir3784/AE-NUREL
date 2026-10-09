import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { categories, tools, toolsInCategory, searchTools, relatedTools } from "../src/lib/tools.ts";

describe("released tool discovery", () => {
  it("lists the sixteen released subtitle tools, without invented future tools", () => {
    assert.deepEqual(tools.map((tool) => tool.href), ["/tools/srt-timing-adjuster", "/tools/srt-merger", "/tools/srt-splitter", "/tools/srt-editor", "/tools/subtitle-sync-fixer", "/tools/subtitle-overlap-fixer", "/tools/srt-to-vtt", "/tools/vtt-to-srt", "/tools/srt-to-txt", "/tools/ass-to-srt", "/tools/srt-to-ass", "/tools/srt-to-json", "/tools/vtt-to-txt", "/tools/sbv-to-srt", "/tools/srt-to-sbv", "/tools/srt-to-mp4"]);
    assert.ok(tools.every((tool) => tool.processing === "local"));
  });
  it("derives category availability from released tools", () => {
    assert.equal(toolsInCategory("subtitle-tools").length, 16);
    for (const category of categories.filter((category) => category.id !== "subtitle-tools")) {
      assert.deepEqual(toolsInCategory(category.id), []);
    }
    assert.equal(categories.reduce((count, category) => count + toolsInCategory(category.id).length, 0), tools.length);
  });
  it("handles case, whitespace, and multiple search terms", () => {
    assert.deepEqual(searchTools("  SRT   TIMING  "), [tools[0], tools[1], tools[3], tools[5], tools[6]]);
    assert.deepEqual(searchTools("earlier subtitle"), [tools[0]]);
    assert.deepEqual(searchTools("merger subtitle"), [tools[1]]);
    assert.deepEqual(searchTools("splitter subtitle"), [tools[2]]);
    assert.deepEqual(searchTools("subtitle editor"), [tools[3]]);
    assert.deepEqual(searchTools("sync fixer"), [tools[4]]);
    assert.deepEqual(searchTools("overlap fixer"), [tools[5]]);
    assert.deepEqual(searchTools("srt vtt converter"), [tools[6], tools[7]]);
    assert.equal(tools[6].group, "Format Conversion");
    assert.deepEqual(searchTools("  "), tools);
  });
  it("links each SRT tool to the others through registry metadata", () => {
    for (const tool of tools) assert.deepEqual(relatedTools(tool.href), tools.filter((other) => other !== tool));
    assert.deepEqual(relatedTools("/tools/not-released"), []);
  });
  it("does not return future categories or partial multi-term matches as tools", () => {
    assert.deepEqual(searchTools("audio"), []);
    assert.deepEqual(searchTools("timing compressor"), []);
  });
});
