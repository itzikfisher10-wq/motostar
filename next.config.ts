import type { NextConfig } from "next";

// On Vercel without an explicit NEXT_PUBLIC_SITE_URL, use the project's production address,
// so canonical URLs and the sitemap are right on the first deploy (inlined at build time).
if (!process.env.NEXT_PUBLIC_SITE_URL) {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) process.env.NEXT_PUBLIC_SITE_URL = `https://${vercel}`;
}

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy. Next.js injects small inline bootstrap scripts, so
 * 'unsafe-inline' is required for scripts unless every page is rendered
 * dynamically with a nonce (which would disable static/ISR caching of catalog pages).
 * Product images are served from this site (public/images/products, see
 * npm run catalog:mirror-images); no third-party image host is allowed except Vercel Blob
 * for admin uploads.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://*.payplus.co.il",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "font-src 'self'",
  "media-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The e2e suite builds into its own folder so it never overwrites a dev/prod build.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  agentRules: false,
  // Enables forbidden() for admin pages a role may not access (src/features/auth/guard.ts).
  experimental: { authInterrupts: true },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 80],
    deviceSizes: [360, 640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    remotePatterns: [
      // Admin uploads when STORAGE_PROVIDER=vercel-blob.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
