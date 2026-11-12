# Fifty-article local review batch

**Latest: 12 November full-workbook coverage and problem-led topic review.** 21 passages revised; two broad comparisons refocused; all 50 local pages retain 650–746 main words and ten additional FAQs. All 791 keyword cells are accounted for, but only 58 of 744 distinct phrases occur in the drafts. See [the full coverage/readiness report](keyword-coverage-2026-11-12.md) and its complete ledger. 39 blog tests, scoped lint, final optimized blog-only build and 52 production-mode guards passed. Interactive browser review and owner release approval remain pending. No push, deployment or publication. Earlier figures below are historical.


**Latest: original-media publication preparation, 10 November 2026.** All 50 articles are prepared for owner review with 650–746 main words plus ten additional FAQs each. The owner accepted explanatory media instead of screenshots. Original diagrams, source/title follow-ups, 35 blog tests, lint, an optimized build, 53 citation responses, 20 resources, 19 tool destinations and 52 production route guards have been checked. Browser interaction remains unavailable; publishReady stays false. No push or deployment. See [the current preparation report](publish-preparation-2026-11-10.md). Earlier checkpoints below are historical where superseded.

**Revision in progress:** the initial drafts below were rejected by the owner.
Read [the current revision checkpoint](revision-review-2026-11-04.md) first.
The former word counts, completeness and test results are historical, not current
approval of the revised batch.

4 November 2026, Asia/Karachi. The owner's latest instruction is to research,
write and build all 50 articles locally, then review the complete set. No push,
publication, deployment or Search Console submission is authorized during review.

## Architecture and access

The first SRT/VTT draft retains its original TSX module and sample downloads.
The other 49 use typed editorial data in `src/content/blog/drafts/`, registered
once through `batch-drafts.ts`. Existing article routes, metadata, author identity,
header/footer, theme tokens and directory are reused. All 50 remain draft with
no publication dates; production excludes them, including `/blog/review`.

In development, `/blog/review` lists the complete queue by category and `/blog`
shows the normal article cards. `docs/blog/50-local-article-titles.txt` contains
titles, primary keywords and paths. The data vocabulary supports paragraphs,
steps, decision paths, accessible comparison tables, code, notes, checklists and
original diagrams. Content is React-escaped text, with constrained HTTPS/internal
links; no raw HTML, remote MDX execution, CMS or added dependencies.

Layouts follow the article's task: comparison matrices, diagnostic decisions,
numbered tutorials, workflow rails and technical code examples. Three original
SVG explanations cover portrait composition, podcast clip time origins and
translation review. They are explicitly illustrative, not measured platform
safe areas, competitor assets or fabricated software screenshots.

## Research and editorial limits

The saved one-time competitor research remains the common reference. New research
checked relevant CaptionX pages and official Adobe, Blackmagic, CapCut, YouTube,
W3C/MDN, Audacity, Apple Podcasts, Spotify and glossary documentation. Shared
research is reused only for relevant tasks; source links support the associated
claim, not backlink acquisition. No search volume, rankings, traffic or model
accuracy measurements are claimed. Article-specific notes and claim/link maps
remain private under `.aenural-local/editorial/aenural-50-2026-11-04/`.

Native software instructions follow public documentation, not a claimed test in
each application. The 187MB Resolve reference manual and 36MB editor guide exceeded
the web reader's size limit; current official HTML documentation was used for the
covered capabilities instead. No edition-specific automatic-caption promises
are based on those unread PDFs. Version/account conditions remain qualified.

Browser navigation and screenshot operations failed in the prior session. HTTP,
structure and build results do not establish visual, keyboard or responsive QA.
Software tutorials still need actual version-matched screenshots with numbered
markers wherever owner review determines they improve the instructions; do not
invent or reproduce an app interface to fill that gap.

## Review and eventual release

1. Review the full text, intended audience and distinct search intent. Check
   source-dependent claims and current application behavior for the release date.
2. Inspect desktop/tablet/mobile, both themes, keyboard focus, scrolling tables,
   code and diagrams. Add needed original authorized screenshots and annotations.
3. Follow contextual links, test downloads and confirm available tools. Retain
   relevant related-article links when deciding which drafts publish together.
4. Approve individual articles for publication. Assign actual release dates then;
   do not mark this draft collection published merely because pages exist.
5. Build/check the selected release, preserve tool work, follow the authorized Git
   workflow and verify each real live page/index/sitemap before recording success.

Commands: `node scripts/blog/local-drafts.mjs check http://localhost:3000`,
`references`, then `record http://localhost:3000`. Reports are private; no command
publishes. The batch publication CLI also refuses release operations while the
private manifest says draft/review mode.

## Actual local checkpoint

All **50 draft pages** and the review index return 200 on the main project's
`http://localhost:3000`. Total measured article text: **23,434 words** (406–1,167
per page). Counting includes H1, introduction, body, examples/code, table text,
visible diagram labels and FAQs; excludes navigation, metadata and private notes.
There are no missing section anchors, duplicate page IDs or failed draft SEO
checks. Fifty-one unique cited destinations resolve successfully.

Twenty focused tests, scoped ESLint and an optimized build with TypeScript pass
in the isolated editorial checkout. Its checked blog files were copied to the
main local folder only after comparing every destination with the Git baseline
to protect existing changes. The production build returns 404/noindex for all
50 drafts and the review index, with zero draft directory/sitemap entries.

Primary review URL: `http://localhost:3000/blog/review`. The temporary isolated
preview was stopped after validation. No commits, pushes, deployment or GSC action.
Visual/keyboard/native-app screenshot review remains pending, as described above.
