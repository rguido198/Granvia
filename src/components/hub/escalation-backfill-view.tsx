"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMxn } from "@/components/hub/diego-ticket-ui";
import { ESCALATION_METHOD_LABEL, type EscalationMethod } from "@/lib/data/contract-status";
import type { EscalationBackfillCandidate, EscalationBackfillData } from "@/lib/data/escalation-backfill.server";
import {
  bulkConfirmSuggestedEscalationsAction,
  confirmEscalationScheduleAction,
  confirmNoEscalationAction,
} from "@/lib/data/escalation-backfill-actions";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

function CandidateRow({ candidate }: { candidate: EscalationBackfillCandidate }) {
  const router = useRouter();
  const [pct, setPct] = useState(candidate.suggestedPct !== null ? String(candidate.suggestedPct) : "");
  const [month, setMonth] = useState(candidate.suggestedMonth);
  const [method, setMethod] = useState<EscalationMethod>(candidate.suggestedPct !== null ? "fixed_pct" : "landlord_specified");
  const [submitting, setSubmitting] = useState<"confirm" | "none" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleConfirm() {
    const pctNum = Number(pct);
    if (!Number.isFinite(pctNum) || pctNum <= 0) {
      setErrorMsg("Ingresa un porcentaje válido");
      return;
    }
    setSubmitting("confirm");
    setErrorMsg(null);
    const result = await confirmEscalationScheduleAction(candidate.leaseRowId, month, pctNum, method);
    setSubmitting(null);
    if (result.error) {
      setErrorMsg(result.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  async function handleNoEscalation() {
    setSubmitting("none");
    setErrorMsg(null);
    const result = await confirmNoEscalationAction(candidate.leaseRowId);
    setSubmitting(null);
    if (result.error) {
      setErrorMsg(result.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="border border-hairline rounded-xl p-3.5 bg-emerald-50/60 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-emerald-800">
          {candidate.tradeName ?? candidate.tenantEntity} ({candidate.unitCode}) — confirmado
        </p>
        <Link href={`/consola/locales/${candidate.localeId}`} className="text-xs font-bold text-emerald-700 hover:underline shrink-0">
          Ver contrato →
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-hairline rounded-xl p-3.5 space-y-3 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-ink text-sm">{candidate.tradeName ?? candidate.tenantEntity}</p>
          <p className="text-xs text-ink-500 font-medium">
            {candidate.unitCode} · {formatMxn(candidate.rentMonthly)}/mes · vigente desde {candidate.startDate}
          </p>
        </div>
        <Link href={`/consola/locales/${candidate.localeId}`} className="text-xs font-bold text-[var(--console-accent)] hover:underline shrink-0">
          Ver →
        </Link>
      </div>

      <div className="bg-slate-50 border border-hairline rounded-lg p-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Evidencia del contrato</p>
        {candidate.suggestedClauseText ? (
          <p className="text-xs text-ink-700 italic">&ldquo;{candidate.suggestedClauseText}&rdquo;</p>
        ) : (
          <p className="text-xs text-ink-500">Sin cláusula de escalación detectada — confirma manualmente o marca sin escalación.</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">% Anual</span>
          <input
            type="number"
            step="0.01"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            disabled={submitting !== null}
            className="w-full bg-white border border-hairline-strong rounded px-1.5 py-1 text-sm font-medium text-ink focus:border-[var(--console-accent)] focus:outline-none disabled:opacity-50"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">Mes (aniversario)</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            disabled={submitting !== null}
            className="w-full bg-white border border-hairline-strong rounded px-1.5 py-1 text-sm font-medium text-ink focus:border-[var(--console-accent)] focus:outline-none disabled:opacity-50"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">Método</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as EscalationMethod)}
            disabled={submitting !== null}
            className="w-full bg-white border border-hairline-strong rounded px-1.5 py-1 text-sm font-medium text-ink focus:border-[var(--console-accent)] focus:outline-none disabled:opacity-50"
          >
            <option value="fixed_pct">{ESCALATION_METHOD_LABEL.fixed_pct}</option>
            <option value="landlord_specified">{ESCALATION_METHOD_LABEL.landlord_specified}</option>
          </select>
        </label>
      </div>

      {errorMsg && <p className="text-xs font-bold text-red-700">{errorMsg}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting !== null}
          className="bg-ink hover:bg-ink-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
        >
          {submitting === "confirm" ? "Guardando…" : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={handleNoEscalation}
          disabled={submitting !== null}
          className="bg-slate-100 hover:bg-slate-200 text-ink-700 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
        >
          {submitting === "none" ? "Guardando…" : "Sin escalación en contrato"}
        </button>
      </div>
    </div>
  );
}

export function EscalationBackfillView({ data }: { data: EscalationBackfillData }) {
  const router = useRouter();
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkDone, setBulkDone] = useState(false);

  const eligible = useMemo(() => data.candidates.filter((c) => c.bulkConfirmEligible), [data.candidates]);

  async function handleBulkConfirm() {
    setBulkSubmitting(true);
    setBulkError(null);
    const result = await bulkConfirmSuggestedEscalationsAction(
      eligible.map((c) => ({ leaseRowId: c.leaseRowId, month: c.suggestedMonth, pct: c.suggestedPct! })),
    );
    setBulkSubmitting(false);
    if (result.error) {
      setBulkError(result.error);
      return;
    }
    setBulkDone(true);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">Backfill de Calendarios de Escalación</h1>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
            Un renglón por contrato sin calendario de escalación confirmado. El % y el mes vienen de la cláusula que
            Mariana IA encontró en el contrato digitalizado, cuando existe — siempre sujetos a tu confirmación, nunca
            aplicados solos.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-hairline rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Revisados</p>
            <p className="text-base font-extrabold text-slate-900">
              {data.reviewedCount}/{data.totalActiveLeases}
            </p>
          </div>
          <div className="bg-slate-50 border border-hairline rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pendientes</p>
            <p className="text-base font-extrabold text-slate-900">{data.candidates.length}</p>
          </div>
          <div className="bg-slate-50 border border-hairline rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Con cláusula detectada</p>
            <p className="text-base font-extrabold text-slate-900">{eligible.length}</p>
          </div>
        </div>
        {eligible.length > 0 && !bulkDone && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkConfirm}
              disabled={bulkSubmitting}
              className="bg-ink hover:bg-ink-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {bulkSubmitting ? "Confirmando…" : `Confirmar todo lo sugerido (${eligible.length})`}
            </button>
            {bulkError && <p className="text-xs font-bold text-red-700">{bulkError}</p>}
          </div>
        )}
      </div>

      {data.candidates.length === 0 ? (
        <div className="bg-white border border-hairline rounded-2xl p-8 text-center">
          <p className="text-sm font-bold text-ink">Todos los contratos activos están revisados.</p>
          <p className="text-xs text-ink-500 font-medium mt-1">
            {data.reviewedCount} de {data.totalActiveLeases} — nada pendiente en este momento.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.candidates.map((c) => (
            <CandidateRow key={c.leaseRowId} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}
