"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConsoleModal } from "@/components/hub/console-modal";
import { LegalDraftMarkdown } from "@/components/hub/legal-draft-markdown";
import type { LeaseRenewalSummary } from "@/lib/data/portfolio.server";
import { downloadBlob, generateMockPdf, type PdfSection } from "@/lib/mock-pdf";

// "Aprobado" alone reads as a finished decision — SKILL.md's own closing
// disclaimer on every draft says the opposite: it's subject to the
// landlord's approval AND their counsel's, and this button only ever
// records the landlord's half. Labeled to say what actually happens next.
const STATUS_LABEL: Record<LeaseRenewalSummary["status"], string> = {
  needs_landlord_review: "Pendiente de revisión",
  approved: "Aprobado — enviar a asesoría legal",
  rejected: "Rechazado",
};

const STATUS_CLS: Record<LeaseRenewalSummary["status"], string> = {
  needs_landlord_review: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-slate-100 text-ink-500 border-hairline",
};

function todayPlusYearsISO(startISO: string, years: number): string {
  const d = new Date(startISO);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function formatMxn(n: number): string {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
}

function downloadRenewalPdf(renewal: LeaseRenewalSummary) {
  const sections: PdfSection[] = [
    {
      heading: "AVISO LEGAL IMPORTANTE",
      body: [
        "Borrador preliminar de trabajo preparado por Mariana IA para revisión del abogado / asesoría jurídica del arrendador.",
        "Este documento no constituye un contrato definitivo ni una oferta formal vinculante.",
      ],
    },
    {
      heading: "RESUMEN COMPARATIVO DE MODIFICACIONES (CONTRATO ANTERIOR VS. NUEVA VERSIÓN)",
      body: [
        `Vigencia anterior: vence ${renewal.currentEndDate}`,
        `Nueva vigencia: ${renewal.newStartDate} a ${renewal.newEndDate}`,
        `Renta mensual anterior: ${renewal.currentBaseRentMonthly !== null ? formatMxn(renewal.currentBaseRentMonthly) : "(sin registro)"}`,
        `Renta mensual nueva: ${formatMxn(renewal.newBaseRentMonthly)} (Escalación: ${renewal.escalationPct !== null ? renewal.escalationPct + "%" : renewal.escalationMethod})`,
        "Disposiciones inalteradas: Se ratifican mantenimiento, cuota CAM, exclusividad y uso permitido conforme al contrato anterior.",
      ],
    },
    {
      heading: "TEXTO COMPLETO DEL CONVENIO MODIFICATORIO (BORRADOR PARA ABOGADO)",
      body: renewal.draftMarkdown
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith("[") && !l.startsWith("###")),
    },
  ];

  const blob = generateMockPdf(
    `CONVENIO MODIFICATORIO DE ARRENDAMIENTO (BORRADOR)`,
    sections,
    "La Gran Vía · Mariana AI · Documento de Trabajo para Abogado",
  );
  downloadBlob(blob, `borrador_abogado_${renewal.renewalNumber.replace(/\s+/g, "_")}.pdf`);
}

/** The clear, scannable "what actually changes" block — separate from the
 *  dense legal prose in draftMarkdown, which was the whole complaint: a
 *  landlord shouldn't have to read four paragraphs to find the new rent. */
function RenewalSummary({ renewal }: { renewal: LeaseRenewalSummary }) {
  const pctChange =
    renewal.currentBaseRentMonthly && renewal.currentBaseRentMonthly > 0
      ? (((renewal.newBaseRentMonthly - renewal.currentBaseRentMonthly) / renewal.currentBaseRentMonthly) * 100).toFixed(1)
      : null;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      <dt className="text-ink-500 font-medium">Vigencia</dt>
      <dd className="text-ink font-bold">
        {renewal.currentEndDate} <span className="text-ink-400 font-medium">→</span> {renewal.newStartDate} a {renewal.newEndDate}
      </dd>
      <dt className="text-ink-500 font-medium">Renta mensual</dt>
      <dd className="text-ink font-bold">
        {renewal.currentBaseRentMonthly !== null ? formatMxn(renewal.currentBaseRentMonthly) : "(sin registro)"}{" "}
        <span className="text-ink-400 font-medium">→</span> {formatMxn(renewal.newBaseRentMonthly)}
        {pctChange !== null && (
          <span className={`ml-1.5 font-bold ${Number(pctChange) > 0 ? "text-emerald-700" : Number(pctChange) < 0 ? "text-red-700" : "text-ink-500"}`}>
            ({Number(pctChange) > 0 ? "+" : ""}
            {pctChange}%)
          </span>
        )}
      </dd>
    </dl>
  );
}

/** One renewal draft row — view the full Convenio Modificatorio text, and
 *  (only while still pending) approve or reject it. Approving/rejecting
 *  never touches the real `leases` row — same boundary as Mariana's
 *  screening approval — it only records the landlord's decision on the
 *  draft itself; applying an approved renewal once the tenant countersigns
 *  is a separate, later action. */
