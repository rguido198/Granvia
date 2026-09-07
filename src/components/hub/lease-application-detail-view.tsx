"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LegalDraftMarkdown } from "@/components/hub/legal-draft-markdown";
import { formatSpanishDate } from "@/components/hub/lease-renewal-panel";
import type { LeaseApplicationDetail } from "@/lib/data/lease-application-detail.server";

const RISK_BADGE: Record<"ALTO" | "MEDIO" | "BAJO", string> = {
  ALTO: "bg-red-50 text-red-800 border-red-200",
  MEDIO: "bg-amber-50 text-amber-900 border-amber-200",
  BAJO: "bg-slate-100 text-ink-700 border-hairline",
};

const STATUS_BADGE: Record<LeaseApplicationDetail["status"], { label: string; cls: string }> = {
  needs_landlord_review: { label: "Pendiente de aprobación", cls: "bg-amber-50 text-amber-900 border-amber-200" },
  approved: { label: "Aprobada", cls: "bg-emerald-50 text-emerald-900 border-emerald-200" },
  rejected: { label: "Rechazada", cls: "bg-slate-100 text-slate-600 border-hairline" },
};

function scoreLabel(score: number | null): string {
  return score === null ? "—" : score.toFixed(0);
}

function GroupCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-hairline rounded-2xl p-4 sm:p-5 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      {children}
    </div>
  );
}

