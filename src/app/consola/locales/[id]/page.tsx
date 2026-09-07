import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";
import { PageFade } from "@/components/ui";
import { CONSOLE_ROOT_ID } from "@/components/hub/console-root";
import { fetchLeaseDetailPage } from "@/lib/data/lease-detail.server";
import { LeaseDetailView } from "@/components/hub/lease-detail-view";

/**
 * Standalone lease/local detail page — root claude.md's #2 frontend
 * priority: "there's no place to land when you click a row." Contract,
 * clause flags, rent-change history, and Diego's maintenance claims for
 * one local, in one page — the answer to "what's going on with 2-14?"
 * without hopping across the Rent Roll, Legal, and Mantenimiento tabs.
 *
 * Same standalone-page pattern as /consola/renovaciones/[id]: gated by
 * middleware.ts's `/consola` prefix check, own copy of the console's
 * design tokens (see that page's doc comment for why), no ConsoleShell.
 */
const consoleFont = Inter({
  subsets: ["latin"],
  variable: "--font-console",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Expediente de Local | Consola La Gran Vía Mexicali",
  robots: { index: false, follow: false },
};

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchLeaseDetailPage(id);
  if (!data) notFound();

  return (
    <PageFade>
      <div
        // Portal target for DocumentViewerButton's ConsoleModal (and any
        // other console overlay this page reuses) — see console-root.ts.
        // Without this id, ConsoleModal's document.getElementById lookup
        // finds nothing and silently renders no modal at all (confirmed
        // live: "Ver contrato escaneado" did nothing until this was added).
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
          <LeaseDetailView lease={data.lease} tickets={data.tickets} />
        </div>
      </div>
    </PageFade>
  );
}
