import type { MetadataRoute } from "next";
import { tools } from "@/lib/tools";
import { validatedSiteOrigin } from "@/lib/site-origin";
export default function sitemap(): MetadataRoute.Sitemap { const origin = validatedSiteOrigin(process.env.SITE_URL); if (!origin) return []; return ["/", "/source-window", "/premium-tools", "/tools", "/tools/subtitle-tools", "/about", "/help", "/privacy", ...tools.map((t) => t.href)].map((route) => ({ url: origin + route })); }
