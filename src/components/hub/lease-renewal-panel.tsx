"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConsoleModal } from "@/components/hub/console-modal";
import { LegalDraftMarkdown } from "@/components/hub/legal-draft-markdown";
import type { LeaseRenewalSummary } from "@/lib/data/portfolio.server";
import { downloadBlob, generateContractPdf } from "@/lib/mock-pdf";

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
  const blob = generateContractPdf({
    documentTitle: "CONVENIO MODIFICATORIO DE ARRENDAMIENTO COMERCIAL",
    subtitle: "PLAZA COMERCIAL LIFESTYLE LA GRAN VÍA — MEXICALI, BAJA CALIFORNIA",
    tenantEntity: renewal.tenantEntity || "COMERCIALIZADORA DULCE AMANECER, S.A. DE C.V.",
    tradeName: renewal.tenantEntity?.includes("DULCE AMANECER") ? "DONITAS DEL VALLE" : null,
    unitCode: "Local 17",
    sqm: 68,
    currentEndDate: renewal.currentEndDate,
    newStartDate: renewal.newStartDate,
    newEndDate: renewal.newEndDate,
    currentRent: renewal.currentBaseRentMonthly !== null ? formatMxn(renewal.currentBaseRentMonthly) : "(sin registro)",
    newRent: formatMxn(renewal.newBaseRentMonthly),
    escalationPct: renewal.escalationPct !== null ? `${renewal.escalationPct}%` : renewal.escalationMethod,
    clausesMarkdown: renewal.draftMarkdown,
  });
  downloadBlob(blob, `convenio_modificatorio_${renewal.renewalNumber.replace(/\s+/g, "_")}.pdf`);
}

