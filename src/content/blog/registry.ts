import { batchDrafts } from "./batch-drafts.ts";
import { questionsForSlug } from "./faqs/index.ts";
import { blogReleaseDateForSlug } from "./releases/2026-11-12.ts";

const fixedIds: Record<string, string> = {
  "convert-audio-to-text-online-free": "audio-to-text-guide",
  "fix-subtitles-out-of-sync": "subtitle-sync-guide",
  "srt-vs-vtt-subtitle-formats": "subtitle-formats-guide",
};

// Prefer next steps the writer already chose in the article. This does not
// manufacture links to satisfy a numeric quota or expose drafts in production.
function contextualRelatedIds(article: (typeof batchDrafts)[number]) {
  const matches = JSON.stringify(article.sections).matchAll(/\]\(\/blog\/([a-z0-9-]+)\)/g);
  return [...new Set([...matches].map(match => match[1]))]
    .filter(slug => slug !== article.slug)
    .map(slug => fixedIds[slug] ?? `draft-${slug}`);
}

export type BlogCategory = "Audio Transcription" | "Video to Text" | "Auto Captions" | "Subtitle Tutorials" | "Video & Audio Conversion";
export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  category: BlogCategory;
  status: "draft" | "published";
  publishedAt?: string;
  updatedAt?: string;
  author?: { name: string; url?: string; type: "Person" | "Organization" };
  sections: readonly { id: string; title: string }[];
  relatedIds: readonly string[];
};

export const blogPosts: readonly BlogPost[] = [{
  id: "audio-to-text-guide",
  slug: "convert-audio-to-text-online-free",
  title: "How to Convert Audio to Text Online for Free (MP3, WAV & Voice Recordings)",
  seoTitle: "How to Convert Audio to Text Online for Free",
  description: "A free audio to text converter online turns interviews, lectures, and voice notes into editable text.",
  category: "Audio Transcription",
  status: "published",
  publishedAt: "2026-10-29T14:18:15+05:00",
  author: { name: "AENural", type: "Organization", url: "https://aenural.com/about" },
  sections: [
    { id: "convert-audio-to-text", title: "Convert audio to text" },
    { id: "recording-formats", title: "MP3, WAV & voice recordings" },
    { id: "choose-a-free-converter", title: "Choose a free converter" },
    { id: "accuracy-and-problems", title: "Accuracy & common problems" },
    { id: "frequently-asked-questions", title: "Frequently asked questions" },
    { id: "start-transcribing", title: "Start transcribing" },
  ],
  relatedIds: [],
}, {
  id: "subtitle-sync-guide",
  slug: "fix-subtitles-out-of-sync",
  title: "How to Fix Subtitles Out of Sync: Delay, Drift and Cuts",
  seoTitle: "How to Fix Subtitles Out of Sync: SRT Delay and Drift",
  description: "Fix subtitles that appear early, late or drift over time. Diagnose the pattern, calculate a shift, use two reference points, and check your corrected SRT or VTT.",
  category: "Subtitle Tutorials",
  status: "published",
  publishedAt: "2026-11-03T05:16:48.613Z",
  author: { name: "AENural", type: "Organization", url: "https://aenural.com/about" },
  sections: [
    { id: "diagnose-the-pattern", title: "Identify the timing pattern" },
    { id: "fix-a-constant-delay", title: "Fix a constant delay" },
    { id: "fix-gradual-drift", title: "Fix gradual drift" },
    { id: "fix-a-sudden-jump", title: "Fix a sudden jump" },
    { id: "avoid-wrong-fixes", title: "Avoid the wrong fix" },
    { id: "check-the-result", title: "Check the result" },
    { id: "subtitle-sync-questions", title: "Subtitle sync questions" },
  ],
  relatedIds: [],
}, {
  id: "subtitle-formats-guide",
  slug: "srt-vs-vtt-subtitle-formats",
  title: "SRT vs VTT: Which Subtitle Format Should You Use?",
  seoTitle: "SRT vs VTT: Choose the Right Subtitle Format",
  description: "Compare SRT and VTT with matching sample downloads. Choose for YouTube, web video or an editor, understand conversion losses, and check your subtitle delivery.",
  category: "Subtitle Tutorials",
  status: "published",
  publishedAt: blogReleaseDateForSlug("srt-vs-vtt-subtitle-formats"),
  author: { name: "AENural", type: "Organization", url: "https://aenural.com/about" },
  sections: [
    { id: "choose-for-the-destination", title: "Choose for the destination" },
    { id: "compare-the-files", title: "Compare real sample files" },
    { id: "practical-differences", title: "Practical differences" },
    { id: "youtube-and-web-video", title: "YouTube & web video" },
    { id: "convert-without-surprises", title: "Conversion losses" },
    { id: "check-your-delivery", title: "Delivery checklist" },
    { id: "format-questions", title: "Format questions" },
  ],
  relatedIds: ["subtitle-sync-guide"],
}, ...batchDrafts.map(article => ({
  id: `draft-${article.slug}`,
  slug: article.slug,
  title: article.title,
  seoTitle: article.seoTitle,
  description: article.description,
  category: article.category,
  status: blogReleaseDateForSlug(article.slug) ? "published" as const : "draft" as const,
  publishedAt: blogReleaseDateForSlug(article.slug),
  author: { name: "AENural", type: "Organization" as const, url: "https://aenural.com/about" },
  sections: [
    ...article.sections.map(({ id, title }) => ({ id, title })),
    ...(questionsForSlug(article.slug) ? [{ id: "reader-questions", title: "Reader questions" }] : []),
  ],
  relatedIds: contextualRelatedIds(article),
}))];

export function publishedPosts(posts: readonly BlogPost[] = blogPosts): BlogPost[] {
  return posts.filter(post => post.status === "published" && post.publishedAt)
    .sort((a, b) => Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!) || a.slug.localeCompare(b.slug));
}

// Drafts are visible exclusively to the local development server. No flag can
// expose them in a production build, sitemap, or published related-post list.
export function readablePosts(posts: readonly BlogPost[] = blogPosts) {
  return process.env.NODE_ENV === "development" ? [...posts] : publishedPosts(posts);
}

export function postForSlug(slug: string, posts: readonly BlogPost[] = blogPosts) {
  return readablePosts(posts).find(post => post.slug === slug);
}

export function relatedPosts(post: BlogPost) {
  const candidates = publishedPosts().filter(candidate => candidate.id !== post.id && (post.relatedIds.includes(candidate.id) || candidate.category === post.category));
  return candidates.sort((a, b) => {
    const score = (candidate: BlogPost) => post.relatedIds.includes(candidate.id) ? 2 : candidate.category === post.category ? 1 : 0;
    return score(b) - score(a);
  }).slice(0, 3);
}
