"use client";

import { NewTicketForm } from "@/components/hub/new-ticket-form";
import type { DiegoTicket } from "@/lib/data/diego-tickets.server";
import type { PortalLocale } from "@/lib/data/tenant-portal.server";

function formatContractDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

const STATUS_LABEL: Record<DiegoTicket["status"], string> = {
  pending_triage: "Pendiente de Triage",
  pending_diagnosis: "En Diagnóstico",
  pending_warranty_check: "Verificando Garantía",
  pending_cost_attribution: "Atribuyendo Costo",
  pending_skeptic: "En Auditoría",
  needs_approval: "En Revisión del Propietario",
  dispatched: "Técnico Asignado",
  pending_confirmation: "Pendiente de Confirmación",
  closed: "Cerrado",
  closed_administrative: "Cerrado",
};

/**
 * A single tenant's own view: their lease, their tickets. No CAM ledger —
 * this engagement contracted Diego + Mariana only, not Renata/cam-allocator,
 * so there's no real proration to show (see maintenance-dispatcher/SKILL.md's
 * CAM-without-Renata rule).
 *
 * Scoped deliberately. This is what `/inquilinos` serves, and a tenant opening
 * it must not be able to see another tenant's rent or pro-rata share — the
 * plaza-wide rent roll lives behind auth on `/consola` instead.
 *
 * `locale`/`tickets` are real Supabase data (src/lib/data/tenant-portal.server.ts).
 * No per-tenant auth exists yet, so this always resolves to the one seeded
 * locale — see that file's note on the invite-based auth this is a bridge to.
 */
export function TenantPortal({
  locale,
  tickets,
}: {
  locale: PortalLocale | null;
  tickets: DiegoTicket[];
}) {
  if (!locale) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xs text-sm text-slate-600">
        No hay ningún local registrado todavía.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-8 shadow-xs space-y-6">
      {/* Store Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs sm:text-sm text-slate-600 font-semibold">
            {`${locale.unitNumber} · ${locale.propertyName}`}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">{locale.tenantEntity}</h2>
          <p className="mt-1 text-sm sm:text-base text-slate-600 font-medium">
            Portal Arrendatario. Reporte de incidencias y reglamentos internos.
          </p>
        </div>

        {/* Real leases row for this locale (src/lib/data/tenant-portal.server.ts) —
            no payment-status claim here, since no ERP/payment tracking exists to
            back one. */}
        {locale.monthlyRent !== null && locale.leaseEndDate ? (
          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 text-xs sm:text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium">
            <span>
              <strong>Contrato Activo:</strong> Hasta {formatContractDate(locale.leaseEndDate)}
            </span>
            <span>
              <strong>Superficie:</strong> {locale.areaSqm} m²
            </span>
            <span>
              <strong>Renta Base:</strong> ${locale.monthlyRent.toLocaleString("es-MX")} MXN / mes
            </span>
          </div>
        ) : (
          <div className="text-xs sm:text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium">
            Sin contrato activo registrado para este local.
          </div>
        )}
      </div>

      {/* Tenant Quick Action Tools — ticket reporting is the primary reason a
          tenant opens this portal (it replaces the landlord's WhatsApp), so
          it leads, full-width, with more visual weight than the other two. */}
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-slate-900 bg-white p-6 sm:p-7 space-y-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              Reportar Incidencia de Mantenimiento
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed font-medium">
              Diego IA diagnostica tu reporte al instante y determina responsabilidad de costo. Casos claros se despachan directo a un técnico; los demás pasan a revisión del propietario.
            </p>
          </div>

          <NewTicketForm fixedLocaleId={locale.id} sourceChannel="consola_inquilino" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-900">Reportar Ventas Mensuales</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Sube tu comprobante de cierre de caja en PDF o fotografía antes del día 5 del mes.
            </p>

            <button
              type="button"
              disabled
              className="w-full rounded-xl bg-slate-200 py-3 text-xs sm:text-sm font-bold text-slate-600 cursor-not-allowed"
            >
              Subir Reporte POS — próximamente
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-900">Reglamento &amp; Horarios</h3>
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
      </div>

      {/* Store Active Tickets Section — real Supabase data, not illustrative */}
      <div className="pt-4 border-t border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-3">
          Mis Solicitudes &amp; Incidencias ({locale.unitNumber})
        </h3>
        {tickets.length === 0 ? (
          <p className="text-xs sm:text-sm text-slate-500">Sin solicitudes registradas todavía.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-3">
                  <div>
                    <span className="text-sm font-bold text-slate-900">{t.ticketNumber}</span>
                    <span className="ml-2.5 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-xs font-bold text-slate-900">
                      {STATUS_LABEL[t.status]}
                    </span>
                  </div>
                  {t.contractorName && (
                    <span className="text-xs sm:text-sm text-slate-600 font-semibold">Asignado: {t.contractorName}</span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  <strong>Reporte:</strong> &ldquo;{t.rawReport}&rdquo;
                </p>
                {t.diagnosis && (
                  <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed mt-1">
                    <strong>Diagnóstico:</strong> {t.diagnosis}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
