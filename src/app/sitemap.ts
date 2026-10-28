import type { MetadataRoute } from "next";
import { tools } from "@/lib/tools";
import { PRODUCTION_SITE_ORIGIN, validatedSiteOrigin } from "@/lib/site-origin";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = validatedSiteOrigin(process.env.SITE_URL) ?? PRODUCTION_SITE_ORIGIN;
  // Only indexable public pages and the released tool registry belong here.
  // Preview, account, API and redirect routes deliberately stay excluded.
  const routes = [
    "/",
    "/source-window",
    "/premium-tools",
    "/tools",
    "/tools/subtitle-tools",
    "/tools/ai-tools",
    "/tools/free-audio-to-text-converter-online",
    "/about",
    "/help",
    "/privacy",
    ...tools.map((tool) => tool.href),
  ];

  return Array.from(new Set(routes), (route) => ({ url: origin + route }));
}
