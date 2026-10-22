import { validatedSiteOrigin } from "./site-origin";
import type { Tool } from "./tools";

// JSON-LD structured data (schema.org) so search engines can identify the site,
// the publisher and each free tool without guessing from page text alone.
// Absolute URLs need the confirmed production origin, exactly like the sitemap
// and canonical URLs: when SITE_URL is not set these return null and no
// structured data is emitted.
export function siteJsonLd() {
  const origin = validatedSiteOrigin(process.env.SITE_URL);
  if (!origin) return null;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": origin + "/#organization", name: "AENural", url: origin + "/", logo: origin + "/branding/aenural-icon-180.png" },
      { "@type": "WebSite", "@id": origin + "/#website", name: "AENural", url: origin + "/", publisher: { "@id": origin + "/#organization" } },
    ],
  };
}

export function toolJsonLd(tool: Tool) {
  const origin = validatedSiteOrigin(process.env.SITE_URL);
  if (!origin) return null;
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.title,
    url: origin + tool.href,
    description: tool.description,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": origin + "/#organization" },
  };
}
