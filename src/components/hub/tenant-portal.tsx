"use client";

import { useState } from "react";
import { AcTicketSimulator } from "@/components/hub/ac-ticket-chat";
import { CamLedger } from "@/components/hub/cam-ledger";
import { PORTAL_TENANT } from "@/content/hub";

/**
 * A single tenant's own view: their lease, their tickets, their CAM ledger.
 *
 * Scoped deliberately. This is what `/inquilinos` serves, and a tenant opening
 * it must not be able to see another tenant's rent or pro-rata share — the
 * plaza-wide rent roll lives behind auth on `/consola` instead.
 */
export function TenantPortal() {
  const [salesSubmitted, setSalesSubmitted] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-8 shadow-xs space-y-6 font-sans">
      {/* Store Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="rounded-full bg-slate-100 border border-slate-300 px-3.5 py-1 text-xs sm:text-sm font-bold text-slate-900">
              Renta al día (Agosto 2026)
            </span>
            <span className="text-xs sm:text-sm text-slate-600 font-semibold">
              {`${PORTAL_TENANT.unit} · ${PORTAL_TENANT.zone}`}
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">{PORTAL_TENANT.name}</h2>
          <p className="mt-1 text-sm sm:text-base text-slate-600 font-medium">
            Portal Arrendatario. Envío de ventas mensuales, reporte de incidencias y reglamentos internos.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 text-xs sm:text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium">
          <span>
            <strong>Contrato Activo:</strong> Hasta {PORTAL_TENANT.leaseEnds}
          </span>
          <span>
            <strong>Superficie:</strong> {PORTAL_TENANT.sqm} m²
          </span>
          <span>
            <strong>Renta Base:</strong> ${PORTAL_TENANT.monthlyRent.toLocaleString()} MXN / mes
          </span>
        </div>
      </div>

      {/* Tenant Quick Action Tools */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900">Reportar Ventas Mensuales</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            Sube tu comprobante de cierre de caja en PDF o fotografía antes del día 5 del mes.
          </p>

          {salesSubmitted ? (
            <p className="rounded-xl bg-slate-100 border border-slate-300 p-3 text-center text-xs sm:text-sm font-bold text-slate-900" role="status">
              Reporte de Agosto Enviado Correctamente
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setSalesSubmitted(true)}
              className="w-full cursor-pointer rounded-xl bg-slate-900 py-3 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              Subir Reporte POS (Agosto 2026)
            </button>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900">Reportar Incidencia HVAC / Mantenimiento</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            El Agente de IA atiende 24/7 vía WhatsApp y asigna al técnico de plaza en minutos.
          </p>

          <AcTicketSimulator />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900">Reglamento &amp; Horarios</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            Horarios de carga y descarga de proveedores, música ambiental y permisos de modificación.
          </p>
          <button
            type="button"
            disabled
            className="w-full rounded-xl bg-slate-200 py-3 text-xs sm:text-sm font-bold text-slate-600 cursor-not-allowed"
          >
            Reglamento (.PDF) — próximamente
          </button>
        </div>
      </div>

      {/* Store Active Tickets Section */}
      <div className="pt-4 border-t border-slate-200">
        <h3 className="font-display text-lg font-bold text-slate-900 mb-3">
          Mis Solicitudes &amp; Incidencias ({PORTAL_TENANT.unit})
        </h3>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-3">
            <div>
              <span className="text-sm font-bold text-slate-900">#INC-402 · Compresor HVAC Terraza</span>
              <span className="ml-2.5 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-xs font-bold text-slate-900">
                EN PROGRESO
              </span>
            </div>
            <span className="text-xs sm:text-sm text-slate-600 font-semibold">Asignado: Carlos R. (Climas)</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
            Diagnóstico: El Agente de IA detectó falla en el compresor secundario. El técnico llegará a las 11:30 AM con el repuesto.
          </p>
        </div>
      </div>

      {/* NNN / CAM Ledger — this tenant's own share only */}
      <div className="pt-4 border-t border-hairline">
        <CamLedger />
      </div>
    </section>
  );
}
