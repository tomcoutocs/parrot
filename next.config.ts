import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESLint configuration is now handled via eslint.config.mjs
  // The eslint option in next.config.ts has been removed in Next.js 16
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
