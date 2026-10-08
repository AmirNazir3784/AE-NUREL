# ToolSuite V1 product and site audit

**Date:** 8 October 2026 (Asia/Karachi)  
**Status:** Audit and recommendations only. No implementation or deployment authorized by this report.  
**Scope:** Homepage, global navigation/footer, all seven registered tool routes, SEO/content, interaction logic, responsive evidence, visual system, future accounts/onboarding/monetization, launch and deployment readiness.

## Contents

- [1. Executive summary](#1-executive-summary)
- [2. Competitor lessons: CaptionX](#2-competitor-lessons-captionx)
- [3. Homepage audit](#3-homepage-audit)
- [4. Recommended homepage section order](#4-recommended-homepage-section-order)
- [5. Header and navigation audit](#5-header-and-navigation-audit)
- [6. All Tools page: exact information architecture](#6-all-tools-page-exact-information-architecture)
- [7. Category architecture](#7-category-architecture)
- [8. Footer audit](#8-footer-audit)
- [9. SEO foundation and search intent](#9-seo-foundation-and-search-intent)
- [10. Language and text density](#10-language-and-text-density)
- [11. Individual tool-page audits](#11-individual-tool-page-audits)
- [12. Preview decisions](#12-preview-decisions)
- [13. Click and interaction inventory](#13-click-and-interaction-inventory)
- [14. Responsive audit](#14-responsive-audit)
- [15. Visual-system audit](#15-visual-system-audit)
- [16. Signup/login architecture — plan only](#16-signuplogin-architecture--plan-only)
- [17. Optional onboarding/personalization — plan only](#17-optional-onboardingpersonalization--plan-only)
- [18. Monetization and usage limits — plan only](#18-monetization-and-usage-limits--plan-only)
- [19. Public V1 launch readiness](#19-public-v1-launch-readiness)
- [20. Deployment readiness: VS Code → Git → GitHub → Hostinger → domain](#20-deployment-readiness-vs-code--git--github--hostinger--domain)
- [21. One prioritized action plan](#21-one-prioritized-action-plan)
- [22. Evidence map and audit boundaries](#22-evidence-map-and-audit-boundaries)

## 1. Executive summary

ToolSuite has a credible functional foundation: seven real tools, browser-local processing, explicit file limits, useful validation, accessible native controls, shared light/dark tokens, and substantial automated coverage. It can become a useful V1 without authentication, subscriptions, or a broad redesign.

The principal product problem is discovery. The homepage doubles as the entire directory; four of five categories have no tools; category links return to homepage tiles rather than category results. The principal content problem is repetition: future-tool promises, privacy statements, workflow explanations, large badges, and six related-tool cards repeatedly compete with the working tool. The principal launch gaps are trust/support pages, crawl/share metadata, an operational deployment decision, and fresh end-to-end browser verification.

Keep the distinct tool interfaces. The converter already avoids an unnecessary preview. The overlap checker already has a purpose-built review flow. The editor needs an editing workspace, not the timing adjuster's two-panel template. Improvement should simplify each job independently.

**Launch judgment:** Not ready for an unqualified public V1 sign-off. Existing code checks pass, but discovery and trust gaps remain and this session could not freshly verify browser interactions or physical mobile behavior.

### Most consequential findings

| Finding | Evidence | User impact | Priority |
| --- | --- | --- | --- |
| Editor guards replacement/reset but has no navigation/refresh exit guard | Editor component/session; no beforeunload or navigation protection in source | A user can lose an edited file by following header, related-tool or footer links | P0 |
| Merger promises a correctly timed track although it knows subtitle ends, not video-part durations | Merger metadata/header; merge algorithm; timing caveat below workspace | Structurally valid output can be mistimed against concatenated video | P0 |
| V1 output and mobile flows lack fresh browser sign-off | Browser request-header policy fails; existing QA has some unverified saved-download checks | Passing unit tests cannot establish real file-picker/download usability | P0 verification gate |
| No dedicated directory; “all tools” links go to homepage anchors | /tools returns 404; homepage maps all seven registry entries | Discovery becomes progressively slower as the library grows | P1 |
| Four empty categories promoted in header/menu/footer | Registry and global shell | Visitors follow plausible links and reach unavailable work | P1 |
| Canonicals, OG/Twitter metadata, robots and sitemap absent | Source and local HTTP; robots.txt/sitemap.xml return 404 | Weak crawl/share foundation and no production-origin strategy | P1 |
| Default ICO conflicts with ToolSuite SVG icon | Both icon links emitted; ICO image inspected: white triangle on black | Browser/search identity can show the wrong brand | P1 |

### Audit method and limits

- Read all app routes, site/shared controls, tool components, session reducers, registry, design CSS, relevant transformation functions, existing tests and selected QA documents.
- Read the **installed Next.js 16.3.8** deployment, static-export and metadata guides under node_modules/next/dist/docs/, as required by AGENTS.md.
- Inspected public CaptionX pages through web research. Research extraction sometimes uses previously crawled content; crawl ages vary. These are public-content observations, not a freshly tested competitor application session.
- Read the already-running local server over HTTP: homepage and all seven tools returned 200, with one H1 each. /tools, /robots.txt and /sitemap.xml returned 404. No new dev server was started.
- Inspected existing local screenshots at the requested width families. They are **historical evidence**, some with fewer released tools or older controls. Screenshot filenames are viewport labels; image pixels can be narrower because of scrollbars or cropped to a component. They do not prove the current seven-tool site passes those widths.
- Fresh Chrome automation failed twice with “Unable to load browser request-header policy”; the in-app browser was unavailable. No live clicks, fresh screenshots, hover tests, focus traversal, uploads or browser downloads were completed in this session.
- Existing tests: **392 passed, 41 suites, zero failures**. ESLint passed. TypeScript passed with --noEmit --incremental false.
- No production build was run: it would write build artifacts. Existing .next manifests and earlier QA show prior builds, not a new production-build pass.
- No dependency installation, account creation, signup submission, cloud file upload, Git initialization, commit, deployment or application edit was performed.
- Findings below distinguish **confirmed source/HTTP facts**, **historical visual observations**, and **verification required**. A proposed improvement is not proof of a bug.

## 2. Competitor lessons: CaptionX

The question is what each pattern does for the user, not whether ToolSuite should reproduce its presentation.

| Public observation | Job performed for the user | ToolSuite implication |
| --- | --- | --- |
| Homepage names a concrete captioning product, includes a product preview and routes visitors into use | Makes the offer and expected result understandable | Use a literal online-tools heading and a useful demonstration. ToolSuite serves more than Premiere editors. [Homepage](https://caption-x.com/) |
| Dedicated /tools page has search and grouped task lists | Separates product marketing from full-library discovery | Create a durable directory with real tools and concise cards. [Tool directory](https://caption-x.com/tools) |
| Directory distinguishes browser-local and cloud processing | Helps visitors decide whether file handling is acceptable | State processing per tool; keep the current seven-tool local claim exact. [Tool directory](https://caption-x.com/tools) |
| Timing and merging pages put upload/settings/download before substantial explanation | Lets task-oriented visitors work immediately | Keep explanatory/SEO content below the workspace; surface material timing caveats beside controls. [Timing tool](https://caption-x.com/srt-timing-adjuster), [Merger](https://caption-x.com/srt-merger) |
| SRT-to-VTT page exposes upload and conversion/download without a cue-preview requirement | Minimizes decisions in a format conversion | ToolSuite's current upload-time conversion is already a strong direction. [Converter](https://caption-x.com/srt-to-vtt) |
| Public editor offers SRT/VTT editing and scratch creation | Supports both correction and file creation | Retain ToolSuite's richer undo, search and issue handling while reducing toolbar friction. [Editor](https://caption-x.com/srt-editor) |
| Footer includes policy links | Gives visitors a place to evaluate the service | Add ToolSuite-specific Privacy, Terms, About and Help. Avoid the competitor's very large footer/link inventory. [Homepage](https://caption-x.com/) |
| Extracted signup form offers Google and email/password, with login and policy links | Provides familiar entry and account switching | Future signup can be equally familiar without being required for existing tools. [Signup](https://caption-x.com/signup) |

**Public navigation coverage:** A header extracted on the converter includes Plugins, CapCut Templates, Blog, Pricing, Tools, Contact, Login and Sign Up. Tools dropdown hover/click/focus behavior could not be exercised. Do not infer menu completeness from a text extraction. [Converter header](https://caption-x.com/srt-to-vtt)

**Login/onboarding coverage:** /login exposed only a loading image to research extraction. /signup?next=/dashboard exposed no usable form content, while /signup exposed the form above. No registration, OAuth, dashboard or onboarding was entered. No conclusion about private onboarding quality is supported. [Login](https://caption-x.com/login), [Signup](https://caption-x.com/signup)

**Where ToolSuite can be better:**

- Make the directory and category destinations consistent across every entry point.
- Keep the workflow free of plugin/product upsells.
- Explain fixed delay versus gradual drift before users choose the wrong correction tool.
- Retain the merger's 2–10-file ordering and targeted join review. The inspected CaptionX merger presents two inputs and a 2 MB limit. [Merger](https://caption-x.com/srt-merger)
- Keep support content short and specific; do not reproduce long homepage language lists, repetitive tool pages, star claims or commercial prompts.
- Make failure recovery explicit and avoid confidently labeling partial repairs as completely fixed.
- Match preview size to uncertainty: no large preview for conversion; meaningful comparison for timing and repair.
- Keep privacy accurate: future cloud tools must not inherit the shared header's hardcoded browser-local badge.

Competitor names, wording, branding, code, assets and exact layout are not proposed for reuse. Tool-name recommendations later are generic task terminology.

## 3. Homepage audit

**Current order:** Hero → Popular tools → Categories → Featured timing adjuster → Benefits/trust strip → How it works → FAQ → Final CTA → Footer.

Evidence: src/app/page.tsx and src/components/home/*.tsx.

| Area | Current assessment | Recommendation |
| --- | --- | --- |
| Hero H1 | “Simple tools. Serious time saved.” is a slogan; it does not identify online tools or current subtitle capability | Use “Free online tools for everyday tasks.” Keep exact current availability in supporting text |
| Supporting copy | Combines today's purpose with four future families; visitors must parse a roadmap | “Edit, fix and convert subtitle files in your browser. Free to use, with no signup.” Expand when other tools actually ship |
| CTA | Two hero CTAs: Explore all tools and Try SRT Timing Adjuster; first goes to #tools | One primary CTA: **Explore Free Tools**, destination /tools. No second hero action |
| Media | Correct 16:9 frame; right of copy above 900px, below copy at narrower widths | Preserve this responsive direction. Use an actual short demo or a clearly static product image |
| Play affordance | Play triangle appears inside a non-interactive figure labeled as a placeholder | Remove the play affordance until playback exists. “Coming soon” is honest but wastes the strongest demonstration area |
| Popular tools | maps tools directly, showing all seven plus a generic directory-note card; not evidence-based popularity | Show four curated useful tools. Call the section “Useful tools” until popularity is measured |
| Tool cards | Whole-card links and clear names work; availability/category/local/status/action labels are layered | Icon, short name, one useful sentence, one clear open affordance. Remove repetitive “Available now” on every released card |
| Category section | One usable category, four unavailable categories; subtitle tile loops back to #tools | For V1 show one compact Subtitle Tools destination. Do not dedicate a large homepage block to empty categories |
| Featured tool | Concrete timing example is better than generic marketing; same tool already has several CTAs | Optional compact feature below discovery; shorten and remove duplicate benefit bullets if the demo covers them |
| Benefits | Four broad benefit cards plus trust strip repeat earlier claims | Merge into a concise factual trust/help block: free, no signup, files processed on-device |
| How it works | Generic three-step journey is understandable but adds little after tool cards and demo | Three short steps inside the trust block; remove standalone large section |
| FAQ | Native details are suitable; answers dynamically enumerate every tool and future cloud possibility | Keep three or four user questions, one or two sentences each. Link to directory rather than list all names |
| Final CTA | Helpful return to tools but repeats slogan and secondary timing CTA | Compact “Find the tool for your next task” with Explore Free Tools → /tools |
| Footer | Supplies navigation but no real support/policy pages | Replace roadmap emphasis with real V1 destinations |

**Homepage tool shortlist:** Subtitle Editor, SRT Timing Adjuster, SRT to VTT, SRT Merger. This is an editorial starting set, not a measured ranking. Offer **View all tools (7)** immediately beside/below it. Sync and overlap repair remain findable in the directory/search. The count should follow the registry; the featured selection should not automatically expand when tools are added.

**Missing now:** durable View all tools destination; direct task selection for common subtitle problems; real trust/support links; a useful demo or static illustration without fake playback; factual availability. Do not add testimonials or ratings without real evidence.

## 4. Recommended homepage section order

1. **Hero:** literal H1, short current-purpose sentence, one Explore Free Tools CTA, 16:9 product demonstration right on desktop/below on mobile.
2. **Useful tools:** four curated tools and View all tools → /tools. This is the first discovery section.
3. **Browse by task/category:** for V1 a compact Subtitle Tools link and optional task shortcuts (“Edit text,” “Shift timing,” “Convert format”). Expand into categories only as those categories acquire released tools.
4. **One practical example:** optional compact featured tool demonstration. Remove if it merely repeats the hero demo.
5. **Trust + how it works:** short factual points and Choose → Add → Download. Merge the existing benefits, trust strip and large generic workflow.
6. **FAQ:** free use, signup, file privacy, supported formats/devices where useful. Remove “What is ToolSuite?” repetition and roadmap question.
7. **Final CTA:** one clear route to the directory, modest in size.
8. **Footer:** real discovery, help, operator and policy links.

Move discovery ahead of marketing. Remove the directory-note filler card and standalone empty-category roadmap. Shorten feature/benefits/FAQ/final CTA. No blog/resources section is required until there is useful original content to feature.

## 5. Header and navigation audit

Evidence: src/components/site/header.tsx, theme-toggle.tsx, src/lib/tools.ts and globals.css.

| Item/interaction | Confirmed behavior from source | Assessment |
| --- | --- | --- |
| Logo/home | Link to / with accessible “ToolSuite home”; closes menu | Good; verify client navigation doesn't silently discard editor work |
| Tools disclosure | Native details/summary; click/keyboard activation; Escape closes and focuses summary; blur outside closes | Good baseline. Hover only styles summary; it does not open the menu. Don't report hover-open as broken |
| Outside click | No explicit document pointer listener; relies on focus leaving disclosure | May remain open on clicks on non-focusable background. Verify before declaring a defect |
| Menu content | All seven tool names plus full descriptions in a scrollable 300px list; separate five-category panel | Too much repeated text, and four unavailable categories dominate category shortcuts |
| “Explore all tools” | /#tools | Label promises a directory; destination is homepage popular section |
| Subtitle shortcut | /#subtitle-tools | Jumps to category tile, requiring another click to return to tools |
| Video/Image shortcuts | /#video-tools and /#image-tools | Existing fragments but no usable tools. They are disappointing destinations, not literal dead links |
| Active state | pathname.startsWith("/tools/srt") | Sync and overlap routes miss subtitle-active state. Prefix is not a category model |
| Mobile navigation | Same nav wraps to second row at ≤760px; no separate mobile menu | Four items fit by reducing text to 11px at narrow sizes; does not scale to more categories |
| Search | Native modal dialog; focus requested on input; close button/backdrop close; native Escape | Good foundation. Fresh focus trap/return and background-click behavior remain unverified |
| Search matching | Every whitespace term must be a literal substring of title/description/category | No aliases, typo tolerance or semantic matching. “delay” and “combine subtitles” can miss the expected tool |
| Search result links | Direct routes, short name/category, polite live region; query resets when opened | Good; include result count and clear-query recovery when library grows |
| Theme | Accessible target-mode label; system default, stored override, cross-tab sync, storage failures handled | Strong foundation, with automated coverage. Optional future System setting; not needed for V1 |

**Scalable V1 menu plan:**

- Header: logo, Tools, one real Subtitle Tools shortcut, Search, theme. No empty family shortcuts.
- Tools opens a two-column disclosure at wide widths: **Subtitle Tools** with short tool names grouped by Timing & editing / Conversion; **Find a tool** with Search and View all tools.
- Keep tool descriptions out of dense menu rows. A single sentence at category level is sufficient.
- Future multi-category menu: left category links, right selected category's short-name list; cap visible lists and link to the category directory. All destinations must be usable, keyboard reachable links.
- Mobile: explicit Tools disclosure with stacked category/tool links and View all tools; preserve Search and theme as ≥44px controls. Avoid horizontal compressed category strips.
- Retain click activation, Escape and focus-visible styles. Avoid making hover the only opening method. Test touch, mouse transit, outside click and focus return.
- For ordinary website navigation, retain semantic nav/links and a disclosure rather than adding menu-role keyboard rules without implementing them.
- Search aliases can be deterministic and curated: “delay subtitles,” “captions too early,” “merge subtitles,” “convert srt,” “fix drift.” No AI search or backend is justified for seven tools.

## 6. All Tools page: exact information architecture

**Current status:** No src/app/tools/page.tsx. The local /tools path returns 404. Header/footer CTAs avoid that path by linking to /#tools. Existing search is a modal, not a full directory.

### Routes and destinations

| Route | Purpose | Indexing treatment |
| --- | --- | --- |
| / | Introduction and curated discovery | Index |
| /tools | Every released tool, searchable/filterable | Index; self-canonical |
| /tools/subtitle-tools | Subtitle category overview and all seven subtitle tools | Index; useful distinct introduction and grouped directory |
| Existing /tools/{tool-slug} routes | Dedicated task workspaces | Keep stable; index; self-canonical |
| /about, /help, /privacy, /terms | V1 support/operator/policy pages | Public; indexing based on content, not used as keyword pages |
| Future /tools/video-tools etc. | Released category hubs | Publish only when actual tools exist |

Do not change current tool URLs merely to create the category hub. Category and tool slugs can coexist at the same /tools level.

### /tools page order

1. Breadcrumb Home → Tools.
2. H1 **All Tools**. One short line explaining current free tools.
3. Visible search label and input: **Search tools**, placeholder “Search by name or task.”
4. Category filter: **All (7)**, **Subtitle Tools (7)**. Since only one category exists, a static category indicator is enough for V1; don't build a redundant elaborate filter system.
5. Result count; clear search/filters control when active.
6. Subtitle Tools group with two subsections:
   - **Timing & editing:** timing adjuster, sync fixer, overlap fixer, subtitle editor, merger, splitter.
   - **Format conversion:** SRT to VTT.
7. Small help link for choosing between timing tools; no upsell banner.

Cards: one whole-card direct link, recognizable icon, short name, maximum one short supporting sentence. No repeated Available/Free/Browser badges on every card. State shared free/no-signup/local facts once above the list; future cloud tools get a clear per-card distinction.

Desktop target: three comfortable columns or a concise grouped list; tablet two; mobile one. Evaluate readable text before selecting a column count. Keep complete link content in server-rendered HTML; client search enhances it. Seven tools require no pagination or virtualization.

Category filter state may eventually use a shareable category parameter, but category hubs remain canonical destinations. Search queries should not create indexable near-duplicate landing pages. Show a helpful zero-result state with Clear search and the visible categories; never fabricate unreleased matches.

### Subtitle category page

H1 **Subtitle Tools** → short task-oriented intro → “What needs fixing?” chooser → grouped seven-tool links → brief format note (SRT/VTT support varies) → relevant help. Avoid duplicating every tool page's instructions or creating thin pages for Timing & Editing and Conversion yet.

## 7. Category architecture

Current registry has Subtitle, Video, Image, Audio and Creator families. All seven tools correctly belong to Subtitle Tools. There are no released tools in the other four categories.

| Category | V1 decision | Future rule |
| --- | --- | --- |
| Subtitle Tools | Publish; all seven tools here | Subtitle conversion, editing and timing remain here, even when used for video |
| Video Tools | Hide from primary discovery until released | Tools modifying video files, dimensions, length or compression |
| Image Tools | Hide until released | Image resizing, compression, conversion and visual editing |
| Audio Tools | Hide until released | Audio conversion, trimming, cleanup and processing |
| Creator Tools | Reserve, do not publish empty hub | Only tools whose main output is a publishing/social task rather than an image/video/audio file transformation |
| Document & File Tools | Do not create now | Justified once real document/file jobs ship; do not launch separate empty Office, PDF and Documents categories |
| Developer Tools | Do not create now | Use only if real technical tools form a useful group; do not split an obscure single tool into its own category |

Use one primary category per tool and searchable secondary task tags. “Creator” can be a personalization tag across several families; it should not duplicate every subtitle/video tool. Create a new category because users need a new discovery group, not because the taxonomy can accommodate it.

Inside Subtitle Tools, Timing & editing and Format conversion are simple group headings. No extra navigation tier, empty subcategories or category-specific icon-only navigation is needed.

## 8. Footer audit

The current footer repeats every registered tool, five category links, FAQ and a roadmap link. As tools grow, it automatically grows into a second full directory. There are no About, Help, Privacy or Terms destinations.

Recommended V1 structure:

| Group | Contents |
| --- | --- |
| Brand | Logo/home, one plain purpose sentence, operator/copyright identity once confirmed |
| Tools | All Tools, Subtitle Tools, at most three useful direct tool links |
| Help | Help/contact, About, optional homepage FAQ link if still useful |
| Legal | Privacy, Terms; cookie details only if actual analytics/storage practices require them |
| Base | Copyright/operator and Back to top |

Remove “What's coming next” from the core footer, empty category destinations, repeated vague privacy slogan and full seven-tool enumeration. Some repetition of a few useful header links is normal; repetition of the entire registry is unnecessary.

Back to top currently points to #main-content, which is below the header. This is a valid jump but not the literal top of the document. Decide whether that distinction matters; verify keyboard focus after fragment navigation.

Privacy content must explain local file processing **and** actual host logs, theme localStorage, analytics if added, support correspondence and future cloud handling. Browser-only file processing does not mean the website makes no network requests.

## 9. SEO foundation and search intent

### Current foundation

Read-only requests to the existing local server returned 200 for the homepage and all seven registered tool pages. Every page has one H1 and a unique tool title/description. These are good foundations. They do not establish public indexing, production performance or deployment readiness.

| Area | Current evidence | Recommendation |
| --- | --- | --- |
| Titles | Homepage: “ToolSuite — Simple tools. Serious time saved.” Tool pages use “[tool title] \| ToolSuite” | Give the homepage a useful search subject, e.g. “Free Online Tools for Subtitles & Everyday Tasks \| ToolSuite.” Keep tool titles specific and concise |
| Meta descriptions | Present on all inspected pages | Describe actual inputs, output and value. Replace jargon and merger timing assurance; do not promise forthcoming media tools |
| H1 | One per page; homepage slogan does not explain the product | Use a plain product/search heading on home. Preserve one task-specific H1 on each tool |
| H2/H3 | Tool workspace, help, related tools and card headings have generally sensible roles | Keep heading levels aligned with content structure; do not select heading levels for font size. Reduce duplicate “How it works” content, not necessary semantics |
| URLs | Seven descriptive, hyphenated routes under /tools/ | Keep existing URLs. A better display name does not require a slug change. If a future migration is justified, redirect old URLs |
| Canonicals | Not present in inspected HTML; no configured canonical metadata found | Add absolute self-canonicals after the real domain is known. Define domain, www preference, HTTPS and trailing-slash policy together |
| robots.txt | Local /robots.txt returns 404 | Add deliberate production crawling rules and sitemap reference. Prevent accidental production noindex; prevent staging indexing |
| Sitemap | Local /sitemap.xml returns 404 | Include home, real directory/category pages and released indexable tool/help pages. Exclude search/filter variants and unreleased categories |
| Open Graph / Twitter | No relevant tags in inspected HTML or metadata source | Add site defaults and useful page overrides: title, description, absolute URL, ToolSuite sharing image, card type. Do not claim screenshots/assets already exist |
| Site icon | Automatic favicon.ico and explicit brand.svg links both emitted; ICO contains the starter triangle | Replace conflicting starter identity with a consistent icon family and verify browser tabs/bookmarks/mobile icons |
| Internal links | All real tools linked from home/menu/footer; many repetitions; category links return to homepage fragments | Introduce directory and real subtitle hub. Recommend two or three relevant next jobs, not every other subtitle tool everywhere |
| Breadcrumbs | Semantic breadcrumb nav and aria-current exist; first two links lead to homepage fragments | Route to All Tools and Subtitle Tools hubs; optionally add matching BreadcrumbList data |
| Structured data | None found | Consider truthful WebSite/Organization and BreadcrumbList. WebApplication can describe a tool where useful; it does not guarantee a search enhancement |
| Semantic markup | Main landmark, headings, nav, sections, native controls/details/dialog, skip link and labeled workspaces | Retain these strengths; verify real accessible names, focus and announcements rather than assuming semantic tags are sufficient |
| Link text | Tool names generally descriptive; repeated “Explore all tools” currently means a homepage anchor | Make “View all tools” lead to the actual library. Avoid generic repeated “Learn more” links |
| Category indexing | No dedicated category routes; four empty “coming soon” families | Publish one useful Subtitle Tools hub. Do not index empty future hubs or thin tag combinations |

Metadata descriptions should say “without sending your file to our servers” when useful. “No upload” is confusing when the visible control asks the visitor to upload/choose a file: choosing a local file is part of the workflow.

Suggested description examples:

- Home: “Free online tools to edit, fix, split and convert subtitle files. Work in your browser without creating an account.”
- Merger: “Combine SRT files in order, choose the added gap and check the joins before downloading one subtitle file.”
- Editor: “Edit SRT and VTT subtitle text and timing in your browser. Find words, fix errors and download your updated file.”
- Converter: “Convert an SRT subtitle file to VTT in your browser. Keep subtitle text and timing, then download the converted file.”

Do not make every description a list of synonyms. Timing adjuster and drift fixer deserve distinct explanations so their search results help people choose the right tool.

### Schema boundaries

Use structured data only for visible, truthful information. Do not invent ratings, reviews, processing speed or company details. FAQ sections can help users without adding FAQ schema. Google’s current change log records FAQ rich-result deprecation in May 2026 and removal of its documentation in June 2026, so FAQ rich results are not a launch rationale. [Google Search documentation updates](https://developers.google.com/search/updates)

Valid markup does not guarantee a rich result; follow the current applicable feature documentation when implementation begins. [Google structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

### Every current tool name

These are naming hypotheses based on ordinary task language and the observed product, **not measured keyword-volume findings**. Keep format identifiers where they help a visitor know what file is supported. Short menu names and descriptive page titles can differ.

| Current name | Possible display/page name | Short menu name | Reason and intent consideration |
| --- | --- | --- | --- |
| SRT Timing Adjuster | SRT Subtitle Timing Adjuster | Adjust SRT Timing | “Subtitles too early/late,” “delay SRT,” and “shift subtitles” are useful aliases. Retain SRT because this tool does not accept VTT. Do not imply drift correction |
| SRT Merger | Merge SRT Files | Merge SRT | Both merger and combine/merge subtitles match the task. The verb explains the action; explain sequential timing assumptions |
| SRT Splitter | Split SRT Files | Split SRT | “Split subtitles” is understandable; retain original phrase in help/search aliases. Parts, subtitle count and time are modes, not separate tool pages |
| SRT & Subtitle Editor | Subtitle Editor — SRT & VTT | Subtitle Editor | Existing “SRT & Subtitle” is redundant and hides VTT support. “Subtitle editor online” is a natural task phrase; no need to repeat “online” in every label |
| Subtitle Sync Fixer | Subtitle Sync Fixer | Fix Subtitle Drift | Keep the familiar sync phrase on the page and explain gradual drift immediately. “Subtitle sync” can also mean a constant delay or audio detection, which this tool does not automatically provide |
| Subtitle Overlap Fixer | Fix Overlapping Subtitles | Fix Overlaps | “Overlapping subtitles” describes the visible problem better than “cue conflicts.” Include SRT/VTT support nearby |
| SRT to VTT Converter | SRT to VTT Converter | SRT to VTT | Already strong and widely recognizable format terminology. Explain WebVTT once below the task if needed |

Search aliases should include task phrases such as early, late, delay, offset, combine, join, split, captions, subtitle text, drift, gradual sync, overlap, VTT and WebVTT. Alias mapping must respect capabilities; “VTT timing” should not route users to an SRT-only tool without a clear support distinction.

## 10. Language and text density

The strongest current copy is the concrete upload/download language. The weakest copy combines abstract slogans, roadmaps, repeated privacy statements and specialist timing terminology. Do not remove essential warnings to achieve brevity.

| Current wording / pattern | Suggested direction | Why |
| --- | --- | --- |
| “Simple tools. Serious time saved.” | “Free online tools for everyday tasks.” | Explains what the site is |
| “One place for the file tasks that interrupt your day…” | “Edit, fix and convert subtitle files in your browser.” | Concrete present capability; roadmap belongs elsewhere |
| “No unnecessary installs” | “No installation needed” | Direct and less defensive |
| “Local processing where possible” | “These subtitle tools process files in your browser” | Current tools are local; vague qualification reduces trust |
| “A growing toolkit. One clear purpose.” | Remove the filler card | Visitors need a real tool or directory link |
| “More ways to make subtitles work for you.” | “Related subtitle tools” or omit supporting line | Heading already explains the section |
| “Cue,” “cue count,” “cue issues” throughout user instructions | “Subtitle,” “number of subtitles,” “timing issues” where accurate | Nontechnical users do not need the parser vocabulary |
| “First adjusted destination cue” | “First subtitle in the next file” | Describes what the user is checking |
| Merger “Gap: 0s” | “Added gap: 0 seconds” | Source lead-in can still produce a real pause |
| “One file. A new format.” plus “From SRT to WebVTT” plus SRT→VTT badge | Keep one small format indicator | Three explanations of the same conversion waste the first screen |
| Converter “10,000 cues,” “SRT validated · VTT ready,” plus converted count and two checks | “VTT ready” with file/count and only meaningful warnings | Keep actual limits available; reduce repeated success signals |
| “Your timeline, checked” / “Where subtitles meet” | “Overlapping subtitles” / “Review overlaps” | Clear headings beat decorative phrasing in a repair workflow |
| Splitter “Start each part from zero” | “Reset times for each part,” with mode-specific example | First caption need not begin at 0 in time-interval mode |
| “Resolve the message on the left” | “Fix the error above to continue” if that is the actual placement | Directional desktop wording fails after mobile stacking |
| CPS badges | “Reading speed,” with optional characters-per-second explanation | Useful to experienced editors; unnecessary jargon for most visitors |
| “Correctly timed subtitle track” | “One subtitle file,” plus visible timing limitation | Correct video alignment cannot be inferred from SRT alone |

Maintain format names SRT/VTT, necessary timestamps and meaningful warnings. Explain them at the point of use rather than adding a glossary above every tool.

### Where density is highest

1. **Global shell:** large tool heading, category/local badges, workspace stepper, upload hint and repeated privacy statement can all appear before meaningful work. Reduce the shell’s vertical cost, especially on mobile.
2. **Editor:** expanded advanced controls, per-subtitle badges and repeated actions can crowd out text editing. Existing collapsed disclosures are helpful; keep advanced controls optional.
3. **Sync fixer:** selecting two reference moments genuinely needs explanation, but duplicated reference-point guidance, timestamp help and generic workflow labels should be consolidated.
4. **Overlap fixer:** counts, strategy explanations, warnings and issue cards are useful only in the correct order. Show the consequence of the selected strategy once near that choice.
5. **Supporting content:** all related tools plus an enumerating footer adds a second directory after almost every tool. Use a small relevant set.
6. **Homepage:** future categories, generalized benefits, trust strips, how-it-works copy, FAQs and repeated timing-adjuster CTAs tell overlapping stories.

Useful FAQs answer real uncertainties: file support, local handling, whether the tool fits the timing problem, and important limitations. Remove FAQs that only repeat the title, upload instruction, privacy badge or roadmap. Keep SEO/help content after the working interface and available for users who need it.

## 11. Individual tool-page audits

The following covers **all seven registered and implemented tools**. Recommended structures are sequences of user decisions, not a demand for identical layouts. Exact first-screen fit still needs fresh browser verification.

### 11.1 SRT Timing Adjuster

**Primary job:** Move every subtitle earlier or later by one constant amount because the whole SRT is consistently out of sync.

**Current strengths:** Local SRT parsing, clear file limit, signed decimal offset, useful quick presets, live before/after timestamps, reset and direct download. Text and source formatting are preserved by the timing pipeline. Errors and negative-time clamping are surfaced. Existing tests cover timing behavior.

**Current weaknesses:** Plus/minus seconds require users to translate “earlier/later” into arithmetic. Offset 0 can produce a valid unchanged download without a useful change being made. The shared heading/badges/stepper consume space. On mobile the download appears before the preview. A failed replacement can leave the previous valid file in place; the user must be certain which file will download. Changing offset does not necessarily clear an earlier file error immediately.

**Unnecessary elements:** Large empty preview scaffolding; repeated local-processing assurances; six unrelated-to-the-current-problem tool cards. A video player is unnecessary for a simple known offset.

**Missing useful elements:** A visible earlier/later explanation beside the amount; compact affected-timestamp check before download; contextual link to gradual-drift correction. A clear statement when old input is retained after a replacement error.

**Preview needed? YES, narrowly.** A compact before/after time example helps verify direction and negative-time handling. This is not an audiovisual sync preview and cannot prove alignment with a video.

| Required question | Audit answer / recommended behavior |
| --- | --- |
| A. Exact job | Apply a constant shift to every subtitle |
| B. Minimum information | SRT file, direction, amount in seconds |
| C. First thing | Plain one-line task explanation and file chooser |
| D. Preview | Small timing comparison; expand more only if useful |
| E. Above fold | Choose file; once loaded, amount/direction and download with material warning |
| F. Move below | Format explanation, full instructions, troubleshooting and related jobs |
| G. Remove/reduce | Empty preview prominence, duplicate badges and generic workflow narration |
| H. Primary action | “Download adjusted SRT”; identify unchanged state if amount is 0 |
| I. Result reach | Keep download next to controls and after the compact verification on mobile |
| J. Purpose-built? | Mostly; make the earlier/later decision the visual center |

**Recommended page structure:** Title + one sentence → upload → loaded-file row → earlier/later amount + presets → compact timestamp comparison and any clamp warning → download/reset → brief help and two relevant links.

**Copy examples:** “Shift subtitles earlier or later.” “Later makes subtitles appear after their original time.” “Some times would be below zero and will be set to zero.” Avoid saying “perfectly synced.”

**SEO opportunity:** Explain fixed delay versus gradual drift. Naturally include delay/shift/SRT timing in help and search aliases.

**Competitor comparison:** CaptionX similarly emphasizes an offset and presets. ToolSuite can be clearer about direction and consequential clamping, with contextual drift guidance rather than a long promotional tail. [CaptionX timing adjuster](https://caption-x.com/srt-timing-adjuster)

**Priority:** P1 interaction/copy simplification; P1 confirm clamp compatibility and disclose it clearly. Current timing code can create zero-duration captions at time zero, while other ToolSuite tools require positive duration. That is an interoperability issue to investigate, not permission to change the algorithm during this audit.

### 11.2 SRT Merger

**Primary job:** Combine ordered SRT parts into one file for a combined sequence, while understanding how the later parts are positioned.

**Current strengths:** Supports 2–10 files, up to 10 MB each and 50 MB combined; ordering by drag or labeled arrows, removal/replacement, duplicate feedback, join previews and direct merged download. The current compact preview shows a small number of joins with expansion. Source uses the prior file’s latest subtitle end rather than assuming the last listed cue is latest.

**Current weaknesses:** “Correctly timed” overpromises. SRT contains subtitle times, not video-part duration. The algorithm places a next file after the prior maximum subtitle end plus added gap, retaining the next file’s original lead-in. A shared gap cannot independently compensate different trailing video durations. The honest duration note is below the tool. “Gap: 0s” can be mistaken for actual silence between captions. Repeatedly serializing a large merge on state changes could affect responsiveness; the limits do not prove acceptable performance.

**Unnecessary elements:** Full-file cue previews; large join explanations repeated for every join; a permanently large upload zone after files are loaded; generic reassurance that obscures timing assumptions.

**Missing useful elements:** Material timing assumption beside gap/download; plain “Added gap” label; guidance for video parts that extend past the last caption; understandable validation recovery. After a rejected add, the current valid file set is retained but download is blocked until the error is dismissed; the recovery action should clearly say what will be used.

**Preview needed? YES.** Join boundaries are a meaningful timing decision. Show the final subtitle of the previous part, first subtitle of the next part, added gap and resulting times. Do not render every subtitle.

| Required question | Audit answer / recommended behavior |
| --- | --- |
| A. Exact job | Join ordered subtitle parts with explicitly understood placement |
| B. Minimum information | At least two files, order, added gap and knowledge of any uncaptioned video tail |
| C. First thing | Add files; state the basic timing assumption briefly |
| D. Preview | Join-boundary checks |
| E. Above fold | Add/order controls; loaded state shows gap and result action near joins |
| F. Move below | Detailed examples, format explanation and general help |
| G. Remove/reduce | Automatic-correctness claims and large generic previews |
| H. Primary action | “Download merged SRT,” enabled only for a valid current set |
| I. Result reach | Compact count/filename and join summary immediately before download |
| J. Purpose-built? | Yes: ordering and joins are the right model; limitation placement weakens trust |

**Recommended page structure:** Task + timing assumption → choose files → ordered rows with compact add/replace/remove → added gap → join summary → warnings + download → detailed timing example below.

**Copy examples:** “Combine SRT files in order.” “Later files follow the previous file’s last subtitle time, plus the added gap.” “If a video part continues after its last subtitle, include that extra time.” Use “Previous file” and “Next file,” not source/destination cues.

**SEO opportunity:** Merge/combine SRT files, multi-part subtitles, sequential merging. Distinguish this from combining simultaneous subtitle languages or tracks, which the current product does not do.

**Competitor comparison:** CaptionX uses a simpler two-file merger and an added delay. ToolSuite’s multi-file ordering and focused join inspection are meaningful advantages. Neither interface can infer uncaptioned video duration from the subtitle file alone. [CaptionX SRT merger](https://caption-x.com/srt-merger)

**Priority:** P0 correct assurance and elevate the existing timing limitation; P1 clarify gap and result verification; P1 measure near-limit interaction performance.

### 11.3 SRT Splitter

**Primary job:** Divide a subtitle file into useful parts and obtain either individual files or a ZIP, with the correct time reference for the next use.

**Current strengths:** Three real splitting modes: number of parts, subtitle count and time interval. Original times are the default; optional reset, meaningful part manifest, individual downloads and ZIP. Empty time intervals are skipped; whole subtitles are retained instead of cutting text.

**Current weaknesses:** “Start each part from zero” can imply the first caption is always at zero. In time mode, subtraction uses the interval boundary and can preserve a lead-in; in count/parts modes the reference differs. A subtitle crossing an interval boundary stays whole in the part selected by its start. These are important assumptions for matching split video. Desktop directional error wording is unsuitable on mobile. The ZIP action can precede the output manifest after stacking.

**Unnecessary elements:** Full subtitle-text previews, decorative empty output frames, repeated instructions under each mode.

**Missing useful elements:** Mode-specific time example; output summary before download; an explanation of boundary handling where a visitor chooses time splitting. Label part outputs by useful filenames, counts and time ranges, not internal objects.

**Preview needed? YES, as an output manifest.** Users must see how many files will be created and their coverage. An optional boundary example is useful; a large cue preview is not.

| Required question | Audit answer / recommended behavior |
| --- | --- |
| A. Exact job | Create subtitle parts matching the intended division |
| B. Minimum information | SRT, split method/value, original versus reset times |
| C. First thing | Upload, then an understandable method chooser |
| D. Preview | Parts/counts/time ranges and optional boundary detail |
| E. Above fold | Current method/value and time option once loaded |
| F. Move below | ZIP explanation, detailed mode examples and FAQs if needed |
| G. Remove/reduce | Dense cue terminology and automatic-preview scaffolding |
| H. Primary action | “Download all parts (ZIP)” plus clearly secondary individual downloads |
| I. Result reach | Output manifest and ZIP action together, including on mobile |
| J. Purpose-built? | Yes: method selection and part list are distinctive and useful |

**Recommended page structure:** Upload → method + value → time-reference option → part summary/manifest → ZIP and individual downloads → boundary/time-reference help.

**Copy examples:** “Split into 3 parts.” “Split every 100 subtitles.” “Split every 10 minutes.” “Keep original times” / “Reset times for each part.” Give one correct example for the selected mode rather than a universal zero-start promise.

**SEO opportunity:** Split SRT file by parts, subtitle count or time; explain ZIP and timing choices naturally.

**Competitor comparison:** No splitter was identified in the inspected CaptionX directory; this is an opportunity for a useful differentiated job, not evidence that no such page exists anywhere on its site.

**Priority:** P1 clarify time reference and boundaries; P1 bring output verification next to downloads; P2 simplify status/copy.

### 11.4 SRT & Subtitle Editor

**Primary job:** Edit caption text and start/end times, correct issues, and download the updated SRT or VTT.

**Current strengths:** SRT/VTT import, start from scratch, editable Unicode/RTL text, individual timings, add/delete, undo/redo, find/replace, optional timing nudges and two export formats. Validation identifies problems before export. Advanced controls use collapsed disclosures. Fifty-cue pages limit rendered editor size. Dirty replace/reset actions are confirmed. Desktop export controls are sticky.

**Current weaknesses:** There is no equivalent guard for navigating away or refreshing with edited work; header, related and footer links can discard a session. No persisted draft is implemented. Export becomes static on mobile, making it distant from current editing. Expanded advanced controls can consume much of the screen. Nested cue scrolling competes with page scrolling. Page navigation can be redundant for one page. Per-cue speed/issue badges and technical labels add density. Search ignores case, while replacement matches case; this distinction needs clear explanation.

**Unnecessary elements:** A separate preview duplicating editable captions; compulsory video upload; permanently expanded advanced timing/find controls; reading-speed thresholds as dominant warnings for casual edits.

**Missing useful elements:** Unsaved-work protection across relevant exits and explicit session-only status; accessible route from an export error to its affected subtitle; a mobile action position that remains easy to reach. The existing toolbar should retain advanced power without displacing the editable content.

**Preview needed? YES, the editable subtitle list itself.** It is both working surface and inspection. No second preview panel is justified by default.

| Required question | Audit answer / recommended behavior |
| --- | --- |
| A. Exact job | Change text/times and save a valid file |
| B. Minimum information | File or scratch start; text and relevant start/end values |
| C. First thing | Choose file / Start from scratch; loaded state starts with editable captions |
| D. Preview | Editable captions, with errors attached to relevant fields |
| E. Above fold | Caption text, timing, undo/redo and export access once working |
| F. Move below | Detailed syntax, reading-speed education, export format notes not currently relevant |
| G. Remove/reduce | Redundant view, always-visible power toolbar, per-caption decoration |
| H. Primary action | Download in source format; alternative format clearly secondary |
| I. Result reach | Compact persistent/reachable export area on mobile, with validation summary |
| J. Purpose-built? | Yes in capability; dense shell and action distance reduce the editing-first experience |

**Recommended page structure:** Compact file/scratch start → loaded-file/session status → small undo/redo + optional find/advanced toolbar → caption editor → reachable export controls → concise help and appropriate format notice.

**Copy examples:** “Add subtitle.” “Find words.” “Download SRT.” “Your edits stay in this tab until you download them.” Explain case behavior near replacement and label reading speed in words. A download-start notification must not be described as confirmed storage or cloud saving.

**SEO opportunity:** Subtitle editor, edit SRT/VTT text and timing, online caption editing. Make the H1 reflect both supported formats.

**Competitor comparison:** CaptionX exposes text/timing editing, scratch creation and exports in a familiar task interface. ToolSuite can distinguish itself through safer session handling, clearer validation and a more comfortable mobile working area. [CaptionX subtitle editor](https://caption-x.com/srt-editor)

**Priority:** P0 edited-session loss protection; P1 mobile export reach and first working screen; P2 advanced-control density and plain terminology.

### 11.5 Subtitle Sync Fixer

**Primary job:** Correct gradual timing drift using two caption moments whose correct video times the user knows.

**Current strengths:** Supports SRT/VTT; two reference points; searchable caption picking with manageable result pages; explicit correction step; input changes invalidate an old result; beginning/middle/end samples and correction indicators; warnings for consequential transformations. It does not falsely claim automatic audio recognition.

**Current weaknesses:** Four timestamp values plus caption selection are inherently more involved than a constant offset. Guidance is spread across controls and supporting content. Constant-delay alternative appears too late. Before correction, the outlined “Fix sync” action competes with a visually primary but disabled download. Mobile download can precede the preview. “Beginning/Middle/End” indicators refer to the reference span and may be mistaken for verified sync across the entire video. Timestamp entry on a phone needs clear punctuation examples.

**Unnecessary elements:** Large empty correction charts before there is a result; repetitive step narration; generic privacy/helper paragraphs around each reference.

**Missing useful elements:** A small initial fit check (“Same delay throughout?” versus “Gets further out of sync?”); one worked example of selecting early/late reference moments; progressive primary-action emphasis; summary/warnings before final download.

**Preview needed? YES.** A two-point transformation changes the time scale, not just a file label. Show meaningful early/late results and limitations. Without a video/audio reference, these remain timestamp checks, not proof of audiovisual accuracy.

| Required question | Audit answer / recommended behavior |
| --- | --- |
| A. Exact job | Correct approximately linear drift between two known moments |
| B. Minimum information | File, two source times and their correct target times |
| C. First thing | One-sentence scope and fit choice, then upload |
| D. Preview | Correction summary and sample resulting times |
| E. Above fold | Reference-point inputs; primary action becomes Fix sync when ready |
| F. Move below | Mathematical detail and extended troubleshooting |
| G. Remove/reduce | Empty results, duplicated guidance and overly broad “verified sync” cues |
| H. Primary action | Fix sync before a result; Download corrected subtitles afterward |
| I. Result reach | Preview/warnings followed immediately by download |
| J. Purpose-built? | Yes, but the two-point task needs a clearer decision sequence |

**Recommended page structure:** Scope/constant-delay shortcut → upload → early reference + late reference → Fix sync → correction summary and warnings → download/reset → explanation of limitations and relevant links.

**Copy examples:** “Fix subtitles that gradually go out of sync.” “Pick one subtitle near the start and one near the end. Enter when each should appear.” “This works for gradual drift, not missing or rearranged video sections.” Label reference-span indicators accurately.

**SEO opportunity:** Gradual subtitle drift, SRT/VTT sync, two-point correction. Do not imply all sync problems or automatic audio syncing.

**Competitor comparison:** No equivalent two-reference drift tool was identified in the inspected directory. CaptionX’s constant-offset workflow illustrates why ToolSuite should distinguish these two jobs early.

**Priority:** P1 task-fit guidance, action hierarchy and mobile verification order; P2 timestamp-entry polish.

### 11.6 Subtitle Overlap Fixer

**Primary job:** Find overlapping subtitle times, choose which conflicts to repair and how, then inspect and download the updated file.

**Current strengths:** Detection, issue selection, two repair strategies, timing visuals, remaining-conflict counts, undo and rechecking. SRT/VTT support and positive-duration safeguards are covered by tests. A no-overlap state is a useful success, without forcing an unnecessary download. Small-screen cards retain textual times when bars are hidden.

**Current weaknesses:** Repair controls/result actions can appear before issue review. Shortening an earlier subtitle and moving a later one have different reading/sync consequences, especially when changes cascade. “Minimum gap” helper copy can imply every gap is normalized; it applies to repaired conflicts. Valid partial results are downloadable but “fixed” can imply all overlaps are gone. “Show all N overlaps” changes the page size to 25 rather than literally showing every issue when N exceeds 25. Gap validation should connect the error directly to its field. Out-of-order files are rejected and directed toward editing, but the editor has no dedicated reorder control.

**Unnecessary elements:** A full unrelated subtitle preview, ornamental timeline headings, repeated repair explanations and a second set of broad related links.

**Missing useful elements:** Review-first order; precise strategy consequence; honest partial-result label/count; accurate disclosure/pagination labels; useful recovery guidance for unsupported ordering. Do not claim the editor can automatically sort subtitles.

**Preview needed? YES.** Targeted before/after timing and optional caption text help verify shortened durations or shifted captions. Mobile does not need the same bars if textual comparisons communicate the consequence.

| Required question | Audit answer / recommended behavior |
| --- | --- |
| A. Exact job | Resolve selected time conflicts with understood consequences |
| B. Minimum information | File, conflicts to include, repair strategy, optional repair gap |
| C. First thing | Upload; afterward conflict count and first issues |
| D. Preview | Issue-specific before/after timings, readable warning and context |
| E. Above fold | Conflict status and review/select access, then chosen repair method |
| F. Move below | Detailed strategy examples and broader subtitle guidance |
| G. Remove/reduce | Decorative copy, broad preview and duplicate related menus |
| H. Primary action | Fix selected overlaps, then Download updated subtitles |
| I. Result reach | Remaining count and warnings adjacent to download; undo nearby |
| J. Purpose-built? | Strongest repair-specific model; sequence and labels need refinement |

**Recommended page structure:** Upload → detected count → paginated review/selection → strategy + gap with consequence → repair → changed/remaining summary + issue checks → download/undo → help.

**Copy examples:** “Shorten the earlier subtitle” / “Move the later subtitle.” “Gap added when fixing selected overlaps.” “3 overlaps remain.” “Download updated subtitles.” For >25 issues, use accurate “Show 25 per page” or “Review more overlaps” wording with pagination.

**SEO opportunity:** Overlapping SRT/VTT subtitles, fix caption timing conflicts. “Cue collision” would be less helpful than the ordinary problem phrase.

**Competitor comparison:** No direct equivalent was identified in the inspected directory. ToolSuite can be meaningfully better at reviewable repair and honest remaining-issue reporting.

**Priority:** P1 accurate disclosure/partial-result labels and strategy warning placement; P1 field error association and recovery; P2 density.

### 11.7 SRT to VTT Converter

**Primary job:** Get a valid VTT file from an SRT file with preserved subtitle text and times.

**Current strengths:** This page already follows the right deterministic model: choose file → validate/convert → download. There is deliberately no cue preview. One strong Download VTT action, filename, direct reset, validation and conversion warnings. Source/session tests cover preservation and readiness.

**Current weaknesses:** Empty-state station heading, eyebrow and format badge repeat the page title. Loaded state repeats “validated,” “ready,” converted count and preservation checkmarks. A comma-to-period timestamp illustration remains inside the workspace despite not requiring a user decision. “No upload” in metadata conflicts with ordinary upload language, even though the file is processed locally. Some warnings appear after the download control rather than before it.

**Unnecessary elements:** Any large caption preview; repeated success checks; format syntax lesson in the primary work area.

**Missing useful elements:** Keep materially relevant warnings next to/before download; plain readable invalid-file guidance and clear supported-file limits. No extra convert button is needed because conversion already occurs on selection.

**Preview needed? NO.** This deterministic conversion needs validation and a useful result status, not an inspection panel.

| Required question | Audit answer / recommended behavior |
| --- | --- |
| A. Exact job | Convert one SRT to VTT |
| B. Minimum information | Valid SRT file only |
| C. First thing | Choose SRT file |
| D. Preview | No |
| E. Above fold | Upload initially; ready filename, warnings and Download VTT afterward |
| F. Move below | SRT versus VTT and timestamp punctuation explanation |
| G. Remove/reduce | Duplicate titles, decorative slogan and repeated preservation/status checks |
| H. Primary action | Download VTT |
| I. Result reach | Already direct; maintain this at 320px and with long filenames |
| J. Purpose-built? | Yes; use it as an example of restraint, not a universal tool template |

**Recommended page structure:** Short title/description → chooser → ready filename + meaningful warning if any → Download VTT → replace/reset → short format explanation below.

**Copy examples:** “Convert SRT subtitles to VTT.” “VTT ready.” “Your file is processed in your browser.” Use “subtitles” rather than “cues” for the count if retaining it.

**SEO opportunity:** Existing name/URL strongly match intent. Explain WebVTT once; avoid generating many thin converter articles or adding a pointless preview for content length.

**Competitor comparison:** CaptionX also makes conversion direct, with file selection and download rather than a large caption preview. ToolSuite’s larger supported limits and explicit local handling are useful differentiators if performance is verified. [CaptionX SRT to VTT](https://caption-x.com/srt-to-vtt)

**Priority:** P2 remove repetition and move syntax help below; P1 verify ready/error/download states at narrow widths. Preserve the no-preview decision.

## 12. Preview decisions

| Tool | Preview? | Smallest useful form | What not to add |
| --- | --- | --- | --- |
| SRT Timing Adjuster | YES | One or a few before/after times, affected-time warning | Large empty cue grid or mandatory video player |
| SRT Merger | YES | Join boundaries and resulting times | Whole merged transcript |
| SRT Splitter | YES | Output file manifest with count/ranges; optional boundary sample | Full text of every part |
| Subtitle Editor | YES | Editable captions are the inspection surface | Duplicate read-only preview |
| Subtitle Sync Fixer | YES | Reference correction summary and sample timestamps | Claims of audiovisual verification without a reference |
| Subtitle Overlap Fixer | YES | Selected issue before/after, remaining count and context | General full-file preview |
| SRT to VTT Converter | NO | Validation/ready status and material warnings | Cue preview, video preview or an extra confirmation step |

“YES” means a useful inspection surface, not a standard preview panel imposed on every page. The splitter manifest and editor working area should remain fundamentally different from the merger’s join view.

## 13. Click and interaction inventory

**Evidence key:** Confirmed = source/HTTP observation; historical = saved screenshot/QA evidence; pending = fresh browser interaction required. This inventory does not claim a live click-through.

| Element / interaction | Finding | Needed decision or verification |
| --- | --- | --- |
| Logo/home | Confirmed home link with accessible name; closes Tools menu | Pending keyboard/visual focus and editor unsaved exit |
| Tools summary | Native details click/keyboard activation; Escape handler returns focus; blur closes | Pending outside nonfocusable click, hover styling, Tab/Shift+Tab, screen reader state |
| Hover open | No automatic hover-open implementation found | Click-first is acceptable; hover must not be the only access method. Do not add accidental fly-out behavior merely for parity |
| Menu tool links | Real routes; names plus descriptions make the list tall; click closes | Short names and grouped real categories; verify menu is usable without nested scrolling at narrow widths |
| Header category shortcuts | Four empty category families elsewhere, two empty shortcuts visible; links reach fragments rather than tools | Remove empty shortcuts; link real hubs. Subtitle active state currently misses sync/overlap routes because it checks /tools/srt |
| Search opener | Closes menu, clears previous query, opens native modal and focuses input | Pending focus restoration, native Escape, backdrop, scrolling and mobile keyboard |
| Search matches | All query tokens must appear as literal substrings in name/description/category; no aliases/fuzzy search | Test “delay,” “combine,” “captions,” “drift,” supported formats and no-result recovery |
| Search result links | Direct registered tool links with name/category; modal closes | Pending result focus and route transition; avoid full-list live announcements after every keystroke |
| Theme | Accessible action name, system default, saved preference, cross-tab updates and pre-paint script | Tests pass for theme logic; pending all visible states in both modes and storage-disabled browser |
| Hero CTAs | Both currently active links; one library anchor and one featured tool | One primary “Explore Free Tools” to /tools |
| Hero play graphic | Static decoration inside a labeled video placeholder, not a functional player | Make future video visibly/playably real; while placeholder remains, avoid an apparent play action that does nothing |
| Popular/tool cards | Real tool links; homepage lists all seven | Curate four, with distinct View all tools destination; pending hover/focus affordance and full-card tap |
| Empty category cards | Noninteractive coming-soon articles on home; nav links still bring users to them | Do not present as available discovery paths; avoid teasing unshipped tasks in V1 navigation |
| FAQ disclosures | Native details/summary and keyboard support by structure | Pending focus ring, expanded spacing, touch targets and no excessive reopening/animation |
| Breadcrumb links | Valid homepage fragment targets and current-page text | Future directory/category routes; verify meaningful focus after navigation |
| Choose file | Button triggers hidden native file input; accepted extensions and limits are validated | Pending real picker, Cancel, same-file reselection, touch devices and non-ASCII filenames |
| Drop area | Handles file drags and validation; outer box is not a click-to-open button | Either keep clear button-only affordance or later make the zone consistently clickable. Do not imply its entire area opens the picker |
| Busy upload | Disabled chooser and blocked drops; request IDs protect stale reads | Pending rapid replace/reset and correct busy announcements. Large parses may still block the UI |
| Replace | Shared button changes label when loaded; editor has dirty confirmation | Verify old-file retention and filename after failed replacements for every tool |
| Reset / Start over | Invalidates pending reads and usually returns focus to chooser; editor has dirty confirmation | Pending confirmation focus/cancel and reset during reads. Use consistent wording where jobs are equivalent |
| Presets/mode buttons | Deterministic offset/gap presets and split modes; semantic controls | Pending selected-state readability beyond color, keyboard activation and error correction |
| Merger order/remove | Drag plus explicit up/down controls; native buttons support non-drag route | Pending drop target, first/last disabled boundaries, retained focus after removal and rapid repeated reorder |
| Editor text/times | Labeled native inputs, validation and undo/redo; sessions held in memory | Pending IME/RTL editing, multiline paste, undo semantics, errors, navigation protection and mobile keyboard |
| Editor add/delete | Meaningful editing actions; undo support | Pending focus after adding/deleting and no accidental double activation |
| Find/replace | Whole-file search/replacement; case behavior differs | Clarify scope and capitalization before replacement; pending undo and empty/not-found cases |
| Sync picker | Searchable captions with paging; manual edits invalidate old associations/results | Pending selecting off-page captions, reference order errors and clear action readiness |
| Overlap checkboxes | Selection controls protect excluded captions; changing selection after repair can reset result | Make selection-versus-applied result obvious; pending retained user understanding and Undo behavior |
| Overlap expansion | “Show all” sets a 25-item page size | Confirmed label mismatch for more than 25; fix label/behavior later and verify pagination |
| Download | Serializes current valid state to Blob, triggers native anchor, revokes object URL after delay | Pending actual filesystem output, filename/type/encoding, browser permission and post-download state. Notification means started, not confirmed saved |
| Disabled download | Generally tied to input/read/error/result validity, rather than decorative readiness | Pending every empty, invalid, busy and corrected state. Explain why unavailable; sync should emphasize Fix sync before download |
| Download errors | Shared fallback is a generic message; specific serialization context may be lost | Preserve useful recovery context in a later fix; avoid inventing success |
| Show more/details | Native disclosures used for joins, parts and advanced controls | Pending focus/order after expansion and correct counts/labels |
| Related tool links | Six same-category links per tool, plus extra contextual links on overlap page | Choose two or three useful next jobs; editor exits need protection |
| Footer | Real routes/fragments; empty families and registry duplication | Reduce to curated links and real support/legal pages; no dummy # links |
| Back to top | Existing valid #main-content target | Does not literally reach the header; test focus and decide clearer destination |
| Missing route | Framework 404 exists; /tools is presently one such route | Supply useful ToolSuite recovery; public directory must resolve |

No broken homepage fragment target was found in the inspected HTML. That does not make empty-category navigation useful. No signup/login/account controls exist in ToolSuite; those are future planning items, not dead current controls.

## 14. Responsive audit

### Evidence and width-specific assessment

Current CSS and existing screenshots were reviewed around **1440, 1024, 768, 390 and 320 pixels**. Historical screenshots include old homepage/tool states. Fresh rendering was blocked, so the table separates observed layouts from acceptance conditions still to verify.

| Width | Current CSS / historical evidence | Main usability concern | Fresh acceptance check |
| --- | --- | --- | --- |
| 1440 | Centered max-width 1160 layout; two-column hero and many workspaces; three-column tools. Historic light editor/overlap and homepage screenshots provide useful desktop evidence | Large top shell and long menu; splitter/timing download may visually precede verification; side panels can carry too much helper text | Main task is visible without hunting; header/menu fit; long names, result warnings and focus order remain readable |
| 1024 | Hero remains two columns above 900; reduced space per column; historical homepage screenshot inspected | Hero content and video compete; seven-tool menu descriptions increase height; modern header includes utilities not represented by every old screenshot | No cramped hero or accidental CTA wrapping; menu and search usable; working controls remain primary |
| 768 | Hero stacked below 900. Global mobile nav breakpoint is 760, so at 768 the desktop header remains. Editor has its own 768 breakpoint | Boundary mismatch is a risk: full header may be tight with search/theme; different components switch at different widths | Current header at 768 and 760/761; tool controls and keyboard focus cannot be clipped or hidden |
| 390 | Wrapped mobile nav below 760; video below hero; one-column popular tools at 420; some category tiles remain two columns above 360. Historical dark home, light sync and other narrow tool screenshots inspected | Multi-row header, tall title/badges, large upload area; editor export is static below 600; result inspection can follow download | Useful chooser visible on initial screen; after load, settings/action easy to reach; category/tool text readable; modal handles software keyboard |
| 320 | Content area about 288 with 16px side gutters; categories and split modes stack below 360; historical converter/editor/timing/overlap/splitter/merger examples inspected | Timestamp strings, small labels, many stacked controls and nested scroll regions; density matters even without overflow | No two-axis scrolling; long filenames/errors wrap; 44px targets retained; result warnings/action within a practical working sequence |

The converter’s existing ready-state QA records its button bottom at approximately 502px at 1440×900, 489px at 1024×900, 483px at 768×1024, 653px at 390×844 and 697px at 320×720. These are historical measurements, not this audit’s fresh measurements. At 320×720 the remaining space is small; real browser chrome and keyboard can alter usable height.

### Page-specific mobile concerns

- **Homepage:** Video stacks correctly but delays access to tools when the hero and placeholder are tall. Replace the seven-card “popular” directory with four real choices. At 390, two-column categories can be cramped; with only one released category, remove the problem rather than polishing five empty tiles.
- **Timing:** Compact the loaded upload area. Place the meaningful time-change check before the result action after stacking.
- **Merger:** Order arrows provide a touch alternative to drag. Long filenames and row actions need a real 320px test. Join previews must remain compact; an older narrow screenshot contains longer content than the current component.
- **Splitter:** Mode buttons stack at 320, increasing vertical height. Keep labels short and results/downloads together. Individual downloads should remain easy to associate with the correct filename.
- **Editor:** Nested list scrolling plus page scrolling makes reaching controls harder. Mobile export becomes nonsticky. Inputs at 14px are an iOS focus-zoom risk to verify; the issue is not proved by desktop-emulated screenshots. Do not solve action reach by covering the active text field or keyboard.
- **Sync:** Four timestamps need comfortable input and a visible correct-format example. Current mobile timestamp styling uses 16px, a useful distinction from the editor. Correction evidence should precede download.
- **Overlap:** Mobile hides visual timing bars while retaining text; that is sensible if before/after meaning remains clear. Give review, strategy and results an obvious order.
- **Converter:** Already small and purpose-built. Preserve direct action, remove repeated labels and verify material warnings do not push download into an unclear position.

### Accessibility and comfort

Current controls commonly enforce 44px minimum height, but helper text and some badges fall around 10–13px. A large button does not make its label or nearby explanation readable. Increase important helper text and reduce the number of labels before increasing every card’s height.

Native dialog, summary, button and input choices, focus styles, reduced-motion handling and live statuses are strengths. Existing theme contrast tests cover selected token pairs, not every rendered gradient, icon, disabled state or overlay. Required fresh checks include keyboard-only completion, screen-reader announcements, 200% zoom/reflow, focus visibility, color-independent error/selection cues and touch/keyboard interaction in both themes.

A useful fresh smoke matrix is all eight main pages in both themes at these five widths, with deeper task completion on 1440, 390 and 320. Test empty, loaded, error and result states; include modal/menu expansion and the onscreen keyboard. This is a launch verification task, not completed work in this audit.

## 15. Visual-system audit

Blue, white and orange is a suitable restrained direction. Current CSS already supports distinct dark surfaces, responsive grids, coherent rounded cards and recognizable product icons. A brand rebuild is unnecessary.

| Area | Current finding | Recommended direction |
| --- | --- | --- |
| Color balance | Navy text, white/light-blue surfaces, blue actions; orange is mostly a small accent | Keep blue for primary action and orange as a limited brand accent. Do not make every card a competing accent |
| Contrast | Theme tokens and tests show deliberate handling, with separate dark action/link shades | Verify real compositions, disabled text, icon strokes and warning colors in both themes; use readable labels rather than relying on color |
| Typography | System font stack avoids external font dependence; prominent headings; many small helper labels | Keep comfortable body text and reduce huge mobile tool headings. Reserve monospace for time values, not ordinary instructions |
| Spacing | Generous desktop cards; layered title/badge/stepper/upload spacing consumes mobile height | Reduce repeated shell space before the working surface. Keep generous space where editing or decisions require it |
| Section rhythm | Home repeatedly uses headline + paragraph + card grid with light backgrounds/glows | Shorten the page and vary rhythm around real content; do not add decorative sections merely for variety |
| Cards | Polished rounding, borders and soft shadows; some cards duplicate text/badges | Distinguish navigation cards from working panels. Dense discovery cards need less explanatory content |
| Icons | Consistent tiles, recognizable tool variants and coherent blue/orange family | Retain the set; icon alone must not carry a task label. Recheck similarity between timing/sync/overlap at small sizes |
| Gradient icon tiles | Current icon-tile styling is largely solid brand color with subtle inset/shadow treatment; homepage backgrounds contain gradients | Do not prescribe a gradient-tile rebuild based on a styling assumption. Prefer restrained treatment and legible silhouettes |
| Shadows | Soft card/hero/menu elevation already present | Use elevation to show layering, not to make every static surface compete |
| Backgrounds | Light radial glows and dark navy surfaces create a recognizable product feel | Reduce decorative intensity around dense editing work; tool content should dominate |
| Dark mode | Separate foreground/muted/surface/control tokens; local preference and prepaint initialization | Verify selected/disabled/error states, search dialog, controls and long sessions. Avoid replacing thoughtful tokens with simple color inversion |
| Consistency | Shared shell gives continuity; tool-specific styles support different jobs | Share button, field, status and type foundations. Preserve editor workspace, splitter manifest, merger joins and converter station as distinct layouts |

Historical screenshots look organized and coherent, with the main weakness being accumulated vertical space and repeated cards rather than obvious visual disorder. “Premium” here should come from accurate states, readable text, quiet hierarchy and reliable results.

## 16. Signup/login architecture — plan only

**Current state:** No authentication, database, account pages or protected tool routes were found. All seven tools work locally without an account. Preserve that access.

An account should solve a real returning-user problem: saved preferences, favorite tools, or later cloud projects. Requiring an account to convert or repair an ordinary local subtitle file would add friction with little present benefit.

| Architect for now, as decisions only | Wait until a real account feature is ready | Do not build for V1 |
| --- | --- | --- |
| Stable tool IDs, actual capabilities and processing mode in a coherent registry | Email signup/login and Google sign-in using a supported authentication service/library | Mandatory login before current file selection or download |
| Account-optional shell and routes; directory and tool URLs stay public | Email verification, recovery, session/logout behavior and account deletion appropriate to the chosen system | Custom password storage or a speculative homegrown auth system |
| Separate anonymous local preferences from future account preferences | A small account menu and an intelligible signed-in benefit | Empty dashboard with no useful persisted work |
| Explicit boundary between local file processing and later cloud processing | Favorites and preference sync if returning usage demonstrates value | Uploading files silently after login |
| Clear production/staging origin and return-URL policy | Server-validated entitlements for genuinely metered cloud tools | Billing, team roles and enterprise settings ahead of product demand |

Future entry flow: optional Sign in → Google or email choice → clear errors/verification/recovery → return to the intended destination. Preserve the anonymous route. Do not redirect away from an active unsaved editing session without handling that work.

Save small preferences first: theme, favorite categories, useful tool defaults. File content, editing drafts and history are separate features with explicit retention and storage decisions. Do not infer consent to cloud storage from account creation. Email flows must not suggest that a password was saved when a request failed.

No authentication provider, package, account or schema was selected or configured in this audit.

## 17. Optional onboarding/personalization — plan only

A single optional step could ask **“What kind of work do you usually do?”** with broad choices:

- Content & video
- Design & images
- Marketing & social media
- Office & documents
- Development / technical work
- Personal use
- Something else

Allow more than one selection if people span roles, **Skip for now**, and an optional text field only for Something else. Never require job title, employer, marketing consent or a typed answer to finish onboarding. Explain the direct benefit: “We’ll show useful tools first.” Allow preferences to be changed later.

Personalization should reorder recommended tools and categories, not hide tools or change their capabilities. Keep All Tools complete and searchable. Use a local anonymous preference if it becomes useful before accounts; do not implement that now.

**Present value is low:** all seven tools are subtitles. A “Design & images” selection cannot yield useful image tools yet. Delay this step until multiple released categories exist and recommendation quality can be measured. With only subtitle tools, a task chooser (“edit text,” “fix timing,” “convert a file”) is more helpful than occupational onboarding.

Public CaptionX onboarding could not be inspected safely without entering an account flow. The recommendation above is based on ToolSuite’s broader product purpose, not an observed competitor onboarding design.

## 18. Monetization and usage limits — plan only

Keep inexpensive, browser-local tools free and available without signup. Existing limits should reflect reliability and device memory, not an artificial paid boundary.

| Future capability | Potential paid value / honest limit | When justified |
| --- | --- | --- |
| AI transcription, translation or cleanup | Metered audio/video duration, credits and clear estimated usage | Actual provider/API cost and quality are known |
| Cloud rendering or conversion | Larger files, processing duration, queue priority | Reliable storage/compute costs and capacity exist |
| Batch work | Many files, preset reuse and unattended processing | A real high-volume workflow benefits; local batch convenience need not automatically be paid |
| Saved projects/history | Durable storage, version recovery and cross-device access | Retention/deletion/security practices are defined |
| Team work | Shared projects, access controls and collaboration | Customers need it; not a V1 assumption |
| Larger local files | Higher capacity if engineering/device behavior supports it | Do not charge simply to lift a deliberately low cap on a cheap browser operation |
| Current converter/timing/editor utilities | Free basic use | No account quota or conversion count paywall recommended |

Measure demand before designing tiers. Show limits before users invest in a task. Future cloud tools should disclose whether files leave the device, cost/credits before submission, and what happens after errors. Do not deduct usage for a failed job without a transparent policy.

Architecture can eventually separate capability, processing mode, technical safety limits and paid entitlement. Do not add subscription checkout, usage meters, pricing pages with invented plans or a billing database now.

## 19. Public V1 launch readiness

This is a readiness assessment, not a second independent priority list. The consolidated plan in section 21 ranks the work.

| Area | Current status | Evidence / remaining requirement |
| --- | --- | --- |
| Core functional coverage | Strong automated foundation | 392 tests pass; no fresh browser upload/download sign-off |
| Correct expectations | Needs correction | Merger timing assurance; drift versus constant delay; splitter time reference; partial overlap repair wording |
| Edited-work safety | Missing across exits | Dirty reset/replace protected, navigation/refresh not protected |
| Discovery | Incomplete | No dedicated /tools or category routes; empty categories promoted |
| Homepage | Overextended | Two hero CTAs, all seven tools, future promises and repeated trust/help sections |
| Mobile completion | Not signed off | Historical screenshots and CSS reviewed; fresh keyboard/touch/file flows pending |
| Accessibility | Good foundations, incomplete verification | Native controls, skip/focus/live regions and reduced motion; real keyboard/screen-reader/zoom checks pending |
| Support/basic identity | Missing pages | About, Help/contact route, confirmed operator identity |
| Privacy/Terms | Missing pages | Explain actual file handling, theme storage, hosting/logs and any eventual analytics. Draft for actual operator practices; this report does not determine jurisdiction-specific legal obligations |
| Errors | Good input validation; generic exceptional failure path | File/format/limit errors exist; verify retained old input and result invalidation. No app-specific error boundary page found |
| 404 | Framework fallback exists | A branded recovery with All Tools/Home/Help would be useful; missing directory is not excused by a working fallback |
| Performance | Not freshly measured | Local parsing/serialization is on the main thread; test 10 MB/10,000-caption and 50 MB merger limits on realistic phones |
| SEO/crawl | Incomplete | Titles/H1s exist; domain/canonical/robots/sitemap/category destinations missing |
| Site/social identity | Incomplete | Starter favicon conflict; no OG/Twitter sharing setup |
| Analytics | No instrumentation found | Define lightweight, privacy-conscious completion/failure events; no file text or identifying filename capture |
| Production build/runtime | Pending | Typecheck/lint/tests pass; no fresh production build/start in this audit |
| Hosting/domain | Undecided/unverified | No actual Hostinger plan/account/domain setup inspected |
| Repository/release process | Not initialized locally | Git command reports this directory is not a repository |
| Maintenance | Documentation behind product | README describes first-tool setup rather than all seven tools |

### Error and recovery expectations

Preserve correct results and clear state when users try an unsupported or malformed replacement. Say explicitly whether the previous file is still active. A disabled button should have a nearby reason; an error should identify the relevant control or file and provide a next step.

Tool validation can remain strict. Do not silently “repair” malformed data without explaining it. For unexpected exceptions, a useful retry/reset and support route is more valuable than a technical stack trace. A missing JavaScript capability should not leave an unexplained empty working surface.

### Performance and analytics readiness

No Lighthouse/Core Web Vitals score was produced; development HTML size or older screenshots are not production measurements. Use the future production build to inspect bundle cost, initial load, layout shift and interaction responsiveness. Avoid importing every tool implementation into the directory/search; the current registry-based linking is the right separation.

Measure successful task completion rather than marketing clicks alone. Candidate events: tool opened, local input accepted/rejected (coarse reason), result ready, download initiated, search with no results. Never log subtitle contents, user files, raw support uploads or full filenames. Search-query collection needs a considered privacy decision; even queries can contain personal text. There is no reason to add session replay inside file editors by default.

Analytics is valuable refinement, not a reason to delay a sound free V1 indefinitely. Establish a support/error-feedback path even if tracking is deferred.

### Domain and deployed checks

Before public sign-off, confirm HTTPS, a chosen primary hostname, redirects from alternate hosts, correct absolute metadata, indexable production and nonindexable staging. Verify direct deep links, refresh on each tool route, downloadable files, static assets, 404 status, robots and sitemap on the actual host. Confirm no local development indicators or source error output appear in production.

## 20. Deployment readiness: VS Code → Git → GitHub → Hostinger → domain

**No deployment or repository changes were performed.**

### Project/runtime facts

| Item | Current project |
| --- | --- |
| Framework | Next.js 16.3.8 App Router; React/React DOM 19.2.8 |
| Processing | Current tools operate in the browser; no cloud APIs/backend/auth found |
| Dependency installation for a later clean checkout | npm ci, using committed package-lock.json |
| Development | npm run dev → next dev |
| Production build | npm run build → next build |
| Production start | npm run start → next start |
| Checks | npm run lint; npm run typecheck; npm test |
| Local runtime observed | Node 24.21.0 |
| Installed Next engine requirement | Node >=20.9.0 |
| Test/runtime note | Tests import TypeScript via native stripping; project guidance supports Node 22.18+ or 24 |
| Recommended common runtime | Node 24, pinned consistently for local checks, CI/build and production |
| next.config.ts | Default/empty; no static export or standalone setting |
| Git status | git status reports “not a git repository” in this project |
| Existing build files | .next present, but not proof of a fresh reproducible release |
| Environment use | No application process.env usage found; no environment file observed in root listing |

The application is suitable for Git. It is not already connected to a repository in the inspected workspace, and no GitHub remote/branch protections/deployment pipeline were available to audit.

### Git and ignore readiness

Current .gitignore already excludes node_modules, .next, out/build, coverage, debug logs, .env*, .vercel, *.pem, TypeScript build info and next-env.d.ts. That is a useful base.

Commit application source, public brand assets, dependency manifests and lockfile, configuration, tests and accurate documentation. Keep AGENTS.md as instructed; Next’s generated rules should not be removed merely to shrink a diff.

Review artifacts before the initial commit. This workspace contains substantial screenshots, generated outputs, fixtures and QA reports. Curate deliberate regression fixtures and documentation; ignore bulky transient evidence and any real user files. The audit report can be retained deliberately. Do not blindly publish the entire artifacts tree.

If future setup needs .env.example, add a deliberate ignore exception and include **names/placeholders only**. The current .env* pattern would ignore it. Never commit actual provider credentials, OAuth secrets, database passwords, host keys, GitHub tokens, private certificates or exported browser/account sessions. No credentials are reproduced here. Source/environment inspection in this session is not a complete secret-scanning certification.

### Hostinger route

Hostinger’s current official guide lists Next.js support for managed Node.js web apps on Business Web Hosting and Cloud plans, GitHub-based automatic builds/deployments, and Node versions including 24. VPS is also possible but requires manual operations. The user’s actual plan was not inspected. [Hostinger Node.js deployment guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)

**Recommended eventual route:** use a compatible managed Node.js plan and its Next.js deployment settings, with Node 24, the repository root, build script and production start configuration validated in that environment. Do not assume generic static-file hosting runs the current next start project. Do not run next dev as the public server.

A static-export route is a possible architectural alternative because current tools are client-local and routes are fixed, **but it is not configured or proven**. It would require the installed Next guide, output configuration, a new build and verification of deep links, metadata routes and host routing. Future server auth/cloud features change that tradeoff. Do not change deployment architecture merely to obtain a cheaper-looking upload path.

If a VPS is chosen, the operator also owns process supervision, proxy/TLS, updates, logs and recovery. A managed path is the simpler default for the requested VS Code/GitHub workflow.

### Proposed later release sequence

1. Finish the approved product fixes and update README for seven tools, file handling and the chosen runtime.
2. Review files/ignores and credentials, initialize Git, commit a clean project, create/connect the intended GitHub repository.
3. Pin Node and run clean-checkout install, lint, typecheck, tests and production build. Resolve warnings against the **installed** Next 16.3.8 documentation.
4. Select the compatible Hostinger plan and configure its Next build/runtime. Set any actual server secrets in the host environment, never a client-exposed variable.
5. Deploy to a review/staging destination, verify production behavior and the full seven-tool flow, then connect the custom domain and metadata origin.
6. Review redirects, indexing, social previews, deep-link refreshes, generated downloads and rollback/redeployment procedure before promoting public V1.

These commands/actions are a plan only. They were not run where they would install dependencies, write application/build files, initialize Git or deploy.

NEXT_PUBLIC variables are compiled into browser-visible code and must never contain secrets. Current local tools need no secret-bearing service integration. Future OAuth/API/billing configuration should be introduced only when that feature is built.

## 21. One prioritized action plan

Priorities represent user impact and launch dependence:

- **P0 — Must fix before public launch:** loss of work, misleading result expectations, and unverified production completion.
- **P1 — Important before launch:** discovery, practical mobile use, trust/support and SEO identity.
- **P2 — Valuable refinement:** density, editorial polish and measured optimization.
- **P3 — Later/future:** accounts, personalization, monetization and new categories.

The rows below consolidate the findings; do not treat every suggestion elsewhere as a separate equal-priority project.

| Order / ID | Priority | Consolidated action | Acceptance condition |
| --- | --- | --- | --- |
| 1 / P0-A | P0 | Protect edited subtitle sessions across relevant exits | Dirty reset/replace, internal navigation and refresh/close are handled appropriately; Cancel preserves work; no claim of persisted/cloud saving |
| 2 / P0-B | P0 | Correct merger timing assurance and expose the existing assumption | Header/meta no longer promise inferred video alignment; added-gap/lead-in/trailing-duration behavior is clear before download; example demonstrates nonzero source lead-in |
| 3 / P0-C | P0 | Obtain fresh end-to-end V1 sign-off | Each tool completes chooser→valid input→task→actual downloaded/reopened output; invalid/replacement/reset/stale-result states checked; desktop and 390/320 mobile in both themes; keyboard task completion and meaningful warnings verified |
| 4 / P0-D | P0 | Prove a reproducible production release on the chosen host | Clean-checkout checks/build/start pass under pinned Node; compatible Hostinger plan selected; deep routes/downloads/TLS/error behavior verified; repository excludes secrets; rollback known. Deployment remains a separately authorized future task |
| 5 / P1-A | P1 | Create durable discovery and simplify navigation | /tools and one Subtitle Tools hub; all seven direct links/search/concise groups; empty categories removed from discovery; short menu labels, accurate active states and comfortable mobile menu |
| 6 / P1-B | P1 | Refocus the homepage around immediate use | Literal SEO heading, one Explore Free Tools CTA, four curated tools + View all tools, correct 16:9 demonstration order, shorter real-capability sections and no empty roadmap grid |
| 7 / P1-C | P1 | Fix timing/review clarity where it changes user decisions | Split mode/reset/boundary behavior explained; drift fit and progressive action clear; overlap partial-result/gap/expansion labels accurate; timing clamp interoperability assessed and disclosed. Do not impose one preview template |
| 8 / P1-D | P1 | Make working controls/results comfortable on mobile | Loaded upload states compact; editor export reachable; meaningful checks/warnings before download; inputs/helper text/tap targets/focus/nested scrolling verified across five widths |
| 9 / P1-E | P1 | Add truthful basic trust and recovery destinations | About, Help/contact, Privacy and appropriate Terms; clear operator/file-handling/storage statements; useful recovery for missing routes and unexpected failures |
| 10 / P1-F | P1 | Complete crawl and sharing identity | Production origin/self-canonicals, robots/sitemap, useful home/tool metadata, real breadcrumb destinations, consistent favicon and OG/Twitter image/metadata; staging indexing controlled |
| 11 / P2-A | P2 | Reduce repetition without weakening warnings | Short menu/card copy; appropriate current tool names; duplicate badges/status/privacy/how-to blocks reduced; two or three related jobs; converter format lesson below tool |
| 12 / P2-B | P2 | Refine the visual system and measured performance | Readable helper text, restrained shadows/glows, verified full-state dark contrast; profile near-limit local processing and optimize only demonstrated bottlenecks |
| 13 / P2-C | P2 | Add feedback and lightweight measurement | Clear support channel and completion/failure/search metrics designed around actual privacy practices; no caption/file contents collected |
| 14 / P3-A | P3 | Introduce accounts only alongside returning-user value | Optional email/Google access, preference/favorite benefit, safe sessions/recovery; anonymous current tools retained |
| 15 / P3-B | P3 | Add personalization, paid cloud capabilities and categories when justified | Multiple real categories before optional onboarding; measured cloud/API/storage value before limits/plans; no artificial local-tool paywall |

Dependency order: safety/expectations → discovery/home decisions → tool-specific clarity/mobile → trust/SEO → release verification. Verification planning starts early, with final P0-C/P0-D sign-off after approved changes. P2 polish should not postpone basic safe completion; P3 is outside V1 implementation scope.

**Review decisions represented by this plan:** use four curated homepage tools; publish one real category; keep tools free and anonymous; preserve distinct workspaces; use meaningful previews only; prefer a managed Node Hostinger route unless an explicit later static-export decision is made.

## 22. Evidence map and audit boundaries

### Local source references

Paths are relative to this report. These are inspection references, not modified files.

| Finding area | Main sources |
| --- | --- |
| Homepage and section order | [Homepage](../src/app/page.tsx), [video placeholder](../src/components/home/hero-video-placeholder.tsx), [FAQ](../src/components/home/home-faq.tsx), [featured example](../src/components/home/featured-srt.tsx) |
| Registry, categories, search and related tools | [Tool registry](../src/lib/tools.ts) |
| Global navigation/theme/footer | [Header](../src/components/site/header.tsx), [theme toggle](../src/components/site/theme-toggle.tsx), [theme logic](../src/lib/theme.ts), [footer](../src/components/site/footer.tsx) |
| Metadata/site shell | [Root layout](../src/app/layout.tsx), individual tool page metadata under src/app/tools/, src/app/favicon.ico, public/brand.svg |
| Shared interaction/a11y | [Tool layout](../src/components/tools/tool-layout.tsx), [upload](../src/components/tools/file-upload.tsx), [download](../src/components/tools/download-button.tsx), [workflow status](../src/components/tools/workflow-steps.tsx) |
| Timing adjustment | [Workspace](../src/features/srt-timing-adjuster/srt-timing-adjuster.tsx), [offset controls](../src/features/srt-timing-adjuster/offset-control.tsx), [SRT logic](../src/lib/srt.ts) |
| Merging | [Workspace](../src/features/srt-merger/srt-merger.tsx), [join preview](../src/features/srt-merger/merge-preview.tsx), [merge logic](../src/lib/srt-merge.ts), [page/caveat](../src/app/tools/srt-merger/page.tsx) |
| Splitting | [Workspace](../src/features/srt-splitter/srt-splitter.tsx), [results](../src/features/srt-splitter/split-results.tsx), [split logic](../src/lib/srt-split.ts) |
| Editing | [Workspace](../src/features/srt-editor/srt-editor.tsx), [cue editor](../src/features/srt-editor/cue-editor.tsx), [export controls](../src/features/srt-editor/export-controls.tsx), [session](../src/features/srt-editor/editor-session.ts) |
| Drift correction | [Workspace](../src/features/subtitle-sync-fixer/subtitle-sync-fixer.tsx), [reference control](../src/features/subtitle-sync-fixer/sync-point-control.tsx), [sync logic](../src/lib/subtitle-sync.ts) |
| Overlap repair | [Workspace](../src/features/subtitle-overlap-fixer/subtitle-overlap-fixer.tsx), [issue list](../src/features/subtitle-overlap-fixer/overlap-issue-list.tsx), [repair logic](../src/lib/subtitle-overlap.ts) |
| Format conversion | [Workspace](../src/features/srt-to-vtt/srt-to-vtt.tsx), [conversion logic](../src/lib/srt-to-vtt.ts) |
| Visual/responsive rules | [Global CSS](../src/app/globals.css), tool-specific conversion/sync/overlap CSS, [icon tiles](../src/components/ui/icon-tile.tsx) |
| Release setup | [package.json](../package.json), [Next config](../next.config.ts), [.gitignore](../.gitignore), [README](../README.md), [AGENTS.md](../AGENTS.md) |

Historical screenshot/QA evidence was selected from artifacts/tool-suite-dark-mode, tool-suite-icons, tool-suite-srt-editor, tool-suite-srt-merger, tool-suite-srt-splitter, tool-suite-srt-to-vtt, tool-suite-subtitle-sync-fixer and tool-suite-subtitle-overlap-fixer. Saved evidence is useful for diagnosing hierarchy; it is not a replacement for a current browser pass.

### What is verified versus outstanding

**Verified in this audit:** seven-tool inventory and source implementation; local route/metadata/heading/fragment responses; missing directory/robots/sitemap routes; source-level interaction behaviors and limitations; existing ICO identity; lint/typecheck/tests; current public documentation and extracted competitor content.

**Outstanding:** fresh live click/focus/hover/touch/upload/download tests; current screenshots at all five widths; production build/runtime; actual Hostinger plan and domain; browser performance; exact public search rankings/volume; authenticated competitor onboarding; account/billing architecture implementation.

**Change boundary:** The sole intentional project addition is this audit report. No application/tool logic, UI, configuration or dependency files were edited. No recommendations were implemented.