function formatSpanishDate(isoStr: string): string {
  if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return isoStr;
  const [y, m, d] = isoStr.split("-").map(Number);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${months[m - 1]} ${y}`;
}

/** Modern, scannable comparison grid — clear new rent vs old rent, new term vs old term */
function RenewalSummary({ renewal }: { renewal: LeaseRenewalSummary }) {
  const pctChange =
    renewal.currentBaseRentMonthly && renewal.currentBaseRentMonthly > 0
      ? (((renewal.newBaseRentMonthly - renewal.currentBaseRentMonthly) / renewal.currentBaseRentMonthly) * 100).toFixed(1)
      : null;

  const isSameRent = Number(pctChange ?? 0) === 0;

  const hasTicketClarification =
    renewal.draftMarkdown.includes("Aclaración Técnica") ||
    renewal.draftMarkdown.includes("historial de") ||
    renewal.draftMarkdown.includes("ticket");

  return (
    <div className="space-y-3.5 my-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="bg-slate-50 border border-hairline rounded-2xl p-4 space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nueva Vigencia Propuesta</span>
          <p className="text-base sm:text-lg font-extrabold text-slate-900">
            {formatSpanishDate(renewal.newStartDate)} – {formatSpanishDate(renewal.newEndDate)}
          </p>
          <p className="text-xs sm:text-sm font-medium text-slate-600">
            Vencimiento contrato actual: <span className="font-semibold text-slate-800">{formatSpanishDate(renewal.currentEndDate)}</span>
          </p>
        </div>

        <div className="bg-slate-50 border border-hairline rounded-2xl p-4 space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nueva Renta Mensual</span>
          <div className="flex items-baseline gap-2.5">
            <p className="text-base sm:text-lg font-extrabold text-slate-900">{formatMxn(renewal.newBaseRentMonthly)}</p>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                Number(pctChange) > 0
                  ? "bg-emerald-100 text-emerald-800"
                  : Number(pctChange) < 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {isSameRent ? "Misma renta (0%)" : `${Number(pctChange) > 0 ? "+" : ""}${pctChange}%`}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-600">
            Renta anterior:{" "}
            <span className="font-semibold text-slate-800">
              {renewal.currentBaseRentMonthly !== null ? formatMxn(renewal.currentBaseRentMonthly) : "(sin registro)"}
            </span>
          </p>
        </div>
      </div>

      {hasTicketClarification && (
        <div className="bg-blue-50/80 border border-blue-200 rounded-xl px-4 py-2.5 flex items-start gap-2.5 text-xs text-blue-900">
          <span className="text-sm">🛠️</span>
          <div>
            <span className="font-bold">Aclaración de Mantenimiento Proactiva:</span>{" "}
            Este borrador analiza el historial de tickets de mantenimiento de Diego IA para este local e incluye precisiones técnicas explícitas en la Cláusula 3, eliminando ambigüedades de costo antes de la firma.
          </div>
        </div>
      )}
    </div>
  );
}

/** Friendly, modern renewal card with enlarged, legible typography and intuitive CTAs */
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

  const isPending = renewal.status === "needs_landlord_review";
  const isApproved = renewal.status === "approved";

  return (
    <div className="border border-hairline rounded-2xl p-5 space-y-4 bg-white shadow-2xs">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-hairline">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-extrabold text-slate-900 text-base sm:text-lg">Propuesta {renewal.renewalNumber}</span>
          <span
            className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-full border ${
              isPending
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : isApproved
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-hairline"
            }`}
          >
            {isPending ? "Pendiente de aprobación" : isApproved ? "Autorizada por arrendador" : "Rechazada"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setViewing(true)}
          className="text-xs sm:text-sm font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
        >
          📄 Ver Convenio
        </button>
      </div>

      {/* Metric Cards Grid */}
      <RenewalSummary renewal={renewal} />

      {/* Bottom Action Footer */}
      {isPending && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md leading-normal">
            Mariana IA preparó el Convenio Modificatorio. Autoriza la propuesta o descarga el PDF para enviarlo a revisión.
          </p>
          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => resolve(true)}
              className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-2"
            >
              {pending === "approve" ? "Procesando..." : "✓ Autorizar propuesta"}
            </button>
            <button
              type="button"
              onClick={() => downloadRenewalPdf(renewal)}
              className="border border-hairline bg-white hover:bg-slate-50 text-slate-900 px-3.5 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-colors flex items-center gap-1.5"
            >
               Descargar PDF
            </button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => resolve(false)}
              className="text-slate-500 hover:text-red-700 font-semibold text-sm px-3 py-2.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              {pending === "reject" ? "Rechazando..." : "Rechazar"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm font-bold text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}

      {/* Modal View */}
      {viewing && (
        <ConsoleModal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setViewing(false)}>
            <div
              className="bg-white rounded-2xl border border-hairline shadow-2xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-hairline">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Convenio Modificatorio — Propuesta {renewal.renewalNumber}</h3>
                  <p className="text-sm text-slate-600">Documento contractual preparado para revisión del arrendador y su asesoría jurídica.</p>
                </div>
                <button type="button" onClick={() => setViewing(false)} className="text-slate-400 hover:text-slate-900 font-bold text-base cursor-pointer p-1">
                  ✕ Cerrar
                </button>
              </div>

              <RenewalSummary renewal={renewal} />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-slate-900">Texto del Convenio Modificatorio</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadRenewalPdf(renewal)}
                      className="bg-slate-900 text-white px-3.5 py-2 rounded-xl font-bold text-sm hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
                    >
                      Descargar PDF Oficial
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(renewal.draftMarkdown);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="border border-hairline text-slate-800 px-3.5 py-2 rounded-xl font-bold text-sm hover:bg-slate-50 cursor-pointer"
                    >
                      {copied ? "✓ Copiado" : "Copiar texto"}
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-sm sm:text-base bg-slate-50 border border-hairline rounded-2xl p-5 max-h-[45vh] overflow-y-auto font-sans leading-relaxed text-slate-900">
                  <LegalDraftMarkdown markdown={renewal.draftMarkdown} />
                </div>
              </div>
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
        <p className="text-xs font-bold text-ink-700">Redactar Convenio Modificatorio (proyecto para abogado)</p>
        <p className="text-[11px] text-ink-500 font-medium">
          Mariana IA redactará un proyecto preliminar con el desglose comparativo de cambios respecto al contrato anterior para enviarlo a tu abogado.
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
          {pending ? "Redactando..." : "Redactar proyecto"}
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
        <p className="text-[11px] text-ink-500 font-medium">Sin proyectos de renovación para este contrato.</p>
      )}
      <div className="space-y-2">
        {renewals.map((r) => (
          <RenewalCard key={r.id} renewal={r} />
        ))}
      </div>
    </div>
  );
}
