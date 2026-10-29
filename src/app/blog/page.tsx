import { pageMetadata } from "@/lib/site-metadata";
import { publishedPosts, readablePosts } from "@/content/blog/registry";
import { PostCard } from "@/components/blog/article-layout";
import styles from "@/components/blog/blog.module.css";

export const metadata = {
  ...pageMetadata("Blog", "Practical guides to audio transcription, captions, and subtitle workflows.", "/blog"),
  robots: { index: publishedPosts().length > 0 && process.env.NODE_ENV !== "development", follow: true },
};

export default function BlogPage() {
  const [featured, ...remaining] = readablePosts();
  return <main id="main-content" className={styles.page}><div className={styles.wrap}>
    <header className={styles.directoryHero}>
      <span className={styles.eyebrow}>The AENural journal</span>
      <h1>AENural Blog</h1>
      <p>Practical guides to audio transcription, captions, and subtitle workflows.</p>
    </header>
    {featured ? <><PostCard post={featured} featured />{remaining.length > 0 && <section aria-label="More articles" className={styles.cardGrid}>{remaining.map(post => <PostCard key={post.id} post={post} />)}</section>}</> : <p className={styles.empty}>New guides will appear here when they are published.</p>}
  </div></main>;
}
