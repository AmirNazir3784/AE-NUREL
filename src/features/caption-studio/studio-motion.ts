// Pure frame math for caption entrance animations. All effects settle to the
// same position/size at completion; no cue timing or source media is modified.
export const STUDIO_ANIMATIONS = [
  ["none", "None"], ["fade", "Fade"], ["pop", "Soft pop"], ["rise", "Rise"],
  ["slide-left", "Slide from left"], ["slide-right", "Slide from right"],
  ["drop", "Drop in"], ["zoom-in", "Zoom in"], ["zoom-out", "Zoom out"],
  ["bounce", "Bounce"], ["swing", "Swing"], ["blur", "Focus / blur"],
  ["glide", "Glide"], ["punch", "Punch"], ["settle", "Settle"], ["tilt", "Tilt in"],
  ["glitch", "Digital glitch"], ["rgb-split", "RGB split"], ["typewriter", "Typewriter reveal"],
  ["elastic", "Elastic pop"], ["whip-left", "Whip from left"], ["whip-right", "Whip from right"],
  ["snap", "Snap zoom"], ["jitter", "Micro jitter"],
] as const;
export type StudioAnimation = (typeof STUDIO_ANIMATIONS)[number][0];
export type StudioMotionFrame = {
  opacity: number; scale: number; x: number; y: number;
  rotation: number; blur: number;
};
const IDENTITY: StudioMotionFrame = { opacity: 1, scale: 1, x: 0, y: 0, rotation: 0, blur: 0 };
const clamp = (x: number) => Math.max(0, Math.min(1, x));
export function studioMotionFrame(animation: StudioAnimation, elapsedMs: number, durationMs: number, reducedMotion: boolean): StudioMotionFrame {
  if (reducedMotion || animation === "none" || !Number.isFinite(elapsedMs) || !Number.isFinite(durationMs) || durationMs <= 0) return { ...IDENTITY };
  const t = clamp(elapsedMs / durationMs);
  if (t >= 1) return { ...IDENTITY };
  const out = 1 - (1 - t) ** 3, remaining = 1 - out;
  const sin = Math.sin(Math.PI * t), degree = Math.PI / 180;
  switch (animation) {
    case "fade": return { ...IDENTITY, opacity: t };
    case "pop": return { ...IDENTITY, scale: .86 + .14 * out + .06 * sin * (1 - t) };
    case "rise": return { ...IDENTITY, y: .8 * remaining, opacity: .3 + .7 * t };
    case "slide-left": return { ...IDENTITY, x: -1.7 * remaining };
    case "slide-right": return { ...IDENTITY, x: 1.7 * remaining };
    case "drop": return { ...IDENTITY, y: -1.2 * remaining };
    case "zoom-in": return { ...IDENTITY, scale: .72 + .28 * out, opacity: .5 + .5 * t };
    case "zoom-out": return { ...IDENTITY, scale: 1.28 - .28 * out, opacity: .4 + .6 * t };
    case "bounce": return { ...IDENTITY, y: .7 * remaining - .25 * Math.abs(Math.sin(2.5 * Math.PI * t)) * (1 - t) };
    case "swing": return { ...IDENTITY, rotation: -9 * degree * Math.cos(3 * Math.PI * t) * (1 - t) };
    case "blur": return { ...IDENTITY, blur: 0.18 * remaining, opacity: .3 + .7 * t };
    case "glide": return { ...IDENTITY, x: -.65 * remaining, y: .4 * remaining, opacity: .35 + .65 * t };
    case "punch": return { ...IDENTITY, scale: .75 + .25 * out + .15 * sin * (1 - t) };
    case "settle": return { ...IDENTITY, y: -.7 * remaining, rotation: 5 * degree * remaining };
    case "tilt": return { ...IDENTITY, x: -.35 * remaining, rotation: -10 * degree * remaining, opacity: .6 + .4 * t };
    case "glitch": {
      // Three small spatial jumps, never full-frame flashing.
      const jump = t < .18 ? 1 : t < .36 ? -1 : t < .52 ? 1 : 0;
      return { ...IDENTITY, x: jump * .16 * (1 - t), opacity: .75 + .25 * t };
    }
    case "rgb-split": return { ...IDENTITY, scale: .96 + .04 * out, opacity: .8 + .2 * t };
    case "typewriter": return { ...IDENTITY };
    case "elastic": return { ...IDENTITY, scale: .64 + .36 * out + .16 * Math.sin(Math.PI * 3 * t) * (1-t) };
    case "whip-left": return { ...IDENTITY, x: -2.8 * remaining, opacity: .35 + .65 * t };
    case "whip-right": return { ...IDENTITY, x: 2.8 * remaining, opacity: .35 + .65 * t };
    case "snap": return { ...IDENTITY, scale: .5 + .5 * Math.min(1, t * 3), opacity: Math.min(1, .4 + t * 3) };
    case "jitter": return { ...IDENTITY, x: Math.sin(t * 19) * .11 * (1-t), rotation: Math.sin(t * 11) * degree * 1.7 * (1-t) };
    default: return { ...IDENTITY };
  }
}
