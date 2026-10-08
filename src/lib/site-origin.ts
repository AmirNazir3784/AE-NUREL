// Set SITE_URL to the confirmed HTTPS production origin at release time.
export function validatedSiteOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try { const url = new URL(value); if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return null; return url.origin; } catch { return null; }
}
