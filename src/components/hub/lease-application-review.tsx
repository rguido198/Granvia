"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PendingLeaseApplication } from "@/lib/data/approval-queue.server";
import type { LeaseApplicationDetail } from "@/lib/data/lease-application-detail.server";

const RISK_BADGE: Record<"ALTO" | "MEDIO" | "BAJO", string> = {
  ALTO: "bg-red-100 text-red-800 border-red-300",
  MEDIO: "bg-amber-100 text-amber-800 border-amber-300",
  BAJO: "bg-slate-100 text-ink-700 border-hairline",
};

function scoreLabel(score: number | null): string {
  return score === null ? "—" : score.toFixed(0);
}

/** One product-pair evidence row — the exact head-noun match Mariana cited
 *  as the conflict, per MARIANA_SYSTEM_PROMPT's own rule that "a risk level
 *  with no cited word-pair is not reviewable." */
function ProductPairRow({ pair }: { pair: { applicant_product: string; protected_term: string } }) {
  return (
    <li className="flex items-center gap-2">
      <span className="font-semibold text-ink">{pair.applicant_product}</span>
      <span className="text-ink-400">→</span>
      <span className="text-ink-700">{pair.protected_term}</span>
    </li>
  );
}

function ApplicationDetailView({
  detail,
  onSubmit,
  pendingAction,
  error,
  warning,
  submitted,
  confirmArmed,
  setConfirmArmed,
}: {
  detail: LeaseApplicationDetail;
  onSubmit: (approved: boolean) => void;
  pendingAction: "approve" | "reject" | null;
  error: string | null;
  warning: string | null;
  submitted: "approved" | "rejected" | null;
  confirmArmed: boolean;
  setConfirmArmed: (v: boolean) => void;
}) {
  const needsConfirm = detail.riskLevel === "ALTO" || detail.skepticFlagged;
  const scoresAvailable = detail.riskLevel !== "ALTO";

  return (
    <div className="space-y-3 text-xs border-t border-hairline pt-3 mt-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-ink-500 font-medium">Giro</dt>
        <dd className="text-ink font-bold">
          {detail.category} — {detail.subcategory}
        </dd>
        <dt className="text-ink-500 font-medium">Productos</dt>
        <dd className="text-ink font-bold">{detail.products.join(", ") || "(sin especificar)"}</dd>
        <dt className="text-ink-500 font-medium">Solicitado</dt>
        <dd className="text-ink font-bold">
          {detail.requestedSqm !== null ? `${detail.requestedSqm} m²` : "(sin especificar)"}
          {detail.desiredTermYears !== null ? ` · ${detail.desiredTermYears} años` : ""}
          {detail.targetUnitNumber ? ` · Local objetivo: ${detail.targetUnitNumber}` : ""}
        </dd>
      </dl>

      {/* Exclusivity conflict — the actual audit evidence, not just a risk
       *  label. Only meaningful when a clause was actually cited. */}
      {(detail.matchedClauseText || detail.matchedProductPairs.length > 0) && (
        <div className="rounded-xl border border-hairline bg-slate-50/60 p-3 space-y-2">
          <p className="font-bold text-ink-700">Conflicto de exclusividad</p>
          {detail.matchedUnitNumber && (
            <p className="text-ink-700">
              Local en conflicto: <strong>{detail.matchedUnitNumber}</strong>
              {detail.matchedTenantEntity ? ` (${detail.matchedTenantEntity})` : ""}
            </p>
          )}
          {detail.matchedClauseText && (
            <p className="text-ink-700">
              Cláusula citada: &ldquo;{detail.matchedClauseText}&rdquo;
            </p>
          )}
          {detail.matchedProductPairs.length > 0 && (
            <ul className="space-y-1 pl-1">
              {detail.matchedProductPairs.map((pair, i) => (
                <ProductPairRow key={i} pair={pair} />
              ))}
            </ul>
          )}
        </div>
      )}

      {scoresAvailable && (
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-hairline p-2">
            <dt className="text-[10px] text-ink-500 font-semibold uppercase tracking-wider">Ajuste de giro</dt>
            <dd className="text-sm font-bold text-ink">{scoreLabel(detail.categoryFitScore)}</dd>
          </div>
          <div className="rounded-lg border border-hairline p-2">
            <dt className="text-[10px] text-ink-500 font-semibold uppercase tracking-wider">Rendimiento</dt>
            <dd className="text-sm font-bold text-ink">{scoreLabel(detail.yieldScore)}</dd>
          </div>
          <div className="rounded-lg border border-hairline p-2">
            <dt className="text-[10px] text-ink-500 font-semibold uppercase tracking-wider">Estabilidad</dt>
            <dd className="text-sm font-bold text-ink">{scoreLabel(detail.termStabilityScore)}</dd>
          </div>
        </dl>
      )}

      {/* Rendered directly from the structured array — independent of
       *  draft_markdown, which may be null for applications screened before
       *  this evidence-summary field existed. This is the actual
       *  audit-relevant content; a "flagged" chip pointing at it isn't
       *  enough. */}
      {detail.skepticConcerns.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="font-bold text-amber-900">Observaciones del auditor</p>
          <ul className="list-disc pl-4 mt-1 space-y-0.5 text-amber-900/90">
            {detail.skepticConcerns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {detail.showWatermark && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-xs font-bold text-amber-900">
            Borrador — pendiente de firma del abogado del arrendador
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-900/90">
            Este expediente cita parámetros de jurisdicción que aún no han sido verificados por el abogado del
            arrendador. No constituye asesoría legal.
          </p>
          {detail.unresolvedJdKeys.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Claves sin resolver
              </span>
              {detail.unresolvedJdKeys.map((key) => (
                <span
                  key={key}
                  className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-amber-900"
                >
                  {key}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <details className="border-t border-hairline pt-2.5">
        <summary className="font-bold text-ink-700 cursor-pointer">Ver resumen de evidencia de Mariana</summary>
        {detail.draftMarkdown ? (
          <pre className="text-ink-700 whitespace-pre-wrap font-sans leading-relaxed mt-2">{detail.draftMarkdown}</pre>
        ) : (
          <p className="text-ink-500 font-medium mt-2">
            No se generó un resumen de evidencia para esta solicitud — los datos estructurados de arriba son el
            expediente completo.
          </p>
        )}
      </details>

      {detail.status === "needs_landlord_review" && !submitted && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] text-ink-500 font-medium">
            Esto aprueba la evaluación de viabilidad; no crea un contrato ni incorpora al inquilino.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pendingAction !== null}
              onClick={() => {
                // Same double-confirm pattern as Gate 1's overwrite warning
                // (MatchReviewForm, legal-documents-panel.tsx) — an ALTO or
                // skeptic-flagged application shouldn't approve on the same
                // click that opened the row.
                if (needsConfirm && !confirmArmed) {
                  setConfirmArmed(true);
                  return;
                }
                onSubmit(true);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50 ${
                needsConfirm && confirmArmed ? "bg-red-600 hover:bg-red-700 text-white" : "bg-ink text-white"
              }`}
            >
              {pendingAction === "approve"
                ? "Aprobando..."
                : needsConfirm && confirmArmed
                  ? "Sí, aprobar de todas formas"
                  : "Aprobar evaluación"}
            </button>
            <button
              type="button"
              disabled={pendingAction !== null}
              onClick={() => onSubmit(false)}
              className="border border-hairline text-ink-700 px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              {pendingAction === "reject" ? "Rechazando..." : "Rechazar evaluación"}
            </button>
          </div>
        </div>
      )}

      {submitted && (
        <p className="text-[11px] font-bold text-emerald-700">
          {submitted === "approved" ? "Aprobado" : "Rechazado"} — actualizando…
        </p>
      )}
      {warning && <p className="text-[11px] font-bold text-amber-700">{warning}</p>}
      {error && <p className="text-[11px] font-bold text-red-700">{error}</p>}
    </div>
  );
}

/**
 * Turns a Pendientes row from "visible but disabled" into a real Tier-3
 * review surface — /api/workflow/approve-lease has had zero UI callers
 * since it was written; this is the first one. Expand-in-place, same
 * toggle pattern DocumentGroup already uses (mariana-pending-panel.tsx),
 * not a navigation — there are only ever a couple of these, and this row
 * already lives inside Mariana's own Pendientes tab.
 */
export function LeaseApplicationCard({
  application,
  onResolved,
}: {
  application: PendingLeaseApplication;
  onResolved: () => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<LeaseApplicationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<"approved" | "rejected" | null>(null);
  const [confirmArmed, setConfirmArmed] = useState(false);

  useEffect(() => {
    if (!expanded || detail || loading) return;
    setLoading(true);
    setLoadError(null);
    fetch(`/api/leases/applications/${application.id}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setLoadError(json.error ?? "No se pudo cargar el expediente.");
          return;
        }
        setDetail(json.application as LeaseApplicationDetail);
      })
      .catch(() => setLoadError("No se pudo cargar el expediente."))
      .finally(() => setLoading(false));
  }, [expanded, detail, loading, application.id]);

  async function submit(approved: boolean) {
    setPendingAction(approved ? "approve" : "reject");
    setError(null);
    setWarning(null);
    try {
      const res = await fetch("/api/workflow/approve-lease", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id, approved }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "No se pudo registrar la decisión.");
        return;
      }
      // A 200 here means resumeHook() delivered the decision to the
      // workflow — not that lease_applications.status has flipped yet
      // (markReviewed runs after this response, asynchronously). The
      // card marks itself submitted immediately regardless of what the
      // parent queue still shows, and onResolved() is re-fired on a short
      // backoff so Pendientes' count/list eventually converge too.
      if (json.warning) setWarning(json.warning);
      setSubmitted(approved ? "approved" : "rejected");
      onResolved();
      router.refresh();
      for (const delay of [1500, 3000, 6000]) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        onResolved();
      }
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="border border-hairline rounded-xl p-3.5 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${RISK_BADGE[application.riskLevel ?? "BAJO"]}`}
            >
              {application.riskLevel ?? "—"}
            </span>
            <p className="font-bold text-xs text-ink truncate">{application.applicantEntity}</p>
          </div>
          <p className="text-[11px] text-ink-500 font-medium mt-1">
            {application.unitNumber ? `${application.unitNumber} · ` : ""}
            {application.applicationNumber}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-bold bg-ink text-white px-3 py-1.5 rounded-lg hover:bg-ink-700 cursor-pointer shrink-0"
        >
          {expanded ? "Ocultar expediente" : "Ver expediente →"}
        </button>
      </div>

      {expanded && (
        <>
          {loading && <p className="text-[11px] text-ink-500 font-medium mt-3">Cargando expediente…</p>}
          {loadError && <p className="text-[11px] font-bold text-red-700 mt-3">{loadError}</p>}
          {detail && (
            <ApplicationDetailView
              detail={detail}
              onSubmit={submit}
              pendingAction={pendingAction}
              error={error}
              warning={warning}
              submitted={submitted}
              confirmArmed={confirmArmed}
              setConfirmArmed={setConfirmArmed}
            />
          )}
        </>
      )}
    </div>
  );
}
