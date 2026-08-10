"use client";

import { useState } from "react";
import { LandlordDashboard } from "@/components/hub/landlord-dashboard";
import { TenantPortal } from "@/components/hub/tenant-portal";
import { PORTAL_TENANT } from "@/content/hub";
import type { ConsoleData } from "@/lib/console-data";
import { signOut } from "@/app/consola/actions";

type ConsoleView = "propietario" | "inquilino";

/**
 * The landlord console, reached only after middleware.ts verifies the signed
 * session cookie set by the login form at /consola/acceso.
 */
export function ConsoleShell({ data }: { data: ConsoleData }) {
  const [view, setView] = useState<ConsoleView>("propietario");
  const isOwner = view === "propietario";

  return (
    <div className="space-y-4 min-h-screen bg-slate-100 p-2 sm:p-4">
      {/* Auth Banner & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:px-4 text-xs shadow-xs">
        <p className="flex flex-wrap items-center gap-2 font-mono">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          <span className="font-bold text-slate-900 uppercase">Consola de Asset Management · Sesión Autenticada</span>
          <span className="text-slate-500">
            {isOwner ? "Vista Propietario (Plaza Completa)" : `Vista Arrendatario (${PORTAL_TENANT.unit})`}
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg" role="group" aria-label="Cambiar vista">
            <button
              type="button"
              onClick={() => setView("propietario")}
              aria-pressed={isOwner}
              className={`cursor-pointer rounded-md px-3 py-1 font-mono text-[11px] font-bold transition-all ${
                isOwner ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Propietario
            </button>
            <button
              type="button"
              onClick={() => setView("inquilino")}
              aria-pressed={!isOwner}
              className={`cursor-pointer rounded-md px-3 py-1 font-mono text-[11px] font-bold transition-all ${
                !isOwner ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Vista Inquilino
            </button>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-[11px] font-bold text-rose-700 hover:bg-rose-50 hover:border-rose-200 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      {/* Main View Render */}
      {isOwner ? (
        <LandlordDashboard data={data} />
      ) : (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <TenantPortal />
        </div>
      )}

      <p className="text-center font-mono text-[10px] text-slate-400">
        La Gran Vía Mexicali · Consola de Asset Management · Sesión caduca en 8 horas
      </p>
    </div>
  );
}
