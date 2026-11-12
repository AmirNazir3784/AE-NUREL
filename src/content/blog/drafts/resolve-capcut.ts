import { type EditorialDraft, p, steps, checklist, table, code, note } from "../draft-model.ts";

export const resolveCapcutDrafts: EditorialDraft[] = [
{
  slug:"davinci-resolve-import-srt",title:"DaVinci Resolve SRT Import: Check the Timeline Before Styling",seoTitle:"DaVinci Resolve SRT Import and Timeline Checks",description:"Bring reviewed subtitles into Resolve, compare their time origin with the final timeline and keep caption creation separate from automatic transcription.",category:"Subtitle Tutorials",keyword:"DaVinci Resolve import SRT",intent:"Import existing captions without unnecessary speech recognition",kind:"tutorial",
  introduction:"To import an existing SRT file, use DaVinci Resolve's subtitle import workflow and inspect the subtitle track against the final timeline. You do not need a new transcription pass just to import reviewed timed text. Check the timeline origin, matching edit and language before adjusting its appearance.",
  sections:[
{
  "id": "check-import-source-aenural",
  "title": "Check the file before blaming the Resolve timeline",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Open [AENural’s Subtitle Editor](/tools/srt-editor), select **Upload subtitle file** and load the exact SRT you intend to import. Check its first line, **Start** and **End** against the source recording.",
        "Correct any verified text mistake in **Subtitle text**, then use **Download SRT** to create a reviewed working copy. Preserve the supplied file separately.",
        "Import that copy into the intended Resolve timeline through the subtitle workflow. Compare the first spoken line before applying track styling, then check middle and final passages."
      ]
    },
    {
      "type": "p",
      "text": "If you need to isolate a file problem, [download the two-cue SRT sample](/blog/srt-vs-vtt-subtitle-formats/sample.srt) and import it in a disposable timeline. Its first cue begins at 1.250 seconds; the last ends at 6.500. It contains invented text, so it is an import fixture rather than captions matching your video."
    },
    {
      "type": "p",
      "text": "If the sample loads but your file does not, inspect the file’s structure or supported encoding. If both load but your dialogue is offset, compare the timeline placement and source cut instead. Do not change the source timestamps and move the imported item by the same offset; that applies the correction twice. Record which adjustment you chose so later imports use the same origin."
    }
  ]
},
    {id:"existing-captions",title:"Start from the reviewed subtitle file",blocks:[p("Keep the original SRT and identify the video version it belongs to. A file timed against a separately exported clip can require a different placement from a file timed against the complete programme. Confirm that distinction before changing every cue."),p("Blackmagic's current [Edit-page overview](https://www.blackmagicdesign.com/products/davinciresolve/edit) documents subtitle import, timeline editing and track styles. Automatic speech recognition is a separate feature; do not confuse importing a file with generating its words from audio.")]},
    {id:"import-check",title:"Import, place and compare",blocks:[steps("Open the intended Resolve project and timeline, preserving a backup before broad changes.","Use the subtitle import command for the SRT and place the resulting subtitle media on the intended timeline.","Select the subtitle track and inspect the first identifiable line against speech.","Compare a middle and final line before deciding whether a placement shift or section-specific correction is needed."),code("Illustrative timeline-origin check","A clip-relative cue starts 3 seconds after the clip begins.\nThe clip is placed 90 seconds into the programme.\nExpected programme position for the cue: 93 seconds."),p("Do not apply an offset twice, once to the file and again when placing it. If the beginning matches but a later section does not, compare the edit rather than repeatedly dragging the whole track.")]},
    {id:"style-after-timing",title:"Review appearance after timing is stable",blocks:[p("Use the Inspector's subtitle/track controls for the selected subtitle content in your installed version. Check font availability, line wrapping and position on representative long cues. A plain SRT import should not be expected to reproduce another application's animation or full design."),table("Useful checks after import",["Check","Why it matters"],[["Text versus audio","The file may be valid but belong to another cut."],["Timeline origin","A clip-relative file and a full-programme file have different placement needs."],["Track/language","Multiple tracks can make the wrong captions look like an import failure."],["Long lines","A replacement font or aspect ratio can change wrapping."]])]},
    {id:"keep-delivery-separate",title:"Verify the eventual export separately",blocks:[p("Seeing captions in the timeline is not proof that the delivery preset will include them in the desired way. Decide whether the receiver needs a separate subtitle file or permanent text in the picture, then test an exported sample."),checklist("The imported language and revision are correct.","Speech checks align at the beginning, middle and end.","The intended track is selected.","The final video and/or sidecar are opened independently."),p("For file repairs before import, use the [Subtitle Editor](/tools/srt-editor). For broader timing patterns, use the existing [synchronization guide](/blog/fix-subtitles-out-of-sync). Native app menu details should be checked against the installed Resolve manual before a production handoff.")]}
  ]
},
{
  slug:"davinci-resolve-subtitle-export",title:"DaVinci Resolve Subtitle Export: Sidecar File or Burned-In Video?",seoTitle:"DaVinci Resolve Subtitle Export: Choose the Output",description:"Choose separate subtitles or permanent caption rendering, verify the selected track and test the actual file instead of relying on timeline visibility.",category:"Subtitle Tutorials",keyword:"DaVinci Resolve export subtitles",intent:"Select and verify subtitle delivery from a Resolve project",kind:"comparison",
  introduction:"Before exporting subtitles from DaVinci Resolve, choose whether you need a separate SRT file or text permanently rendered into the video. Confirm the selected track and export settings, then open the outputs independently. Caption visibility in the editing timeline is not enough to establish what the rendered file contains.",
  sections:[
{
  "id": "inspect-sidecar-aenural",
  "title": "Inspect the real sidecar with AENural",
  "blocks": [
    {
      "type": "p",
      "text": "Use a short delivery test to answer two separate questions: did Resolve export the intended subtitle file, and does that file still match the final video? A sidecar can be valid even while the picture remains correctly free of permanent captions."
    },
    {
      "type": "steps",
      "items": [
        "In Resolve, select the reviewed timeline and intended subtitle track. Choose the separate-file export supported by your installed release when the receiver requests an SRT. Keep a clean master before producing a burned-in version.",
        "Open [AENural’s Subtitle Editor](/tools/srt-editor), select **Upload subtitle file** and choose that newly exported SRT. Compare the opening and closing words with the intended track.",
        "Inspect **Start** and **End** at a known transition and a later line. Check those moments against the delivered video, including any in/out range that changed its time origin.",
        "For a WebVTT receiver, convert the reviewed SRT through [SRT to VTT](/tools/srt-to-vtt), choose **Download VTT**, then test the actual receiving player."
      ]
    },
    {
      "type": "p",
      "text": "For example, an exported section may begin halfway through the full programme. Establish whether its subtitle times refer to that standalone section or the complete timeline. The correct choice depends on the matching media, not which filename was easiest to produce."
    },
    {
      "type": "p",
      "text": "If an individual correction is made in AENural, select **Download SRT** and reconcile that change in the project before the next export. An edited sidecar does not automatically update Resolve’s subtitle track."
    }
  ]
},
    {id:"choose-output",title:"Choose the output for the receiver",blocks:[table("Three delivery intentions",["Intention","Verify"],[["Clean video with selectable captions","The platform/player accepts the sidecar and the language label is correct."],["Video with permanent caption appearance","The rendered picture contains the text at the correct size and position."],["Both deliverables","The clean and captioned versions are named clearly and tested separately."]]),p("Blackmagic's [Edit-page documentation](https://www.blackmagicdesign.com/products/davinciresolve/edit) confirms subtitle rendering and separate TTML, SRT or VTT export options. Supported delivery features and labels should be checked in the manual for your installed release. Do not infer embedded-track support for every container from the existence of a sidecar export.")]},
    {id:"render-checklist",title:"Check the delivery settings before queuing",blocks:[steps("Open the final timeline and inspect the intended subtitle track, language and last revision.","In the delivery workflow, review subtitle export settings explicitly rather than relying on a saved video preset.","Choose the supported separate-file or rendered-caption option required by the brief.","Export a short representative section and inspect it before rendering the full programme."),p("A representative section should contain a longer caption, a speaker transition and a shot where text could cover important information. Keep the clean video master so a later caption correction does not require reconstructing the picture edit.")]},
    {id:"missing-caption-diagnosis",title:"Diagnose missing captions by the expected output",blocks:[{type:"decisions",items:[{label:"A separate SRT was exported",action:"Load it with the matching video",detail:"The video image may correctly remain clean; inspect the player track selection."},{label:"Permanent captions were requested",action:"Inspect the render settings",detail:"Check whether caption rendering was actually enabled for the selected track."},{label:"The wrong language appears",action:"Check the source track",detail:"Inspect both the chosen track and the contents of the saved file."}]},p("Do not burn captions simply to make a sidecar appear inside a player that has not loaded it. First establish whether the expected deliverable is a selectable track or text in the pixels.")]},
    {id:"verify-output",title:"Verify text, timing and picture independently",blocks:[checklist("The sidecar has the intended language and complete cue range.","The clean output contains no unintended permanent captions.","The captioned output shows readable text without clipping.","Both outputs use the same approved video edit and timing origin."),p("Use [SRT to VTT](/tools/srt-to-vtt) or [VTT to SRT](/tools/vtt-to-srt) only when the receiver needs a different timed-text format. Conversion does not repair a render preset or recover styling already removed by a plain export.")]}
  ]
},
{
  slug:"davinci-resolve-subtitle-track-style",title:"DaVinci Resolve Subtitle Track Styles: Keep a Consistent Look Without Hiding Exceptions",seoTitle:"DaVinci Resolve Subtitle Track Style Review",description:"Plan a reusable subtitle look, distinguish track defaults from individual exceptions and check long lines, fonts and aspect-ratio changes.",category:"Auto Captions",keyword:"DaVinci Resolve subtitle style",intent:"Apply consistent subtitle styling while reviewing exceptions",kind:"workflow",
  introduction:"Use a consistent subtitle track style in DaVinci Resolve for the default appearance, then review cues that need exceptions. For readable video captions, start with clear text and a typical long line. Font changes, wrapping and aspect-ratio changes can affect placement even when the subtitle words and timings are unchanged.",
  sections:[
{
  "id": "style-test-worked-pass",
  "title": "Run a text-first style test before the global pass",
  "blocks": [
    {
      "type": "p",
      "text": "Create a small review set containing the real longest cue, a verified name with accents and a shot containing important lower-third graphics. Keep a plain timed-text master so appearance experiments do not become the only copy of the dialogue."
    },
    {
      "type": "steps",
      "items": [
        "Export the reviewed subtitle file and open it in [AENural’s Subtitle Editor](/tools/srt-editor) using **Upload subtitle file**. Check the long cue’s **Subtitle text**, line breaks and reading-speed indicator.",
        "If a line break needs adjustment, change it without changing the words. Use **Download SRT** to retain the corrected master and deliberately reconcile the change in Resolve.",
        "In Resolve, select the subtitle content and inspect the Inspector controls for the track style in your installed release. Apply the intended default, then replay the review set at the final aspect ratio.",
        "Inspect any cue whose appearance does not follow the new default. Establish whether it has a deliberate individual override before resetting it or applying another global change."
      ]
    },
    {
      "type": "p",
      "text": "Imagine a caption that wraps to three lines after a font substitution. A shorter name elsewhere may still look perfect. Fix the actual stress case rather than assuming the style failed everywhere. Check whether the required font is available and whether the caption box or frame dimensions changed."
    },
    {
      "type": "p",
      "text": "Finally, compare a short rendered test with the SRT deliverable. The picture can preserve the designed font and placement while plain SRT carries only the supported text and timing. Keep both assets when both roles are required."
    }
  ]
},
    {id:"define-style",title:"Define the default before correcting exceptions",blocks:[p("Choose the intended delivery size and viewing conditions. Establish font, size, foreground, backing/outline treatment and position on a copy of the project. Test against both bright and dark shots so the style is not tuned to only one background."),p("Blackmagic documents Inspector-based track styling in its [Edit-page overview](https://www.blackmagicdesign.com/products/davinciresolve/edit). Use the installed version's controls to identify track defaults versus individual cue overrides; a local exception can otherwise make a later track-wide change appear inconsistent.")]},
    {id:"representative-cues",title:"Build a small stress-test selection",blocks:[table("A useful style stress test",["Cue","What it reveals"],[["The longest reviewed sentence","Wrapping, width and reading load."],["A name or technical expression","Whether the font and line break preserve meaning."],["A shot with a lower-third title","Whether caption placement obscures useful information."],["A cue in the translated language","Different text length and character coverage."]]),p("Use actual text from the project. A generic three-word placeholder cannot establish whether the longest sentence or a non-Latin name will fit. Keep the test selection short enough to revisit after any style change.")]},
    {id:"style-pass",title:"Make one track pass, then an exception pass",blocks:[steps("Apply the intended default style to the subtitle track using the documented controls in your release.","Replay the stress-test selection at the actual export aspect ratio.","Review exceptions only where content or composition genuinely needs a different treatment.","Record intentional exceptions so they are not accidentally removed during a later global restyle."),p("For an illustrative interview, a bottom caption might work until a product demonstration introduces a lower-third name card. Review that shot deliberately instead of moving every caption upward and hiding the presenter's face elsewhere."),note("Subtitle style is not text animation","A consistent subtitle-track look and a Text+/motion-graphics treatment are different production choices. Keep an editable subtitle master when making a graphics version.")]},
    {id:"check-export",title:"Check the exported appearance",blocks:[checklist("Required fonts are available in the rendering environment.","Long lines and special characters remain intact.","Intentional cue-level differences survive as expected.","The delivery format actually carries the appearance you need."),p("A basic sidecar export can lose design details even when the picture preview looks correct. Use the [SRT/ASS conversion guide](/blog/srt-ass-conversion-styling-loss) to understand why timed text and rich styling are different handoff concerns.")]}
  ]
},
{
  slug:"import-srt-capcut-desktop-web",title:"How to Import SRT Into CapCut: Desktop, Web and Mobile Differences",seoTitle:"Import SRT Into CapCut: Desktop and Web Guide",description:"Follow CapCut's documented SRT import paths, understand mobile limitations and check imported timing before styling the captions.",category:"Subtitle Tutorials",keyword:"import SRT CapCut",intent:"Import existing subtitles using the appropriate CapCut platform",kind:"tutorial",
  introduction:"CapCut's current help documents SRT import on Desktop and Web, while direct subtitle-file import is not supported in its Mobile app. Choose the right import workflow for your SRT file, then check the captions against the matching video. Generating captions, importing SRT and exporting subtitles are separate capabilities.",
  sections:[
{
  "id": "aenural-capcut-handoff",
  "title": "Prepare the SRT in AENural, then use the correct import control",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "Open [AENural’s Subtitle Editor](/tools/srt-editor), select **Upload subtitle file** and choose the SRT source. Review **Subtitle text**, **Start** and **End**, then select **Download SRT** if you make corrections.",
        "On CapCut Desktop, open the matching project and use **Captions > Add Captions** to import your reviewed subtitle file, following the current Desktop help.",
        "On CapCut Web, open **Captions** on the left, choose **Upload caption file** and select the SRT. The official Web instructions do not support a TXT import here.",
        "After import, inspect the individual timed blocks against your video. Do this before applying a template across the whole track."
      ]
    },
    {
      "type": "p",
      "text": "A short compatibility fixture can narrow a rejection. Use [the original two-cue sample](/blog/srt-vs-vtt-subtitle-formats/sample.srt) in a disposable project: its first cue starts at 1.250 seconds and its last ends at 6.500. If it imports, return to the real file and inspect its syntax, encoding and time origin. The fixture is not meant to match your footage."
    },
    {
      "type": "p",
      "text": "CapCut’s Mobile app currently lacks direct SRT/TXT import according to its own help. That limitation is different from whether it can generate captions from speech. Use a supported Desktop/Web workflow rather than searching the mobile text panel for a feature the documentation does not offer. Keep account and version differences recorded during the real import test. Recheck after a template changes the caption’s line wrapping or size."
    }
  ]
},
    {id:"platform-choice",title:"Choose the supported import surface",blocks:[table("Official import guidance checked 4 November 2026",["Platform","Documented path"],[["Desktop","Captions > Add Captions, then import the file."],["Web","Captions, then the caption-file upload control for SRT."],["Mobile","No direct SRT/TXT import in the current help article; consider a supported Desktop/Web project workflow."]]),p("CapCut's [subtitle-import help](https://www.capcut.com/help/how-to-import-subtitles) distinguishes these platforms and notes that Web accepts SRT rather than TXT. Check your current account and release because product options can change; do not assume an old mobile screenshot proves a desktop feature is missing.")]},
    {id:"prepare-import",title:"Prepare the subtitle and video together",blocks:[steps("Keep the original SRT and use the exact video edit it was timed against.","Open the relevant CapCut project and use its documented caption-file import control.","Confirm text appears as timed caption content, then compare an opening, middle and final line with the audio.","Review text and timing before applying a visual template or track-wide style."),p("Check the actual file extension and plain-text syntax if import fails. A transcript saved with .srt at the end is not a timed subtitle file. Use the [Subtitle Editor](/tools/srt-editor) for cue-level corrections, or the [invalid-SRT checklist](/blog/fix-invalid-srt-file).")]},
    {id:"project-handoff",title:"Preserve editable project content",blocks:[p("If you move a project between supported CapCut surfaces, confirm the captions remain editable after the transfer. Exporting a finished video and reimporting that video is a different operation: text already rendered into the picture is not restored as independent caption blocks."),p("Keep the SRT source outside the project as well. That gives you a reviewed timed-text master if a template, sync operation or future application update changes how project captions are represented."),note("Import is not proof of re-export","An application can accept a subtitle file while applying different conditions to subtitle-file export. Test the final deliverable before committing to a long project.")]},
    {id:"final-check",title:"Review the actual destination",blocks:[checklist("The complete subtitle text imported in the correct language.","Caption timing matches the final video edit.","Long lines and special characters remain readable.","A separate export test confirms the file or video needed for delivery."),p("For generation from speech instead of an existing file, use the separate [CapCut auto-caption workflow](/blog/capcut-auto-captions-review). Keep these entry points distinct so you do not replace already reviewed captions with a new automatic transcript unnecessarily.")]}
  ]
},
{
  slug:"capcut-auto-captions-review",title:"CapCut Auto Captions: Generate a Draft, Then Review the Parts That Matter",seoTitle:"CapCut Auto Captions: Generation and Review",description:"Choose audio and language in CapCut, review generated words and timing, and test the export on your platform before styling a full project.",category:"Auto Captions",keyword:"CapCut auto captions",intent:"Generate and verify an automatic caption draft",kind:"tutorial",
  introduction:"Generate CapCut auto captions from the intended audio and language, then review the words and timed segments before styling. Check feature access and export conditions on your current platform/account first. A video caption generator produces a draft. Check AI captions for names, missed words and segmentation; successful generation does not establish that the final download meets your needs.",
  sections:[
{
  "id": "caption-sample-review",
  "title": "Use a short meaning-and-export test",
  "blocks": [
    {
      "type": "p",
      "text": "Before styling a full episode, choose a short section containing a speaker name, a number and one pause. These features expose useful review questions without turning a single clip into an accuracy benchmark. Save an editable project copy so a trial does not overwrite your only corrected track."
    },
    {
      "type": "steps",
      "items": [
        "Generate the sample through CapCut’s **Auto Captions** workflow for your platform. Select the actual spoken language and source audio where those controls are offered.",
        "Read the resulting blocks while listening to the same passage. Correct the name and number from the recording, not from a guess about the intended topic. Check that text does not continue over a cut into another speaker.",
        "Open the export controls and test the deliverable you actually need. For a subtitle file, inspect **Caption Export** and the SRT option where available; a video download is a separate test.",
        "If an SRT downloads, open it in [AENural’s Subtitle Editor](/tools/srt-editor) using **Upload subtitle file**. Compare a deliberately corrected line and its **Start**/**End** fields with the CapCut timeline."
      ]
    },
    {
      "type": "p",
      "text": "When AENural is used for a later correction, save **Download SRT** and reconcile the revised text in the project before the final render. The applications do not share an automatic edit link."
    },
    {
      "type": "p",
      "text": "If your account blocks the required export, record that restriction early. A free-looking template or a successful generation preview does not establish that the final file is included. Choose a supported workflow before spending time animating every line."
    }
  ]
},
    {id:"select-source",title:"Select the intended speech source",blocks:[p("Open the project containing the approved edit, then check which audio contains the conversation. Music, commentary and a muted microphone track can change what is available for recognition. Use a short representative section for the first test."),p("CapCut's [recognise-subtitles help](https://www.capcut.com/help/how-to-recognise-subtitles) documents the Auto Captions controls on Web, Desktop and Mobile. It describes selecting the audio source/language where offered and generating captions. The layout and available options vary by platform.")]},
    {id:"generate-caption-draft",title:"Generate before applying a full design",blocks:[steps("Open Auto Captions from the relevant Captions/Text area in your installed version.","Select the spoken language and intended audio source where available.","Generate the captions and inspect the resulting timed blocks.","Correct meaning-changing words and check segmentation before applying a template to everything."),p("Do not assume a vendor's general 'free' landing-page wording applies to every account, region and export. Check the actual access prompt and output conditions before spending time designing a full episode. Avoid bypasses or unofficial project extractors as a substitute for a supported workflow.")]},
    {id:"review-important-errors",title:"Review meaning before visual polish",blocks:[table("A practical review order",["Pass","Look for"],[["Meaning","Names, figures, dates, negations and technical vocabulary."],["Speakers","Incorrect attribution and overlapping speech."],["Timing","Words arriving too early, leaving too soon or crossing a cut."],["Layout","Awkward breaks, unreadable density and hidden picture information."]]),p("An attractive template can make a wrong transcript look finished. Keep an unstyled or simply styled version long enough to focus on the content. Replay uncertain phrases; do not correct them only by guessing what would make grammatical sense."),code("Illustrative correction note","Draft phrase: We do need approval.\nAudio check: verify whether the speaker said do or don't.\nDo not resolve this from context alone.")]},
    {id:"test-delivery",title:"Test the actual export early",blocks:[checklist("The required video or subtitle file can be downloaded under the displayed conditions.","Words and timing in the export match the reviewed timeline.","Long captions remain readable at the final aspect ratio.","The editable project and reviewed text source are retained."),p("CapCut's [export troubleshooting help](https://www.capcut.com/help/captions-fail-to-export) separates caption export from video export and identifies caption-source restrictions. For an existing SRT, use the [import workflow](/blog/import-srt-capcut-desktop-web) instead of generating another transcript of already reviewed content.")]}
  ]
},
{
  slug:"capcut-srt-export-missing",title:"CapCut SRT Export Missing? Check Caption Type, Platform and Export Mode",seoTitle:"CapCut SRT Export Missing: A Diagnostic Guide",description:"Distinguish automatic captions from ordinary text, check caption export settings and preserve a timed master when CapCut's export options differ.",category:"Subtitle Tutorials",keyword:"CapCut export SRT missing",intent:"Diagnose inability to export a timed caption file",kind:"troubleshooting",
  introduction:"If you cannot export an SRT file from CapCut, check whether the text was created as recognized captions, whether you selected caption export instead of only video export, and what your current platform/account supports. Do not rename a TXT file or assume ordinary text layers can be exported as a timed subtitle track.",
  sections:[
{
  "id": "validate-capcut-fallback",
  "title": "Inspect what you actually managed to export",
  "blocks": [
    {
      "type": "steps",
      "items": [
        "If CapCut offers an SRT, save it and open [AENural’s Subtitle Editor](/tools/srt-editor). Select **Upload subtitle file** and choose that exact export.",
        "Check that its numbered cues contain **Start**, **End** and **Subtitle text**, including a recently corrected line. Compare them with the intended video, then save **Download SRT** only if you make a further correction.",
        "If the only export is TXT, open it as plain text first. Determine whether it contains genuine per-cue timing or only a reading transcript before attempting a conversion."
      ]
    },
    {
      "type": "p",
      "text": "CapCut’s help suggests TXT as an alternative in some export failures, but a timing-free transcript cannot recreate measured cue boundaries by itself. AENural’s SRT-to-TXT converter works in the opposite direction and does not reconstruct lost CapCut timing. Keep the project and any earlier timed master until the required output is confirmed."
    },
    {
      "type": "p",
      "text": "For a reproducible support note, record platform, version, caption origin, visible export choices and the result of the short test. Leave credentials and private recordings out of public reports. A precise description is more useful than repeatedly renaming the same file or regenerating an already edited transcript."
    }
  ]
},
    {id:"identify-text-type",title:"Identify what kind of text you have",blocks:[p("Recognized captions, manually typed text, imported subtitles and decorative template text can look similar in a video preview. Their export behavior can differ. Inspect how the content was created before treating a missing SRT as a file-system problem."),p("CapCut's [caption-export troubleshooting page](https://www.capcut.com/help/captions-fail-to-export), checked on 4 November 2026, says export requires automatically recognized captions and documents SRT/TXT caption-export controls. Follow the help for the actual platform and verify the options displayed on your account.")]},
    {id:"export-mode",title:"Check the output mode",blocks:[steps("Duplicate or save the editable project before changing caption content.","Open export settings and look specifically for Caption Export, rather than assuming Video Export creates an SRT too.","Choose SRT when a timed caption file is required. Choose TXT only when a readable transcript is the intended output.","Export a short test and open the resulting file independently before repeating the workflow for a long project."),p("A video export can contain the words as pixels while leaving you without a separate subtitle file. A TXT export may contain only words and no timing. Neither can be made into a valid timed subtitle simply by changing the extension.")]},
    {id:"when-options-differ",title:"When your interface differs from a tutorial",blocks:[{type:"decisions",items:[{label:"The current app shows a plan/access restriction",action:"Record the actual restriction",detail:"Use a supported alternative or deliverable; do not assume every feature is free."},{label:"Your text is not recognized caption content",action:"Preserve its existing text and times",detail:"Do not overwrite the only edited copy by regenerating speech blindly."},{label:"The file exports but cannot be saved correctly",action:"Check the path and file contents",detail:"Use the official troubleshooting guidance and a short descriptive filename."}]},p("An old forum post can establish that somebody encountered a problem, not that the same behavior applies to your current version. Record platform, full version and caption source so a support request describes a reproducible case.")]},
    {id:"fallback-without-guessing",title:"Keep a useful fallback",blocks:[p("Keep a reviewed SRT outside the project when you have one. For newly generated captions, test export before detailed design work. If timing has been lost, plan a real timing pass rather than distributing a paragraph's words evenly and calling it synchronized."),checklist("The output actually contains start/end timestamps.","Its language and full cue range are correct.","Caption count and text match the intended revision.","The file plays with the final video in the receiving application."),p("Use [SRT to TXT](/tools/srt-to-txt) when your next task is reading text, or the [Subtitle Editor](/tools/srt-editor) for a valid timed file. Those tasks do not recover missing CapCut project data automatically.")]}
  ]
}
];
