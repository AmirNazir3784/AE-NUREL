import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import ts from "typescript";
import { autoCaptionReleased } from "../src/lib/caption-release.ts";

async function metadataRoute(name) {
  const source = (await readFile(new URL(`../src/app/${name}.ts`, import.meta.url), "utf8"))
    .replace('"@/lib/tools"', JSON.stringify(new URL("../src/lib/tools.ts", import.meta.url).href))
    .replace('"@/lib/site-origin"', JSON.stringify(new URL("../src/lib/site-origin.ts", import.meta.url).href));
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  return (await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"))).default;
}

const sitemap = await metadataRoute("sitemap");
const robots = await metadataRoute("robots");

function withSiteUrl(value, task) {
  const previous = process.env.SITE_URL;
  if (value === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = value;
  try { task(); }
  finally {
    if (previous === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previous;
  }
}

describe("public sitemap and robots discovery", () => {
  it("publishes canonical HTTPS URLs and preserves crawler rules without valid environment configuration", () => {
    for (const value of [undefined, "", "http://localhost:3000", "https://aenural.com/path"]) {
      withSiteUrl(value, () => {
        const urls = sitemap().map(entry => entry.url);
        assert.ok(urls.length >= 26);
        assert.equal(new Set(urls).size, urls.length);
        for (const url of urls) {
          const parsed = new URL(url);
          assert.equal(parsed.origin, "https://aenural.com");
          assert.equal(parsed.search + parsed.hash, "");
        }
        assert.ok(urls.includes("https://aenural.com/"));
        assert.deepEqual(robots(), {
          rules: { userAgent: "*", allow: "/" },
          sitemap: "https://aenural.com/sitemap.xml",
        });
      });
    }
  });

  it("covers every existing indexable page and excludes private, noindex and redirect routes", async () => {
    const app = new URL("../src/app/", import.meta.url);
    const expected = [];
    for (const path of await readdir(app, { recursive: true })) {
      if (!/(^|[\\/])page\.tsx$/.test(path)) continue;
      const source = await readFile(new URL(path.replaceAll("\\", "/"), app), "utf8");
      if (/index:\s*false/.test(source)) continue;
      if (source.includes("index: autoCaptionReleased()") && !autoCaptionReleased()) continue;
      const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = node => {
        if (ts.isCallExpression(node) && node.expression.getText(ast) === "pageMetadata") {
          const route = node.arguments[2];
          assert.ok(route && ts.isStringLiteral(route), `Review dynamic canonical route in ${path}`);
          expected.push(route.text);
        }
        ts.forEachChild(node, visit);
      };
      visit(ast);
    }
    withSiteUrl(undefined, () => {
      const paths = sitemap().map(entry => new URL(entry.url).pathname);
      assert.deepEqual(paths.toSorted(), expected.toSorted());
      for (const path of paths) {
        assert.doesNotMatch(path, /^\/(?:api|dev|admin|account)(?:\/|$)|^\/(?:pricing|checkout|sign-in|sign-up|forgot-password|reset-password|verify-email)$|^\/tools\/(?:free-subtitle-generator|podcast-to-captions|lyrics-to-captions)$/);
      }
    });
  });
});
