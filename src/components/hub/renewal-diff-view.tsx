"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LegalDraftMarkdown } from "@/components/hub/legal-draft-markdown";
import { formatMxn, formatSpanishDate } from "@/components/hub/lease-renewal-panel";
import { downloadBlob, generateContractPdf } from "@/lib/mock-pdf";
import { requestRenewalChangesAction } from "@/lib/data/lease-renewal-actions";
import type { LeaseDetail } from "@/lib/data/contract-status";
import type { RenewalVersion } from "@/lib/data/renewal-detail.server";

const STATUS_BADGE: Record<RenewalVersion["status"], { label: string; cls: string }> = {
  needs_landlord_review: { label: "Pendiente de aprobación", cls: "bg-amber-50 text-amber-900 border-amber-200" },
  approved: { label: "Autorizada por arrendador", cls: "bg-emerald-50 text-emerald-900 border-emerald-200" },
  rejected: { label: "Rechazada", cls: "bg-slate-100 text-slate-600 border-hairline" },
};

/** Attribution line for a row this renewal actually changed — the same
 *  "Valeria AI" / "Mariana AI" distinction Valeria's own inline diff card
 *  already draws in landlord-dashboard.tsx, promoted to every changed row
 *  here rather than left to a chat bubble that scrolls out of view. */
function changedByLabel(version: RenewalVersion): string {
  if (version.lastEditedBy === "valeria_ai") {
    return version.lastEditedReasoning ? `Valeria AI — ${version.lastEditedReasoning}` : "Valeria AI — ajuste solicitado por el arrendador";
  }
  return "Mariana AI — borrador inicial";
}

