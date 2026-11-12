import { p, steps, table, code, note, checklist, type EditorialDraft } from "../draft-model.ts";

export const mergerGuide: EditorialDraft = {
  slug:"merge-srt-files-correct-offsets", title:"How to Merge SRT Files With the Correct Video Offsets",
  seoTitle:"Merge SRT Files Without Subtitle Offset Errors",
  description:"Merge chapter subtitles in AENural, set the gap using actual video boundaries, inspect the joins and download one correctly numbered SRT file.",
  category:"Subtitle Tutorials", keyword:"merge SRT files", intent:"Append chapter subtitles in AENural while preserving the next chapter's lead-in", kind:"tutorial",
  introduction:"To merge SRT files in AENural, add the chapter files, arrange their order, set the gap and inspect each join before downloading. The crucial detail is the offset: AENural uses the preceding chapter's last subtitle end, plus your gap. It cannot infer the full video duration from an SRT file.",
  sections:[
    {id:"prepare-chapters",title:"Check the chapter boundaries first",blocks:[
      p("Use this workflow for consecutive video chapters with their own subtitle timelines. Keep the source files and the final assembled video. Write down when each chapter starts in that finished edit, including transitions, title cards and silence."),
      p("The [Library of Congress SRT reference](https://loc.gov/preservation/digital/formats/fdd/fdd000569.shtml) describes caption text and start/end timestamps. Those timestamps do not identify a video's full running time. A chapter's final spoken line can finish several seconds before its picture ends.")
    ]},
    {id:"add-and-order",title:"1. Add and arrange your SRT files",blocks:[
      steps("Open [AENural's SRT Merger](/tools/srt-merger) and select **Choose SRT files**. Add between two and ten files; each can be up to 10 MB, with a combined 50 MB limit.","Under **Merge order**, confirm the first file belongs to the opening chapter. Use **Move up** or **Move down** on a file row to correct its position.","Use **Add more SRT files** for another chapter. If you chose the wrong version, use that row's **Replace file** control rather than rebuilding the whole queue."),
      p("Arrange by the final video sequence, not by filename sorting. Two files called part-2 and part-10 can be confusing in an alphabetical list. Reordering also changes the calculated joins, so inspect them after any move.")
    ]},
    {id:"set-gap",title:"2. Set the gap using a worked example",blocks:[
      p("Under **Gap between files**, enter the extra seconds needed after the previous subtitle ends. The same gap applies at every join. The next file's original opening pause is retained; its first cue is not automatically pulled forward to the join."),
      table("Illustrative two-chapter example",["Measurement","Time"],[
        ["Chapter A video ends","120 seconds"],["Chapter A last subtitle ends","116 seconds"],["Chapter B first subtitle starts in its own file","2 seconds"],["Required gap in AENural","4 seconds"],["Chapter B first subtitle in the joined video","122 seconds"]
      ]),
      code("Offset calculation","116 + 4 + 2 = 122 seconds"),
      p("Enter **4**, rather than 6, in the gap field. The two-second pause is already present in Chapter B's timestamps. Adding it again would make the result late. If you leave the gap at zero, that caption starts at 118 seconds, four seconds early for this example.")
    ]},
    {id:"inspect-joins",title:"3. Inspect every join before downloading",blocks:[
      p("In **Check the file joins**, read **Ends at**, **Gap** and **Starts at** for each boundary. For the example, the previous caption ends at 00:01:56,000 and the next starts at 00:02:02,000. That six-second caption-to-caption interval includes both the four-second gap and Chapter B's two-second lead-in."),
      note("Different joins may need different gaps","If one chapter has a four-second silent tail and another has seven seconds, one shared gap cannot represent both. Merge in controlled stages with the appropriate gap for each new append, or prepare chapter offsets in an editor. Do not accept a wrong join just because the first one works."),
      p("A file already timed against the full assembled video needs a different operation. Appending it here adds another offset. Likewise, two language tracks for the same film should not be joined end-to-end. AENural's merger is a sequential chapter workflow, not bilingual interleaving.")
    ]},
    {id:"download-merged",title:"4. Download and test the joined captions",blocks:[
      p("Select **Download merged SRT**. The output has consecutive cue numbers. Open it in the [Subtitle Editor](/tools/srt-editor) if you need to inspect individual words or times, then load it with the final video."),
      checklist("Check the opening line and the first line after every chapter boundary.","Compare total caption count with the sum of your source files.","Verify the last line and any caption near a transition."),
      p("Keep the source chapters until delivery is approved. A valid merged subtitle file can still be mistimed against a different video cut.")
    ]}
  ]
};

