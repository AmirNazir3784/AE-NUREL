# Brand-first page titles — 12 November 2026

The owner requested AENural at the start of browser-tab titles, with consistent
search metadata and relevant URLs. Use **AENural | Page Title** for future pages.

## Changes

- Shared root title template now prefixes the brand. The homepage's absolute
  title and Open Graph/Twitter titles use the same order.
- Homepage title: **AENural | Free Subtitle Tools & Source Window**.
- Audio title: **AENural | Free Audio to Text Converter Online**. Removed its
  brandless absolute-title override. About and internal verification page titles
  avoid repeating the brand after the template applies.
- WebSite/Organization identity uses the confirmed `https://aenural.com` fallback
  when SITE_URL is absent, consistent with canonicals, sitemap and robots.
- Updated the blog release verifier's expected title format. Article bodies,
  publication dates, tool algorithms, account systems and shared page design stay
  unchanged. Existing unfinished local tool changes are outside this release.

## URLs and discovery

Existing page URLs already have descriptive paths. Keep their HTTPS canonicals;
no slug migration or unnecessary redirect is introduced for a title-order change.
The header search links to existing tool routes; it is not a separate indexable
search page. Do not advertise a fictional search endpoint in structured data.
The existing sitemap and its robots rule are preserved. Google's verification
meta tag retains its exact name/content and appears once.

## Validation

Five focused metadata tests, three existing domain/canonical tests and scoped
ESLint pass. Optimized isolated production build passes: webpack 14.4 seconds,
TypeScript 9.2 seconds and 98 generated pages. Local production responses for all
**82 sitemap URLs**, including all 52 blog posts, pass title-prefix, unique brand,
canonical, description, social-title/URL, site identity and verification-tag checks.
The root slash omitted by the Open Graph URL serializer is equivalent to `/`.

Release through the existing two-repository/Hostinger workflow and verify the live
metadata before claiming deployment. Browser visual checks are unnecessary to
inspect the actual title/head response; no browser interaction pass is claimed.
Private local/live evidence is saved under
`.aenural-local/editorial/title-branding-2026-11-12/` and stays outside Git.

## Search guidance and limits

Google distinguishes the website's name from a page's title link. Its
[site-name guidance](https://developers.google.com/search/docs/appearance/site-names)
supports consistent WebSite identity; its
[title-link guidance](https://developers.google.com/search/docs/appearance/title-link)
explains that titles may be generated from multiple page signals and changes
require recrawling/reprocessing. Brand-first titles are the owner's presentation
preference, not a ranking guarantee or a claim that Google will reproduce them
verbatim. No Search Console request/submission is made by this metadata change.
