export type Point = { x: number; y: number; z?: number };
export type GazeSettings = { strength: number; vertical: number; horizontal: number; automatic: boolean };
export const DEFAULT_GAZE: GazeSettings = { strength: 75, vertical: 0, horizontal: 0, automatic: true };
export const EYES = [
  { name: "R", anchors: [33, 160, 158, 133, 153, 144], iris: 468 },
  { name: "L", anchors: [263, 387, 385, 362, 380, 373], iris: 473 },
] as const;
export function validateGaze(settings: GazeSettings) {
  if (typeof settings.automatic !== "boolean" || !Number.isFinite(settings.strength) || settings.strength < 0 || settings.strength > 100 || !Number.isFinite(settings.vertical) || Math.abs(settings.vertical) > 25 || !Number.isFinite(settings.horizontal) || Math.abs(settings.horizontal) > 30) throw new Error("Choose valid correction settings.");
}
export function eyeGeometry(points: readonly Point[], indices: readonly number[], width: number, height: number) {
  const p = indices.map(i => points[i]);
  if (p.some(v => !v || !Number.isFinite(v.x) || !Number.isFinite(v.y))) return null;
  const left = p[0].x < p[3].x ? p[0] : p[3], right = p[0].x < p[3].x ? p[3] : p[0];
  const dx = (right.x - left.x) * width, dy = (right.y - left.y) * height, span = Math.hypot(dx, dy), rotation = Math.atan2(dy, dx);
  const cos = Math.cos(rotation), sin = Math.sin(rotation);
  const cx = (p[0].x + p[3].x) * width / 2, cy = (p[0].y + p[3].y) * height / 2;
  const opening = Math.abs(-(p[1].x + p[2].x - p[4].x - p[5].x) * width * sin + (p[1].y + p[2].y - p[4].y - p[5].y) * height * cos) / 2 / span;
  const w = Math.floor(span * 1.5), h = Math.floor(span * 1.125), x = cx - w / 2 * cos + h * 7 / 12 * sin, y = cy - w / 2 * sin - h * 7 / 12 * cos;
  // Do not invent eyes in blinks, tiny faces, cropped faces or tilted heads.
  const corners = [[0,0],[w,0],[0,h],[w,h]].map(([u,v]) => [x + u * cos - v * sin, y + u * sin + v * cos]);
  if (span < 18 || opening < .08 || opening > .65 || Math.abs(rotation) > Math.PI / 9 || corners.some(([a,b]) => a < 0 || b < 0 || a > width || b > height)) return null;
  return { x, y, cx, cy, rotation, width: w, height: h, span, anchors: p.map(v => ({ x: Math.trunc(((v.x * width - cx) * cos + (v.y * height - cy) * sin + w / 2) * 64 / w), y: Math.trunc((-(v.x * width - cx) * sin + (v.y * height - cy) * cos + h * 7 / 12) * 48 / h) })) };
}
export function alignedAngle(angle: readonly number[], rotation: number) {
  const radians = Math.PI / 180, x = Math.tan(angle[1] * radians), y = -Math.tan(angle[0] * radians), cos = Math.cos(rotation), sin = Math.sin(rotation);
  return [-Math.atan(-x * sin + y * cos) / radians, Math.atan(x * cos + y * sin) / radians];
}
export function anchorTensor(points: readonly Point[]) {
  const result = new Float32Array(12 * 48 * 64);
  points.forEach((p, i) => { for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) { result[(2 * i) * 3072 + y * 64 + x] = x - p.x; result[(2 * i + 1) * 3072 + y * 64 + x] = y - p.y; } });
  return result;
}
export function vectorCorrection(vector: readonly number[], settings: GazeSettings) {
  validateGaze(settings);
  if (vector.length !== 3 || !vector.every(Number.isFinite) || vector[2] <= 0 || Math.hypot(...vector) < 1e-6) return null;
  const [x, y, z] = vector, radians = 180 / Math.PI;
  const vertical = -Math.atan2(y, Math.hypot(x, z)) * radians, horizontal = -Math.atan2(x, z) * radians;
  if (Math.abs(vertical) > 35 || Math.abs(horizontal) > 35) return null;
  return [vertical + settings.vertical, horizontal + settings.horizontal].map((value, axis) => Math.max(-(axis ? 30 : 25), Math.min(axis ? 30 : 25, value)) * settings.strength / 100);
}
export type AngleHistory = { time: number; angle: number[]; x: number; y: number; span: number; key: string };
export function smoothAngle(angle: number[], time: number, geometry: { x: number; y: number; span: number }, key: string, previous?: AngleHistory): AngleHistory {
  const dt = previous ? time - previous.time : 0;
  const continuous = previous && key === previous.key && dt > 0 && dt < .25 && Math.hypot(geometry.x - previous.x, geometry.y - previous.y) < geometry.span * .65 && geometry.span / previous.span > .8 && geometry.span / previous.span < 1.25;
  const mix = 1 - Math.exp(-dt / .08);
  return { ...geometry, time, key, angle: continuous ? angle.map((value, i) => previous.angle[i] + (value - previous.angle[i]) * mix) : angle };
}

