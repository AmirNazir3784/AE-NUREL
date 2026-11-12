<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Active tool-completion workflow (28 October 2026)

- Work locally on `dev/tools-completion`, starting from the synchronized production baseline.
- Complete tools one at a time: page design, content, functionality, and real browser testing on localhost.
- During this phase, publish completed work only to `faisalhere-afk/aenural-website` (`origin`).
- Do not push, merge, deploy, or synchronize development changes to `AmirNazir3784/AE-NUREL` (`hostinger`) during this phase. Its connected Hostinger deployment must wait until the tools are complete and the final production release is authorized.
- Keep credentials and runtime databases private and excluded from Git.
- Tool development has no spending budget: use existing/free libraries and browser processing; do not buy services, use paid APIs, or add paid processing infrastructure.

## Authorized production workflow (29 October 2026)

- The owner explicitly authorized releasing completed video tools and supplied blog articles to both Faisal (`origin`) and AmirNazir (`hostinger`) so they become live. This supersedes the preceding production hold for completed, verified work.
- Publish only completed tools/articles after local functional/browser checks, relevant tests and an optimized build. Do not describe tests as proof of 100% reliability.
- Fast-forward the reviewed release to both repositories' `main` branches, preserve the development branch, and verify actual production responses after the connected deployment. Never force-push or overwrite remote work.
- Compressor, Cropper and Free Green Screen Remover are the completed video tools in this release. Auto Caption, Lyrics and Podcast previews remain unreleased unless separately completed and authorized.
- The header uses Blog instead of About/Help; those pages remain in the footer. Blog Article #1 includes a contextual link to the audio tool in Step 1. Use authoritative primary-source citations; never call outbound citations acquired backlinks.
- Keep credentials, runtime databases, private recordings and generated QA artifacts excluded from Git. The no-spending rule remains in force.

## Product wording preference (29 October 2026)

- Do not describe tools to users as browser-based, local, on-device, or processing on their computer. Keep ordinary tool UI, progress, navigation, marketing and blog instructions focused on the task and result (for example, “Compressing, please wait…”).
- Use “audio-to-text converter” for Article #1's contextual tool link. The owner explicitly requested removing the processing-location wording from the supplied article too.
- Keep privacy policies and any explicit upload consent accurate; never imply server processing or conceal an actual optional upload to satisfy this presentation preference. Processing algorithms, mode values and access controls stay unchanged.

## Current local review hold (30 October 2026)

- The owner updated the homepage/header design in both repositories and explicitly requested updating this PC before integrating the next tool's entry point. Both remote `main` branches and local `main`/`dev/tools-completion` were synchronized to `ecbb757` while preserving all uncommitted tool work.
- Preserve the updated Tools and Free Tools menu components and converter layouts. Integrate new tool links using that updated design.
- Continue completing and testing AI Eye Contact locally. Do not push any changes to either repository or deploy until the owner reviews the combined local version and explicitly instructs a new push. This supersedes earlier standing release authorization while this review hold is active.

## Competitor-first completion workflow (2 November 2026)

- Before planning or implementing each new tool, actually use its CaptionX counterpart with authorized public fixtures, record observations and identify useful original improvements. Do not claim unmeasured superiority. Complete and test one tool before moving to the next.
- Compress MP4, Reduce Video File Size, WhatsApp Compressor, MOV Compressor and Compress Image to 20KB now have local implementations and functional checks. Read `docs/compressor-competitor-research.md` and `docs/compression-tools-local-review.md` before further work. All remain under the local review/push hold above.

## Owner-authorized synchronization (3 November 2026)

- The owner explicitly requested fixing the blog's spacing and publishing all current local changes to both repositories. This supersedes the local push hold for this checked synchronization. Preserve private credentials, databases, recordings and generated QA artifacts outside Git.
- Publish the current implementation state, retaining existing preview/access restrictions; a repository synchronization is not evidence that every preview is a completed public product. Do not remove feature guards as an incidental consequence of pushing code.
- The blog autopilot is authorized for one original article per eligible Asia/Karachi day/run. Read `docs/blog/autopilot-workflow.md` and the four saved blog references. Reconcile the current private manifest and live article before starting another post. The owner requested actual screenshots with numbered instructions and consistent spacing.

## Owner-authorized 50-article publication (12 November 2026)

- The owner explicitly requested publishing all 50 prepared blog articles and waived browser/visual review for this release. This supersedes the batch's local-review publication hold. Mark browser interaction/responsive checks as waived/not performed, never passed.
- Preserve natural, useful keyword wording; do not force every workbook variant or make unsupported free/unlimited claims. Read the current blog workflow and coverage/release reports.
- Release the checked blog changes to both authorized repositories using the existing Hostinger-connected workflow; verify all public article responses and discovery metadata before reporting publication.
- The closed approved slug list is `src/content/blog/releases/2026-11-12.ts`; future articles remain drafts until authorized. Preserve existing publication dates, unrelated local tool work, credentials and runtime databases. Do not release unfinished tools as an incidental part of this blog batch.

## Homepage, free captions and security release (12 November 2026)

- The owner authorized updating both repositories with the reviewed lower-homepage refinements, free Auto Caption Generator capabilities and verified security fixes. Preserve everything through the second homepage video and all unrelated unfinished tools.
- Auto Caption Generator's free capabilities are controlled by `src/lib/auto-caption-features.ts`. Read `docs/auto-caption-free-features.md` before modifying or reverting them; exact pre-unlock copies and an incremental rollback patch are saved in the ignored `.aenural-local/caption-free-features-2026-11-12/` checkpoint. Do not grant paid account roles or Source Window licenses to implement free tool capabilities.
- The owner cancelled public signup/email-code work because no sending mailbox is configured. Do not enable public registration, change storage, or claim live email delivery as part of this release. Existing authentication and private owner configuration remain unchanged.
- Read `docs/security-review-2026-11-12.md` for the targeted review, tests and limitations. A clean audit is not a guarantee against hacking; verify actual production headers after the connected deployment.
- The owner subsequently requested hiding pricing from the live site. `pricingAvailable()` in `src/lib/pricing-visibility.ts` allows development only; production `/pricing` must return 404 and pricing links must stay hidden even when account/public-preview flags are enabled. Keep the pricing implementation available for local work without changing authentication or sales configuration.
