import { tools, type Tool } from "./tools.ts";

// Directory-only previews. The public registry, global search and sitemap still
// use released tools. Once accepted, move these entries into that registry.
const previews: readonly Tool[] = [
  { title: "Video Compressor", description: "Compress on your device, set a size target and preview your smaller video.", href: "/tools/video-compressor", category: "Video Tools", categoryId: "video-tools", group: "Video Tools", icon: "video", processing: "local" },
  { title: "Video Cropper", description: "Frame precisely with social presets, pixel controls and a live crop preview.", href: "/tools/video-cropper", category: "Video Tools", categoryId: "video-tools", group: "Video Tools", icon: "video", processing: "local" },
  { title: "Lyrics to Captions", description: "Match supplied English lyrics to recognized words and review their timing.", href: "/tools/lyrics-to-captions", category: "Caption Generation", categoryId: "caption-generation", group: "Caption Generation", icon: "subtitle", processing: "local" },
  { title: "Podcast to Captions", description: "Generate and edit timed captions from English MP3 or WAV recordings.", href: "/tools/podcast-to-captions", category: "Caption Generation", categoryId: "caption-generation", group: "Caption Generation", icon: "subtitle", processing: "local" },
];
export function directoryTools(environment: string | undefined): readonly Tool[] {
  return environment === "development" ? [...tools, ...previews] : tools;
}
