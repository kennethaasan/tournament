import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  output: "standalone",
  // Security: hide Next.js from X-Powered-By header
  poweredByHeader: false,
  // Catch React bugs early in development
  reactStrictMode: true,
  // Log data fetches in development for debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    minimumCacheTTL: 600, // 10min
  },
  experimental: {
    // Persistent filesystem cache for Turbopack (faster dev rebuilds)
    // https://github.com/vercel/next.js/pull/85975
    turbopackFileSystemCacheForDev: true,
    // Cache fetch responses across HMR refreshes in development
    serverComponentsHmrCache: true,
    // Allow font downloads when system TLS trust store is required
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
