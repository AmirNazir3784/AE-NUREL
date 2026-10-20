import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url),"utf8");
describe("local SIL OFL caption fonts",()=>{
  it("registers the five font families in global CSS without external visitor requests",()=>{
    const css = read("src/app/aenural-tools.css");
    for (const family of ["Anton","Bebas Neue","Oswald","Playfair Display","DM Sans"])
      assert.ok(css.includes('font-family:"'+family+'"'),family);
    assert.ok(!css.includes("fonts.googleapis.com"));
    assert.ok(!css.includes("raw.githubusercontent.com"));
  });
  it("pins actual upstream font and license bytes and supports a no-write dry run",()=>{
    const script=read("scripts/install-studio-fonts.mjs");
    assert.match(script,/gitBlobSha/);
    assert.match(script,/OFL\.txt/);
    assert.match(script,/raw\.githubusercontent\.com/);
    const run=spawnSync(process.execPath,["scripts/install-studio-fonts.mjs","--dry-run"],{encoding:"utf8",timeout:5000});
    assert.equal(run.status,0,run.stderr);
    assert.match(run.stdout,/no changes made/);
  });
  it("loads the user's chosen font before encoding video",()=>{
    assert.match(read("src/features/caption-studio/studio-media.ts"),/document\.fonts\.load/);
  });
});
