import type { MetadataRoute } from "next";
import { validatedSiteOrigin } from "@/lib/site-origin";
export default function robots(): MetadataRoute.Robots { const origin = validatedSiteOrigin(process.env.SITE_URL); return { rules: { userAgent: "*", allow: "/" }, ...(origin ? { sitemap: origin + "/sitemap.xml" } : {}) }; }
