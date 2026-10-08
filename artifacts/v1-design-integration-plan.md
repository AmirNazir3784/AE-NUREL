# ToolSuite final V1 design and product integration plan

**Date:** 8 October 2026  
**Status:** Planning only. This document specifies later implementation; it does not implement or authorize deployment.  
**Sources read completely:** [Boss-approved HTML reference](../references/AENural-design-reference.html) and [V1 audit](v1-site-audit.md).  
**Product:** Seven released, free, browser-local subtitle tools. No account required.

## Contents

- [1. Executive design/product strategy](#1-executive-designproduct-strategy)
- [2. Design tokens extracted and adapted from the reference](#2-design-tokens-extracted-and-adapted-from-the-reference)
- [3. What will be adopted from the reference](#3-what-will-be-adopted-from-the-reference)
- [4. What must not be copied, and conflicts to resolve](#4-what-must-not-be-copied-and-conflicts-to-resolve)
- [5. Homepage final structure](#5-homepage-final-structure)
- [6. Header, mega-menu and mobile navigation](#6-header-mega-menu-and-mobile-navigation)
- [7. Premium /tools directory](#7-premium-tools-directory)
- [8. /tools/subtitle-tools category page](#8-toolssubtitle-tools-category-page)
- [9. Footer and support destinations](#9-footer-and-support-destinations)
- [10. Compact shared tool-page shell](#10-compact-shared-tool-page-shell)
- [11. Individual implementation plans for all seven tools](#11-individual-implementation-plans-for-all-seven-tools)
- [12. Preview/inspection contract](#12-previewinspection-contract)
- [13. SEO, content and wording integration](#13-seo-content-and-wording-integration)
- [14. P0/P1 product fixes incorporated into the plan](#14-p0p1-product-fixes-incorporated-into-the-plan)
- [15. Intentional dark-mode adaptation](#15-intentional-dark-mode-adaptation)
- [16. Accessibility and responsive acceptance](#16-accessibility-and-responsive-acceptance)
- [17. Security/privacy and future-account boundaries](#17-securityprivacy-and-future-account-boundaries)
- [18. Controlled implementation phases](#18-controlled-implementation-phases)
- [19. Exact first implementation phase recommendation](#19-exact-first-implementation-phase-recommendation)
- [20. Acceptance checklist before moving to Phase 2](#20-acceptance-checklist-before-moving-to-phase-2)

## 1. Executive design/product strategy

Adopt the boss reference’s **orange actions, teal supporting accents, white/light green-gray surfaces, geometric headings, comfortable body text, dark neutral navigation and restrained elevation**. Replace the old blue-led palette. Preserve ToolSuite’s name, actual capabilities, routes, validation, transformation functions and working result/download behavior.

The reference is a visual source, not a product specification or production codebase. ToolSuite’s information architecture comes from the audit and the actual seven-tool inventory. The working tool must dominate each page.

The recommended integration direction is:

- **Discover:** one clear homepage CTA, four curated tools, a complete /tools directory and one real Subtitle Tools category.
- **Understand:** ordinary task language, concise supported-format information and material limitations at the decision point.
- **Work:** compact shared shell with a distinct interface for each tool.
- **Verify:** inspection only where it changes a decision; no SRT-to-VTT preview.
- **Finish:** obvious current-result download, useful errors and no loss of edited work through ordinary site navigation.

### Authority and conflict resolution

| Source | Governs | Resolution |
| --- | --- | --- |
| Boss-approved reference | Visual direction, typography feel, spacing, hierarchy, component finish | Orange/teal/light replaces the audit’s older blue/orange visual recommendation |
| V1 audit | Product problems, priorities, discovery, tool UX, SEO, trust and launch gaps | Keep its P0/P1 priorities and purpose-built workflows |
| Existing working logic/tests | Accepted files, transformations, validation, sequencing and output correctness | Styling must not replace algorithms or silently change defaults/limits |
| Accessibility and truthful product rules | Usable interactions, contrast, honest content | Adapt reference details when they conflict with accessibility or ToolSuite’s real product |

The reference’s initial wrapper includes another document/head/body around the actual prototype. Its inline go() script switches hidden page sections; some anchors have no href, cards are clickable divs, and the Tools menu opens through hover CSS. None of that should enter the Next.js app.

The reference was examined through its complete markup, CSS and scripts. This planning task does not claim a fresh rendered-reference/browser QA pass. The audit’s historical screenshots and 392-test result remain audit evidence, not new results from this session.

### Fixed V1 boundaries

Keep all seven tool URLs. Publish no empty Video/Image/Audio/Creator hubs. Add no auth, pricing, community, testimonials, blog filler, new tools, quotas or subscriptions. Current limits remain technical safeguards, not paywalls.

Do not make every tool a two-column upload/preview template. Share visual primitives and basic shell semantics, not the decision sequence.

## 2. Design tokens extracted and adapted from the reference

### 2.1 Token architecture

Use three layers within the existing CSS system:

1. **Reference palette:** orange, teal, green-gray neutrals and dark neutral shades.
2. **Semantic tokens:** page, raised surface, text, action, link, border, focus and feedback. Components consume roles rather than raw colors.
3. **Component rules:** buttons, icon tiles, fields, navigation disclosures, tool cards and workspaces use those roles with consistent sizes and states.

Keep existing CSS variable names temporarily where required by current components and tests; map them to the new roles. Do not leave a blue/orange legacy palette running alongside a disconnected new palette. Existing class names containing “blue” may initially map to teal; rename presentational names later only if useful, without changing tool IDs or icons.

### 2.2 Light palette and intentional accent use

These are implementation starting values, grounded in the reference. Final combinations must pass rendered-state checks.

| Token role | Proposed value | Reference relationship and ToolSuite use |
| --- | --- | --- |
| Page | #FFFFFF | Reference bg; clean working surface |
| Alternate page band | #F6F8F8 | Reference bg-2; discovery/help/footing rhythm |
| Raised panel | #FFFFFF | Reference panel; menus, cards and workspaces |
| Soft panel | #EEF3F2 | Reference panel-2; icon wells and quiet secondary areas |
| Primary text | #14201F | Reference text; dark neutral with a subtle green cast |
| Supporting text | #5C6B69 | Reference muted; paragraphs and meaningful helpers |
| Decorative faint | #8A9794 | Reference faint; do not use for essential small labels |
| Decorative border | #E6ECEA | Reference line; section separators and nonessential card edges |
| Strong decorative border | #D4DDDA | Reference line-strong; raised-panel edge |
| Field/control boundary | #6F8781 | Added accessible control role; do not rely on the much lighter decorative border for a field’s only boundary |
| Primary action fill | #E07B1F | Reference orange; the action the user should take now |
| Primary hover/border | #C9661A | Reference orange-soft; deeper hover and visible edge |
| Action text | #160C02 | Reference button text; dark lettering, never white on the base orange |
| Orange inline link | #9B4A0C | Adapted darker shade for ordinary text links on light surfaces; do not use base orange for small text |
| Teal accent | #1E8676 | Reference teal; icons/supporting emphasis |
| Teal readable text/focus | #15766A | Reference teal-soft; local/free/help wording and light-surface focus |
| Teal wash | #EAF4F0 | Quiet trust/icon/category background |
| Navigation background | #121918 | Adapted dark neutral; applies in both light and dark themes |
| Navigation text / muted | #F1F7F4 / #D5E2DD | Dedicated on-dark roles; do not inherit light-page text tokens |
| Navigation divider | #405650 | Deliberate separation on dark navigation |

**Orange:** one dominant action at the current step. Hero Explore Free Tools, ready downloads and repair actions can use orange. Avoid orange strokes on every card, headings that compete with buttons, or decorative “Pro” coding.

**Teal:** local processing, quiet support links, icon wells, selection and trustworthy factual context. It does not mean every free tool needs a FREE badge. All current tools are free; say that once in a useful place.

**Neutral:** most text, surfaces, navigation and editor working space. In a repair screen, warning/error meaning comes from feedback tokens and words, not brand-color decoration.

### 2.3 Contrast decisions

Calculated opaque-color pairs from the proposed tokens:

| Pair | Approximate contrast | Decision |
| --- | --- | --- |
| #160C02 text on #E07B1F action | 6.46:1 | Appropriate for normal button text |
| #160C02 text on #C9661A hover | 4.96:1 | Preserve dark text on hover |
| White on #E07B1F | 2.99:1 | Reject for ordinary button text |
| #5C6B69 on white | 5.58:1 | Meaningful supporting text |
| Reference #8A9794 on white | 3.03:1 | Reject for essential 12–14px labels/footer links |
| #15766A on #EEF3F2 | 4.89:1 | Readable teal supporting labels |
| #6F8781 field border on white | 3.85:1 | Stronger standalone control boundary |

These calculations are not full accessibility certification. Blended gradients, focus rings, disabled controls, icon boundaries and real compositions still need testing. An orange button’s edge can use the deeper border shade because the base fill against white is close to 3:1.

### 2.4 Typography

**Preferred family pairing:** Sora for headings/short emphasis; Inter for body, fields, navigation and sustained editing. This follows the reference’s feel without using Sora on every small operational label.

Use built-in next/font with verified, licensed, self-hosted font files in the later implementation. Recommended final route: next/font/local with a limited Latin Sora and Inter variable asset, preserved license files, system fallback for unsupported glyphs and tested Arabic/RTL caption rendering. No browser request to Google Fonts. Font acquisition is later work; no font files or dependencies are added now.

If verified font assets are unavailable when Phase 1 begins, use a declared system fallback, document the typography acceptance gap and resolve it before calling the approved visual foundation complete. Do not silently fail a production build by depending on an unrestricted build-time font download.

| Role | Desktop target | Mobile target | Component responsibility |
| --- | --- | --- | --- |
| Homepage H1 | 48–56px, 700, line-height about 1.1 | 32–38px; 30–32px at 320 if needed | Explains current offer; no oversized 67px prototype slogan |
| Directory/category H1 | 36–42px | 28–32px | Short and readable above search/tools |
| Tool H1 | 30–36px | 24–28px | Compact working-page introduction |
| Section H2 | 28–34px | 24–28px | Discovery/help hierarchy |
| Card H3 | 16–18px, 600 | 16–18px | Short tool name; line-height about 1.3 |
| Body | 16px, line-height 1.55–1.65 | 16px | Comfortable reading |
| Supporting/help | 14–15px | 14–15px | No 10px essential badges or warnings |
| Field text | 16px | At least 16px | Comfortable input and mobile focus |
| Button/nav text | 14–16px, 500/600 | 14–16px | No shrinking navigation to fit more items |
| Timestamp | 14–16px monospace with tabular figures | 16px inputs | Prevent wrapping within a value; allow surrounding layout to reflow |

Do not globally apply heading line-height 1.1 to long help headings or caption text. Do not uppercase whole control labels. Tiny reference section labels can become modest 12–13px decorative headings, never the only instruction.

### 2.5 Geometry, spacing and surfaces

| Foundation | Starting scale | How components use it |
| --- | --- | --- |
| Spacing | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px | 4/8 inside label/icon groups; 12/16 field groups; 20/24 panels; 32/48 section internals |
| Content width | 1200px outer maximum | Reference width adopted; desktop gutters 24px minimum, mobile 16px |
| Reading width | 62–68 characters | FAQ, About, Privacy and help; avoid full-width prose |
| Tool width | Tool-dependent within 1200px | Converter approximately 720px; timing 880px; merger/splitter 1040px; editor/repair can use full width |
| Section spacing | 64–80px desktop; 40–48px mobile | Reference rhythm adapted to a shorter ToolSuite homepage |
| Tool top/workspace spacing | 20–32px desktop; 16–24px mobile | A working page should not inherit 80px marketing bands |
| Radius | 8px small, 10–12px controls, 14–16px cards/panels, 18–20px media, pill only for small tags | One scale rather than arbitrary rounded boxes |
| Borders | 1px decorative; 1–1.5px control | Separate layout decoration from usable controls |
| Shadows | Quiet card 0 8px 24px rgba(20,32,31,.04); floating menu 0 24px 64px rgba(20,32,31,.16) | Flat working panels; elevation primarily communicates layering |
| Motion | 120–180ms color/border; optional 1–2px discovery-card lift | No moving caption editors or required entrance animations; reduced motion removes movement |

Do not hide horizontal overflow to mask sizing defects, as the reference body does. Fix the layout and preserve readable reflow.

### 2.6 Reusable component contracts

| Primitive/component | ToolSuite contract |
| --- | --- |
| Buttons | Orange primary, neutral outlined secondary, readable text action, distinct destructive styling. At least 44px target. Preserve disabled/busy/error logic |
| Fields | Visible label, 16px input, meaningful hint/error association; teal focus on light, light-teal focus on dark. Errors use words/icons and aria-invalid |
| StatusMessage | Preserve error alert and nonerror status semantics. Separate info, success, warning and error tokens. Do not restyle all feedback as teal trust |
| IconTile / ToolIcon | Keep existing recognizable product icon shapes. 32px menu well, 38–40px card well, compact 36–40px tool header; neutral/teal wash. No gradient required |
| Discovery ToolCard | Real whole-card link, icon, short name, one concise task sentence; optional subtle arrow. No nested CTA/link, stacked badges or FREE ribbon |
| CategoryLink/Card | Only real category; category name/count and concise scope. One compact V1 subtitle row, not a grid of empty families |
| SiteHeader | Dark neutral premium navigation with dedicated on-dark text, accessible disclosure and actual routes |
| ToolsDisclosure | Two-column desktop grouping; short names, icon wells, divider/footer directory link. Click/keyboard, not hover-only |
| SearchDialog / ToolDirectory | Share registry search behavior; native modal for header search, in-page input for directory. Static tool links remain available |
| FAQ | Native details/summary, subtle divider, short answer, decorative plus/chevron. No max-height clipping script |
| SiteFooter | Light alternate surface/dark-theme equivalent, brand plus Tools/Help/Legal columns; fewer real links |
| ToolLayout / ToolHeader | Breadcrumb, compact H1, one task sentence and workspace slot; no forced stepper/preview |
| FileUpload | Preserve validation/read callbacks; clear Choose file action and drag support; compact loaded state |
| DownloadButton | Preserve serialization and Blob behavior; styling only in foundation pass. “Download started,” never “Saved to your device” |
| Announcement | No V1 bar by default. Later factual service notice only, with real destination/dismissal if needed |

Reuse current components where their contract fits. Do not add a generalized design-system framework, universal workflow builder or a new UI dependency.

## 3. What will be adopted from the reference

| Reference quality | ToolSuite adaptation |
| --- | --- |
| Orange/teal brand pairing | Actions versus supporting trust; no Pro/Free business split |
| Sora + Inter feel | Geometric task headings and calm readable controls |
| White and subtle green-gray panels | Quiet working surfaces, alternate discovery/footer bands |
| Dark sticky navigation | Dedicated readable on-dark tokens and one-height mobile header |
| Rounded two-column mega-menu | Real subtitle groups, compact icon/name rows, All Tools footer |
| Small icon wells and bordered cards | Existing tool icon silhouettes, teal/neutral wells, whole-card links |
| Restrained radial accent atmosphere | Homepage/media/final CTA only; workspaces remain quiet |
| Alternating light section rhythm | Shorter page ordered by ToolSuite discovery needs |
| Spacious FAQ divider treatment | Native accessible disclosure and actual visitor questions |
| Balanced multi-column footer | Real operator/help/legal/discovery links instead of broad fake inventory |
| Responsive grid simplification | Content-driven breakpoints and 44px controls across five audited widths |

Premium quality is the combination of restraint, legibility and correct states. It is not the reference’s number of promotional sections.

## 4. What must not be copied, and conflicts to resolve

| Reference item | Conflict with ToolSuite | Required resolution |
| --- | --- | --- |
| AENural name/logo, Source Window, After Effects positioning | Different product/business | Keep ToolSuite identity; recolor its existing mark, do not borrow the AE mark |
| Pro/free split, licenses, pricing and signup prompts | Current seven tools are free and anonymous | Omit all active account/pricing UI |
| Stars, placeholder quotes and popularity claims | No supporting evidence | Omit; homepage section is Useful tools |
| Roadmap, community/Discord, resources/blog inventory | Unreleased/unsupported destinations | Omit; no fake social icons or # links |
| Two hero CTAs and centered preview below all copy | User requires one CTA and desktop right-side media | Use left copy/right 16:9 media, stacked on mobile |
| Preview aspect-ratio 16/8 | ToolSuite requires 16:9 | Use 16:9 for the hero media, with no fake play button |
| Hover-only mega menu | Touch/keyboard access unreliable | Click-first semantic disclosure with Escape, outside-close and focus handling |
| Dark nav inheriting light --muted/--text | Risky contrast and unclear logo/link states | Use dedicated high-contrast navigation tokens |
| 10–12.5px tool/status/footer text and faint #8A9794 | Insufficient essential text readability/contrast | 14px+ meaningful labels; darker supporting text |
| Clickable divs, href-less anchors and hidden-page routing | Poor semantics, deep links and SEO | Native links/buttons and existing Next routes |
| FAQ JS and missing explicit expanded semantics | Can clip answers and needs extra accessibility behavior | Preserve native details/summary |
| External Google font links | Unnecessary visitor-side third-party request | Licensed self-hosted assets through built-in font support |
| Whole-page fade/translate and smooth scroll everywhere | Motion/accessibility and task distraction | Reduced-motion support and restrained local transitions |
| Decorative card/page volume | Audit identifies repetition and vertical density | Shorten to useful ToolSuite sections and distinct tools |

## 5. Homepage final structure

### 5.1 Hero wording directions

These are truthful copy directions, not keyword-volume claims. Validate language with search/task evidence when available; no synonym stuffing is needed.

| Direction | H1 | Supporting direction | Assessment |
| --- | --- | --- | --- |
| A — Recommended for V1 | **Free online subtitle tools** | “Edit, fix and convert subtitle files in your browser. Free to use, with no signup.” | Clearest match to all seven current tools and visitors’ immediate work |
| B — Broader brand with explicit present scope | Free online tools for everyday tasks | “Start with subtitle tools to edit text, fix timing and convert files.” | Truthful when paired, but H1 alone suggests a broader available library |
| C — Format-specific | Free tools for SRT and VTT subtitles | “Edit subtitle text, fix timing issues and convert SRT to VTT.” | Useful support clarity, but format coverage varies by tool; do not imply every tool accepts both |
| D — Task-led | Edit, fix and convert subtitles online | “Free subtitle tools that work in your browser, without an account.” | Concrete but less explicit about a collection of tools |

**Recommended balance:** Direction A now. Keep ToolSuite as the flexible brand and extend the homepage proposition only after another real category ships. The audit’s broad H1 was a direction, not a requirement to imply tools that do not exist.

**Exact hero CTA:** **Explore Free Tools** → **/tools**. One primary CTA. Remove Try SRT Timing Adjuster from the hero. No signup, pricing, second ghost CTA or credit-card reassurance.

Suggested homepage title: **Free Online Subtitle Tools | ToolSuite**. Description: **Free online tools to edit, fix, split and convert subtitle files. Work in your browser without creating an account.** Final editorial checks should confirm exact current support and natural wording, not chase a guessed search phrase.

### 5.2 Exact section sequence and later changes

| Order / section | Purpose and content | Visual treatment | Remove / preserve | Likely later files |
| --- | --- | --- | --- | --- |
| 1. Hero | H1, two short sentences, one Explore Free Tools link, ToolSuite demonstration | Left-aligned copy and right 16:9 media above approximately 960px; 40–48px gap; subtle restrained orange/teal atmosphere; media below on mobile | Remove slogan, second CTA, roadmap subtext, fake play; preserve actual local/free/no-signup facts and 16:9 direction | src/app/page.tsx; home/hero-video-placeholder.tsx; globals.css |
| 2. Useful tools | Four curated released tools; View all tools (7) → /tools | Four clean cards on roomy desktop, two tablet, one mobile; quiet teal icon wells, neutral card bodies | Remove automatic whole-registry rendering, filler directory card and Available/Free badges; preserve direct tool links | page.tsx; home/tool-card.tsx; lib/tools.ts |
| 3. Find a subtitle tool | Subtitle Tools (7) → /tools/subtitle-tools; three concise task links: Edit text, Fix timing, Convert SRT to VTT | Compact light alternate band/row; one category surface, not five oversized tiles | Remove all empty categories and coming-soon promises; preserve real category identity | page.tsx; optional home/task-links.tsx |
| 4. Practical example — conditional | One constant-shift example only if hero media does not already explain it | Small before/after time row beside short task copy, no second marketing grid | Preserve correct existing timing example; remove if redundant with hero | home/featured-srt.tsx; page.tsx |
| 5. Free and simple to use | Free; no signup; current files processed in-browser. Process: Choose a tool → Add a file or start editing → Download your result | One compact neutral/teal trust block with three concise points; no three giant numbered cards | Merge benefits, trust strip and standalone how section; preserve factual privacy/steps | page.tsx; optional home/trust-summary.tsx |
| 6. FAQ | Four useful questions, short answers and relevant help/privacy links | Reference-style reading-width divider rows, native details; no eyebrow paragraph above every answer | Preserve native disclosure; remove roadmap/tool-name enumeration and repeated definitions | home/home-faq.tsx |
| 7. Final CTA | “Find the tool for your next task” and Explore Free Tools → /tools | Compact bordered panel with a soft accent wash; one button | Remove secondary timing CTA and repeated slogan | page.tsx |
| 8. Footer | Real tool, help and legal navigation | Balanced brand + Tools/Help/Legal columns on alternate surface | Remove registry dump/empty families/roadmap; preserve home identity | site/footer.tsx |

**Curated four:** Subtitle Editor, SRT Timing Adjuster, SRT to VTT Converter, SRT Merger. Store an explicit curated href/ID list; count all tools from the registry. Adding tool eight must not add an eighth homepage card. Use **Useful tools**, not Popular or Most used without data.

**Homepage FAQ content:**

1. Are the tools free? — Yes; current tools are free to use.
2. Do I need an account? — No account is required.
3. Are my subtitle files sent to a server? — Current tools process the selected files in the browser; link to Privacy for hosting/storage details.
4. Which files can I use? — Tool support varies between SRT and VTT; each chooser states accepted formats/limits; link to Subtitle Tools.

Do not repeat all seven tool names in FAQ answers.

### 5.3 Media decision

Keep the 16:9 area as a **real static ToolSuite product image** until a real demo exists. It should show a current useful working state, not a fake player or imagined feature. No play triangle, decorative playback controls or “coming soon” promotional label. A descriptive caption can say “Subtitle tools in your browser.”

Later real video: user-initiated playback, captions/transcript, descriptive poster, responsive 16:9 frame and no autoplay. Prefer same-origin resources; evaluate a third-party embed’s requests before adopting it. Do not copy reference screenshots or branding.

The optional practical example is excluded from the final page if the hero already demonstrates that same task. Its inclusion is content-dependent, not a mandatory eighth promotional block.

## 6. Header, mega-menu and mobile navigation

### 6.1 Desktop header

At widths above approximately 960px:

**ToolSuite home** | **Tools disclosure** | **Subtitle Tools** → /tools/subtitle-tools | flexible space | **Search** | **Theme**

Use a 64–72px dark-neutral bar, a clear ToolSuite wordmark, restrained orange mark/accent and dedicated on-dark text. Sticky is acceptable if focus/anchors remain visible; no announcement bar above it by default. Subtitle Tools active state comes from category membership/route data, not an /srt prefix.

The brand remains a real home link. Retain accessible search/theme names and existing theme persistence/init behavior. Future account architecture is simply an extensible utility container; show no empty avatar, disabled account button, reserved blank gap or signup CTA.

### 6.2 Exact desktop Tools panel

Panel: approximately 640–680px maximum, constrained to viewport gutters, 16px radius, raised surface, clear edge, restrained shadow. Align within the header/container so it cannot clip the screen.

- Heading/link: **Subtitle Tools** → /tools/subtitle-tools.
- Left group: **Timing & Editing**
  - Subtitle Editor → /tools/srt-editor
  - Adjust SRT Timing → /tools/srt-timing-adjuster
  - Fix Subtitle Drift → /tools/subtitle-sync-fixer
  - Fix Overlaps → /tools/subtitle-overlap-fixer
  - Merge SRT → /tools/srt-merger
  - Split SRT → /tools/srt-splitter
- Right group: **Format Conversion**
  - SRT to VTT → /tools/srt-to-vtt
  - Small factual supporting line: “Free tools. No signup.”
- Divider/footer: **View all tools** → /tools, with optional Search tools button opening the existing search dialog.

Rows have icon + short name, at least 44px height. No paragraphs, FREE/AVAILABLE badges, future category tiles or Pro grouping. The panel’s columns need not have equal content height.

Use native details/summary where it fits. Click/Enter/Space toggles; Escape closes and restores trigger focus; outside pointer or focus leaving closes deliberately. Keep the panel open while keyboard focus is inside. Hover highlights rows/trigger; it is not the only open mechanism. Avoid ARIA menu roles unless their extra keyboard contract is actually implemented; this is website navigation.

For future categories, introduce a category column/list and a bounded tool group with View category; do not create those empty states now.

### 6.3 Mobile/tablet structure

At 960px and below, use a compact single row:

**ToolSuite home** | flexible space | **Search icon** | **Theme icon** | **Tools/Menu trigger**

All utility hit areas are at least 44×44px. At 320px reduce wordmark size/padding, not targets or font clarity. Hide the desktop Subtitle shortcut and place it first inside the menu.

The menu expands a full-width panel below the bar:

1. All Tools
2. Subtitle Tools (7)
3. Timing & Editing links, stacked
4. Format Conversion link
5. Optional concise free/no-signup note

Use one panel scroll region when viewport height is limited, never a 300px list nested inside a 72vh menu. This is a nonmodal disclosure, so do not trap focus or treat the whole background as inert. The search dialog remains modal and restores opener focus. Only one menu/dialog should be open at a time.

Guarded navigation must work from logo, menu, category shortcut and search result before the navigation rebuild is integrated; see Phase 2.

### 6.4 Search contract

Header search and /tools use the same released registry and curated task aliases. Query normalization: trim, lowercase, collapse spaces; require useful matches across short name, full title, task description and aliases. Preserve format support: do not treat an SRT-only timing tool as a VTT utility.

Use direct deterministic matching, not AI/remote search. Return a small stable list with names and supported-format context where useful. No new search dependency is needed for seven tools. Avoid overly broad synonyms that make every timing query return every tool.

Escape, clear search, close/backdrop, focus restoration and software-keyboard height are explicit QA requirements.

## 7. Premium /tools directory

### Content sequence

1. Breadcrumb: Home → All Tools.
2. H1 **All Tools**.
3. Supporting line: **Seven free subtitle tools to edit, fix and convert files. No signup required.** Derive the count dynamically.
4. Visible Search tools label/input; placeholder **Search by name or task**.
5. Current category indicator **Subtitle Tools · 7 tools**, with link to its category page. No redundant All/Subtitle filter that yields identical results.
6. Result count and Clear search when active.
7. Subtitle Tools group:
   - H2/heading appropriate to page hierarchy: Subtitle Tools.
   - H3 Timing & Editing — six tools.
   - H3 Format Conversion — SRT to VTT.
8. Small help link for choosing a timing tool; no account/promo banner.

When more actual categories ship, add All and real-category filters and preserve shareable routing deliberately. Publish no empty category filters/cards.

### Card hierarchy and responsive structure

**Card order:** icon well → short tool name → one task sentence → optional subtle direction arrow. Whole card is one semantic link. File support belongs in the concise sentence when it matters, not four badges.

| Width family | Layout |
| --- | --- |
| 1440 / 1024 | Three comfortable columns within 1200px; grouped headings span full width. One conversion card is fine |
| 768 | Two columns if text remains readable; directory search spans full width |
| 390 / 320 | One column; horizontal icon/name alignment can reduce vertical cost |
| Zoom/reflow | Collapse by available space rather than force a desktop column count |

The four-card homepage and seven-tool directory share a card contract but can use different layout density.

### Exact real-tool directory copy

| Card name | Supporting task sentence | Route |
| --- | --- | --- |
| Subtitle Editor | Edit SRT or VTT text and timing. | /tools/srt-editor |
| Adjust SRT Timing | Move all SRT subtitles earlier or later. | /tools/srt-timing-adjuster |
| Fix Subtitle Drift | Correct gradual timing drift in SRT or VTT. | /tools/subtitle-sync-fixer |
| Fix Overlaps | Review and fix overlapping SRT or VTT subtitles. | /tools/subtitle-overlap-fixer |
| Merge SRT | Combine SRT files in order and check the joins. | /tools/srt-merger |
| Split SRT | Divide an SRT file into smaller parts. | /tools/srt-splitter |
| SRT to VTT | Convert SRT subtitles to VTT. | /tools/srt-to-vtt |

Registry presentation fields can include shortName, aliases, supportedFormats and explicit related hrefs, without rewriting transformation code. Only released entries appear publicly. Render the initial full library as crawlable links; client search enhances it, not replaces server-visible content.

Zero results: **“No tools found for ‘[query]’.”** Then **“Try another name or task, or clear your search.”** One Clear search button restores all seven. Safely render the query as text. Do not suggest unavailable tools or make the user join a waiting list. No pagination is needed.

## 8. /tools/subtitle-tools category page

This page’s distinct job is helping a visitor choose the right subtitle operation, rather than duplicating a generic directory introduction.

Sequence:

1. Breadcrumb Home → All Tools → Subtitle Tools.
2. H1 **Subtitle Tools**.
3. One sentence: **Edit subtitle text, fix timing, combine files or change formats.**
4. Compact **“What do you need to do?”** guidance links:
   - Edit words or times → Subtitle Editor.
   - Subtitles have the same delay throughout → Adjust SRT Timing, marked SRT.
   - Subtitles gradually go out of sync → Subtitle Sync Fixer, marked SRT/VTT.
   - Convert SRT to VTT → converter.
5. All six Timing & Editing tools in the same concise directory contract.
6. Format Conversion, containing SRT to VTT.
7. Short support note: Editor, drift and overlap tools accept SRT/VTT; adjust/merge/split/converter input accepts SRT. Each tool states its limits.
8. View all tools → /tools.

These task links guide without filtering away the rest of the page. They are not a multi-step quiz or mandatory onboarding. Merge, split and overlap remain directly available in the full groups.

Use a compact task band and readable grids/list, not a giant SEO article. Publish no Timing & Editing or Format Conversion subcategory routes. On mobile, guidance links stack with 44px targets. The shared registry supplies consistent names, formats and routes.

## 9. Footer and support destinations

Use the reference’s balanced column hierarchy and generous but restrained separation. V1 footer contents:

| Column | Exact scope |
| --- | --- |
| Brand | ToolSuite home; “Free tools for everyday file tasks.” Current subtitle scope can be stated if useful; no roadmap |
| Tools | All Tools; Subtitle Tools; Subtitle Editor; SRT to VTT; SRT Timing Adjuster |
| Help | Help & contact; About |
| Legal | Privacy; Terms where appropriate for the actual operator |
| Bottom row | Confirmed operator/copyright, optional Back to top with a real destination |

White/light-gray surface in light theme; quiet raised dark surface in dark theme. Essential links use readable supporting text, not the prototype’s faint text. Four columns on wide desktop, brand above remaining columns on tablet, two or one readable columns on phones. Do not put 10px social buttons or pretend social/community destinations in the footer.

**Later support page content:**

- **About:** actual product purpose, available tools, operator identity once confirmed; no invented team credentials.
- **Help/contact:** choose the right tool, accepted files/limits, download and validation troubleshooting, and a real support channel. Do not publish a fake address or nonfunctional form.
- **Privacy:** selected files remain local for current tools; explain host requests/logs, theme localStorage and actual third-party/analytics practices. No blanket “nothing is collected” claim.
- **Terms:** actual use/service expectations, limits and support scope, with operator/jurisdiction input where needed; no invented legal promises.
- **404:** concise missing-page message, All Tools primary recovery and Home secondary link; real 404 status.
- **Unexpected error recovery:** useful retry/reset/help appropriate to whether edited work can still be preserved. No technical stack trace in visitor copy.

Operator name, contact destination and final domain are factual inputs for a later content/release phase. Their absence does not block this plan; placeholder values must not ship.

## 10. Compact shared tool-page shell

Shared structure:

**Breadcrumb → compact H1 + one task sentence → working interface → brief relevant help → two or three related links → footer.**

Breadcrumb on tools: Home → All Tools → Subtitle Tools → current tool. Use actual routes and aria-current; preserve one H1. Shell supplies a workspace slot, not a preview panel or a compulsory control order.

| Current issue | Planned reduction | Preserve |
| --- | --- | --- |
| Giant title area | 30–36px desktop / 24–28px mobile tool H1, modest top space | Clear task and supported-format context |
| Category/local badge stack | Category already in breadcrumb; one small factual processing line near chooser | Accurate current local mode |
| Repeated local/privacy paragraphs | One compact line with optional Privacy link; no repeat at top and bottom | Meaningful privacy information; future cloud mode must be data-driven |
| Generic workflow steppers | Remove where they simply narrate obvious state; use task-specific result/status | Real busy/valid/error/result state |
| Oversized loaded upload | Compact filename/formats/count row with replace/reset where appropriate | Same-file selection, busy guarding, failed replacement handling |
| Six related cards | Two or three useful next jobs, explicit mapping | Discoverability and correct destinations |
| Shared two-column expectation | Tool controls determine layout | Existing independent editor, joins, manifest and repair models |

A selected file does not mean editing is complete. Remove status decoration that implies a result has been inspected or saved simply because output can serialize.

**Related-tool starting map:**

- Timing → Sync Fixer; Subtitle Editor.
- Merger → Splitter; Timing Adjuster; Subtitle Editor.
- Splitter → Merger; Subtitle Editor.
- Editor → Timing Adjuster; Overlap Fixer; SRT to VTT, with scope clear for VTT users.
- Sync → Timing Adjuster (SRT only); Subtitle Editor.
- Overlap → Subtitle Editor; Sync Fixer.
- Converter → Subtitle Editor; All Subtitle Tools.

Preserve tested library/session functions, limits, error callbacks and safe downloads. Shared styling may recolor/resize a field or button; it must not change whether a result is valid. Tool-specific refinement remains a separate phase.

## 11. Individual implementation plans for all seven tools

Each plan below changes presentation and task guidance around existing functionality. Any safety-state change is isolated and tested separately. No algorithm rewrite is part of the visual pass.

### 11.1 SRT Timing Adjuster

**Exact job:** Move all SRT subtitle times earlier or later by one constant amount.

**First screen:** Compact task title and “Shift SRT subtitles earlier or later” → choose/drop SRT with current limit. No empty preview panel.

**Loaded hierarchy:** Compact file row → Earlier/Later choice + amount in seconds → existing quick presets → small original/adjusted time check → material clamp warning → **Download adjusted SRT** → Start over.

Earlier/Later is a presentation adapter to the existing signed offset: earlier maps to negative; later to positive. Preserve decimals, presets, validation and zero-offset behavior. A zero value should say “No timing change” rather than imply an edit; do not silently change output rules.

**Inspection:** YES, one or a few before/after timestamps. Show meaningful affected examples when times would clamp below zero. Do not add a video player or full cue grid.

**Remove:** Empty preview scaffolding, duplicate local badges/paragraphs, generic stepper, repeated instructions and six related cards.

**Remain:** Parser, preserve-text/format behavior, presets, validation, clamp warning, current-file/error recovery and Blob download.

**Copy:** Subtitle rather than cue; “Earlier,” “Later,” “Seconds,” “Some times will be set to zero.” Explain the constant-delay scope and link to drift correction with its different support.

**Mobile:** Single sequence; direction/value comfortable to tap; comparison and warning before download; no left/right instruction language. Long filename wraps outside timestamp values.

**Approved design expression:** Quiet narrow white panel, one orange result action, teal selected direction/supporting icon, compact neutral timing row. Do not create a large two-column marketing workstation.

**Later files:** features/srt-timing-adjuster/offset-control.tsx, srt-timing-adjuster.tsx, subtitle-preview.tsx; its app page and scoped global CSS. Preserve session.ts and lib/srt.ts unless a separately approved interoperability fix is required.

**Acceptance:** +1.5 and -1.5 produce the existing correct results, input stays understandable, zero state is honest, failed replace clearly identifies retained input. Test zero-duration clamp compatibility with Editor/Converter and decide a separate remedy only if required; do not hide the warning.

### 11.2 SRT Merger

**Exact job:** Combine ordered SRT parts with a known added gap, understanding subtitle-based placement.

**First screen:** Compact title → add 2–10 files → brief visible timing assumption. No claim that video alignment is known.

**Loaded hierarchy:** Ordered file rows with drag and Up/Down → compact Add files/Replace/Remove → **Added gap** → join inspection → limitation/warning → **Download merged SRT**.

**Inspection:** YES, join boundaries only. Previous last subtitle time, next first subtitle time, added gap and resulting placement. Initially show a few joins; disclose more accurately.

**Remove:** “Correctly timed” assurances, full-transcript preview, source/destination jargon, large loaded chooser, repeated join prose and generic completion badges.

**Remain:** Existing 2–10-file and combined-size limits, duplicate feedback, ordering alternatives, latest-end calculation, lead-in preservation, strict serialization and error recovery.

**Copy:** “Combine SRT files in order.” “Added gap.” “The next file follows the previous file’s last subtitle time, plus the added gap. Its original lead-in is kept.” Timing detail before download: “SRT files do not contain video-part duration. Include any time after the last subtitle in the added gap.”

**Mobile:** Ordered rows and actions first; no drag-only behavior; gap → joins → warning → download. Buttons retain context after removal/reorder; no narrow filename/action collision.

**Approved design expression:** Broad ordered-list panel with neutral rows, compact teal icon/order markers, orange final action and restrained join connectors. No orange “Pro” edge or full timeline product demo.

**Later files:** features/srt-merger/srt-merger.tsx, file-list.tsx, gap-control.tsx, merge-preview.tsx; app/tools/srt-merger/page.tsx; lib/tools.ts wording; scoped CSS. lib/srt-merge.ts algorithm remains protected.

**Acceptance:** If the prior latest end is 12 seconds, next lead-in is 2 seconds and added gap is 0, next start is 14 seconds. If the prior video lasts 20 seconds, an 8-second added gap produces 22 seconds. A single shared gap does not solve different trailing durations automatically. This example must remain accurate.

### 11.3 SRT Splitter

**Exact job:** Divide an SRT into useful files, retaining or resetting time references as required.

**First screen:** Compact title → choose SRT. After load, one method decision: Number of parts / Number of subtitles / Time interval.

**Loaded hierarchy:** Method + value → Keep original times / Reset times for each part → output count and manifest → **Download all parts (ZIP)**; individual file downloads remain secondary.

**Inspection:** YES, output manifest with filename, subtitle count and time range. Optional boundary sample; no giant caption preview.

**Remove:** Full cue lists, empty output cards, redundant per-mode instructions, directional “on the left” errors and universal “first caption starts at zero” wording.

**Remain:** All three split modes, current maximum-part/validation rules, preserved whole captions, skipped empty intervals, original-time default, per-part output and ZIP.

**Copy:** “Split into 3 parts,” “Every 100 subtitles,” “Every 10 minutes.” Mode-specific reset example explains what is subtracted. In time-interval mode, a subtitle at 15 seconds in a 10-second interval can become 5 seconds; it need not become zero. A caption spanning a boundary stays whole in the part chosen by its start.

**Mobile:** Short stacked mode choices if needed, one value field, time option, manifest rows then ZIP. Keep each individual action attached to its filename; no mandatory accordion just to find output.

**Approved design expression:** Method controls and document manifest, teal selected mode/quiet filenames, one orange ZIP action. This is a file-creation layout rather than timing editor panels.

**Later files:** features/srt-splitter/split-controls.tsx, split-results.tsx, srt-splitter.tsx; app page/scoped CSS. Preserve session.ts, lib/srt-split.ts and lib/srt-split-zip.ts.

**Acceptance:** Correct counts, boundary assignment, reset examples, nonempty files, filenames and reopenable ZIP contents across every mode.

### 11.4 Subtitle Editor — SRT & VTT

**Exact job:** Change caption words and start/end times, correct errors and export the edited file.

**First screen:** Choose SRT/VTT or Start from scratch. After load, the first editable captions appear quickly, not after a large instruction or advanced-control block.

**Working hierarchy:** Compact file/session row → Undo/Redo + optional Find/Advanced → editable caption text/times → reachable export and linked validation issues. Keep source-format download primary; alternate format secondary.

**Primary CTA:** **Download SRT** or **Download VTT**, following source/scratch format. Keep one main export area, not multiple competing sticky/download cards.

**Inspection:** YES, the editable captions themselves. No second read-only preview; no required video upload.

**Remove/reduce:** Generic stepper, reading-speed jargon as a dominant badge, expanded advanced controls, pagination when only one page exists, excessive per-caption decoration and unnecessarily competing nested scroll.

**Remain:** Unicode/RTL support, scratch creation, add/delete, timing edits/nudges, undo/redo, find/replace, validation, pagination, format-specific warnings and both exports. Preserve reducers/history semantics.

**Copy:** “Add subtitle,” “Find words,” “Reading speed” with optional technical detail. Explain search/replacement capitalization behavior where used. Session copy: “Edits are kept in this tab. Download your file to keep a copy.” Do not claim automatic saving.

**Mobile:** Caption text visually dominant; timing fields stack with 16px input text. Plan one compact export/control toolbar that remains reachable while scrolling, offset below sticky navigation and verified with the software keyboard. Prefer an in-flow/sticky-top pattern over a fixed bottom bar covering text; fall back to normal flow if usable-height checks fail. Keep issue links/focus meaningful. Avoid scroll traps.

**Approved design expression:** Neutral editing canvas, readable text, subtle caption dividers, teal field focus/selection, orange export. Much less decorative than homepage cards.

**Later files:** features/srt-editor/srt-editor.tsx, cue-editor.tsx, editor-toolbar.tsx, find-replace.tsx, export-controls.tsx; app page/scoped CSS. Phase 2 safety adds separate navigation support; transformation and edit-history code stays intact except explicitly scoped integration.

**Acceptance:** Text/time/add/delete/find/replace/undo/redo/export still work, errors focus the relevant subtitle, RTL remains readable, unsaved safety works across shell links and supported exits, mobile editing never hides the active field behind a bar.

### 11.5 Subtitle Sync Fixer

**Exact job:** Correct gradual drift using two moments with known correct times.

**First screen:** “Fix subtitles that gradually go out of sync.” Small alternate-job link: constant delay for an SRT → timing adjuster. Then chooser; no empty correction display.

**Loaded hierarchy:** Early reference, then late reference. Each has selected subtitle/source time and **Should appear at** time. One timestamp example where necessary → **Fix sync** → correction summary/warnings → **Download corrected subtitles**.

**Primary CTA:** Progressive: Fix sync before a result, Download corrected subtitles after one. Do not make a disabled download look like the current main action.

**Inspection:** YES, reference correction and meaningful resulting samples. Indicators should distinguish early reference / between references / late reference from guaranteed whole-video sync.

**Remove:** Repeated point instructions/privacy paragraphs, generic stepper, large empty chart and any automatic-audio-verification implication.

**Remain:** Two-point controls/search/paging, supported SRT/VTT, result invalidation after inputs change, warning rules and serialization. No mathematical change.

**Copy:** “Pick one subtitle near the start and one near the end. Enter when each should appear.” “For gradual drift, not missing or rearranged video sections.” Label source/target values clearly without affine/cue terminology.

**Mobile:** Early/late groups stacked, comfortable timestamp keyboard with punctuation supported, correction summary before download. A repeated label may be necessary for clarity; remove only repetition that conveys no decision.

**Approved design expression:** Two purposeful reference panels, quiet teal selection/correction markers, orange action that progresses with state. Avoid the merger’s join connectors or converter’s single station.

**Later files:** features/subtitle-sync-fixer/subtitle-sync-fixer.tsx, sync-point-control.tsx, sync-preview.tsx, subtitle-sync.css; app page. Preserve session.ts and lib/subtitle-sync.ts.

**Acceptance:** Known two-point fixtures match current outputs; invalid/reversed/equal references explain failure; editing a reference removes stale downloadable results; clamp warnings remain visible.

### 11.6 Subtitle Overlap Fixer

**Exact job:** Review timing conflicts, repair selected overlaps using an understood strategy, inspect remaining issues and download an updated file.

**First screen:** Compact title and choose SRT/VTT. After load, overlap count and first relevant conflicts.

**Working hierarchy:** Review/select issues → choose Shorten earlier subtitle or Move later subtitle → gap/consequence → **Fix selected overlaps** → changed/remaining summary and before/after review → **Download updated subtitles** + Undo.

**Inspection:** YES, targeted conflict context and timing changes. Caption text can be optional where it helps assess shortened reading time. On mobile, clear textual comparisons can replace bars.

**Remove:** “Where subtitles meet” decoration, redundant related navigation, full-file preview, “fixed” claims when conflicts remain and misleading Show all label.

**Remain:** Selection/exclusion protection, both strategies, remaining counts, minimum duration safeguards, recheck, undo, no-overlap success and valid partial-result support.

**Copy:** “Overlapping subtitles,” “Gap added when fixing selected overlaps,” “3 overlaps remain.” Accurate expansion: **Show 25 per page** with issue navigation when relevant. Associate invalid gap with its field; explain propagation for moving later captions.

**Mobile:** Review before repair; strategy and consequences together; updated/remaining result before download. No color-only selected/fixed cues. Changing selections after repair must make result reset clear.

**Approved design expression:** Purposeful issue cards with neutral timing comparison, distinct semantic warning/error/success, teal selection and orange repair/export action. Brand colors never hide conflict meaning.

**Later files:** features/subtitle-overlap-fixer/subtitle-overlap-fixer.tsx, overlap-fix-controls.tsx, overlap-issue-list.tsx, overlap-issue-card.tsx, overlap-timing-visual.tsx, subtitle-overlap.css; app page. Preserve session.ts and lib/subtitle-overlap.ts.

**Acceptance:** Excluded captions remain protected, short-duration and propagation cases match current behavior, partial results are honestly labeled, >25 issues are navigable with accurate wording, output recheck agrees with reported remaining count.

### 11.7 SRT to VTT Converter

**Exact job:** Obtain a VTT file from a valid SRT.

**First screen:** Compact title, short description and Choose SRT file. One small format marker if useful.

**Loaded hierarchy:** Compact source row → **VTT ready** and output filename → material warnings → **Download VTT** → Replace/Start over.

**Inspection:** **NO preview.** Validation plus readiness is sufficient. Conversion already occurs on selection; no extra Convert button or confirmation is required.

**Remove:** Duplicate station heading/eyebrow/format badge, repeated success checks, timestamp syntax lesson inside the workspace, generic stepper and large empty result frame.

**Remain:** Supported-input limits, validation/preservation checks, warnings, result filename, MIME/encoding, safe download and stale-read/reset behavior.

**Copy:** “Convert SRT subtitles to VTT.” “VTT ready.” “Your file is processed in your browser.” Explain WebVTT/commas versus periods below the tool only if useful.

**Mobile:** Narrow single-column station; ready action visible without navigating a preview; warnings precede download; filename wraps comfortably at 320px.

**Approved design expression:** Small restrained white station, one teal ready indicator and orange download. No editorial or repair workspace imposed.

**Later files:** features/srt-to-vtt/srt-to-vtt.tsx, srt-to-vtt.css; app page. Preserve session.ts and lib/srt-to-vtt.ts.

**Acceptance:** Upload/validate/download remains the whole path; downloaded file reopens with preserved text/times; no preview is introduced.

## 12. Preview/inspection contract

| Tool | Decision | Form of inspection |
| --- | --- | --- |
| Timing Adjuster | YES | Compact before/after timestamp check |
| Merger | YES | Join-boundary inspection |
| Splitter | YES | Output manifest and optional boundary sample |
| Editor | YES | Editable captions are the inspection surface |
| Sync Fixer | YES | Correction summary and meaningful sample times |
| Overlap Fixer | YES | Targeted conflict review and remaining result |
| SRT to VTT | NO | Validation/ready status and warnings only |

Share type, colors, status primitives and buttons. Keep the existing subtitle-preview, merge-preview, split-results, cue-editor, sync-preview and overlap review as separate domain components. Do not create a required UniversalPreview API or an empty preview slot in ToolLayout.

## 13. SEO, content and wording integration

### 13.1 Route and metadata plan

Keep existing tool slugs. Add /tools, /tools/subtitle-tools, /about, /help, /privacy and appropriate /terms. Do not create thin subgroup/empty-category pages.

| Page | H1 direction | Title direction |
| --- | --- | --- |
| Homepage | Free online subtitle tools | Free Online Subtitle Tools \| ToolSuite |
| /tools | All Tools | All Free Tools \| ToolSuite |
| /tools/subtitle-tools | Subtitle Tools | Free Subtitle Tools \| ToolSuite |
| Timing | SRT Subtitle Timing Adjuster | SRT Timing Adjuster \| ToolSuite |
| Merger | Merge SRT Files | SRT Merger — Combine Subtitle Files \| ToolSuite |
| Splitter | Split SRT Files | SRT Splitter \| ToolSuite |
| Editor | Subtitle Editor — SRT & VTT | Subtitle Editor for SRT & VTT \| ToolSuite |
| Sync | Subtitle Sync Fixer | Subtitle Sync Fixer — Gradual Drift \| ToolSuite |
| Overlap | Fix Overlapping Subtitles | Subtitle Overlap Fixer \| ToolSuite |
| Converter | SRT to VTT Converter | SRT to VTT Converter \| ToolSuite |

The vertical-bar title separator is a metadata convention, not extra heading copy. These title directions can be shortened at editorial review; do not add multiple synonyms to every title.

One H1 per page. H2 sections describe real task/help structure; H3 tool cards/meaningful subgroups. Buttons, badges and field labels are not headings merely to make them large. Preserve server-visible links and content; design does not hide keyword paragraphs.

Descriptions should say what input becomes what output and any key scope. Example merger: “Combine SRT files in order, choose an added gap and check the joins before downloading one file.” No inferred video-duration assurance.

### 13.2 Domain, crawling and sharing

After the actual domain is chosen:

- One verified production origin/metadataBase; absolute self-canonicals for indexable routes. Do not hardcode localhost or an invented domain.
- Choose HTTPS/primary hostname/trailing-slash convention and actual redirects consistently.
- robots.ts or deliberately managed robots.txt and sitemap.ts using installed Next conventions; include only released, real indexable routes.
- Keep staging protected/nonindexable. robots disallow is not privacy/security or a substitute for authenticated staging access.
- Search/filter URL variants should not become an indexable library of near-duplicates. V1 search can remain local state; no query routes are necessary.
- Root OG/Twitter defaults plus page-specific title/description; real ToolSuite sharing art, absolute URL and documented image dimensions. No fake popularity/rating badges in share assets.
- Replace starter favicon conflict with a ToolSuite icon family matching the new palette. Verify emitted links, bookmarks, light/dark browser tabs and touch icons.
- Breadcrumbs and optional BreadcrumbList match visible real destinations. Consider truthful WebSite/Organization/WebApplication data only if useful and accurate.

No fake AggregateRating, FAQ rich-result promise, hidden FAQ content or automated synonym schema. The audit notes the 2026 FAQ search-feature change; it remains verified by the current [Google documentation change log](https://developers.google.com/search/updates). Useful visible FAQs do not need FAQ schema.

Use installed Next metadata/file-convention guides before coding. Keep metadata work isolated from client tool logic.

### 13.3 Wording standard

| Avoid in ordinary UI | Prefer |
| --- | --- |
| cue | subtitle, when the meaning is the visible timed text block |
| cue count | number of subtitles |
| resolve cue conflicts | fix overlapping subtitles |
| source/destination cue | subtitle in the previous/next file |
| affine correction | gradual timing correction |
| CPS | reading speed, with optional technical definition |
| validated/ready/converted repeated together | one readiness message and useful filename |
| correctly timed / perfectly synced | actual transformation and its limitation |
| no upload | processed in your browser; selected file is not sent to our servers |
| popular / trusted by thousands | useful tools; factual handling without usage claims |

Keep SRT, VTT, timestamps, decimals and file formats where necessary. Do not translate technical identifiers inside code or tests just to change visitor wording. Helpers must tell a user what to do or what will happen; remove those that merely narrate the component.

## 14. P0/P1 product fixes incorporated into the plan

### 14.1 P0 — Editor unsaved-work safety

Implement this as an isolated safety change in **Phase 2**, before expanding/rebuilding navigation. It is not a styling side effect.

1. **Define dirty state from the actual editor session.** Use the existing editorIsDirty/reducer semantics; typing, timing changes, add/delete, find/replace, undo/redo and scratch editing must be covered. Verify transient edits before blur/commit. Uploading an unchanged file is not an unsaved edit.
2. **Add a small navigation-safety provider above the shell links.** It reports editor dirty state and a pending destination; keep server-rendered pages/links and public routes. Register/clear the editor owner deliberately so a stale guard does not block other tools.
3. **Use a guarded Next Link wrapper for same-tab internal departures.** The installed Next 16.3.8 Link guide explicitly supports onNavigate + preventDefault and a shared context. Cover logo, header, menu, search results, breadcrumbs, related tools and footer. Preserve valid hrefs, prefetch and modifier/new-tab behavior.
4. **On a dirty departure, cancel navigation first.** Present “You have unsaved edits” with **Keep editing** and **Leave and discard**. Keep editing is the safe initial focus; Cancel/Escape retain file, edits, history, scroll and field focus. Only an explicit leave choice continues once to the trusted pending route. Do not offer a premature Save-and-leave action that assumes a download was saved.
5. **Treat same-document anchors and downloads correctly.** Expanding a disclosure, changing theme, viewing an issue, downloading or opening a new tab must not discard the current editor or trigger a false leave prompt. Cross-route fragments still are departures.
6. **Refresh/close/full-page departure:** attach beforeunload only while dirty, invoke the browser-supported cancellation mechanism, and remove the listener when no longer needed. The browser supplies generic dialog wording; it may require prior interaction and may not fire on mobile termination. Do not promise universal recovery. [MDN beforeunload documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event)
7. **Browser Back/Forward is a separate test surface.** onNavigate is not a universal history blocker; App Router has no Pages Router router.events/beforePopState contract in the inspected guide. Do not claim preventDefault on popstate cancels history. First verify installed-router behavior. If history navigation drops editor state, preserve one recoverable editor session in same-tab memory above the route so returning restores work. Keep it scoped, clear on deliberate discard/reset/replacement, and never persist caption content to storage/cloud implicitly. No history-trapping sentinel loop or private-router patch.
8. **Download semantics:** the current exported event marks the session’s saved reference after a download starts. Verify error/cancel scenarios and do not equate that reference with confirmed disk storage in copy. An export failure must leave edits protected; any change to dirty/export semantics is separately tested, not bundled into styling.

**Likely files:** new site/navigation-safety-provider.tsx and site/guarded-link.tsx; app/layout.tsx; site/header.tsx/footer.tsx; tools/tool-layout.tsx; editor workspace; relevant tool-page contextual links. If the history test requires a memory retainer, isolate it as editor/session-retainer.tsx rather than changing subtitle transformation functions.

**Tests:** a focused new navigation-safety test for decision/state transitions if a testable helper is introduced; existing subtitle-editor-session.test.mjs and subtitle-editor.test.mjs unchanged in intent; browser checks across every departure source, dirty/pristine/export-failure states, Escape/cancel, Back/Forward and refresh/close. Do not treat static source assertions as proof of navigation safety.

### 14.2 P0 — Merger expectations

Before the later UI pass:

- Replace “correctly timed” wording in page H1 support/metadata and any registry promotion.
- Move the existing duration caveat to the gap/result decision area.
- Label **Added gap**, distinguishing it from actual time between captions.
- Explain max prior subtitle end + added gap + retained next-file lead-in.
- State that one shared gap cannot infer different video-part durations.
- Keep a correct worked example below the tool; add no mandatory consent checkbox.

This is copy/placement around the existing merge algorithm. Test the real placement example and retain all merge/session output tests.

### 14.3 P0 — Real-file QA

Every tool must be completed in a real browser and its actual downloaded artifact reopened. A green parser/reducer suite alone is insufficient.

| Tool | Required real-file completion |
| --- | --- |
| Timing | Positive/negative/decimal/zero shift; clamp warning; invalid replacement; download and compare timestamps/text |
| Merger | 2 and several files; reorder/replace/remove; lead-in/trailing-video example; current error dismissal; download/reopen combined order/times |
| Splitter | All three methods; original/reset times; boundary-spanning subtitle; ZIP extraction and individual output reopening |
| Editor | Import/scratch; text/times/add/delete; find/replace; undo/redo; validation; both exports; dirty departures |
| Sync | Correct known two-point fixture; invalid references; edit after correction invalidates result; reopen output |
| Overlap | Both strategies; exclude conflicts; propagate/short-duration case; >25 conflicts; partial result/undo; output recheck |
| Converter | Valid/invalid SRT; Unicode/multiline; warnings; same-file replacement/reset; reopen VTT; no preview |

Common set: empty/loaded/busy/error/result, picker Cancel, drag/drop, long Unicode filenames, same-file reselection, stale reads, limits, keyboard-only completion and actual save behavior. Use non-sensitive fixtures. Record viewport/browser/theme, expected output and pass/fail; don't invent results.

### 14.4 P0 — Reproducible production release

After approved changes, prove a clean checkout under pinned Node 24 can install from the lockfile, pass lint/typecheck/tests, build and run the production app. Verify real routes, assets, metadata and downloads on the intended hosting setup, with known rollback. Do not use the development server for release evidence.

The audit’s Hostinger route is a planning assumption to reconfirm in Phase 8 against the selected plan and then-current host guidance. No Git initialization, installation or deployment occurs in this task.

### 14.5 P1 traceability

| Audit requirement | Integrated destination | Phase |
| --- | --- | --- |
| /tools and /tools/subtitle-tools | Sections 7–8; same real registry | 3 |
| Short menu names, real categories, correct active state | Section 6 | 3 |
| Homepage simplification / four useful tools | Section 5 | 4 |
| Mobile tool completion and truthful inspection | Sections 10–12 and 16 | 6, verified throughout/7 |
| About/Help/Privacy/Terms | Section 9 | 5 |
| Branded 404/error recovery | Section 9, preserve status/errors | 5 |
| Canonicals/robots/sitemap | Section 13 | 5 preparation; production origin finalized in 8 |
| OG/social/favicon | Section 13 | 5 |
| Accurate breadcrumbs / relevant related links | Sections 10/13 | 3 shell destinations, 6 selection |
| Clamp interoperability / split boundaries / overlap labels | Individual plans | 6, with separate logic approval if output must change |

P0 safety and honest timing expectations cannot be traded for a polished homepage. P1 trust/SEO/discovery should be finished for the planned public V1. P2 polish is constrained by usefulness; P3 accounts and monetization remain deferred.

## 15. Intentional dark-mode adaptation

Retain existing system-default/persisted preference, pre-paint initialization, storage-error handling and cross-tab sync. Restyle surfaces/tokens; do not replace theme logic because the reference is light-only.

| Role | Dark starting value | Use |
| --- | --- | --- |
| Page background | #0F1716 | Green-neutral dark foundation, not navy-blue |
| Quiet alternate surface | #121D1A | Section rhythm/footer separation |
| Raised surface | #172422 | Cards, workspaces and menu/dialog panels |
| Soft/selected panel | #213330 | Input groups and quiet inspection areas |
| Decorative edge | #405650 | Layer separation; not sole field boundary |
| Field/control edge | #6E8B83 | Usable boundary against raised/soft surfaces |
| Primary text | #F1F7F4 | Main labels and captions |
| Supporting text | #B1C0BB | Instructions/helpers; no near-black disabled labels |
| Muted readable detail | #9FAFA8 | Secondary metadata, checked per surface |
| Primary action | #E07B1F with #160C02 text | Same recognizable orange action |
| Action hover | #C9661A with dark text | Verify hover/pressed contrast |
| Orange text accent | #F4AB66 | Selected brief emphasis/text links where useful |
| Teal text/icon/focus | #80D2C0 | Supporting state, focus and trust |
| Teal wash | #183B34 | Quiet icon/local/selection background |
| Navigation | #121918 | Same high-contrast header identity as light theme |

Opaque raised-surface examples: primary text about 14.75:1, supporting text 8.48:1, orange text 8.28:1 and teal text 9.07:1. Still verify actual rendered compositions.

### Feedback states across both themes

| State | Light text / surface | Dark text / surface | Meaning |
| --- | --- | --- | --- |
| Info/local context | #155C54 / #EAF4F0 | #80D2C0 / #183B34 | Explanation or handling fact |
| Success | #196247 / #E8F5EF | #9AE1B4 / #17372C | Validated operation/status; no guarantee of disk save |
| Warning | #794600 / #FFF3DF | #FFD18A / #3B2C18 | Consequence requiring attention |
| Error | #9F2F2F / #FFF0EE | #FFB4AC / #422825 | Invalid input or failure |
| Disabled | Readable gray/green neutral | Readable muted dark-surface neutral | Unavailable action plus nearby reason |

Keep icons and explicit wording. Warning amber can resemble orange; context/icon/label must distinguish it from an action. A teal local indicator is not proof the result is correct.

Use smaller/less luminous shadows in dark mode and visible panel edges. Avoid glow around every card. Long sessions in the editor should remain calm and readable; dark backgrounds are not mechanically inverted white cards.

## 16. Accessibility and responsive acceptance

### Interaction requirements

- Semantic links for routes, buttons for actions, correctly labeled inputs and main/nav/footer landmarks.
- One clear H1, meaningful heading order, skip link above sticky navigation in stacking order.
- Keyboard menu/search/FAQ/upload/repair/editor completion. Native details where useful; native dialog for modal search/leave confirmation if used.
- Visible focus ring in both themes, including on the dark header and orange buttons. Use surface-offset/double treatment if a single teal ring has insufficient contrast.
- At least 44px touch targets for primary and utility controls. A small visual icon can sit inside the target.
- No color-only mode, selected conflict, valid/error or remaining-result indicators.
- Errors associated with relevant field/file, aria-invalid where appropriate, and concise announcements. Avoid multiple live regions announcing the same status.
- Preserve Unicode, RTL and IME editing. Keep caption text direction handling separate from interface layout direction.
- Reduced motion disables lifts/rotations/entrance movement and unnecessary smooth scrolling.
- Important body/helper/button text meets normal-text contrast; usable graphical boundaries/focus meet nontext contrast. Do not lower tests to match the prototype.

### Width and real-device checks

| Width | Intended result |
| --- | --- |
| 1440 | Hero split; comfortable four curated home cards/three directory columns; menu contained; working tool visible |
| 1024 | Desktop header still fits at the chosen 960 cutoff; media/copy not cramped; field/result order clear |
| 768 | Mobile/tablet header, stacked hero and two directory columns; no older 760/768 header mismatch |
| 390 | One-column cards/tools, compact shell, 16px fields, usable software keyboard and working action reach |
| 320 | 288px approximate content width; no clipped names/timestamps/actions, preserved targets and readable hierarchy |

Also test 959/960/961 boundaries, short viewport heights, landscape, 200% text zoom and 400% page zoom/reflow around 320 CSS pixels where applicable. Breakpoints are starting contracts, not evidence that every text combination fits.

At narrow widths, reading/working order must match DOM/focus order. Do not CSS-reorder a warning after its action or make the preview visually first while tab order skips it. Avoid two competing scroll containers inside a tool; modal/menu gets one bounded region only when necessary.

Real mobile testing covers keyboard obstruction and input zoom, which desktop viewport screenshots cannot certify. Run a screen-reader spot check on search, upload/error state, editor validation and overlap repair result. No WCAG conformance claim is made by this plan alone.

## 17. Security/privacy and future-account boundaries

### Current browser-local tools

| Area | Later implementation constraint |
| --- | --- |
| Local-processing wording | “This file is processed in your browser and is not sent to our servers.” State host/theme/support/analytics handling separately |
| Analytics | No caption contents, file payloads or full filenames. Avoid session replay in editor workspaces and unnecessary third-party scripts |
| Filename/query display | React/text rendering only; safe truncation/wrapping. No raw user content inserted into HTML |
| Downloads/ZIP filenames | Preserve tested normalization and suffix handling; review control/path separators/long names with fixtures. No treating a filename as a filesystem path or executable URL |
| Subtitle content | Editable/displayed as text, not rendered script/HTML. SRT/VTT tags are data unless a deliberately safe rendering model is separately built |
| File validation | Keep extension/content/size/count validation and stale-read safeguards. accept is only picker guidance, not validation |
| Secrets | No API/provider credentials in browser code or NEXT_PUBLIC variables. Current tools need no secret-bearing integration |
| Fonts/media/resources | Licensed same-origin fonts; deliberate demo resources; no unneeded remote embeds or font requests |
| CSP/security headers | Review actual host/Next requirements, trusted theme-init script, font/media sources and Blob downloads; test a policy before enforcement |
| Theme-init inline code | Existing static trusted initialization is distinct from user HTML. Preserve no-flash behavior; evaluate a hash/nonce strategy with rendering/cache effects instead of enabling broad unsafe-inline without review |
| Support | Request non-sensitive reproduction details first; no automatic attached subtitle upload |
| Privacy statements | Describe actual behavior only. No blanket “no network requests,” “anonymous forever” or “never stores anything” marketing claim |

Do not add storage of caption drafts to localStorage/IndexedDB during a visual pass. The scoped same-tab memory recovery discussed for history safety is not cloud storage or durable saving; explain session limitations accurately.

### Future accounts — no V1 UI or implementation

Architecture only needs public tool routes, a flexible utilities area and capability/processing metadata. Add no auth provider/dependency/database/session plumbing for speculative use.

Later email/Google sign-in can support preferences/favorites or genuinely valuable cloud projects. Onboarding is optional, skippable and useful only after multiple released categories; broad choices can follow the audit (content/video, design/images, marketing/social, office/documents, development, personal, something else). Do not hide the full directory by preference.

Subscriptions/limits are justified by actual cloud/API/storage/batch value or cost, not by artificial caps on cheap local conversions. Login must not silently change current file processing from local to cloud. Existing tools remain anonymously usable.

## 18. Controlled implementation phases

### Sequence and change control

Use eight phases, with **P0 safety moved into Phase 2**. This differs from the suggested late safety phase because the rebuilt navigation creates more editor departure paths. Merger expectation correction should also precede visual polish.

**Sequence:** 1 Foundations → 2 Safety/expectations → 3 Navigation/discovery → 4 Homepage → 5 Trust/recovery/SEO → 6 Individual tools → 7 Full verification → 8 Repository/release readiness.

Testing and responsive checks run within every phase; Phase 7 is the integrated sign-off, not the first time anyone uses a file. Public launch remains blocked until P0 work and production evidence are complete.

Before later coding, capture a scoped baseline/snapshot of affected files and existing fixtures. Git initialization waits until its separately scoped stage; no need to initialize it merely to begin a visual phase. A rollback restores only that phase’s files/changes, not the entire workspace or unrelated user work. Keep approved reference, audit and this plan untouched.

Each phase ends with an actual change summary and evidence. Do not automatically bundle several phases into one “redesign” implementation request.

### Phase 1 — Design tokens, typography and shared visual foundations

**Outcome:** The existing screens express the orange/teal/light direction and intentional dark companion, with compact shell typography and reliable basic states.

**Likely files:** Exact bounded list in section 19.

**Scope:** Semantic palette migration; font roles/self-hosting; control/text/focus/state styling; compact tool header foundation; card/icon/spacing primitives. Keep component APIs and tool routes. No homepage order/navigation rebuild/algorithm edits.

**Functionality risk:** Medium because CSS is global and --on-accent currently serves both buttons and icons. New fonts can change wrapping. Theme-init must still run before paint.

**Required tests:** All existing tests; theme.test.mjs; expanded theme-contrast.test.mjs for true role pairs; lint/typecheck; production build for font/API compatibility during the later coding task. No new test dependency.

**Visual checks:** All seven tools plus home in light/dark at 1440/1024/768/390/320; open menu/search; buttons, fields, selected/disabled/busy and all feedback states; long names; mobile input focus. Existing content order is not judged as final V1 yet.

**Rollback boundary:** CSS/token/font/layout/shared-header appearance only. Restore prior palette/font wiring together if contrast or functional smoke fails; no session/algorithm change to undo.

**Exit gate:** Section 20. Phase 2 is not authorized by calling Phase 1 complete.

### Phase 2 — P0 editor safety and merger timing expectations

**Outcome:** Ordinary internal navigation does not silently discard edited work; browser-supported unload protection is active; merger limitations are honest at the point of use.

**Likely files:** New site/navigation-safety-provider.tsx and guarded-link.tsx; layout.tsx; header/footer; tools/tool-layout.tsx; editor workspace; relevant page links; merger workspace/gap labels/page metadata; tools.ts wording. Optional isolated memory retainer only if history tests demonstrate need.

**Functionality risk:** High for navigation and dirty-state lifecycle; low for wording, with output correctness still protected.

**Required tests:** Editor session/history/dirty tests; focused guard decision tests if an extractable helper exists; merge/session suite. Real browser tests for logo, menu, search result, breadcrumb, related/footer links, same-page anchors, new-tab/download exceptions, Back/Forward and refresh/close. Existing parsing/output suites all remain.

**Visual checks:** Safe initial dialog focus, Escape/cancel return, readable leave warning in both themes/mobile; merger timing note clearly visible before download.

**Rollback boundary:** Isolated guard integration and merger copy/placement. If safety cannot be verified, keep the release blocked; do not remove protection simply to claim the phase passed.

### Phase 3 — Header, navigation, /tools and category page

**Outcome:** All discovery routes consistently reach real tools.

**Likely files:** site/header.tsx; optional site/tools-navigation.tsx/search-dialog.tsx; lib/tools.ts presentation/search fields; new app/tools/page.tsx and app/tools/subtitle-tools/page.tsx; new components/tools/tool-directory.tsx or a small discovery component; home/tool-card.tsx reuse/adaptation; tools/tool-layout.tsx breadcrumb destinations; globals.css.

**Functionality risk:** Medium: active state, menu/modal focus, search matching, guarded navigation and server/client composition.

**Required tests:** tools.test.mjs updated with seven released entries, group/category/count consistency, meaningful aliases and no empty public categories. Real routing/focus/search zero-result/clear checks. Typecheck/lint and build for any new client boundary.

**Visual checks:** Desktop two-column menu, 960 breakpoint, small-height menu, mobile single-scroll panel, search keyboard, three/two/one directory columns and category task guidance.

**Rollback boundary:** New discovery routes and nav/search integration as one coherent unit. Do not leave header links pointing to a rolled-back /tools route. Restore breadcrumb destinations coherently.

### Phase 4 — Homepage integration

**Outcome:** Literal current-product hero, one CTA, four useful tools and concise useful sections.

**Likely files:** app/page.tsx; home/tool-card.tsx, hero-video-placeholder.tsx, home-faq.tsx, featured-srt.tsx; optional small trust/task components; real public/demo image asset if available; globals.css.

**Functionality risk:** Low–medium: curation/count links, image sizing and native FAQ semantics.

**Required tests:** Registry curation/count behavior if logic added; HTTP/HTML check for one H1, actual links and one hero primary CTA. No tests that merely mirror JSX paragraphs.

**Visual checks:** Reference language quality, desktop right-side 16:9 media/mobile below, no fake play, four readable cards, practical example excluded if redundant, reduced text/scroll, FAQ expansion and final CTA.

**Rollback boundary:** Homepage/content/media only; discovery and P0 safety remain independently integrated.

### Phase 5 — Footer, truthful support, recovery and SEO

**Outcome:** Credible real destinations and crawl/share identity.

**Likely files:** site/footer.tsx; new app/about/page.tsx, help/page.tsx, privacy/page.tsx and appropriate terms/page.tsx; app/not-found.tsx and appropriately scoped error.tsx; layout.tsx/root and page metadata; new app/robots.ts, sitemap.ts and one reviewed origin helper if needed; favicon/icon/touch/share assets; CSS. Exact operator/domain facts are inputs, not fabricated placeholders.

**Functionality risk:** Medium: incorrect origin/indexing, framework error boundaries, asset/metadata precedence and recovery losing in-memory work.

**Required tests:** Route status and actual links; one H1/meaningful headings; no starter icon conflict; canonical/sitemap/robots/sharing output when a real origin is supplied; proper 404; recovery flow and guard exceptions. Build against installed Next guides.

**Visual checks:** Footer hierarchy at all widths; readable legal/help prose; concise 404/error state; browser tab identity/social-image readability; dark equivalents.

**Rollback boundary:** Support/recovery/metadata/assets/footer set. Do not publish placeholder policies or leave broken footer links. Domain-specific settings remain deferred until Phase 8 if origin is still unknown.

### Phase 6 — Tool-by-tool refinement

**Outcome:** Each task has its own comfortable working layout and truthful inspection.

**Likely files:** The seven individual file lists in section 11, their page descriptions and scoped CSS; shared upload/privacy/download presentation only where a repeated contract justifies it. Do not change library algorithms for style.

**Recommended internal order:** Converter → Timing → Splitter → Merger → Sync → Overlap → Editor. P0 editor safety already exists; editor visual work is last because it has the greatest interaction surface. Complete one tool and verify before proceeding to the next.

**Functionality risk:** Converter low; Timing/Splitter/Merger medium; Sync/Overlap/Editor high. New Earlier/Later presentation must map accurately to existing signed values.

**Required tests:** Relevant existing session and library suites, meaningful tests for any new adapter/safety integration, real upload/result/download reopening for each tool. Existing limits, output semantics and negative/partial states must remain explicit. If interoperability demands an output change, scope it separately with expected fixtures before coding.

**Visual checks:** Empty/loaded/error/busy/result states, long filenames, readable meaningful warning before action, correct mobile order, short shell, no forced preview, purposeful differences across pages.

**Rollback boundary:** One tool at a time, including its scoped CSS/copy. Keep completed prior tools and shared tokens. If touching a shared primitive, smoke all seven before accepting.

### Phase 7 — Integrated responsive, accessibility and manual QA

**Outcome:** Actual evidence of task completion, not screenshots alone.

**Likely files:** Normally no application changes unless defects are found; artifacts/v1-manual-qa.md and non-sensitive result/screenshot evidence; existing/new meaningful regression tests for confirmed defects. Fixes belong to their originating phase boundary.

**Functionality risk:** Verification itself low; discovered correctness/safety defects can be high.

**Required tests:** Full existing suite, lint/typecheck and production build/start; real-file matrix in section 14.3; downloaded output inspection; file limits/stale states; editor navigation; mobile touch/keyboard; screen-reader/focus/zoom/reduced-motion checks.

**Visual checks:** Every real page and meaningful tool state across the five widths and both themes; 960 boundary; realistic mobile keyboard/chrome; menu/dialog clipping; no overflow hidden as a workaround. Record performance of realistic large files on a phone and identify actual bottlenecks.

**Rollback boundary:** QA artifacts independent; revert only failed originating changes. No disabled tests, fake passing screenshots or “passes except the download” sign-off. If browser automation is unavailable, a documented real manual pass is still required.

### Phase 8 — Git/GitHub and reproducible production readiness

**Outcome:** A clean, recoverable release candidate, ready for a separately authorized deployment step.

**Likely files:** README.md, .gitignore refinements, runtime pin such as .nvmrc/.node-version, optional future .env.example with names only, CI file if chosen, final-origin/host configuration only when actual host/domain are known. Git metadata, remote and hosting operations are later actions, not part of this plan’s changes.

**Functionality risk:** High operational impact: build/runtime incompatibility, exposed credentials, wrong indexing origin or accidental automatic production deploy.

**Required tests:** Curated repository/ignore and secret review; clean-checkout lockfile installation; Node 24 lint/typecheck/tests/build/start; direct route refresh; assets/404/canonical/robots/sitemap; real downloads on target environment; known rollback. Do not assume prior .next output is reproducible evidence.

**Visual checks:** Production page identity, font delivery, metadata/social preview, no development indicators and actual device checks.

**Rollback boundary:** Runtime/repository/release configuration; deployments have a known prior release. Deployment/domain connection is a separate future scope and is not executed automatically at phase completion. Verify then-current [Hostinger deployment guidance](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) and the actual compatible plan.

## 19. Exact first implementation phase recommendation

**Begin with Phase 1 only: semantic token migration, self-hosted typography and compact shared visual foundations.**

Keep the current working layouts/route destinations until their assigned phases. Do not use this first pass to rebuild the homepage, mega-menu, editor history, file upload handlers or preview components.

### Bounded expected change list

| Path | Later Phase 1 change |
| --- | --- |
| src/app/globals.css | Orange/teal/neutral semantic roles in both themes; split action/icon/nav/contrast/footer roles; typography/spacing/radius/focus/form/status/icon styles; compact shell sizing |
| src/app/layout.tsx | Built-in local font wiring only; preserve theme-init, skip link, server composition and current metadata until its assigned phase |
| src/components/tools/tool-layout.tsx | Minimal header class/markup refinement if needed for compact typography; preserve props, children, breadcrumb routes and working component composition |
| tests/theme-contrast.test.mjs | Retarget overloaded color assertions to actual action/icon/nav/footer roles and extend meaningful state coverage; keep text/nontext thresholds |
| src/app/fonts/sora-latin-variable.woff2 — new | Verified licensed self-hosted heading font, acquired only in later implementation |
| src/app/fonts/inter-latin-variable.woff2 — new | Verified licensed self-hosted body font |
| src/app/fonts/Sora.LICENSE.txt — new | Actual upstream license/attribution content |
| src/app/fonts/Inter.LICENSE.txt — new | Actual upstream license/attribution content |

This is **four existing files and four proposed font/license assets**, not an open-ended shared-components rewrite. If the header compaction is fully possible with CSS, leave tool-layout.tsx unchanged and report that smaller diff. No font asset is present or downloaded by this planning task.

Expected unchanged in Phase 1: package.json/package-lock.json, next.config.ts, lib/theme.ts, theme-toggle.tsx behavior, lib/tools.ts, all parsing/transformation files, all session reducers, tool handlers and existing functional tests. Header/footer content and new page routes wait.

### Critical migration details

Current --on-accent is used for filled buttons **and** icon strokes. Changing it to dark text globally would break dark teal tiles. Resolve actual consumers deliberately:

| Current coupling | Intended resolution |
| --- | --- |
| --action follows --accent | Separate orange action from teal link/focus/selection |
| --on-accent shared by actions/icons | Introduce --on-action dark text; icon foreground has its own role/contrast pair. Migrate affected selectors |
| --contrast-surface and --video-surface follow footer | Separate dark contrast/media surfaces from the light footer surface |
| Legacy --icon-blue/medium/deep | Map to restrained neutral/teal treatments with explicit readable icon strokes, not arbitrary all-orange fills |
| --navy-muted reused across dark areas | Map to dedicated on-dark supporting text; do not apply light-page --muted to dark nav |
| Reference faint text | Decorative only; essential footer/status helpers use readable supporting text |
| Faint decorative lines reused as fields | Keep control-border strong enough independently |

The existing contrast test already resolves CSS variable aliases and checks useful action/state/field pairs. Keep that capability. Updating a test because roles split is legitimate; lowering its 4.5:1 text or 3:1 nontext targets to accept a bad palette is not.

**Expected review artifact after later Phase 1:** limited diff, light/dark baseline screenshots at the five widths, state/contrast results, existing seven-tool smoke results and a statement of any unresolved font/browser issue. No claim that the final homepage or launch blockers are complete.

## 20. Acceptance checklist before moving to Phase 2

This is the Phase 1 exit gate, not a public-launch checklist.

### Scope and source integrity

- [ ] Only the bounded Phase 1 files/assets changed; any exception is documented before widening scope.
- [ ] Boss reference, audit and plan are unchanged.
- [ ] No tool URL, parser, serializer, session reducer, defaults, limits, download behavior or transformation algorithm changed.
- [ ] No dependency added/installed as part of an unnecessary design framework; no auth/pricing/new tool, Git initialization or deployment.
- [ ] Existing tests remain; no assertions skipped/deleted merely to obtain green status.

### Visual foundation

- [ ] Primary orange actions, teal supporting roles and green-neutral/white surfaces replace the old blue-led direction.
- [ ] Dark surfaces are intentionally designed; action, icon and on-dark text roles are independent and readable.
- [ ] Sora/Inter licensed self-hosting is verified, or any fallback gap is explicitly unresolved rather than called a final typography pass.
- [ ] No visitor-side font request to Google/other third-party source; fallback/non-Latin glyphs are readable.
- [ ] Meaningful text, hover/pressed, fields, icon strokes, warning/error/success and focus pairs meet required contrast.
- [ ] Essential helper text is readable; touch targets remain at least 44px.
- [ ] Tool headings are compact; working controls remain available, with no new universal preview/stepper.
- [ ] Light/dark states reviewed at 1440, 1024, 768, 390 and 320; long filenames/expanded menus/dialogs do not clip.

### Functional regression and theme preservation

- [ ] Existing full suite passes. The audit baseline was 392 tests; use the actual current count and retain its coverage.
- [ ] theme.test.mjs and revised meaningful contrast checks pass without lowered thresholds.
- [ ] Lint/typecheck and later production build pass, including font loading and installed-framework compatibility.
- [ ] Theme default/manual/storage-disabled/cross-tab behavior remains; no first-paint flash or hydration regression.
- [ ] Keyboard focus, skip link, native disclosure/modal behavior and reduced motion remain.
- [ ] Each existing tool still accepts a valid fixture and initiates the correct current-result download; especially converter remains preview-free.
- [ ] Any missing fresh browser evidence is marked pending; historical screenshots cannot satisfy this gate.

### Controlled next step

- [ ] Phase 1 changes can be restored from their scoped baseline without losing unrelated files.
- [ ] P0 editor safety and merger wording remain explicitly queued for Phase 2, not forgotten behind a completed visual pass.
- [ ] Phase 1 review is complete before a separate Phase 2 implementation begins.

## Planning record and source integrity

The reference and audit were read in full, and current foundation/test files were inspected to ground the file scope. Relevant installed Next 16.3.8 guides inspected include Link/onNavigate/navigation-blocking examples, App Router useRouter and built-in font optimization. Before later metadata/error/deployment coding, reread the corresponding installed guides as AGENTS.md requires.

This task runs no dependency install, build, Git initialization, deployment or implementation tests. The reported 392-test pass is the audit’s previous result, not a new run here. New source-level color contrast calculations are planning checks only.

The sole intentional project addition is **artifacts/v1-design-integration-plan.md**. Application files, approved reference and existing audit remain unchanged.

