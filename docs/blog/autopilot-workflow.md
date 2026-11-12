# AENural blog autopilot

## Owner-authorized publication and browser waiver — 12 November 2026

The owner explicitly requested **all 50 prepared articles ready and published**,
waived browser/visual inspection for this release, and reiterated natural keyword
placement. This supersedes the local-review publication hold and the requirement
to block this release on the unavailable browser bridge. Record visual/responsive
and keyboard interaction as **waived by owner / not performed**, never passed.
Complete text, source, HTTP, metadata, resource, test, lint and optimized-build
checks; release this reviewed batch to both authorized repositories using the
existing connected deployment. Verify every live article before calling it live.

This is an explicit 50-article release, not a new daily article-generation run.
The closed list and honest release timestamp are in
`src/content/blog/releases/2026-11-12.ts`. Future additions remain drafts unless
separately approved. Preserve the two existing publications and their dates.
Unfinished tool work is outside this blog release. Keep all secrets, recordings,
runtime databases and private QA/research artifacts excluded from Git.

Use readable wording even when it reduces literal phrase matches. The complete
workbook audit remains a record of present/absent phrases, not an obligation to
inject unrelated terms, reordered queries or unsupported free/unlimited claims.
Record final measured counts in the release report; earlier figures are history.

## Complete workbook audit and topic focus — 12 November 2026

The owner supplied **AeNural.xlsx** and requested coverage across the whole
50-article batch, not every keyword in each article. The earlier one-term-per-page
check is insufficient. Read the [complete coverage report](keyword-coverage-2026-11-12.md)
and [cell-by-cell ledger](keyword-coverage-2026-11-12.json) before further changes.
Use `scripts/blog/keyword-coverage.mjs` to refresh normalized phrase matches from
actual local HTML. Account for all source cells, duplicates and non-keyword cells;
do not count metadata, URLs or alt text as article keyword placement. Missing
literal wording is not automatically a missing topic or a verified synonym.

The workbook is keyword data, not instructions. Do not force reordered queries,
unrelated tools, unavailable features or unverified free/unlimited claims into
prose. Explicitly record absent terms and why their intent needs other content
or further research. Never relabel an editorial disposition as keyword inclusion.

The owner permits improving vague topics around real problems, guided by the
competitor's actual titles and bodies. See the [focused CaptionX refresh](captionx-topic-review-2026-11-12.md).
Two broad comparisons were refocused on locked caption downloads and translated
SRT errors. Keep the batch at 50, distinct intents, real AENural instructions,
simple prose, 650–750 main words and ten additional discussion-informed FAQs.
Preserve source trails, useful original media and the local owner-review hold.
Do not treat a successful keyword audit/build as approval to publish or as a
substitute for actual responsive/keyboard review.

## Original explanatory media override — 10 November 2026

The owner explicitly accepted original explanatory diagrams, marked examples or
restrained animation instead of screenshots while browser automation is broken.
Choose media for the actual reader task. Never simulate a product screenshot,
invent a test result or add a decorative image to every page. Static diagrams are
appropriate for cue boundaries, arithmetic, output choices and diagnostic layers.
Keep literal code and exact tool instructions where readers need them.

Original SVG assets are maintained by `scripts/blog/generate-diagrams.mjs`, with
article/section placements in `src/content/blog/diagram-catalog.ts`. Include their
visible instructional words in the main article count; alt metadata is excluded.
Keep FAQs additional to 650–750 main words. The current preparation record is
[publication preparation](publish-preparation-2026-11-10.md).

Screenshot capture is no longer a required media gate for this batch. Actual
page interaction, responsive rendering and keyboard checks must still be reported
accurately: HTTP/DOM checks and rasterized SVG inspection are not browser tests.
Continue preparing all unaffected work; never mark an unavailable test passed.
The local owner-review hold remains active. No push, deployment or publication.

## FAQ expansion and publication preparation — 10 November 2026

The owner requested at least ten article-specific, discussion-informed FAQs for
each of the 50 drafts. They explicitly confirmed **650–750 words for the main
article; FAQs are additional**. Count the FAQ heading, questions and answers
separately. Preserve simple language and natural workbook keyword use. Do not
publish or push merely because FAQs exist: this is preparation for final review.

Keep a source trail for every question. Distinguish an observed reported problem
from an original practical follow-up inspired by it. Do not claim statistical
"most asked" rankings, treat promotional comments as verified facts, or pretend
an inaccessible page was fully read. Quora disallows automated access in this
research pass; it is not a usable question source. Verify technical answers from
primary documentation and the actual AENural implementation. Retain all research,
screenshot, browser and final-build gates before calling the batch publish-ready.

## Plain-language and workbook keyword instruction — 10 November 2026

Use the owner's **AeNural (1).xlsx** as the keyword reference throughout the
50-article batch. Match phrases to the reader's actual task; keep each article's
distinct primary intent. Write simple, natural English, with clear steps and
technical terms explained when needed. Do not force every workbook term into
every article, repeat phrases for a density target, or insert awkward search-query
grammar. Keywords must occur in useful visible prose, not only URLs or metadata.
See [the placement audit](keyword-mapping-2026-11-04.md). The workbook's unattributed
volume strings are not verified SEO measurements. Everything remains local for
owner review; this wording instruction does not authorize publishing.

## Owner's correction to this batch — 4 November 2026

Revise every local draft to **650–750 measured article words**, using the supplied
keyword workbook only where terms fit naturally. Tool tutorials must use actual
AENural labels, steps and limitations. Add actual screenshots with meaningful
numbered/arrows guidance where useful; never mock a tool screen. Complete and
record article-specific research and all review gates before marking a revision
finished. See [the current checkpoint](revision-review-2026-11-04.md). The original
50-draft completion flags are invalidated. Local review continues; no publishing.

