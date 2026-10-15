import Image from "next/image";

function OfficialLogo({ className = "", decorative = false }: { className?: string; decorative?: boolean }) {
  return <span className={`aen-official-logo ${className}`}><Image className="aen-logo-image" src="/branding/aenural-official-logo-transparent.png" width={1000} height={1000} alt={decorative ? "" : "AENural"} aria-hidden={decorative || undefined} unoptimized /></span>;
}
export function BrandMark({ className = "" }: { className?: string }) { return <OfficialLogo className={className} decorative />; }
export function Brand() { return <OfficialLogo />; }
