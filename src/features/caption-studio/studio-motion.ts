// Pure frame math for caption entrance animations. All effects settle to the
// same position/size at completion; no cue timing or source media is modified.
export const STUDIO_ANIMATIONS = [
  ["none", "None"], ["fade", "Fade"], ["pop", "Soft pop"], ["rise", "Rise"],
  ["slide-left", "Slide from left"], ["slide-right", "Slide from right"],
  ["drop", "Drop in"], ["zoom-in", "Zoom in"], ["zoom-out", "Zoom out"],
  ["bounce", "Bounce"], ["swing", "Swing"], ["blur", "Focus / blur"],
  ["glide", "Glide"], ["punch", "Punch"], ["settle", "Settle"], ["tilt", "Tilt in"],
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
    default: return { ...IDENTITY };
  }
}
