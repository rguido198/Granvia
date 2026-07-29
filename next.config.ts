import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // El feed de Instagram sirve las imágenes desde el CDN de Meta.
    // `search` se omite a propósito: las URLs vienen firmadas con query string,
    // así que restringirla a "" haría que toda imagen respondiera 400.
    remotePatterns: [
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
    ],
  },
};

export default nextConfig;
