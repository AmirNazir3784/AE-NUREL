import type { ReactNode } from "react";
import Link from "@/components/site/page-link";
import { relatedPosts, type BlogPost } from "@/content/blog/registry";
import styles from "./blog.module.css";

export function ArticleLayout({ post, introduction, visual, children }: { post: BlogPost; introduction: string; visual?: ReactNode; children: ReactNode }) {
  const related = relatedPosts(post);
  const contents = <ol>{post.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol>;
  return <main id="main-content" className={styles.page}>
    <div className={styles.wrap}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/blog">Blog</Link><span aria-hidden="true">/</span><span aria-current="page">{post.title}</span></nav>
      {post.status === "draft" && <p className={styles.draftNotice}>Local draft · Not published</p>}
      <article aria-labelledby="article-title">
        <header className={`${styles.hero} ${!visual ? styles.textHero : ""}`}>
          <div className={styles.heroText}>
            <span className={styles.eyebrow}>{post.category}</span>
            <h1 id="article-title">{post.title}</h1>
            <p className={styles.lede}>{introduction}</p>
            {(post.author || post.publishedAt) && <div className={styles.meta}>
              {post.author && <span>{post.author.url ? <a href={post.author.url}>{post.author.name}</a> : post.author.name}</span>}
              {post.publishedAt && <time dateTime={post.publishedAt}>{new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(post.publishedAt))}</time>}
              {post.updatedAt && <span>Updated <time dateTime={post.updatedAt}>{new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(post.updatedAt))}</time></span>}
            </div>}
          </div>
          {visual}
        </header>
        <div className={styles.articleGrid}>
          <aside className={styles.desktopToc}><nav aria-label="On this page"><span className={styles.eyebrow}>In this guide</span>{contents}<Link className={styles.backLink} href="/blog">← All articles</Link></nav></aside>
          <div className={styles.prose}>
            <details className={styles.mobileToc}><summary>In this guide</summary><nav aria-label="On this page">{contents}</nav></details>
            {children}
            <div className={styles.articleEnd}><Link href="/blog">← All articles</Link><a href="#article-title">Back to top ↑</a></div>
          </div>
        </div>
      </article>
      {related.length > 0 && <section className={styles.related}><h2>Related reading</h2><div className={styles.cardGrid}>{related.map(item => <PostCard key={item.id} post={item} />)}</div></section>}
    </div>
  </main>;
}

export function PostCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  return <article className={featured ? styles.featured : styles.card}>
    <span className={styles.eyebrow}>{post.category}{post.status === "draft" ? " · Local draft" : ""}</span>
    <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
    <p>{post.description}</p>
    {post.publishedAt && <time className={styles.meta} dateTime={post.publishedAt}>{new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(post.publishedAt))}</time>}
    <span className={styles.readLabel} aria-hidden="true">Read the guide <span>↗</span></span>
  </article>;
}
