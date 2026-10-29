# AENural blog: one-time competitor research

Research date: 29 October 2026. Planning only; no application changes, publishing, repository pushes, or production deployment. Read alongside [design system](aenural-blog-design-system.md), [SEO strategy](aenural-blog-seo-strategy.md), and [publishing workflow](aenural-blog-publishing-workflow.md). The owner's subsequent request authorizes title suggestions: [50-title writing list](aenural-blog-title-ideas.txt). It does not authorize writing articles.

## Evidence and method

Inspected the actual local source at commit `28162d0` on `dev/tools-completion`, then public pages, raw response HTML, search results, and browser-rendered articles. CaptionX's directory exposed 37 article cards; selected 12 relevant articles across tutorials, comparisons, troubleshooting, and explanation, rather than treating every promotional announcement as an educational guide. Opened all 12 in Chrome and read their content; additionally reviewed rendered guides and directories from five relevant competitors below. Browser inspection included desktop and narrow/mobile views of representative pages, not every article at every breakpoint. Initial automated body selectors sometimes captured navigation or only a summary; those counts were discarded or corrected, rather than presented as article measurements.

Unbranded Google query `auto caption generator SRT video to text` exposed VEED, Kapwing, and HappyScribe among organic results. Unbranded Bing query `free mp3 to text transcription SRT VTT` exposed CaptionX alongside specialist converters, including EchoWave and TurboScribe. General public search for `subtitle out of sync fix guide` surfaced SubtitleMedic. Descript was additionally selected through relevant transcription searches and its actual educational coverage. Some discovery queries included brands; selection is qualitative, not an unbiased market-share sample. Search results were viewed in the available browser session, with uncontrolled locale/personalization. No stable ranking positions, volumes, traffic, review ratings, or market shares are asserted. Related-search suggestions included free and watermark concerns; these are query suggestions, not independent user testimony or People Also Ask evidence.

Evidence labels used here: **Observed** = visible page/source fact; **Reported** = a competitor or community member's claim; **Recommendation** = AENural's proposed response. Design usefulness is an editorial assessment. No evidence establishes that a particular visual feature caused rankings.

## Actual AENural baseline

| Area | Existing implementation and consequence |
| --- | --- |
| Framework | Next.js 16.4.3 App Router, React 19.2.8, TypeScript, Node.js. No blog route/components found. Use the installed Next documentation before future code work. |
| Shared shell | `src/app/layout.tsx` owns local Sora/Inter fonts, skip link, shared header/footer, global styles and JSON-LD. Reuse it; avoid a second shell or changes to authentication/navigation behavior. |
| UI | `globals.css`, `aenural.css`, `aenural-tools.css`; 1200px `.aen-wrap`, sticky header around 64px. Semantic surface/text tokens and light/dark preferences already exist. Preserve orange actions, teal accents, dark navy/green surfaces. |
| Metadata | `src/lib/site-metadata.ts` supplies title, description, canonical, OG/Twitter, generic 1200×630 social card. Validated origin falls back to `https://aenural.com`; root title template adds AENural. Extend for articles later. |
| Sitemap/robots | `src/app/sitemap.ts` builds explicit public routes plus released tools, deduplicated; `robots.ts` references sitemap. Live sitemap and robots returned 200; sitemap contained 26 URLs at inspection. No blog entries yet; existing sitemap has no per-page modification dates. |
| Schema | `structured-data.ts` and `json-ld.tsx` exist. Schema origin currently requires valid `SITE_URL`, whereas metadata has production fallback. Future blog work must reconcile origin handling within its approved scope and escape `<` in JSON-LD strings. No fix made now. |
| Content/performance | Server-rendered pages and local fonts already used. No MDX/CMS dependency or analytics instrumentation found in inspected source/package. Keep first ten posts simple and mostly server-rendered. |

### Availability is more than a working URL

The public registry contains 16 subtitle tools: timing adjuster, merger, splitter, editor, sync fixer, overlap fixer, SRT↔VTT, SRT→TXT, ASS/SSA→SRT, SRT→ASS, SRT→JSON, VTT→TXT, SBV↔SRT, and SRT→MP4. The public audio transcription route is `/tools/free-audio-to-text-converter-online`; its live HTML returned 200 with a matching canonical. These are **CTA candidates**, subject to a real workflow test at publication, not claims that every algorithm/browser/format was tested during this audit.

