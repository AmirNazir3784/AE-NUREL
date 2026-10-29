# AENural blog design system — proposed, not implemented

29 October 2026. Permanent reference for future article sessions. Read the [research](aenural-blog-competitor-research.md), [SEO strategy](aenural-blog-seo-strategy.md) and [workflow](aenural-blog-publishing-workflow.md) first. Preserve supplied writing and the existing site identity. These are original recommendations based on reader tasks; competitor layouts/assets must not be reproduced.

## Direction

An editorial workbench: calm reading area, clear navigation and useful examples, framed by AENural's existing orange actions, teal accents and dark navy/green shell. The premium quality comes from typography, spacing, precise instructions and working resources. No decorative dashboard, stock-photo requirement, animated hero, persistent sales sidebar, or repeated generic takeaways panel.

Reuse the current root layout, header/footer, skip link, `PageLink` conventions and semantic theme tokens. Blog styles should be scoped, e.g. `.aen-blog-*`; do not globally restyle tool pages or body typography. No authentication/payment changes.

## Existing tokens and proposed editorial scale

| Element | Existing foundation / proposed use |
| --- | --- |
| Heading/body fonts | Existing local Sora / Inter; no new font download. Use the existing Cascadia/Consolas stack for literal cue files. |
| Orange | `--action` equivalent existing value `#e07b1f`, hover `#c9661a`, dark action foreground `#160c02`. Use actual semantic variables, not a parallel palette. |
| Teal | Existing accent `#15766a`, filled `#1e8676`, soft `#eaf4f0`; dark accent around `#80d2c0`. Use for categories/notes/links where contrast passes. |
| Light surfaces | Background `#fff`, page `#f6f8f8`, foreground `#14201f`, muted `#5c6b69`. |
| Dark surfaces | Background `#0f1716`, page `#121d1a`, surface `#172422`, text `#f1f7f4`, muted `#b1c0bb`. Preserve existing theme mechanism. |
| Widths | Outer 1200px existing wrap; article prose 66–72ch, target about 720–760px; optional 220–240px TOC with 40–48px gap. Wide tables/figures may span the article area. |
| Body | Proposed 18px/1.75 desktop, 17px/1.7 mobile, relative units; never shrink tables below readable type to fit. |
| H1 | Proposed `clamp(2rem, 4vw, 3.5rem)`, line-height 1.12–1.2; wrap naturally, no forced line breaks for every article. |
| H2/H3 | H2 around 28–32px /1.25; H3 around 21–24px /1.35. Use rem/clamp; actual values validated against long supplied headings. |
| Spacing | Existing 4px-based scale: paragraphs 20–24px after, major sections 40–56px, H2 clear top spacing, related panels 32–48px. Mobile reduces section gaps to 32–40px. |
| Radius/borders | Existing control radius about 10px and main radius 16px. Use subtle surface borders and restrained shadows, not a card around every paragraph. |

Values above are design targets, not measured accessibility passes. Test text, muted labels, links, orange buttons, focus rings, code and table headers in both themes. Normal text should meet 4.5:1, large text and UI boundaries their applicable 3:1 requirements. Do not assume a brand color is readable on every surface.

## `/blog` directory

Reuse shared header → breadcrumb if context benefits → H1 “AENural Blog” → short statement of the tasks covered. No claims about article count until published.

One featured **published** article is chosen explicitly for usefulness, with category, headline, one-sentence description and real date. It can use an original explanatory visual or an elegant text-led panel; do not manufacture stock artwork or “Editor's pick” authority. With only one post, do not repeat it immediately as both feature and duplicate card.

Below it, render remaining published posts from the registry, newest publication first with a deterministic tie-break. Desktop three cards per row when titles remain readable; tablet two; narrow screens one. Cards use one meaningful heading link, category, concise original description approved by the owner, date and optional honest reading-time estimate. Avoid nested interactive elements or several redundant “Read more” links. Images are optional; use a consistent reserved aspect ratio when present, with intentional crop and no text baked into essential instructions.

Categories: Audio Transcription, Video to Text, Auto Captions, Subtitle Tutorials, Video & Audio Conversion. Show only categories containing published articles. At ten posts, a compact native category control can be useful if multiple categories exist; implement only if scanning is materially improved. No search box initially, empty category pages, tag clouds or pagination theater. At larger scale, add useful search/pagination after content growth demonstrates need; keep crawlable links and a full unfiltered server-rendered starting list.

Do not call client-filtered states separate indexable landing pages. A filter must have a visible label, current selection, reset action, useful no-match message and keyboard behavior; no forced page reload or focus loss. Keep all article links accessible without JavaScript.

## `/blog/[slug]` article structure

1. Breadcrumbs: Home → Blog → current title, with current item as text/`aria-current`. Optional category may be a directory filter link only if implemented and useful.
2. Category, H1 and supplied concise introduction. Present the answer early. If writing buries the answer, propose a summary for owner approval instead of silently inventing it.
3. Verified author/team attribution if supplied, publication date, and updated date only when materially changed. Reading time is optional and derived from visible content; never fake a person, review credential or publication history.
4. Hero visual only when useful: an original workflow diagram, output example or licensed/owned screenshot. Keep the first practical answer visible without a mandatory giant image.
5. Body with clear H2/H3 hierarchy, purposeful examples/figures/tables and contextual tool links. Add a TOC if roughly five or more useful major sections or substantial length warrants it; use judgment rather than a word-count SEO rule.
6. Ending: supplied conclusion, optional genuinely sourced FAQ not already answered verbatim, next practical action and two or three related published guides when available. No empty related slots.

### Navigation

