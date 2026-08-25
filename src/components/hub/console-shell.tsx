"use client";

import { useState, type CSSProperties } from "react";
import { Inter } from "next/font/google";
import { CONSOLE_ROOT_ID } from "@/components/hub/console-root";
import { LandlordDashboard } from "@/components/hub/landlord-dashboard";
import { TenantPortal } from "@/components/hub/tenant-portal";
import type { ConsoleData } from "@/lib/console-data";
import type { DiegoKPIs, DiegoTicket } from "@/lib/data/diego-tickets.server";
import type { LocaleOption, PortalLocale } from "@/lib/data/tenant-portal.server";
import type { Contractor } from "@/lib/data/contractors.server";
import type { AutonomyState } from "@/lib/platform/settings.server";
import type { AuditEntry } from "@/lib/platform/audit-log.server";
import type { CorporateUser } from "@/lib/platform/users.server";
import type { LeaseDocumentRow, Portfolio } from "@/lib/data/portfolio.server";
import { signOut } from "@/app/consola/actions";

type ConsoleView = "propietario" | "inquilino";

/**
 * Console-scoped typeface. Deliberately NOT the marketing site's Cormorant/Work Sans
 * pairing (src/app/layout.tsx, src/app/globals.css @theme) — the console is a distinct
 * modern SaaS admin product per its own design direction, so it gets its own font
 * loaded and applied only inside this wrapper, never touching --font-display/--font-sans.
 */
const consoleFont = Inter({
  subsets: ["latin"],
  variable: "--font-console",
  display: "swap",
});

/**
 * The landlord console, reached only after middleware.ts verifies the signed
 * session cookie set by the login form at /consola/acceso.
 */
export function ConsoleShell({
  data,
  diegoTickets,
  diegoKpis,
  localeOptions,
  contractors,
  tenantPortalLocale,
  tenantPortalTickets,
  autonomyState,
  auditLog,
  corporateUsers,
  portfolio,
  activeLeaseDocuments,
}: {
  data: ConsoleData;
  diegoTickets: DiegoTicket[];
  diegoKpis: DiegoKPIs;
  localeOptions: LocaleOption[];
  contractors: Contractor[];
  tenantPortalLocale: PortalLocale | null;
  tenantPortalTickets: DiegoTicket[];
  autonomyState: AutonomyState;
  auditLog: AuditEntry[];
  corporateUsers: CorporateUser[];
  portfolio: Portfolio;
  activeLeaseDocuments: LeaseDocumentRow[];
}) {
  const [view, setView] = useState<ConsoleView>("propietario");
  const [fontSizeLevel, setFontSizeLevel] = useState<"normal" | "large" | "xlarge">("normal");
  const isOwner = view === "propietario";

  return (
    <div
      // Portal host for console overlays (see diego-ticket-drawer.tsx). Slide-overs
      // must mount HERE and not on <body>: the three --console-accent tokens below,
      // the console font var, and the a11y zoom are all scoped to this element, and
      // an overlay rendered outside it silently loses all three.
      id={CONSOLE_ROOT_ID}
      style={{
        zoom: fontSizeLevel === "large" ? 1.12 : fontSizeLevel === "xlarge" ? 1.25 : 1,
        // Console-scoped design tokens — the single place the console's accent
        // is defined. Every hub/*.tsx file below references these three
        // via Tailwind arbitrary values (e.g. bg-[var(--console-accent)])
        // instead of hardcoding "indigo-600" per class, so swapping the
        // console's accent later is a one-line change here, not a grep across
        // the whole module. Deliberately NOT touched: globals.css's @theme
        // block (--color-terra, --color-sand-*, --color-signal, --color-alert)
        // which the marketing site still depends on.
        ["--console-accent" as string]: "#4f46e5", // indigo-600
        ["--console-accent-dark" as string]: "#4338ca", // indigo-700
        ["--console-accent-soft" as string]: "#eef2ff", // indigo-50, for secondary-button hover fills
      } as CSSProperties}
      className={`${consoleFont.variable} space-y-4 min-h-screen bg-slate-100 p-3 sm:p-6 font-[family-name:var(--font-console)] transition-all ${
        fontSizeLevel === "large" ? "scale-font-large" : fontSizeLevel === "xlarge" ? "scale-font-xlarge" : "scale-font-normal"
      }`}
    >
      {/* Auth Banner & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:px-5 text-xs shadow-xs">
        <p className="flex flex-wrap items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" aria-hidden="true" />
          <span className="font-bold text-slate-900 uppercase tracking-wide">Consola de Asset Management · Sesión Autenticada</span>
          <span className="text-slate-600 font-semibold">
            {isOwner
              ? "Vista Propietario (Plaza Completa)"
              : `Vista Arrendatario (${tenantPortalLocale?.unitNumber ?? "?"})`}
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* ACCESSIBILITY FONT SIZE CONTROLLER */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
            <span className="px-2 text-slate-500 text-xs font-semibold hidden md:inline">Texto:</span>
            <button
              type="button"
              onClick={() => setFontSizeLevel("normal")}
              title="Texto Normal"
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                fontSizeLevel === "normal"
                  ? "bg-slate-900 text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSizeLevel("large")}
              title="Texto Grande (+12%)"
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-sm ${
                fontSizeLevel === "large"
                  ? "bg-slate-900 text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              A+
            </button>
            <button
              type="button"
              onClick={() => setFontSizeLevel("xlarge")}
              title="Texto Extra Grande (+25%)"
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-base ${
                fontSizeLevel === "xlarge"
                  ? "bg-slate-900 text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              A++
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200" role="group" aria-label="Cambiar vista">
            <button
              type="button"
              onClick={() => setView("propietario")}
              aria-pressed={isOwner}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                isOwner ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Propietario
            </button>
            <button
              type="button"
              onClick={() => setView("inquilino")}
              aria-pressed={!isOwner}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                !isOwner ? "bg-slate-800 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Vista Inquilino
            </button>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      {/* Main View Render */}
      {isOwner ? (
        <LandlordDashboard
          data={data}
          diegoTickets={diegoTickets}
          diegoKpis={diegoKpis}
          localeOptions={localeOptions}
          contractors={contractors}
          autonomyState={autonomyState}
          initialAuditLog={auditLog}
          corporateUsers={corporateUsers}
          portfolio={portfolio}
          activeLeaseDocuments={activeLeaseDocuments}
        />
      ) : (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <TenantPortal locale={tenantPortalLocale} tickets={tenantPortalTickets} />
        </div>
      )}

      <p className="text-center text-xs font-semibold text-slate-500">
        La Gran Vía Mexicali · Consola de Asset Management · Sesión caduca en 8 horas
      </p>
    </div>
  );
}