// Sample original-resolution texture using the learned field and upstream grid.
// Pixel-center mapping follows the input/output resize, retaining source detail.
// An optional zero-angle field supports comparative QA of relative warps.
export function warpEyeDetail(rgba: Uint8ClampedArray, width: number, height: number, flow: Float32Array, baseline?: Float32Array) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 || width * height > 4_000_000 || rgba.length !== width * height * 4 || flow.length !== 6144 || baseline && (baseline.length !== 6144 || !baseline.every(Number.isFinite)) || !flow.every(Number.isFinite)) throw new Error("Invalid eye correction pixels.");
  const output = new Uint8ClampedArray(rgba.length);
  const sampleFlow = (plane: number, x: number, y: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(63, x0 + 1), y1 = Math.min(47, y0 + 1), dx = x - x0, dy = y - y0;
    const a = plane + y0 * 64 + x0, b = plane + y0 * 64 + x1, c = plane + y1 * 64 + x0, d = plane + y1 * 64 + x1;
    return ((flow[a] - (baseline?.[a] ?? 0)) * (1 - dx) + (flow[b] - (baseline?.[b] ?? 0)) * dx) * (1 - dy) + ((flow[c] - (baseline?.[c] ?? 0)) * (1 - dx) + (flow[d] - (baseline?.[d] ?? 0)) * dx) * dy;
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const mx = baseline ? x / (width - 1) * 63 : Math.max(0, Math.min(63, (x + .5) * 64 / width - .5)), my = baseline ? y / (height - 1) * 47 : Math.max(0, Math.min(47, (y + .5) * 48 / height - .5)), i = (y * width + x) * 4;
    const bx = baseline ? x : mx / 63 * width + width / 128 - .5, by = baseline ? y : my / 47 * height + height / 96 - .5;
    const sx = Math.max(0, Math.min(width - 1, bx + sampleFlow(0, mx, my) * width / 2)), sy = Math.max(0, Math.min(height - 1, by + sampleFlow(3072, mx, my) * height / 2));
    const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1), dx = sx - x0, dy = sy - y0;
    for (let c = 0; c < 3; c++) output[i + c] = (rgba[(y0 * width + x0) * 4 + c] * (1 - dx) + rgba[(y0 * width + x1) * 4 + c] * dx) * (1 - dy) + (rgba[(y1 * width + x0) * 4 + c] * (1 - dx) + rgba[(y1 * width + x1) * 4 + c] * dx) * dy;
    output[i + 3] = rgba[i + 3] * Math.max(0, Math.min(1, (mx - 4) / 7, (59 - mx) / 7, (my - 3) / 6, (44 - my) / 6));
  }
  return output;
}
// Matches upstream transformation.py's legacy normalized grid convention.
// Sampling remains inside the eye patch; a feathered composition hides its rim.
export function warpEye(bgr: Float32Array, flow: Float32Array, light: Float32Array) {
  if (bgr.length !== 9216 || flow.length !== 6144 || light.length !== 6144) throw new Error("Invalid eye model output.");
  const output = new Uint8ClampedArray(48 * 64 * 4);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) {
    const i = y * 64 + x;
    const sx = Math.max(0, Math.min(63, (x / 63 + flow[i] / 2) * 64)), sy = Math.max(0, Math.min(47, (y / 47 + flow[3072 + i] / 2) * 48));
    if (![sx, sy, light[i], light[3072 + i]].every(Number.isFinite)) throw new Error("The eye model returned invalid pixels.");
    const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(63, x0 + 1), y1 = Math.min(47, y0 + 1), dx = sx - x0, dy = sy - y0;
    for (let c = 0; c < 3; c++) {
      const offset = (2 - c) * 3072;
      const value = (bgr[offset + y0 * 64 + x0] * (1 - dx) + bgr[offset + y0 * 64 + x1] * dx) * (1 - dy) + (bgr[offset + y1 * 64 + x0] * (1 - dx) + bgr[offset + y1 * 64 + x1] * dx) * dy;
      output[i * 4 + c] = (value * light[i] + light[3072 + i]) * 255;
    }
    output[i * 4 + 3] = 255 * Math.max(0, Math.min(1, (x - 4) / 7, (59 - x) / 7, (y - 3) / 6, (44 - y) / 6));
  }
  return output;
}