function RenewalCard({ renewal }: { renewal: LeaseRenewalSummary }) {
  const router = useRouter();
  const [viewing, setViewing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(approved: boolean) {
    setPending(approved ? "approve" : "reject");
    setError(null);
    try {
      const res = await fetch("/api/workflow/approve-lease-renewal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renewalId: renewal.id, approved }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "No se pudo registrar la decisión.");
        return;
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="border border-hairline rounded-lg p-2.5 space-y-1.5 bg-white">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink text-xs">{renewal.renewalNumber}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CLS[renewal.status]}`}>
            {STATUS_LABEL[renewal.status]}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-800 border-blue-200">
            Borrador para abogado
          </span>
          {renewal.skepticFlagged && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200"
              title={renewal.skepticConcerns.join(" · ")}
            >
              Ver notas del auditor
            </span>
          )}
        </div>
        <button type="button" onClick={() => setViewing(true)} className="text-xs font-semibold text-ink-700 underline cursor-pointer">
          Ver borrador
        </button>
      </div>
      <RenewalSummary renewal={renewal} />
      {renewal.status === "needs_landlord_review" && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] text-ink-500 font-medium">
            Tu aprobación autoriza este borrador preliminar con el resumen de cambios para enviarlo a tu abogado.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => resolve(true)}
              className="bg-ink text-white px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              {pending === "approve" ? "Enviando..." : "Aprobar y enviar a abogado"}
            </button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => resolve(false)}
              className="border border-hairline text-ink-700 px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              {pending === "reject" ? "Rechazando..." : "Rechazar"}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-[11px] font-bold text-red-700">{error}</p>}
      {viewing && (
        <ConsoleModal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setViewing(false)}>
            <div
              className="bg-white rounded-2xl border border-hairline shadow-2xl p-5 max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-ink">{renewal.renewalNumber} — borrador para abogado</p>
                  <p className="text-[11px] text-ink-500">Documento preliminar con desglose de modificaciones respecto al contrato anterior.</p>
                </div>
                <button type="button" onClick={() => setViewing(false)} className="text-ink-500 font-bold cursor-pointer">
                  Cerrar
                </button>
              </div>
              <div className="bg-slate-50 border border-hairline rounded-xl p-3">
                <RenewalSummary renewal={renewal} />
              </div>
              <div className="border-t border-hairline pt-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-ink-700">Texto del Convenio Modificatorio (Borrador)</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadRenewalPdf(renewal)}
                      className="bg-slate-900 text-white px-2.5 py-1 rounded-lg font-bold text-xs hover:bg-slate-800 cursor-pointer"
                    >
                      Descargar PDF para Abogado
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(renewal.draftMarkdown);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="border border-hairline text-ink-700 px-2.5 py-1 rounded-lg font-bold text-xs hover:bg-slate-50 cursor-pointer"
                    >
                      {copied ? "✓ Copiado" : "Copiar texto"}
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs bg-white border border-hairline rounded-xl p-3 max-h-[40vh] overflow-y-auto">
                  <LegalDraftMarkdown markdown={renewal.draftMarkdown} />
                </div>
              </div>
              {renewal.skepticConcerns.length > 0 && (
                <div className="border-t border-hairline pt-2.5">
                  <p className="text-xs font-bold text-amber-900 mb-1">Notas del auditor (Mariana IA)</p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-ink-700">
                    {renewal.skepticConcerns.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </ConsoleModal>
      )}
    </div>
  );
}

/** "Redactar Renovación" trigger — a small form (new end date, escalation %
 *  or a flat new rent) that starts leaseRenewalWorkflow. The new rent is
 *  always landlord-supplied, never computed or guessed here or by the model
 *  — same discipline as addTenantAction/NewLeaseForm. */
