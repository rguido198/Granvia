import type { Metadata } from "next";
import { PageFade } from "@/components/ui";
import { TenantPortal } from "@/components/hub/tenant-portal";
import { HUB_INTRO } from "@/content/hub";
import { fetchTenantPortalData } from "@/lib/data/tenant-portal.server";
import { getCurrentProfile } from "@/lib/auth/server";
import { signOutAction } from "@/lib/auth/actions";

/**
 * Tenant Hub — real per-tenant Supabase Auth as of this build (was public,
 * gated only by the site-wide "coming soon" password, showing whichever
 * locale happened to be first on file — anyone with the site password could
 * see it). middleware.ts now requires a role='tenant' session for every
 * path under /inquilinos except /inquilinos/acceso itself.
 */
export const metadata: Metadata = {
  title: "Tenant Hub | La Gran Vía Mexicali",
  description:
    "Portal del arrendatario de La Gran Vía Mexicali: reporte de ventas, incidencias de mantenimiento y reglamentos en un solo lugar.",
  robots: { index: false, follow: false },
};

// Reads real, per-request Supabase data (tickets) below — must not be
// frozen into a static build artifact, unlike the rest of this page's copy.
export const dynamic = "force-dynamic";

export default async function TenantHubPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "tenant") {
    // Middleware already gates this route — reachable only if a session
    // expired between the middleware check and this render.
    return (
      <PageFade>
        <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-ink-500">
          Sesión expirada.{" "}
          <a href="/inquilinos/acceso" className="underline">
            Inicia sesión de nuevo
          </a>
          .
        </div>
      </PageFade>
    );
  }

  const { locale, tickets } = await fetchTenantPortalData(profile.localeId ?? undefined);
  const signOut = signOutAction.bind(null, "/inquilinos/acceso");

  return (
    <PageFade>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 space-y-8">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <p className="inline-block rounded bg-gold/25 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-700">
              Solicitudes de mantenimiento: datos en vivo · Términos de contrato: cifras de ejemplo
            </p>
            <form action={signOut}>
              <button type="submit" className="text-xs font-semibold text-ink-500 underline cursor-pointer">
                Cerrar sesión
              </button>
            </form>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">{HUB_INTRO.title}</h1>
          <p className="max-w-2xl text-sm text-ink-500 leading-relaxed">{HUB_INTRO.lead}</p>
          <p className="font-mono text-[11px] text-ink-500">{HUB_INTRO.note}</p>
        </header>

        <TenantPortal locale={locale} tickets={tickets} />
      </div>
    </PageFade>
  );
}
