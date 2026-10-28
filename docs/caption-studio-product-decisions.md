# Caption Studio — product direction and current boundaries

28 October update: real account-backed Free/paid access, daily allowances, watermarks, saved projects and checkout/webhook code are implemented and locally verified. External MySQL, mail, merchant and delivery setup remain prerequisites. See [current handoff](./hostinger-membership-launch.md); earlier frontend-only status is historical.

Updated 2026-10-25 from the owner's supplied product/development records and current local source. Historical claims in those records are not fresh acceptance results.

## Product position

Auto Caption Generator is a main AENural video-editing product. Caption Studio is its editor identity. The current task is its tool-page/editor design; preserve the existing homepage layout with the owner's approved caption-tool CTA. Do not replace the homepage hero as part of this work. Source Window remains a separate After Effects product, and development previews remain distinct from public releases.

## Processing contract

- Reuse the existing browser Whisper infrastructure, model caches and measured word timestamps.
- Accurate and Fast are explicit choices; do not silently downgrade the model.
- Device mode requires no server credentials and must not upload video or audio.
- The owner's final UI direction is a clean three-stage progress screen, with no filenames, sizes or Technical details panel. Show measured aggregate resource-preparation progress; never present an individual file's percentage as total-job completion.
- Distinguish model setup, speech recognition and caption preparation. Never invent a percentage during initialization or inference without measured units.
- Reuse cached models when browser storage permits; do not promise that caching is always available.
- Preserve cancellation, retries and explicit development-only private-server authorization/consent. Never silently switch processing modes.

## Editing contract

The public-facing page is a website: introduce the product alongside its real upload area, then show the owner's editorial content. Reveal the full three-panel editing workspace only after video upload. Use only the owner's supplied FAQ; do not add a second FAQ through StudioGuidance. Preserve Sora/Inter and use the site's orange for the word “Generator” in both themes. The owner subsequently removed the animation and AENural Caption Studio tag above the heading. Use full-width background bands with centered content gutters, inset panels and narrower reading areas. Each photograph appears once, and people shown are men only. The added style-demo/marketing sections were removed at the owner's request. The misleading photo-generator section was explicitly corrected to describe the existing video tool. See `caption-page-design-notes.md` for the current composition.

Maintain simultaneous caption/timing controls on the left, video preview centrally, and style presets/customization on the right, with responsive fallbacks. Processing and export remain below the player. Preview and video export share the painter. Text/timing edits invalidate affected word alignment; Undo can restore valid measured alignment. Imported cue-only subtitles do not acquire invented word timings.

Preserve video audio, real subtitle imports/exports, editing history, player controls, source replacement confirmation, presets and animation behavior. Use AENural's Sora/Inter, semantic light/dark colors and reduced-motion support.

## Release and commercial boundaries

Owner update, 2026-10-26: pricing now has exactly Free and a **$20 one-time Source Window + Captions package**. Purchasing Source Window includes premium Auto Caption Generator features; no separate caption subscription is offered. The local pricing/account/purchase-flow pages are frontend previews only. This supersedes the supplied pricing mockup's separate monthly caption plan and separate $49 product. See `membership-integration-handoff.md` for integration boundaries and current routes.

Current development safeguards are separate from future subscription limits. The owner's latest free-tier direction is three videos per day, up to 60 seconds each, with a watermark; it supersedes the older three-videos-total proposal. Accounts, secure quotas, payments, entitlements and watermark enforcement remain launch work rather than features to advertise as implemented. Do not introduce paid AI APIs, expose private inference endpoints, or remove release protections as part of a visual or progress-state change.
