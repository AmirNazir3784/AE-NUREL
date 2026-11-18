import type { Tool } from "./tools";

export const mediaTools: readonly Tool[] = [
  { title: "AI Eye Contact", description: "Adjust a speaker’s gaze, compare the result and export a corrected video.", href: "/tools/ai-eye-contact", category: "Video Tools", categoryId: "video-tools", group: "Video Tools", icon: "video", processing: "local" },
  { title: "Lyrics to Captions", description: "Generate draft song captions, review their timing and download SRT or VTT.", href: "/tools/lyrics-to-captions", category: "Subtitle Tools", categoryId: "subtitle-tools", group: "Caption Generation", icon: "subtitle", processing: "local" },
];
