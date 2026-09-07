import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";
import { PageFade } from "@/components/ui";
import { fetchRenewalDetail } from "@/lib/data/renewal-detail.server";
import { RenewalDiffView } from "@/components/hub/renewal-diff-view";

/**
 * Standalone renewal diff page — root claude.md's #1 frontend priority:
 * "the lease redo diff view... the only screen that closes a loop
 * end-to-end." Gated by middleware.ts's existing `/consola` prefix check
 * (requireRole "landlord"), same as /consola itself — no separate auth
 * check needed here.
 *
 * Deliberately its own route rather than another modal on top of
 * lease-renewal-panel.tsx's RenewalCard: a renewal is the actual legal
 * artifact a landlord approves, links to a tenant, and returns to days
 * later — it needs a URL, not a dialog that closes when the tab does.
 *
 * Console-scoped design tokens (--console-accent etc.) and the console's
 * own Inter variable are normally set once on ConsoleShell's root div — this
 * page never mounts ConsoleShell (that would drag in the whole dashboard's
 * client state for one detail view), so they're redeclared on this page's
 * own wrapper instead. Keep the three accent values in sync with
 * console-shell.tsx if that palette ever changes.
 */
const consoleFont = Inter({
  subsets: ["latin"],
  variable: "--font-console",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Renovación | Consola La Gran Vía Mexicali",
  robots: { index: false, follow: false },
};

export default async function RenewalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await fetchRenewalDetail(id);
  if (!detail) notFound();

  return (
    <PageFade>
      <div
        style={
          {
            ["--console-accent" as string]: "#4f46e5",
            ["--console-accent-dark" as string]: "#4338ca",
            ["--console-accent-soft" as string]: "#eef2ff",
          } as CSSProperties
        }
        className={`${consoleFont.variable} min-h-screen bg-slate-100 font-[family-name:var(--font-console)]`}
      >
        <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-4">
          <Link
            href="/consola"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-600 hover:text-ink-900"
          >
            ← Volver a la consola
          </Link>
          <RenewalDiffView lease={detail.lease} versions={detail.versions} initialRenewalId={id} />
        </div>
      </div>
    </PageFade>
  );
}
