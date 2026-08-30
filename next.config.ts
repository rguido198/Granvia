import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    // El feed de Instagram sirve las imágenes desde el CDN de Meta.
    remotePatterns: [
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
    ],
  },
  // Ported from public/_headers (a Cloudflare Pages-only file format Vercel
  // never reads) when the Cloudflare config was removed — without this move
  // the CSP would have silently stopped applying in production.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              // frame-src added for DocumentViewerButton's PDF viewer
              // (legal-documents-panel.tsx) — it iframes a signed Supabase
              // Storage URL to show a digitized contract inline. Without an
              // explicit frame-src, browsers fall back to default-src 'self'
              // for iframes too, silently blocking that cross-origin embed
              // ("This content is blocked") even though connect-src already
              // allowed fetch/XHR to the same origin — frame-src is a
              // separate CSP directive with its own fallback and isn't
              // covered by connect-src.
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://formspree.io https://thoofdklpbdnaicvommo.supabase.co; frame-src https://thoofdklpbdnaicvommo.supabase.co; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
