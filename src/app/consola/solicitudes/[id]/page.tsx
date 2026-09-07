import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";
import { PageFade } from "@/components/ui";
import { CONSOLE_ROOT_ID } from "@/components/hub/console-root";
import { fetchLeaseApplicationDetail } from "@/lib/data/lease-application-detail.server";
import { LeaseApplicationDetailView } from "@/components/hub/lease-application-detail-view";

/**
 * Standalone lease-screening review page. The Tier 3 review surface itself
 * already existed (lease-application-review.tsx's expand-in-place card in
 * Pendientes, commit 2ff3b92) — this doesn't replace it, it gives the same
 * decision a stable, linkable address, same reasoning as the renewal diff
 * page and the lease detail page: a screening verdict is the kind of thing
 * someone comes back to or shares a link to, not just a row you expand once
 * and forget. Also adds the one real gap the inline card didn't have yet:
 * who approved/rejected it and when (lease_applications.reviewed_by/
 * reviewed_at, written on every resolution, never selected before this).
 *
 * Same standalone-page pattern as the other three: gated by middleware.ts's
 * `/consola` prefix check, own console design tokens + CONSOLE_ROOT_ID
 * portal target.
 */
const consoleFont = Inter({
  subsets: ["latin"],
  variable: "--font-console",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Solicitud de Arrendamiento | Consola La Gran Vía Mexicali",
  robots: { index: false, follow: false },
};

export default async function LeaseApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await fetchLeaseApplicationDetail(id);
  if (!detail) notFound();

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
          <LeaseApplicationDetailView detail={detail} />
        </div>
      </div>
    </PageFade>
  );
}
