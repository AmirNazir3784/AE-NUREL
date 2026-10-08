import { tools } from "./tools";
export const toolGroups = ["Timing & Editing", "Format Conversion"] as const;
export const curatedToolRoutes = ["/tools/srt-editor", "/tools/srt-timing-adjuster", "/tools/srt-to-vtt", "/tools/srt-merger"] as const;
export const curatedTools = curatedToolRoutes.map((href) => tools.find((tool) => tool.href === href)!);
export const menuNames: Record<string, string> = {
  "/tools/srt-editor": "Subtitle Editor", "/tools/srt-timing-adjuster": "Adjust SRT Timing",
  "/tools/subtitle-sync-fixer": "Fix Subtitle Drift", "/tools/subtitle-overlap-fixer": "Fix Overlaps",
  "/tools/srt-merger": "Merge SRT", "/tools/srt-splitter": "Split SRT", "/tools/srt-to-vtt": "SRT to VTT",
};
export const subtitleTasks = [
  { label: "Edit words or times", href: "/tools/srt-editor" },
  { label: "Same delay through the whole file", href: "/tools/srt-timing-adjuster" },
  { label: "Gradually goes out of sync", href: "/tools/subtitle-sync-fixer" },
  { label: "Overlapping subtitles", href: "/tools/subtitle-overlap-fixer" },
  { label: "Merge files", href: "/tools/srt-merger" },
  { label: "Split a file", href: "/tools/srt-splitter" },
  { label: "Convert SRT to VTT", href: "/tools/srt-to-vtt" },
] as const;
export const relevantRoutes: Record<string, readonly string[]> = {
  "/tools/srt-timing-adjuster": ["/tools/subtitle-sync-fixer", "/tools/srt-editor"],
  "/tools/srt-merger": ["/tools/srt-splitter", "/tools/srt-timing-adjuster"],
  "/tools/srt-splitter": ["/tools/srt-merger", "/tools/srt-editor"],
  "/tools/srt-editor": ["/tools/subtitle-overlap-fixer", "/tools/srt-to-vtt", "/tools/srt-timing-adjuster"],
  "/tools/subtitle-sync-fixer": ["/tools/srt-timing-adjuster", "/tools/srt-editor"],
  "/tools/subtitle-overlap-fixer": ["/tools/srt-editor", "/tools/subtitle-sync-fixer"],
  "/tools/srt-to-vtt": ["/tools/srt-editor", "/tools/srt-timing-adjuster"],
};
