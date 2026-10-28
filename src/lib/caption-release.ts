// Explicit, build-time release switch for this tool only. Default stays held.
// QA opens only the route in a loopback production server; it never lists it.
export function autoCaptionReleased() {
  return process.env.NEXT_PUBLIC_AENURAL_AUTO_CAPTION_RELEASE === "1";
}
export function autoCaptionAvailable() {
  return process.env.NODE_ENV === "development" || autoCaptionReleased() || process.env.AENURAL_AUTO_CAPTION_QA === "1";
}
