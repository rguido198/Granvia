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
    <section className="rounded-xl border border-hairline-strong bg-sand-100 p-5 sm:p-8 shadow-md space-y-6">
      {/* Store Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="rounded bg-pine/15 px-2 py-0.5 font-mono text-[10px] font-bold text-pine uppercase">
              Renta al día (Julio 2026)
            </span>
            <span className="font-mono text-[10px] text-ink-500">
              {`// ${PORTAL_TENANT.unit} · ${PORTAL_TENANT.zone}`}
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">{PORTAL_TENANT.name}</h2>
          <p className="mt-1 text-xs sm:text-sm text-ink-500">
            Portal del Arrendatario. Envío de ventas mensuales, reporte de incidencias y reglamentos internos.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1 font-mono text-xs text-ink-600 bg-sand-50 p-3 rounded-lg border border-hairline">
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
        <div className="rounded-lg border border-hairline bg-sand-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              📄
            </span>
            <h3 className="font-display text-sm font-bold text-ink">Reportar Ventas Mensuales</h3>
          </div>
          <p className="text-xs text-ink-500 leading-relaxed">
            Sube tu comprobante de cierre de caja en PDF o fotografía antes del día 5 del mes.
          </p>

          {salesSubmitted ? (
            <p className="rounded bg-pine/15 p-2 text-center text-xs font-semibold text-pine" role="status">
              ✓ Reporte de Julio Enviado Correctamente
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setSalesSubmitted(true)}
              className="w-full cursor-pointer rounded bg-pine py-2 text-xs font-bold text-sand-100 hover:bg-pine/90 transition-colors"
            >
              Subir Reporte POS (Julio 2026) →
            </button>
          )}
        </div>

        <div className="rounded-lg border border-hairline bg-sand-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              🛠️
            </span>
            <h3 className="font-display text-sm font-bold text-ink">Reportar Incidencia HVAC / Mantenimiento</h3>
          </div>
          <p className="text-xs text-ink-500 leading-relaxed">
            El Agente de IA atiende 24/7 vía WhatsApp y asigna al técnico de plaza en minutos.
          </p>

          <AcTicketSimulator />
        </div>

        <div className="rounded-lg border border-hairline bg-sand-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              📋
            </span>
            <h3 className="font-display text-sm font-bold text-ink">Reglamento &amp; Horarios</h3>
          </div>
          <p className="text-xs text-ink-500 leading-relaxed">
            Horarios de carga y descarga de proveedores, música ambiental y permisos de modificación.
          </p>
          {/* TODO(contenido-real): drop the reglamento PDF into /public and make
              this a real download. Until then it says so rather than pretending. */}
          <button
            type="button"
            disabled
            className="w-full rounded bg-sand-200 py-2 text-xs font-bold text-ink-500 cursor-not-allowed"
          >
            Reglamento (.PDF) — próximamente
          </button>
        </div>
      </div>

      {/* Store Active Tickets Section */}
      <div className="pt-4 border-t border-hairline">
        <h3 className="font-display text-base font-bold text-ink mb-3">
          Mis Solicitudes &amp; Incidencias ({PORTAL_TENANT.unit})
        </h3>
        <div className="rounded-lg border border-hairline bg-sand-50 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline/60 pb-3 mb-3">
            <div>
              <span className="font-mono text-xs font-bold text-ink">#INC-402 · Compresor HVAC Terraza</span>
              <span className="ml-2 rounded bg-gold/25 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-700">
                EN PROGRESO
              </span>
            </div>
            <span className="font-mono text-[11px] text-ink-500">Asignado: Carlos R. (Climas)</span>
          </div>
          <p className="text-xs text-ink-600">
            Diagnóstico: El Agente de IA detectó falla en el compresor secundario. El técnico llegará a las 11:30 AM con
            el repuesto.
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
