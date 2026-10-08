import type { ProductIconName } from "./icons";

export const categories = [
  { id: "subtitle-tools", title: "Subtitle Tools", icon: "subtitle", description: "Get your words in sync and ready to watch." },
] as const;

export type CategoryId = (typeof categories)[number]["id"];
export type Tool = {
  title: string;
  description: string;
  href: string;
  category: string;
  categoryId: CategoryId;
  icon: ProductIconName;
  group?: "Timing & Editing" | "Format Conversion";
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
];

export function relatedTools(href: string): readonly Tool[] {
  const current = tools.find((tool) => tool.href === href);
  return current ? tools.filter((tool) => tool.href !== href && tool.categoryId === current.categoryId) : [];
}

export function toolsInCategory(categoryId: CategoryId): readonly Tool[] {
  return tools.filter((tool) => tool.categoryId === categoryId);
}

export function searchTools(query: string): readonly Tool[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return tools.filter((tool) => {
    const text = `${tool.title} ${tool.description} ${tool.category}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
