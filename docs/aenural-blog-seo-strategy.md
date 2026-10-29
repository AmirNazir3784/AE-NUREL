# AENural blog SEO strategy and implementation blueprint

29 October 2026. Research/planning only. Read [competitor evidence](aenural-blog-competitor-research.md), [design system](aenural-blog-design-system.md), [publishing workflow](aenural-blog-publishing-workflow.md) and [50 proposed titles](aenural-blog-title-ideas.txt) before future article work. The owner supplies the writing. Titles are recommendations, not commissioned articles or validated search-volume forecasts.

## Search intent and editorial coverage

Cover audio transcription, video-to-text, automatic/animated captions, subtitle editing/synchronization, caption formats and video/audio conversion. The owner additionally confirmed coverage of Premiere Pro, After Effects, DaVinci Resolve, CapCut, YouTube, podcast captions, caption software and subtitle translators. These are educational subjects; they do not establish AENural integrations or translation capabilities.

Use one primary task per article. A product page targets doing a conversion now; a blog explains how, why, troubleshooting, compatibility or choosing a workflow. Avoid creating a blog duplicate of a tool landing page with the same thin instructions. Search intent, not a different file extension or synonym alone, justifies a separate article.

| Intent family | Distinct useful outcome | Natural next step, subject to availability |
| --- | --- | --- |
| MP3/audio to text | Obtain, review and export a transcript | Public audio transcription route; inspect actual accepted formats/limits first. |
| Video transcription | Recover speech from a recording; distinguish extraction/transcription | Confirm video codecs and actual media workflow before claiming MP4 support. |
| Auto/animated captions | Generate, review, style and deliver readable captions | Auto Caption remains conditional until release; no fabricated plugin integration. |
| Constant timing offset | Move every cue the same amount | SRT Timing Adjuster. |
| Progressive drift | Correct changing delay from two reference points | Subtitle Sync Fixer; don't imply all drift is an FPS issue. |
| Editing/overlaps | Repair words/cues or overlapping intervals | Editor / Overlap Fixer according to symptom. |
| Format comparisons | Choose by destination and conversion loss | Actual SRT/VTT/ASS/SBV converters; directions are different tasks. |
| Platform tutorials | Complete a version-specific native software workflow | Contextual AENural file tools where useful, never an invented Adobe extension. |
| Audio extraction | Separate an existing sound track; choose output codec | Educational workflow until an appropriate extraction tool is released. |

Maintain a local editorial ledger for each accepted article: ID, supplied title, primary query, secondary variants, user outcome, audience, category, slug, overlapping article/tool, related IDs, tool candidates, sources, author, dates, status, review notes and approval evidence. The 50-title file is an ideas backlog; choose ten individually. Do not publish all fifty, or force ten preselected topics onto supplied content.

Before accepting a new slug, compare its intent with existing posts and tools. If two articles both answer the same question for the same audience, recommend consolidation or a narrower genuinely different task. For example, SRT-versus-VTT is a decision guide; SRT-to-VTT is a conversion tutorial. Constant offset and drift are separate diagnoses but should link to each other. A future generic transcription hub should summarize and link, rather than repeat every MP3/MP4 tutorial. Do not publish multiple “best caption tools” synonyms as separate rankings.

## Title, metadata and canonical standards

- Use a clear, truthful title containing the main task naturally. H1 may be more explanatory than the browser title, but both must describe the same page. The existing root title template appends AENural: avoid adding it twice.
- Aim for concise titles and descriptions that communicate the outcome and a useful distinction; character counts are editorial checks, not Google limits or ranking factors. Do not stuff every keyword into title/H1/alt text. Avoid “best,” “free,” “unlimited,” “no watermark,” “private,” or year labels unless the content and current tests support them.
- Unique description per post, accurate to visible content. A proposed excerpt/title/summary is editorial writing: obtain approval if it adds or changes substantive meaning. Search engines may display different snippets.
- Lowercase descriptive hyphenated slugs; omit dates unless necessary. Freeze a published slug. An approved later slug change needs a single permanent redirect and internal/sitemap updates, not a duplicate article.
- Canonical is exactly `https://aenural.com/blog/<slug>` for published production posts; `/blog` is self canonical. Use existing origin validation/fallback rather than concatenating a user-supplied host. Avoid tracking parameters, mixed origins and duplicate trailing-slash versions. Verify the application's current redirect policy before setting convention.
- Extend existing metadata with OG `type: article`, real publication/modification dates, accurate author information and an owned per-post preview when useful. Generic existing social card is acceptable as a truthful fallback. Match OG URL, canonical, sitemap and structured-data IDs. Twitter large-image metadata should describe the actual asset.

## Architecture appropriate to this repository

