import { type EditorialDraft, p, steps, checklist, table, code, note, flow } from "../draft-model.ts";

export const adobeWorkflowDrafts: EditorialDraft[] = [
{
  slug:"premiere-pro-transcript-to-captions",title:"Premiere Pro Transcript to Captions: Review the Words Before Creating the Track",seoTitle:"Premiere Pro: Turn a Transcript Into Captions",description:"Follow the transcript-to-caption sequence in Premiere, choose language and audio deliberately, and review caption segmentation before export.",category:"Video to Text",keyword:"Premiere Pro transcript to captions",intent:"Generate and review captions from an existing sequence transcript",kind:"tutorial",
  introduction:"Premiere Pro auto captions start with a transcript. This video transcription stage recognizes speech; it does not finish the subtitle layout. Review its words, create the captions, then check the resulting track. These are separate editing stages: fixing a transcript does not replace checking caption breaks and timing. Work against the final sequence before choosing a subtitle file or video export.",
  sections:[
{
  "id": "caption-dialog-example",
  "title": "Use the caption dialog for one reviewed passage",
  "blocks": [
    {
      "type": "p",
      "text": "In Adobe’s current desktop instructions, choose **Window > Workspaces > Captions and Graphics**, then **Captions > Create captions from transcript**. The dialog includes caption preset, format, style, length, duration and gap choices. Use those controls to make a starting track, then review the actual sentences."
    },
    {
      "type": "p",
      "text": "For an illustrative interview, a recognized phrase might omit the word not. Correct that meaning-changing error before creating captions. After generation, inspect the matching caption block as well: the review target is now the timed track, not only the transcript panel."
    },
    {
      "type": "steps",
      "items": [
        "Choose a short sequence passage with a name, a pause and a longer sentence. Preserve the sequence before generating a replacement caption track.",
        "Create the captions using the required format and your delivery settings. Check whether the long sentence became sensible phrases rather than relying on the dialog’s numbers alone.",
        "Export a small SRT sidecar and open it in [AENural’s Subtitle Editor](/tools/srt-editor) using **Upload subtitle file**. Compare the words and **Start**/**End** fields against the same sequence passage."
      ]
    },
    {
      "type": "p",
      "text": "If you correct that exported SRT in AENural, save it with **Download SRT** and identify the revision clearly. The downloaded file does not automatically update your Premiere project. Reconcile any correction in the project master before producing the final picture and caption deliverables."
    }
  ]
},
    {id:"choose-the-source",title:"Choose the correct transcript source",blocks:[p("Confirm the active sequence, intended audio and spoken language. A transcript of source clips and a transcript representing the edited sequence are not interchangeable review targets. Keep a duplicate sequence before making structural changes."),p("Adobe's [Speech to Text guide](https://helpx.adobe.com/premiere/desktop/add-text-images/insert-captions/auto-transcribe-video-using-speech-to-text.html) documents Window > Text and the static-transcript workflow. These instructions follow current desktop help checked on 4 November 2026; use the help matching your installed version if panel labels differ."),flow("Two review stages","Choose final sequence audio","Correct transcript words","Create caption track","Review timed segments")]},
    {id:"create-caption-track",title:"Create captions from the reviewed transcript",blocks:[steps("Open the relevant sequence and Text panel. Confirm that the transcript represents the audio you intend to caption.","Correct names, figures and meaning-changing recognition errors before creating captions.","Use the caption creation command. Adobe's current guide describes Captions > Create captions from transcript.","Choose the required preset/format and line, length, duration and gap settings, then create the captions.","Inspect the resulting track in the timeline and replay transitions against the audio."),p("Adobe's [caption creation guide](https://helpx.adobe.com/ae_en/premiere/desktop/add-text-images/insert-captions/create-captions.html) documents these layout settings. They generate a starting segmentation; they do not guarantee ideal line breaks or enough reading time for every passage.")]},
    {id:"review-separately",title:"Review words and timing separately",blocks:[table("Two passes",["Pass","Look for"],[["Transcript review","Wrong names, numbers, missing negations and incorrect speaker attribution."],["Caption-track review","Awkward breaks, dense blocks, overlaps and text that enters or leaves at the wrong moment."]]),p("Do not assume a later transcript correction automatically updates every already-created caption in every workflow. Check the caption track itself after changes. If regenerating is necessary, preserve any intentional timing or styling work first so it is not silently overwritten.")]},
    {id:"choose-delivery",title:"Choose the delivery after review",blocks:[p("A reading transcript, sidecar SRT and video with permanent captions are different deliverables. Keep the sequence and editable caption track, then export the version the receiver requests. The [Premiere SRT export guide](/blog/export-srt-premiere-pro) covers the caption-file decision separately."),checklist("The correct sequence and language were used.","Caption words match the reviewed transcript and audio.","Several dense and fast passages remain readable.","The actual exported file is tested independently."),p("If a supplied SRT only needs text or timing repairs, the [Subtitle Editor](/tools/srt-editor) is a more relevant shortcut than retranscribing the entire video. Keep recognition, caption creation and delivery as explicit stages.")]}
  ]
},
{
  slug:"export-srt-premiere-pro",title:"How to Export SRT From Premiere Pro—and Find the Right Caption Track",seoTitle:"Export SRT From Premiere Pro: Track and File Checks",description:"Choose the caption track, distinguish transcript exports from SRT, and verify a sidecar subtitle file against the final Premiere sequence.",category:"Subtitle Tutorials",keyword:"export SRT Premiere Pro",intent:"Deliver a reviewed Premiere caption track as SRT",kind:"tutorial",
  introduction:"Export an SRT file from the caption workflow for the correct Premiere sequence, selecting the intended track and a sidecar subtitle output. A plain-text transcript export is a different file. If SRT is missing, confirm you have a caption track rather than only a transcript or graphics before troubleshooting the export menu.",
  sections:[
{
  "id": "inspect-export-aenural",
  "title": "Inspect the exported sidecar in AENural",
  "blocks": [
    {
      "type": "p",
      "text": "In current Adobe help, **Export** in the header opens the Export workspace. The caption export settings distinguish burn-in, embedded output and sidecar output. Choose the sidecar path and SRT when you need a separate file of timed words; burning text into a video is a different deliverable."
    },
    {
      "type": "steps",
      "items": [
        "Open [AENural’s Subtitle Editor](/tools/srt-editor), select **Upload subtitle file** and choose the SRT Premiere actually exported. Do not substitute an older file with a similar name.",
        "Inspect the first caption, one near the middle and the final cue. Compare **Start**, **End** and **Subtitle text** with the chosen Premiere caption track.",
        "If there are several languages in the sequence, repeat the export and inspection for each selected track. Confirm the words themselves, not just a filename ending in en or es.",
        "If you correct an individual field, use **Download SRT** and keep the revised file separate from the original export until the project has been reconciled."
      ]
    },
    {
      "type": "p",
      "text": "For example, a project can contain a reviewed English track and an older draft beneath it. A successful SRT download may still contain the wrong revision if track selection was left to a default. Finding the right language is only the first check; compare a line you deliberately corrected during review too."
    }
  ]
},
    {id:"confirm-the-track",title:"Confirm what exists on the timeline",blocks:[table("Confirm the content object",["What you have","What it means"],[["Transcript","Recognized words for review and text-based editing."],["Caption track","Timed caption segments available for the caption delivery workflow."],["Graphics","Visible designed text that does not by itself establish a caption stream."]]),p("A transcript contains recognized words for review and editing. A caption track contains timed caption segments. Graphics can show words in the image but are not automatically a subtitle track. Preserve an editable caption master before converting text into graphics for animation."),p("Adobe separately documents [transcript exports](https://helpx.adobe.com/premiere/desktop/render-and-export/export-files/export-transcripts.html), including native transcript, TXT and CSV. Seeing those options does not establish that you are exporting a caption track as SRT.")]},
    {id:"export-sidecar",title:"Choose sidecar output and the intended track",blocks:[steps("Open the final sequence and confirm the caption track's language and content.","Use the current caption-track export workflow and choose a sidecar file with the SRT format.","Explicitly select the intended caption track if more than one is present. Do not rely only on the default.","Save with a descriptive language/version filename, keeping the editable project.","Open the exported SRT independently and compare its first and last cues with the sequence."),p("Adobe's [caption-track export documentation](https://helpx.adobe.com/premiere/desktop/render-and-export/export-files/export-caption-tracks.html) states that SRT supports one stream per file and describes default track selection. Export and verify languages individually; an SRT filename does not carry several selectable language tracks automatically.")]},
    {id:"diagnose-missing-option",title:"When the SRT option is missing",blocks:[{type:"decisions",items:[{label:"Only transcript export formats appear",action:"Check the caption stage",detail:"Create or select the actual caption track rather than renaming a TXT export."},{label:"Words exist only as graphics",action:"Find the caption master",detail:"Visible text layers are not proof that a caption stream is available."},{label:"Several languages are present",action:"Select and export deliberately",detail:"Reopen every output and verify its language, not only its filename."}]},p("Record the full application version before following an old screenshot. Current and older menus can differ. Avoid repeatedly resetting workspaces or regenerating captions before establishing which content object the export command is acting on.")]},
    {id:"delivery-check",title:"Verify the sidecar in its destination",blocks:[checklist("The exported language is correct.","Caption count and opening/closing times match the reviewed track.","The receiver accepts the file and displays the expected words.","The file remains synchronized with the exact delivered video."),p("Use the [Subtitle Editor](/tools/srt-editor) to inspect the SRT if needed. Do not expect fonts, animation and every positioning detail to travel through basic SRT. Keep a separate reference video if the receiver needs to understand an approved visual design.")]}
  ]
},
{
  slug:"import-srt-premiere-pro",title:"How to Import SRT Into Premiere Pro Without Confusing It With a Transcript",seoTitle:"Import SRT Into Premiere Pro: Timeline Checks",description:"Import an existing subtitle file through the caption workflow, check its timeline origin and review text before applying a track style.",category:"Subtitle Tutorials",keyword:"import SRT Premiere Pro",intent:"Bring existing timed subtitles into a sequence",kind:"tutorial",
  introduction:"Import an existing SRT file as subtitle media through Premiere's caption workflow, place it in the intended sequence and check its timing origin. Do not use a transcript-import dialog as a substitute. Review the imported caption track before styling, especially if the SRT was timed against a different cut or a standalone clip.",
  sections:[
{
  "id": "prepare-aenural-import",
  "title": "Check the subtitle source before importing it",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Open [AENural’s Subtitle Editor](/tools/srt-editor), select **Upload subtitle file** and choose the supplied SRT. Inspect a known opening sentence and its **Start**/**End** times.",
        "If one word needs correction, edit **Subtitle text** and select **Download SRT**. Keep the original so the change remains traceable.",
        "Import that reviewed copy into Premiere using the caption/media workflow, then place it relative to the matching video clip. Check the actual caption track rather than a transcript-import picker."
      ]
    },
    {
      "type": "p",
      "text": "You can use [the two-caption SRT sample](/blog/srt-vs-vtt-subtitle-formats/sample.srt) to separate an import problem from damage in a client file. It starts at 1.250 seconds and ends at 6.500 seconds, with two plain caption blocks. Those are illustrative timings, not subtitles for your footage; use them only in a disposable test sequence."
    },
    {
      "type": "p",
      "text": "Check a corrected product name to confirm the imported revision. If the sample imports but the supplied SRT does not, inspect the supplied file’s syntax and encoding. If both import yet only the client file appears late, compare its time origin and the video cut. A successful small import does not prove that every longer file is valid, but it narrows the problem before you overwrite any reviewed text or generate another automatic transcript."
    }
  ]
},
    {id:"prepare-subtitles",title:"Prepare the file and matching video",blocks:[p("Keep the supplied SRT untouched and identify the exact recording or cut it belongs to. Ask whether timestamps begin at the start of the whole programme or at a separately exported clip. That distinction can create a consistent offset even when the subtitle syntax is correct."),p("Adobe's [caption overview](https://helpx.adobe.com/premiere/desktop/add-text-images/insert-captions/about-captions.html) explains the caption workspace. The sequence here follows the desktop caption workflow; use current help for your installed release rather than an old Essential Graphics screenshot.")]},
    {id:"import-and-place",title:"Import first, then inspect the timeline",blocks:[steps("Open the target project and sequence. Import the SRT through the supported media/caption import path; File > Import is the conventional media entry point.","Place the imported subtitle item into the sequence and confirm the resulting caption track.","Compare the first recognizable spoken line with its cue, then check another near the middle and end.","Correct only the measured timing problem. Preserve text and an untouched source copy before broad edits."),p("An SRT timed from zero for a clip will need a different placement when that clip appears later in a longer sequence. Do not add the sequence offset both during subtitle preparation and again when placing the imported captions."),code("Illustrative time-origin check","Clip subtitle begins at 00:00:02,000.\nClip begins 60 seconds into the programme.\nExpected programme position: 00:01:02,000.")]},
    {id:"style-after-content",title:"Style after content and placement are stable",blocks:[p("Select captions and use the current Properties/track-style workflow for appearance. Adobe's [caption-style guide](https://helpx.adobe.com/premiere/desktop/add-text-images/insert-captions/create-styles-for-captions.html) documents reusable caption styling. A raw SRT should not be expected to reproduce another application's font and animation settings."),table("Import symptom",["Symptom","Next check"],[["SRT unavailable in a transcript picker","Use the caption/media import workflow."],["Every cue is late by one amount","Check clip placement and subtitle time origin."],["Only later sections drift","Check the matching edit; do not assume one placement change solves everything."],["Text is present but styling differs","Review the track style and target format limitations."]])]},
    {id:"finish-import",title:"Keep the import reversible",blocks:[checklist("The correct SRT version and language were imported.","The first, middle and final speech checks align.","Individual text corrections are saved in a reviewed working version.","The exported sidecar or captioned video is tested after styling."),p("For measured source-file repairs, use the [Subtitle Editor](/tools/srt-editor) or the existing [subtitle sync guide](/blog/fix-subtitles-out-of-sync). Avoid retranscribing already reviewed dialogue when the actual problem is placement or a mismatched video edit.")]}
  ]
},
{
  slug:"premiere-caption-styles-vs-animation",title:"Premiere Caption Styles vs Animation: Preserve a Subtitle Master",seoTitle:"Premiere Caption Styles vs Animated Graphics",description:"Separate reusable caption appearance from motion graphics, keep an editable subtitle track and test animation on difficult caption lengths.",category:"Auto Captions",keyword:"animated captions Premiere Pro",intent:"Choose styling versus graphic animation without losing caption deliverables",kind:"comparison",
  introduction:"To add captions to video in Premiere, use a track style to keep font, color and placement consistent. Use an appropriate graphics workflow when you need motion beyond that caption presentation. Preserve a reviewed caption master before converting to graphics so a styled social export does not leave you without an editable subtitle deliverable.",
  sections:[
{
  "id": "separate-style-deliverables",
  "title": "Keep text correction separate from the graphics design",
  "blocks": [
    {
      "type": "p",
      "text": "Adobe’s current caption-style workflow selects caption text in the Timeline and adjusts its appearance through **Properties**. To save the look, use the plus control beside **Track style**, choose **Create style** and name it. These appearance settings should not be confused with a word-by-word motion treatment."
    },
    {
      "type": "steps",
      "items": [
        "Finish one short caption track and save an SRT master. Open that file in [AENural’s Subtitle Editor](/tools/srt-editor) with **Upload subtitle file** to inspect the words and exact timing separately from the design.",
        "Choose a short line, a long line and a cue over important graphics for the styled test. Apply the intended Premiere track style and inspect wrapping and placement.",
        "Preserve the caption sequence before making a graphics version. Test the supported upgrade workflow and motion on that separate version.",
        "When a spelling correction is needed, update the reviewed text and deliberately reconcile the graphics copy. Export and check both the sidecar and rendered video."
      ]
    },
    {
      "type": "p",
      "text": "Suppose a client changes a product name after the animation is built. Editing the SRT in AENural and selecting **Download SRT** gives you a corrected timed master, but it does not reach into Premiere and replace existing graphic-layer text. Track that handoff explicitly. A plain SRT cannot document the finished animation’s actual appearance. Keeping two truthful deliverables is more useful than claiming one animated export automatically preserves every caption workflow."
    }
  ]
},
    {id:"style-or-motion",title:"Separate appearance from movement",blocks:[table("Different design tasks",["Task","What to preserve"],[["Make all captions use one readable look","A track style and caption text/timing."],["Animate words, position or scale","A caption master plus a separate graphics treatment."],["Deliver SRT and an animated video","Both the subtitle export and finished video; one does not replace the other."]]),p("Adobe's [caption-style documentation](https://helpx.adobe.com/premiere/desktop/add-text-images/insert-captions/create-styles-for-captions.html) describes Properties-based appearance and reusable styles. It should not be read as a promise that every saved caption style contains word-level animation.")]},
    {id:"protect-the-master",title:"Keep the master before upgrading graphics",blocks:[steps("Finish a text and timing review on a caption track.","Duplicate the sequence or otherwise preserve the caption version.","For a graphics treatment, use the supported caption-to-graphic workflow in your installed release and test it on a short selection.","Apply motion to representative short and long blocks, then check the exported video."),p("Adobe's [community workflow discussion](https://community.adobe.com/questions-729/faq-workaround-nesting-to-apply-effect-controls-to-caption-track-1377120) describes upgrading captions to graphics for effect controls. Menu names can change; verify the command in your release. Graphics should not be assumed to retain the same caption-export behavior as the original track.")]},
    {id:"readable-motion",title:"Make motion support the words",blocks:[p("Use motion to establish emphasis or rhythm while leaving a stable reading interval. A word that spends most of its display time entering, bouncing or fading may be harder to read even if its nominal duration looks generous. Avoid making every cue a different effect demonstration."),code("Illustrative motion timing budget","Cue display: 2.5 seconds\nEntrance: 0.2 seconds\nStable reading: 2.1 seconds\nExit: 0.2 seconds\nTest the actual text; these values are an example, not a reading standard."),p("Do not derive exact word timings merely by distributing a phrase's duration evenly across its words. Phrase-level SRT timings do not establish where every spoken word begins.")]},
    {id:"two-output-review",title:"Review both deliverables",blocks:[checklist("The SRT master still exists and exports correctly.","Animation does not obscure or truncate a long caption.","Caption placement survives the final aspect ratio.","Rendered words and audio remain aligned in the exported video."),p("For text changes, edit the master and reconcile the graphics version deliberately. The [subtitle line-break guide](/blog/subtitle-line-breaks-readable-captions) for existing caption files can help with segmentation before animation. Keep the workflow understandable enough that one spelling correction does not require rebuilding the whole design.")]}
  ]
},
{
  slug:"after-effects-subtitles-srt-workflow",title:"Subtitles in After Effects: Plan the SRT-to-Text-Layer Handoff",seoTitle:"After Effects Subtitles: SRT and Text-Layer Workflow",description:"Choose a caption handoff for After Effects, preserve timed text and validate imported or manually created layers before styling long sequences.",category:"Subtitle Tutorials",keyword:"After Effects subtitles SRT",intent:"Plan reliable timed-text handoff into a motion composition",kind:"workflow",
  introduction:"For subtitles in After Effects, decide whether you need editable animated text layers or a conventional caption deliverable. Keep a reviewed SRT file outside the composition. If a script or extension turns SRT into layers, verify its timing and text on a small sample before using it across a long sequence.",
  sections:[
{
  "id": "manual-two-cue-handoff",
  "title": "Prepare and check a small handoff with AENural",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Open [AENural’s Subtitle Editor](/tools/srt-editor), select **Upload subtitle file** and load the SRT master. Correct **Subtitle text** and inspect **Start**/**End** before creating any composition layers.",
        "Select **Download SRT** to save the reviewed revision. For a test, [download the original two-cue sample](/blog/srt-vs-vtt-subtitle-formats/sample.srt) and inspect its exact times.",
        "For a short manual After Effects test, create one editable text layer for each sample sentence. At a matching zero origin, the first belongs from 1.250 to 3.750 seconds and the second from 4.000 to 6.500 seconds.",
        "Compare both layer intervals and words with the SRT. If your composition begins at a different source point, account for that origin once before extending the handoff to more cues."
      ]
    },
    {
      "type": "p",
      "text": "These sample intervals give you something concrete to check when evaluating an existing importer. A test should retain the silence between the two sentences and the gap before the first. An importer that puts every layer directly after the previous one would lose those pauses even if all words appeared."
    },
    {
      "type": "p",
      "text": "There is no AENural After Effects subtitle-import plugin promised here. Use your chosen documented handoff or a manageable manual method, retain the timed master and record which revision created the layers."
    }
  ]
},
    {id:"choose-the-handoff",title:"Choose the handoff for the job",blocks:[{type:"decisions",items:[{label:"A long video needs ordinary selectable captions",action:"Keep a caption-track workflow",detail:"Use an editor or player workflow designed for the required subtitle deliverable."},{label:"A short sequence needs custom animated text",action:"Build editable text layers",detail:"Preserve a separate timed-text master for correction and delivery."}]},p("Do not assume importing a file named .srt automatically creates a native caption track in every version of After Effects. Adobe's [supported-format reference](https://helpx.adobe.com/ca/after-effects/desktop/get-started/supported-file-formats/supported-file-formats.html) is the place to check current import support; a third-party panel can add behavior beyond the native application.")]},
    {id:"check-an-importer",title:"Validate an importer with a short fixture",blocks:[steps("Prepare a reviewed SRT containing a short cue, a multiline cue and a later cue separated by silence.","Import using the documented script/extension workflow you have chosen, or create the layers manually for a short sequence.","Compare each layer's text and in/out points with the subtitle source.","Check quotation marks, non-Latin text, line breaks and the composition's time origin before scaling up."),code("Illustrative timing handoff","Subtitle cue: 00:00:05,250 --> 00:00:07,000\nExpected composition interval at the same zero origin: 5.250 → 7.000 seconds\nA composition offset must be accounted for exactly once."),p("Review permissions and source trust before installing any importer. Do not run an unknown script merely because it promises free captions, and do not use a paid extension as an assumed requirement of this workflow.")]},
    {id:"style-the-layers",title:"Style a representative set of layers",blocks:[p("Adobe's [text animation guide](https://helpx.adobe.com/after-effects/desktop/animating-text/text-animation/animating-text.html) documents text-layer animators and selectors. These operate on composition text; they do not independently verify the transcript or restore missing subtitle timings."),p("Test the longest line before applying a style everywhere. Check paragraph-box dimensions, alignment and changes caused by replacement fonts. A style that fits three words may clip a long translated sentence, even when every layer imported successfully."),note("Keep content and composition in sync","Record which subtitle revision created the layers. If wording changes later, reconcile both the SRT master and text-layer copy rather than assuming they remain linked.")]},
    {id:"deliver-the-right-assets",title:"Deliver the right assets",blocks:[checklist("Layer timings match the final composition/audio origin.","The exported picture has no clipped or missing words.","Required fonts and project dependencies are accounted for.","A reviewed sidecar file is retained when the receiver needs selectable captions."),p("Use the [Subtitle Editor](/tools/srt-editor) to correct the source timed text before import. A video render of animated words is useful, but it is not automatically an SRT or a selectable caption track for the receiving platform.")]}
  ]
},
{
  slug:"after-effects-caption-text-animators",title:"After Effects Caption Animation: Use Text Animators Without Rushing the Words",seoTitle:"After Effects Caption Animation With Text Animators",description:"Plan word or line selection, readable holds and reusable text animation. Test short and long captions before copying a preset across a composition.",category:"Auto Captions",keyword:"After Effects caption animation",intent:"Create restrained motion for already timed caption text",kind:"tutorial",
  introduction:"Animate video captions in After Effects only after their wording and timing are stable. Text animators and selectors can target words or lines, but the animation still needs a readable hold within each cue. Test the shortest and longest captions before reusing the treatment across the composition.",
  sections:[
{
  "id": "test-word-selection",
  "title": "Test word selection against a real caption interval",
  "blocks": [
    {
      "type": "p",
      "text": "In Adobe’s text-animation model, the range selector’s **Start** and **End** control the selected range; **Based On** chooses how selection relates to the text. Inspect these properties before copying a preset. An effect aimed at characters does not necessarily become whole-word emphasis because the caption contains spaces."
    },
    {
      "type": "p",
      "text": "Use one reviewed sentence with a short display interval and duplicate its unanimated layer. Try your entrance on the working copy, then preview the entire cue at normal speed. Compare when the last word becomes readable with when its spoken phrase finishes. Adjust the entrance rather than extending the layer into the following speaker’s line."
    },
    {
      "type": "steps",
      "items": [
        "Open your source SRT in [AENural’s Subtitle Editor](/tools/srt-editor) using **Upload subtitle file**. Check the sentence and exact **Start**/**End** interval before timing the animation.",
        "Preserve those text and timing decisions in a **Download SRT** master. Match the composition layer to that interval, including any deliberate composition offset.",
        "Test the animator on another sentence with a different number of words. Check selector behavior, wrapping and the stable reading interval again before applying it widely."
      ]
    },
    {
      "type": "p",
      "text": "A phrase-level SRT gives the display boundary for a sentence, not exact starts for every word. If you need genuine spoken-word highlighting, measure those word positions separately; an evenly distributed reveal is a visual effect, not verified speech alignment."
    }
  ]
},
    {id:"start-with-timing",title:"Start with a timed text layer",blocks:[p("Use a text layer whose in/out points already match a reviewed caption interval. Keep a duplicate or an unanimated master before experimenting. A phrase-level caption does not provide word-level speech timing, so decide whether the motion is decorative or genuinely synchronized to individual words."),flow("A restrained motion sequence","Readable text and layout","Entrance","Stable hold","Exit before the next cue"),p("The goal is to help the reader follow the speech, not to demonstrate every animator property. For explanatory videos, preserving a stable text position can be more useful than continuous motion.")]},
    {id:"selector-workflow",title:"Choose the selection unit deliberately",blocks:[steps("Select a representative text layer and add an animator for the property you intend to change, such as opacity or position.","Inspect the range selector and choose the appropriate selection basis for characters, words or lines.","Animate the selector or property values within the layer's display interval.","Preview the complete passage at real playback speed, then test a longer and a shorter text layer."),p("Adobe's [text animation reference](https://helpx.adobe.com/after-effects/desktop/animating-text/text-animation/animating-text.html) documents range selectors, Units and Based On. Character and word selections behave differently when text length changes. A preset copied successfully is not necessarily timed appropriately for its new sentence.")]},
    {id:"timing-budget",title:"Give the words a stable interval",blocks:[code("Illustrative design budget","A caption remains on screen for 3.0 seconds.\nA 0.2-second entrance and 0.2-second exit leave 2.6 seconds of stable display.\nA 1.2-second entrance and 1.2-second exit leave only 0.6 seconds."),p("These figures illustrate the trade-off, not a universal standard. Preview real text and the intended audience's reading conditions. If the cue itself is too dense, fix its segmentation or timing rather than expecting an animation preset to solve the problem."),table("Motion problem",["Symptom","Review"],[["Only the first few words animate correctly","Selection basis and the new text length."],["The last words appear too late","Entrance duration and the actual speech timing."],["Text jumps after a font change","Text bounds, alignment and anchor behavior."],["Caption overlaps a following line","Layer out-points and copied keyframe timing."]])]},
    {id:"reuse-safely",title:"Reuse the design, then review every exception",blocks:[checklist("Short, long and multiline captions remain visible.","The stable hold is sufficient for the actual text.","Motion does not cover important picture details.","The exported render matches the preview and approved words."),p("Keep the subtitle master and layer revision together so later wording corrections do not break the timeline unnoticed. For source preparation, use the [Subtitle Editor](/tools/srt-editor). For the handoff itself, the separate [After Effects subtitle workflow](/blog/after-effects-subtitles-srt-workflow) explains the file-to-layer checks.")]}
  ]
}
];
