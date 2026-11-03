import { DEFAULT_COMPRESSION_SETTINGS, type CompressionSettings } from "./compression-core.ts";

export type CompressorProfile = "mp4" | "reduce" | "whatsapp" | "mov";
export const compressorProfiles: Record<CompressorProfile, { title: string; accept: string; heading: string; note: string; format?: "mp4"; initial: CompressionSettings }> = {
  mov: { title: "MOV Compressor", accept: ".mov", heading: "Your MOV, ready for sharing.", note: "Create a smaller H.264 MP4 copy. Input codecs are checked; ProRes and professional metadata are not supported.", format: "mp4", initial: { ...DEFAULT_COMPRESSION_SETTINGS, format: "mp4" } },
  whatsapp: { title: "WhatsApp Compressor", accept: ".mp4,.m4v,.mov,.webm,.mkv", heading: "A clip worth sending.", note: "Start with a conservative 16 MB budget, or choose the limit your app shows. Output is H.264 MP4.", format: "mp4", initial: { ...DEFAULT_COMPRESSION_SETTINGS, mode: "target", targetMB: 16 } },
  reduce: { title: "Reduce Video File Size", accept: ".mp4,.m4v,.mov,.webm,.mkv", heading: "Less space. The full story.", note: "Start small, compare the result, then raise the quality if you need more detail.", initial: { ...DEFAULT_COMPRESSION_SETTINGS, mode: "small", resolution: "480" } },
  mp4: { title: "Compress MP4", accept: ".mp4,.m4v,.mov,.webm,.mkv", heading: "Your MP4. Less to upload.", note: "Choose a quality preset or set your own size budget. Output stays MP4 with H.264 video.", format: "mp4", initial: { ...DEFAULT_COMPRESSION_SETTINGS, format: "mp4" } },
};
export function validateProfileInput(name: string, profile?: CompressorProfile) {
  if (profile === "mov" && !/\.mov$/i.test(name)) throw new Error("Choose a .MOV video with a supported codec. Use Video Compressor for other containers.");
  if (profile === "mp4" && !/\.(mp4|m4v|mov|webm|mkv)$/i.test(name)) throw new Error("Choose an MP4, M4V, MOV, WebM or MKV video with a supported codec.");
}
