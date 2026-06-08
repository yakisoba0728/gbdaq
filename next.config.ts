import type { NextConfig } from "next";

// App-level security headers (defense-in-depth). A full script/style CSP is intentionally
// omitted — the app has no external origins and its XSS surface audited clean, and a strict
// CSP would risk breaking the inline theme bootstrap / framer-motion inline styles. The one
// CSP directive kept (frame-ancestors) blocks clickjacking without touching script/style.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Next.js does not infer the
  // parent directory (a stray lockfile lives in the home dir).
  turbopack: { root: __dirname },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
