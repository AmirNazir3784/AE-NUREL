export const COMPRESSION_LIMITS = {
  inputBytes: 500_000_000,
  outputBytes: 256_000_000,
  duration: 20 * 60,
  pixels: 4096 * 2160,
  minimumBitrate: 64_000,
} as const;

export type CompressionMode = "balanced" | "small" | "quality" | "target";
export type CompressionSettings = {
  mode: CompressionMode;
  resolution: "original" | "1080" | "720" | "480";
  format: "mp4" | "webm";
  keepAudio: boolean;
  targetMB: number;
};
export type CompressionMedia = {
  width: number;
  height: number;
  duration: number;
  videoBitrate: number;
  audioBitrate: number;
  frameRate: number;
  audioTracks: number;
  videoCodec: string;
  audioCodec: string | null;
};
export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
  mode: "balanced", resolution: "720", format: "mp4", keepAudio: true, targetMB: 10,
};

export function validateCompressionFile(file: { name: string; size: number }) {
  if (!/\.(mp4|m4v|mov|webm|mkv)$/i.test(file.name)) throw new Error("Choose an MP4, MOV, M4V, WebM or MKV video. The codec must also be supported by your browser.");
  if (!Number.isFinite(file.size) || file.size <= 0) throw new Error("This file is empty. Choose a video containing media.");
  if (file.size > COMPRESSION_LIMITS.inputBytes) throw new Error("Choose a video smaller than 500 MB.");
}

export function validateCompressionMedia(media: CompressionMedia) {
  if (![media.width, media.height, media.duration, media.videoBitrate, media.audioBitrate, media.frameRate].every(Number.isFinite)) throw new Error("This video's metadata could not be read safely.");
  if (media.duration <= 0 || media.duration > COMPRESSION_LIMITS.duration) throw new Error("Choose a video between a fraction of a second and 20 minutes long.");
  if (media.width < 2 || media.height < 2 || media.width * media.height > COMPRESSION_LIMITS.pixels || Math.max(media.width, media.height) > 4096) throw new Error("Choose a video at 4K resolution or below.");
  if (media.audioTracks < 0 || media.audioTracks > 1) throw new Error("Choose a file with at most one audio track so no soundtrack is silently dropped.");
}

export function compressionDimensions(media: Pick<CompressionMedia, "width" | "height">, resolution: CompressionSettings["resolution"]) {
  if (!["original", "1080", "720", "480"].includes(resolution)) throw new Error("Choose a valid output resolution.");
  const shortEdge = Math.min(media.width, media.height);
  const scale = resolution === "original" ? 1 : Math.min(1, Number(resolution) / shortEdge);
  return {
    width: Math.max(2, Math.floor(media.width * scale / 2) * 2),
    height: Math.max(2, Math.floor(media.height * scale / 2) * 2),
  };
}

export function compressionPlan(media: CompressionMedia, settings: CompressionSettings) {
  validateCompressionMedia(media);
  if (!["balanced", "small", "quality", "target"].includes(settings.mode) || !["mp4", "webm"].includes(settings.format) || typeof settings.keepAudio !== "boolean") throw new Error("Choose valid compression settings.");
  const { width, height } = compressionDimensions(media, settings.resolution);
  const copiesAudio = settings.format === "mp4" ? media.audioCodec === "aac" : media.audioCodec === "opus";
  const audioBitrate = settings.keepAudio && media.audioTracks ? copiesAudio ? media.audioBitrate || 128_000 : 128_000 : 0;
  const overhead = 16_384;
  let videoBitrate: number;
  let targetBytes: number | null = null;
  if (settings.mode === "target") {
    if (!Number.isFinite(settings.targetMB) || settings.targetMB < 0.1 || settings.targetMB > 250) throw new Error("Enter a target between 0.1 and 250 MB.");
    targetBytes = Math.floor(settings.targetMB * 1_000_000);
    videoBitrate = Math.floor((targetBytes * 0.95 - overhead) * 8 / media.duration - audioBitrate);
    if (videoBitrate < COMPRESSION_LIMITS.minimumBitrate) throw new Error("That size budget is too small for this duration and audio. Increase the target, remove audio, or use a shorter video.");
    // A budget larger than the source is not a reason to inflate its bitrate.
    videoBitrate = Math.min(videoBitrate, Math.max(COMPRESSION_LIMITS.minimumBitrate, Math.floor(media.videoBitrate * 0.94 * Math.sqrt(width * height / (media.width * media.height)))));
  } else {
    const factor = { quality: 0.94, balanced: 0.7, small: 0.45 }[settings.mode];
    const areaScale = width * height / (media.width * media.height);
    const detailRate = width * height * Math.min(60, Math.max(15, media.frameRate)) * (settings.mode === "quality" ? 0.1 : settings.mode === "small" ? 0.035 : 0.055);
    videoBitrate = Math.max(COMPRESSION_LIMITS.minimumBitrate, Math.floor(Math.min(detailRate, media.videoBitrate * factor * Math.sqrt(areaScale))));
  }
  videoBitrate = Math.min(50_000_000, videoBitrate);
  const estimatedBytes = Math.ceil((videoBitrate + audioBitrate) * media.duration / 8 + overhead);
  return { width, height, videoBitrate, audioBitrate, estimatedBytes, targetBytes };
}

export function smallerTargetBitrate(currentBitrate: number, actualBytes: number, targetBytes: number, audioBytes: number) {
  const videoBudget = targetBytes * 0.92 - audioBytes - 16_384;
  const actualVideoBytes = actualBytes - audioBytes;
  if (videoBudget <= 0 || actualVideoBytes <= 0) throw new Error("The audio alone uses this size budget. Increase the target or remove audio.");
  const bitrate = Math.floor(currentBitrate * Math.min(0.85, videoBudget / actualVideoBytes));
  if (bitrate < COMPRESSION_LIMITS.minimumBitrate) throw new Error("This target is too small at these settings. Increase the target or remove audio.");
  return bitrate;
}

export function compressedFilename(name: string, format: CompressionSettings["format"]) {
  const stem = name.replace(/\.[^.]+$/, "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").slice(0, 140).trim() || "video";
  return `${stem}-compressed.${format}`;
}

export function formatVideoBytes(bytes: number) {
  return bytes < 1_000_000 ? `${Math.max(0, bytes / 1000).toFixed(0)} KB` : `${(bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 2 : 1)} MB`;
}
