import { CompressionToolPage } from "@/features/video-compressor/compression-tool-page";
import { pageMetadata } from "@/lib/site-metadata";
import { VideoCompressor } from "@/features/video-compressor/video-compressor";

export const metadata = {
  ...pageMetadata("Compress Video to 10MB — Free, No Watermark", "Make a video fit a 10 MB limit. Compress MP4, MOV or WebM, choose resolution, retain sound and download a size-checked result.", "/tools/compress-video-to-10mb")
};

const questions: readonly (readonly [string, string])[] = [
  ["Does 10 MB mean exactly 10,000,000 bytes?", "Yes. This tool uses decimal megabytes: the output must be at most 10,000,000 bytes. That is also below a 10 MiB limit. A result can be substantially smaller; we do not add padding just to reach the limit."],
  ["What happens if my video is already under 10 MB?", "You can download the original without another compression pass. That preserves its existing quality and format. You can also create a compressed copy if you want it smaller."],
  ["Can every video fit without losing quality?", "No. Longer clips have fewer bits available per second under the same size limit. Compression can soften detail, especially with fast motion. Try 720p or 480p, remove sound when appropriate, or shorten the clip. If a usable size budget cannot be calculated, the tool explains rather than claiming success."],
  ["Can I upload a 4K video?", "Yes, supported videos up to 4K, 500 MB and 20 minutes are accepted. Choose Keep source size for the original dimensions, or a smaller resolution. Fitting a long 4K video into 10 MB may require reducing resolution; 4K output availability also depends on codec support."],
  ["Will it keep the complete video and its sound?", "The entire timeline is retained. Keep sound is selected by default, and the output is checked for duration, dimensions and selected audio. Compatible audio may be copied; other supported audio may be converted. Embedded subtitles, HDR and specialist color metadata are not preserved."],
  ["What if the first export is too large?", "The actual file size is checked, and the tool can retry once at a lower video bitrate. If it still exceeds 10 MB, no oversized download is presented as a successful result. Try a smaller resolution or remove sound. There is no watermark or sign-in requirement."],
];

export default function Page() { return <CompressionToolPage name="Compress to 10MB" description="Compress video to 10 MB while keeping its full length." label="10 MB" ticks={["Size checked","Keep sound","Free — no signup"]} questions={questions}><VideoCompressor tenMB /></CompressionToolPage>; }
