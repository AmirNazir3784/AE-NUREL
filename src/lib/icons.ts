// Product identifiers are independent of categories, so each future tool can have its own symbol.
export const productIcons = {
  "vtt-to-srt": { tone: "deep" },
  "srt-to-txt": { tone: "medium" },
  "ass-to-srt": { tone: "deep" },
  "srt-to-ass": { tone: "medium" },
  "srt-to-json": { tone: "deep" },
  "srt-to-vtt": { tone: "deep" },
  "subtitle-overlap": { tone: "medium" },
  "subtitle-sync": { tone: "deep" },
  "srt-editor": { tone: "blue" },
  "srt-split": { tone: "medium" },
  "srt-timing": { tone: "blue" },
  "srt-merge": { tone: "deep" },
  subtitle: { tone: "blue" },
  video: { tone: "navy" },
  image: { tone: "medium" },
  audio: { tone: "deep" },
  spark: { tone: "navy" },
} as const;

export type ProductIconName = keyof typeof productIcons;
export type IconTone = (typeof productIcons)[ProductIconName]["tone"] | "soft";
