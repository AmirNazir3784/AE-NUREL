export const FREE_CAPTION_PRESETS = ["Clean", "Bold", "Outline", "Highlight", "Minimal"] as const;
export type CaptionAccess = {
  enabled: boolean; signedIn: boolean; premium: boolean; dailyLimit: number | null;
  used: number; remaining: number | null; resetsAt: string; maxSeconds: number;
  watermark: boolean; accurate: boolean; advanced: boolean; presets: readonly string[] | null;
};
export function captionAccess(premium: boolean, signedIn: boolean, used = 0, now = new Date()): CaptionAccess {
  const reset = new Date(now); reset.setUTCHours(24,0,0,0);
  return { enabled: true, signedIn, premium, dailyLimit: premium ? null : 3, used, remaining: premium ? null : Math.max(0,3-used), resetsAt: reset.toISOString(), maxSeconds: premium ? 120 : 60, watermark: !premium, accurate: premium, advanced: premium, presets: premium ? null : FREE_CAPTION_PRESETS };
}
