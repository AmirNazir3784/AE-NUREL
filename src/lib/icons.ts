// Product identifiers are independent of categories, so each future tool can have its own symbol.
export const productIcons = {
  "vtt-to-srt": { tone: "conversion" },
  "srt-to-txt": { tone: "conversion" },
  "ass-to-srt": { tone: "conversion" },
  "srt-to-ass": { tone: "conversion" },
  "srt-to-json": { tone: "conversion" },
  "srt-to-vtt": { tone: "conversion" },
  "subtitle-overlap": { tone: "editing" },
  "subtitle-sync": { tone: "editing" },
  "srt-editor": { tone: "editing" },
  "srt-split": { tone: "editing" },
  "srt-timing": { tone: "editing" },
  "srt-merge": { tone: "editing" },
  subtitle: { tone: "caption" },
  video: { tone: "media" },
  image: { tone: "medium" },
  audio: { tone: "deep" },
  spark: { tone: "navy" },
} as const;

export type ProductIconName = keyof typeof productIcons;
export type IconTone = (typeof productIcons)[ProductIconName]["tone"] | "soft";
