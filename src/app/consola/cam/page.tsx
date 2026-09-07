import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";
import { PageFade } from "@/components/ui";
import { CONSOLE_ROOT_ID } from "@/components/hub/console-root";
import { fetchCamData } from "@/lib/data/cam.server";
import { CamView } from "@/components/hub/cam-view";

/**
 * Standalone CAM page — deliberately bottom-up, not the fake
 * CAM_MONTHLY_POOL top-down prorateo this session already deleted from
 * console-data.server.ts. Expense side is Diego's real cost_bucket='CAM'
 * tickets (fetchDiegoTickets(), no new query); terms side is contract
 * clauses nobody's read (cam_share_basis/cam_cap_controllable_pct/
 * admin_fee_pct/maintenance_clause on LeaseDetail, also no new query
 * beyond the columns portfolio.server.ts now selects).
 *
 * Hard boundary, by design, not by omission: this page sums Diego's
 * attributed lines and displays contract terms, but never divides the
 * total by a share basis to produce a per-tenant peso figure. That
 * multiplication is cam-allocator's (Renata's) deliverable — never
 * contracted for this engagement — and building it here for free would
 * cannibalize the reason to ever contract her separately. See
 * cam.server.ts's own doc comments for where this line sits in the code.
 *
 * Same standalone-page pattern as /consola/finanzas and /consola/escalaciones.
 */
const consoleFont = Inter({
  subsets: ["latin"],
  variable: "--font-console",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CAM | Consola La Gran Vía Mexicali",
  robots: { index: false, follow: false },
};

export default async function CamPage() {
  const data = await fetchCamData();

  return (
    <PageFade>
      <div
        id={CONSOLE_ROOT_ID}
        style={
          {
            ["--console-accent" as string]: "#4f46e5",
            ["--console-accent-dark" as string]: "#4338ca",
            ["--console-accent-soft" as string]: "#eef2ff",
          } as CSSProperties
        }
        className={`${consoleFont.variable} min-h-screen bg-slate-100 font-[family-name:var(--font-console)]`}
      >
        <div className="max-w-3xl mx-auto p-3 sm:p-6 space-y-4">
          <Link
            href="/consola"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-600 hover:text-ink-900"
          >
            ← Volver a la consola
          </Link>
          <CamView data={data} />
        </div>
      </div>
    </PageFade>
  );
}
