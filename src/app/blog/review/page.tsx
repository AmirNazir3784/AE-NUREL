import { notFound } from "next/navigation";
import Link from "next/link";
import { blogPosts } from "@/content/blog/registry";
import { batchDrafts } from "@/content/blog/batch-drafts";
import styles from "@/components/blog/blog.module.css";

export const metadata = { title: "Local article review", robots: { index: false, follow: false } };

export default function ReviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const drafts = blogPosts.filter(post => post.status === "draft");
  return <main id="main-content" className={styles.page}><div className={styles.wrap}>
    <header className={styles.directoryHero}><span className={styles.eyebrow}>Editorial review</span><h1>Local blog drafts</h1><p>{drafts.length} articles are prepared for review, with 650–750 main words and 10 additional FAQs each. Guides use practical instructions, original explanatory visuals and content-specific examples. This queue is unpublished; final page-interaction checks remain pending.</p><Link href="/blog">View article cards</Link></header>
    {[...new Set(drafts.map(post => post.category))].map(category => <section key={category} style={{marginBottom:48}}>
      <h2 style={{fontSize:24,marginBottom:20,fontWeight:650}}>{category}</h2>
      <ol style={{paddingLeft:24,lineHeight:1.7}}>{drafts.filter(post => post.category === category).map(post => {
        const detail = batchDrafts.find(article => article.slug === post.slug);
        return <li key={post.id} style={{padding:"14px 0",borderBottom:"1px solid var(--border)"}}><Link href={`/blog/${post.slug}`} style={{color:"var(--accent)",fontWeight:600}} prefetch={false}>{post.title}</Link>{detail && <p style={{margin:"6px 0 0",fontSize:13,color:"var(--muted)"}}>{detail.kind} · {detail.keyword}</p>}</li>;
      })}</ol>
    </section>)}
  </div></main>;
}
