// Temporary public preview, OPT-IN ONLY since Step 5 (S5-19). Visible
// only when the flag is explicitly "1" — production no longer defaults
// the preview open. This never enables backend services.
export function sitePreviewEnabled() {
  return process.env.NEXT_PUBLIC_AENURAL_SITE_PREVIEW === "1";
}
