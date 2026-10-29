import { imagePlacement, keyPixels, rgb, type Background, type KeySettings } from "./key-core";
export type KeyView = "composite" | "original" | "matte" | "cutout";
export type KeyContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function finishFrame(context: KeyContext, key: KeySettings, background: Background, image: ImageBitmap | null, view: KeyView = "composite", timestamp = 0) {
  if (view === "original") return;
  const { width, height } = context.canvas;
  const pixels = context.getImageData(0, 0, width, height);
  keyPixels(pixels.data, key, view === "matte");
  context.putImageData(pixels, 0, 0);
  if (view !== "composite") return;
  context.save(); context.globalCompositeOperation = "destination-over";
  if (background.type === "image" && image) {
    const box = imagePlacement(image, { width, height }, background.fit);
    context.drawImage(image, box.x, box.y, box.width, box.height);
  }
  rgb(background.color); rgb(background.second);
  if (background.type === "gradient") {
    const angle = timestamp * Math.PI / 4, dx = Math.cos(angle) * width / 2, dy = Math.sin(angle) * height / 2;
    const gradient = background.animated ? context.createLinearGradient(width / 2 - dx, height / 2 - dy, width / 2 + dx, height / 2 + dy) : context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, background.color); gradient.addColorStop(1, background.second); context.fillStyle = gradient;
  } else context.fillStyle = background.color;
  context.fillRect(0, 0, width, height); context.restore();
}

export async function loadBackgroundImage(file: File, signal: AbortSignal) {
  if (!/\.(png|jpe?g|webp)$/i.test(file.name) || !file.size || file.size > 20_000_000) throw new Error("Choose a PNG, JPG or WebP background up to 20 MB.");
  signal.throwIfAborted();
  const bitmap = await createImageBitmap(file);
  if (signal.aborted) { bitmap.close(); signal.throwIfAborted(); }
  if (bitmap.width > 8192 || bitmap.height > 8192 || bitmap.width * bitmap.height > 24_000_000) { bitmap.close(); throw new Error("Choose a background up to 24 megapixels, with neither edge over 8192 pixels."); }
  return bitmap;
}
