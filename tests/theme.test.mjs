import { readFileSync, existsSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const read = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const css = read("src/app/globals.css");
const layout = read("src/app/layout.tsx");
const header = read("src/components/site/header.tsx");

describe("native automatic system theme", () => {
  it("provides the approved light default and dark preference palette in render-blocking CSS", () => {
    assert.match(css, /:root\s*\{\s*color-scheme: light;/);
    assert.match(css, /@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{\s*color-scheme: dark;/);
    assert.match(css, /--background: #ffffff/);
    assert.match(css, /--background: #0f1716/);
    assert.match(layout, /import "\.\/globals.css"/);
  });
  it("needs no theme DOM mutation or preference storage at initial load, refresh or live media changes", () => {
    for (const file of ["src/app/globals.css", "src/app/aenural.css", "src/app/aenural-tools.css", "src/app/layout.tsx", "src/components/site/header.tsx"])
      assert.doesNotMatch(read(file), /data-theme|themeInitialization|toolsuite-theme|toggleTheme|matchMedia|theme-toggle/);
    assert.doesNotMatch(layout, /aenural-theme-init|suppressHydrationWarning/);
    assert.equal(existsSync(new URL("../src/lib/theme.ts", import.meta.url)), false);
  });
  it("removes public switching controls while retaining header search, mobile navigation and focus restoration", () => {
    assert.doesNotMatch(header, /ThemeToggle|Switch to (?:light|dark)/);
    assert.match(header, /aria-label="Search tools"/);
    assert.match(header, /aria-label="Mobile navigation"/);
    assert.match(header, /onClose=\{\(\) => searchTrigger.current\?\.focus\(\)\}/);
    assert.match(header, /const results = searchTools\(query\)/);
  });
  it("keeps brand accents and workspace shadows responsive to the same native preference", () => {
    assert.match(read("src/app/aenural.css"), /@media \(prefers-color-scheme: dark\) \{ \.aen-hero h1 > span, \.aen-brand-accent/);
    assert.match(read("src/app/aenural-tools.css"), /@media \(prefers-color-scheme: dark\) \{ \.aen-workspace/);
  });
});