function DraftRenewalForm({
  leaseId,
  currentEndDate,
  suggestedEscalationPct,
  suggestedEscalationClauseText,
  onDone,
}: {
  leaseId: string;
  currentEndDate: string;
  /** Pulled from the original contract's own special_clauses
   *  (findEscalationClause, contract-status.ts) — pre-fills the field below
   *  but is still fully editable; null when the source contract has no
   *  escalation clause on record (or was never digitized). */
  suggestedEscalationPct: number | null;
  suggestedEscalationClauseText: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [newEndDate, setNewEndDate] = useState(todayPlusYearsISO(currentEndDate, 3));
  const [mode, setMode] = useState<"pct" | "flat">("pct");
  // Default to 0% (renew at the same rent) when the original contract has
  // no escalation clause on record — an arbitrary guessed percentage (the
  // previous default here) has no basis; "same rent unless the landlord
  // says otherwise" does. Still fully editable either way.
  const [escalationPct, setEscalationPct] = useState(
    suggestedEscalationPct !== null ? String(suggestedEscalationPct) : "0",
  );
  const [flatRent, setFlatRent] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { leaseId, newEndDate };
      if (mode === "pct") {
        const pct = Number(escalationPct);
        if (!escalationPct || !Number.isFinite(pct)) {
          setError("Escribe un porcentaje de escalación válido.");
          return;
        }
        body.escalationPct = pct;
      } else {
        const rent = Number(flatRent);
        if (!flatRent || !Number.isFinite(rent) || rent <= 0) {
          setError("Escribe una renta mensual válida.");
          return;
        }
        body.newBaseRentMonthly = rent;
      }
      const res = await fetch("/api/workflow/draft-renewal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "No se pudo iniciar la redacción.");
        return;
      }
      onDone();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border border-hairline rounded-lg p-2.5 space-y-2 bg-slate-50">
      <div>
        <p className="text-xs font-bold text-ink-700">Redactar Convenio Modificatorio (borrador para abogado)</p>
        <p className="text-[11px] text-ink-500 font-medium">
          Mariana IA redactará un borrador preliminar con el desglose comparativo de cambios respecto al contrato anterior para enviarlo a tu abogado.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-ink-500 font-medium">Nueva fecha de vencimiento</label>
        <input
          type="date"
          value={newEndDate}
          onChange={(e) => setNewEndDate(e.target.value)}
          className="border border-hairline rounded-lg px-2 py-1 text-xs"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-[11px] text-ink-700 font-medium cursor-pointer">
          <input type="radio" checked={mode === "pct"} onChange={() => setMode("pct")} />
          % de escalación
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-ink-700 font-medium cursor-pointer">
          <input type="radio" checked={mode === "flat"} onChange={() => setMode("flat")} />
          Renta fija nueva
        </label>
      </div>
      {mode === "pct" ? (
        <div className="space-y-1">
          <input
            type="number"
            value={escalationPct}
            onChange={(e) => setEscalationPct(e.target.value)}
            placeholder="% ej. 5"
            className="border border-hairline rounded-lg px-2 py-1 text-xs w-24"
          />
          <p className="text-[10px] text-ink-500 font-medium max-w-md">
            {suggestedEscalationPct !== null ? (
              <>
                Sugerido por el contrato original: &ldquo;{suggestedEscalationClauseText}&rdquo; — edítalo si no
                corresponde.
              </>
            ) : (
              "El contrato original no tiene cláusula de escalación en registro — 0% renueva a la misma renta. Ajusta el porcentaje o cambia a renta fija si lo deseas."
            )}
          </p>
        </div>
      ) : (
        <input
          type="number"
          value={flatRent}
          onChange={(e) => setFlatRent(e.target.value)}
          placeholder="Renta mensual MXN"
          className="border border-hairline rounded-lg px-2 py-1 text-xs w-36"
        />
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="bg-ink text-white px-3 py-1 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
        >
          {pending ? "Redactando..." : "Redactar borrador"}
        </button>
        <button type="button" onClick={onDone} className="text-ink-600 font-bold text-xs cursor-pointer">
          Cancelar
        </button>
      </div>
      {error && <p className="text-[11px] font-bold text-red-700">{error}</p>}
    </div>
  );
}

/** Renders inside a lease's expanded Legal Expedientes row — the trigger to
 *  start a new renewal draft (only offered for a lease that's expired or
 *  renewing soon), plus every renewal already on file for this lease. */
export function LeaseRenewalPanel({
  leaseId,
  currentEndDate,
  isExpired,
  renewalSoon,
  renewals,
  suggestedEscalationPct,
  suggestedEscalationClauseText,
}: {
  leaseId: string;
  currentEndDate: string;
  isExpired: boolean;
  renewalSoon: boolean;
  renewals: LeaseRenewalSummary[];
  suggestedEscalationPct: number | null;
  suggestedEscalationClauseText: string | null;
}) {
  const [drafting, setDrafting] = useState(false);

  return (
    <div className="border-t border-hairline pt-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-ink-700">Renovación</p>
        {(isExpired || renewalSoon) && !drafting && (
          <button type="button" onClick={() => setDrafting(true)} className="text-xs font-semibold text-ink-700 underline cursor-pointer">
            + Redactar Renovación
          </button>
        )}
      </div>
      {drafting && (
        <DraftRenewalForm
          leaseId={leaseId}
          currentEndDate={currentEndDate}
          suggestedEscalationPct={suggestedEscalationPct}
          suggestedEscalationClauseText={suggestedEscalationClauseText}
          onDone={() => setDrafting(false)}
        />
      )}
      {renewals.length === 0 && !drafting && (
        <p className="text-[11px] text-ink-500 font-medium">Sin borradores de renovación para este contrato.</p>
      )}
      <div className="space-y-2">
        {renewals.map((r) => (
          <RenewalCard key={r.id} renewal={r} />
        ))}
      </div>
    </div>
  );
}
