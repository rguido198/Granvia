"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DiegoKPIs, DiegoTicket } from "@/lib/data/diego-tickets.server";
import type { LocaleOption } from "@/lib/data/tenant-portal.server";
import { NewTicketForm } from "@/components/hub/new-ticket-form";
import { InviteTenantForm } from "@/components/hub/invite-tenant-form";

function formatMxn(val: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(val);
}

// The corporate suffix matters on a contract, not for picking a tenant out
// of a triage list — trimmed for display only, the underlying name is untouched.
const CORPORATE_SUFFIX_RE = /,?\s*(S\.?A\.?P\.?I\.?|S\.?A\.?|S\.?\s*de\s*R\.?L\.?)\s*(de\s*C\.?V\.?)?\.?\s*$/i;
function shortTenantName(fullName: string) {
  const trimmed = fullName.replace(CORPORATE_SUFFIX_RE, "").trim();
  return trimmed || fullName;
}

const STATUS_LABEL: Record<DiegoTicket["status"], string> = {
  pending_triage: "Pendiente de Triage",
  pending_diagnosis: "En Diagnóstico",
  pending_warranty_check: "Verificando Garantía",
  pending_cost_attribution: "Atribuyendo Costo",
  pending_skeptic: "En Auditoría",
  needs_approval: "Requiere Aprobación",
  dispatched: "Despachado",
  pending_confirmation: "Pendiente de Confirmación",
  closed: "Cerrado",
  closed_administrative: "Cerrado (Administrativo)",
};

const STATUS_BADGE: Record<DiegoTicket["status"], string> = {
  pending_triage: "bg-slate-100 text-slate-700 border border-slate-200",
  pending_diagnosis: "bg-slate-100 text-slate-700 border border-slate-200",
  pending_warranty_check: "bg-slate-100 text-slate-700 border border-slate-200",
  pending_cost_attribution: "bg-slate-100 text-slate-700 border border-slate-200",
  pending_skeptic: "bg-slate-100 text-slate-700 border border-slate-200",
  needs_approval: "bg-amber-100 text-amber-900 border border-amber-300",
  dispatched: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  pending_confirmation: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  closed: "bg-slate-100 text-slate-500 border border-slate-200",
  closed_administrative: "bg-slate-100 text-slate-500 border border-slate-200",
};

