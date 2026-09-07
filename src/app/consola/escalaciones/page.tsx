import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";
import { PageFade } from "@/components/ui";
import { CONSOLE_ROOT_ID } from "@/components/hub/console-root";
import { fetchEscalationBackfillData } from "@/lib/data/escalation-backfill.server";
import { EscalationBackfillView } from "@/components/hub/escalation-backfill-view";

/**
 * Standalone worklist that turns /consola/finanzas' "X of Y reviewed"
 * escalation-coverage stat into something actionable — one row per lease
 * with no escalation_month committed and not escalation_confirmed_none,
 * pre-filled from Mariana's own mined clause (findEscalationClause via
 * fetchPortfolio()'s suggestedEscalationPct/suggestedEscalationClauseText),
 * always requiring an explicit landlord confirm/edit/none action. Same
 * standalone-page pattern as /consola/finanzas and /consola/actividad
 * (CONSOLE_ROOT_ID, own font/accent tokens, gated by middleware.ts's
 * /consola prefix check).
 */
const consoleFont = Inter({
  subsets: ["latin"],
  variable: "--font-console",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Backfill de Escalaciones | Consola La Gran Vía Mexicali",
  robots: { index: false, follow: false },
};

export default async function EscalationBackfillPage() {
  const data = await fetchEscalationBackfillData();

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
          <div className="flex items-center gap-3">
            <Link
              href="/consola"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-600 hover:text-ink-900"
            >
              ← Volver a la consola
            </Link>
            <span className="text-ink-300">·</span>
            <Link
              href="/consola/finanzas"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-600 hover:text-ink-900"
            >
              Renta Programada y Escalaciones →
            </Link>
          </div>
          <EscalationBackfillView data={data} />
        </div>
      </div>
    </PageFade>
  );
}
