# AENural blog autopilot

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
