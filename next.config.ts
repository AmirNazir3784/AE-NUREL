import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Separate opt-in loopback QA instance; ordinary development/production stay unchanged.
  ...(process.env.NODE_ENV === "development" && process.env.AENURAL_HYBRID_QA === "1" ? { distDir: ".next-hybrid-dev" } : {}),
  // Product videos change rarely: let browsers keep them for 30 days and the CDN for a year,
  // instead of re-downloading ~3 MB per video on repeat visits.
  async headers() {
    return [
      {
        source: "/videos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, s-maxage=31536000, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
