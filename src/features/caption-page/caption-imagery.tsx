import { captionImages } from "./caption-images";

export function CaptionScene({ scene, eager = false, className = "" }: { scene: "creator" | "coast" | "reel" | "interview" | "forest"; eager?: boolean; className?: string }) {
  const files = captionImages[scene],desktopWidth=scene==='coast'||scene==='reel'?430:560;
  // Precompressed static variants avoid a runtime optimizer cold start on hosting.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={files[960]} srcSet={`${files[480]} 480w, ${files[960]} 960w`} sizes={`(max-width: 760px) calc(100vw - 36px), (max-width: 1200px) 42vw, ${desktopWidth}px`} alt="" width={960} height={1200} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} decoding="async" draggable={false} />;
}

export function CaptionHeroFilm() {
  return <figure className="cap-hero-film" aria-hidden="true"><CaptionScene scene="creator" eager /><div className="cap-film-words">Let every <em>word</em><br />be seen.</div><div className="cap-film-track"><span>Speech</span><div>{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ height: `${5 + i * 11 % 19}px` }} />)}<b /></div><span>Captions</span></div></figure>;
}