Important distinctions from `tools.ts`, `discovery.ts`, and release configuration:

- `/tools/srt-timing-adjuster` handles a constant shift; `/tools/subtitle-sync-fixer` supports two-point drift correction. Choose by symptom.
- `/tools/srt-to-mp4` renders subtitle text as a **silent video**. It does not burn captions onto the reader's existing footage.
- `/tools/auto-caption-generator` was reachable live with 200 but `noindex, nofollow`; release flag and preview behavior exist in source. Reachable preview is not evidence of a released, indexable, fully tested product. Hold promotional CTAs until its release and export workflow are confirmed.
- Locally developed compressor/cropper/green-screen and other development catalog entries must not be advertised as available on production solely because localhost works.
- Do not promise languages, diarization, unlimited duration, 4K export, privacy guarantees, supported codecs, or watermark policy without checking the relevant implementation and output. Container extensions alone do not establish codec compatibility.

## CaptionX: selected article evidence

Approximate word counts below are extracted article/main text, excluding scripts and global navigation/footer where identified; headings, FAQs, takeaway labels and related links may remain. They are comparative descriptions, not recommended article lengths. `H` is H2/H3 count; `I/E` counts in-scope internal/external link occurrences, including related reading. Images counts do not capture CSS demonstrations. None is a ranking metric.

