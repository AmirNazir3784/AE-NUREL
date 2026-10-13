import type { ProductIconName } from "./icons";

export const categories = [
  { id: "subtitle-tools", title: "Subtitle Tools", icon: "subtitle", description: "Get your words in sync and ready to watch." },
] as const;

export type CategoryId = (typeof categories)[number]["id"] | "caption-generation";
export type Tool = {
  title: string;
  description: string;
  href: string;
  category: string;
  categoryId: CategoryId;
  icon: ProductIconName;
  group?: "Timing & Editing" | "Format Conversion" | "Caption Generation";
  processing: "local" | "cloud";
};

// Only released tools and categories belong in this public registry.
export const tools: readonly Tool[] = [
  {
    title: "SRT Timing Adjuster",
    description: "Move all SRT subtitle timestamps earlier or later.",
    href: "/tools/srt-timing-adjuster",
    category: "Subtitle Tools",
    categoryId: "subtitle-tools",
    icon: "srt-timing",
    group: "Timing & Editing",
    processing: "local",
  },
  {
    title: "SRT Merger",
    description: "Combine up to 10 SRT files in order and check the timing at each join.",
    href: "/tools/srt-merger",
    category: "Subtitle Tools",
    categoryId: "subtitle-tools",
    icon: "srt-merge",
    group: "Timing & Editing",
    processing: "local",
  },
  {
    title: "SRT Splitter",
    description: "Split an SRT by number of parts, subtitles per file, or time interval.",
    href: "/tools/srt-splitter",
    category: "Subtitle Tools",
    categoryId: "subtitle-tools",
    icon: "srt-split",
    group: "Timing & Editing",
    processing: "local",
  },
  {
    title: "Subtitle Editor",
    description: "Edit SRT or VTT subtitle text and timing, with undo and redo.",
    href: "/tools/srt-editor",
    category: "Subtitle Tools",
    categoryId: "subtitle-tools",
    group: "Timing & Editing",
    icon: "srt-editor",
    processing: "local",
  },
  {
    title: "Subtitle Sync Fixer",
    description: "Fix subtitles that gradually go out of sync using two reference times.",
    href: "/tools/subtitle-sync-fixer",
    category: "Subtitle Tools",
    categoryId: "subtitle-tools",
    group: "Timing & Editing",
    icon: "subtitle-sync",
    processing: "local",
  },
  {
    title: "Subtitle Overlap Fixer",
    description: "Find overlapping subtitles and review timing repairs in SRT or VTT files.",
    href: "/tools/subtitle-overlap-fixer",
    category: "Subtitle Tools",
    categoryId: "subtitle-tools",
    group: "Timing & Editing",
    icon: "subtitle-overlap",
    processing: "local",
  },
  {
    title: "SRT to VTT Converter",
    description: "Convert SRT subtitles to VTT, keeping their text and timing.",
    href: "/tools/srt-to-vtt",
    category: "Subtitle Tools",
    categoryId: "subtitle-tools",
    group: "Format Conversion",
    icon: "srt-to-vtt",
    processing: "local",
  },
  { title: "VTT to SRT Converter", description: "Convert VTT subtitles to SRT.", href: "/tools/vtt-to-srt", category: "Subtitle Tools", categoryId: "subtitle-tools", group: "Format Conversion", icon: "vtt-to-srt", processing: "local" },
  { title: "SRT to TXT Converter", description: "Extract a readable transcript from SRT subtitles.", href: "/tools/srt-to-txt", category: "Subtitle Tools", categoryId: "subtitle-tools", group: "Format Conversion", icon: "srt-to-txt", processing: "local" },
  { title: "ASS / SSA to SRT Converter", description: "Convert ASS or SSA dialogue into SRT subtitles.", href: "/tools/ass-to-srt", category: "Subtitle Tools", categoryId: "subtitle-tools", group: "Format Conversion", icon: "ass-to-srt", processing: "local" },
  { title: "SRT to ASS Converter", description: "Convert SRT subtitles to ASS with a default style.", href: "/tools/srt-to-ass", category: "Subtitle Tools", categoryId: "subtitle-tools", group: "Format Conversion", icon: "srt-to-ass", processing: "local" },
  { title: "SRT to JSON Converter", description: "Convert SRT cues into a structured JSON array.", href: "/tools/srt-to-json", category: "Subtitle Tools", categoryId: "subtitle-tools", group: "Format Conversion", icon: "srt-to-json", processing: "local" },
  { title: "VTT to TXT Converter", description: "Extract a readable transcript from VTT subtitles.", href: "/tools/vtt-to-txt", category: "Subtitle Tools", categoryId: "subtitle-tools", group: "Format Conversion", icon: "srt-to-txt", processing: "local" },
  { title: "SBV to SRT Converter", description: "Convert YouTube SBV captions to standard SRT subtitles.", href: "/tools/sbv-to-srt", category: "Subtitle Tools", categoryId: "subtitle-tools", group: "Format Conversion", icon: "vtt-to-srt", processing: "local" },
  { title: "SRT to SBV Converter", description: "Convert SRT subtitles to basic YouTube SBV captions.", href: "/tools/srt-to-sbv", category: "Subtitle Tools", categoryId: "subtitle-tools", group: "Format Conversion", icon: "srt-to-vtt", processing: "local" },
  { title: "SRT to MP4 Converter", description: "Render subtitle text as a silent MP4 video, in your browser.", href: "/tools/srt-to-mp4", category: "Subtitle Tools", categoryId: "subtitle-tools", group: "Format Conversion", icon: "video", processing: "local" },
];

export function relatedTools(href: string): readonly Tool[] {
  const current = tools.find((tool) => tool.href === href);
  return current ? tools.filter((tool) => tool.href !== href && tool.categoryId === current.categoryId) : [];
}

export function toolsInCategory(categoryId: CategoryId): readonly Tool[] {
  return tools.filter((tool) => tool.categoryId === categoryId);
}

export function searchTools(query: string, collection: readonly Tool[] = tools): readonly Tool[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return collection.filter((tool) => {
    const text = `${tool.title} ${tool.description} ${tool.category}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
