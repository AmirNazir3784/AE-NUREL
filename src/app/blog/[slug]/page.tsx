import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/site-metadata";
import { postForSlug, readablePosts } from "@/content/blog/registry";
import { articleContent } from "@/content/blog/content";
import { ArticleLayout } from "@/components/blog/article-layout";

export const dynamicParams = false;
export function generateStaticParams() {
  return readablePosts().map(post => ({ slug: post.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = postForSlug(slug);
  if (!post || !articleContent[post.id]) notFound();
  const base = pageMetadata(post.seoTitle, post.description, `/blog/${post.slug}`);
  return {
    ...base,
    robots: { index: post.status === "published", follow: post.status === "published" },
    openGraph: { ...base.openGraph, type: "article", publishedTime: post.publishedAt, modifiedTime: post.updatedAt, authors: post.author ? [post.author.name] : undefined },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = postForSlug(slug);
  if (!post) notFound();
  const content = articleContent[post.id];
  if (!content) notFound();
  const { Body, Visual } = content;
  const base = pageMetadata(post.seoTitle, post.description, `/blog/${post.slug}`);
  const url = String(base.alternates!.canonical);
  const origin = new URL(url).origin;
  const schema = post.status === "published" ? {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "BlogPosting", "@id": `${url}#article`, headline: post.title, description: post.description, url, mainEntityOfPage: url, datePublished: post.publishedAt, dateModified: post.updatedAt ?? post.publishedAt, ...(post.author ? { author: { "@type": post.author.type, name: post.author.name, url: post.author.url } } : {}), publisher: { "@type": "Organization", name: "AENural", url: origin }, image: `${origin}/social-card.png` },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: origin }, { "@type": "ListItem", position: 2, name: "Blog", item: `${origin}/blog` }, { "@type": "ListItem", position: 3, name: post.title, item: url }] },
    ],
  } : null;
  return <>
    {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />}
    <ArticleLayout post={post} introduction={content.introduction} visual={Visual ? <Visual /> : undefined}><Body /></ArticleLayout>
  </>;
}
