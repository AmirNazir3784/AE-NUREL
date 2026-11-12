import { p, steps, table, code, note, type EditorialDraft } from "../draft-model.ts";

export const srtSplitterGuide: EditorialDraft = {
  slug: "split-srt-files-keep-reset-timestamps",
  title: "How to Split an SRT File: Keep or Reset the Timestamps?",
  seoTitle: "Split SRT Files: Original vs Reset Timestamps",
  description: "Split SRT files with AENural's actual controls. Follow a five-caption example, compare timestamp modes, and download the right parts for your video.",
  category: "Subtitle Tutorials", keyword: "split SRT file",
  intent: "Split subtitles in AENural and choose the correct output time origin", kind: "tutorial",
  introduction: "To split an SRT file in AENural, choose your file, select a split method, then decide whether to keep or reset its timestamps. Keep original times for work against the complete video. For separate clips, reset only when the tool's reset boundary matches the start of the corresponding clip.",
  sections: [
    { id: "open-your-srt", title: "1. Open your subtitles in AENural", blocks: [
      p("Open the [SRT Splitter](/tools/srt-splitter) and select **Choose SRT file**. It accepts one SRT file up to 10 MB. Keep your original separately. For this walkthrough, [download the five-caption sample](/blog/srt-splitter/walkthrough.srt), which contains invented text and timestamps, then choose that file."),
      p("After loading, check the filename, subtitle count and **Subtitle timeline**. The sample contains five cues and ends at 00:01:28,000. That timeline describes the last caption end, not the video's duration. SRT stores text and timing rather than the media itself, as the [Library of Congress format reference](https://loc.gov/preservation/digital/formats/fdd/fdd000569.shtml) explains.")
    ] },
    { id: "choose-a-method", title: "2. Choose how to split", blocks: [
      table("Match the control to your task", ["Control", "What it does"], [
        ["Number of parts", "Distributes cues into balanced groups. Five cues into two parts becomes three plus two; video durations need not match."],
        ["Subtitles per file", "Limits each file to your chosen cue count. The final file can contain fewer."],
        ["Time interval", "Groups cues by their start times within repeating intervals. Enter minutes under Split every, such as 1 or 0.5."]
      ]),
      p("For the sample, select **Time interval** and enter **1** under **Split every**. Results update without a separate Split button. Two output files should appear. Empty intervals are skipped; they do not produce blank subtitle files. A run can create up to 100 non-empty parts.")
    ] },
    { id: "choose-timestamps", title: "3. Compare original and reset times", blocks: [
      steps("Under **Subtitle times**, select **Keep original times**. In **Your output files**, Part 02 starts at 00:01:05,000. This copy still refers to the full recording.", "Select **Reset times for each part**. With one-minute intervals, Part 02 now starts at 00:00:05,000. Its interval begins at 60 seconds, so the five-second lead-in remains.", "Switch to **Number of parts**, enter **2**, and keep reset selected. Part 02 now starts at 00:00:00,000 because count-based splitting subtracts that group's first cue start: 65 seconds."),
      code("Same source cue, different reset boundary", "Original:          00:01:05,000 --> 00:01:08,000\n1-minute interval: 00:00:05,000 --> 00:00:08,000\n2 balanced parts:  00:00:00,000 --> 00:00:03,000"),
      p("If your second video starts at original time 60 seconds, the interval result preserves its opening pause. The count-based result would display this line five seconds early. Choose using the actual video cut, not simply because both options say reset.")
    ] },
    { id: "crossing-a-boundary", title: "Watch captions that cross an interval", blocks: [
      note("AENural keeps each cue whole", "The sample's third caption runs from 59 to 62 seconds. With one-minute intervals, it stays entirely in Part 01 because it starts before 60 seconds. It is neither trimmed nor duplicated into Part 02."),
      p("If your video is cut exactly at 60 seconds, review that spoken sentence in both clips. Adjust the affected cue in the [Subtitle Editor](/tools/srt-editor) if necessary. The splitter divides subtitle files; it does not cut video or automatically rebuild dialogue across an edit.")
    ] },
    { id: "split-errors", title: "If the expected parts do not appear", blocks: [
      p("Read the message beside the value field before changing the file. If all cues fall within one interval, choose a shorter interval. For this sample, two minutes would produce only one group and is rejected. If you request more parts than there are cues, reduce the number; five captions cannot become six non-empty files."),
      p("Enter decimal minutes, rather than a clock timestamp, in **Split every**. For example, **0.5** means thirty seconds. A VTT file needs conversion through [VTT to SRT](/tools/vtt-to-srt) before this SRT-only workflow.")
    ] },
    { id: "download-and-check", title: "4. Download the parts and check playback", blocks: [
      p("Return to your intended settings. Select **Download all parts (ZIP)**, or use **Download part 01** and the other individual buttons. Each output restarts cue numbering at 1 and receives a numbered filename."),
      p("Open each downloaded SRT and compare its first and last lines with the results panel. Then load it beside its matching video. Check the opening pause, a middle line and the final caption. If timing is consistently wrong, correct that part with the [SRT Timing Adjuster](/tools/srt-timing-adjuster). Keep the original until every part matches its intended recording.")
    ] }
  ]
};