function DiffRow({
  label,
  oldValue,
  newValue,
  citation,
  changed,
}: {
  label: string;
  oldValue: string;
  /** Omitted for a row that carries forward unchanged — nothing to show on
   *  the right, the left value just renders without strike-through. */
  newValue?: string;
  citation: string;
  changed: boolean;
}) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5 ${changed ? "" : "opacity-70"}`}>
      <span className="text-xs font-bold text-ink-700 w-40 shrink-0">{label}</span>
      <div className="flex-1 min-w-[14rem] text-xs">
        {changed && newValue !== undefined ? (
          <p className="font-medium text-ink-700">
            <span className="line-through text-ink-400">{oldValue}</span>{" "}
            <span aria-hidden="true">→</span> <span className="font-bold text-ink">{newValue}</span>
          </p>
        ) : (
          <p className="font-medium text-ink-600">{oldValue}</p>
        )}
        <p className="text-[10px] text-ink-400 font-semibold uppercase tracking-wider mt-0.5">{citation}</p>
      </div>
    </div>
  );
}

function GroupCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-hairline rounded-2xl p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
      <div className="divide-y divide-hairline">{children}</div>
    </div>
  );
}

/** The clause ledger's clause_number is a 1-based position in the source
 *  document's extracted special_clauses array at digitization time, not a
 *  literal numbered clause in the contract itself (see lease_clauses
 *  migration) — cited as "expediente digitalizado", not "cláusula N del
 *  contrato", so this never implies a legal clause number the source
 *  document may not actually carry. */
function clauseCitation(clauseNumber: number): string {
  return `Sin cambios — heredada del contrato vigente (posición ${clauseNumber} del expediente digitalizado)`;
}

function RequestChangesForm({ renewalId, onDone }: { renewalId: string; onDone: () => void }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await requestRenewalChangesAction(renewalId, feedback);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <div className="space-y-2 bg-slate-50 border border-hairline rounded-xl p-3">
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Qué necesitas que cambie este borrador antes de aprobarlo…"
        rows={2}
        className="w-full text-xs border border-hairline rounded-lg px-2.5 py-2 resize-none"
      />
      {error && <p className="text-[11px] font-bold text-red-700">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="bg-ink text-white px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Enviar comentario"}
        </button>
        <button type="button" onClick={onDone} className="text-ink-600 font-bold text-xs cursor-pointer">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function RejectForm({ onConfirm, onCancel, pending }: { onConfirm: (reason: string) => void; onCancel: () => void; pending: boolean }) {
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-2 bg-slate-50 border border-hairline rounded-xl p-3">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo del rechazo (opcional, pero ayuda a la siguiente propuesta)…"
        rows={2}
        className="w-full text-xs border border-hairline rounded-lg px-2.5 py-2 resize-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onConfirm(reason)}
          className="bg-red-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
        >
          {pending ? "Rechazando…" : "Confirmar rechazo"}
        </button>
        <button type="button" onClick={onCancel} className="text-ink-600 font-bold text-xs cursor-pointer">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function RenewalDiffView({
  lease,
  versions,
  initialRenewalId,
}: {
  lease: LeaseDetail;
  /** Oldest first (v1 → vN). */
  versions: RenewalVersion[];
  initialRenewalId: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialRenewalId);
  const selected = versions.find((v) => v.id === selectedId) ?? versions[versions.length - 1];

  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState<"form" | "pending" | null>(null);
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const pctChange = useMemo(() => {
    if (!selected.currentBaseRentMonthly || selected.currentBaseRentMonthly <= 0) return null;
    return (((selected.newBaseRentMonthly - selected.currentBaseRentMonthly) / selected.currentBaseRentMonthly) * 100).toFixed(1);
  }, [selected]);

  const annualDelta = selected.currentBaseRentMonthly !== null ? (selected.newBaseRentMonthly - selected.currentBaseRentMonthly) * 12 : null;

  async function resolve(approved: boolean, rejectionReason?: string) {
    if (approved) setApproving(true);
    else setRejecting("pending");
    setActionError(null);
    try {
      const res = await fetch("/api/workflow/approve-lease-renewal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renewalId: selected.id, approved, rejectionReason }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(json.error ?? "No se pudo registrar la decisión.");
        return;
      }
      router.refresh();
    } finally {
      setApproving(false);
      setRejecting(null);
    }
  }

  function downloadPdf() {
    const blob = generateContractPdf({
      documentTitle: "CONVENIO MODIFICATORIO DE ARRENDAMIENTO COMERCIAL",
      subtitle: "PLAZA COMERCIAL LIFESTYLE LA GRAN VÍA — MEXICALI, BAJA CALIFORNIA",
      tenantEntity: lease.tenantEntity,
      tradeName: lease.tradeName,
      unitCode: lease.unitCode,
      sqm: lease.sqm,
      currentEndDate: selected.currentEndDate,
      newStartDate: selected.newStartDate,
      newEndDate: selected.newEndDate,
      currentRent: selected.currentBaseRentMonthly !== null ? formatMxn(selected.currentBaseRentMonthly) : "(sin registro)",
      newRent: formatMxn(selected.newBaseRentMonthly),
      escalationPct: selected.escalationPct !== null ? `${selected.escalationPct}%` : selected.escalationMethod,
      clausesMarkdown: selected.draftMarkdown,
    });
    downloadBlob(blob, `convenio_modificatorio_${selected.renewalNumber.replace(/\s+/g, "_")}.pdf`);
  }

  const badge = STATUS_BADGE[selected.status];
  const canAct = selected.isLatest && selected.status === "needs_landlord_review";

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {lease.unitCode} · Propuesta {selected.renewalNumber}
            </p>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">{lease.tradeName ?? lease.tenantEntity}</h1>
            {lease.tradeName && <p className="text-xs text-slate-500 font-medium">{lease.tenantEntity}</p>}
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${badge.cls}`}>{badge.label}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-hairline rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vigencia</p>
            <p className="text-sm font-extrabold text-slate-900">
              {formatSpanishDate(selected.currentEndDate)} → {formatSpanishDate(selected.newStartDate)}–{formatSpanishDate(selected.newEndDate)}
            </p>
          </div>
          <div className="bg-slate-50 border border-hairline rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Renta mensual — Δ anual</p>
            <p className="text-sm font-extrabold text-slate-900">
              {formatMxn(selected.newBaseRentMonthly)}
              {pctChange && <span className="text-emerald-700 font-bold"> ({Number(pctChange) > 0 ? "+" : ""}{pctChange}%)</span>}
              {annualDelta !== null && (
                <span className="text-slate-500 font-semibold"> · {annualDelta >= 0 ? "+" : ""}{formatMxn(annualDelta)}/año</span>
              )}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 font-medium">
          Propuesto por Mariana AI · {formatSpanishDate(selected.createdAt.slice(0, 10))}
          {/* Who actually clicked Aprobar/Rechazar, and when — root
           *  claude.md's #4 frontend priority ("agent trace / audit"): the
           *  human half of a defensible approval record, alongside the
           *  draft's own clause citations and skeptic concerns below. */}
          {selected.reviewedByName && (
            <>
              {" · "}
              {selected.status === "approved" ? "Aprobado" : "Rechazado"} por {selected.reviewedByName}
              {selected.reviewedAt ? ` · ${formatSpanishDate(selected.reviewedAt.slice(0, 10))}` : ""}
            </>
          )}
        </p>
      </div>

      {/* Version selector */}
      {versions.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {versions.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedId(v.id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                v.id === selected.id
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-ink-600 border-hairline hover:bg-slate-50"
              }`}
            >
              v{v.version} {v.status === "rejected" ? "rechazada" : v.isLatest ? "actual" : STATUS_BADGE[v.status].label.toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {selected.status === "rejected" && selected.rejectionReason && (
        <div className="bg-slate-50 border border-hairline rounded-xl px-4 py-3 text-xs text-slate-700">
          <span className="font-bold">Motivo del rechazo:</span> &ldquo;{selected.rejectionReason}&rdquo;
        </div>
      )}
      {selected.landlordFeedback && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-900">
          <span className="font-bold">Comentarios del arrendador:</span> &ldquo;{selected.landlordFeedback}&rdquo;
        </div>
      )}
      {selected.skepticFlagged && selected.skepticConcerns.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-900 space-y-1">
          <p className="font-bold">Revisión de Mariana IA marcó posibles inconsistencias:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {selected.skepticConcerns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Diff groups */}
      <GroupCard title="Economía">
        <DiffRow
          label="Renta base mensual"
          oldValue={selected.currentBaseRentMonthly !== null ? formatMxn(selected.currentBaseRentMonthly) : "(sin registro)"}
          newValue={formatMxn(selected.newBaseRentMonthly)}
          changed
          citation={changedByLabel(selected)}
        />
        <DiffRow
          label="Escalación"
          oldValue={lease.escalationPct !== null ? `${lease.escalationPct}% (${lease.escalationMethod ?? "contrato vigente"})` : "(sin escalación en registro)"}
          newValue={`${selected.escalationPct !== null ? `${selected.escalationPct}%` : selected.escalationMethod} (${selected.escalationMethod})`}
          changed
          citation={changedByLabel(selected)}
        />
        <DiffRow
          label="Depósito en garantía"
          oldValue={
            lease.securityDepositAmount !== null
              ? `${formatMxn(lease.securityDepositAmount)}${lease.securityDepositStatus ? ` — ${lease.securityDepositStatus}` : ""}`
              : "(sin registro)"
          }
          changed={false}
          citation="Sin cambios — heredado del contrato vigente"
        />
      </GroupCard>

      <GroupCard title="Vigencia">
        <DiffRow
          label="Vencimiento"
          oldValue={formatSpanishDate(selected.currentEndDate)}
          newValue={`${formatSpanishDate(selected.newStartDate)} – ${formatSpanishDate(selected.newEndDate)}`}
          changed
          citation={changedByLabel(selected)}
        />
      </GroupCard>

      <GroupCard title="Cláusulas">
        {lease.exclusiveUseClause && (
          <DiffRow label="Exclusividad" oldValue={lease.exclusiveUseClause} changed={false} citation="Sin cambios — heredada del contrato vigente" />
        )}
        {lease.permittedUse && (
          <DiffRow label="Uso permitido" oldValue={lease.permittedUse} changed={false} citation="Sin cambios — heredado del contrato vigente" />
        )}
        {lease.clauses.length > 0 ? (
          lease.clauses.map((c) => (
            <DiffRow key={c.id} label={c.clauseLabel} oldValue={c.clauseText} changed={false} citation={clauseCitation(c.clauseNumber)} />
          ))
        ) : (
          !lease.exclusiveUseClause &&
          !lease.permittedUse && <p className="text-xs text-ink-500 font-medium py-2">Sin cláusulas digitalizadas para este contrato.</p>
        )}
      </GroupCard>

      {/* Full draft text */}
      <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-slate-900">Texto del Convenio Modificatorio</p>
          <button
            type="button"
            onClick={downloadPdf}
            className="bg-slate-900 text-white px-3.5 py-2 rounded-xl font-bold text-xs hover:bg-slate-800 cursor-pointer"
          >
            Descargar PDF
          </button>
        </div>
        <div className="text-sm bg-slate-50 border border-hairline rounded-2xl p-5 max-h-[40vh] overflow-y-auto font-sans leading-relaxed text-slate-900">
          <LegalDraftMarkdown markdown={selected.draftMarkdown} />
        </div>
      </div>

      {actionError && <p className="text-sm font-bold text-red-700 bg-red-50 p-3 rounded-xl">{actionError}</p>}

      {/* Sticky action footer — only on the latest, still-pending version. A
          historical version (rejected, superseded, or already approved) is
          read-only: nothing here to decide anymore. */}
      {canAct && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-hairline shadow-2xl z-40">
          <div className="max-w-5xl mx-auto p-3 sm:p-4 space-y-2">
            {requestingChanges ? (
              <RequestChangesForm renewalId={selected.id} onDone={() => setRequestingChanges(false)} />
            ) : rejecting === "form" ? (
              <RejectForm onConfirm={(reason) => resolve(false, reason || undefined)} onCancel={() => setRejecting(null)} pending={false} />
            ) : (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={approving}
                  onClick={() => resolve(true)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50"
                >
                  {approving ? "Procesando…" : "✓ Aprobar renovación"}
                </button>
                <button
                  type="button"
                  onClick={() => setRequestingChanges(true)}
                  className="border border-hairline bg-white hover:bg-slate-50 text-slate-900 px-3.5 py-2.5 rounded-xl font-bold text-sm cursor-pointer"
                >
                  Solicitar cambios
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting("form")}
                  className="text-slate-500 hover:text-red-700 font-semibold text-sm px-3 py-2.5 cursor-pointer"
                >
                  Rechazar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
