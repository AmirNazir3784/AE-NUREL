# Workbook coverage and local publication preparation — 12 November 2026

**Later publication authorization:** see the [approved release record](release-2026-11-12.md).
The owner waived browser visual checks and authorized publication after this
review-stage snapshot. Final readability edits reduce phrase matches to **55**
(689 absent from the batch); updated TXT/JSON ledgers reflect that candidate.
The figures and publication hold below are historical, not the current release
instruction. No missing phrase is relabeled as included.

**Result: local review prepared; not published and not fully keyword-complete.**
Every nonblank cell in the supplied AeNural.xlsx is accounted for. The 50 drafts
do **not** contain every keyword phrase. This full-workbook audit corrects the
earlier check, which only required a suitable phrase in each article.

## Inventory and matching

- Workbook SHA256: `c1ff3384220e9d152e4a9b97d3951399df689d3f494e11e6bfcaad43c02ded9d`.
- Seven worksheets; **791 keyword cells**, **744 normalized distinct phrases**,
  47 duplicate cells and two volume-looking cells (caption generator!B1 = 14k,
  B3 = 9.7k). The latter are listed separately; no search volume is verified.
- No new normalized phrases compared with the earlier AeNural (1).xlsx extraction.
- Before this pass: **30** matching phrases. After useful wording revisions:
  **58 present / 686 absent** across the 50 drafts.
- The two existing published articles were checked separately. They add two
  phrases absent from the drafts: “free audio to text converter online” and
  “audio to text converter online”. Across all 52 pages: **60 present / 684 absent**.
- All numbers above are literal normalized phrase-presence counts, **not SEO
  scores, search-intent coverage, ranking predictions or semantic-equivalence
  measurements**. Case/punctuation/hyphens are normalized, word order retained.

Read fresh localhost HTML, including H1, introduction, article/FAQ words and the
visible words of original diagrams. Excluded site navigation, related cards,
metadata, URL destinations and alt metadata. Collapsed FAQ answers count because
they are actual article content. Matching across visible text does not establish
that a generic term such as “caption” satisfies a commercial query.

## Complete deliverables

- [Full text ledger](keyword-coverage-2026-11-12.txt): all 744 phrases, every source
  cell, draft matches, main-versus-FAQ placement, existing-publication matches,
  related reading where appropriate, and a reason/action for each absent term.
- [Machine-readable ledger](keyword-coverage-2026-11-12.json): same complete
  inventory, source hash and editorial triage.
- [CaptionX topic/content review](captionx-topic-review-2026-11-12.md): directory
  and eight article bodies actually read, specific URLs and scope decisions.
- [Updated 50-title list](50-local-article-titles.txt).

Nothing is silently discarded. A classification or related article is **not** a
claim that an absent phrase is included. The dispositions are an editorial
triage requiring further intent/claim review where noted, not invented keyword
volume or an automatic semantic audit.

| Disposition | Distinct phrases |
| --- | ---: |
| Present in the 50 drafts | 58 |
| Present only in an existing published article | 2 |
| Different language, spelling or malformed query | 10 |
| Different tool/topic outside these 50 articles | 46 |
| Post/image copy or different caption intent needs separate review | 39 |
| Ambiguous social/style caption query needs intent research | 44 |
| Separate named-product tutorial or comparison needed | 29 |
| Separate platform-media extraction tutorial needed | 65 |
| Language-specific transcription guide needed | 5 |
| Device, installation or download-specific guide needed | 69 |
| Conditional feature/price/ranking query; not a verified promise | 157 |
| Related query wording is absent; do not force the literal phrase | 220 |

| Worksheet | Keyword cells | Matching cells | Matching distinct phrases within sheet |
| --- | ---: | ---: | ---: |
| Caption-X kws | 300 | 49 | 49 |
| audio to text converter | 50 | 7 | 7 |
| video to text converter | 41 | 1 | 1 |
| video to mp3 converter | 150 | 2 | 1 |
| video to audio converter | 50 | 1 | 1 |
| transcribe video to text | 50 | 1 | 1 |
| caption generator | 150 | 6 | 6 |

Sheet-level distinct counts overlap; do not sum them as global unique coverage.

## Changes made

Revised 21 task-relevant passages in six content modules. Examples include a
video-to-audio converter's output, speech transcription versus text recognition
in video images, audio-to-SRT review, and selectable caption delivery. No free,
unlimited, no-account, accuracy or safety promise was added to satisfy a query.

