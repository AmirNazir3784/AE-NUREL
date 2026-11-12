import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["better-auth", "mysql2", "nodemailer", "kysely"],
  outputFileTracingExcludes: { "/*": ["./.aenural-local/**/*", "./artifacts/**/*", "./references/Audio/**/*", "./references/audio/**/*"] },
  // Avoid repeated multi-second cache compactions on the owner's Windows disk.
  // Compilation remains cached in memory while dev runs. SSD users can opt in.
  experimental: { turbopackFileSystemCacheForDev: process.platform !== "win32" || process.env.AENURAL_DEV_DISK_CACHE === "1" },
  // Separate opt-in loopback QA instance; ordinary development/production stay unchanged.
  ...(process.env.NODE_ENV === "development" && process.env.AENURAL_HYBRID_QA === "1" ? { distDir: ".next-hybrid-dev" } : {}),
  // Product videos change rarely: let browsers keep them for 30 days and the CDN for a year,
  // instead of re-downloading ~3 MB per video on repeat visits.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Limit embedding and document injection without restricting the
          // speech/video workers, WASM, model downloads or caption exports.
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" + (process.env.NODE_ENV === "production" ? "; upgrade-insecure-requests" : "") },
          ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
        ],
      },
      {
        source: "/videos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, s-maxage=31536000, stale-while-revalidate=86400" },
        ],
      },
      { source: "/images/caption-studio/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/api/membership/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/api/auth/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" },{key:"Referrer-Policy",value:"no-referrer"}] },
      { source: "/reset-password", headers: [{ key: "Referrer-Policy", value: "no-referrer" },{key:"Cache-Control",value:"private, no-store"}] },
      ...["/account/:path*", "/sign-in", "/sign-up", "/verify-email", "/forgot-password"].map(source => ({ source, headers: [{ key: "Cache-Control", value: "private, no-store" }] })),
    ];
  },
};

export default nextConfig;
