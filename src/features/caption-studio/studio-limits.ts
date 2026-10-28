// Keep the upload entry independent of the editor, painter and media codecs.
export const STUDIO_LIMITS = { bytes: 200 * 1024 ** 2, seconds: 120, pixels: 1920 * 1080, cues: 500, outputBytes: 256 * 1024 ** 2 } as const;
export function validateStudioFile(file: Pick<File, "size" | "name" | "type">) {
  if (!file.size) throw new Error("This video is empty.");
  if (file.size > STUDIO_LIMITS.bytes) throw new Error("Choose a video smaller than 200 MiB.");
  if (!/\.(mp4|mov|webm)$/i.test(file.name) || (file.type && !/^(video\/|application\/octet-stream$)/.test(file.type))) throw new Error("Choose an MP4, MOV or WebM video. Codec support is checked on your device.");
}
