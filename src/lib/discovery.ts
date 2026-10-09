import { tools } from "./tools";
export const toolGroups = ["Timing & Editing", "Format Conversion"] as const;
export const curatedToolRoutes = ["/tools/srt-editor", "/tools/srt-timing-adjuster", "/tools/srt-to-vtt", "/tools/srt-merger"] as const;
export const curatedTools = curatedToolRoutes.map((href) => tools.find((tool) => tool.href === href)!);
export const menuNames: Record<string, string> = {
  "/tools/srt-to-mp4": "SRT to MP4",
  "/tools/srt-to-sbv": "SRT to SBV",
  "/tools/sbv-to-srt": "SBV to SRT",
  "/tools/vtt-to-txt": "VTT to TXT",
  "/tools/vtt-to-srt": "VTT to SRT", "/tools/srt-to-txt": "SRT to TXT",
  "/tools/ass-to-srt": "ASS / SSA to SRT", "/tools/srt-to-ass": "SRT to ASS", "/tools/srt-to-json": "SRT to JSON",
  "/tools/srt-editor": "Subtitle Editor", "/tools/srt-timing-adjuster": "Adjust SRT Timing",
  "/tools/subtitle-sync-fixer": "Fix Subtitle Drift", "/tools/subtitle-overlap-fixer": "Fix Overlaps",
  "/tools/srt-merger": "Merge SRT", "/tools/srt-splitter": "Split SRT", "/tools/srt-to-vtt": "SRT to VTT",
};
export const subtitleTasks = [
  { label: "Render SRT captions as an MP4 video", href: "/tools/srt-to-mp4" },
  { label: "Convert SRT subtitles to SBV", href: "/tools/srt-to-sbv" },
  { label: "Convert SBV captions to SRT", href: "/tools/sbv-to-srt" },
  { label: "Extract VTT transcript text", href: "/tools/vtt-to-txt" },
  { label: "Edit words or times", href: "/tools/srt-editor" },
  { label: "Same delay through the whole file", href: "/tools/srt-timing-adjuster" },
  { label: "Gradually goes out of sync", href: "/tools/subtitle-sync-fixer" },
  { label: "Overlapping subtitles", href: "/tools/subtitle-overlap-fixer" },
  { label: "Merge files", href: "/tools/srt-merger" },
  { label: "Split a file", href: "/tools/srt-splitter" },
  { label: "Convert SRT to VTT", href: "/tools/srt-to-vtt" },
  { label: "Convert VTT to SRT", href: "/tools/vtt-to-srt" },
  { label: "Extract transcript text", href: "/tools/srt-to-txt" },
  { label: "Convert ASS or SSA to SRT", href: "/tools/ass-to-srt" },
  { label: "Create an ASS file", href: "/tools/srt-to-ass" },
  { label: "Get structured JSON cues", href: "/tools/srt-to-json" },
] as const;
export const relevantRoutes: Record<string, readonly string[]> = {
  "/tools/srt-to-mp4": ["/tools/srt-to-txt", "/tools/srt-to-ass"],
  "/tools/srt-to-sbv": ["/tools/sbv-to-srt", "/tools/srt-to-txt"],
  "/tools/sbv-to-srt": ["/tools/vtt-to-srt", "/tools/srt-to-txt"],
  "/tools/vtt-to-txt": ["/tools/vtt-to-srt", "/tools/srt-to-txt"],
  "/tools/vtt-to-srt": ["/tools/srt-to-vtt", "/tools/srt-editor", "/tools/srt-to-txt"],
  "/tools/srt-to-txt": ["/tools/srt-to-json", "/tools/srt-editor"],
  "/tools/ass-to-srt": ["/tools/srt-to-ass", "/tools/srt-editor", "/tools/srt-to-vtt"],
  "/tools/srt-to-ass": ["/tools/ass-to-srt", "/tools/srt-editor"],
  "/tools/srt-to-json": ["/tools/srt-to-txt", "/tools/srt-to-vtt"],
  "/tools/srt-timing-adjuster": ["/tools/subtitle-sync-fixer", "/tools/srt-editor"],
  "/tools/srt-merger": ["/tools/srt-splitter", "/tools/srt-timing-adjuster"],
  "/tools/srt-splitter": ["/tools/srt-merger", "/tools/srt-editor"],
  "/tools/srt-editor": ["/tools/subtitle-overlap-fixer", "/tools/srt-to-vtt", "/tools/srt-timing-adjuster"],
  "/tools/subtitle-sync-fixer": ["/tools/srt-timing-adjuster", "/tools/srt-editor"],
  "/tools/subtitle-overlap-fixer": ["/tools/srt-editor", "/tools/subtitle-sync-fixer"],
  "/tools/srt-to-vtt": ["/tools/vtt-to-srt", "/tools/srt-editor", "/tools/srt-to-json"],
};
