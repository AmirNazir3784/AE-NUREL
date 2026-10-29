# AENural blog publishing workflow

Permanent instructions for future Codex sessions. Established 29 October 2026. This phase created documentation only. No blog page, article, schema change, dependency, analytics installation, push or deployment is authorized by these documents themselves.

Subsequent owner authorization, 29 October 2026: publish completed, verified tools and supplied blogs to both Faisal and AmirNazir so they become live, and push when work is ready. This standing instruction supersedes the research-phase push/deployment hold below. Do not request the same release permission again when that instruction still applies; substantive article corrections still require approval. Verify the actual live deployment and preserve unfinished-feature holds. See `AGENTS.md` and the release record in `docs/releases/`.

## Start every article assignment here

Read these saved references before work:

1. [Competitor research](aenural-blog-competitor-research.md).
2. [Blog design system](aenural-blog-design-system.md).
3. [SEO and implementation blueprint](aenural-blog-seo-strategy.md).
4. This workflow, then the [title backlog](aenural-blog-title-ideas.txt) if selecting subjects.

Do not repeat the full competitor audit unless the owner explicitly requests it. Narrow verification of a changing software feature, price, source or Google requirement is expected. Report inaccessible sources honestly. These guidelines do not override new owner instructions or current AGENTS.md.

Check working tree and current branch first; preserve local changes. Existing phase branch is `dev/tools-completion`. Never synchronize production, edit credentials/runtime databases, or change account/payment systems while adding a blog. The present research assignment forbids both repository pushes and production deployment. Future local implementation permission is not publication permission. Hostinger/Amir production release requires explicit authorization; do not treat a historical Faisal push instruction as permission to publish articles.

## 1. Receive and understand supplied writing

Read the **entire** supplied article, including tables, references and footnotes. Save/identify an approved source version; do not publish private source documents under `public/`. Record title, audience, main task, article type, language, author attribution, intended publication date, any supplied media/license and desired next action. Ask only for missing information that materially blocks accurate work; use transparent, reversible design defaults elsewhere.

The owner writes the articles. Preserve meaning, facts, qualifications, examples and intended message. Do not silently rewrite prose, replace opinions, invent quotations, add statistics, pad length, create fake expertise, or turn planning titles into full posts. Formatting punctuation/heading structure must not alter meaning. Substantive corrections, new introductions, FAQ answers or summaries need approval before use.

## 2. Check intent, facts and references

Compare with existing ledger/posts/tool pages. Propose a unique lowercase hyphenated slug, one primary intent, supporting terms and category. Explain overlap and recommend consolidation or a narrower task where needed. Do not target the same intent using several near-identical titles. Fifty proposed titles are an ideas pool, not fifty separate required pages; the first ten remain chosen individually.

Check factual claims against primary references and current tool behavior. Verify external link destinations support the adjacent statement. Software tutorials need exact application version, platform and free/paid distinction; if the application cannot be tested, label that limitation and use official documentation. Do not present a competitor's instructions as an AENural test. Never install paid software, subscribe to a service or use paid APIs to research an article.

Prepare a short change log for questionable content: supplied passage → issue/source → suggested replacement → status (pending/approved/declined). Do not implement substantive replacements while approval is pending. Continue independent layout/technical work with the original text or clearly labeled local draft. If a false claim prevents responsible publication, explain it and hold publication; do not disguise it with metadata.

Use genuine author details only. If absent, leave local attribution pending or propose an accurate organization attribution for approval. No fabricated portraits, named experts or review credentials. Publication/update dates reflect real events; a design tweak alone does not justify false freshness.

## 3. Select layout, links and resources

Apply the shared design system, then choose modules suited to the supplied tutorial, comparison, troubleshooting or explanation. Correct heading hierarchy, stable section anchors and a useful TOC for longer pieces. Readability and task completion outrank decorative elements. Preserve orange/teal/navy branding, existing header/footer, local fonts and themes.

Recommend contextual internal links by task, not count. Check current public tool registry **and release conditions** plus live availability. A 200 noindex preview is insufficient evidence of a released product. Link constant shifts to Timing Adjuster, changing drift to Sync Fixer, format conversion to the actual direction, and text edits to Editor. SRT-to-MP4 creates a silent subtitle video; never market it as burning captions onto existing footage. Unreleased Auto Caption, video tools, translation tools or nonexistent Adobe plugins cannot be sold as available.

Related articles must be published, distinct and useful. Render no placeholders for future posts. Explain proposed new anchor wording if it changes the owner's meaning. Place external citations near claims. No arbitrary outbound/internal link quotas or backlinks fabricated from our own links.

Propose only purposeful original diagrams, owned screenshots and legitimate samples. Demonstrations must use synthetic/public-authorized media, never private client files. Do not copy competitor text/images/code/layouts. Downloadable files need format, expected output, encoding, safety and content verification; intentionally broken samples must be labeled. No dependency or decorative stock-image requirement.

## 4. Implement locally after implementation is authorized

