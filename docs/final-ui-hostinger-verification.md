# UI finishing and Hostinger build verification

Completed local verification 15 October 2026. No commit, push, database change or deployment. Existing work and AI/authentication release holds remain intact.

## Confirmed causes and fixes

- **Modal:** an invisible U+FEFF before the first CSS-module selector became part of the emitted selector. The native dialog opened at x=0/y=0 because its root styles did not match. Removed the character; explicitly set fixed positioning, inset=0, auto margins, bounded width/height and internal scrolling. Focus restoration handles a trigger hidden by viewport resizing. Login/signup/recovery, validation and password reveal remain functional; unavailable account submissions send/save nothing.
- **Build:** Webpack reproduced Hostinger's cssnano `Parser.attribute` exception at generated line 22, column 75448. Upstream optimization changed quoted `[aria-label^="Delete "]` / `[aria-label^="Remove "]` into unquoted escaped-space selectors `[aria-label^=Delete\ ]` / `[aria-label^=Remove\ ]` inside `:is()`. The generated rules fail in the actual bundled minifier; original quoted rules pass. Replaced these two rules with `.destructive-action` and added that class to the same editor Delete and merger Remove buttons. Specificity, declarations, accessible labels and disabled behavior are preserved. Minification stays enabled. Matching failure class: [Next issue 76269](https://github.com/vercel/next.js/issues/76269).
- **Build engine:** `npm run build` now runs `next build --webpack`. Local Turbopack passed on Node 24.21.0; original Hostinger Turbopack panic was not reproduced. Verified Webpack avoids that reported environment-specific failure. No sync stylesheet rewrite or Next downgrade.
- **Copy/directory:** removed developer preview badges/metadata from held audio pages. Account-unavailable copy remains short and truthful. Removed the entire requested All Tools “Free online utilities” intro and its four category buttons, retaining groups, cards, routes, collection links and free-tools anchor. Internal lab diagnostics stay internal.
- **Logo:** original supplied PNG unchanged. Per user clarification, created an alpha derivative removing only exact black background pixels. 875,040 black pixels removed; **zero nonblack artwork pixels changed**. Shared header/footer/brand and icon metadata use it without duplicate lettering or distortion. Both PNGs served byte-for-byte correctly.

## Verified evidence

- Fresh **Node 22.22.2 / Next 16.3.8 / React 19.2.8** Webpack production build passes; also passed on Node 24.21.0. `SITE_URL=https://aenural.com` supplied for final build. No stale Webpack output used.
- **716 tests / 87 suites**, zero failures/skips, on Node 22 and Node 24. Includes actual minifier reproducer, selector equivalence, React modal interactions/hydration and gates. ESLint and `npx tsc --noEmit` pass. DOM tests shim native dialog/layout; browser evidence below checks actual rendering.
- `npm run start` under Node 22 honors `PORT=3107`. HTTP checks pass for homepage, All Tools, Source Window and **all 16 public tools**. Linked CSS and official PNGs return 200. Sitemap uses production domain. Held AI routes, internal lab and nonexistent auth endpoint return 404; unfinished tools/account entries excluded from production search/directory/sitemap.
- Native light/dark modal measured at **1440×900, 390×844, 320×640**, centered within 0.01px, no horizontal overflow. At 320×640 content scrolls within a 608px dialog envelope. User disabled Dark Reader; native live theme changes observed. Final dark desktop/mobile captures include transparent logo.
- Browser checked login/signup/recovery transitions, reveal, validation, close, Escape, Tab/Shift+Tab containment, opening after scrolling, mobile trigger and focus return. Final real backdrop click closes dialog, unlocks scrolling and focuses visible navigation trigger; desktop close restores Sign in focus. Final browser error log empty.
- Production homepage, directory, Sync Fixer and SRT-to-VTT inspected at desktop/narrow widths; recorded 4-page × 3-viewport dark-mode matrix has no horizontal overflow. Header and scrolled footer visibly show supplied logo without black rectangle. Representative QA, not every page/device in both modes or screen-reader certification.
- Actual production SRT-to-VTT upload/download verified with harmless two-cue fixture. Chrome saved `sample.vtt`; actual file contains WEBVTT, both original texts and correct period-millisecond timestamps (1–3s, 5–7s). Download-event notification timed out, but saved file was located/read; success is not inferred from editor alone.

Ignored evidence: `artifacts/final-ui/` (screenshots, measurements, production matrix, downloaded VTT); `artifacts/prelaunch/` (failing/fixed/fresh build logs, tests/lint/typecheck, logo pixel/hash proof, HTTP results). Reproduce HTTP checks with `node scripts/prelaunch/verify-auth-preview.mjs` while production server runs on port 3107.

## Hostinger settings to verify

| Setting | Value |
| --- | --- |
| Intended repository / branch | `AmirNazir3784/AE-NUREL` / `main`; verify corrected source is actually present |
| Project root | `.` (package.json directory) |
| Node | 22; local verification used **22.22.2** |
| Install | `npm ci --include=dev` (build dependencies required) |
| Build | `npm run build` |
| Start | `npm run start` |
| Output | Default `.next`, full Node app; no static export/out |
| Environment names | `NODE_ENV` production; `SITE_URL` https://aenural.com; Hostinger-provided `PORT` |

No database/auth/AI secrets needed for current public site. Node patch level matters for running test-only jsdom; 22.22.2 is tested. Do not force development mode to expose unfinished features.

Official references checked during assignment: [Hostinger Node deployment](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/), [redeployment settings](https://www.hostinger.com/support/how-to-redeploy-a-node-js-application/), [Next CLI/PORT](https://nextjs.org/docs/app/api-reference/cli/next), [Next Node deployment](https://nextjs.org/docs/app/getting-started/deploying).

## External issues and status

**BUILD READY locally. Live deployment unchanged/unverified.** Actual live browser showed Hostinger's “You Are All Set to Go!” placeholder, a separate routing/deployment issue. Verify latest successful deployment/revision, Node runtime/start/injected port, domain assigned to Node app, DNS/HTTPS and routing away from default placeholder site.

Read-only Git inspection found local origin **faisalhere-afk/aenural-website.git**, unlike intended Hostinger repository above. No remote changed; fixes remain uncommitted. Confirm which repository Hostinger deploys before user backup/deployment. Local build does not update GitHub/live domain.

Real authentication remains blocked on documented MySQL/email prerequisites. AI semantic release hold remains. Master-plan security/integration phases are not claimed complete by this focused verification.
