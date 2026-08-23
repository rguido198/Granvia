"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DiegoKPIs, DiegoTicket } from "@/lib/data/diego-tickets.server";
import type { LocaleOption } from "@/lib/data/tenant-portal.server";
import { NewTicketForm } from "@/components/hub/new-ticket-form";

function formatMxn(val: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(val);
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

function TicketCard({ ticket }: { ticket: DiegoTicket }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  return (
    <div className="p-4 rounded-xl border bg-white border-slate-200 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 text-xs font-sans">{ticket.ticketNumber}</span>
          <span className={"inline-block text-[10px] font-bold px-2 py-0.5 rounded-full " + STATUS_BADGE[ticket.status]}>
            {STATUS_LABEL[ticket.status]}
          </span>
          {ticket.priority && (
            <span className="text-[10px] font-bold text-slate-500 uppercase">{ticket.priority}</span>
          )}
        </div>
        <span className="text-[11px] text-slate-500">
          {ticket.propertyName} · Local {ticket.unitNumber}
        </span>
      </div>

      {ticket.showWatermark && (
        <div className="w-full rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] font-mono text-amber-900">
          [DRAFT — PENDING LANDLORD COUNSEL SIGN-OFF ON UNRESOLVED JURISDICTION KEYS: {ticket.unresolvedKeys.join(", ")}]
        </div>
      )}

      {ticket.skepticFlagged && ticket.skepticConcerns.length > 0 && (
        <div className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">
            Auditoría de Diego AI — dudas sin resolver
          </p>
          <ul className="space-y-1">
            {ticket.skepticConcerns.map((concern, i) => (
              <li key={i} className="text-[11px] text-red-800 leading-snug">
                · {concern}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-700">
        <strong>Reporte:</strong> &ldquo;{ticket.rawReport}&rdquo;
      </p>
      {ticket.diagnosis && (
        <p className="text-xs text-slate-700">
          <strong>Diagnóstico:</strong> {ticket.diagnosis}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="text-[11px] text-slate-500">
          {ticket.costBucket && <span>Responsabilidad: <strong>{ticket.costBucket}</strong> · </span>}
          {ticket.estimatedCost !== null && <span>{formatMxn(ticket.estimatedCost)}</span>}
          {ticket.contractorName && <span> · Contratista: {ticket.contractorName}</span>}
        </div>

        {ticket.status === "needs_approval" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => resolve(false)}
              disabled={submitting !== null}
              className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold px-3 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default"
            >
              {submitting === "reject" ? "Procesando…" : "Rechazar"}
            </button>
            <button
              onClick={() => resolve(true)}
              disabled={submitting !== null}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default"
            >
              {submitting === "approve" ? "Procesando…" : "Aprobar y Despachar"}
            </button>
          </div>
        )}
      </div>

      {errorMsg && <p className="text-[11px] text-red-600">{errorMsg}</p>}
    </div>
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
          <h3 className="font-sans text-base font-bold text-slate-900">Diego AI · Cola de Triage en Vivo</h3>
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

      <NewTicketForm localeOptions={localeOptions} sourceChannel="consola_propietario" />

      {tickets.length === 0 ? (
        <p className="text-xs text-slate-500">Sin tickets registrados todavía.</p>
      ) : (
        <div className="space-y-2.5">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
