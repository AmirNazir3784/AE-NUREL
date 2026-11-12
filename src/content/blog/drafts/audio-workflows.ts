import { type EditorialDraft, p, steps, checklist, table, code, note } from "../draft-model.ts";

export const audioWorkflowDrafts: EditorialDraft[] = [
{
  slug:"clean-up-ai-transcript",title:"How to Clean Up an AI Transcript Without Changing What Was Said",seoTitle:"Clean Up an AI Transcript Without Changing Meaning",description:"Review names, numbers, speaker changes and uncertainty in an automatic transcript. Separate verbatim corrections from edited reading copies.",category:"Audio Transcription",keyword:"clean up AI transcript",intent:"Proofread a draft transcript faithfully",kind:"workflow",
  introduction:"An AI audio-to-text converter produces a draft. Clean up that transcript by checking it against the recording, prioritizing names, numbers, negations and speaker changes. Decide whether the deliverable is verbatim or edited before removing fillers. Keep uncertainty visible rather than replacing unclear speech with a confident guess.",
  sections:[
{
  "id": "review-in-aenural",
  "title": "Correct the draft in AENural before exporting",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Open the [audio-to-text converter](/tools/free-audio-to-text-converter-online), select **Upload Audio** and choose the recording you are authorized to transcribe. Confirm that the complete intended file is selected.",
        "Set **Spoken Language** to the recording’s language when known. Leave **Text Language** at **Same as spoken language** for a faithful source transcript. Under **Transcription Quality**, choose **Accurate** if available or **Fast** for a quicker draft, then select **Convert to Text**.",
        "In **Review your transcript**, edit the numbered caption text fields while replaying the original recording. Use **Undo** if a correction changes the wrong passage.",
        "Select **Download TXT** for a reading copy. Keep **Download SRT** or **Download VTT** as well when you need to preserve the corrected timing for later captions."
      ]
    },
    {
      "type": "p",
      "text": "For the fifteen-versus-fifty example below, first locate the actual phrase using its Start time. Replay enough context to hear both the quantity and the delivery day. Correct only what the recording establishes. If the number remains unclear, keep a marked uncertainty and request clarification rather than completing a plausible sentence."
    },
    {
      "type": "p",
      "text": "Download your corrections before replacing the recording or generating again. A new recognition pass is another draft, not a reliable way to preserve your manual changes. For an existing subtitle file, open the [Subtitle Editor](/tools/srt-editor) instead of transcribing the same audio unnecessarily."
    }
  ]
},
    {id:"define-the-copy",title:"Define what cleanup is allowed to change",blocks:[table("Two review briefs",["Brief","Appropriate focus"],[["Verbatim transcript","Correct recognition mistakes while preserving the spoken wording and relevant hesitations."],["Edited reading copy","Make approved readability edits without changing claims or attributing new words to a speaker."]]),p("Write the brief beside your working file. If a client needs exact quotations, a polished paraphrase is not an adequate substitute. Keep the original automatic export and use a separate revision so disagreements can be traced back to the audio.")]},
    {id:"high-risk-first",title:"Review meaning-changing errors first",blocks:[checklist("Names, organizations and specialist terms.","Dates, amounts, measurements and decimal points.","Negations such as not, never and cannot.","Speaker changes, interruptions and uncertain attributions."),code("Illustrative review note","Draft: We can ship fifteen units on Thursday.\nCheck: replay the number and delivery day.\nIf unclear: flag the passage with its audio time; do not guess fifty."),p("[W3C's transcription guidance](https://www.w3.org/WAI/media/av/transcribing/) recommends accurate, honest transcription and allows an automatic draft as a starting point. Use the recording as the authority for words, rather than treating grammatical fluency as evidence of correctness.")]},
    {id:"two-pass-process",title:"Use a meaning pass, then a reading pass",blocks:[steps("Replay the recording in manageable passages and correct meaning-changing errors first.","Create a short glossary of verified names and terms, including their approved spelling.","Check speaker transitions and mark unresolved passages with timestamps for follow-up.","Only then adjust punctuation, paragraphs and any explicitly permitted filler removal."),p("Global replacement is useful for a repeatedly misspelled name, but inspect each replacement. A short string can occur inside another word or refer to a different person. Preserve the speaker's intended meaning when punctuation has more than one plausible interpretation."),note("Do not turn uncertainty into certainty","If the audio does not establish the words, keep a marked uncertainty or ask the content owner. A likely sentence is still an invention when presented as something the person actually said.")]},
    {id:"export-review",title:"Review the actual export",blocks:[p("A readable TXT transcript and a subtitle file need different finishing work. Captions require timed segmentation; a text export may need paragraphs. Keep the timed master if the recording may later be captioned or clipped."),checklist("Every correction to a quote was checked against audio.","Editorial omissions or summaries are labeled.","The exported file retains names, punctuation and Unicode text.","The final version and unresolved review notes are clearly distinguished."),p("Start from the [audio-to-text converter](/tools/free-audio-to-text-converter-online) when you need a draft from a recording. For a saved SRT, [SRT to TXT](/tools/srt-to-txt) extracts the existing caption words; it does not independently verify them.")]}
  ]
},
{
  slug:"wav-vs-mp3-transcription",title:"WAV vs MP3 for Transcription: What Actually Changes?",seoTitle:"WAV vs MP3 for Transcription: Choose an Input",description:"Compare source quality, file size and re-encoding before transcription. Understand why turning an MP3 into WAV does not restore discarded audio detail.",category:"Audio Transcription",keyword:"WAV vs MP3 transcription",intent:"Choose an audio export for speech recognition",kind:"comparison",
  introduction:"Use a clear supported recording for transcription, preserving an uncompressed PCM WAV master when you have one. MP3 can be a practical smaller input, but converting an existing MP3 to WAV does not restore information lost earlier. Format choice is one part of audio quality, not a guarantee of transcript accuracy.",
  sections:[
{
  "id": "aenural-format-comparison",
  "title": "Compare the two inputs with the same AENural settings",
  "blocks": [
    {
      "type": "p",
      "text": "An MP3 audio-to-text converter cannot repair detail that was lost before the file reached it. To decide whether a smaller copy is adequate, compare a meaningful short passage rather than exporting a whole project in several formats."
    },
    {
      "type": "steps",
      "items": [
        "Open [AENural’s audio-to-text converter](/tools/free-audio-to-text-converter-online) and select **Upload Audio**. Choose a short PCM WAV passage from your original source.",
        "Set **Spoken Language** explicitly and keep **Text Language** at **Same as spoken language**. Select **Convert to Text** and save the result with **Download TXT**.",
        "Repeat with an MP3 made from that same passage, using the same language and transcription settings. Keep the two exports under distinguishable filenames.",
        "Compare the words against the source recording. Record specific differences in a name, a quiet word and a number; do not assume the larger file wins because of its size."
      ]
    },
    {
      "type": "p",
      "text": "If both drafts make the same mistake in an unfamiliar name, supply the verified spelling during review. If the WAV cannot be decoded, check its encoding: a .wav extension alone does not establish that it contains supported PCM audio. A format-import failure and a wrong recognized word are separate problems."
    },
    {
      "type": "p",
      "text": "When comparing inputs in a free audio-to-text converter, check that the free allowance covers both samples and their downloads. Use whichever supported input preserves intelligible speech without an unnecessary conversion. Keep the best original as your reference, even when a smaller MP3 becomes the practical working copy."
    }
  ]
},
    {id:"source-over-extension",title:"The source matters more than the extension",blocks:[p("A quiet, well-recorded conversation saved as MP3 can be easier to transcribe than a noisy WAV. Distance from the microphone, overlapping speech and distortion remain audible problems regardless of the filename. Keep the best original recording rather than repeatedly exporting through different formats."),table("Practical format trade-offs",["Input","Benefit","Limitation"],[["Uncompressed PCM WAV","Avoids a new lossy encoding step.","Larger files can exceed a service's input limit."],["MP3","Usually smaller and convenient to exchange.","Lossy encoding can remove information; repeated conversion cannot recover it."],["MP3 converted to WAV","May meet an application's accepted-format requirement.","Does not recreate the original uncompressed source."]]),p("The [Audacity format reference](https://manual.audacityteam.org/man/export_formats_supported_by_audacity.html) distinguishes PCM WAV from lossy MP3. WAV is a container that can carry different encodings, so 'all WAV is uncompressed' is too broad.")]},
    {id:"make-a-fair-test",title:"Compare without changing several variables",blocks:[steps("Keep one original recording and choose a short representative passage with difficult speech.","If you have the uncompressed source, make supported input copies from that source rather than converting one lossy copy repeatedly.","Use the same transcription language and settings for the comparison.","Compare actual errors in names and words; do not infer an accuracy percentage from file size."),p("A small comparison can help choose an input for your recording. It is not a benchmark proving one format wins across languages, models and microphones. Avoid attributing a different result solely to the extension when processing settings or audio content also changed.")]},
    {id:"size-check",title:"Estimate size before a long export",blocks:[code("Illustrative uncompressed PCM estimate","48,000 samples/second × 16 bits × 1 channel ÷ 8\n= 96,000 bytes/second\nTen minutes: about 57.6 MB of sample data, excluding headers."),p("This arithmetic describes one PCM configuration, not every WAV file. Stereo doubles sample data at the same rate and bit depth. Check your tool's actual limit before preparing a long file, and do not reduce quality more than necessary merely to get under it.")]},
    {id:"choose-and-review",title:"Choose once, then spend effort on review",blocks:[checklist("The file plays clearly and contains the intended speakers.","Its codec and size meet the receiving tool's requirements.","No unnecessary repeated lossy export was introduced.","The transcript is checked against audio regardless of format."),p("Use the [audio-to-text converter](/tools/free-audio-to-text-converter-online) with a supported input and review the result. A better export may prevent avoidable damage, but it will not resolve a word that was never intelligible in the original recording.")]}
  ]
},
{
  slug:"transcribe-noisy-audio-accurately",title:"Noisy Audio Transcription: Improve the Input Without Inventing the Words",seoTitle:"Noisy Audio Transcription: A Careful Workflow",description:"Choose a better recording, test gentle cleanup and review uncertain speech. Avoid overprocessing audio or treating guessed transcript text as fact.",category:"Audio Transcription",keyword:"transcribe noisy audio",intent:"Prepare and review difficult speech recordings",kind:"troubleshooting",
  introduction:"For noisy audio transcription, start with the clearest available recording, test any cleanup on a copy, and review uncertain words against the original. Noise reduction can help some steady background sounds, but aggressive processing can damage speech. Even when an online audio-to-text converter produces a fluent sentence, check unclear words against the recording. Mark unintelligible speech rather than inventing a likely answer.",
  sections:[
{
  "id": "compare-noisy-drafts",
  "title": "Check a difficult passage in AENural",
  "blocks": [
    {"type":"p","text":"Keep **Transcription Quality** the same for both comparison runs; changing the model setting as well as the audio makes it harder to tell what helped."},
    {
      "type": "steps",
      "items": [
        "Open the [audio-to-text converter](/tools/free-audio-to-text-converter-online), select **Upload Audio** and choose a short original passage containing the problem speech.",
        "Set **Spoken Language**, retain **Same as spoken language** under **Text Language**, and select **Convert to Text**. Save this first draft with **Download TXT**.",
        "If you made a cleaned copy, process the identical passage with the same settings. Compare both transcripts against the untreated recording, especially quiet consonants, names and negations."
      ]
    },
    {
      "type": "p",
      "text": "Keep separate review notes for each uncertain phrase and its source time. A second draft that sounds more grammatical is not necessarily more accurate. AENural’s review fields let you correct the transcript; they are not evidence that a noise filter recovered a previously inaudible word."
    },
    {
      "type": "p",
      "text": "If cleanup changes the recording’s duration or removes pauses, do not reuse its subtitle timing with the original video until you have checked synchronization. Preserve a matching recording for each timed export."
    }
  ]
},
    {id:"choose-source",title:"Choose the best source before adding effects",blocks:[p("Check whether you have an isolated microphone track, a better camera recording or the original meeting audio. A mixed video soundtrack with music and room noise may not be the strongest source. Listen to alternatives at comparable playback volume so louder does not automatically seem clearer."),table("Match the problem to the next check",["Problem","First check"],[["Steady hum or hiss","Test a conservative steady-noise treatment on a copy."],["Several people talking together","Look for separate microphone tracks and review manually."],["Distorted or clipped speech","Find a cleaner original; avoid promising full recovery."]]),p("Make a note of whether the difficulty is steady noise, echo, overlapping people, clipping or very quiet speech. These are different problems; one noise-removal setting should not be expected to fix all of them.")]},
    {id:"test-cleanup",title:"Try a small cleanup experiment",blocks:[steps("Duplicate the recording and choose a short passage that includes speech and the problem noise.","Apply only the processing intended for that problem, using conservative settings.","Compare the processed passage with the original, listening especially to consonants and quiet words.","Keep the processed version only if it helps intelligibility; retain the original for verification."),p("[Audacity's Noise Reduction manual](https://manual.audacityteam.org/man/noise_reduction.html) describes steady-noise reduction, the need for a noise-only profile and the risk of damaging wanted audio. Its warnings are a reason to test, not a promise that a filter can recover severely obscured speech."),note("Silence is not always improvement","A cleaner-sounding background can coexist with less intelligible speech. Judge the words you need to understand, not only how quiet the gaps become.")]},
    {id:"recognize-and-review",title:"Transcribe with uncertainty in view",blocks:[p("Select the spoken language deliberately when the tool allows it. Run a representative sample before committing to a long file. Compare recognition on the original and processed versions only if both copies remain aligned and you can identify which one produced each draft."),checklist("Replay names, figures and negations.","Check whether overlapping speakers were merged into one sentence.","Mark unresolved passages with a time reference.","Do not use a fluent generated phrase as a substitute for audible evidence."),p("An [audio-to-text converter](/tools/free-audio-to-text-converter-online) can provide a draft, but review remains necessary. Keep the untreated recording available so every uncertain passage can still be checked.")]},
    {id:"next-recording",title:"Prevent the next difficult recording",blocks:[p("For future sessions, reduce competing sound at the source, keep the microphone near the speaker and ask participants to avoid talking over one another. Record a brief test and listen back before the important conversation begins. Those changes are easier to assess than trying to rescue a whole episode later."),p("Keep a short issue log for the current file: source chosen, processing applied, known uncertain passages and review status. It helps a second reviewer find the difficult parts without mistaking an automatically generated draft for a verified transcript.")]}
  ]
},
{
  slug:"transcribe-long-audio-in-sections",title:"How to Transcribe Long Audio in Sections Without Losing the Timeline",seoTitle:"Transcribe Long Audio Without Losing Continuity",description:"Plan recording sections, retain source offsets and reconcile overlap text. Keep transcript times traceable when an audio file exceeds a tool's limits.",category:"Audio Transcription",keyword:"transcribe long audio files",intent:"Manage long recording transcription with chunk continuity",kind:"workflow",
  introduction:"When a long recording exceeds your audio-to-text converter's limits, divide a copy into manageable sections and record each section's original start time. Review boundaries for missing or duplicated words, then restore source-time references where needed. Keep the complete recording and section map as the authority for the combined transcript.",
  sections:[
{
  "id": "process-sections-aenural",
  "title": "Keep each AENural export tied to its source section",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Open [AENural’s audio-to-text converter](/tools/free-audio-to-text-converter-online), select **Upload Audio** and choose Part 01. Read its displayed limits and any input error before proceeding.",
        "Choose **Spoken Language** and keep **Text Language** at **Same as spoken language**. Select **Convert to Text**, review the opening and ending, then save **Download TXT** and any required SRT or VTT.",
        "Save those corrections before choosing the next section. Apply the same **Spoken Language** and **Transcription Quality** choices to comparable parts, and keep every output paired with its recording filename."
      ]
    },
    {
      "type": "p",
      "text": "For Part 02 starting at source 15 minutes, its local 12.5-second line belongs at source 15:12.500. That offset is the export in-point, including any overlap you deliberately retained. Write it in the section map before combining files; a filename such as part-02 does not carry this timing information inside its captions."
    },
    {
      "type": "p",
      "text": "If Part 01’s last subtitle ends before the recording ends, appending Part 02 after that cue will start it early. The [SRT Merger](/tools/srt-merger) uses the previous maximum subtitle end plus a shared gap, so calculate the required gap from the actual source boundary. For unequal boundaries, merge in controlled stages rather than applying one guessed gap to every chapter."
    },
    {
      "type": "p",
      "text": "A combined TXT may not need detailed timestamps, but keep the private source map until the complete transcript has been reviewed."
    }
  ]
},
    {id:"map-the-sections",title:"Create a section map before exporting",blocks:[code("Illustrative source-time map","Part 01: source 00:00:00.000 → 00:15:00.000\nPart 02: source 00:15:00.000 → 00:30:00.000\nA word at Part 02 time 00:00:12.500 belongs at source 00:15:12.500."),p("These are example boundaries, not AENural upload limits or recommended universal chunk lengths. Choose sections that fit the receiving tool's displayed file-size and duration restrictions. Prefer natural pauses where possible so one sentence is not cut in half."),p("[Audacity's section-export guidance](https://manual.audacityteam.org/man/export_multiple.html) explains dividing a recording into separate tracks. Whatever editor you use, retain the source position of each exported section.")]},
    {id:"boundary-strategy",title:"Decide how to handle words at a boundary",blocks:[table("Boundary approaches",["Approach","Benefit","Review requirement"],[["Cut at a natural pause","Less chance of splitting a word or sentence.","Verify both neighboring exports include the complete speech."],["Include a small overlapping passage","Adds context around the split.","Remove duplicated words deliberately when combining drafts."],["Use exact adjacent cuts","Simple time map.","Check a word is not truncated or omitted at the join."]]),p("If you use overlap, record the actual export in-point rather than the intended chapter start. Otherwise adding a nominal fifteen-minute offset can misplace every timestamp in the second part. Keep overlap as a documented choice, not an invisible correction.")]},
    {id:"transcribe-review",title:"Process and review one section at a time",blocks:[steps("Save consistently numbered copies, the complete master and a source-time map.","Use the same language and transcription settings across comparable sections.","Review each section, recording names and terms in a shared glossary.","Reconcile the final sentence before each boundary with the first sentence after it.","Convert section-relative time references back to source time if the deliverable requires them."),p("Use the [audio-to-text converter](/tools/free-audio-to-text-converter-online) only within its displayed supported limits. This approach does not make any tool unlimited, and processing speed or memory use should not be inferred from the duration of one successful sample.")]},
    {id:"combine-the-review",title:"Review the combined result",blocks:[checklist("No sentence is missing or repeated at a section boundary.","Speaker names and terminology stay consistent.","Source offsets were applied exactly once.","The closing passage matches the end of the original recording."),p("For subtitle outputs, joining reviewed files introduces another timing task. Follow the [SRT merge-offset guide](/blog/merge-srt-files-correct-offsets) and use the actual source positions. A plain-text transcript can omit detailed timings if they do not help its reader, while your private section map remains useful for verification.")]}
  ]
},
{
  slug:"m4a-voice-recording-transcription-import",title:"M4A Voice Recording Won't Transcribe? Check the File Before Converting",seoTitle:"M4A Transcription Import Problems: What to Check",description:"Prepare a real voice-recording export, confirm playback and supported codecs, and convert a copy only when necessary. Renaming M4A does not make an MP3.",category:"Audio Transcription",keyword:"M4A transcription not working",intent:"Troubleshoot saved phone recording import",kind:"troubleshooting",
  introduction:"If an audio-to-text converter rejects your M4A voice recording, confirm that you exported the actual audio file, that it plays completely, and that the receiving tool supports its codec and size. Renaming .m4a to .mp3 does not convert it. Make a supported export copy only after identifying the restriction.",
  sections:[
{
  "id": "try-m4a-aenural",
  "title": "Try the real recording in AENural first",
  "blocks": [
    {
      "type": "p",
      "text": "AENural’s audio input lists M4A among its supported recording formats, subject to codec compatibility. That means you should test the actual exported file before converting it simply because an older tutorial recommends MP3."
    },
    {
      "type": "steps",
      "items": [
        "Open the [audio-to-text converter](/tools/free-audio-to-text-converter-online) and select **Upload Audio**. Choose the saved M4A file rather than a sharing URL or a recording-app project.",
        "Wait for **Recording ready** and check the displayed duration. If decoding fails, note the exact message and compare the file’s independent playback before making a replacement copy.",
        "Set **Spoken Language**, keep **Text Language** at **Same as spoken language**, and select **Convert to Text**. A translation target changes the task; leave it unchanged when you want the original words.",
        "In **Review your transcript**, replay the last spoken sentence as well as the opening. Correct the words, then select **Download TXT**, **Download SRT** or **Download VTT** for the required output."
      ]
    },
    {
      "type": "p",
      "text": "On the current iOS 27 Voice Memos instructions, sharing options distinguish **Rendered**, which creates a single M4A with effects and layers mixed in, from **Editable**, which needs compatible software. Choose an actual playable audio export for this workflow. Earlier iOS versions can show different options; use Apple’s guide for your version."
    },
    {
      "type": "p",
      "text": "If an export stops early, preserve the original and compare its ending before blaming transcription. Repeatedly retrying the same incomplete copy cannot supply missing audio."
    }
  ]
},
    {id:"get-actual-file",title:"Export a recording, not an app shortcut",blocks:[p("A share link, a project item and a playable audio file are different things. Save the recording through its app's supported export/share workflow, then confirm the saved file can be opened independently. Check its duration so you do not accidentally send a trimmed excerpt."),p("Apple documents the recording-sharing workflow in [Voice Memos help](https://support.apple.com/en-gb/guide/iphone/iph3d6dc359/27/ios/27). Options and labels vary with system version; use the instructions for the version you actually have and keep the original recording intact.")]},
    {id:"identify-failure",title:"Identify the failure stage",blocks:[table("Where the process stops",["Stage","What to check"],[["The file cannot be selected","Accepted extensions and the actual saved file type."],["It opens but cannot be decoded","The audio codec, damaged/incomplete export or unsupported variant."],["It starts but stops early","Duration/size limits and whether the file itself plays to the end."],["It finishes with poor words","Speech quality and language selection, rather than only the container."]]),p("M4A is associated with MPEG-4 audio containers and can carry different audio encodings. [MDN's container-format guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers) explains why container and codec are separate compatibility considerations.")]},
    {id:"convert-only-if-needed",title:"Convert a copy when the receiver needs it",blocks:[steps("Read the tool's accepted formats and restrictions, and note the exact error.","Preserve the original M4A and export a copy through software that can decode it.","Choose a supported target such as PCM WAV or MP3 only when the destination accepts that encoding.","Play the exported copy, checking the opening, a middle passage and the ending before transcription."),p("[Audacity's import/export FAQ](https://manual.audacityteam.org/man/faq_opening_and_saving_files.html) documents that broader format support can depend on the optional FFmpeg library and platform. Check your installed build rather than downloading a random codec pack or assuming every installation behaves identically."),note("Conversion is not restoration","A larger output file does not prove improved recording quality. Avoid repeated lossy exports; use the original source whenever practical.")]},
    {id:"review-transcript",title:"Check the words after import succeeds",blocks:[checklist("The complete intended recording was transcribed.","The spoken language is correct.","Names, numbers and speaker changes were reviewed.","The transcript export meets the actual task, whether notes or timed captions."),p("Check the accepted-input controls in AENural's [audio-to-text converter](/tools/free-audio-to-text-converter-online) before using a converted copy. A successful upload solves an import problem; it does not verify the accuracy of the resulting transcript.")]}
  ]
},
{
  slug:"extract-audio-video-mp3-wav",title:"How to Extract Audio From Video: Choose MP3 or WAV for the Next Task",seoTitle:"Extract Audio From Video: MP3 or WAV?",description:"Export a video's intended audio mix, choose a suitable format and verify channels, duration and playback. Extraction does not isolate vocals or transcribe words.",category:"Video & Audio Conversion",keyword:"extract audio from video",intent:"Create a standalone audio deliverable from authorized video",kind:"tutorial",
  introduction:"A video-to-audio converter exports a video's intended audio track or mix to a supported audio format. Choose PCM WAV for an editable uncompressed copy, or MP3 when a smaller delivery file suits the task. This does not separate voices from music or turn speech into text; those are different operations.",
  sections:[
{
  "id": "premiere-audio-only",
  "title": "Use an existing Premiere sequence for an audio-only copy",
  "blocks": [
    {
      "type": "p",
      "text": "If you already edit in Premiere, Adobe’s current desktop documentation describes Export mode and its audio settings. For a smaller listening copy, use a video-to-MP3 converter or your editor's MP3 export. For an uncompressed editing copy, choose PCM WAV."
    },
    {
      "type": "steps",
      "items": [
        "Select the intended sequence and review its audio mix. Check muted tracks and any active in/out range so the export includes the required conversation.",
        "Enter **Export** mode. Choose an audio-only format supported by the installed version, such as MP3 for a listening copy or Waveform Audio for an appropriate WAV export. Confirm the output name and location.",
        "Inspect the **Audio** settings for channels and sample rate. Export a short representative selection first if your mix includes separate microphones or several languages.",
        "Open the saved audio independently. Compare duration, the first spoken line, a middle passage and the ending with the sequence before exporting or processing a longer copy."
      ]
    },
    {
      "type": "p",
      "text": "For example, a stereo podcast sequence might place different microphones on different channels. A mono export can be useful, but only if the intended mix still contains both speakers clearly. Do not mistake a missing guest channel for a speech-recognition failure."
    },
    {
      "type": "p",
      "text": "For written text afterward, select **Upload Audio** in the [audio-to-text converter](/tools/free-audio-to-text-converter-online), set **Spoken Language** and choose **Convert to Text**. The extracted recording remains your evidence when reviewing names and quotations."
    }
  ]
},
    {id:"choose-source-mix",title:"Choose the correct track or mix",blocks:[p("A video can contain more than one audio stream, or an editing project can have several microphone and music tracks. Decide whether you need the finished mix, an isolated speaker track or another language before exporting. The first listed track is not automatically the intended deliverable."),p("If speech is missing from an exported mix, check mute/solo settings and track routing in the project. Do not start transcription or aggressive cleanup until the audio file contains the intended conversation.")]},
    {id:"choose-format",title:"Choose the format for the next task",blocks:[table("A practical export choice",["Next task","Consider","Caveat"],[["More audio editing","PCM WAV","Check channel layout and receiver requirements; files can be large."],["A smaller listening copy","MP3","Lossy encoding is a delivery choice, not restoration."],["Keep existing compressed audio unchanged","A supported stream-copy/remux workflow","Requires a compatible output format and does not create PCM audio."],["Written transcript","Transcription after extracting suitable audio","An MP3 download alone contains no transcript."]]),p("Adobe's [export settings reference](https://helpx.adobe.com/premiere/desktop/render-and-export/export-files/overview-of-export-settings.html) describes audio options and channel behavior. Check the actual export format and audio settings, not merely the new filename.")]},
    {id:"export-copy",title:"Export a copy without disturbing the project",blocks:[steps("Open an authorized source video or the final editing sequence.","Set the intended full range or a deliberate in/out selection, noting which one is active.","Choose an audio-only delivery format and confirm the required mix/channel settings.","Export to a new filename, then open the resulting audio file in a separate player."),p("Audacity's [opening and saving FAQ](https://manual.audacityteam.org/man/faq_opening_and_saving_files.html) explains that media import support can depend on FFmpeg and the operating system. If your editor cannot decode the source, use its documented supported import path rather than changing the extension."),note("No vocal isolation is implied","Exporting the mixed soundtrack keeps its music, effects and speech together. Separating a voice from a completed mix requires a different process and may introduce artifacts.")]},
    {id:"listen-before-use",title:"Verify the extracted file",blocks:[checklist("Duration and selected range match the intended source.","The intended speaker/language track is audible.","Both channels or the chosen mono mix behave as expected.","The beginning, middle and ending contain the expected content."),p("If your next step is text, use the [audio-to-text converter](/tools/free-audio-to-text-converter-online) with a supported file, then review the words. Retain the original video so timing and any meaningful visual context can still be checked.")]}
  ]
},
{
  slug:"mp4-transcription-no-audio-track",title:"MP4 Transcription Not Working? Check the Audio Track First",seoTitle:"MP4 Transcription Errors: Check the Audio Track",description:"Diagnose silent videos, wrong language streams, unsupported audio codecs and export-range mistakes before retranscribing an MP4 repeatedly.",category:"Video to Text",keyword:"MP4 transcription not working",intent:"Diagnose video input failures before recognition",kind:"troubleshooting",
  introduction:"When MP4 transcription fails in a video-to-text converter, first play the file and confirm it contains intelligible speech on the intended audio track. MP4 is a container, not a guarantee of a particular audio codec or even an audio stream. Separate decoding, track-selection and speech-recognition problems before trying another export.",
  sections:[
{
  "id": "audio-copy-aenural",
  "title": "Test the supported audio copy in AENural",
  "blocks": [
    {
      "type": "p",
      "text": "Use the exported recording to isolate the input problem. AENural’s audio transcription page is an audio-file workflow; do not assume that selecting an arbitrary MP4 there is the same as importing it into a video editor."
    },
    {
      "type": "steps",
      "items": [
        "Open the [audio-to-text converter](/tools/free-audio-to-text-converter-online), select **Upload Audio**, and choose the supported audio copy you have already played independently.",
        "Check **Recording ready** and the duration. If that stage fails, record the decoder or input error. Changing the spoken language cannot repair a missing or unreadable audio stream.",
        "Once the recording opens, choose **Spoken Language** and retain **Same as spoken language** under **Text Language**. Select **Convert to Text**.",
        "Review the generated words against the same audio copy, then download the required TXT, SRT or VTT. Compare the final spoken sentence to ensure the transcript did not stop during a long silent gap."
      ]
    },
    {
      "type": "p",
      "text": "Consider an illustrative export that contains a thirty-second silent title followed by an interview. A short test taken only from the title will correctly reveal no speech, even though the later recording is useful. Choose a sample containing the conversation before concluding that recognition is broken."
    },
    {
      "type": "p",
      "text": "If the independent audio plays correctly but the tool still rejects it, preserve the exact error and one documented export configuration. That gives you a reproducible import issue instead of a growing collection of differently re-encoded files."
    }
  ]
},
    {id:"play-the-file",title:"Start with an independent playback check",blocks:[steps("Open the exact file being transcribed, not another version in the editing timeline.","Listen near the beginning, middle and end, checking volume and the active language track.","Confirm the exported range includes the conversation and not only a silent intro.","If the file is silent, inspect the source project's audio routing and export settings before retrying."),p("A working video picture does not prove its audio can be read by every application. [MDN's media-container guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers) explains the distinction between the container and encoded streams.")]},
    {id:"classify-the-symptom",title:"Classify what actually failed",blocks:[{type:"decisions",items:[{label:"The video has no speech in any player",action:"Fix the source/export",detail:"A recognizer cannot recover an audio track that was not included."},{label:"It plays elsewhere but import fails",action:"Check supported codecs and limits",detail:"Prepare one documented compatible copy, preserving the original."},{label:"Transcription runs but words are wrong",action:"Review language and intelligibility",detail:"The file may be readable while the speech remains difficult."}]},p("If several audio streams exist, check which one the tool selected or supports. A soundtrack, commentary track and dialogue mix are not equivalent inputs. Record what was selected so a later reviewer can reproduce the result.")]},
    {id:"prepare-one-copy",title:"Prepare a supported audio copy when necessary",blocks:[p("Use an editor that already opens the source reliably and export the intended audio mix in a format accepted by the transcription tool. Check the range and duration again. Adobe's [audio/video export guide](https://helpx.adobe.com/ca/premiere/desktop/render-and-export/export-files/export-video-and-audio-files.html) is one official reference for controlled sequence exports."),p("Do not repeatedly convert the same compressed copy through several formats. That makes it harder to identify the original failure and may damage audio. Keep one clear source-to-export path and write down the settings."),note("No universal codec fix","A compatible container/codec combination is specific to the receiving tool. An MP4 extension or a successful upload is not proof that decoding and recognition have both succeeded.")]},
    {id:"confirm-the-result",title:"Verify after the first successful run",blocks:[checklist("The full intended conversation is present.","The chosen language and audio track are correct.","The transcript ending matches the end of the speech.","Names and figures are checked against the source, not a re-encoded guess."),p("For a supported audio copy, the [audio-to-text converter](/tools/free-audio-to-text-converter-online) provides a relevant next step. If you need help creating that copy, use the [audio extraction guide](/blog/extract-audio-video-mp3-wav). Fix the input cause before spending time correcting a transcript of the wrong track.")]}
  ]
},
{
  slug:"transcript-vs-subtitles-timestamps",title:"Transcript vs Subtitles: Which Text Export Do You Need?",seoTitle:"Transcript vs Subtitles: TXT, SRT or VTT?",description:"Choose reading text or synchronized captions based on the reader's task. Understand timestamped transcripts, subtitle cues and descriptive context.",category:"Video to Text",keyword:"transcript vs subtitles",intent:"Choose text deliverables without confusing timing and reading requirements",kind:"comparison",
  introduction:"Choose a transcript when readers need the conversation as readable text. Choose subtitles or captions when text must appear alongside video at specific times. A timestamped transcript can help navigation, but it is not automatically a valid subtitle file. To transcribe video to text, recognize the spoken audio. To extract text from video images, you need a separate text-recognition workflow. Decide the reader's task before choosing TXT, SRT or VTT.",
  sections:[
{
  "id": "choose-aenural-output",
  "title": "Choose the matching AENural download",
  "blocks": [
    {
      "type": "p",
      "text": "The [audio-to-text converter](/tools/free-audio-to-text-converter-online) can produce a reviewed source for several deliverables. Select **Upload Audio**, set **Spoken Language**, leave **Text Language** at **Same as spoken language** for source transcription, and choose **Convert to Text**. Correct the words under **Review your transcript** before choosing an export."
    },
    {
      "type": "steps",
      "items": [
        "Choose **Download TXT** for a reading copy. Inspect paragraph breaks and speaker changes afterward; a useful transcript should read as a conversation rather than an arbitrary collection of screen-sized fragments.",
        "Choose **Download SRT** when an editor or upload form requests timed SubRip captions. Check both Start and End values, cue lengths and alignment with the exact final recording.",
        "Choose **Download VTT** for a compatible WebVTT destination, including a native HTML text track. Test the destination’s caption control and supported formatting rather than assuming all players display it identically."
      ]
    },
    {
      "type": "p",
      "text": "For example, a workshop handout might contain a paragraph labelled 05:12 so readers can locate the explanation. Its companion video needs shorter timed cues covering that explanation, including when each should disappear. Keep both outputs if readers need both experiences; neither file replaces the other."
    },
    {
      "type": "p",
      "text": "If you already have reviewed subtitles, use [SRT to TXT](/tools/srt-to-txt) to extract their words without running recognition again. The conversion saves retyping, while your editorial review supplies the readable structure."
    }
  ]
},
    {id:"choose-a-deliverable",title:"Match the export to the reader's task",blocks:[table("Three useful text outputs",["Output","Best suited to","Timing detail"],[["Reading transcript","Search, quotations, notes and paragraph-based review.","Optional navigation times may be enough."],["Timestamped transcript","Finding a passage in a long recording.","Usually references points rather than every display interval."],["Subtitle/caption file","Synchronized playback.","Cues need start and end times in the target format."]]),p("A transcript with headings and paragraph timestamps can be easier to read than hundreds of cue-sized fragments. Conversely, those paragraphs may be too long for video captions. Neither version should be called better without considering its intended use.")]},
    {id:"timing-example",title:"A time reference is not a display interval",blocks:[code("Illustrative distinction","Transcript navigation: [05:12] The guest explains the revised workflow.\nSubtitle cue: 00:05:12,000 --> 00:05:15,200\nThe revised workflow starts here."),p("The transcript label tells a reader where a section begins. The subtitle times tell a player when text enters and leaves the screen. Converting one into the other requires meaningful segmentation and timing, not simply changing the extension.")]},
    {id:"context-and-information",title:"Include the context needed by the text reader",blocks:[p("[W3C's transcript guidance](https://www.w3.org/WAI/media/av/transcripts/) distinguishes basic audio transcripts from descriptive transcripts that also convey needed visual information. A screen-recording transcript may need a clearly labeled description of an important diagram or action that nobody said aloud."),p("Keep descriptions separate from quotations. For example, an editorial note identifying a displayed chart should not be attributed as spoken words. Verify speaker names and any external references rather than guessing from the surrounding topic."),note("A summary is another deliverable","A shortened explanation of the main points is not a full transcript. Label summaries, edited reading copies and verbatim text accurately.")]},
    {id:"prepare-both",title:"Keep one reviewed source, then make appropriate exports",blocks:[steps("Review the conversation for names, figures, speaker changes and uncertain words.","Prepare a readable paragraph version if readers need a transcript.","Prepare timed cues separately when the task is playback, keeping them aligned to the final video.","Check each actual export in its intended reading or playback context."),p("If you already have captions, [SRT to TXT](/tools/srt-to-txt) or [VTT to TXT](/tools/vtt-to-txt) can extract their words. Review paragraph grouping afterward. If the job is caption delivery, keep the timed master and use the destination's required format rather than treating TXT as a subtitle file."),checklist("The file's label matches its purpose.","Quotations remain faithful to the recording.","Required visual or audio context is included appropriately.","Timed outputs were tested with the final media.")]}
  ]
}
];