export function LeaseApplicationDetailView({ detail }: { detail: LeaseApplicationDetail }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirmArmed, setConfirmArmed] = useState(false);

  const needsConfirm = detail.riskLevel === "ALTO" || detail.skepticFlagged;
  const scoresAvailable = detail.riskLevel !== "ALTO";
  const canAct = detail.status === "needs_landlord_review";
  const badge = STATUS_BADGE[detail.status];

  async function resolve(approved: boolean) {
    setPendingAction(approved ? "approve" : "reject");
    setError(null);
    setWarning(null);
    try {
      const res = await fetch("/api/workflow/approve-lease", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: detail.id, approved }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; warning?: string };
      if (!res.ok) {
        setError(json.error ?? "No se pudo registrar la decisión.");
        return;
      }
      if (json.warning) setWarning(json.warning);
      router.refresh();
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {detail.targetUnitNumber ? `${detail.targetUnitNumber} · ` : ""}Solicitud {detail.applicationNumber}
            </p>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">{detail.applicantEntity}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${RISK_BADGE[detail.riskLevel]}`}>
              Riesgo {detail.riskLevel}
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badge.cls}`}>{badge.label}</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">
          Evaluado por Mariana AI · {formatSpanishDate(detail.createdAt.slice(0, 10))}
          {detail.reviewedByName && (
            <>
              {" · "}
              {detail.status === "approved" ? "Aprobado" : "Rechazado"} por {detail.reviewedByName}
              {detail.reviewedAt ? ` · ${formatSpanishDate(detail.reviewedAt.slice(0, 10))}` : ""}
            </>
          )}
        </p>
      </div>

      <GroupCard title="Solicitud">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Giro</p>
            <p className="text-xs font-semibold text-ink-700 mt-0.5">
              {detail.category} — {detail.subcategory}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Productos</p>
            <p className="text-xs font-semibold text-ink-700 mt-0.5">{detail.products.join(", ") || "(sin especificar)"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Superficie / plazo solicitado</p>
            <p className="text-xs font-semibold text-ink-700 mt-0.5">
              {detail.requestedSqm !== null ? `${detail.requestedSqm} m²` : "(sin especificar)"}
              {detail.desiredTermYears !== null ? ` · ${detail.desiredTermYears} años` : ""}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Local objetivo</p>
            <p className="text-xs font-semibold text-ink-700 mt-0.5">{detail.targetUnitNumber ?? "(sin especificar)"}</p>
          </div>
        </div>
      </GroupCard>

      {(detail.matchedClauseText || detail.matchedProductPairs.length > 0) && (
        <GroupCard title="Conflicto de exclusividad">
          {detail.matchedUnitNumber && (
            <p className="text-xs text-ink-700">
              Local en conflicto: <strong>{detail.matchedUnitNumber}</strong>
              {detail.matchedTenantEntity ? ` (${detail.matchedTenantEntity})` : ""}
            </p>
          )}
          {detail.matchedClauseText && (
            <p className="text-xs text-ink-700">Cláusula citada: &ldquo;{detail.matchedClauseText}&rdquo;</p>
          )}
          {detail.matchedProductPairs.length > 0 && (
            <ul className="space-y-1 pl-1">
              {detail.matchedProductPairs.map((pair, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-ink">{pair.applicant_product}</span>
                  <span className="text-ink-400">→</span>
                  <span className="text-ink-700">{pair.protected_term}</span>
                </li>
              ))}
            </ul>
          )}
        </GroupCard>
      )}

      {scoresAvailable && (
        <GroupCard title="Puntajes de ajuste">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-hairline p-2.5 bg-slate-50">
              <p className="text-[10px] text-ink-500 font-semibold uppercase tracking-wider">Ajuste de giro</p>
              <p className="text-sm font-bold text-ink mt-0.5">{scoreLabel(detail.categoryFitScore)}</p>
            </div>
            <div className="rounded-lg border border-hairline p-2.5 bg-slate-50">
              <p className="text-[10px] text-ink-500 font-semibold uppercase tracking-wider">Rendimiento</p>
              <p className="text-sm font-bold text-ink mt-0.5">{scoreLabel(detail.yieldScore)}</p>
            </div>
            <div className="rounded-lg border border-hairline p-2.5 bg-slate-50">
              <p className="text-[10px] text-ink-500 font-semibold uppercase tracking-wider">Estabilidad</p>
              <p className="text-sm font-bold text-ink mt-0.5">{scoreLabel(detail.termStabilityScore)}</p>
            </div>
          </div>
        </GroupCard>
      )}

      {detail.skepticConcerns.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-900 space-y-1">
          <p className="font-bold">Revisión de Mariana IA marcó posibles inconsistencias:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {detail.skepticConcerns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {detail.showWatermark && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-amber-900">Borrador — pendiente de firma del abogado del arrendador</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-900/90">
            Este expediente cita parámetros de jurisdicción que aún no han sido verificados por el abogado del
            arrendador. No constituye asesoría legal.
          </p>
          {detail.unresolvedJdKeys.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Claves sin resolver</span>
              {detail.unresolvedJdKeys.map((key) => (
                <span key={key} className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                  {key}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3">
        <p className="text-sm font-extrabold text-slate-900">Resumen de evidencia de Mariana IA</p>
        {detail.draftMarkdown ? (
          <div className="text-sm bg-slate-50 border border-hairline rounded-2xl p-5 max-h-[40vh] overflow-y-auto font-sans leading-relaxed text-slate-900">
            <LegalDraftMarkdown markdown={detail.draftMarkdown} />
          </div>
        ) : (
          <p className="text-xs text-ink-500 font-medium">
            No se generó un resumen de evidencia para esta solicitud — los datos estructurados de arriba son el
            expediente completo.
          </p>
        )}
      </div>

      {error && <p className="text-sm font-bold text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}
      {warning && <p className="text-sm font-bold text-amber-700 bg-amber-50 p-3 rounded-xl">{warning}</p>}

      {canAct && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-hairline shadow-2xl z-40">
          <div className="max-w-3xl mx-auto p-3 sm:p-4 space-y-2">
            <p className="text-[10px] text-ink-500 font-medium">
              Esto aprueba la evaluación de viabilidad; no crea un contrato ni incorpora al inquilino.
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={pendingAction !== null}
                onClick={() => {
                  // Same double-confirm pattern the inline Pendientes card
                  // already uses (lease-application-review.tsx) — an ALTO
                  // or skeptic-flagged application shouldn't approve on the
                  // same click that landed here.
                  if (needsConfirm && !confirmArmed) {
                    setConfirmArmed(true);
                    return;
                  }
                  resolve(true);
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50 ${
                  needsConfirm && confirmArmed ? "bg-red-700 hover:bg-red-800 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                {pendingAction === "approve"
                  ? "Procesando…"
                  : needsConfirm && confirmArmed
                    ? "Sí, aprobar de todas formas"
                    : "✓ Aprobar evaluación"}
              </button>
              <button
                type="button"
                disabled={pendingAction !== null}
                onClick={() => resolve(false)}
                className="border border-hairline bg-white hover:bg-slate-50 text-slate-900 px-3.5 py-2.5 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50"
              >
                {pendingAction === "reject" ? "Rechazando…" : "Rechazar evaluación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
