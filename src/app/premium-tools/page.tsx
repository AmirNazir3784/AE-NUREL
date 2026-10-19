import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import { products } from "@/lib/products";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata("AENural Tools", "Explore Source Window, AENural’s flagship product for After Effects.", "/premium-tools");
export default function ProductsPage() {
  return <main id="main-content" className="aen-directory-page"><header className="aen-page-hero aen-wrap"><span className="aen-eyebrow"><i />Built for editors</span><h1>AENural Tools</h1><p>Explore our flagship product for After Effects.</p></header><div className="aen-wrap aen-directory-section"><div className="aen-tools-grid">{products.map(product => <Link key={product.href} href={product.href} className="aen-tool-card aen-product-card"><span className="aen-product-icon"><Icon name="video" size={22} /></span><h2>{product.title}</h2><p>{product.description}</p><span className="aen-product-link">Meet Source Window →</span></Link>)}</div></div></main>;
}