export const transcriptGuide: EditorialDraft = {
  slug:"srt-to-text-readable-transcript", title:"Convert SRT to Text Without Turning Every Caption Into a Paragraph",
  seoTitle:"SRT to Text: Make a Readable Transcript",
  description:"Use AENural's SRT to TXT converter, compare line and paragraph output, copy or download the transcript, and preserve the original timed captions.",
  category:"Subtitle Tutorials", keyword:"SRT to text", intent:"Extract readable text from existing subtitles using AENural's two output modes", kind:"workflow",
  introduction:"To convert SRT to text in AENural, choose your SRT file, select One cue per line or Paragraph text, then copy or download the result. Paragraph text joins the extracted words into one continuous paragraph. You still need to review sentence boundaries and speaker changes before using it as a polished transcript.",
  sections:[
    {id:"open-srt-text",title:"1. Choose the subtitle file",blocks:[
      p("Open [SRT to TXT](/tools/srt-to-txt) and select **Choose SRT file**. Use the subtitle export that matches your final recording. The tool accepts SRT up to 10 MB and 10,000 cues. When conversion succeeds, **TXT ready** shows the cue count and output filename."),
      p("Already have a WebVTT file? Use [VTT to TXT](/tools/vtt-to-txt). Renaming its extension does not change its internal structure. If you only have an audio recording, start with the [audio-to-text converter](/tools/free-audio-to-text-converter-online); this subtitle converter extracts existing words and does not recognize speech.")
    ]},
    {id:"choose-reading-layout",title:"2. Compare the two output formats",blocks:[
      table("Choose under Output format",["Option","Result","Useful for"],[
        ["One cue per line","Each caption's text becomes one output line.","Checking wording against the subtitle sequence."],
        ["Paragraph text","All extracted lines are joined with spaces into one paragraph.","A starting point for reading notes or editorial cleanup."]
      ]),
      p("Numbers identifying caption blocks and their timestamps are removed in both modes. Subtitle formatting is stripped and whitespace is cleaned. A line break inside one caption becomes a space; it does not create a new paragraph. Neither mode invents speaker names or repairs recognition errors."),
      code("Illustrative input words across three captions","We tested the first version\non Tuesday, then changed\nthe export settings."),
      p("With **Paragraph text**, these become: “We tested the first version on Tuesday, then changed the export settings.” A caption boundary is often just where text fitted on screen. Treating every boundary as a new paragraph makes normal speech look fragmented.")
    ]},
    {id:"review-transcript",title:"3. Review the text before copying it",blocks:[
      p("Read the **Transcript text** field from the beginning. Check a name, a number and a sentence that crossed two captions. If your source repeats words across successive cues, inspect those passages carefully: joining cues is not the same as deciding which repetition was intentional."),
      p("Speaker changes need particular attention. If one guest says “I disagree” immediately after a host's question, a continuous paragraph can make both sound like the same speaker. Insert a paragraph break and an accurate speaker label in your working document. Verify the voice rather than guessing from the wording."),
      note("Keep accessibility information useful","Do not automatically delete a sound description or speaker label merely because it is not dialogue. W3C's transcript guidance explains why readers can need relevant non-speech information. Decide what belongs in your transcript based on its purpose and the recording."),
      p("See [W3C's transcript guidance](https://www.w3.org/WAI/media/av/transcripts/) for the distinction between a transcript and other media alternatives. For a quotation, replay the original audio and retain the wording; a converted file alone does not verify what was actually said.")
    ]},
    {id:"copy-download-transcript",title:"4. Copy or download your transcript",blocks:[
      steps("Choose your preferred output mode and select **Copy text** to paste the displayed result into a document.","Alternatively, select **Download TXT** and open the saved file in a text editor. Check that accents and non-Latin characters still display correctly.","If copying is unavailable, select the output text manually or use the download. Confirm the saved file, rather than assuming a clipboard action succeeded."),
      p("Keep the original SRT beside the TXT. Plain text no longer carries the caption timeline, so it cannot replace your subtitle master for playback or future timing corrections. Clear names such as interview-captions.srt and interview-reading-copy.txt make that distinction easier to preserve.")
    ]},
    {id:"finish-readable-copy",title:"Finish with a readable, traceable copy",blocks:[
      p("Break the draft into short paragraphs at changes of speaker or subject. Compare the opening and closing lines with the source to catch omissions. If you remove fillers or reorganize sentences, label that version as edited. Save a separate untouched extraction so later reviewers can see which wording came from the captions and which changes were editorial.")
    ]}
  ]
};

