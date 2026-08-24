"use client";

import { useState } from "react";
import { LandlordDashboard } from "@/components/hub/landlord-dashboard";
import { TenantPortal } from "@/components/hub/tenant-portal";
import type { ConsoleData } from "@/lib/console-data";
import type { DiegoKPIs, DiegoTicket } from "@/lib/data/diego-tickets.server";
import type { LocaleOption, PortalLocale } from "@/lib/data/tenant-portal.server";
import type { Contractor } from "@/lib/data/contractors.server";
import type { AutonomyState } from "@/lib/platform/settings.server";
import type { AuditEntry } from "@/lib/platform/audit-log.server";
import { signOut } from "@/app/consola/actions";

type ConsoleView = "propietario" | "inquilino";

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
}) {
  const [view, setView] = useState<ConsoleView>("propietario");
  const [fontSizeLevel, setFontSizeLevel] = useState<"normal" | "large" | "xlarge">("normal");
  const isOwner = view === "propietario";

  return (
    <div
      style={{ zoom: fontSizeLevel === "large" ? 1.12 : fontSizeLevel === "xlarge" ? 1.25 : 1 }}
      className={`space-y-4 min-h-screen bg-slate-100 p-3 sm:p-6 font-sans transition-all ${
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
