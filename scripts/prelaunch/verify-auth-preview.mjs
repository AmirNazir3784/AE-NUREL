// Actual production HTTP verification; run only against a separately started loopback build.
import assert from 'node:assert/strict';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tools } from '../../src/lib/tools.ts';
const origin = new URL(process.argv[2] ?? 'http://localhost:3107');
assert.ok(['localhost', '127.0.0.1'].includes(origin.hostname));
const evidence = [];
const stylesheets = new Set();
for (const route of ['/', '/tools', '/source-window', ...tools.map(tool => tool.href)]) {
  const response = await fetch(new URL(route, origin));
  const html = await response.text();
  assert.equal(response.status, 200, route);
  assert.doesNotMatch(html, /aen-sign-in|id="auth-title"|Account submission is not connected/, route);
  assert.match(html, /aria-label="Search tools"/, route);
  assert.match(html, /AENural’s main product/, route);
  assert.match(html, /\/branding\/aenural-official-logo-transparent\.png/, route);
  assert.doesNotMatch(html, /Development preview|Deployment preview|release verification pending|You Are All Set to Go!/, route);
  for (const match of html.matchAll(/href="([^" ]+\.css[^" ]*)"/g)) stylesheets.add(match[1]);
  if (route === '/tools') {
    assert.equal((html.match(/class="aen-tool-card"/g) ?? []).length, 16);
    assert.doesNotMatch(html, /Free online utilities|focused subtitle tools|aria-label="Tool groups"/);
  }
  evidence.push({ route, status: response.status, accountPreview: false });
}
for (const route of ['/tools/free-subtitle-generator', '/tools/podcast-to-captions', '/dev/local-transcription', '/api/auth/ok']) {
  const response = await fetch(new URL(route, origin));
  assert.equal(response.status, 404, route);
  evidence.push({ route, status: response.status });
}
for (const path of stylesheets) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);assert.match(response.headers.get('content-type'), /text\/css/);
  const css = await response.text();
  assert.doesNotMatch(css, /\[aria-label\^=(?:Delete|Remove)\\ /);
}
for (const name of ['aenural-official-logo.png', 'aenural-official-logo-transparent.png']) {
  const response = await fetch(new URL('/branding/' + name, origin));
  assert.equal(response.status, 200);assert.match(response.headers.get('content-type'), /image\/png/);
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest(Buffer.from(await response.arrayBuffer())), digest(await readFile('public/branding/' + name)));
  evidence.push({asset:name,status:200,bytesMatch:true});
}
const sitemap = await fetch(new URL('/sitemap.xml', origin));assert.equal(sitemap.status,200);
const sitemapText = await sitemap.text();assert.match(sitemapText,/https:\/\/aenural\.com/);
assert.doesNotMatch(sitemapText,/free-subtitle-generator|podcast-to-captions|\/dev\/|\/account|\/sign-in/);
await mkdir('artifacts/prelaunch', { recursive: true });
await writeFile('artifacts/prelaunch/auth-modal-production.json', JSON.stringify(evidence, null, 2));
console.log('Production pass: 16 public tools, homepage/directory/Source Window, loaded CSS, byte-matched official logos, sitemap and account/AI release gates.');
