"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NewTicketForm } from "@/components/hub/new-ticket-form";
import type { DiegoTicket } from "@/lib/data/diego-tickets.server";
import type { PortalLocale } from "@/lib/data/tenant-portal.server";

function formatMxn(n: number) {
  return `$${n.toLocaleString("es-MX")} MXN`;
}

/**
 * "Simple" in-app notification, per the scope this was approved at: no
 * email/SMS/WhatsApp channel exists (deferred elsewhere in this project),
 * so this compares the ticket's own updatedAt against a per-ticket
 * "last seen" timestamp in this tenant's own browser — viewer-local, no
 * server round-trip, no cross-device sync. Starts at the "unknown"
 * sentinel (not null) so the very first client render matches the server
 * render exactly — localStorage doesn't exist during SSR, and reading it
 * in a lazy useState initializer would throw there.
 */
function useIsUnseen(localeId: string, ticketId: string, updatedAt: string): boolean {
  // Scoped by localeId, not just ticketId — a shared kiosk/browser logging
  // in as two different tenants (different locales) would otherwise show
  // one tenant's "seen" state as if it were the other's.
  const storageKey = `gran-via-ticket-seen:${localeId}:${ticketId}`;
  const [seenAt, setSeenAt] = useState<string | null | "unknown">("unknown");

  useEffect(() => {
    let current: string | null = null;
    try {
      current = localStorage.getItem(storageKey);
    } catch {
      // Private browsing / storage disabled — treat as never seen, but
      // don't crash the portal over it.
    }
    setSeenAt(current);
    // Being on this page IS having seen the current state — marks it seen
    // for next visit rather than requiring a separate click.
    try {
      localStorage.setItem(storageKey, updatedAt);
    } catch {
      // Same as above — best-effort only.
    }
  }, [storageKey, updatedAt]);

  if (seenAt === "unknown") return false;
  return seenAt === null || new Date(updatedAt).getTime() > new Date(seenAt).getTime();
}

/** timeZone: "UTC" is load-bearing here — see the identical helper's
 *  comment in landlord-dashboard.tsx for why a bare "YYYY-MM-DD" string
 *  needs it to avoid rolling back a day (or a month, near a boundary) in
 *  negative-UTC-offset timezones like Mexicali's. */
function formatContractDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
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
  reopened: "Reportado de Nuevo",
  closed: "Cerrado",
  closed_administrative: "Cerrado",
};

/** One ticket row — status, the landlord's own record of the work once
 *  mark-resolved has written it, and (only at pending_confirmation) the
 *  tenant's own two actions — "Confirmar Resuelto" or "El problema
 *  continúa" — the second half of the close diego-triage.ts's workflow
 *  never built on its own. */
