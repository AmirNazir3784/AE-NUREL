import { MediaToolPage } from "@/features/video-compressor/compression-tool-page";
import { MediaToolVisual } from "@/components/tools/media-tool-visual";
import { pageMetadata } from "@/lib/site-metadata";
import { VideoCropper } from "@/features/video-cropper/video-cropper";

export const metadata = {
  ...pageMetadata("Free Video Cropper — Precise Framing, Easy Export", "Crop videos with exact pixel controls, aspect ratio presets and a live preview. Export MP4 or WebM, with optional audio. Free, no watermark or signup.", "/tools/video-cropper"),
  robots: { index: true, follow: true },
};
const questions: readonly (readonly [string, string])[] = [
  ["Will cropping change my original file?", "No. Cropping creates a separate video file. Your original stays unchanged. Preview and download the result before closing or reloading the page."],
  ["What is the difference between cropping and resizing?", "Cropping removes the edges outside your chosen frame. Resizing changes the output dimensions. Use Crop pixels to keep the selected area's pixel dimensions, or choose a shorter-edge limit to make the export smaller. The tool never upscales."],
  ["How do I get an exact social media shape?", "Choose 9:16 for a vertical frame, 1:1 for a square, 4:5 for a portrait feed, or 16:9 for widescreen. Presets lock the exact ratio and use even pixel dimensions for video encoding. Drag the frame to your subject, or enter its X and Y position. Reset frame restores the whole source; Undo restores an earlier crop."],
  ["Can I keep the original sound and duration?", "Yes. Keep sound is on by default and the entire timeline is exported. Compatible AAC audio in MP4 and Opus audio in WebM can be copied; other supported audio is converted when needed. Export stops with a clear error if the chosen audio cannot be retained. Uncheck Keep sound for a silent result."],
  ["Which files and browsers are supported?", "Choose MP4, MOV, M4V, WebM or MKV containing a browser-decodable video codec. Updated desktop Chrome and Edge are good starting points. Input is limited to 500 MB, 20 minutes, one video track, at most one audio track and up to 4K pixels. Output is limited to 256 MB for browser memory safety. Unsupported codecs fail before a successful export is reported."],
  ["Is the export lossless?", "No. The cropped video is re-encoded with a detail-focused bitrate, so some quality loss is possible and the output may be larger than an efficiently encoded original. Preview the exported file before sharing it. Embedded subtitles, descriptive metadata and specialist HDR/color workflows are not preserved or guaranteed. There is no watermark, account requirement or paid tier for this tool."],
];
export default function Page() { return <MediaToolPage name="Video Cropper" description="Crop your video with aspect-ratio presets and precise controls." label="CROP" ticks={["Exact pixel controls","MP4 or WebM","Free — no signup"]} questions={questions} visual={<MediaToolVisual kind="crop" />} steps={[{"title":"Add your video","text":"Choose a file or drop it into the tool."},{"title":"Set your frame","text":"Choose a ratio, drag the frame or enter pixels."},{"title":"Preview and download","text":"Export your crop. Keep the original."}]}><VideoCropper /></MediaToolPage>; }
