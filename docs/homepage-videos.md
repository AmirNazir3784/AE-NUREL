# Homepage media — 17 October 2026

Current implementation supersedes the earlier three-video integration. Exactly two previews: /videos/source-window.mp4 (67,934,108 bytes) and /videos/source-window-feature.mp4 (5,715,433 bytes, user-compressed). No MP4 was recompressed in this task. The third video/poster were already absent at baseline; its last homepage reference is removed. Both remaining files are below GitHub's 100 MB limit.

Both previews are muted, looping, inline, without native controls. Visible previews play on desktop/mobile except with reduced-motion or data-saving preferences; off-screen/hidden-tab playback pauses. Deferred preload and real frame posters avoid eager downloads. The existing hero/feature layout stays; 16:9 media frames show the full content without stretching/cropping/black gutters. The Source Window and Free online tools features now have **88px separation**, explicitly verified in the browser after the user's spacing correction.

One provider owns one reusable native video dialog for either preview. Centered responsive top-layer modal, dim/blur backdrop, native controls/audio/seek/fullscreen capability, X/Escape/safe backdrop close, focus entry/containment/return, scroll lock, preview pause while expanded and modal-player pause on cleanup. Closing unmounts the player. Autoplay denial leaves accessible expand buttons usable.

Free-tools visual is one static code-native SRT → VTT SVG using existing orange/teal theme tokens. No fake screenshot, animation, new section or repeated branding. Unrelated tools and the separate Source Window page are unchanged.

Verified: nine focused component regressions, 725-test full suite, lint and optimized production build pass. Actual desktop and mobile browser playback/measurements (1440×900, 390×844), native Light and Dark modal surfaces, Escape/X/backdrop, focus return and keyboard containment checked. Reduced-motion/data handling tested deterministically. User independently confirms both themes. The narrow viewport screenshot API sometimes returns incorrectly scaled viewport captures; full-page capture and actual DOM bounds verify mobile layout. Dark Reader later injected attributes and generated an extension-related hydration warning; no application hydration suppression was added.

Production HTTP check confirms all 16 public tools, loaded CSS/assets, sitemap and existing account/AI release gates. Both MP4s support range delivery; removed third MP4 returns 404. Evidence in ignored artifacts/hybrid. No deployment, production remote changes or push.
