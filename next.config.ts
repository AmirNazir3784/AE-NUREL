import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Separate opt-in loopback QA instance; ordinary development/production stay unchanged.
  ...(process.env.NODE_ENV === "development" && process.env.AENURAL_HYBRID_QA === "1" ? { distDir: ".next-hybrid-dev" } : {}),
};

export default nextConfig;
