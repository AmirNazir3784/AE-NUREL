# Production release — 29 October 2026

The owner explicitly authorized publishing completed video tools and supplied blogs to Faisal and AmirNazir so changes become live, superseding the earlier production hold. The owner also asked to rely on existing media export evidence and stop repeating exports; no additional cropper/green-screen exports were run after that instruction.

## Included

- Video Compressor, Video Cropper and Free Green Screen Remover: remove development/QA route restrictions, enable indexing and register the three existing tools in public discovery, header groups, search and sitemap.
- Existing 16 subtitle tools remain available and in their existing order. Subtitle-specific directory groups remain subtitle-specific; video tools have a separate public group.
- Blog directory and Article #1, shared server-rendered templates, static publication registry, unique metadata/canonical, safely escaped BlogPosting/Breadcrumb markup, published-only sitemap entries and real 404 behavior.
- Owner-supplied article preserved, with explicitly approved PCM WAV clarification. Step 1 has the requested contextual AENural tool link. References point to official Apple, Google and Library of Congress documentation; they are outbound citations, not acquired backlinks.
- Desktop/mobile header Blog replaces About/Help; those destinations remain in the footer.
- Four reusable research/design/SEO/publishing references and 50-title writing backlog saved in docs. Future supplied articles reuse this system.

Auto Caption, Lyrics and Podcast previews are not released by this change. Account/payment settings, credentials, databases, tool algorithms and installed dependencies were not changed. Generated screenshots, recordings and QA logs remain ignored.

## Validation

- **942 tests passed, zero failures** in the final complete test suite, including the new independent edge-resize geometry test.
- Existing discovery tests now reflect 19 public tools and the 31-URL sitemap. The three previously failing caption-highlighting tests matched label text including incidental whitespace; selectors now trim it. All 20 highlighting tests pass without changing caption functionality or access controls.
- Optimized production build including TypeScript passed. ESLint: zero errors, four existing unused-variable warnings outside this release's feature code.
- Loopback production HTTP: all three video tools, `/blog` and Article #1 return 200, index/follow and correct HTTPS canonicals. Unknown article returns 404/noindex. Sitemap: 200, application/xml, 31 unique entries, including approved article/directory/video tools. BlogPosting/Breadcrumb JSON parses.
- Real browser article tests: directory navigation, TOC, FAQs with keyboard, contextual CTA/uploader, header/mobile Blog navigation, and 320/390/768/1440px overflow checks. All 37 approved source headings/text blocks are present. Original five FAQs retained.
- Existing completed export evidence: [compressor](../video-tools-plan.md), [cropper](../video-cropper-qa.md), [green screen](../green-screen-remover-qa.md). Includes real downloaded files, audio/timeline preservation, crop pixels, 4K keying and transparent PNG validation. Prior evidence is not an all-browser or maximum-duration guarantee.
- One fresh optimized-build compressor run additionally completed: original generated 3840×2160, 3-second sample exported as playable 3840×2160 MP4, about 1.04 MB versus 2.04 MB source. The owner then requested stopping repeated export checks.
- Shared theme contrast tests pass. No new Lighthouse/field-CWV, screen-reader or physical-phone certification is claimed.
- Owner-reported cropper usability fix: Free mode has four edge handles plus four corners, directional resize cursors, a high-contrast boundary and pointer focus without page scrolling. Real-browser right-edge drag changed width from 1206 to 1638 while height stayed 2144; keyboard Left reduced width to 1636. Locked ratio presets retain corner-only proportional resizing. No export was repeated for this interaction-only fix.

## Repository and deployment evidence

Before release, Faisal main and development branch were `28162d0`; Amir main was `b7ddfc7`. Amir's tip is an ancestor of the completed video tool baseline. Fetch showed no remote divergence requiring overwriting work. Pushes must be normal fast-forwards, with no force option.

Final commit, remote tips and live verification results are recorded after the actual operations. A push alone must not be reported as a verified live deployment.

### Verified first release

Release commit `64a76e9` was pushed normally to Faisal main/development and Amir main; local main was fast-forwarded to the same commit. All five new public routes returned live HTTP 200 with correct canonicals and indexing metadata, the live sitemap contained 31 URLs, and the contextual Step 1 link was present. Live Chrome displayed the new Blog header and all eight Free-mode crop controls with correct directional cursors on a 3840×2160 sample. No repeated export was performed.

### Owner-requested wording follow-up

The owner then explicitly requested removing browser/device-processing descriptions from article instructions and ordinary tool interfaces. Article #1 now links “audio-to-text converter”; its privacy paragraph asks readers to check file handling, retention and deletion. Progress and tool summaries focus on tasks and results. Formal privacy policy and actual optional-upload consent remain accurate, and algorithms/mode values/access rules are unchanged. The preference is saved in AGENTS.md. Future articles will be supplied individually as DOCX files and use the saved editorial/design references without repeating the full competitor audit.
