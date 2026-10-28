// Temporary public preview authorized for live testing. Set to "0" at build
// and runtime to restore the release hold. This never enables backend services.
export function sitePreviewEnabled() {
  return process.env.NEXT_PUBLIC_AENURAL_SITE_PREVIEW === "1" ||
    process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_AENURAL_SITE_PREVIEW !== "0";
}
