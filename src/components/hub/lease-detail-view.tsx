"use client";

import Link from "next/link";
import { DocumentViewerButton } from "@/components/hub/legal-documents-panel";
import { formatSpanishDate } from "@/components/hub/lease-renewal-panel";
import { formatMxn, STATUS_LABEL as TICKET_STATUS_LABEL, STATUS_BADGE as TICKET_STATUS_BADGE, COST_BUCKET_LABEL } from "@/components/hub/diego-ticket-ui";
import { ESCALATION_METHOD_LABEL, type LeaseDetail, type LeaseClauseReviewStatus } from "@/lib/data/contract-status";
import type { DiegoTicket } from "@/lib/data/diego-tickets.server";

const RESPONSIBILITY_SYSTEMS = [
  ["hvac", "Clima / HVAC"],
  ["roof", "Techo / Impermeabilización"],
  ["plumbing", "Plomería"],
  ["electrical", "Instalación eléctrica"],
  ["storefront_glass", "Cristalería de fachada"],
] as const;

type NamedClauseKey =
  | "parkingClause"
  | "directoryAdvertisingClause"
  | "expansionOptionClause"
  | "extendedHoursClause"
  | "signageClause"
  | "petsClause"
  | "subleaseRestrictionClause"
  | "remodelingClause";

const NAMED_CLAUSES: { key: NamedClauseKey; label: string }[] = [
  { key: "parkingClause", label: "Estacionamiento" },
  { key: "directoryAdvertisingClause", label: "Publicidad en directorio" },
  { key: "expansionOptionClause", label: "Opción de expansión" },
  { key: "extendedHoursClause", label: "Horario extendido" },
  { key: "signageClause", label: "Señalización" },
  { key: "petsClause", label: "Mascotas" },
  { key: "subleaseRestrictionClause", label: "Restricción de subarriendo" },
  { key: "remodelingClause", label: "Remodelación" },
];

const CLAUSE_REVIEW_LABEL: Record<LeaseClauseReviewStatus, string> = {
  needs_counsel: "Requiere asesoría legal",
  awaiting_reading: "Pendiente de lectura",
  up_to_date: "Al día",
  ready_to_redo: "Lista para redactar de nuevo",
};

const CLAUSE_REVIEW_BADGE: Record<LeaseClauseReviewStatus, string> = {
  needs_counsel: "bg-red-50 text-red-800 border-red-200",
  awaiting_reading: "bg-amber-50 text-amber-900 border-amber-200",
  up_to_date: "bg-slate-100 text-ink-600 border-hairline",
  ready_to_redo: "bg-blue-50 text-blue-800 border-blue-200",
};

function GroupCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-hairline rounded-2xl p-4 sm:p-5 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-xs font-semibold text-ink-800 mt-0.5">{value}</dd>
    </div>
  );
}

