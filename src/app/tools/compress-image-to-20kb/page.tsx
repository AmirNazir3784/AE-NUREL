import { CompressionToolPage } from "@/features/video-compressor/compression-tool-page";
import {pageMetadata} from "@/lib/site-metadata";
import {ImageCompressor} from "@/features/image-compressor/image-compressor";
export const metadata={...pageMetadata("Compress Image to 20KB — Checked Size, JPEG or WebP", "Fit a still image within 20,000 bytes. Choose JPEG or WebP, control dimensions and transparency, compare the result and download a checked file.","/tools/compress-image-to-20kb")};
const questions: readonly (readonly [string, string])[] = [
  ["Does 20 KB mean exactly 20,000 bytes?","It means at most 20,000 bytes. A file may be smaller; it is never padded to look exact. This also fits a 20 KiB ceiling of 20,480 bytes."],
  ["Can I keep the original width and height?","Disable Allow smaller dimensions and set Maximum edge at least as large as the original edge. If the image cannot fit at those dimensions, the tool stops with guidance. It never silently changes that choice."],
  ["What happens to transparent backgrounds?","WebP retains transparency where present. JPEG cannot store transparency: choose white or black for transparent areas before encoding. Check what your upload form accepts."],
  ["Will the image be accepted by an official form?","A size check alone cannot guarantee acceptance. Forms can also require specific dimensions, format, background, face placement or minimum file size. Review the form instructions and inspect the downloaded result."],
  ["Can I use a different target or an animated image?","You can choose 20, 50, 100 or 200 KB, or enter a whole-number target from 1 to 1,000 KB. Only still JPG, PNG, WebP and BMP are accepted; animation is rejected instead of silently losing frames."],
  ["Will compression keep camera or location metadata?","The new copy contains re-encoded pixels rather than the source EXIF or other source metadata. Keep the original if you need its metadata. Exporters can still add basic encoding information."],
];
export default function Page() { return <CompressionToolPage name="Compress Image to 20KB" description="Fit an image within 20 KB, with control over format and dimensions." label="20 KB" image ticks={["Size checked","JPEG or WebP","Free — no signup"]} questions={questions}><ImageCompressor /></CompressionToolPage>; }
