import { MediaToolPage } from "@/features/video-compressor/compression-tool-page";
import { pageMetadata } from "@/lib/site-metadata";
import { VideoCompressor } from "@/features/video-compressor/video-compressor";

export const metadata = {
  ...pageMetadata("Free Video Compressor — Smaller Videos, More Control", "Compress video with clear quality and size controls. Choose MP4 or WebM, set a file-size target, keep or remove audio, and preview the result. Free, no watermark or signup.", "/tools/video-compressor"),
  robots: { index: true, follow: true },
};

const questions: readonly (readonly [string, string])[] = [
  ["Will compression change my original file?", "Compression creates a separate file without overwriting your original. Preview and download your result before leaving; reloading clears the workspace."],
  ["Can I compress a video to an exact size?", "Choose Target a size and enter your budget in MB. The tool reserves space for audio and container information, then checks the actual output. It can make a second pass at a lower bitrate. If it still cannot fit, it explains what to change instead of presenting an oversized result as success."],
  ["Which formats and browsers work?", "You can select MP4, MOV, M4V, WebM and MKV files containing a video codec supported by your browser. The tool checks decoding and encoding support before processing. Updated desktop Chrome or Edge is a good starting point. An extension alone does not guarantee codec support; AVI and ProRes are not promised."],
  ["Will the compressed video keep its sound?", "Keep sound is selected by default. Compatible AAC audio in MP4, or Opus in WebM, is copied without re-encoding. Other supported audio may be converted to the output codec. If the browser cannot retain it, the tool stops and suggests a different format or intentional muting."],
  ["Why can a compressed file sometimes be larger?", "An already efficient source may have little room to shrink. A new encoder, codec or resolution can produce a larger file. The comparison shows the measured result honestly. Try Smaller file, a lower resolution or a smaller size budget; compression can trade fine detail for size."],
  ["What are the limits and what is preserved?", "Input is limited to 500 MB, 20 minutes, one video track, at most one audio track, and up to 4K pixels. Output is limited to 256 MB for browser memory safety. Aspect ratio, timeline and the selected audio track are checked after export. Embedded subtitles, descriptive metadata and specialist color/HDR workflows are not preserved or guaranteed. There is no watermark, daily allowance or paid tier for this tool."],
];

export default function Page() { return <MediaToolPage name="Video Compressor" description="Make videos smaller with quality, resolution and file-size controls." label="SMALLER" ticks={["MP4 or WebM","Keep sound","Free — no signup"]} questions={questions}><VideoCompressor minimal /></MediaToolPage>; }
