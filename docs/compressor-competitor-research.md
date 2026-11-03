# Compression tools: competitor testing and implementation decisions

Research date: 2 November 2026. Use each CaptionX tool before planning and
implementing its AENural counterpart. Complete and test one before the next.
No spending; no push/deployment until explicit review release instructions.
Only the already-authorized public Source Window demo is sent to CaptionX.
Do not save signed download URLs, session details or private user recordings.

## Compress MP4

Tested https://caption-x.com/compress-mp4 with public/videos/source-window-feature.mp4.
Observed upload: 500 MB / 20 minutes; accepts MP4, MOV, WebM, AVI, MKV according
to the interface. Quality buttons: High 1920x1080, Balanced 1280x720, Small
854x480. Selected Balanced; completed in UI-reported 21 seconds. UI reported
3.3 MB -> 1.6 MB, 51% saved, source 1920x1080 -> 1280x720. Download and reset
available; captions CTA and rating follow the result. These are observations,
not independently validated output quality or speed benchmarks. Only observed
controls can be compared; no assertion about all competitor capabilities.

AENural decisions: retain a simple MP4-output task; accept supported video
containers with codec validation. Offer presets plus independent resolution
(up to source 4K), exact custom decimal-MB target, audio toggle, cancellation,
playable original/result comparison, measured output and explicit larger-file
warning. Keep original separate. No universal compatibility/lossless promises.
Reuse existing encoding pipeline rather than duplicate algorithms. Develop only
under noindex/production hold until owner review. Do not copy competitor text,
assets or layout. Same source comparison alone cannot prove superior quality.

## Reduce Video File Size

Tested https://caption-x.com/reduce-video-file-size with the same public demo.
High/Balanced/Small quality controls, maximum 1080p/720p/480p respectively.
Selected Small: UI reported 19 seconds, 3.3 MB -> 732.5 KB, 78% saved,
1920x1080 -> 852x480 (preset initially displayed 854x480). Download available.
Plan: AENural defaults Small/480p but exposes independent resolution, MP4/WebM,
custom target, sound control and preview comparison. Honest quality/savings
limits; no unsupported universal or invisible-loss promise.

MP4 local acceptance: same demo -> 1,666,287 bytes, 1280x720, sound retained;
download independently decoded without errors. Profile controls and existing
general/10MB controls passed targeted tests and TypeScript/scoped lint.

## WhatsApp Compressor

Tested https://caption-x.com/compress-video-for-whatsapp with public demo.
Fixed Compress to 16 MB action; result reported 11 seconds, 3.3 MB -> 3.3 MB,
0% saved, unchanged 1920x1080. Page claims universal 16 MB and 30s Status.
Official WhatsApp Help search results for article 453914586839706 describe
different chat/media/document limits and 90-second Status; English page open
had no readable body. Do not repeat the competitor's universal-limit claim.
Official URL: https://faq.whatsapp.com/453914586839706/?cms_platform=web&locale=en_US
Plan: adjustable decimal-MB budget, default 16 as conservative preset only,
H.264 MP4 output, selectable resolution, sound controls, actual-size check and
preview. Explain sending method and Status duration are separate; do not promise
avoiding WhatsApp reprocessing or automatic posting.

Reducer local: 26,765,487 -> 594,611 bytes, 852x480, sound retained, downloaded
and independently decoded successfully. Profile tests/scoped lint passed.

## MOV Compressor

Tested https://caption-x.com/mov-compressor using a four-second H.264/AAC MOV
remux of the public demo. Balanced: UI reported 11 seconds, 370.8 -> 194.2 KB,
48% saved, 1920x1080 -> 1280x720, MP4 download. High/Balanced/Small controls.
Competitor advertises ProRes; this was not tested and is not claimed for ours.
Plan: clear MOV-in/MP4-out workflow, preflight codec/track checks, quality,
independent source-resolution/4K, target size, sound and paired previews.
Explicitly exclude ProRes/alpha/HDR/master metadata; preserve original. This
codec limitation prevents claiming superiority over all competitor inputs.

WhatsApp local: custom 1 MB target -> 951,880 bytes H.264 MP4 with sound,
full timeline and successful independent decode. Controls/tests/lint passed.

## Compress Image to 20KB

Tested https://caption-x.com/compress-image-to-20kb with a PNG still extracted
from the public demo (321,820 bytes, 1920x1080). Interface: JPG/PNG/WebP/BMP,
50 MB; targets 20/50/100/200 KB; Best quality (resize) vs Keep original size.
Default 20 KB produced UI-reported 20 KB JPEG at 536x301, 94% saved, preview
and download. Its source size display used binary KB; do not assume an exact
decimal 20,000-byte output from that rounded display.
Plan: actual decimal budget with byte count; JPEG/WebP output, transparency
handling, dimension cap and explicit resize permission, compare original/result,
keep-dimensions failure with actionable guidance, cancel/retry. Reject animated
inputs rather than silently exporting only their first frame. No dependencies.

MOV local: genuine H.264/AAC MOV -> 208,638-byte MP4 at 1280x720, audio/full
duration checked and actual download independently decoded. Profile tests pass.
ProRes/HDR/alpha master workflows remain explicitly unsupported.
