import { sitePreviewEnabled } from "./site-preview.ts";
// A preview is visible for testing, but is not an indexed product release.
// QA opens only the route in a loopback production server; it never lists it.
export function autoCaptionReleased() {
  return process.env.NEXT_PUBLIC_AENURAL_AUTO_CAPTION_RELEASE === "1";
}
export function autoCaptionAvailable() {
  return autoCaptionVisible() || process.env.AENURAL_AUTO_CAPTION_QA === "1";
}
export function autoCaptionVisible() {
  return process.env.NODE_ENV === "development" || autoCaptionReleased() || sitePreviewEnabled();
}
