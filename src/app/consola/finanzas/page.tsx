import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";
import { PageFade } from "@/components/ui";
import { CONSOLE_ROOT_ID } from "@/components/hub/console-root";
import { fetchMoneyOverTimeData } from "@/lib/data/money-over-time.server";
import { MoneyOverTimeView } from "@/components/hub/money-over-time-view";

/**
 * Standalone portfolio-wide money page — root claude.md's #3 frontend
 * priority ("money over time"), scoped to what's real: contracted rent and
 * escalation-due compliance, not collections/delinquency/CAM recovery (no
 * invoicing or payments table exists in this schema — see
 * money-over-time.server.ts's own doc comment for the full reasoning).
 *
 * Same standalone-page pattern as /consola/renovaciones/[id] and
 * /consola/locales/[id]: gated by middleware.ts's `/consola` prefix check,
 * own copy of the console's design tokens plus the CONSOLE_ROOT_ID portal
 * target (the bug that fix addressed on the other two pages — this one
 * doesn't currently reuse a ConsoleModal-based component, but carries the
 * id from the start rather than waiting to hit the same bug again).
 */
const consoleFont = Inter({
  subsets: ["latin"],
  variable: "--font-console",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dinero en el Tiempo | Consola La Gran Vía Mexicali",
  robots: { index: false, follow: false },
};

export default async function MoneyOverTimePage() {
  const data = await fetchMoneyOverTimeData();

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
          <MoneyOverTimeView data={data} />
        </div>
      </div>
    </PageFade>
  );
}
