import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";
import { PageFade } from "@/components/ui";
import { CONSOLE_ROOT_ID } from "@/components/hub/console-root";
import { fetchExceptionStates } from "@/lib/data/exception-states.server";
import { ExceptionStatesView } from "@/components/hub/exception-states-view";

/**
 * Standalone exception-states page — root claude.md's #4 frontend
 * priority: what the console shows when an agent is uncertain, a document
 * is missing, or a tenant pushes back, instead of only ever rendering the
 * happy-path table. See exception-states.server.ts's doc comment for the
 * one honest substitution (reopened tickets stand in for "disputes a
 * charge" — no cost-dispute mechanism exists in this codebase).
 *
 * Same standalone-page pattern as the other three: gated by middleware.ts's
 * `/consola` prefix check, own console design tokens + CONSOLE_ROOT_ID
 * portal target (see /consola/locales/[id]/page.tsx's doc comment for the
 * bug that id prevents).
 */
const consoleFont = Inter({
  subsets: ["latin"],
  variable: "--font-console",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Excepciones | Consola La Gran Vía Mexicali",
  robots: { index: false, follow: false },
};

export default async function ExceptionStatesPage() {
  const data = await fetchExceptionStates();

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
          <ExceptionStatesView data={data} />
        </div>
      </div>
    </PageFade>
  );
}
