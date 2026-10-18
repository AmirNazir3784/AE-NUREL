import { tools, type Tool } from "./tools.ts";

// Directory-only previews. The public registry, global search and sitemap still
// use released tools. Once accepted, move these entries into that registry.
const previews: readonly Tool[] = [
  { title: "Auto Caption Generator", description: "Style captions on your video and export video, SRT or VTT.", href: "/tools/auto-caption-generator", category: "Caption Generation", categoryId: "caption-generation", group: "Caption Generation", icon: "video", processing: "local" },
  { title: "Audio to SRT / VTT", description: "Generate subtitles from long or short audio, with optional translation in supported languages.", href: "/tools/free-subtitle-generator", category: "Caption Generation", categoryId: "caption-generation", group: "Caption Generation", icon: "subtitle", processing: "local" },
];
export function directoryTools(environment: string | undefined): readonly Tool[] {
  return environment === "development" ? [...tools, ...previews] : tools;
}
