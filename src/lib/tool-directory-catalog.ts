import { tools, type Tool } from "./tools.ts";

// Directory-only previews. The public registry, global search and sitemap still
// use released tools. Once accepted, move these entries into that registry.
const previews: readonly Tool[] = [
  { title: "Audio to SRT / VTT", description: "Generate subtitles from long or short audio, with optional translation in supported languages.", href: "/tools/free-subtitle-generator", category: "Caption Generation", categoryId: "caption-generation", group: "Caption Generation", icon: "subtitle", processing: "local" },
  { title: "Speech to Captions", description: "Turn short English recordings into editable SRT or VTT captions.", href: "/tools/podcast-to-captions", category: "Caption Generation", categoryId: "caption-generation", group: "Caption Generation", icon: "subtitle", processing: "local" },
];
export function directoryTools(environment: string | undefined): readonly Tool[] {
  return environment === "development" ? [...tools, ...previews] : tools;
}