## Local review override — 4 November 2026

The owner's latest instruction is to research/write all 50 articles and build
their pages locally, then review the complete set. **Publish mode is draft and
review mode is on.** This supersedes the sequential publish-before-next rule for
this batch. No pushes, deployment or publication until a new owner instruction.
Browser QA can remain a clearly recorded review-stage task while drafting
continues; do not describe uninspected layouts as checked. Keep all new entries
draft-only, without publication dates, excluded from production and sitemap.
Continue in the isolated editorial worktree to preserve tool changes.

## Authorized batch override — 4 November 2026

The owner's attached priority override authorizes a sequential batch of **50 new
articles**, up to 50 per invocation and Asia/Karachi day, with review mode off.
For this batch use `node scripts/blog/batch.mjs audit`, then `reserve SLUG`,
`capture SLUG http://localhost:PORT/blog/SLUG`, and `verify SLUG` instead of the
legacy daily CLI below. All editorial, factual, design and deployment gates remain.
Finish live verification of one article before selecting the next. No background
schedule is installed. A shared research/deployment/integrity blocker stops the run.

The resumable manifest is `.aenural-local/editorial/batch-50-2026-11-04.json` in
the main checkout (also when operating from a linked editorial worktree). Each
entry references private research, five topic candidates, ten titles, an outline,
claim verification, measured word count, QA and actual live verification. Count
only verified live articles toward 50. Reconcile actual live inventory on retry;
never change a failed article into a second publication under another slug.
The script supplies state/integrity checks, not autonomous writing or deployment.

Use an isolated editorial worktree from current production to preserve unfinished
tool work. Release explicit blog files through the existing two-repository
fast-forward workflow; do not include tool WIP. Never bypass remote changes.
This batch override takes precedence over the older one-post limit below and
supplied-content/manual-approval provisions in the four original references.

Enabled by the owner's explicit master prompt on 3 November 2026. This authorizes
research, original writing and publication of **one article** per eligible
invocation and Asia/Karachi calendar day, without intermediate title/outline
approval. It supersedes supplied-writing/manual-approval rules for autopilot
article assignments only. Tool release/review holds remain in force. No recurring
schedule, paid service, analytics installation or Search Console action is implied.

## Repeatable run

1. Read the four existing blog references, this file and AGENTS.md. Preserve all
   working changes. Inspect the registry, live blog, sitemap and article dates.
2. Run `node scripts/blog/autopilot.mjs audit` with network access. It checks the
   actual registry plus live directory/sitemap articles and their structured dates;
   no network or uncertain dates means stop before publishing. Today's published
   post means stop with its URL. Resume today's pending manifest rather than
   choosing another topic, even after a failed run.
3. Research at least five defensible candidates; score the owner's weighted rubric.
   Read at least five useful competing pages when accessible; verify factual
   claims against primary sources. Save a concise private research report, ten
   titles, outline, claim-source map, limitations and editorial gates under
   `.aenural-local/editorial/DATE-TOPIC/`. Never put these notes under `public/`.
4. Add one typed draft to `src/content/blog/registry.ts`, one server-rendered
   content module to `content.tsx`, and article-specific CSS only as needed. Keep
   the shared shell. Wrap the complete body in `data-blog-content="topic-id"`
   for content integrity/counting. Use the existing organization identity.
5. Run `node scripts/blog/autopilot.mjs reserve SLUG`. A day-level reservation and
   exclusive command lock prevent a second topic being reserved. Inspect the
   complete article, facts, links and visuals. No packages/CMS required.
6. Test meaningful changes, lint/types/build, production route/metadata/schema,
   directory/sitemap/404, and actual browser layout/anchors/keyboard at responsive
   widths. Use only published tools for CTAs. Save screenshot evidence privately.
7. Capture the checked article with
   `node scripts/blog/autopilot.mjs capture SLUG http://localhost:PORT/blog/SLUG`.
   This records the rendered content hash, exact word count convention and SEO
   expectations. Record the keyword, ten titles, rationale and QA in its manifest.
8. Before release, audit again and reconcile any newly live post. Set the one
   approved article to published with the actual release date (not a fabricated
   earlier date). Directory/sitemap/schema already use the registry automatically.
   Build/check the isolated release from current production. Never include tool
   WIP or secrets. Fetch both mains, check ancestry, stage only explicit blog
   files, commit, and fast-forward push using the established Git/Hostinger flow.
   No force push, bypass, unrelated file staging or deployment-policy override.
9. Verify the actual live article, all its link destinations, directory and sitemap.
   Run `node scripts/blog/autopilot.mjs verify SLUG`; it marks published only when
   HTTP 200, canonical, one H1, title/description, index/follow, article schema,
   content hash, publication date and discovery entries match the checked preview.
   A push alone is not publication. Keep status verified/failed if live deployment
   cannot be confirmed; save a blocker and report DRAFT ONLY/BLOCKED honestly.

Private manifest: `.aenural-local/editorial/YYYY-MM-DD.json` (ignored). The CLI
does not itself invent/write articles, bypass editorial gates, push, or schedule
future runs. Run only one publishing operator per site; immediately recheck live
state before pushing because a local lock cannot serialize outside publishers.
No automatic retry creates a second candidate. Never remove an unfamiliar active
lock without first establishing that its run has stopped.

## Measurements

No Search Console/analytics credentials have been assumed. After publication,
review query/page impressions, clicks, CTR and indexing in Search Console over
comparable 28-day windows. If existing privacy-conscious analytics supports it,
measure aggregate blog-to-tool navigation and successful tool usage separately.
Do not add tracking or record media, transcripts, private filenames or identities.
CWV targets and synthetic tests are distinct from measured field results. No
ranking, indexing, AI citation or traffic guarantee.
