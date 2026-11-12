import { pageMetadata } from "@/lib/site-metadata";
import { publishedPosts, readablePosts } from "@/content/blog/registry";
import { PostCard } from "@/components/blog/article-layout";
import styles from "@/components/blog/blog.module.css";

export const metadata = {
  ...pageMetadata("Blog", "Practical guides to audio transcription, captions, and subtitle workflows.", "/blog"),
  robots: { index: publishedPosts().length > 0 && process.env.NODE_ENV !== "development", follow: true },
};

export default function BlogPage() {
  const posts = readablePosts();
  const featured = posts.find(post => post.slug === "srt-vs-vtt-subtitle-formats") ?? posts[0];
  const remaining = posts.filter(post => post.id !== featured?.id);
  const groups = [...new Set(remaining.map(post => post.category))].map(category => ({
    category,
    id: `topic-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    posts: remaining.filter(post => post.category === category),
  }));
  return <main id="main-content" className={styles.page}><div className={styles.wrap}>
    <header className={styles.directoryHero}>
      <span className={styles.eyebrow}>The AENural journal</span>
      <h1>AENural Blog</h1>
      <p>Practical guides to audio transcription, captions, and subtitle workflows.</p>
    </header>
    {featured ? <>
      <PostCard post={featured} featured />
      {groups.length > 1 && <nav className={styles.directoryNav} aria-label="Browse articles by topic">
        {groups.map(group => <a key={group.id} href={`#${group.id}`}>{group.category} <span>({group.posts.length})</span></a>)}
      </nav>}
      {groups.map(group => <section key={group.id} aria-labelledby={group.id} className={styles.directorySection}>
        <h2 id={group.id}>{group.category}</h2>
        <div className={styles.cardGrid}>{group.posts.map(post => <PostCard key={post.id} post={post} headingLevel={3} />)}</div>
      </section>)}
    </> : <p className={styles.empty}>New guides will appear here when they are published.</p>}
  </div></main>;
}