No blog exists yet. Next.js 16.4.3 App Router is installed; relevant guides were inspected under `node_modules/next/dist/docs/`: layouts/pages, `generate-static-params`, `generate-metadata`, MDX and JSON-LD. Re-read relevant installed guidance when implementing, because the project explicitly warns of breaking changes.

Recommended first-ten architecture, **not created in this phase**:

```text
src/content/blog/registry.ts             typed metadata and reviewed content imports
src/content/blog/<slug>.tsx              trusted, owner-reviewed article content modules
src/components/blog/                     shared layout and purposeful body components
src/app/blog/page.tsx                    directory from published registry entries
src/app/blog/[slug]/page.tsx             shared route, metadata, static params, notFound
public/blog/<slug>/                      owned images / approved sample files as needed
src/app/sitemap.ts                       extend existing generator, preserve current routes
```

Use static imports from trusted local modules. Suggested typed fields: stable ID, unique slug, title, excerpt, category, primary intent, secondary topics, status (`draft`/`published`), publication/update timestamps, verified author reference, optional image, section IDs/labels, related IDs, relevant tool IDs and content component. Dates, related IDs and required published fields must validate before building. Do not create a public source-download endpoint for draft files.

Render article content as Server Components. Generate static params from **published entries only**; use `dynamicParams = false` where compatible with current configuration, plus explicit publication guards and `notFound()` in both metadata and page lookup. In this installed Next version, route `params` is a Promise: await it. A missing slug or unpublished article must not return an indexable empty 200 page. Test unknown slugs against a production build, including the actual response status. Follow installed notFound/streaming semantics rather than assuming development behavior proves production status.

Directory, metadata, related reading and sitemap must derive from the same published collection. One article addition should automatically update all four. No runtime database, paid CMS, remote content API or cron required. Static HTML is generated at build; publishing a new module requires a new approved build/release. Avoid request cookies/headers in blog components that unnecessarily make these routes dynamic. Keep any existing shared auth behavior intact; confirm route output in the production build rather than assuming it is static.

### Markdown/MDX decision

Default to reviewed TSX modules for the first ten: no new parser/compiler dependency, existing TypeScript tooling, safe React text rendering and flexible examples. Keep supplied prose separate from layout and compare rendered text against the approved source. A content module is not permission to rewrite.

If the owner later prefers Markdown authoring, justify the maintenance benefit first. Render an allowlisted AST, sanitize/disable raw HTML, allow only safe URL schemes and explicit approved components; test escaping and headings. Trusted local MDX may be appropriate with build-time review, but MDX is executable code, not a safe parser for arbitrary supplied text. Never compile untrusted remote MDX or execute code embedded in article content. No need to add the MDX packages for ten supplied articles now.

### Structured data

Use visible-content-consistent BlogPosting (or Article) and BreadcrumbList for genuine published editorial pages. Include real headline, absolute URL/`mainEntityOfPage`, accurate dates, verified Person or Organization author, publisher and actual images where available. Use stable IDs and avoid duplicating conflicting root entities. Do not fabricate a review, rating, expert biography or image. Generate page schema from the same registry metadata as the visible page.

