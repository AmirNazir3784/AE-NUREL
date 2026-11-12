import type { ReactNode } from "react";
import Link from "next/link";
import type { DraftBlock, EditorialDraft } from "@/content/blog/draft-model";
import shared from "./blog.module.css";
import styles from "./editorial-draft.module.css";
import { EditorialIllustration } from "./editorial-illustration";
import { questionsForSlug } from "@/content/blog/faqs";
import { ArticleDiagram } from "./article-diagram";

// A small trusted-content vocabulary, not HTML/MDX execution. Strings remain
// React text; links allow HTTPS or internal paths and never interpret raw HTML.
export function Inline({ text }: { text: string }) {
  const tokens = text.split(/(\[[^\]\n]+\]\((?:https:\/\/|\/)[^\s)]+\)|`[^`\n]+`|\*\*[^*\n]+\*\*)/g);
  return <>{tokens.map((token, index): ReactNode => {
    const link = /^\[([^\]]+)\]\((https:\/\/[^\s)]+|\/[^\s)]+)\)$/.exec(token);
    if (link) return <Link key={index} href={link[2]} prefetch={false}>{link[1]}</Link>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index}>{token.slice(1, -1)}</code>;
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>;
    return token;
  })}</>;
}

function Block({ block }: { block: DraftBlock }) {
  switch (block.type) {
    case "illustration": return <EditorialIllustration name={block.name} />;
    case "p": return <p><Inline text={block.text} /></p>;
    case "steps": return <ol className={styles.steps}>{block.items.map((item, i) => <li key={i}><Inline text={item} /></li>)}</ol>;
    case "checklist": return <ul className={styles.checklist}>{block.items.map((item, i) => <li key={i}><Inline text={item} /></li>)}</ul>;
    case "code": return <figure className={styles.code}><figcaption>{block.label}</figcaption><pre tabIndex={0} aria-label={block.label}><code>{block.text}</code></pre></figure>;
    case "caption-example": return <figure className={styles.captionExample}><figcaption>{block.label}</figcaption><div className={styles.captionVariants}>{block.variants.map(variant => <div key={variant.label}><strong>{variant.label}</strong><p>{variant.text}</p></div>)}</div></figure>;
    case "note": return <aside className={styles.note}><h3>{block.title}</h3><p><Inline text={block.text} /></p></aside>;
    case "table": return <div className={styles.table} role="region" aria-label={`${block.caption} — scroll horizontally if needed`} tabIndex={0}><table><caption>{block.caption}</caption><thead><tr>{block.headers.map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => j === 0 ? <th scope="row" key={j}><Inline text={cell} /></th> : <td key={j}><Inline text={cell} /></td>)}</tr>)}</tbody></table></div>;
    case "decisions": return <dl className={styles.decisions}>{block.items.map(item => <div key={item.label}><dt>{item.label}</dt><dd><strong>{item.action}</strong><span><Inline text={item.detail} /></span></dd></div>)}</dl>;
    case "flow": return <figure className={styles.flow}><figcaption>{block.label}</figcaption><ol>{block.items.map((item, i) => <li key={i}><span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><Inline text={item} /></li>)}</ol></figure>;
    case "faq": return <div className={shared.faq}>{block.items.map(item => <details key={item.question}><summary><h3>{item.question}</h3></summary><p><Inline text={item.answer} /></p></details>)}</div>;
  }
}

export function ArticleFaqs({ slug, id = "reader-questions" }: { slug: string; id?: string }) {
  const questions = questionsForSlug(slug);
  if (!questions) return null;
  return <section id={id} data-blog-faq={slug} className={shared.section}>
    <h2>{questions.title}</h2>
    <div className={shared.faq}>{questions.items.map(item => <details key={item.question}>
      <summary><h3>{item.question}</h3></summary>
      <p><Inline text={item.answer} /></p>
    </details>)}</div>
  </section>;
}

export function EditorialDraftBody({ article }: { article: EditorialDraft }) {
  return <div data-blog-content={article.slug} className={`${styles.article} ${styles[article.kind]}`}>
    {article.sections.map(section => <section key={section.id} id={section.id} className={shared.section}>
      <h2>{section.title}</h2>
      <ArticleDiagram slug={article.slug} section={section.id} />
      {section.blocks.map((block, i) => <Block key={i} block={block} />)}
    </section>)}
    <ArticleFaqs slug={article.slug} />
  </div>;
}
