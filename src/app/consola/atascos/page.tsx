import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";
import { PageFade } from "@/components/ui";
import { CONSOLE_ROOT_ID } from "@/components/hub/console-root";
import { fetchStalledHandoffs } from "@/lib/data/stalled-handoffs.server";
import { StalledHandoffsView } from "@/components/hub/stalled-handoffs-view";

/**
 * Standalone worklist for stalled agent-to-human (or agent-to-agent)
 * handoffs — the screen that makes the four-agent model trustworthy: an
 * agent can hand off confidently only if something notices when the
 * handoff doesn't land. Same standalone-page pattern as /consola/finanzas
 * and /consola/escalaciones (CONSOLE_ROOT_ID, own font/accent tokens,
 * gated by middleware.ts's /consola prefix check).
 */
const consoleFont = Inter({
  subsets: ["latin"],
  variable: "--font-console",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Traspasos Atascados | Consola La Gran Vía Mexicali",
  robots: { index: false, follow: false },
};

export default async function StalledHandoffsPage() {
  const handoffs = await fetchStalledHandoffs();

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
          <StalledHandoffsView handoffs={handoffs} />
        </div>
      </div>
    </PageFade>
  );
}
