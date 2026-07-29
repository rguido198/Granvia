import type { MetadataRoute } from "next";
import { SITE } from "@/content/site";

/** Public marketing routes only — the Tenant Hub is intentionally noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", priority: 1 },
    { path: "/directorio", priority: 0.9 },
    { path: "/crece-tu-negocio", priority: 0.8 },
    { path: "/eventos", priority: 0.8 },
  ];

  return routes.map(({ path, priority }) => ({
    url: new URL(path, SITE.url).toString(),
    changeFrequency: "monthly" as const,
    priority,
  }));
}
