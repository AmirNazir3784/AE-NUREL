import type { MetadataRoute } from "next";
import { tools } from "@/lib/tools";
import { validatedSiteOrigin } from "@/lib/site-origin";
export default function sitemap(): MetadataRoute.Sitemap { const origin = validatedSiteOrigin(process.env.SITE_URL); if (!origin) return []; return ["/", "/source-window", "/premium-tools", "/tools", "/tools/subtitle-tools", "/tools/ai-tools", "/tools/free-audio-to-text-converter-online", "/about", "/help", "/privacy", ...tools.map((t) => t.href)].map((route) => ({ url: origin + route })); }
