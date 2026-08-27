"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConsoleModal } from "@/components/hub/console-modal";
import type { LeaseRenewalSummary } from "@/lib/data/portfolio.server";

const STATUS_LABEL: Record<LeaseRenewalSummary["status"], string> = {
  needs_landlord_review: "Pendiente de revisión",
  approved: "Aprobado",
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

/** One renewal draft row — view the full Convenio Modificatorio text, and
 *  (only while still pending) approve or reject it. Approving/rejecting
 *  never touches the real `leases` row — same boundary as Mariana's
 *  screening approval — it only records the landlord's decision on the
 *  draft itself; applying an approved renewal once the tenant countersigns
 *  is a separate, later action. */
function RenewalCard({ renewal }: { renewal: LeaseRenewalSummary }) {
  const router = useRouter();
  const [viewing, setViewing] = useState(false);
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
        const json = await res.json().catch(() => ({}));
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
      <p className="text-[11px] text-ink-500">
        {renewal.newStartDate} → {renewal.newEndDate} · ${renewal.newBaseRentMonthly.toLocaleString("es-MX")} MXN/mes
      </p>
      {renewal.status === "needs_landlord_review" && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => resolve(true)}
            className="bg-ink text-white px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
          >
            {pending === "approve" ? "Aprobando..." : "Aprobar"}
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
                <p className="font-bold text-sm text-ink">{renewal.renewalNumber} — borrador</p>
                <button type="button" onClick={() => setViewing(false)} className="text-ink-500 font-bold cursor-pointer">
                  Cerrar
                </button>
              </div>
              <pre className="text-xs text-ink-700 whitespace-pre-wrap font-sans leading-relaxed">{renewal.draftMarkdown}</pre>
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
  onDone,
}: {
  leaseId: string;
  currentEndDate: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [newEndDate, setNewEndDate] = useState(todayPlusYearsISO(currentEndDate, 3));
  const [mode, setMode] = useState<"pct" | "flat">("pct");
  const [escalationPct, setEscalationPct] = useState("5");
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
        const json = await res.json().catch(() => ({}));
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
      <p className="text-xs font-bold text-ink-700">Redactar Convenio Modificatorio (borrador)</p>
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
        <input
          type="number"
          value={escalationPct}
          onChange={(e) => setEscalationPct(e.target.value)}
          placeholder="% ej. 5"
          className="border border-hairline rounded-lg px-2 py-1 text-xs w-24"
        />
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
}: {
  leaseId: string;
  currentEndDate: string;
  isExpired: boolean;
  renewalSoon: boolean;
  renewals: LeaseRenewalSummary[];
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
      {drafting && <DraftRenewalForm leaseId={leaseId} currentEndDate={currentEndDate} onDone={() => setDrafting(false)} />}
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
