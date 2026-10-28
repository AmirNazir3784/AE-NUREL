import type { MetadataRoute } from "next";
import { PRODUCTION_SITE_ORIGIN, validatedSiteOrigin } from "@/lib/site-origin";

export default function robots(): MetadataRoute.Robots {
  const origin = validatedSiteOrigin(process.env.SITE_URL) ?? PRODUCTION_SITE_ORIGIN;
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: origin + "/sitemap.xml",
  };
}
