import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Next.js does not infer the
  // parent directory (a stray lockfile lives in the home dir).
  turbopack: { root: __dirname },
};

export default nextConfig;
