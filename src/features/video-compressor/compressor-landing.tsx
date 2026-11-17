import { VideoCompressor } from "./video-compressor";
import type { CompressorProfile } from "./compressor-profiles";
import { CompressionToolPage } from "./compression-tool-page";

export type CompressorEditorial = { name: string; eyebrow: string; headline: string; accent: string; intro: string; note: string; steps: readonly (readonly [string,string])[]; questions: readonly (readonly [string,string])[] };
export function CompressorLanding({ profile, content }: { profile: CompressorProfile; content: CompressorEditorial }) {
  const presentation = {
    mp4: { description: "Make MP4 videos smaller with quality and size controls.", label: "MP4", ticks: ["MP4 output", "Keep sound", "Free — no signup"] },
    reduce: { description: "Reduce video file size without cutting your clip.", label: "SMALLER", ticks: ["MP4 or WebM", "Original preserved", "Free — no signup"] },
    whatsapp: { description: "Compress a video for WhatsApp with a size limit you choose.", label: "SEND", ticks: ["Adjustable size limit", "MP4 output", "Free — no signup"] },
    mov: { description: "Create a smaller MP4 from a supported MOV video.", label: "MP4", ticks: ["MOV in · MP4 out", "Keep sound", "Free — no signup"] },
  }[profile];
  return <CompressionToolPage name={content.name} {...presentation} questions={content.questions}><VideoCompressor profile={profile} /></CompressionToolPage>;
}
