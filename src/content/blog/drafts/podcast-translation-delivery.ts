import { type EditorialDraft, p, steps, checklist, table, code, note } from "../draft-model.ts";

export const finalWorkflowDrafts: EditorialDraft[] = [
{
  slug:"podcast-captions-multiple-speakers",title:"Podcast Captions With Multiple Speakers: Build a Reliable Episode Master",seoTitle:"Podcast Captions: Multiple-Speaker Review Workflow",description:"Prepare a final episode reference, verify speaker names and review interruptions before creating caption files and platform transcript copies.",category:"Auto Captions",keyword:"podcast captions multiple speakers",intent:"Create a traceable long-form podcast caption master",kind:"workflow",
  introduction:"Caption a multi-speaker podcast from the approved episode mix, keeping a verified speaker key and one reviewed timed-text master. When converting audio to SRT, review interruptions and uncertain words before exporting platform copies. A transcript with speaker names and a captioned video serve related tasks, but neither should be assumed to replace the other.",
  sections:[
{
  "id": "episode-master-aenural",
  "title": "Build and review the episode master in AENural",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Open the [audio-to-text converter](/tools/free-audio-to-text-converter-online), select **Upload Audio** and choose the approved episode recording within the displayed input limits.",
        "Set **Spoken Language** and leave **Text Language** at **Same as spoken language** for the source master. Select **Convert to Text**, then inspect **Review your transcript** against the recording.",
        "Correct the numbered caption text fields using the verified speaker key. Check **Start** and **End** at interruptions and after any advert or section boundary.",
        "Select **Download SRT** or **Download VTT** for the timed master. Save **Download TXT** as a separate reading copy if your editorial team needs it."
      ]
    },
    {
      "type": "p",
      "text": "For an illustrative three-person episode, the host and two guests may share short replies such as yes or right. An automatic text segment does not prove which person spoke. Replay the surrounding exchange and use verified production notes before adding a visible name or role label. Keep unresolved turns marked for review."
    },
    {
      "type": "p",
      "text": "Check a brief interruption separately; short replies are easy to assign to the preceding speaker by mistake. For later cue-level changes, load the exported file in the [Subtitle Editor](/tools/srt-editor) using **Upload subtitle file**. Edit **Subtitle text** and its times, then download the revised format. Keep the full episode source and the same speaker key when preparing platform copies; a well-labelled master makes correction traceable without promising perfect automatic speaker identification."
    }
  ]
},
    {id:"episode-reference",title:"Freeze the episode reference first",blocks:[p("Confirm the edit, introduction, adverts and closing section that the captions will accompany. A transcript from a rough cut can be accurate word-for-word yet become mistimed after the final edit. Keep the approved audio/video reference identified by a clear revision name."),table("Episode handoff essentials",["Item","Purpose"],[["Approved episode reference","Establishes the actual words and timeline."],["Speaker key","Records verified names, roles and preferred spelling."],["Term list","Keeps organizations, product names and specialist vocabulary consistent."],["Review log","Tracks uncertain passages and intentional editorial changes."]])]},
    {id:"speaker-review",title:"Review speaker turns in context",blocks:[steps("Listen through a representative section and establish which verified speaker key matches each turn.","Check interruptions and off-screen speech separately; do not assign identity only from an automatic label.","Keep labels concise and consistent with the delivery brief.","Review text, timing and reading load together where speakers overlap."),p("Apple's [podcast transcript guidance](https://podcasters.apple.com/support/5316-transcripts-on-apple-podcasts) documents speaker identification through a supplied VTT file. Platform interpretation is a delivery detail: retain visible speaker information or suitable annotations according to the actual receiver, rather than assuming every player displays a voice tag identically.")]},
    {id:"platform-copies",title:"Make platform copies from the master",blocks:[p("Spotify's [episode transcript help](https://support.spotify.com/us/creators/article/managing-episode-transcripts-on-spotify/) describes downloading, editing and re-uploading transcript files for eligible shows, with SRT/VTT requirements. Availability is not universal. Check the current episode controls before promising a particular transcript feature to a guest or client."),p("Keep platform-specific changes in labeled copies so they do not silently overwrite the reviewed master. If a platform regenerates text or an episode contains changing audio, inspect what listeners actually see rather than assuming a previous review remains valid."),note("A caption export is not an episode summary","Speaker labels and timed dialogue belong to the caption/transcript record. Promotional descriptions and highlights are separate editorial outputs and should be labeled as such.")]},
    {id:"episode-qc",title:"Run a whole-episode quality pass",blocks:[checklist("All verified names use one consistent spelling.","Overlaps and uncertain speech have been reviewed.","Opening, middle and closing checks match the approved edit.","The exported language and full cue range are correct.","The platform copy is checked in its actual reading/playback view."),p("Use the [Subtitle Editor](/tools/srt-editor) for supported text and timing work. Keep a reviewed master for later clips, translations and transcripts, but still retime each derivative edit against its own final audio.")]}
  ]
},
{
  slug:"podcast-clips-caption-timing",title:"Podcast Clip Captions: Reset Timing and Keep the Speaker's Meaning",seoTitle:"Podcast Clip Captions: Timing and Context Checks",description:"Rebase full-episode captions to a clip's true in-point, handle crossing cues and review the crop without stripping essential context from a quotation.",category:"Auto Captions",keyword:"podcast clip captions",intent:"Adapt episode captions accurately for short-form edits",kind:"tutorial",
  introduction:"For a podcast clip, subtract the clip's actual source in-point from matching episode caption times, then review any cue crossing the cut. If you remove pauses or reorder material, a single subtraction is no longer enough. Check the final short edit's wording, context and portrait layout independently.",
  sections:[
{
  "id": "edit-clip-times-aenural",
  "title": "Make the clip-relative copy in AENural",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Open the [Subtitle Editor](/tools/srt-editor), select **Upload subtitle file** and load a copy of the episode SRT file. Keep the approved episode master unchanged.",
        "Remove cues entirely outside the selected clip with their **Delete** controls. Review cues crossing either boundary and retain only words actually heard in the clip, with appropriate **Start** and **End** times.",
        "For the straight 12:30 excerpt below, expand **Shift all subtitles**, enter **-750** in **Timing shift in seconds**, and select **Apply shift**. That subtracts the clip’s actual in-point from the remaining cue times.",
        "Inspect the first, middle and last captions, then select **Download SRT** and load it beside the final short video."
      ]
    },
    {
      "type": "p",
      "text": "Remove out-of-range cues before shifting. AENural prevents negative cue times by stopping affected cues at zero while preserving duration; that is not an editorial trim of the episode. Leaving earlier captions in the file can therefore create unwanted text at the clip opening."
    },
    {
      "type": "p",
      "text": "In the example, the cue at 12:32.500–12:35.000 becomes 2.500–5.000 seconds. If you removed a pause inside the excerpt, repair the following section separately. A count-based split that resets to the first caption would also remove the opening 2.5-second pause, so use the [splitter guide](/blog/split-srt-files-keep-reset-timestamps) when choosing that alternative."
    }
  ]
},
    {id:"choose-meaningful-cut",title:"Choose the cut for meaning first",blocks:[p("Listen to the question and answer around the planned excerpt. An isolated sentence can sound stronger, weaker or opposite in meaning when its qualifier is removed. Keep enough context for a reader who has not seen the full episode."),p("Record the source in/out points and any internal edits. The title or hook added to the clip should accurately describe what the speaker says, rather than using caption text to imply an endorsement or certainty not present in the episode.")]},
    {id:"rebase-times",title:"Reset the caption time origin",blocks:[{type:"illustration",name:"clip-timeline"},code("Illustrative straight-excerpt calculation","Episode cue: 00:12:32,500 --> 00:12:35,000\nClip in-point: 00:12:30,000\nClip-relative cue: 00:00:02,500 --> 00:00:05,000"),p("This calculation assumes a continuous excerpt with unchanged playback speed. Cutting out a pause inside the clip creates another boundary: captions after that edit need to follow the new timeline. Do not simply move the entire episode SRT and assume every cue now belongs to the short."),steps("Identify the exact clip in-point in the approved episode reference.","Select the matching cues, preserving the original subtitle master.","Rebase the times for a straight excerpt, or retime sections around internal cuts.","Inspect cues that start before or end after the selected clip boundaries.")]},
    {id:"crossing-cues",title:"Review words at the cut",blocks:[table("Boundary case",["Case","Review decision"],[["A cue begins before the clip","Keep only the words actually present and time them to the clip."],["The last sentence continues after the cut","Extend the clip or end at a meaningful, accurate boundary."],["A speaker interrupts at the cut","Preserve attribution and context rather than merging voices."],["A pause is removed","Reconcile later cue times with the edited audio."]]),p("AENural's [SRT Splitter](/tools/srt-splitter) groups complete cues; it does not automatically decide which words belong on either side of a video cut. Use the [Subtitle Editor](/tools/srt-editor) for those editorial exceptions.")]},
    {id:"portrait-review",title:"Review the short as its own deliverable",blocks:[checklist("The excerpt preserves the speaker's intended meaning.","Only words actually heard in the clip are captioned.","The first and last cues align after rebasing.","Captions avoid faces, titles and important actions in the crop."),p("Use the [vertical caption placement guide](/blog/vertical-video-caption-placement) for layout review. A short clip is a new edit, even when it comes from an already captioned episode; its timing and readability deserve their own pass.")]}
  ]
},
{
  slug:"podcast-transcript-to-show-notes",title:"Turn a Podcast Transcript Into Show Notes Without Inventing Claims",seoTitle:"Podcast Transcript to Show Notes: A Review Process",description:"Create traceable episode summaries, chapters and resource links from a reviewed transcript. Verify names, quotes, timestamps and every promised resource.",category:"Audio Transcription",keyword:"podcast transcript to show notes",intent:"Prepare accurate editorial notes from episode text",kind:"workflow",
  introduction:"Use a reviewed podcast transcript as evidence for show notes, then verify the summary, chapter times and resource links against the episode. Show notes are a selective editorial guide, not a verbatim record. Do not invent a takeaway, quote, guest credential or promised download just because it would make the episode easier to promote.",
  sections:[
{
  "id": "prepare-reading-copy-aenural",
  "title": "Extract a usable reading copy with AENural",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Keep your reviewed episode SRT and matching recording. Open [SRT to TXT](/tools/srt-to-txt) and select **Choose SRT file**. Use [VTT to TXT](/tools/vtt-to-txt) instead for a WebVTT source.",
        "Under **Output format**, compare **One cue per line** with **Paragraph text**. Use line output for source checking; paragraph output joins fragments into a continuous reading draft.",
        "Select **Copy text** or **Download TXT**, then add sensible paragraph and speaker boundaries in your working document. The extraction does not write or fact-check show notes for you.",
        "Keep the timed master available while drafting the summary, chapter names and resource list. Revisit the actual recording when a claim or quotation needs verification."
      ]
    },
    {
      "type": "p",
      "text": "For example, the guest may initially recommend one export setting and later qualify it for a different delivery platform. A show-note bullet based only on the first sentence can overstate the advice. Read the whole discussion before summarizing it, then link the relevant official documentation if it helps listeners act on the recommendation."
    },
    {
      "type": "p",
      "text": "Do not use a chapter title to introduce an unsupported claim. When you make a chapter list, measure starts against the final episode rather than the reading copy’s paragraph count. Inserting an advert can move every later chapter. Keep the source-time reference in your worksheet even if the public show notes use only a short descriptive heading and link."
    }
  ]
},
    {id:"separate-deliverables",title:"Separate summary, transcript and resources",blocks:[table("Three distinct page sections",["Section","Reader benefit","Evidence needed"],[["Episode summary","Decide whether to listen.","Claims actually supported by the conversation."],["Transcript","Read or search the conversation.","Reviewed wording and speaker attribution."],["Resources","Find items mentioned.","Verified destinations matching the named items."]]),p("Do not merge a presenter's speculation with an established fact in a summary. If the episode contains a correction or qualification later, incorporate it rather than summarizing only the first confident statement.")]},
    {id:"build-notes",title:"Build notes from a review worksheet",blocks:[steps("Read the complete reviewed transcript and mark the main topics actually discussed.","Draft a short summary in your own words, preserving qualifications and attribution.","Identify useful chapter starts from the final episode audio, not a rough-cut transcript.","Resolve each mentioned resource to a legitimate destination and verify it supports the description.","Check every direct quotation against the audio before publishing it."),code("Illustrative internal worksheet","Topic: choosing an export format\nAudio reference: 18:42\nClaim: the guest describes their team's process, not a universal rule\nResource: verify the official documentation page\nUnresolved: confirm spelling of the product name") ]},
    {id:"chapters-and-links",title:"Keep chapters and links accurate",blocks:[p("Use chapter names that describe the actual section, not a keyword promise the conversation never fulfills. If an introduction or advert changes, review the offsets. Do not assume every platform uses identical chapter or timed-link rules."),p("Apple's [transcript guidance](https://podcasters.apple.com/support/5316-transcripts-on-apple-podcasts) describes chapters and timed links as navigation features. Check the destination's current supported format rather than presenting one timestamp list as universally compatible."),p("A useful resource link goes directly to the documentation, product or publication discussed. It is an outbound reference, not a backlink acquired for your website. Avoid linking to an unrelated famous site merely to make the notes appear authoritative.")]},
    {id:"final-review",title:"Run a final factual pass",blocks:[checklist("Summary claims remain supported by the episode.","Names, roles and guest credentials are verified.","Chapters jump to the intended moments in the final edit.","Resources and downloads exist and match their descriptions.","Quotes and edited summaries are clearly distinguished."),p("If the transcript is still in timed subtitle form, [SRT to TXT](/tools/srt-to-txt) can provide a reading copy. Keep the timed master for verification, and treat the resulting show notes as an editorial document that needs its own review.")]}
  ]
},
{
  slug:"choose-subtitle-translator",title:"SRT Translator Problems: Check Meaning, Timing and Export",seoTitle:"SRT Translator Problems: Text, Timing and Export Checks",description:"Check a translated SRT for changed meaning, missing cues, broken timing and export problems. Use AENural to inspect text and timing after language review.",category:"Subtitle Tutorials",keyword:"SRT translator problems",intent:"Identify whether a translated subtitle failure concerns meaning, structure or delivery",kind:"troubleshooting",
  introduction:"If an SRT translation changes a name, drops a cue or loses timing, compare the downloaded file with the reviewed source before fixing anything. Test a subtitle translator on a short difficult sample. Check meaning, cue count, timestamps and readability separately; an SRT translator can preserve structure while mistranslating speech.",
  sections:[
{
  "id": "inspect-translation-aenural",
  "title": "Inspect the exported translation with AENural",
  "blocks": [
    {
      "type": "p",
      "text": "Separate a language error from a timing error first. AENural’s [Subtitle Editor](/tools/srt-editor) can inspect supported SRT or VTT text and timing; it does not verify the translation. Check the actual download with a competent reader before changing cue times to accommodate incorrect words."
    },
    {
      "type": "steps",
      "items": [
        "Select **Upload subtitle file** and open the translated copy. Keep the reviewed source-language file and glossary beside it for the language reviewer.",
        "Compare a difficult name, a number and an idiom in **Subtitle text**. Ask a competent reader to explain any correction; fluent wording alone does not establish equivalent meaning.",
        "Inspect **Start**, **End** and CPS for a longer cue. Record whether the translator changed timing or segmentation and whether that change still matches the approved recording.",
        "Select **Download SRT** or **Download VTT** after any supported corrections. Test that revised file in the actual receiving player."
      ]
    },
    {
      "type": "p",
      "text": "Suppose the source says a feature may arrive in June, but the target says it will arrive in June. The cue can retain identical timestamps and still change the claim. That is a language failure rather than a format success. Include this kind of qualification in a test file instead of evaluating only simple greetings or a vendor’s own demonstration."
    }
  ]
},
    {id:"define-test",title:"Match each failure to the right correction",blocks:[p("Specify source and target languages, regional conventions, audience and required format. Prepare a short glossary of verified names and terms. Keep the reviewed source captions so an error can be traced to transcription, translation or later editing."),{type:"illustration",name:"translation"},table("Diagnose the translated SRT",["Symptom","Check","Next action"],[["May became will","Meaning changed despite intact timestamps.","Ask the language reviewer to correct the claim."],["A name changes spelling","Glossary consistency.","Confirm the approved spelling in context."],["A cue disappears","Source and export cue text and times.","Restore the missing passage from reviewed material."],["Text flashes too quickly","Reading load and neighboring cues.","Review segmentation and timing against the recording."],["SRT will not download","Current export conditions.","Preserve permitted work before changing services."]])]},
    {id:"representative-file",title:"Reproduce the failure with a short difficult sample",blocks:[steps("Choose a small authorized subtitle sample with a name, a number, an idiom and a longer cue.","Translate it with the intended settings and any supported glossary/context feature.","Have a competent target-language reader review meaning and naturalness.","Download the actual target format and compare its text, cue count and times with the source.","Play the translated subtitles with the recording, checking reading load and speaker transitions."),p("DeepL's [glossary documentation](https://www.deepl.com/en/features/glossary) describes source terms and preferred target translations. Glossary support varies by tool, language pair and plan; do not assume an integration exposes every provider feature.")]},
    {id:"avoid-shortcuts",title:"Avoid misleading quality shortcuts",blocks:[p("A back-translation can reveal a discrepancy, but it is not a substitute for a target-language review. The same system may produce fluent text while missing a culturally specific phrase or an ambiguous reference. Likewise, an unchanged cue count does not prove that the translated words are right."),note("Free must include the needed deliverable","Check whether translation, review and subtitle-file export are all included. Do not assume a free preview means a free usable SRT or a watermark-free video."),p("Avoid unsupported 'best translator' rankings unless you have a disclosed, meaningful comparison. Record what you actually tested, the date, language pair and account conditions; do not invent accuracy percentages.")]},
    {id:"handoff",title:"Keep a reviewable handoff",blocks:[checklist("The source transcript is reviewed.","A competent reader checked the target language.","Changes to timing or segmentation are documented.","The exported file opens in the receiver's workflow."),p("Use the [Subtitle Editor](/tools/srt-editor) for supported timing/text adjustments after export. Keep both language versions and the glossary; that record is more useful for the next revision than a claim that any automatic translator is always accurate.")]}
  ]
},
{
  slug:"translated-subtitles-too-long",title:"Translated Subtitles Too Long? Fix Reading Load Without Changing Meaning",seoTitle:"Translated Subtitles Too Long: Timing and Layout",description:"Review longer target-language captions, distinguish line wrapping from segmentation and preserve meaning when timing or wording needs revision.",category:"Subtitle Tutorials",keyword:"translated subtitles too long",intent:"Repair target-language caption reading load",kind:"troubleshooting",
  introduction:"If a subtitle translation is too long to read, check line wrapping, cue segmentation and available display time before shortening the wording. After translating an SRT file, compare the target text with the recording. Preserved timestamps alone do not establish a readable translation. Extending every cue can create overlaps, while shrinking the font can make the entire video harder to read.",
  sections:[
{
  "id": "repair-dense-translation-aenural",
  "title": "Repair one difficult cue in AENural first",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Open [AENural’s Subtitle Editor](/tools/srt-editor), select **Upload subtitle file** and choose the reviewed target-language SRT or VTT. Preserve both this file and the source-language master.",
        "Inspect the dense cue’s **Subtitle text**, **Start**, **End** and CPS indicator. If only the wrapping is awkward, move the line break inside the text field while keeping the wording and times.",
        "If the sentence genuinely needs another cue, use **Add below**. Divide the text at a meaningful phrase boundary and enter each cue’s measured Start and End against the recording. Do not distribute words evenly merely to fill the available space.",
        "Download the corrected format and review the changed sequence with a competent target-language reader, including the neighboring captions."
      ]
    },
    {
      "type": "p",
      "text": "In the 72-character example, extending the cue to four seconds lowers the calculated rate to 18 CPS. First check whether the next caption begins before that new end. If it does, a longer duration can replace one readability problem with a collision or late text. Keep a change only when both the language and the timing remain correct."
    },
    {
      "type": "p",
      "text": "For an accidental collision, [Subtitle Overlap Fixer](/tools/subtitle-overlap-fixer) provides **Shorten earlier subtitle** and **Move later subtitle**. Neither strategy knows the target sentence’s meaning. Review its proposed effect and use **Undo fixes** if a timing repair makes a line too brief or misaligned."
    },
    {
      "type": "p",
      "text": "Record an intentional condensed translation separately from a spelling correction. The next reviewer should be able to tell why a qualifier or phrase changed, rather than having to reconstruct the decision from the exported file."
    }
  ]
},
    {id:"find-the-pressure",title:"Identify which constraint is failing",blocks:[table("Three different constraints",["Problem","Review"],[["The line exceeds the usable width","Font, frame size and meaningful line breaks."],["The block fits but flashes too quickly","Reading load and available display duration."],["One cue contains several thoughts","Segmentation and speaker/context boundaries."]]),p("These constraints can overlap, but changing all of them at once hides the cause. Keep a copy of the translation and make a controlled pass on a representative difficult passage before applying broad changes.")]},
    {id:"worked-example",title:"Use a timing example to expose the trade-off",blocks:[code("Illustrative target-text reading load","A target-language cue contains 72 characters under one counting convention.\nAt 3 seconds: 72 ÷ 3 = 24 characters/second.\nAt 4 seconds: 72 ÷ 4 = 18 characters/second.\nThe extra second is useful only if it fits the actual speech/scene and neighboring cues."),p("The calculation does not prescribe a universal limit. Use the target language's delivery rules where supplied. Netflix's [timed-text style-guide directory](https://partnerhelp.netflixstudios.com/hc/en-us/sections/22463232153235-Timed-Text-Style-Guides) illustrates why language-specific guidance matters; its specifications apply to its own deliveries.")]},
    {id:"choose-repair",title:"Choose a repair with language review",blocks:[steps("Check whether a better phrase-level line break solves the width problem without changing words.","If the text spans several ideas, split at a meaningful boundary and retime each part against the recording.","Use available surrounding time only where it remains synchronized and does not collide with neighboring captions.","If wording must be condensed for the delivery brief, ask a competent target-language reviewer to preserve the original meaning and tone."),p("Do not delete a qualifier, negation or unit merely to reduce a warning count. A caption that fits a box but changes the claim is not an improvement. Keep a record of intentional condensation, separate from corrections to mistranslations.")]},
    {id:"recheck-neighbors",title:"Recheck the surrounding sequence",blocks:[checklist("The shortened or split text still communicates the intended meaning.","Neighboring cues remain synchronized and readable.","Speaker changes and important sounds remain clear.","The actual exported font and frame reproduce the reviewed layout."),p("Use the [Subtitle Editor](/tools/srt-editor) for individual revisions and the [Overlap Fixer](/tools/subtitle-overlap-fixer) for reviewed accidental collisions. Automatic overlap repair does not decide how a sentence should be translated; language and timing checks must work together.")]}
  ]
},
{
  slug:"webvtt-captions-not-showing-html-video",title:"WebVTT Captions Not Showing in HTML Video? Follow the Request to the Cue",seoTitle:"WebVTT Captions Not Showing: HTML Video Checks",description:"Diagnose track URL failures, invalid VTT syntax, MIME types, origin rules and player selection. Separate loading failures from caption display problems.",category:"Subtitle Tutorials",keyword:"WebVTT captions not showing",intent:"Diagnose a native HTML video text-track integration",kind:"troubleshooting",
  introduction:"When WebVTT captions do not appear, check whether the track file loads successfully, whether its contents are valid VTT and whether the player has selected the track. A .vtt filename alone is not enough. Work from the network response to the cue timings rather than repeatedly changing caption styling.",
  sections:[
{
  "id": "known-vtt-aenural",
  "title": "Use AENural to separate syntax from hosting errors",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Open [SRT to VTT](/tools/srt-to-vtt), select **Choose SRT file** and load [the original two-cue SRT sample](/blog/srt-vs-vtt-subtitle-formats/sample.srt). Check **VTT ready** and the two-subtitle count.",
        "Select **Download VTT** and open the saved file as text. Confirm its WEBVTT signature and first timing line: 00:00:01.250 to 00:00:03.750. The second cue ends at 6.500 seconds.",
        "Place that VTT at your own intended public asset path and set the track src to that actual path. Use a test video long enough to reach both cues. These invented captions are a display fixture, not a transcript matching your video.",
        "Inspect the exact track request, then select the caption track and seek to two seconds, inside the first cue. Only after this controlled test works should you substitute the full delivery file."
      ]
    },
    {
      "type": "p",
      "text": "If the downloaded text is correct but your server returns an HTML page at the configured URL, another conversion will not fix the route. If the request returns real VTT but text remains hidden, inspect track selection and timing next. Keep each failure stage separate."
    },
    {
      "type": "p",
      "text": "A cross-origin setup needs the media element and remote server configured consistently. Start with a permitted same-origin fixture when isolating the issue; do not disable security checks or assume a visible download link proves the player loaded the track."
    }
  ]
},
    {id:"minimal-track",title:"Start with a minimal known structure",blocks:[code("Illustrative HTML; replace paths with your own assets",'<video controls src="/media/lesson.mp4">\n  <track kind="captions" src="/media/lesson.en.vtt"\n    srclang="en" label="English" default>\n</video>'),code("Illustrative VTT test file","WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nThis is a test caption.\n"),p("Keep the test caption inside the actual video duration. A valid cue starting at one minute will not appear while you inspect only the opening five seconds. These examples are illustrative files, not links to a hosted demonstration.")]},
    {id:"network-before-css",title:"Check the file response before CSS",blocks:[steps("Inspect the requested track URL using your development tools. Confirm it returns the actual text file, not a 404 page, login screen or application HTML fallback.","Check that the file is served as text/vtt and saved as UTF-8.","Confirm the WEBVTT signature, a blank header separator and valid period-based timestamps.","If the file is on another origin, check the media element's crossorigin configuration and the server's permitted cross-origin response."),p("The [MDN track reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/track) documents its attributes and origin conditions. The [WebVTT format guide](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API/Web_Video_Text_Tracks_Format) describes file syntax. Renaming SRT to VTT does not implement those requirements.")]},
    {id:"display-state",title:"Then check selection, timing and style",blocks:[table("Loaded file, no visible words",["Check","Reason"],[["The track is selected","A loaded track is not necessarily displayed."],["Current playback is inside a cue interval","Silence between cues is expected."],["The label/language identifies the intended track","Another language track may be active."],["Styling leaves readable text","Color or placement can hide text after loading succeeds."]]),p("Test without custom caption CSS first, then add styling back deliberately. A player's default-track behavior can also reflect user preferences. Do not use hidden text injected into the page as evidence that a native video track works.")]},
    {id:"test-final-host",title:"Test on the real hosting path",blocks:[p("A working test file at one development URL does not prove the production asset path, MIME mapping and origin rules are correct. Verify the exact deployed track URL and the video page after deployment. Include keyboard access to the player's controls in the review."),checklist("Track request returns the actual VTT with HTTP 200.","Syntax, encoding and cue intervals are valid.","The intended track is selectable and visible.","The final hosting path and origin settings are verified."),p("For an existing SRT source, use [SRT to VTT](/tools/srt-to-vtt), then inspect the generated file. A converter can fix format syntax; it cannot configure your server or select the track in your application.")]}
  ]
},
{
  slug:"compress-captioned-video-readable-text",title:"Compress Captioned Video Without Losing Readable Text or Subtitle Files",seoTitle:"Compress Captioned Video: Keep Text Readable",description:"Check rendered caption edges, audio, timing and separate subtitle delivery when reducing file size. Use a controlled sample instead of promising lossless compression.",category:"Video & Audio Conversion",keyword:"compress captioned video",intent:"Reduce delivery size while reviewing caption quality and tracks",kind:"workflow",
  introduction:"When compressing captioned video, read the captions in the compressed video and keep any separate subtitle files alongside the media. Permanent captions are part of the picture and can become blurry after scaling or compression. Selectable subtitle tracks are separate data and may not be preserved by every conversion workflow.",
  sections:[
{
  "id": "compress-with-aenural",
  "title": "Compare a caption-heavy scene in AENural",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Open [Video Compressor](/tools/video-compressor) and select **Choose video**. Keep the original captioned master and any separate SRT or VTT outside the compression operation.",
        "For the first readability trial, choose **Higher quality** and **Keep source size** under **Resolution**. Choose the required **Output format** and leave **Keep sound** enabled when speech belongs in the deliverable.",
        "Select **Compress video**. When the result is ready, switch between **Original** and **Compressed** around the same difficult captioned passage. Inspect punctuation, thin letter strokes and moving backgrounds.",
        "Select **Download MP4** or the corresponding supported output, then open that saved file independently. Review its sound and caption presentation before sharing it."
      ]
    },
    {
      "type": "p",
      "text": "If you need a strict size budget, **Target a size** exposes **Target file size (MB)**. An aggressive target can leave too little picture detail for small text. Check the actual result and adjust the target or design rather than accepting unreadable captions merely because the file fits."
    },
    {
      "type": "p",
      "text": "Keep the source export until the actual receiver has checked playback. AENural’s preview does not attach your separate subtitle sidecar to the picture automatically. Deliver that reviewed file alongside the compressed video when required. For embedded selectable captions, independently verify the output track support; do not assume that a playable picture or retained audio proves the caption data survived."
    }
  ]
},
    {id:"identify-caption-type",title:"Identify how the captions are stored",blocks:[table("Caption storage changes the review",["Caption type","Compression concern"],[["Burned into the image","Text edges, size and contrast change with picture processing."],["Separate SRT/VTT sidecar","Retain and deliver the file; compressing video does not package it automatically."],["Embedded selectable track","Verify that the chosen conversion preserves or deliberately exports it."]]),p("[HandBrake's subtitle documentation](https://handbrake.fr/docs/en/1.11.0/advanced/subtitles.html) distinguishes rendering and pass-through behavior. Treat subtitle handling as an explicit output choice, not an automatic consequence of converting a video container.")]},
    {id:"choose-sample",title:"Test the most difficult section",blocks:[p("Choose a section with small caption text, a moving background and a dense cue. A static title card is not a useful substitute for the hardest dialogue shot. Keep the original file and compare both versions at the actual delivery size."),steps("Set the intended size or quality target in the [Video Compressor](/tools/video-compressor). Keep a separate copy of any sidecar captions.","Choose a supported output and avoid unnecessary resolution reductions when they make text too small.","Export a representative test where the workflow permits, or inspect the corresponding section of the full export.","Compare text edges, audio and synchronization before delivering the result."),p("A smaller file is evidence of reduced size, not proof that picture quality is unchanged. Avoid calling a lossy re-encode lossless unless the actual codec/workflow establishes that property.")]},
    {id:"picture-review",title:"Inspect readability in motion",blocks:[checklist("Thin strokes and punctuation remain distinguishable.","Text does not shimmer or break into blocks over motion.","Line breaks and placement survive any resize/crop.","Speech remains audible and aligned with the captions."),p("If text is already tiny, reducing frame dimensions can make it less useful even with clean encoding. A revised caption design may be needed rather than a stronger compressor setting. Keep the editable caption/picture master for that change.")]},
    {id:"delivery-package",title:"Check the whole delivery package",blocks:[p("Open the compressed video independently. If captions are selectable, load or select the expected track and verify the language. If a sidecar belongs to the video, compare it with the final edit and make the filenames unambiguous."),code("Illustrative delivery pair","episode-07-r05.mp4\nepisode-07-r05.en.srt\n\nThe matching names identify the pair; the receiving player must still support loading the captions."),p("Do not assume every uploader accepts sidecars or every player discovers them automatically. Review the destination's requirements and verify the actual uploaded result when you later publish.")]}
  ]
},
{
  slug:"subtitle-delivery-quality-checklist",title:"Subtitle Delivery Checklist: Check the File, the Video and the Handoff",seoTitle:"Subtitle Delivery Checklist for Creators and Editors",description:"Run a traceable final review covering wording, timing, language versions, format, fonts and real playback. Includes a compact delivery record.",category:"Subtitle Tutorials",keyword:"subtitle delivery checklist",intent:"Quality-control a final multi-asset subtitle handoff",kind:"workflow",
  introduction:"Before delivering subtitles, check the SRT file or VTT file, the matching video and the app that will play them separately. Verify wording, timing, language labels and any intended visual style, then keep a short revision record. A parser pass or a successful download is only one part of a complete subtitle review.",
  sections:[
{
  "id": "aenural-delivery-pass",
  "title": "Run a concrete file review in AENural",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Open [AENural’s Subtitle Editor](/tools/srt-editor), select **Upload subtitle file** and choose the exact file named in the delivery record. Keep the approved video revision available for comparison.",
        "Inspect **Subtitle text**, **Start** and **End** at the opening, a recent edit and the closing passage. Check a deliberately corrected name or figure to confirm this is the reviewed revision.",
        "Use **Issues**, **Next issue** or **Previous issue** to inspect flagged cues. A reading-speed warning needs context; an invalid end time needs correction before export. Do not clear a warning by silently changing meaning.",
        "Select **Download SRT** or **Download VTT** for the intended receiver. Reopen the saved copy and test it with the actual final video, including the selected language track."
      ]
    },
    {
      "type": "p",
      "text": "If a timing repair was needed, record which cues changed and why. A whole-file delay, a chapter-offset error and one overlapping pair require different operations. Use the appropriate AENural timing or overlap tool, then return to playback review rather than assuming a lower warning count certifies the file."
    },
    {
      "type": "p",
      "text": "For an illustrative client handoff, the file may pass syntax and text review while receiver playback is still pending. Write that exact status in the record. The recipient can then complete the missing check without mistaking a preparation step for approval."
    },
    {
      "type": "p",
      "text": "Keep the editable project, source captions, reviewed export and a short change log. Those assets let a later editor correct one spelling or timing issue without rebuilding an entire caption workflow."
    }
  ]
},
    {id:"content-review",title:"Check meaning before technical packaging",blocks:[checklist("Names, figures, dates and negations match the recording.","Speaker identities and relevant sounds are represented accurately.","Uncertain passages have been resolved or clearly marked for review.","Translations have competent target-language review."),p("Prioritize errors that change meaning before polishing a border or filename. Keep the original transcript and subtitle master so intentional editorial changes remain distinguishable from recognition mistakes. Do not label an unchecked automatic export as a reviewed transcript.")]},
    {id:"timeline-review",title:"Check the exact final edit",blocks:[steps("Confirm the approved video revision and subtitle time origin.","Inspect the opening, several middle checkpoints and the ending.","Review every recent cut, chapter join and intentionally changed cue.","Check dense captions, accidental overlaps and cues crossing boundaries."),p("A few checkpoints are useful for finding broad problems, but they do not certify every line. Combine them with review of changed and difficult passages. For symptoms, use the existing [subtitle sync guide](/blog/fix-subtitles-out-of-sync), then verify the repaired section in context.")]},
    {id:"format-and-appearance",title:"Check the export, not just the editor",blocks:[table("Separate quality gates",["Gate","Inspect"],[["File structure","Correct extension, encoding, valid times and complete cue range."],["Visual appearance","Readable size, line breaks, fonts and placement in the delivered output."],["Language selection","Track contents match labels and filenames."],["Destination playback","Actual sidecar loading, selectable tracks or permanent text as requested."]]),p("For a YouTube delivery, check its [official supported-file guidance](https://support.google.com/youtube/answer/2734698?hl=en); other receivers can have different feature subsets. Keep rich-style masters even when delivering a plain SRT. A file can import successfully while its design details are discarded.")]},
    {id:"handoff-record",title:"Leave a compact, useful handoff record",blocks:[code("Original illustrative delivery record","Video: episode-07-r05.mp4\nCaptions: episode-07-r05.en.srt\nLanguage: English\nSource: reviewed transcript r03\nTiming reference: approved picture r05\nReview: text + timing complete; receiving-platform playback checked\nRetained: editable project, subtitle master and change log"),p("Replace each example status with what actually happened. If receiver playback is still pending, say so. Do not make a checklist look complete merely because the file exists."),p("Use the [Subtitle Editor](/tools/srt-editor) for final supported text/timing fixes and keep exported copies separately. A clear handoff makes the next correction safer: collaborators can identify the approved version rather than guessing which of several similar files should be changed.")]}
  ]
}
];
