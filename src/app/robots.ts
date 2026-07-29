import type { MetadataRoute } from "next";
import { SITE } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/inquilinos",
    },
    sitemap: new URL("/sitemap.xml", SITE.url).toString(),
  };
}
