import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";
import { PageFade } from "@/components/ui";
import { CONSOLE_ROOT_ID } from "@/components/hub/console-root";
import { fetchActivityDigest } from "@/lib/data/activity-digest.server";
import { ActivityDigestView } from "@/components/hub/activity-digest-view";

/**
 * Standalone portfolio-wide digest of what Diego/Mariana have actually done
 * — every number here is a real aggregate over the same tables the rest of
 * the console reads, never a fabricated figure. Same standalone pattern as
 * /consola/finanzas (CONSOLE_ROOT_ID, own font/accent tokens, gated by
 * middleware.ts's /consola prefix check).
 */
const consoleFont = Inter({
  subsets: ["latin"],
  variable: "--font-console",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Actividad de los Agentes | Consola La Gran Vía Mexicali",
  robots: { index: false, follow: false },
};

export default async function ActivityDigestPage() {
  const digest = await fetchActivityDigest();

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
          <ActivityDigestView digest={digest} />
        </div>
      </div>
    </PageFade>
  );
}
