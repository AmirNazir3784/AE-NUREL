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
}];

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