function contractStatus(lease: LeaseDetail): { label: string; cls: string } {
  if (lease.isExpired) return { label: "Vencido", cls: "bg-red-50 text-red-800 border-red-200" };
  if (lease.renewalSoon) return { label: "Renovación Próxima", cls: "bg-amber-50 text-amber-900 border-amber-200" };
  return { label: "Vigente", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" };
}

function TicketCard({ ticket }: { ticket: DiegoTicket }) {
  return (
    <div className="border border-hairline rounded-xl p-3 bg-white space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-xs text-ink">{ticket.ticketNumber}</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${TICKET_STATUS_BADGE[ticket.status]}`}>
          {TICKET_STATUS_LABEL[ticket.status]}
        </span>
      </div>
      <p className="text-xs text-ink-700 leading-snug line-clamp-2">{ticket.rawReport}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500 font-medium">
        {ticket.costBucket && <span>{COST_BUCKET_LABEL[ticket.costBucket]}</span>}
        {ticket.estimatedCost !== null && <span>{formatMxn(ticket.estimatedCost)}</span>}
        <span>{formatSpanishDate(ticket.createdAt.slice(0, 10))}</span>
      </div>
    </div>
  );
}

export function LeaseDetailView({ lease, tickets }: { lease: LeaseDetail; tickets: DiegoTicket[] }) {
  const status = contractStatus(lease);
  const openTickets = tickets.filter((t) => t.status !== "closed" && t.status !== "closed_administrative");
  const closedTickets = tickets.filter((t) => t.status === "closed" || t.status === "closed_administrative");
  const flaggedClauses = lease.clauses.filter((c) => c.flagged || c.reviewStatus === "needs_counsel" || c.reviewStatus === "ready_to_redo");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{lease.unitCode} · {lease.sqm} m²</p>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">{lease.tradeName ?? lease.tenantEntity}</h1>
            {lease.tradeName && <p className="text-xs text-slate-500 font-medium">{lease.tenantEntity}</p>}
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${status.cls}`}>{status.label}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-hairline rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vigencia</p>
            <p className="text-sm font-extrabold text-slate-900">{formatSpanishDate(lease.startDate)} – {formatSpanishDate(lease.endDate)}</p>
          </div>
          <div className="bg-slate-50 border border-hairline rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Renta mensual</p>
            <p className="text-sm font-extrabold text-slate-900">{formatMxn(lease.rentMonthly)}</p>
          </div>
          <div className="bg-slate-50 border border-hairline rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Reclamos abiertos · Renovaciones</p>
            <p className="text-sm font-extrabold text-slate-900">
              {openTickets.length} · {lease.renewals.length}
            </p>
          </div>
        </div>
        {lease.sourceDocumentId && (
          <div>
            <DocumentViewerButton documentId={lease.sourceDocumentId} label="Ver contrato escaneado" />
          </div>
        )}
      </div>

      {/* Contrato */}
      <GroupCard title="Contrato">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Uso permitido" value={lease.permittedUse ?? "(no especificado)"} />
          <Field label="Exclusividad" value={lease.exclusiveUseClause ?? "Sin exclusividad"} />
          <Field
            label="Depósito en garantía"
            value={lease.securityDepositAmount !== null ? `${formatMxn(lease.securityDepositAmount)}${lease.securityDepositStatus ? ` — ${lease.securityDepositStatus}` : ""}` : "(sin registro)"}
          />
          <Field label="Días de aviso de terminación" value={lease.noticePeriodDays !== null ? `${lease.noticePeriodDays} días` : "(sin registro)"} />
          <Field
            label="Escalación vigente"
            value={
              lease.escalationPct !== null
                ? `${lease.escalationPct}% (${lease.escalationMethod ? ESCALATION_METHOD_LABEL[lease.escalationMethod] : "sin método registrado"})`
                : "(sin escalación en registro)"
            }
          />
          <Field label="Origen" value={lease.sourceApplicationNumber ? `Screening ${lease.sourceApplicationNumber} — Mariana IA` : "Registro directo"} />
        </div>

        {lease.responsibilityMatrix && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Matriz de responsabilidad de mantenimiento</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {RESPONSIBILITY_SYSTEMS.map(([key, label]) => {
                const value = lease.responsibilityMatrix?.[key];
                if (!value) return null;
                return (
                  <div key={key} className="bg-slate-50 border border-hairline rounded-lg px-2 py-1.5 text-center">
                    <p className="text-[10px] font-semibold text-ink-500">{label}</p>
                    <p className="text-xs font-bold text-ink capitalize">{value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {NAMED_CLAUSES.some(({ key }) => lease[key]) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {NAMED_CLAUSES.filter(({ key }) => lease[key]).map(({ key, label }) => (
              <Field key={key} label={label} value={lease[key]} />
            ))}
          </div>
        )}

        {lease.agentNotes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-900">
            <span className="font-bold">Nota de Mariana IA:</span> {lease.agentNotes}
          </div>
        )}
      </GroupCard>

      {/* Cláusulas — flags */}
      <GroupCard title={`Cláusulas del expediente${lease.clauses.length > 0 ? ` (${lease.clauses.length})` : ""}`}>
        {lease.clauses.length === 0 ? (
          <p className="text-xs text-ink-500 font-medium">Sin cláusulas digitalizadas para este contrato.</p>
        ) : (
          <>
            {flaggedClauses.length > 0 && (
              <p className="text-xs font-bold text-red-700">{flaggedClauses.length} cláusula{flaggedClauses.length === 1 ? "" : "s"} marcada{flaggedClauses.length === 1 ? "" : "s"}.</p>
            )}
            <div className="divide-y divide-hairline">
              {lease.clauses.map((c) => (
                <div key={c.id} className="py-2 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-ink-700">
                      {c.clauseLabel} {c.flagged && <span className="text-red-600">⚑</span>}
                    </p>
                    <p className="text-xs text-ink-600 leading-snug line-clamp-2">{c.clauseText}</p>
                    {c.agentNote && <p className="text-[11px] text-ink-500 italic mt-0.5">{c.agentNote}</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${CLAUSE_REVIEW_BADGE[c.reviewStatus]}`}>
                    {CLAUSE_REVIEW_LABEL[c.reviewStatus]}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </GroupCard>

      {/* Historial de renta — honestly scoped: this tracks recorded rent
          CHANGES (escalations), not an actual paid/unpaid collections
          ledger. No invoicing/collections table exists in this schema yet
          (rent_due_notifier has no working code — see real-estate
          claude.md) — labeled accordingly rather than implying it. */}
      <GroupCard title="Historial de renta">
        {lease.rentHistory.length === 0 ? (
          <p className="text-xs text-ink-500 font-medium">
            Sin cambios de renta registrados desde que este historial empezó a capturarse (3 sep 2026). Renta actual: {formatMxn(lease.rentMonthly)}.
          </p>
        ) : (
          <div className="divide-y divide-hairline">
            {lease.rentHistory.map((r, i) => (
              <div key={i} className="py-2 flex items-center justify-between gap-3 text-xs">
                <span className="text-ink-500 font-medium">{formatSpanishDate(r.changedAt)}</span>
                <span className="font-bold text-ink">
                  {r.oldRent !== null ? formatMxn(r.oldRent) : "(sin registro)"} → {formatMxn(r.newRent)}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-ink-400 font-medium">
          Este historial registra cambios en la renta contratada, no cobranza — Gran Vía no tiene todavía un módulo de facturación/cobranza en producción.
        </p>
      </GroupCard>

      {/* Reclamos de mantenimiento — Diego IA */}
      <GroupCard title={`Reclamos de mantenimiento${tickets.length > 0 ? ` (${tickets.length})` : ""}`}>
        {tickets.length === 0 ? (
          <p className="text-xs text-ink-500 font-medium">Sin tickets de mantenimiento registrados para este local.</p>
        ) : (
          <>
            <div className="space-y-2">
              {openTickets.length === 0 ? (
                <p className="text-xs text-ink-500 font-medium">Sin reclamos abiertos.</p>
              ) : (
                openTickets.map((t) => <TicketCard key={t.id} ticket={t} />)
              )}
            </div>
            {closedTickets.length > 0 && (
              <details className="pt-1">
                <summary className="text-xs font-bold text-ink-600 cursor-pointer">Historial cerrado ({closedTickets.length})</summary>
                <div className="space-y-2 mt-2">
                  {closedTickets.map((t) => (
                    <TicketCard key={t.id} ticket={t} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </GroupCard>

      {/* Renovaciones — each draft has its own full diff page now */}
      {lease.renewals.length > 0 && (
        <GroupCard title={`Renovaciones (${lease.renewals.length})`}>
          <div className="divide-y divide-hairline">
            {lease.renewals.map((r) => (
              <div key={r.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-ink">{r.renewalNumber}</p>
                  <p className="text-[11px] text-ink-500 font-medium">{formatSpanishDate(r.createdAt.slice(0, 10))}</p>
                </div>
                <Link href={`/consola/renovaciones/${r.id}`} className="text-xs font-bold text-[var(--console-accent)] hover:underline">
                  Ver comparativo →
                </Link>
              </div>
            ))}
          </div>
        </GroupCard>
      )}
    </div>
  );
}