Following the owner's permission to improve vague topics, refocused two pages:

1. **Free Auto Caption Generator: Check Exports Before Editing**: begins with the
   locked-download problem, tests the actual required export before a whole edit,
   and explains preserving permitted work before switching tools.
2. **SRT Translator Problems: Check Meaning, Timing and Export**: separates
   language errors from timing errors and adds a symptom/check/action table for
   changed meaning, inconsistent names, missing cues, crowded text and download
   failure. AENural's editor is not advertised as verifying a translation.

Kept their URLs, source trails and ten relevant FAQs. The other specific repair
and native-editor tasks remain distinct; no extra article was added. Main design
components, original illustrations, tool algorithms, accounts and payments are
unchanged. The title directory and private editorial manifest reflect the changes.

## Handling the remaining phrases

Keep normal grammar instead of repeating every reordered converter query.
Related wording is not counted as an exact match. Review genuine missing intents
before adding or replacing an article: a platform-URL downloader is not the same
as exporting audio from footage already owned; social-post copy is not necessarily
timed captions; a general format guide does not verify a particular app, language,
installation or free-plan allowance. Some workbook phrases need a future dedicated
tool/tutorial or belong outside this batch.

The existing audio-extraction guide is the home for MP3/WAV format decisions;
do not produce near-duplicate pages for each order of those words. Caption export
and translator problem pages now address concrete failures. Before targeting
additional “best”, “free unlimited”, named-product or URL-import terms, establish
the actual feature and source evidence. Google describes unnatural/contextless
keyword repetition in its [keyword-stuffing guidance](https://developers.google.com/search/docs/essentials/spam-policies#keyword-stuffing).
This is a reason for readable, relevant prose, not a claim that an absent phrase
can be marked covered.

## Checks and release state

Fresh local checks: **50 HTTP 200 pages**, one H1 each, unique title/description,
correct canonical, working section anchors, no duplicate IDs, draft noindex and
no publication schema/date. Main text **650–746 words**, total
**34303**; **500 FAQs**, **22568 additional FAQ words**. Main
counts include visible diagram, table, list and CTA words. No metadata padding.

**39 blog tests passed.** Scoped ESLint passed without warnings. Final optimized
blog-only build passed: webpack 15.7 seconds, TypeScript 8.0 seconds, 48 generated
pages. This isolates the editorial work from unrelated unfinished local tools;
it is not a claim that all unrelated tool work has passed a release check.

Production-mode preview checks: all **52** draft/review/unknown paths return
404/noindex; both existing publications return 200; blog directory, valid XML
sitemap and robots return 200, retain the sitemap rule and expose zero drafts.
These are checks of a local optimized build, **not a production deployment**.

The 10 November citation/resource checks remain historical evidence; this pass
adds no article citation destinations or media, and does not call those old
checks fresh tests. Original diagrams replace screenshots where suitable, as
authorized. No animation library or dependency added.

**Remaining release gates:** actual responsive rendering, zoom, keyboard and
article interactions remain unverified because CUA tab selection still fails
with an undefined timeoutMs error. HTTP/DOM/build checks do not replace them.
Owner release review is pending. All 50 remain draft-only, excluded from public
discovery. The complete keyword ledger is unresolved work for targeting every
phrase; it is not concealed behind a publish-ready flag. No commit, push,
deployment, publication or Search Console submission was performed.

## Re-run the coverage check

With the development server serving the drafts, run:

```powershell
node scripts/blog/keyword-coverage.mjs 'C:\Users\Awais Javeed\Downloads\AeNural.xlsx' .aenural-local/editorial/keyword-coverage-latest.json
```

The checker reads the workbook without modifying it, preserves every keyword
cell, checks all draft pages and separately checks existing publications. It
stops for unexpected formulas, HTTP failures or draft structure failures instead
of silently using cached prose. The command refreshes measured phrase coverage;
editorial dispositions need review when the workbook or articles change.

## All 50 draft pages

Every row below passed the local checks above. Phrase counts include broad
overlapping terms, so they must not be used as quality or keyword-density scores.

| Local page | Main words | FAQs | Distinct matching workbook phrases |
| --- | ---: | ---: | ---: |
| [SRT vs VTT: Which Subtitle Format Should You Use?](http://localhost:3000/blog/srt-vs-vtt-subtitle-formats) | 688 | 10 | 5 |
| [How to Fix Garbled Subtitle Characters Without Losing Text](http://localhost:3000/blog/fix-garbled-subtitle-characters) | 721 | 10 | 3 |
| [SRT File Not Working? Check These Syntax Errors First](http://localhost:3000/blog/fix-invalid-srt-file) | 688 | 10 | 4 |
| [How to Merge SRT Files With the Correct Video Offsets](http://localhost:3000/blog/merge-srt-files-correct-offsets) | 698 | 10 | 5 |
| [How to Split an SRT File: Keep or Reset the Timestamps?](http://localhost:3000/blog/split-srt-files-keep-reset-timestamps) | 746 | 10 | 4 |
| [How to Fix Overlapping Subtitles Without Cutting Off Speech](http://localhost:3000/blog/fix-overlapping-subtitles) | 708 | 10 | 4 |
| [Convert SRT to Text Without Turning Every Caption Into a Paragraph](http://localhost:3000/blog/srt-to-text-readable-transcript) | 658 | 10 | 7 |
| [SRT to JSON: Understand Timestamp Fields Before Using the Data](http://localhost:3000/blog/srt-to-json-timestamps-data) | 676 | 10 | 4 |
| [SRT to ASS and Back: What Happens to Styling and Timing?](http://localhost:3000/blog/srt-ass-conversion-styling-loss) | 672 | 10 | 4 |
| [SBV to SRT: Convert YouTube Caption Files Without Shifting Them](http://localhost:3000/blog/sbv-to-srt-youtube-caption-files) | 668 | 10 | 5 |
| [SRT to MP4 Explained: A Subtitle Video Is Not Your Captioned Footage](http://localhost:3000/blog/srt-to-mp4-subtitle-video-explained) | 650 | 10 | 6 |
| [Subtitle Line Breaks: Make Captions Easier to Read Without Rewriting Them](http://localhost:3000/blog/subtitle-line-breaks-readable-captions) | 695 | 10 | 3 |
| [Subtitle Timestamps and Frame Rate: When Does FPS Actually Matter?](http://localhost:3000/blog/subtitle-timestamps-frame-rate-explained) | 666 | 10 | 3 |
| [Open Captions, Closed Captions and Subtitles: Choose the Right Delivery](http://localhost:3000/blog/open-closed-captions-subtitles-difference) | 684 | 10 | 7 |
| [Speaker Labels and Sound Cues: What Belongs in Useful Captions?](http://localhost:3000/blog/speaker-labels-sound-cues-captions) | 701 | 10 | 5 |
| [Subtitle Reading Speed: Calculate CPS Before Shortening Your Captions](http://localhost:3000/blog/subtitle-reading-speed-cps) | 698 | 10 | 5 |
| [Where to Place Captions in Vertical Video Without Hiding the Action](http://localhost:3000/blog/vertical-video-caption-placement) | 653 | 10 | 3 |
| [Free Auto Caption Generator: Check Exports Before Editing](http://localhost:3000/blog/choose-free-caption-software) | 694 | 10 | 9 |
| [How to Clean Up an AI Transcript Without Changing What Was Said](http://localhost:3000/blog/clean-up-ai-transcript) | 684 | 10 | 6 |
| [WAV vs MP3 for Transcription: What Actually Changes?](http://localhost:3000/blog/wav-vs-mp3-transcription) | 736 | 10 | 4 |
| [Noisy Audio Transcription: Improve the Input Without Inventing the Words](http://localhost:3000/blog/transcribe-noisy-audio-accurately) | 707 | 10 | 3 |
| [How to Transcribe Long Audio in Sections Without Losing the Timeline](http://localhost:3000/blog/transcribe-long-audio-in-sections) | 664 | 10 | 5 |
| [M4A Voice Recording Won't Transcribe? Check the File Before Converting](http://localhost:3000/blog/m4a-voice-recording-transcription-import) | 671 | 10 | 4 |
| [How to Extract Audio From Video: Choose MP3 or WAV for the Next Task](http://localhost:3000/blog/extract-audio-video-mp3-wav) | 670 | 10 | 5 |
| [MP4 Transcription Not Working? Check the Audio Track First](http://localhost:3000/blog/mp4-transcription-no-audio-track) | 700 | 10 | 5 |
| [Transcript vs Subtitles: Which Text Export Do You Need?](http://localhost:3000/blog/transcript-vs-subtitles-timestamps) | 727 | 10 | 11 |
| [Premiere Pro Transcript to Captions: Review the Words Before Creating the Track](http://localhost:3000/blog/premiere-pro-transcript-to-captions) | 698 | 10 | 6 |
| [How to Export SRT From Premiere Pro—and Find the Right Caption Track](http://localhost:3000/blog/export-srt-premiere-pro) | 677 | 10 | 4 |
| [How to Import SRT Into Premiere Pro Without Confusing It With a Transcript](http://localhost:3000/blog/import-srt-premiere-pro) | 654 | 10 | 4 |
| [Premiere Caption Styles vs Animation: Preserve a Subtitle Master](http://localhost:3000/blog/premiere-caption-styles-vs-animation) | 694 | 10 | 3 |
| [Subtitles in After Effects: Plan the SRT-to-Text-Layer Handoff](http://localhost:3000/blog/after-effects-subtitles-srt-workflow) | 696 | 10 | 5 |
| [After Effects Caption Animation: Use Text Animators Without Rushing the Words](http://localhost:3000/blog/after-effects-caption-text-animators) | 721 | 10 | 3 |
| [DaVinci Resolve SRT Import: Check the Timeline Before Styling](http://localhost:3000/blog/davinci-resolve-import-srt) | 709 | 10 | 4 |
| [DaVinci Resolve Subtitle Export: Sidecar File or Burned-In Video?](http://localhost:3000/blog/davinci-resolve-subtitle-export) | 698 | 10 | 3 |
| [DaVinci Resolve Subtitle Track Styles: Keep a Consistent Look Without Hiding Exceptions](http://localhost:3000/blog/davinci-resolve-subtitle-track-style) | 671 | 10 | 3 |
| [How to Import SRT Into CapCut: Desktop, Web and Mobile Differences](http://localhost:3000/blog/import-srt-capcut-desktop-web) | 693 | 10 | 5 |
| [CapCut Auto Captions: Generate a Draft, Then Review the Parts That Matter](http://localhost:3000/blog/capcut-auto-captions-review) | 699 | 10 | 8 |
| [CapCut SRT Export Missing? Check Caption Type, Platform and Export Mode](http://localhost:3000/blog/capcut-srt-export-missing) | 665 | 10 | 6 |
| [How to Upload SRT Captions to YouTube and Check the Published Track](http://localhost:3000/blog/upload-srt-youtube-captions) | 657 | 10 | 4 |
| [YouTube Automatic Captions Not Available? A Practical Diagnostic Guide](http://localhost:3000/blog/youtube-auto-captions-not-available) | 659 | 10 | 6 |
| [How to Get a Transcript of Your Own YouTube Video](http://localhost:3000/blog/youtube-transcript-own-video-download) | 659 | 10 | 8 |
| [YouTube Translated Subtitles: Keep Source Captions and Language Tracks in Sync](http://localhost:3000/blog/youtube-translated-subtitle-tracks) | 659 | 10 | 4 |
| [Podcast Captions With Multiple Speakers: Build a Reliable Episode Master](http://localhost:3000/blog/podcast-captions-multiple-speakers) | 662 | 10 | 5 |
| [Podcast Clip Captions: Reset Timing and Keep the Speaker's Meaning](http://localhost:3000/blog/podcast-clips-caption-timing) | 659 | 10 | 4 |
| [Turn a Podcast Transcript Into Show Notes Without Inventing Claims](http://localhost:3000/blog/podcast-transcript-to-show-notes) | 660 | 10 | 3 |
| [SRT Translator Problems: Check Meaning, Timing and Export](http://localhost:3000/blog/choose-subtitle-translator) | 696 | 10 | 7 |
| [Translated Subtitles Too Long? Fix Reading Load Without Changing Meaning](http://localhost:3000/blog/translated-subtitles-too-long) | 718 | 10 | 5 |
| [WebVTT Captions Not Showing in HTML Video? Follow the Request to the Cue](http://localhost:3000/blog/webvtt-captions-not-showing-html-video) | 716 | 10 | 4 |
| [Compress Captioned Video Without Losing Readable Text or Subtitle Files](http://localhost:3000/blog/compress-captioned-video-readable-text) | 654 | 10 | 3 |
| [Subtitle Delivery Checklist: Check the File, the Video and the Handoff](http://localhost:3000/blog/subtitle-delivery-quality-checklist) | 706 | 10 | 4 |
