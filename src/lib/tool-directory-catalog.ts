import { tools, type Tool } from "./tools.ts";

// Unfinished caption workflows remain development-only. Released video tools
// are listed once in the public registry.
const previews: readonly Tool[] = [
  { title: "AI Eye Contact", description: "Experimental gaze correction for a single front-facing speaker. Still under evaluation.", href: "/tools/ai-eye-contact", category: "Video Tools", categoryId: "video-tools", group: "Video Tools", icon: "video", processing: "local" },
  { title: "Lyrics to Captions", description: "Match supplied English lyrics to recognized words and review their timing.", href: "/tools/lyrics-to-captions", category: "Caption Generation", categoryId: "caption-generation", group: "Caption Generation", icon: "subtitle", processing: "local" },
  { title: "Podcast to Captions", description: "Generate and edit timed captions from English MP3 or WAV recordings.", href: "/tools/podcast-to-captions", category: "Caption Generation", categoryId: "caption-generation", group: "Caption Generation", icon: "subtitle", processing: "local" },
];
export function directoryTools(environment: string | undefined): readonly Tool[] {
  return environment === "development" ? [...tools, ...previews] : tools;
}