Read relevant installed Next documentation under `node_modules/next/dist/docs/` before code changes, especially routing, metadata, static params, notFound and JSON-LD. Reconfirm current versions/config; do not assume an old Next API.

For Article #1, implement only necessary shared modules and a typed local registry with reviewed TSX article content. No paid CMS/database/parser required. For later posts, reuse the shell/components and add content/metadata rather than duplicating pages. Keep article content server-rendered and interactive features small.

Use `draft` status during local review. Default drafts have no public route, directory card, related link or sitemap URL. If a visual draft preview is necessary, use a local-only preview mechanism consistent with the blueprint; do not leak it in production or modify authentication. Test publication guards in metadata and page lookup. Validate unique IDs/slugs/anchors/dates and related/tool IDs.

## 5. Test the actual result

Run checks appropriate to code changes using existing project scripts (`npm.cmd` in this PowerShell environment): lint/typecheck/build and focused relevant tests. Record pre-existing failures separately and avoid unrelated fixes. Do not claim all tests pass if they do not. Documentation-only edits do not require a website build.

For a future article implementation, verify:

- Approved source versus rendered prose: meaning, all sections, tables, citations and examples retained. Owner-approved modifications are traceable.
- HTTP: published URL 200; unknown/draft slugs produce real appropriate 404 in production build; no redirect loop or soft-404 article. `/blog` and existing tools still work.
- Metadata: unique title/description, one H1, canonical on correct HTTPS origin, article OG/Twitter, matching visible dates/author and safely escaped valid JSON-LD. No localhost/draft data.
- Sitemap: XML parses, correct content type and HTTP 200, existing URLs preserved, each approved post exactly once, no drafts/noindex/redirect variants. Robots sitemap rule remains present. Verify real modification dates.
- Navigation: breadcrumbs, each TOC link, browser back/forward, related links, keyboard focus and sticky-header offset. No dead `#` button links.
- Resources/CTAs: every button/link points to the intended destination; actually download/open sample files, compare their contents and try the tool's advertised task with authorized sample media. A page load alone is not a completed conversion test.
- Visual/a11y: desktop/mobile/tablet CSS widths, narrow reflow, 200% zoom, both themes, long headings, table scrolling, reduced motion, useful image alt text, keyboard and screen-reader spot checks where available. Automated audits supplement manual checks.
- Performance: production build, unsized-image/layout shifts, request/bundle regressions, no blog imports of tool/model runtimes. Record Lighthouse conditions/results if run; never claim field CWV from synthetic tests.

Keep focused test evidence and screenshots in ignored artifacts as appropriate. A final report must state what was tested, skipped or blocked accurately. No need to repeatedly broaden tests once relevant checks pass without new concerns.

## 6. Preview and obtain publication approval

Show a working local preview and summarize article-specific design, metadata, factual changes needing approval, tested resources and remaining limits. The owner approves the concrete page/content before publication. Do not use an approval question to postpone work that can be completed locally and reviewed first.

Approval must identify publication scope/destination. A local preview approval does not automatically authorize a Git push, production deployment, Hostinger synchronization or Google Search Console action. If the owner approves only a development repository push, do not deploy production. Honor the latest explicit instruction.

## 7. Publish only within approved scope

On explicit approval, set published status and actual publication date, regenerate directory/related/sitemap from the registry, run final checks, and perform only the authorized repository/deployment actions. Do not overwrite other work. Publish articles one at a time as instructed, not all backlog ideas.

After an authorized deployment, fetch the real production article, directory, sitemap and robots; inspect final HTML metadata/robots/schema, image/download URLs and a representative tool CTA. Verify response codes and XML, not merely a build-success screen. Report the actual deployment identifier/destination if available. If deployment was not performed, state that clearly and provide instructions without claiming success.

Search Console: once the sitemap is live and verified, the owner can open the verified `aenural.com` property → Sitemaps → submit `sitemap.xml` (or check the existing submission). Inspect selected new URLs with URL Inspection and request indexing where appropriate. Existing sitemap submissions normally don't require resubmission per post. Submission is a discovery request, not a ranking/indexing guarantee. Do not claim any GSC action was done unless actually authorized and observed.

## 8. Maintain the system

Record accepted article ID/slug/intent/category/status, author/date/source checks, related/tool mappings, owner approvals and actual release facts. Update material software instructions when needed; preserve original publication date and set modification date only for real updates. Refresh specific facts rather than redoing the whole competitor study. If a linked tool is withdrawn or its limits change, update the affected article/CTA after review.

Use Search Console and approved aggregate analytics according to the SEO strategy. Separate measured clicks/impressions/tool usage from goals. Avoid unconsented tracking and never log recordings, transcripts or filenames. No guarantee of first-page rankings or traffic is appropriate.

## Remaining owner inputs

The article content, chosen topic/intent, verified attribution and any substantive text/claim corrections will be resolved per article. Original visuals may be omitted when unnecessary. None of these documentation recommendations creates a live feature. Await Article #1 after the research/title handoff.
