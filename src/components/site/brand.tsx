export function BrandMark({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="M8 66 L30 24 L52 66 L44 66 L30 40 L16 66 Z" fill="#e07b1f" /><rect x="24" y="52" width="26" height="7" fill="#e07b1f" /><path d="M60 34 L84 34 L84 66 L60 66 Z" fill="#e07b1f" /><path d="M72 40 L88 50 L72 60 Z" fill="#1e8676" /></svg>;
}
export function Brand() { return <><BrandMark className="aen-mark" /><span>AE<span className="aen-brand-accent">Nural</span></span></>; }
