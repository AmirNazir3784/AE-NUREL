import { BrandMark } from "@/components/site/brand";
export function HeroVideoPlaceholder({ compact = false }: { compact?: boolean }) {
  return <figure className={compact ? "aen-feature-visual" : "aen-preview"} aria-label="Source Window product illustration"><div className="aen-window-bar" aria-hidden="true"><i /><i /><i /></div><div className="aen-screen"><span className="aen-screen-emblem" aria-hidden="true"><BrandMark /></span><span className="aen-screen-label">AENURAL · SOURCE WINDOW</span><span className="aen-screen-note">Product illustration</span></div></figure>;
}
