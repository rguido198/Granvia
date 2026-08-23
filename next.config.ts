import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

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
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://formspree.io https://thoofdklpbdnaicvommo.supabase.co; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

export default withWorkflow(nextConfig);
