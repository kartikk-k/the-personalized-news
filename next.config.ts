import type { NextConfig } from "next";
import { imageHosts } from "./src/lib/news/imageHosts";

const nextConfig: NextConfig = {
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Publisher originals can be 5,000px wide; serve right-sized WebP/AVIF instead.
    remotePatterns: imageHosts.map((hostname) => ({ protocol: "https" as const, hostname, pathname: "/**" })),
    qualities: [70],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
    maximumRedirects: 2,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
