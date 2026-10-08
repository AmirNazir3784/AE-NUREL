import type { Metadata } from "next";
import { validatedSiteOrigin } from "./site-origin";
export function pageMetadata(title: string, description: string, route: string): Metadata {
  const origin = validatedSiteOrigin(process.env.SITE_URL);
  const socialTitle = title + " | AENural";
  return {
    title: route === "/" ? { absolute: socialTitle } : title, description,
    ...(origin ? { metadataBase: new URL(origin), alternates: { canonical: origin + route } } : {}),
    openGraph: { type: "website", siteName: "AENural", locale: "en_US", title: socialTitle, description, ...(origin ? { url: origin + route, images: [{ url: origin + "/social-card.png", width: 1200, height: 630, alt: "AENural — Tools for People Who Edit" }] } : {}) },
    twitter: { card: origin ? "summary_large_image" : "summary", title: socialTitle, description, ...(origin ? { images: [origin + "/social-card.png"] } : {}) },
  };
}
