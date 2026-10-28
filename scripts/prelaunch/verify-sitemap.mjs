import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// Audit the real HTTP responses, locally or after deployment. Never send media
// or credentials: this only requests public HTML, sitemap.xml and robots.txt.
const base = new URL(process.argv[2] ?? "http://127.0.0.1:3117");
const canonicalOrigin = "https://aenural.com";
assert.ok(["http:", "https:"].includes(base.protocol));

async function get(path) {
  const response = await fetch(new URL(path, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
    headers: { "Cache-Control": "no-cache" },
  });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  assert.doesNotMatch(response.headers.get("x-robots-tag") ?? "", /\b(?:noindex|none)\b/i, path);
  return { response, text: await response.text() };
}

const sitemap = await get("/sitemap.xml");
assert.match(sitemap.response.headers.get("content-type") ?? "", /^(?:application|text)\/xml\b/i);
const xml = new JSDOM(sitemap.text, { contentType: "application/xml" });
const root = xml.window.document.documentElement;
assert.equal(root.localName, "urlset");
assert.equal(root.namespaceURI, "http://www.sitemaps.org/schemas/sitemap/0.9");
const urls = Array.from(root.children, entry => {
  assert.equal(entry.localName, "url");
  assert.equal(entry.namespaceURI, root.namespaceURI);
  const locs = entry.getElementsByTagNameNS(root.namespaceURI, "loc");
  assert.equal(locs.length, 1);
  const url = new URL(locs[0].textContent);
  assert.equal(url.origin, canonicalOrigin);
  assert.equal(url.search + url.hash, "");
  assert.equal(url.username + url.password, "");
  assert.ok(url.pathname === "/" || !url.pathname.endsWith("/"));
  return url.href;
});
xml.window.close();
assert.ok(urls.length > 0, "Sitemap must not be empty");
assert.equal(new Set(urls).size, urls.length, "Duplicate sitemap URLs");
assert.ok(urls.includes(canonicalOrigin + "/"));

const robots = await get("/robots.txt");
assert.match(robots.text, /^User-Agent:\s*\*\s*$/im);
assert.match(robots.text, /^Allow:\s*\/\s*$/im);
assert.ok(robots.text.split(/\r?\n/).some(line => line.trim() === `Sitemap: ${canonicalOrigin}/sitemap.xml`));

let next = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (next < urls.length) {
    const url = urls[next++];
    const path = new URL(url).pathname;
    const page = await get(path);
    assert.match(page.response.headers.get("content-type") ?? "", /^text\/html\b/i, path);
    const dom = new JSDOM(page.text);
    try {
      const doc = dom.window.document;
      const canonicals = doc.querySelectorAll('link[rel="canonical"]');
      assert.equal(canonicals.length, 1, `${path}: expected one canonical`);
      // Next.js serializes the homepage canonical without the optional final
      // slash; URL normalization treats both HTTPS origin forms identically.
      assert.equal(new URL(canonicals[0].getAttribute("href")).href, url, `${path}: mismatched canonical`);
      for (const meta of doc.querySelectorAll('meta[name="robots"], meta[name="googlebot"]')) {
        assert.doesNotMatch(meta.content, /\b(?:noindex|none)\b/i, `${path}: noindex page in sitemap`);
      }
    } finally { dom.window.close(); }
  }
}));

console.log(JSON.stringify({ base: base.origin, sitemapStatus: sitemap.response.status, contentType: sitemap.response.headers.get("content-type"), validXml: true, urls: urls.length, allPages: "HTTP 200, indexable, unique matching HTTPS canonical URLs", robotsSitemap: canonicalOrigin + "/sitemap.xml" }, null, 2));
