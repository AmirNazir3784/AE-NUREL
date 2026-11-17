import type { Tool } from "./tools";

// Completed compression workflows share the existing media engines.
export const compressionTools: readonly Tool[] = [
  { title: "Compress to 10MB", description: "Fit a video within 10 MB with a checked output size, resolution controls and optional sound.", href: "/tools/compress-video-to-10mb", category: "Video Tools", categoryId: "video-tools", group: "Video Tools", icon: "video", processing: "local" },
  { title: "Compress MP4", description: "Reduce video size with H.264 MP4 output, quality controls and optional size targets.", href: "/tools/compress-mp4", category: "Video Tools", categoryId: "video-tools", group: "Video Tools", icon: "video", processing: "local" },
  { title: "Reduce Video File Size", description: "Prioritize smaller files, compare measured savings and choose MP4 or WebM.", href: "/tools/reduce-video-file-size", category: "Video Tools", categoryId: "video-tools", group: "Video Tools", icon: "video", processing: "local" },
  { title: "WhatsApp Compressor", description: "Prepare H.264 MP4 with an adjustable size budget and sound controls.", href: "/tools/compress-video-for-whatsapp", category: "Video Tools", categoryId: "video-tools", group: "Video Tools", icon: "video", processing: "local" },
  { title: "MOV Compressor", description: "Create smaller H.264 MP4 sharing copies from supported MOV footage.", href: "/tools/mov-compressor", category: "Video Tools", categoryId: "video-tools", group: "Video Tools", icon: "video", processing: "local" },
  { title: "Compress Image to 20KB", description: "Fit still images into a checked size budget with JPEG/WebP and dimension controls.", href: "/tools/compress-image-to-20kb", category: "Image Tools", categoryId: "image-tools", group: "Image Tools", icon: "image", processing: "local" },
];
