import { articleDiagrams, diagramCatalog } from "@/content/blog/diagram-catalog";
import styles from "./editorial-draft.module.css";

export function ArticleDiagram({ slug, section }: { slug: string; section: string }) {
  const placement = articleDiagrams[slug as keyof typeof articleDiagrams];
  if (!placement || placement[1] !== section) return null;
  const diagram = diagramCatalog[placement[0]];
  return <figure className={styles.diagram} data-blog-diagram-text={diagram.text}>
    <div className={styles.diagramViewport} tabIndex={0} role="region" aria-label={`${diagram.label}. Scroll horizontally on a narrow screen.`}>
      {/* Original SVG artwork is served directly; it is not a photographic asset. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={diagram.src} alt={diagram.alt} width={diagram.width} height={diagram.height} loading="lazy" decoding="async" />
    </div>
    <figcaption>{diagram.label} <span>— original explanatory diagram.</span></figcaption>
  </figure>;
}