| ID / specific article | Intent / likely keyword family | Approx. words; H; images/tables; I/E | Useful observations and gaps |
| --- | --- | --- | --- |
| C1 [Premiere transcription](https://caption-x.com/blog/premiere-pro-transcription) | Software tutorial; Premiere Pro transcription | 480; 7; 0/0; 9/0 | Native workflow first, three transcript outcomes, review step, product option later. Updated 14 Oct; team byline. Add precise version/menu references rather than assuming every export behaves identically. |
| C2 [Animated Premiere captions](https://caption-x.com/blog/animated-captions-premiere-pro) | Styling tutorial; animated captions Premiere Pro | 564; 5; 0/0; 6/0 | Distinguishes saved appearance from animation and templates; visible animated text examples. Clear manual/plugin alternatives. No independent comparison benchmark. |
| C3 [After Effects subtitles](https://caption-x.com/blog/how-to-add-subtitles-in-after-effects) | Capability/import tutorial; After Effects SRT | 1,341; 16; 2/1; 11/1 | Capability matrix, annotated screenshots, native/manual/script/plugin choices and dated software-check note. External Digital Anarchy script reference. Installer downloads are product CTAs, not sample caption files. |
| C4 [Subtitle translators](https://caption-x.com/blog/best-subtitle-translator) | Commercial comparison; subtitle translator | 1,517; 12; 1/1; 16/0 | Criteria cover timing retention and usable free exports. Vendor places itself first; no independent dataset. “No signup” positioning conflicts with a free-account statement in the body. |
| C5 [Premiere subtitle import/export](https://caption-x.com/blog/how-to-add-subtitles-premiere-pro) | Import/export tutorial; add subtitles Premiere Pro | 884; 9; 2/0; 16/0 | Useful sidecar versus burn-in choices and contextual converter links. Essential Graphics instructions require version checking against Adobe's current Properties workflow. |
| C6 [Auto caption software](https://caption-x.com/blog/best-auto-caption-software) | Commercial comparison; best auto caption software | 1,565; 14; 2/1; 17/0 | Explicit comparison criteria and early verdict. Own product first. No-watermark/no-account MP4 wording conflicts with directory and C8 export wording. Do not repeat its prices or test claims as verified facts. |
| C7 [YouTube captions](https://caption-x.com/blog/how-to-add-captions-youtube) | Platform hub; add captions YouTube | 1,850; 31; 0/1; 13/0 | TOC, three methods, editor exports, related guide links. Broad unsupported algorithm/statistics claims and numeric “YouTube standards” need primary evidence. Its blanket CapCut no-SRT statement conflicts with newer C8. |
| C8 [CapCut captions](https://caption-x.com/blog/how-to-add-captions-capcut) | Platform tutorial/paywall troubleshooting | 2,334; 30; 1/0; 14/4 | Separates mobile/Desktop/Web, import from generation, and paid-policy uncertainty; links official help. Explicit free-account/watermarked MP4 disclosure. Illustrates why platform/version-specific limits matter. |
| C9 [DaVinci subtitles](https://caption-x.com/blog/how-to-add-subtitles-in-davinci-resolve) | Capability/tutorial; Resolve subtitles free vs Studio | 1,142; 20; 3/1; 11/2 | Dated free/Studio capability matrix and screenshots; import, manual, automatic and delivery paths. Software observations are the publisher's tests, not AENural's independently reproduced results. |
| C10 [Closed/open captions/subtitles](https://caption-x.com/blog/closed-captions-vs-open-captions-vs-subtitles) | Definition/format comparison | 1,511; 10; 0/2; 8/0 | Early comparison and platform table help scanning. Blanket claim that open captions cannot satisfy WCAG conflicts with W3C's listed sufficient techniques; do not copy legal/platform generalizations. |
| C11 [Podcast captions](https://caption-x.com/blog/how-to-caption-a-podcast-premiere-pro) | Long-form workflow; podcast captions Premiere | 1,847; 9; 6/0; 9/0 | Topic-specific speaker/review/delivery considerations and six screenshots. Long-duration, speed and accuracy statements lack an independent disclosed test dataset in inspected content. |
| C12 [Why captions](https://caption-x.com/blog/why-your-videos-need-captions) | Educational rationale; benefits of video captions | 1,665; 10; 1/0; 13/0 | Audience framing and contextual CTAs; no external body citations found for broad statistics/SEO/engagement assertions. Opportunity for careful sourced explanations and limits. |

### CaptionX design, SEO and conversion

Observed directory: white card grid, blue/purple accents, category/date/read-time metadata; three columns at a wide viewport and one at a narrow viewport. No dedicated category filter was observed in the reviewed listing. First ten AENural posts do not need an imitation of its large footer/tool inventory.

Articles vary: newer concise tutorials use a category, large H1, short answer, updated date/team byline, takeaways and steps; older guides include a contents block. C3 at an observed 1440 CSS px viewport used a 52px H1, an introductory paragraph around 672px wide at 18px/29.25px, and wider 16px body sections. At 390 CSS px the H1 reduced to about 30px; its 520px table sat inside a horizontal scrolling container without whole-page horizontal overflow. Promotion banner and floating chat consume space on mobile. C3 had no in-page anchor links, unlike longer C7. There is no reason to add progress bars, sticky sales widgets, or decorative animation by default.

All 12 sampled raw article responses were 200, supplied H1/content in HTML, and had self-referencing HTTPS canonicals plus Article/FAQPage/BreadcrumbList markup. A robots meta tag was not present in those sampled responses; absence is not proof of Google indexing, robots.txt allowance, or schema eligibility. Title tags generally match the task, with some differences from visible H1; descriptions introduce methods or trade-offs. All 12 had descriptions and OG article/title fields. Ten supplied a shared generic OG image; the extracted C10 and C11 responses lacked an OG image. Sampled article images had alt attributes; presence alone does not prove good descriptions or accessibility. No exhaustive image-semantic or keyboard audit was performed.

Contextual links connect software hubs, narrower guides and utilities; related-reading links reinforce these clusters. Most sampled articles have few external citations. CTAs include inline product links, method-specific buttons, installers and end panels. Downloading a plugin, a caption file, and an MP4 are separate actions and must be labeled separately. No verified downloadable original SRT/VTT fixture pack was observed in this sample. The strongest conversion pattern is offering the next task step; the weakest is mixing absolute marketing promises with changing product limits.

## Other directly relevant competitors

### VEED

Directory: [VEED Learn](https://www.veed.io/learn). Read [VEED versus HappyScribe](https://www.veed.io/learn/veed-vs-happyscribe); inspected [MP3-to-text landing page](https://www.veed.io/tools/audio-to-text/mp3-to-text) separately as a product page, not a blog. Consulted [automatic-subtitle support guide](https://support.veed.io/en/articles/11172739-how-to-add-subtitles-to-your-video-automatically).

Observed comparison: quick decision summary, named Natalia Go byline, category chips, brand comparison hero, large heading, product-first conclusion, related cards and FAQ accordions. Approx. 844 words in broad extracted content; no original benchmark or external body citations observed. Comparison is vendor-authored. Support content supplies operational steps and feature gates; this is stronger evidence for instructions than a competing vendor's pricing summary. Desktop uses a broad hero/content column; narrow view wraps title and cards without observed page overflow. The directory's extensive navigation and visually rich grid exceed what AENural needs for ten posts. Raw comparison response included a canonical and Article markup; extracted schema author name was empty despite a visible byline. Do not assume metadata consistency from visual polish.

### Kapwing

Directory: [Resources](https://www.kapwing.com/resources/). Read [SRT usage/help](https://www.kapwing.com/help/srt-file/), and reviewed [YouTube subtitle guide](https://www.kapwing.com/resources/a-complete-guide-to-youtube-subtitles/) and [subtitle statistics resource](https://www.kapwing.com/resources/how-many-people-use-subtitles-in-2026-2/).

Observed help article: approximately 459 words, seven H2/H3s, three screenshots; explicitly labels subtitle-file export as paid, separates imports/exports and includes troubleshooting. The YouTube guide is much longer (about 2,948 extracted words), with platform support and a case-study citation. Statistics page aggregates linked surveys and publisher sources; it is not automatically original Kapwing research or evidence of backlinks. Directory groups topical sections with large lead cards, thumbnails, named authors and dates. Help layout is quieter, readable, with related tutorials and previous/next links; narrow view had no observed horizontal overflow. Self canonicals and Article markup were found on inspected article responses. Future AENural guides should borrow clarity of disclosure, not price assumptions or the directory's breadth.

### Descript

Directory: [Blog](https://www.descript.com/blog). Read [audio extraction](https://www.descript.com/blog/article/how-to-extract-audio-from-video), reviewed [YouTube caption methods](https://www.descript.com/blog/article/how-to-add-captions-to-youtube-videos), and consulted [video transcription](https://www.descript.com/blog/article/how-to-transcribe-a-video-to-text-and-boost-your-productivity).

Observed extraction guide: named author/date, short definition, methods/tools, format discussion, product workflow, screenshots and FAQs. Largest rendered rich-text body was approximately 2,825 words; raw whole-page counts were rejected because mega-navigation/modal content inflated them. Large editorial hero with serif desktop heading and image, narrow view stacks content with large sans heading. TOC/related-tool affordances and contextual article/tool anchors form a clear network. Some anchors are loosely related to the sentence's exact task. General extraction is not vocal isolation, and exporting to WAV cannot recover quality already lost: AENural must explain these distinctions rather than repeat broad “clean/high quality” language. Raw responses had canonicals, Article markup and `max-image-preview:large`; these are not field-performance evidence.

### SubtitleMedic

Directory: [Guides](https://www.subtitlemedic.com/blog). Read [out-of-sync subtitles](https://www.subtitlemedic.com/blog/fix-subtitles-out-of-sync).

Observed: about 1,099 words, eight H2/H3s, one explanatory diagram, eight internal and zero external body links; dated update, self canonical, Article/BreadcrumbList. Symptom-first diagnosis connects directly to focused utilities, distinguishes temporary player adjustments from saved files, and explains reloading. Directory addresses timing, encoding and playback problems rather than generic AI news. Desktop text can span about 1120px at 16px/24px, too wide for AENural's planned reading measure. Dark UI and a theme control were visible; no complete theme/accessibility audit. Its certainty that growing drift is a frame-rate mismatch is too strong; diagnose edits, speed changes and player behavior as alternatives.

### HappyScribe

Directory: [Blog](https://www.happyscribe.com/blog). Read [SRT versus VTT](https://www.happyscribe.com/blog/vtt-vs-srt-key-differences-and-when-to-use-each-format); additionally consulted [transcription walkthrough](https://www.happyscribe.com/blog/step-by-step-guide-to-transcribing-audio-files-into-text-using-happy-scribe) through public search rendering.

Raw scripted requests to directory/transcription walkthrough received 403 challenges. The format article **was accessible in Chrome** and had visible content, canonical, `index,follow`, BlogPosting and BreadcrumbList. Do not interpret a collector challenge as the publisher's indexing policy. Observed named author/bio, 2024 date, category, split hero, desktop sidebar CTA/TOC, mobile stack. Long paragraphs and repeated keyword phrasing slow the answer; no practical paired file example appeared in the read comparison. Styling/RTL/SEO superiority assertions need primary-spec/platform qualification. Useful opportunity: compare actual cues and conversion loss, not merely call one format “advanced.” No blanket claim about all HappyScribe articles follows from this sample.

## Linking, verified backlinks and original assets

**Internal:** topic hubs explain a broad workflow, narrower guides solve one step, contextual tool links complete it. Related cards are supplementary; they cannot replace a link at the relevant step. Descriptive anchors outperform repeated generic “click here” for reader clarity. No arbitrary link count is recommended.

**Outbound:** C3 links a third-party script; C8 links platform help; Kapwing statistics links surveys and primary publishers. These are outbound citations, not backlinks to those competitors. Verify a source supports the exact claim and current version, not only a related homepage. External links need not all be `nofollow`; label genuine sponsored relationships and use appropriate `rel` where applicable.

**Actual backlink verified:** [Larry Jordan's 27 August 2026 CaptionX interview](https://larryjordan.com/articles/captionx-caption-in-more-languages-with-more-options-for-adobe-premiere/) contains links pointing to `https://caption-x.com/`, including its website introduction. This establishes one observed referring website/page, not a complete backlink profile, traffic contribution, payment status, or causal ranking benefit. Founder statements in the interview remain attributed claims. CaptionX's own coverage post alone would not prove this backlink. A [postPerspective article](https://postperspective.com/captionx-clips-for-turning-long-videos-into-shorts/) was linked from CaptionX's press post, but could not be inspected via the web reader; its backlink is **not verified** here.

No authenticated backlink/SEO database was available. No domain-authority, total referring-domain, link-growth or traffic estimates were collected. AENural can legitimately earn links with original synthetic SRT/VTT test packs, invalid/valid file pairs with expected outputs, a version-tested workflow reference, or a reproducible caption-quality benchmark with consented media and methodology. These are proposals, not existing assets or acquired links. Publishing our own outbound/internal links does not create external backlinks. No outreach/messages were sent.

## Real questions and evidence strength

The following are paraphrases of public questions/reports, not invented FAQs. A forum post proves a reported experience, not the cause or prevalence. Old software answers need current verification. Proposed responses require owner-approved article content.

| Source / date | Actual reported need | Interpretation / useful AENural response |
| --- | --- | --- |
| [Adobe caption regression discussion](https://community.adobe.com/questions-729/latest-premiere-pro-update-has-ruined-captions-1621883), Nov 2025 and later replies | Missing/misheard captions despite apparently clean audio after an update. | Version/language/channel diagnosis, short repeatable test, manual review; do not certify an unverified Adobe bug. |
| [Missing SRT export/import](https://www.reddit.com/r/premiere/comments/1qmvwke/missing_srt_exportimport_option/), Jan 2026 | TXT/JSON options visible but no SRT; corrected client captions need round trip. | Explain transcript versus caption-track export with current official menu evidence. |
| [Batch SRT per clip](https://www.reddit.com/r/premiere/comments/1rman2g/batch_export_separate_srt_files_for_each_clip/), Mar 2026; [older batch thread](https://www.reddit.com/r/premiere/comments/189v8uz) | Export many separate sidecars without repetitive steps. | Separate batch export, merge, and split tasks; don't claim AENural automates Premiere. |
| [One SRT per caption track](https://www.reddit.com/r/premiere/comments/1wdylsl/how_to_export_each_caption_track_as_an_individual/), Sep 2026 | Keep several speaker tracks in separate exports. | Preserve intended track boundaries; verify current application support before recommending workarounds. |
| [Export part of timeline](https://www.reddit.com/r/premiere/comments/1eb3t01), Jul 2024 | Export a short subsection without keeping inappropriate timeline offsets. | Show original-time versus zero-based clip timing and how to validate both ends. |
| [Plex seek desync](https://www.reddit.com/r/PleX/comments/1v2b1ni/external_srt_subtitles_desync_after_seeking/), Jul 2026; [Jellyfin seeking](https://www.reddit.com/r/jellyfin/comments/1tnj0f7/subtitles_come_out_of_sync_when_skipping_forward/), May 2026 | Timing breaks after seeking/transcoding although other playback is correct. | Test fresh playback/direct play/another player before modifying a correct file. Two independent communities, not an established universal fix. |
| [Subtitle management](https://www.reddit.com/r/PleX/comments/1wjx9xt/subtitle_management/), Sep 2026 | Good timing can coexist with wrong recognized words; asks about reliable correction. | Distinguish transcript accuracy from synchronization; sample tests and backups. |
| [Creator tool feedback](https://www.reddit.com/r/contentcreation/comments/1wlstei/i_built_a_free_tool_to_generate_video_captions/), Sep 2026 | A commenter asks about duration editing and omitted text. | Useful specific question, but promotional original post gives weak independent demand evidence. |
| [Client-footage privacy comment](https://www.reddit.com/r/sideprojects/comments/1xg8myk/i_built_a_free_windows_video_editor_that_does/), Oct 2026 | Commenter says client footage cannot be uploaded. | Explain verified data handling and limits. Self-promotional thread; not sufficient evidence of prevalence. |
| [Captions absent from export](https://www.reddit.com/r/premiere/comments/1uttg7e/captions_not_embedding_in_exported_file/), Jul 2026 | Captions appear in editor but not the output/player. | Separate burn-in, embedded tracks and sidecars; inspect export/player behavior. |
| [YouTube automatic captions help](https://support.google.com/youtube/answer/6373554?hl=en) | Official support discusses missing/incorrect automatic captions and audio/language factors. | Primary troubleshooting reference, not a user survey. |
| [HappyScribe songs help](https://help.happyscribe.com/en/articles/6931054-can-you-transcribe-songs), Jan 2023 | Official help addresses music/lyrics limitations. | Speech transcription is not a promise of accurate song lyrics. Check current behavior before feature claims. |

Google People Also Ask and YouTube comment threads were not systematically accessible/reviewed. Video descriptions/chapters encountered in search are not evidence that comments were read. No questions were posted and no users contacted. Further narrow fact-checking for an article is expected; a repeated full competitor audit is not.

## Consistent SEO/technical assessment

Reviewed each sample for intent/title/H1, introduction, H2/H3 organization, steps/examples, dates/byline, link destinations, visible limitations and CTA relevance. Inspected raw canonical/robots/OG/schema where accessible and representative rendered layouts. Descriptive paths and server-supplied text are common. Content duplication risk exists when overlapping guides repeat the same workflow; canonical tags alone do not solve competing article intent. AENural should assign a single primary intent owner and connect narrower tasks intentionally.

Metadata presence, schema presence and HTTP 200 do not establish actual indexing, rich-result eligibility, quality, or ranking. Competitor sitemap membership and robots.txt directives were not exhaustively validated. No authenticated Search Console or CrUX field data was available; no Lighthouse executable was installed or synthetic score run. Raw response sizes/script counts and single fetch latencies are not Core Web Vitals. Mobile spot checks showed readable reflow in reviewed views but are not a WCAG compliance certification. No uniform competitor dark-mode comparison was measured; SubtitleMedic dark styling was directly observed.

Primary references that change the plan:

- [Google documentation updates](https://developers.google.com/search/updates): FAQ rich results stopped appearing from 7 May 2026; documentation removed in June. Competitor FAQPage markup is not a reason to promise this enhancement.
- [W3C captions criterion](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html) lists both open and closed caption techniques. C10's blanket WCAG exclusion is unsafe to repeat. This does not settle every jurisdiction's law.
- [Adobe caption workflow](https://helpx.adobe.com/premiere/desktop/add-text-images/insert-captions/create-captions.html), [YouTube supported files](https://support.google.com/youtube/answer/2734698?hl=en), and [WebVTT specification](https://www.w3.org/TR/webvtt1/) support version/platform-specific explanations rather than competitor generalizations.

## Evidence-based priorities for AENural

1. Answer the task before the marketing: short answer, requirements and a visible choice of workflow.
2. Diagnose constant delay, drift, discontinuities, bad text, and playback-only failures separately. Demonstrate results at the beginning and end.
3. Supply original before/after cue examples and real tested sample downloads when they aid the supplied article. No copied screenshots, competitor installers or proprietary assets.
4. Make free/export/account/format limits explicit and consistent across article, directory, tool and CTA. Never promote a preview as released.
5. Preserve a narrow reading measure, offer a long-article TOC, and use tables only where comparison helps. Avoid persistent banners and mobile sales overlays.
6. Verify claims with primary sources and version-tested evidence. Do not claim caption presence guarantees engagement or search gains.
7. Build one reusable, largely static article system; vary the content components by tutorial/comparison/troubleshooting intent. The other documents specify the original design and implementation blueprint.
