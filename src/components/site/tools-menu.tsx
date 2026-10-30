import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import { ToolIcon } from "@/components/ui/icon-tile";
import { audioToTextTool, autoCaptionTool } from "@/lib/ai-tools";
import { autoCaptionVisible } from "@/lib/caption-release";
import { products } from "@/lib/products";
import { NavigationMenu } from "./navigation-menu";
import styles from "./tools-menu.module.css";

export function ToolsMenu({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const aiTools = autoCaptionVisible() ? [audioToTextTool, autoCaptionTool] : [audioToTextTool];
  return <NavigationMenu label="Tools" className={`aen-product-menu ${styles.menu}`}>
    <div className={styles.intro}><strong>Made for your next edit.</strong><span>The AENural toolkit</span></div>
    <div className={styles.groups}>
      <section className={styles.products} aria-labelledby="tools-products-heading">
        <h2 id="tools-products-heading">AENural products</h2>
        {products.map(product => <Link key={product.href} href={product.href} className={`aen-mega-product ${styles.product}`} onClick={onNavigate} aria-current={pathname === product.href ? "page" : undefined}>
          <span className={styles.productArt} aria-hidden="true"><Icon name="monitor" size={35} /><span>After Effects</span><Icon name="arrow" size={18} /></span>
          <b>{product.title}</b><small>{product.description}</small>
        </Link>)}
      </section>
      <section className={styles.ai} aria-labelledby="tools-ai-heading">
        <h2 id="tools-ai-heading">AI tools</h2>
        {aiTools.map(tool => <Link key={tool.href} href={tool.href} className={styles.aiTool} onClick={onNavigate} aria-current={pathname === tool.href ? "page" : undefined}>
          <ToolIcon name={tool.icon} compact /><span><b>{tool.title}</b><small>{tool.href === audioToTextTool.href ? "Speech to text, ready to edit and export." : "Generate, edit and style video captions."}</small></span><Icon name="arrow" size={15} className={styles.arrow} />
        </Link>)}
        <Link href="/tools/ai-tools" className={styles.category} onClick={onNavigate}>Explore AI tools<Icon name="arrow" size={15} /></Link>
      </section>
    </div>
    <div className={`aen-mega-footer ${styles.footer}`}><span>Find your next creative shortcut.</span><Link href="/premium-tools" onClick={onNavigate}>See all tools<Icon name="arrow" size={16} /></Link></div>
  </NavigationMenu>;
}