function TicketRow({ ticket }: { ticket: DiegoTicket }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [rowExpanded, setRowExpanded] = useState(false);

  async function resolve(approved: boolean) {
    setSubmitting(approved ? "approve" : "reject");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/workflow/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, approved }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "HTTP " + res.status);
      }
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al resolver el ticket");
      setSubmitting(null);
    }
  }

  const reportExcerpt =
    ticket.rawReport.length > 100 ? ticket.rawReport.slice(0, 100).trimEnd() + "…" : ticket.rawReport;
  const diagnosisExcerpt =
    ticket.diagnosis && ticket.diagnosis.length > 100
      ? ticket.diagnosis.slice(0, 100).trimEnd() + "…"
      : ticket.diagnosis;

  return (
    <>
      <tr
        onClick={() => setRowExpanded((v) => !v)}
        className="cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
      >
        <td className="px-4 py-3 align-top">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-900 text-xs">{ticket.ticketNumber}</span>
            {ticket.priority && (
              <span className="text-[10px] font-bold text-slate-500 uppercase">{ticket.priority}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {ticket.showWatermark && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5">
                Draft
              </span>
            )}
            {ticket.skepticFlagged && ticket.skepticConcerns.length > 0 && (
              <span className="text-[10px] font-bold text-red-600">⚠ {ticket.skepticConcerns.length}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 align-top text-[11px] text-slate-600 max-w-[130px] truncate" title={ticket.tenantEntity ?? undefined}>
          {ticket.tenantEntity ? shortTenantName(ticket.tenantEntity) : "—"}
        </td>
        {/* Widest column on purpose — the report (and, once diagnosed, Diego's
            read on it) is what a landlord actually needs to triage from, not
            metadata like tenant or location. */}
        <td className="px-4 py-3 align-top text-[11px] min-w-[280px]">
          <p className="text-slate-700" title={ticket.rawReport}>{reportExcerpt}</p>
          {diagnosisExcerpt && (
            <p className="text-slate-500 mt-1" title={ticket.diagnosis ?? undefined}>
              <span className="font-semibold text-slate-600">Diagnóstico:</span> {diagnosisExcerpt}
            </p>
          )}
        </td>
        <td className="px-4 py-3 align-top text-[11px] text-slate-500 whitespace-nowrap">
          Local {ticket.unitNumber}
        </td>
        <td className="px-4 py-3 align-top text-[11px] font-semibold text-slate-700 text-right whitespace-nowrap">
          {ticket.estimatedCost !== null ? formatMxn(ticket.estimatedCost) : "—"}
        </td>
        {/* Status gets its own dedicated, fixed-width column — not squeezed among the
            priority/draft/warning flags — so it reads clearly at any row's glance. */}
        <td className="px-4 py-3 align-top">
          <span className={"inline-block text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap " + STATUS_BADGE[ticket.status]}>
            {STATUS_LABEL[ticket.status]}
          </span>
        </td>
        <td className="px-4 py-3 align-top text-right whitespace-nowrap">
          {ticket.status === "needs_approval" ? (
            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => resolve(false)}
                disabled={submitting !== null}
                title="Rechazar"
                className="bg-white hover:bg-[var(--console-accent-soft)] text-[var(--console-accent)] border border-[var(--console-accent)] font-bold w-7 h-7 rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default"
              >
                {submitting === "reject" ? "…" : "✕"}
              </button>
              <button
                onClick={() => resolve(true)}
                disabled={submitting !== null}
                title="Aprobar y Despachar"
                className="bg-ink hover:bg-ink-700 text-white font-bold w-7 h-7 rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default"
              >
                {submitting === "approve" ? "…" : "✓"}
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">{rowExpanded ? "▴" : "▾"}</span>
          )}
        </td>
      </tr>

      {errorMsg && (
        <tr className="border-b border-slate-100 last:border-b-0">
          <td colSpan={7} className="px-4 pb-2 pt-0 text-[11px] text-red-600">
            {errorMsg}
          </td>
        </tr>
      )}

      {rowExpanded && (
        <tr className="border-b border-slate-100 last:border-b-0">
          <td colSpan={7} className="px-4 pb-4 pt-1 bg-slate-50/60">
            <div className="space-y-2.5">
              {ticket.showWatermark && (
                <div className="w-full rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] font-mono text-amber-900">
                  [DRAFT — PENDING LANDLORD COUNSEL SIGN-OFF ON UNRESOLVED JURISDICTION KEYS: {ticket.unresolvedKeys.join(", ")}]
                </div>
              )}

              {ticket.skepticFlagged && ticket.skepticConcerns.length > 0 && (
                auditExpanded ? (
                  <div className="w-full rounded-lg border border-slate-200 border-l-2 border-l-red-400 bg-white px-3 py-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-slate-700">
                        Auditoría de Diego IA — dudas sin resolver
                      </p>
                      <button
                        type="button"
                        onClick={() => setAuditExpanded(false)}
                        className="cursor-pointer text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                      >
                        Ocultar detalle ▴
                      </button>
                    </div>
                    <ul className="space-y-1">
                      {ticket.skepticConcerns.map((concern, i) => (
                        <li key={i} className="text-[11px] text-slate-700 leading-snug">
                          · {concern}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAuditExpanded(true)}
                    className="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-200 border-l-2 border-l-red-400 bg-white px-3 py-2 text-left cursor-pointer hover:bg-slate-100"
                  >
                    <span className="text-[11px] font-medium text-slate-700">
                      ⚠ {ticket.skepticConcerns.length} {ticket.skepticConcerns.length === 1 ? "duda sin resolver" : "dudas sin resolver"}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">Ver detalle ▾</span>
                  </button>
                )
              )}

              {/* The row's own cell already shows Reporte + Diagnóstico — repeat
                  them here only when the row's excerpt actually cut something
                  off, so expanding isn't just re-reading what's already visible. */}
              {ticket.rawReport.length > 100 && (
                <p className="text-xs text-slate-700">
                  <strong>Reporte completo:</strong> &ldquo;{ticket.rawReport}&rdquo;
                </p>
              )}
              {ticket.diagnosis && ticket.diagnosis.length > 100 && (
                <p className="text-xs text-slate-700">
                  <strong>Diagnóstico completo:</strong> {ticket.diagnosis}
                </p>
              )}

              {(ticket.costBucket || ticket.contractorName) && (
                <div className="text-[11px] text-slate-500">
                  {ticket.costBucket && <span>Responsabilidad: <strong>{ticket.costBucket}</strong></span>}
                  {ticket.contractorName && <span> · Contratista: {ticket.contractorName}</span>}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function DiegoTriageQueue({
  tickets,
  kpis,
  localeOptions,
}: {
  tickets: DiegoTicket[];
  kpis: DiegoKPIs;
  localeOptions: LocaleOption[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Diego IA · Cola de Triage en Vivo</h3>
          <p className="text-xs text-slate-500 mt-0.5">Tickets leídos en tiempo real desde Supabase — no son datos ilustrativos.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-lg border border-slate-200">
            {kpis.totalActiveTickets} Activos
          </span>
          <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-lg border border-amber-300">
            {kpis.pendingApprovalsCount} Requieren Aprobación
          </span>
          <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-lg border border-slate-200">
            {formatMxn(kpis.dispatchedCostInFlight)} en Curso
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <NewTicketForm localeOptions={localeOptions} sourceChannel="consola_propietario" />
        <InviteTenantForm localeOptions={localeOptions} />
      </div>

      {tickets.length === 0 ? (
        <p className="text-xs text-slate-500">Sin tickets registrados todavía.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-bold">Ticket</th>
                <th className="px-4 py-2.5 font-bold">Inquilino</th>
                <th className="px-4 py-2.5 font-bold">Reporte</th>
                <th className="px-4 py-2.5 font-bold">Ubicación</th>
                <th className="px-4 py-2.5 font-bold text-right">Costo</th>
                <th className="px-4 py-2.5 font-bold">Estado</th>
                <th className="px-4 py-2.5 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
