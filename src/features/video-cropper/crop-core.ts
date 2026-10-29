export type Crop = { x: number; y: number; width: number; height: number };
export type Frame = { width: number; height: number };
export const ASPECTS = { free: null, "9:16": [9, 16], "1:1": [1, 1], "4:5": [4, 5], "16:9": [16, 9], "3:2": [3, 2] } as const;
export type Aspect = keyof typeof ASPECTS;
export type Corner = "nw" | "ne" | "sw" | "se";
export type CropSettings = { format: "mp4" | "webm"; resolution: "original" | "1080" | "720" | "480"; keepAudio: boolean };
export const DEFAULT_CROP_SETTINGS: CropSettings = { format: "mp4", resolution: "original", keepAudio: true };
const even = (value: number) => Math.floor(value / 2) * 2;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function fullCrop(frame: Frame): Crop { return { x: 0, y: 0, width: even(frame.width), height: even(frame.height) }; }
export function moveCrop(crop: Crop, frame: Frame, x: number, y: number): Crop {
  return { ...crop, x: clamp(Math.round(x), 0, frame.width - crop.width), y: clamp(Math.round(y), 0, frame.height - crop.height) };
}
function fitSize(width: number, height: number, aspect: Aspect, desired?: number): Frame {
  const pair = ASPECTS[aspect];
  if (!pair) return { width: Math.max(2, even(width)), height: Math.max(2, even(height)) };
  const max = even(Math.min(width / pair[0], height / pair[1]));
  if (max < 2) throw new Error("This frame is too small for that exact aspect ratio. Choose Free or a larger video.");
  const unit = clamp(even(desired ?? max), 2, max);
  return { width: pair[0] * unit, height: pair[1] * unit };
}
export function presetCrop(frame: Frame, aspect: Aspect, previous = fullCrop(frame)): Crop {
  if (aspect === "free") return previous;
  const size = fitSize(frame.width, frame.height, aspect);
  return moveCrop({ ...previous, ...size }, frame, previous.x + previous.width / 2 - size.width / 2, previous.y + previous.height / 2 - size.height / 2);
}
export function resizeCrop(crop: Crop, frame: Frame, aspect: Aspect, corner: Corner, x: number, y: number): Crop {
  const west = corner.includes("w"), north = corner.includes("n");
  const anchorX = west ? crop.x + crop.width : crop.x, anchorY = north ? crop.y + crop.height : crop.y;
  const maxW = west ? anchorX : frame.width - anchorX, maxH = north ? anchorY : frame.height - anchorY;
  const width = clamp(west ? anchorX - x : x - anchorX, 2, maxW), height = clamp(north ? anchorY - y : y - anchorY, 2, maxH);
  const pair = ASPECTS[aspect];
  const size = pair ? fitSize(maxW, maxH, aspect, Math.min(width / pair[0], height / pair[1])) : fitSize(width, height, "free");
  return { x: west ? anchorX - size.width : anchorX, y: north ? anchorY - size.height : anchorY, ...size };
}
export function editCrop(crop: Crop, frame: Frame, aspect: Aspect, field: keyof Crop, value: number): Crop {
  if (!Number.isFinite(value)) throw new Error("Enter a finite pixel value.");
  if (field === "x" || field === "y") return moveCrop(crop, frame, field === "x" ? value : crop.x, field === "y" ? value : crop.y);
  const pair = ASPECTS[aspect];
  const size = pair
    ? fitSize(frame.width - crop.x, frame.height - crop.y, aspect, value / pair[field === "width" ? 0 : 1])
    : fitSize(field === "width" ? clamp(value, 2, frame.width - crop.x) : crop.width, field === "height" ? clamp(value, 2, frame.height - crop.y) : crop.height, "free");
  return { ...crop, ...size };
}
export function cropOutput(frame: Frame, crop: Crop, aspect: Aspect, settings: CropSettings): Frame {
  if (Object.values(crop).some(value => !Number.isInteger(value)) || crop.x < 0 || crop.y < 0 || crop.width < 2 || crop.height < 2 || crop.width % 2 || crop.height % 2 || crop.x + crop.width > frame.width || crop.y + crop.height > frame.height) throw new Error("Keep the crop inside the source frame with even pixel dimensions.");
  if (!(aspect in ASPECTS) || !["mp4", "webm"].includes(settings.format) || !["original", "1080", "720", "480"].includes(settings.resolution) || typeof settings.keepAudio !== "boolean") throw new Error("Choose valid crop and export settings.");
  const pair = ASPECTS[aspect];
  if (pair && crop.width * pair[1] !== crop.height * pair[0]) throw new Error("The crop does not match the selected aspect ratio.");
  const scale = settings.resolution === "original" ? 1 : Math.min(1, Number(settings.resolution) / Math.min(crop.width, crop.height));
  return fitSize(crop.width * scale, crop.height * scale, aspect);
}
export function croppedFilename(name: string, size: Frame, format: CropSettings["format"]): string {
  return `${name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 90) || "video"}-cropped-${size.width}x${size.height}.${format}`;
}
