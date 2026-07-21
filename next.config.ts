import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // lucide-react is default-optimized, but we list it explicitly so the
    // per-icon tree-shaking is guaranteed regardless of future default changes.
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
