import type { CSSProperties, ReactNode } from "react";
import type { ProductIconName } from "@/lib/icons";

// All product symbols share a 24px grid, rounded frames, and one small accent.
// The accent inherits currentColor in ordinary UI; branded tiles supply orange.
const productPaths = {
  "vtt-to-srt": <><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4m6-18h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M6 8h3m6 8h3" /><path className="icon-accent" d="M7 12h10m-7-3-3 3 3 3" /></>,
  "srt-to-txt": <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M7 7h10M7 12h10M7 17h6" /><path className="icon-accent" d="M16 17h1" /></>,
  "ass-to-srt": <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m7 12 3-6 3 6M8 10h4M7 17h10" /><path className="icon-accent" d="m15 7 2 2-2 2" /></>,
  "srt-to-ass": <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m8 17 4-10 4 10M10 13h4" /><path className="icon-accent" d="M7 5h10" /></>,
  "srt-to-json": <><path d="M8 3H6v6l-3 3 3 3v6h2m8-18h2v6l3 3-3 3v6h-2" /><path className="icon-accent" d="M10 9h4m-4 6h4" /></>,
  "srt-to-vtt": <><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4m6-18h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M6 8h3m6 8h3" /><path className="icon-accent" d="M7 12h10m-3-3 3 3-3 3" /></>,
  "subtitle-overlap": <><rect x="2" y="4" width="14" height="10" rx="2" /><rect x="8" y="10" width="14" height="10" rx="2" /><path d="M5 8h6m1 8h6" /><path className="icon-accent" d="M10 10h5v4h-5z" /></>,
  "subtitle-sync": <><rect x="2" y="4" width="20" height="16" rx="3" /><path d="M6 9h8M6 13h3" /><path className="icon-accent" d="m13 13 2-2 2 2m-2-2v7m3-2 2 2 2-2m-2 2v-7" /></>,
  "srt-editor": <><path d="M10 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4M7 9h8M7 13h3" /><path className="icon-accent" d="m14 20-3 1 1-3 7-7 2 2-7 7Z" /></>,
  "srt-split": <><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M6 10h3m-3 4h3m6-4h3m-3 4h3" /><path className="icon-accent" d="M12 3v3m0 4v4m0 4v3" /></>,
  "srt-merge": <><path d="M5 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2" /><rect x="2" y="7" width="15" height="14" rx="2" /><path d="M6 12h7M6 16h3" /><path className="icon-accent" d="m13 16 2 2-2 2M11 18h4" /></>,
  "srt-timing": <><path d="M10 18H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v3" /><path d="M6 10h8M6 14h3" /><circle cx="17" cy="17" r="5" /><path className="icon-accent" d="M17 14v3l2 1" /></>,
  subtitle: <><rect x="2.5" y="4.5" width="19" height="15" rx="3" /><path d="M6.5 11h4m3 0h4M6.5 15h7" /><path className="icon-accent" d="M17 15h.5" /></>,
  video: <><rect x="2.5" y="4.5" width="19" height="15" rx="3" /><path className="icon-accent icon-solid" d="m10 9 5 3-5 3V9Z" /></>,
  image: <><rect x="2.5" y="3.5" width="19" height="17" rx="3" /><path d="m3 17 5-5 4 4 4-6 5 7" /><circle className="icon-accent icon-solid" cx="8" cy="8" r="1.2" /></>,
  audio: <><path d="M3 10v4m4-7v10m5-13v16m5-13v10m4-7v4" /><circle className="icon-accent icon-solid" cx="17" cy="5" r="1.2" /></>,
  spark: <><path d="m10 3 2.5 6.5L19 12l-6.5 2.5L10 21l-2.5-6.5L1 12l6.5-2.5L10 3Z" /><path className="icon-accent" d="M20 3v4m-2-2h4" /></>,
} satisfies Record<ProductIconName, ReactNode>;

const paths = {
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
  expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
  volume: <><path d="M11 4 6 8H3v8h3l5 4V4Z" /><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
  "volume-off": <><path d="M11 4 6 8H3v8h3l5 4V4Z" /><path d="m16 9 6 6m0-6-6 6" /></>,
  arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
  upload: <><path className="icon-wash" d="M4 16v4h16v-4Z" /><path d="M12 15V4m-4 4 4-4 4 4M4 16v4h16v-4" /></>,
  download: <><path className="icon-wash" d="M4 17v3h16v-3Z" /><path d="M12 4v11m-4-4 4 4 4-4M4 17v3h16v-3" /></>,
  shield: <><path className="icon-wash" d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  file: <><path className="icon-wash" d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 13h6M9 17h4" /></>,
  clock: <><circle className="icon-wash" cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  reset: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" /></>,
  warning: <><path className="icon-wash" d="m12 3 10 18H2Z" /><path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v.1" /></>,
  info: <><circle className="icon-wash" cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  moon: <><path className="icon-wash" d="M20.7 13.5A9 9 0 0 1 10.5 3.3 9 9 0 1 0 20.7 13.5Z" /><path d="M20.7 13.5A9 9 0 0 1 10.5 3.3 9 9 0 1 0 20.7 13.5Z" /></>,
  sun: <><circle className="icon-wash" cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  monitor: <><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
  wrench: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2-2.4 3.2" /><path d="M12 17h.01" /></>,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  ...productPaths,
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className} style={style}>{paths[name]}</svg>;
}