function TicketCard({ ticket: t, localeId }: { ticket: DiegoTicket; localeId: string }) {
  const router = useRouter();
  const isUnseen = useIsUnseen(localeId, t.id, t.updatedAt);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [reopenNote, setReopenNote] = useState("");

  async function confirmResolved() {
    setConfirming(true);
    setConfirmError(null);
    try {
      const res = await fetch(`/api/tickets/${t.id}/confirm-resolved`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "No se pudo confirmar.");
      }
      router.refresh();
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "No se pudo confirmar.");
      setConfirming(false);
    }
  }

  async function reportStillBroken() {
    if (!reopenNote.trim()) {
      setReopenError("Describe qué sigue mal.");
      return;
    }
    setReopening(true);
    setReopenError(null);
    try {
      const res = await fetch(`/api/tickets/${t.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: reopenNote.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "No se pudo reportar.");
      }
      router.refresh();
    } catch (err) {
      setReopenError(err instanceof Error ? err.message : "No se pudo reportar.");
      setReopening(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">{t.ticketNumber}</span>
          <span className="rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-xs font-bold text-slate-900">
            {STATUS_LABEL[t.status]}
          </span>
          {isUnseen && (
            <span
              className="h-2 w-2 rounded-full bg-emerald-500"
              title="Actualizado desde tu última visita"
              aria-label="Actualizado"
            />
          )}
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

      {/* Only appears once the landlord has actually recorded it. Cost is
       *  shown only for tenant-billed work — the same cost-bucket
       *  vocabulary the landlord console already uses (COST_BUCKET_LABEL,
       *  diego-ticket-ui.ts). Landlord/CAM-billed costs aren't the
       *  tenant's business to see. */}
      {t.workPerformed && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <p className="text-xs font-bold text-emerald-900">Trabajo realizado</p>
          <p className="mt-0.5 text-xs text-emerald-900/90 leading-relaxed">{t.workPerformed}</p>
          {t.finalCost !== null && t.costBucket === "INQUILINO" && (
            <p className="mt-1 text-xs font-bold text-emerald-900">Costo: {formatMxn(t.finalCost)}</p>
          )}
        </div>
      )}

      {t.status === "pending_confirmation" && (
        <div className="mt-3 space-y-2">
          {!showReopenForm ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                disabled={confirming}
                onClick={() => void confirmResolved()}
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs sm:text-sm font-bold text-white cursor-pointer disabled:opacity-50"
              >
                {confirming ? "Confirmando…" : "Confirmar Resuelto"}
              </button>
              <button
                type="button"
                onClick={() => setShowReopenForm(true)}
                className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs sm:text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50"
              >
                El Problema Continúa
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <textarea
                value={reopenNote}
                onChange={(e) => setReopenNote(e.target.value)}
                placeholder="¿Qué sigue mal? (requerido)"
                rows={2}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={reopening || !reopenNote.trim()}
                  onClick={() => void reportStillBroken()}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs sm:text-sm font-bold text-white cursor-pointer disabled:opacity-50"
                >
                  {reopening ? "Enviando…" : "Reportar que Sigue Mal"}
                </button>
                <button
                  type="button"
                  disabled={reopening}
                  onClick={() => {
                    setShowReopenForm(false);
                    setReopenNote("");
                    setReopenError(null);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
              {reopenError && <p className="text-[11px] font-semibold text-red-600">{reopenError}</p>}
            </div>
          )}
          {confirmError && <p className="text-[11px] font-semibold text-red-600">{confirmError}</p>}
        </div>
      )}
    </div>
  );
}

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
  // Diego's workflow (extraction + triage Claude call) writes the ticket row
  // well after /api/ingest's 202 response — router.refresh() inside
  // NewTicketForm fires too early to pick it up (same RSC-refresh
  // unreliability landlord-dashboard.tsx already worked around for
  // active-lease documents). Burst a handful of refetches over ~15s instead.
  const [liveTickets, setLiveTickets] = useState(tickets);
  useEffect(() => {
    setLiveTickets(tickets);
  }, [tickets]);

  const refreshTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/tickets/mine", { cache: "no-store" });
      if (!res.ok) return;
      const { tickets: fresh } = (await res.json()) as { tickets: DiegoTicket[] };
      setLiveTickets(fresh);
    } catch {
      // Transient network hiccup — the next burst tick tries again.
    }
  }, []);

  const burstRefreshTickets = useCallback(() => {
    const delaysMs = [1500, 1500, 2000, 3000, 4000, 5000];
    let elapsed = 0;
    for (const d of delaysMs) {
      elapsed += d;
      setTimeout(() => void refreshTickets(), elapsed);
    }
  }, [refreshTickets]);

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

          <NewTicketForm
            fixedLocaleId={locale.id}
            sourceChannel="consola_inquilino"
            onSubmitted={burstRefreshTickets}
          />
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
        {liveTickets.length === 0 ? (
          <p className="text-xs sm:text-sm text-slate-500">Sin solicitudes registradas todavía.</p>
        ) : (
          <div className="space-y-3">
            {liveTickets.map((t) => (
              <TicketCard key={t.id} ticket={t} localeId={locale.id} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
