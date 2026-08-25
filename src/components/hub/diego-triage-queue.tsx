"use client";

import { useCallback, useState } from "react";
import type { DiegoKPIs, DiegoTicket } from "@/lib/data/diego-tickets.server";
import type { LocaleOption } from "@/lib/data/tenant-portal.server";
import { NewTicketForm } from "@/components/hub/new-ticket-form";
import { InviteTenantForm } from "@/components/hub/invite-tenant-form";
import { DiegoTicketDrawer } from "@/components/hub/diego-ticket-drawer";
import {
  PRIORITY_BADGE,
  STATUS_BADGE,
  STATUS_LABEL,
  formatMxn,
  shortTenantName,
  useResolveTicket,
} from "@/components/hub/diego-ticket-ui";

function TicketRow({ ticket, onOpen }: { ticket: DiegoTicket; onOpen: () => void }) {
  const { submitting, errorMsg, resolve } = useResolveTicket(ticket.id);

  // The row carries the summary; the drawer carries the full text. Truncating
  // here is safe precisely because one click opens the verbatim report.
  const reportExcerpt =
    ticket.rawReport.length > 100 ? ticket.rawReport.slice(0, 100).trimEnd() + "…" : ticket.rawReport;

  return (
    <>
      <tr
        onClick={onOpen}
        className="cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
      >
        {/* Ticket number + priority only — draft and audit flags moved to Estado
            so the primary identifier cell stays scannable. */}
        <td className="px-4 py-3.5 align-top">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-900 text-xs">{ticket.ticketNumber}</span>
            {ticket.priority && (
              <span
                className={
                  "rounded-full px-1.5 py-0.5 text-[9px] font-bold " + PRIORITY_BADGE[ticket.priority]
                }
              >
                {ticket.priority}
              </span>
            )}
          </div>
        </td>
        <td
          className="px-4 py-3.5 align-top text-[11px] leading-relaxed text-slate-700 min-w-[150px]"
          title={ticket.tenantEntity ?? undefined}
        >
          {ticket.tenantEntity ? shortTenantName(ticket.tenantEntity) : "—"}
        </td>
        {/* Widest column on purpose — the tenant's own report is what a landlord
            triages from. Diego's diagnosis lives in the drawer, not repeated here
            in low-contrast grey under the line it paraphrases. */}
        <td className="px-4 py-3.5 align-top text-[11px] min-w-[280px]">
          <p className="text-slate-800 leading-relaxed" title={ticket.rawReport}>
            {reportExcerpt}
          </p>
        </td>
        <td className="px-4 py-3.5 align-top text-[11px] font-semibold text-slate-700 text-right whitespace-nowrap">
          {ticket.estimatedCost !== null ? formatMxn(ticket.estimatedCost) : "—"}
        </td>
        {/* Status column also carries the draft/audit flags — they qualify the
            state of the ticket, so they belong next to the state. */}
        <td className="px-4 py-3.5 align-top">
          <span
            className={
              "inline-block text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap " +
              STATUS_BADGE[ticket.status]
            }
          >
            {STATUS_LABEL[ticket.status]}
          </span>
          {(ticket.showWatermark || (ticket.skepticFlagged && ticket.skepticConcerns.length > 0)) && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              {ticket.showWatermark && (
                <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5">
                  Draft
                </span>
              )}
              {ticket.skepticFlagged && ticket.skepticConcerns.length > 0 && (
                <span
                  className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5"
                  title={
                    ticket.skepticConcerns.length +
                    (ticket.skepticConcerns.length === 1 ? " duda sin resolver" : " dudas sin resolver")
                  }
                >
                  ⚠ {ticket.skepticConcerns.length}
                </span>
              )}
            </div>
          )}
        </td>
        <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
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
            <span className="text-[11px] text-slate-400" title="Ver expediente completo">
              ›
            </span>
          )}
        </td>
      </tr>

      {errorMsg && (
        <tr className="border-b border-slate-100 last:border-b-0">
          <td colSpan={6} className="px-4 pb-2 pt-0 text-[11px] text-red-600">
            {errorMsg}
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
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Stable identity so the drawer's Escape-key listener subscribes once rather
  // than tearing down and re-adding on every parent render.
  const closeDrawer = useCallback(() => setSelectedTicketId(null), []);

  // Track by id, not by object: router.refresh() replaces the ticket objects,
  // and the open drawer should follow the row's new state, not go stale.
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Diego IA · Cola de Triage en Vivo</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisión y gestión de reportes de mantenimiento en tiempo real.
          </p>
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
                <th className="px-4 py-2.5 font-bold text-right">Costo</th>
                <th className="px-4 py-2.5 font-bold">Estado</th>
                <th className="px-4 py-2.5 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  onOpen={() => setSelectedTicketId(ticket.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTicket && (
        <DiegoTicketDrawer
          key={selectedTicket.id}
          ticket={selectedTicket}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}