export const overlapGuide: EditorialDraft = {
  slug:"fix-overlapping-subtitles", title:"How to Fix Overlapping Subtitles Without Cutting Off Speech",
  seoTitle:"Fix Overlapping Subtitles Without Losing Dialogue",
  description:"Check SRT or VTT overlaps in AENural, choose shortening or moving, exclude intentional collisions and inspect before-and-after times before downloading.",
  category:"Subtitle Tutorials", keyword:"fix overlapping subtitles", intent:"Repair accidental cue collisions with AENural while preserving intentional simultaneous speech", kind:"troubleshooting",
  introduction:"To fix overlapping subtitles in AENural, load your SRT file or VTT file, review each conflict, then choose whether to shorten the earlier cue or move the later one. Exclude intentional overlaps before applying changes. A clean overlap count does not prove the captions follow speech, so check every changed transition against the recording.",
  sections:[
    {id:"identify-collision",title:"1. Find the actual collision",blocks:[
      p("Open the [Subtitle Overlap Fixer](/tools/subtitle-overlap-fixer) and select **Choose subtitle file**. The tool accepts SRT or VTT up to 10 MB and 10,000 subtitles. After loading, the analysis reports how many adjacent overlaps it found."),
      p("If the file is rejected for invalid or out-of-order times, correct those cues in the Subtitle Editor first. This repair workflow does not silently reorder a damaged track. Check that the selected subtitles match the video version before changing any timing."),
      p("An overlap means one caption remains visible after the next begins. In each issue card, compare **Before** times, then expand **Show subtitle text**. Listen to those lines in your video. A guest interrupting a host may justify simultaneous information; a lingering caption after its speaker stops is a different problem."),
      code("Illustrative collision","Subtitle 1: 10.000–12.400 seconds\nSubtitle 2: 12.100–14.000 seconds\nShared display time: 0.300 seconds")
    ]},
    {id:"select-repair",title:"2. Choose the repair that matches the speech",blocks:[
      table("Options under Choose a repair",["Control","Effect","Check before using"],[
        ["Shorten earlier subtitle","Moves the earlier caption's end before the next start.","Its words remain visible long enough to read."],
        ["Move later subtitle","Moves the following caption later while keeping its duration.","Its new start still follows its spoken words."],
        ["Minimum gap","Sets spacing between the repaired cues, in seconds.","Use your delivery requirement; larger is not automatically better."]
      ]),
      p("For the example, shortening with a **0.1** second gap ends Subtitle 1 at 12.000 seconds. Moving instead starts Subtitle 2 at 12.500 and ends it at 14.400. Both remove the collision, but only the recording tells you which timing makes sense."),
      p("Choose **Shorten earlier subtitle** if the first speaker has already finished and the line has enough reading time. Choose **Move later subtitle** if the second cue starts prematurely. If both speakers really overlap, neither blanket choice necessarily represents the conversation well.")
    ]},
    {id:"exclude-and-apply",title:"3. Exclude intentional cases and apply",blocks:[
      steps("Review each issue's text and times. Uncheck **Fix this overlap** on any case you want to retain for manual treatment.","Enter your chosen **Minimum gap**, or use a quick setting such as **0s** or **0.1s**. The field accepts up to ten seconds; that is a control limit, not a readability recommendation.","Select **Fix selected overlaps**, whose button count reflects your selection. Read the repaired and remaining totals, then compare **Before** with **After fix** on each changed card."),
      note("A move can create a neighboring conflict","Moving a later caption preserves its duration, so it may now reach the next cue. Read remaining issues and any New conflict card. Do not treat the first successful repair as proof that the rest of the sequence is clear."),
      p("Use **Undo fixes** to restore the original timing if a trial shortens an important line too much or moves speech out of sync. For an individual exception, use the [Subtitle Editor](/tools/srt-editor) to edit its Start and End fields deliberately.")
    ]},
    {id:"when-not-to-remove",title:"When an overlap is not a file error",blocks:[
      p("[WebVTT's cue-timing rules](https://www.w3.org/TR/webvtt1/#webvtt-cue-timings) allow overlapping cues. That does not guarantee your destination displays them clearly, but it means every overlap is not automatically invalid. Follow the destination's specification and preserve necessary dialogue or sound information."),
      p("Two cues meeting at exactly the same timestamp have no positive-duration overlap. A requested visible gap is a separate delivery decision. Likewise, shifting the entire track earlier or later does not change the relationship between neighboring cues.")
    ]},
    {id:"export-overlap-repair",title:"4. Download and replay the changes",blocks:[
      p("Select **Download fixed SRT** or **Download fixed VTT**, according to your input. Test the exported file with the correct final video, including every changed transition. Check that no caption flashes too briefly or appears after its speaker finishes. Keep your original subtitles and review intentional overlaps separately before sharing the repaired version.")
    ]}
  ]
};
