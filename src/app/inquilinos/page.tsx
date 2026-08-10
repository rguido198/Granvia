import type { Metadata } from "next";
import { PageFade } from "@/components/ui";
import { TenantPortal } from "@/components/hub/tenant-portal";
import { HUB_INTRO } from "@/content/hub";

/**
 * Tenant Hub — the arrendatario-facing surface, linked from the site header.
 *
 * This route previously rendered the landlord command center: a tenant clicking
 * "Tenant Hub" was shown all 84 tenants' rents and pro-rata shares. That view
 * now lives behind auth at /consola, and this page shows one tenant their own
 * lease only.
 */
export const metadata: Metadata = {
  title: "Tenant Hub | La Gran Vía Mexicali",
  description:
    "Portal del arrendatario de La Gran Vía Mexicali: reporte de ventas, incidencias de mantenimiento y reglamentos en un solo lugar.",
  robots: { index: false, follow: false },
};

export default function TenantHubPage() {
  return (
    <PageFade>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 space-y-8">
        <header className="space-y-3">
          <p className="inline-block rounded bg-gold/25 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-700">
            Demostración · cifras de ejemplo
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">{HUB_INTRO.title}</h1>
          <p className="max-w-2xl text-sm text-ink-500 leading-relaxed">{HUB_INTRO.lead}</p>
          <p className="font-mono text-[11px] text-ink-500">{HUB_INTRO.note}</p>
        </header>

        <TenantPortal />
      </div>
    </PageFade>
  );
}
