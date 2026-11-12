import { type EditorialDraft, p, steps, checklist, table, code, note, flow } from "../draft-model.ts";

export const youtubeWorkflowDrafts: EditorialDraft[] = [
{
  slug:"upload-srt-youtube-captions",title:"How to Upload SRT Captions to YouTube and Check the Published Track",seoTitle:"Upload SRT Captions to YouTube: A Review Workflow",description:"Add a reviewed timed subtitle file in YouTube Studio, select the correct language and verify playback instead of relying only on upload success.",category:"Subtitle Tutorials",keyword:"upload SRT YouTube",intent:"Attach a reviewed timed caption file to an owned video",kind:"tutorial",
  introduction:"Upload a reviewed SRT file through YouTube Studio's subtitle workflow for your video, selecting the correct language and the option for a file with timing. Inspect the imported text and playback before treating the track as finished. A successful file upload does not establish that its language, revision or timing is correct.",
  sections:[
{
  "id": "aenural-youtube-upload",
  "title": "Prepare the exact SRT in AENural before Studio",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Open [AENural’s Subtitle Editor](/tools/srt-editor), select **Upload subtitle file** and load your current SRT. Review **Subtitle text**, **Start** and **End**, including any recently corrected name or number.",
        "Choose **Download SRT** to save the reviewed version. Keep its filename tied to the final video edit and language so an older export is not uploaded by mistake.",
        "In YouTube Studio, open **Subtitles**, select the intended video and add the target language if necessary. Under its subtitle entry, choose **Upload file**, **With timing**, then **Continue**.",
        "Select your reviewed SRT and follow Studio’s save control after inspecting the imported content. Verify playback on the actual video and select the track you just reviewed."
      ]
    },
    {
      "type": "p",
      "text": "For example, a new ten-second introduction shifts speech later than in an earlier cut. Uploading the old SRT can succeed while every caption appears early. Measure that change and repair the source before upload; an upload success message cannot identify the correct picture revision for you."
    },
    {
      "type": "p",
      "text": "If two tracks look similar, verify a deliberately corrected phrase and the selected language label. This helps identify the revision you are actually reviewing. If an SRT is rejected, inspect its actual plain-text structure rather than changing only the extension. Use [the invalid-SRT troubleshooting guide](/blog/fix-invalid-srt-file) for a small structural check. Keep the original timed master until the imported track and its first, middle and final speech checks agree with the video."
    }
  ]
},
    {id:"prepare-file",title:"Prepare the reviewed subtitle file",blocks:[p("Keep the matching final video and subtitle export together. Check the SRT opening and ending, not just its filename. A file from an earlier cut can upload successfully while showing the right words at the wrong moments."),p("YouTube's [supported-file guide](https://support.google.com/youtube/answer/2734698?hl=en) lists basic UTF-8 SRT and notes that SRT styling markup is not recognized. Keep elaborate visual styling in the editable master or an appropriate picture export rather than relying on basic SRT to recreate it.")]},
    {id:"studio-upload",title:"Use the timed-file upload path",blocks:[steps("Sign in to the account authorized to edit the video and open YouTube Studio.","Open Subtitles, choose the video, then add or select the intended language.","Choose the subtitle-file upload option and select With timing for the reviewed SRT.","Load the file and inspect the imported track. Follow the current save/publish controls after review."),p("These steps follow YouTube's [add subtitles and captions guide](https://support.google.com/youtube/answer/2734796?hl=en), checked on 4 November 2026. An untimed transcript/auto-sync path is a different workflow; do not select it merely because the words happen to be text."),flow("A controlled upload","Reviewed SRT + final video","Correct video and language","Timed-file import","Playback review")]},
    {id:"review-track",title:"Check the track a viewer will actually use",blocks:[checklist("The selected track contains the intended language, not another export with a similar filename.","Names, figures and the first/last spoken lines are complete.","Opening, middle and closing speech checks align.","The player exposes the intended caption track and it is readable."),p("If automatic captions are also present, identify the track you are reviewing. Do not mistake an automatic alternative for the manually reviewed upload. YouTube's [caption editing guide](https://support.google.com/youtube/answer/2734705?hl=en) explains text and timing revisions.")]},
    {id:"after-video-edits",title:"Recheck after replacing the edit",blocks:[p("A change to the picture or audio timeline can invalidate a previously correct subtitle file. Keep the subtitle revision tied to the approved edit and review the affected sections after cuts, new intros or reordered scenes."),p("For a constant delay or a changed cut, use the existing [subtitle sync guide](/blog/fix-subtitles-out-of-sync) before another upload. For wording changes, use the [Subtitle Editor](/tools/srt-editor). Do not add unrelated keywords to captions: their purpose is to communicate the recording accurately.")]}
  ]
},
{
  slug:"youtube-auto-captions-not-available",title:"YouTube Automatic Captions Not Available? A Practical Diagnostic Guide",seoTitle:"YouTube Auto Captions Not Available: What to Check",description:"Separate processing delays, unsupported language and difficult audio from viewer-track problems. Prepare reviewed captions when automatic generation is unavailable.",category:"Auto Captions",keyword:"YouTube automatic captions not available",intent:"Diagnose absent automatic captions on uploaded videos",kind:"troubleshooting",
  introduction:"If YouTube's auto-generated captions are unavailable, check the video's processing state, language and speech quality before repeatedly uploading it. YouTube's subtitle generator does not guarantee automatic captions for every recording. For a video you manage, a reviewed manual or uploaded caption track can provide a practical alternative while you investigate the cause.",
  sections:[
{
  "id": "prepare-alternative-aenural",
  "title": "Prepare a reviewed alternative from your own recording",
  "blocks": [
    {
      "type": "p",
      "text": "Check Studio’s track list before changing a viewer’s language setting. When automatic generation remains unavailable, use your authorized source recording to prepare a caption file. This avoids repeatedly uploading the same video without changing the audio problem. The alternative still needs both a wording pass and a playback check."
    },
    {
      "type": "steps",
      "items": [
        "Prepare an audio copy containing the intended conversation and verify it plays completely. Open [AENural’s audio-to-text converter](/tools/free-audio-to-text-converter-online) and select **Upload Audio**.",
        "Set **Spoken Language** deliberately. Leave **Text Language** at **Same as spoken language** when you want captions matching the source, then select **Convert to Text**.",
        "Under **Review your transcript**, correct names, numbers, speaker transitions and uncertain words against the original audio. Inspect the **Start** and **End** times for meaningful synchronization.",
        "Select **Download SRT** and use YouTube Studio’s timed-file upload workflow for the video you manage. Inspect the uploaded track separately from any automatic track that later appears."
      ]
    },
    {
      "type": "p",
      "text": "If AENural also reports no speech on a silent opening sample, choose a representative passage containing dialogue and investigate the source audio. A second recognizer cannot supply speech absent from the exported file. Keep the original video and the reviewed SRT paired so a later channel edit does not silently break the new track."
    }
  ]
},
    {id:"separate-the-symptoms",title:"Separate missing generation from hidden playback",blocks:[table("Which problem do you have?",["Observation","Next check"],[["No automatic track in Studio","Processing, language and recognizable speech."],["A track exists in Studio but is not the one selected","Viewer caption controls and the chosen language/track."],["Captions appear but words are wrong","Review recognition output; this is a quality problem."],["Only another person's video lacks captions","Your viewer account cannot create a channel-owned track without permission."]]),p("Write down the exact video and what appears in its subtitle list. A missing transcript button and a failed automatic caption job are related possibilities, not the same diagnosis.")]},
    {id:"official-causes",title:"Check the causes YouTube documents",blocks:[p("YouTube's [automatic-caption help](https://support.google.com/youtube/answer/6373554?hl=en) lists processing of complex audio, unsupported language, long videos, poor speech recognition, a long silent opening and overlapping speakers or languages among reasons captions may not appear. It also says automatic text needs review because recognition can misrepresent speech."),steps("Check whether processing is still underway rather than assuming an immediate failure.","Confirm the recording's actual language and whether the source contains clear speech.","Listen to the opening and several later passages for silence, music, distortion or overlapping conversation.","Compare the exact uploaded export with the editor's source; verify the intended speech track was included."),p("There is no reliable universal waiting time that proves a job will finish. Repeated reuploads can create duplicate versions and complicate review without addressing an unsupported language or missing audio track.")]},
    {id:"provide-captions",title:"Provide reviewed captions when generation is not the answer",blocks:[p("For a video you are authorized to edit, prepare a timed caption file or use Studio's supported manual workflow. Start from the original recording, review the words, then check timing and important sounds. Do not treat an unchecked alternate automatic draft as a verified replacement."),note("Viewer controls do not create missing content","Changing a viewer's caption language cannot manufacture a reviewed track that the video does not have. Separate your channel-management options from what a viewer can select.")]},
    {id:"final-confirmation",title:"Confirm the fix in playback",blocks:[checklist("A usable caption track is present for the intended language.","The viewer selects the track you actually reviewed.","Recognition errors in names, numbers and negations are corrected.","The final upload matches the captioned recording."),p("Use the [YouTube SRT upload guide](/blog/upload-srt-youtube-captions) for a timed-file path. For source problems, the [MP4 audio-track checklist](/blog/mp4-transcription-no-audio-track) helps establish whether the recognizer received the intended conversation at all.")]}
  ]
},
{
  slug:"youtube-transcript-own-video-download",title:"How to Get a Transcript of Your Own YouTube Video",seoTitle:"Get Your YouTube Transcript: View, Download, Review",description:"Distinguish viewing caption text from downloading an owned video's caption file. Keep timing, permissions and transcript accuracy clear.",category:"Video to Text",keyword:"download YouTube transcript own video",intent:"Obtain and review text from an owned or authorized YouTube video",kind:"tutorial",
  introduction:"To get a transcript from video you uploaded to YouTube, distinguish the viewer transcript from the caption-file controls in YouTube Studio. The viewer transcript helps you read and navigate existing captions; an authorized caption download preserves a file for further work. Check the source track and recording before treating either as a verified transcript.",
  sections:[
{
  "id": "download-and-extract-aenural",
  "title": "Turn your downloaded captions into readable text",
  "blocks": [
    {
      "type": "p",
      "text": "YouTube’s current caption-editing help uses **Studio > Subtitles**, then the video and language entry, **Edit**, **Options** and **Download subtitles**. Use an account authorized to manage that track. Preserve the downloaded timed file before making a reading copy."
    },
    {
      "type": "steps",
      "items": [
        "Check the downloaded extension and contents. For SRT, open [AENural’s SRT to TXT](/tools/srt-to-txt) and select **Choose SRT file**. For VTT, choose the corresponding [VTT to TXT tool](/tools/vtt-to-txt).",
        "If the export is SBV, use [SBV to SRT](/tools/sbv-to-srt), select **Choose SBV file**, then **Download SRT** after the ready message. Use that converted file for the TXT extraction.",
        "In SRT to TXT, choose **One cue per line** for reference checking or **Paragraph text** for a continuous reading draft. Select **Copy text** or **Download TXT**.",
        "Review speaker changes and paragraph boundaries in the reading copy. Replay quotations and difficult figures against the video; removing timestamps does not verify the words."
      ]
    },
    {
      "type": "p",
      "text": "For example, a single spoken sentence may occupy four subtitle cues. Paragraph output joins those fragments, but it cannot decide whether the next line belongs to another speaker. Keep the timed master so you can return to the relevant passage during editorial review instead of guessing from the extracted paragraph."
    }
  ]
},
    {id:"view-or-download",title:"Choose viewing or file export",blocks:[table("Two access paths",["Path","Purpose"],[["Show transcript on the watch page","Read existing caption text and jump to passages."],["Caption management in Studio","Manage the tracks for a video your account can edit."],["Written transcript from the original recording","Prepare and review text when a useful caption track is absent."]]),p("YouTube's [viewer-transcript help](https://support.google.com/youtube/answer/15930243?hl=en) documents Show transcript in the description and selecting a line to jump to its video moment. It depends on captions being present; a transcript panel is not an independent verification of the words.")]},
    {id:"owned-caption-file",title:"Use the authorized caption-management path",blocks:[steps("Sign in with the account permitted to edit the video and open its subtitles in Studio.","Identify the language and track revision, distinguishing automatic captions from reviewed edits.","Use the available track download controls documented by YouTube, preserving a copy of the original export.","Open the downloaded file and check its words, cue range and format before converting or editing it."),p("YouTube's [caption editing documentation](https://support.google.com/youtube/answer/2734705?hl=en) covers downloading caption files for timing edits. The [official caption-download API](https://developers.google.com/youtube/data/reference/rest/v3/captions/download) also requires authorization and permission to edit the video; it is not an anonymous download method for every public URL.")]},
    {id:"make-reading-copy",title:"Make a reading copy without losing the master",blocks:[p("If your download is a timed subtitle file, keep it before extracting plain text. Use [SRT to TXT](/tools/srt-to-txt) or [VTT to TXT](/tools/vtt-to-txt) for the actual source format. Review paragraph and speaker boundaries after conversion."),code("Illustrative editorial distinction","Caption export: short timed blocks for playback.\nReading transcript: grouped sentences with verified speakers.\nSummary: selected main points, labeled as a summary."),p("Do not remove inconvenient words or rearrange quotations while calling the result verbatim. A transcript intended for research or quotation should remain traceable to the recording, including uncertain passages.")]},
    {id:"missing-source",title:"When there is no useful caption track",blocks:[p("Return to the original authorized recording and prepare a transcript through a supported workflow. Do not bypass video restrictions, share account tokens with a random extractor, or present a scraped file as proof of accuracy."),checklist("The text belongs to the correct video version and language.","The track type is recorded.","Names, figures and quotations were verified against audio.","The timed master and edited reading copy are labeled separately."),p("For a supported recording file, the [audio-to-text converter](/tools/free-audio-to-text-converter-online) offers a draft starting point. It is a recording workflow, not a promise to retrieve subtitles from arbitrary YouTube links.")]}
  ]
},
{
  slug:"youtube-translated-subtitle-tracks",title:"YouTube Translated Subtitles: Keep Source Captions and Language Tracks in Sync",seoTitle:"YouTube Translated Subtitles: A Review Workflow",description:"Plan reviewed translations, label languages accurately and recheck target text after source edits. Separate subtitles, translated metadata and dubbing.",category:"Subtitle Tutorials",keyword:"YouTube translated subtitles",intent:"Maintain reviewed language subtitle tracks for owned videos",kind:"workflow",
  introduction:"Start YouTube subtitle translation from a reviewed source-caption file, then prepare and check each target-language track separately. Keep the source revision, language label and timing reference explicit. When you translate captions, review the timed text separately from translated titles/descriptions and dubbed audio; these are different deliverables.",
  sections:[
{
  "id": "target-track-aenural",
  "title": "Check each target-language file before uploading",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Open [AENural’s Subtitle Editor](/tools/srt-editor), select **Upload subtitle file** and choose the translated SRT or VTT delivered by your language reviewer. Keep the reviewed source-language master separately.",
        "Compare **Subtitle text** with the approved translation. Check names, numbers and units, then inspect **Start** and **End** around a long target-language sentence. Do not assume unchanged source timing provides enough reading time.",
        "Select **Download SRT** when the receiving upload uses that format. In YouTube Studio, choose the actual target language and the timed-file upload path for the correct video.",
        "Review that track in playback, including a recent source correction. Confirm that you are seeing the creator-supplied target track rather than another language or an automatic alternative."
      ]
    },
    {
      "type": "p",
      "text": "Suppose the English source changes a delivery date from Tuesday to Thursday. The Spanish translation and every other target track need that same substantive correction. A filename update alone does not change the words, and a successful upload cannot determine which translation revision reflects the approved claim."
    },
    {
      "type": "p",
      "text": "If a target track still needs language review, retain that status in the handoff rather than marking it approved because the file is technically valid. Record the affected cue and the language reviewer’s decision, then reconcile related exports. Keep a revised glossary when a product name changes. This makes the next episode or clip easier to maintain without treating machine output as approved language work or promoting a translation feature that has not been released."
    }
  ]
},
    {id:"correct-source-first",title:"Correct the source before translating",blocks:[p("Names, numbers and missing negations can spread into every language if the source captions are wrong. Keep one reviewed source revision and a glossary of verified terms. Mark uncertainty before translation rather than asking a translator to infer speech that the source review never established."),flow("A translation handoff","Reviewed source captions","Target-language translation","Language and timing review","Track-specific upload")]},
    {id:"separate-language-assets",title:"Keep each language asset distinct",blocks:[p("YouTube's [translation-tools overview](https://support.google.com/youtube/answer/4792576) distinguishes translated metadata and creator-supplied subtitles. A translated title does not add a subtitle track, and subtitles do not create dubbed speech. State exactly what your delivery includes."),table("A useful language handoff record",["Field","Illustrative value"],[["Source revision","episode-07-en-r03"],["Target language","Spanish; confirm the required regional conventions."],["Video reference","Approved picture edit r05"],["Review status","Native-language review complete; timing pass pending."]]),p("These are example labels, not required YouTube filenames. Keep enough information to identify which source a translation followed when an edit arrives later.")]},
    {id:"add-reviewed-track",title:"Add the reviewed target track",blocks:[steps("Prepare the target-language captions using the same approved video reference.","Have a competent reader check meaning, terminology and speaker attribution.","Review line length and display time; translated text may not fit the original segmentation comfortably.","Use Studio's language/subtitle workflow for the intended video and verify the uploaded track in playback."),p("The [official subtitle-upload guide](https://support.google.com/youtube/answer/2734796?hl=en) documents adding a language and choosing an upload path. Select the language that matches the actual file contents, then inspect the track rather than relying only on the export filename.")]},
    {id:"handle-source-updates",title:"Treat source edits as translation changes too",blocks:[p("If the source video loses a sentence or changes a product claim, identify the corresponding cues in every translation. A spelling-only change and a newly edited scene need different work. Do not blindly shift an entire language track when only one section changed."),checklist("Source and target meaning agree.","Names, figures and units remain correct.","The target text fits its display intervals.","Every reviewed track matches the final video revision."),p("Use the [Subtitle Editor](/tools/srt-editor) for supported text/timing corrections and keep a change log. Machine translation can provide a starting draft, but the language and playback review are separate gates; no guarantee of translation quality follows from preserved timestamps.")]}
  ]
}
];