Existing `json-ld.tsx` uses raw JSON serialization; user-derived strings require serialization that escapes `<` as `\u003c` before use in a script element, following the [Next.js JSON-LD guide](https://nextjs.org/docs/app/guides/json-ld). Metadata and current structured-data utilities differ in origin fallback; handle this deliberately during future approved blog work. JSON-LD must not contain localhost URLs or draft information.

[Google Article documentation](https://developers.google.com/search/docs/appearance/structured-data/article) and [breadcrumb documentation](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) are implementation references. Valid schema does not guarantee search enhancements. Google ended FAQ rich results from 7 May 2026 according to its [documentation updates](https://developers.google.com/search/updates); omit FAQPage markup from the initial blog plan. Visible FAQs can still help when supported by the writing and actual questions. Do not invent FAQs for keyword coverage or promise an obsolete feature.

### Sitemap, robots and status

Extend the existing sitemap generator with `/blog` when it has approved published content, and published article canonicals only. Preserve all current public routes/release gates and robots rules. Drafts, previews, filters, query strings, redirects, 404s, noindex pages and duplicate variants do not belong. Set `lastModified` only from a real material update/publication timestamp, not build time. Do not invent priority/change-frequency values as ranking signals. Follow [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

Draft content should remain local/unpublished by default. If a shareable preview is later explicitly requested, design access controls separately; `noindex` is not confidentiality and robots blocking can prevent reading a noindex directive. Never weaken account systems for blog previews. Published HTML must contain body text, metadata, crawlable links and canonical without relying on delayed client tool execution. Exclude drafts from search/related lists as well as sitemap.

## Internal links and external evidence

Use contextual links when they solve the next task. Related posts rank by manually reviewed relevance, then shared topic/category and a deterministic fallback among published entries. Manual related IDs may override suggestions; filter missing/draft/self/duplicate IDs. Never display unpublished titles/links or empty cards. A topic hub is justified by enough useful related writing, not a desire for a category URL. Initial categories can be labels/filters rather than thin indexable archives.

Tool CTAs must use the current public registry/release rules plus a real functional check. Link text should name the action and match behavior. Resolve current audio formats/languages/export limits before writing claims. Auto Caption is currently a reachable noindex preview, not an automatically approved CTA. Development video tools and nonexistent subtitle translation/Adobe-plugin integrations must not be presented as released. Educational software guides can link verified official instructions without a forced product CTA.

External citations should directly substantiate the adjacent claim. Prefer official application help for menus/limits, standards for file syntax, original studies for statistics and real disclosed tests for comparisons. Record accessed date and relevant software version. A competitor's self-ranking is not an independent benchmark. SRT/VTT examples must preserve intended punctuation and encoding; conversion can lose styling/position metadata and this should be demonstrated if relevant. Legal/accessibility claims require careful primary-source verification and appropriate scope; W3C's caption guidance includes open and closed techniques.

## Performance and accessibility verification plan

Import no transcription runtime, video encoder, model weights or editor workspace into blog modules just to render a tool card. Use lightweight SVG/code-native original diagrams, optimized dimensioned images, lazy below-fold media and existing local fonts. Limit client JS to useful interactions. No animation or syntax-highlighting package by default; honor reduced motion. Compare new page bundle/network behavior with the existing shell so inherited costs are distinguished from blog additions.

Run production-build browser checks at 390/768/1440 CSS px plus narrow reflow and zoom, both themes, keyboard/TOC/download flows, headings/landmarks, table labels, focus and real link targets. No whole-page horizontal overflow. Test JavaScript-disabled article readability where the browser allows it; raw HTTP body checks also establish server-supplied content, not a complete no-JS interaction audit.

When available, run Lighthouse mobile and desktop against a production build using documented device emulation, throttling, cache state, URL, date and version; retain reports and use repeated comparable runs to diagnose regressions. This research phase ran **no Lighthouse score and had no CrUX/field data**. Do not present HTTP fetch latency as page speed. Proposed field goals: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile, evaluated separately by device with sufficient traffic; see [web.dev Core Web Vitals](https://web.dev/articles/vitals). These are targets, not measured AENural results or guarantees. Lighthouse TBT is not a measured field INP.

## Publication and success measurement

No search account/analytics access was used. The user reports Search Console is verified; this phase neither verifies ownership nor submits anything. Establish a baseline before the first authorized publication, then compare 28-day windows and review over 8–12 weeks with traffic-size/seasonality caution. Avoid interpreting a handful of impressions as a causal experiment.

| Question | Metric / method | Interpretation limits |
| --- | --- | --- |
| Is content discoverable? | GSC sitemap status, Page Indexing, URL Inspection on selected published URLs. | Submitted/discovered/indexed are different states; sitemap is not an indexing guarantee. |
| Are the right searches reaching us? | GSC impressions/clicks/CTR by query and `/blog/` landing page; split branded/nonbranded, country/device where useful. | Average position is contextual, not a fixed rank; anonymized queries and small samples limit conclusions. |
| Do articles lead to tools? | If privacy-conscious analytics is already available or later approved: aggregate `article_tool_click` with article ID, tool ID and placement. | CTA click is not successful processing. No new analytics service added now. |
| Do readers finish the task? | Later approved aggregate `tool_start` / `tool_export_success` linked only as privacy permits. | Requires correct instrumentation; do not change tool algorithms or silently add tracking. |
| Are pages usable? | CWV field report when available, synthetic regression tests, a11y/keyboard checks, qualitative owner feedback. | No field data may exist for low-traffic URLs; site grouping differs from per-URL performance. |
| Are we earning relevant links? | GSC Links report when available plus verified referring pages. | Samples/incomplete reports; not domain authority or attribution proof. |

No filenames, transcripts, recordings, captions, email addresses or full private URLs in events. Prefer aggregate counts, minimal retention and no cross-site tracking; document any future analytics addition and consent requirements. Review measurement goals separately from results. Do not promise first-page positions, guaranteed clicks, or traffic attributable to a design component.

## Ten-article release model

For each supplied article #1–#10: assign stable ID and distinct intent → approve slug/category/metadata → associate only available tools → choose published related IDs → build with reusable shell and appropriate modules → owner previews → explicit publication approval → update registry status and actual dates in the approved release. Directory/sitemap/related discovery regenerate from that status. There are no ten fabricated posts or placeholder public pages. The 50-title backlog helps the owner select writing subjects; it is not a release schedule.