Use an accessible `<nav aria-label="On this page">` with an ordered list of actual section anchors. Assign stable unique heading IDs; use an explicit section list shared with content modules rather than scraping rendered DOM. Add `scroll-margin-top` around 88–104px to account for existing sticky header; verify actual header height and browser zoom. TOC entries should identify the task, not merely “Step 1.”

At wide layouts a sticky TOC can sit below the site header, bounded by the article. At narrower than roughly 1100px, use a compact native `<details>` TOC near the introduction. It must remain reachable, keyboard operable and not cover text. Prefer native anchor navigation with no scroll listener; active-section highlighting is optional progressive enhancement. Back-to-top can be a simple end-of-article anchor for long guides. No default reading-progress bar: it adds little task value for the initial ten.

### Content patterns, not ten identical templates

| Article kind | Recommended modules |
| --- | --- |
| Beginner tutorial | Requirements → steps with expected result → one worked example → export/check → common failure. |
| Troubleshooting | Symptom checklist → diagnosis branches → targeted fix → verify beginning/middle/end → undo/backup notes. |
| Tool comparison | Disclose own-product relationship → criteria and test conditions → comparable table → scenario choices → limits. Do not award AENural first place without evidence. |
| Format comparison | Paired small cue examples → compatibility/loss table → task-specific recommendation → converter only when appropriate. |
| Educational explanation | Clear definition → original diagram/example → implications and boundaries → relevant next task. |

Choose modules after reading the whole supplied article. Do not insert every module into every page. Tables, headings, summaries and FAQ answers that add/substantially alter meaning need owner approval.

## Proposed reusable components

`BlogDirectory`, `FeaturedPost`, `PostCard`, `ArticleLayout`, `ArticleHeader`, `ArticleMeta`, `ArticleBreadcrumbs`, `ArticleToc`, `ArticleProse`, `Callout`, `StepList`, `Figure`, `ComparisonTable`, `CueExample`, `ResourceDownload`, `ToolRecommendation`, `RelatedPosts`.

Keep body/layout/card/metadata components server-rendered. Optional filter, copy control or TOC enhancement should be a small isolated client component. These names are a plan, not existing files or a requirement to create every abstraction for Article #1. Build only modules that actual supplied content needs.

### Tables and examples

Use real table markup, caption, scoped headers and meaningful row labels. A horizontally scrolling wrapper may be focusable with an accessible name and visible overflow cue. Do not clip columns or silently omit data on mobile. Narrow tables can become simple lists only if meaning and labels survive. Check long URLs and unbroken filenames wrap without page overflow.

Literal SRT/VTT blocks use `<pre><code>` with preserved punctuation and an accessible language/format label. Provide prose interpretation alongside technical examples. Copy buttons must copy exactly the displayed snippet, announce success politely, and handle failure. No syntax-highlighting dependency for a few caption examples. A static before/after pair is preferable to a slider requiring JS when the point is timing or conversion loss.

### Images, animation and downloads

Use owned/synthetic media and original diagrams. Screenshots must reflect a tested version, use no private recordings, and explain the relevant control in surrounding text/caption. Alt text communicates the image's purpose; redundant decorative images have empty alt. Reserve dimensions, responsive `sizes`, and optimize images using the existing Next pipeline. Load below-fold figures lazily; prioritize at most the real above-fold LCP image if warranted. Do not eager-load every card image or preload video tools/models.

No autoplay videos or animated captions required in blog pages. If movement teaches a point, provide pause/replay and equivalent text/still examples. Respect `prefers-reduced-motion`; no parallax or compulsory entrance animations.

Download only original, valid, tested files with readable filenames. Label format, purpose and size; explain intentional errors in diagnostic fixtures. Verify MIME/encoding and downloaded contents. No fake download control, competitor installer, executable, email gate or proprietary media. Download links are ordinary links; no analytics required to make them work.

## Tool conversion and trust

Provide a contextual text link exactly where the reader can act, then at most a purposeful tool panel or final action where the workflow benefits. No arbitrary CTA quota. One orange primary action per panel; teal/plain supporting links. Clear examples: “Shift subtitle timing,” “Convert SRT to VTT,” or “Edit subtitle text.” Never label SRT-to-MP4 as adding subtitles to an existing video.

Tool recommendations must resolve through a reviewed availability mapping. A live 200 preview or a localhost tool is insufficient. Show truthful limits before committing effort. Do not invent upload widgets inside an article that cannot perform the advertised task. A guide without an available AENural tool can still be useful with accurate instructions and verified official references.

## Acceptance criteria for future implementation

- Test 390px mobile, 768px tablet and 1440px desktop CSS widths; also 320px reflow, 200% zoom, long title and table overflow. Verify actual `innerWidth`, because browser zoom/viewport overrides can differ.
- Both themes: readable links/code/figures/tables, visible focus and no washed-out muted text.
- Keyboard: skip link, breadcrumb, TOC, filters, copy/download, related cards and header; natural order, no traps. Target comfortable ~44px controls where practical, never tiny icon-only actions.
- One page H1, logical H2/H3 order, correct landmarks; links meaningful without surrounding card visuals. Screen-reader spot check labels/headings/table association.
- No duplicate header/footer, hydration warnings, broken images, dead anchors, fake dates, layout shifts caused by unsized assets or tool-runtime imports.
- Article body and links render without waiting for interactive media libraries. Lighthouse/axe or equivalent checks supplement manual checks when available; results must record device/build/throttling conditions and cannot establish full accessibility compliance alone.

Outstanding before Article #1: supplied text and intended audience/task, confirmed author attribution, approved new summary/metadata wording where needed, and available original/appropriately licensed visuals. Use a text-first design if no visual is warranted; do not block on decorative artwork.
