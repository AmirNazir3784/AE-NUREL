# Article #1: local implementation review

Date: 29 October 2026. Initial implementation was a local draft. The owner subsequently authorized publication to both repositories and the connected live deployment; see the release record below for current scope. Deployment must still be verified independently of a successful push.

- ID: `audio-to-text-guide`.
- Proposed slug: `convert-audio-to-text-online-free`.
- Local article: `http://localhost:3000/blog/convert-audio-to-text-online-free`.
- Directory preview: `http://localhost:3000/blog`.
- Category: Audio Transcription.
- Primary intent: practical beginner guide to choosing and using free file transcription; primary phrase `convert audio to text online free`.
- Secondary terms: MP3 to text, WAV to text, voice recording transcription, free transcript exports.
- Production canonical prepared: `https://aenural.com/blog/convert-audio-to-text-online-free`.
- Release attribution: AENural (Organization); publication date 29 October 2026, following the owner's explicit publication instruction. No individual author biography is invented.

## Content preservation and approved correction

[Approved copy](article-001-approved-copy.md) preserves the supplied text with one substantive change explicitly approved by the owner in this session:

- Original: “WAV recordings preserve more detail but can be larger.”
- Approved replacement: “Uncompressed PCM WAV recordings avoid lossy compression but can be larger.”
- Reason: WAV is a wrapper that may contain different encodings. [Library of Congress WAVE](https://www.loc.gov/preservation/digital/formats/fdd/fdd000001.shtml) and [LPCM WAVE](https://www.loc.gov/preservation/digital/formats/fdd/fdd000002.shtml), checked 29 October 2026.

At the owner's later explicit wording instruction, Step 1's linked “browser-based service” became “audio-to-text converter” and the implementation-focused privacy paragraph became a practical file-handling/retention/deletion checklist. These are recorded in the approved-copy file. Added navigation, a static workflow illustration, format labels, external references and a tool-action label are interface elements. All five supplied FAQs remain. No fabricated individual author, statistics, FAQ answer, testimonial or related article was added.

Verified external references linked in context:

- [Apple sharing instructions](https://support.apple.com/guide/iphone/iph3d6dc359/ios) support the M4A statement; use a rendered recording when editable/spatial sharing options differ.
- [Google Docs voice typing](https://support.google.com/docs/answer/4492226?hl=en) documents microphone dictation.
- Library of Congress LPCM reference supports the approved WAV clarification.

## Tool and search-intent review

CTA points to the existing public audio transcription tool's `#tool` section. Inspected source accepts MP3, PCM WAV, M4A, AAC, FLAC and OGG subject to browser decoding, caps input at 4 GiB / five hours and provides TXT/SRT/VTT review exports. These source constraints are not extra promises inserted into the article. Speaker labels are described conditionally for services generally; no AENural diarization promise was added. No paid API, model-runtime import, audio processing change or account/payment edit.

Overlap warning: the existing audio tool landing page already contains extensive educational copy on similar themes. This blog is the short beginner workflow; the tool remains the transactional destination. Avoid additional near-identical MP3/free-audio guides from the 50-title backlog unless they deliver a distinct task. Do not silently rewrite the existing tool page to solve overlap. Monitor actual queries/landing pages after an approved release.

## Implementation and initial draft boundary

Typed registry drives the directory, readable slug list, related published articles and sitemap. Trusted content modules register once in `content.tsx`; shared routes/layout need no article-specific edits. Metadata is separate from content imports so sitemap generation does not import the body or media tools. Article-specific visuals are optional; later guides can omit/replace the audio illustration without cloning the layout.

Draft reads are allowed only when `NODE_ENV === "development"`. Before publication approval, this article was noindex/nofollow in development, absent from production and excluded from the sitemap. Unknown slugs continue to return 404. At the owner's subsequent explicit request, desktop and mobile header About/Help shortcuts were replaced by Blog; existing footer links remain. The owner then explicitly authorized publication. Published-only Article/Breadcrumb JSON-LD is safely escaped; no FAQ schema is emitted.

The owner authorized this release to Faisal and AmirNazir. Article #1 is now marked published for the approved release. Step 1's “browser-based service” links contextually to AENural's transcription tool at the owner's request. See [release record](../releases/2026-10-29-tools-blog.md) for final repository/deployment evidence. No Search Console submission is part of this release.

## Validation evidence

- Typecheck and optimized production build passed. Project ESLint completed with zero errors and four existing warnings in unrelated files.
- Fifteen focused publication, sitemap, theme and contrast tests passed. Header/menu and navigation tests were additionally run after the requested header update.
- HTTP on a production-mode loopback server: draft article 404/noindex, unknown article 404/noindex, directory 200/noindex without draft content, sitemap 200/application-xml with 26 existing URLs and no blog/draft entry, robots 200.
- Development HTTP: draft article 200/noindex-nofollow; all 37 approved source headings/text blocks found in rendered article HTML, one H1, no duplicate IDs, five original FAQs, and no transcription/model scripts imported by the blog page.
- Real Chrome: directory card opens article; section anchors resolve; mobile TOC opens; FAQ opens with click and closes with keyboard Enter; tool CTA opens existing uploader; desktop and mobile Blog navigation works, with About/Help retained in footer.
- CSS viewports 320, 390, 768 and 1440px: no whole-page horizontal overflow observed. Shared light/dark palette contrast tests passed; a separate dark-mode browser rendering, screen-reader session and Lighthouse run were not performed. No field performance claim is made.
- Existing transcription algorithms were inspected but not changed or re-benchmarked; a fresh model/transcription/export run was not part of this article-page test. Tool CTA verification establishes navigation to the actual uploader, not a new accuracy benchmark.
