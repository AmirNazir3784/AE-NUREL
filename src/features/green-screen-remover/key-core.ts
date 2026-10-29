export type RGB = readonly [number, number, number];
export type KeySettings = { color: string; strength: number; softness: number; spill: number };
export type Background = { type: "solid" | "gradient" | "image"; color: string; second: string; fit: "cover" | "contain"; animated: boolean };
export type KeyExport = { format: "mp4" | "webm"; resolution: "original" | "2160" | "1080" | "720" | "480"; keepAudio: boolean };
export const DEFAULT_KEY: KeySettings = { color: "#00c853", strength: 35, softness: 30, spill: 60 };
export const DEFAULT_BACKGROUND: Background = { type: "gradient", color: "#182b4d", second: "#8b5cf6", fit: "cover", animated: false };
export const DEFAULT_EXPORT: KeyExport = { format: "mp4", resolution: "original", keepAudio: true };
export const validHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);
export function rgb(hex: string): RGB {
  if (!validHex(hex)) throw new Error("Enter a six-digit hex color, such as #00c853.");
  return [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16)) as unknown as RGB;
}
export function hex(color: RGB) { return "#" + color.map(channel => Math.min(255, Math.max(0, Math.round(channel))).toString(16).padStart(2, "0")).join(""); }
export function validateKey(settings: KeySettings) {
  rgb(settings.color);
  if ([settings.strength, settings.softness, settings.spill].some(value => !Number.isFinite(value) || value < 0 || value > 100)) throw new Error("Key controls must be between 0 and 100.");
}
export function outputSize(frame: { width: number; height: number }, resolution: KeyExport["resolution"]) {
  if (!["original", "2160", "1080", "720", "480"].includes(resolution) || !Number.isFinite(frame.width) || !Number.isFinite(frame.height) || frame.width < 2 || frame.height < 2) throw new Error("Choose a valid video size.");
  const short = resolution === "original" ? 2160 : Number(resolution), scale = resolution === "original" ? 1 : Math.min(1, short / Math.min(frame.width, frame.height), short * 16 / 9 / Math.max(frame.width, frame.height));
  return { width: Math.max(2, Math.floor(frame.width * scale / 2) * 2), height: Math.max(2, Math.floor(frame.height * scale / 2) * 2) };
}
// Chromaticity distance separates screen color from brightness, helping with screen shadows.
// This is chroma key, not semantic person segmentation: matching clothing is removed too.
export function keyPixels(data: Uint8ClampedArray, settings: KeySettings, matte = false) {
  validateKey(settings);
  const key = rgb(settings.color), sum = Math.max(1, key[0] + key[1] + key[2]);
  const kr = key[0] / sum, kg = key[1] / sum, kb = key[2] / sum;
  const threshold = settings.strength / 100 * 0.5, feather = 0.005 + settings.softness / 100 * 0.3;
  const dominant = key[1] > Math.max(key[0], key[2]) * 1.15 ? 1 : key[2] > Math.max(key[0], key[1]) * 1.15 ? 2 : -1;
  for (let i = 0; i < data.length; i += 4) {
    const total = Math.max(1, data[i] + data[i + 1] + data[i + 2]);
    const distance = Math.sqrt((data[i] / total - kr) ** 2 + (data[i + 1] / total - kg) ** 2 + (data[i + 2] / total - kb) ** 2);
    const t = Math.min(1, Math.max(0, (distance - threshold) / feather));
    const alpha = t * t * (3 - 2 * t) * data[i + 3] / 255;
    if (matte) { data[i] = data[i + 1] = data[i + 2] = Math.round(alpha * 255); data[i + 3] = 255; continue; }
    if (dominant !== -1 && settings.spill && distance < threshold + feather + 0.3) {
      const other = dominant === 1 ? Math.max(data[i], data[i + 2]) : Math.max(data[i], data[i + 1]);
      const excess = Math.max(0, data[i + dominant] - other);
      data[i + dominant] -= excess * settings.spill / 100 * Math.min(1, Math.max(0, 1 - (distance - threshold - feather) / 0.3));
    }
    data[i + 3] = Math.round(alpha * 255);
  }
  return data;
}
export function detectScreen(samples: readonly RGB[]): string | null {
  const candidates = samples.filter(([r, g, b]) => g > Math.max(r, b) * 1.3 && g > 25 || b > Math.max(r, g) * 1.3 && b > 25);
  if (candidates.length < 2) return null;
  const greens = candidates.filter(([r, g, b]) => g > r && g > b), blues = candidates.filter(([, g, b]) => b > g);
  const group = greens.length >= blues.length ? greens : blues;
  return hex([0, 1, 2].map(channel => [...group].sort((a, b) => a[channel] - b[channel])[Math.floor(group.length / 2)][channel]) as unknown as RGB);
}
export function imagePlacement(source: { width: number; height: number }, target: { width: number; height: number }, fit: Background["fit"]) {
  const scale = Math[fit === "cover" ? "max" : "min"](target.width / source.width, target.height / source.height);
  return { x: (target.width - source.width * scale) / 2, y: (target.height - source.height * scale) / 2, width: source.width * scale, height: source.height * scale };
}
