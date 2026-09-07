"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMxn } from "@/components/hub/diego-ticket-ui";
import type { CamData, CamBackfillCandidate } from "@/lib/data/cam.server";
import { confirmCamTermsAction } from "@/lib/data/cam-actions";

function formatSpanishDate(isoStr: string): string {
  const d = new Date(isoStr);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function TermsCandidateRow({ candidate }: { candidate: CamBackfillCandidate }) {
  const router = useRouter();
  const [basis, setBasis] = useState("");
  const [cap, setCap] = useState("");
  const [adminFee, setAdminFee] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    setErrorMsg(null);
    const result = await confirmCamTermsAction(
      candidate.leaseRowId,
      basis,
      cap.trim() === "" ? null : Number(cap),
      adminFee.trim() === "" ? null : Number(adminFee),
    );
    setSubmitting(false);
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
          {candidate.tradeName ?? candidate.tenantEntity} ({candidate.unitCode}) — términos confirmados
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
          <p className="text-xs text-ink-500 font-medium">{candidate.unitCode}</p>
        </div>
        <Link href={`/consola/locales/${candidate.localeId}`} className="text-xs font-bold text-[var(--console-accent)] hover:underline shrink-0">
          Ver →
        </Link>
      </div>

      <div className="bg-slate-50 border border-hairline rounded-lg p-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Cláusula de mantenimiento (evidencia)</p>
        {candidate.maintenanceClause ? (
          <p className="text-xs text-ink-700 italic">&ldquo;{candidate.maintenanceClause}&rdquo;</p>
        ) : (
          <p className="text-xs text-ink-500">Sin cláusula registrada — confirma con base en el contrato físico.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="space-y-1 sm:col-span-1">
          <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">Base de prorrateo</span>
          <input
            type="text"
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
            placeholder="Ej. % GLA"
            disabled={submitting}
            className="w-full bg-white border border-hairline-strong rounded px-1.5 py-1 text-sm font-medium text-ink focus:border-[var(--console-accent)] focus:outline-none disabled:opacity-50"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">Tope controlables %</span>
          <input
            type="number"
            step="0.01"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            placeholder="Opcional"
            disabled={submitting}
            className="w-full bg-white border border-hairline-strong rounded px-1.5 py-1 text-sm font-medium text-ink focus:border-[var(--console-accent)] focus:outline-none disabled:opacity-50"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">Cuota admin %</span>
          <input
            type="number"
            step="0.01"
            value={adminFee}
            onChange={(e) => setAdminFee(e.target.value)}
            placeholder="Opcional"
            disabled={submitting}
            className="w-full bg-white border border-hairline-strong rounded px-1.5 py-1 text-sm font-medium text-ink focus:border-[var(--console-accent)] focus:outline-none disabled:opacity-50"
          />
        </label>
      </div>

      {errorMsg && <p className="text-xs font-bold text-red-700">{errorMsg}</p>}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={submitting || !basis.trim()}
        className="bg-ink hover:bg-ink-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
      >
        {submitting ? "Guardando…" : "Confirmar términos"}
      </button>
    </div>
  );
}

export function CamView({ data }: { data: CamData }) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">CAM — Gasto Atribuido y Términos de Contrato</h1>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
            Construido de abajo hacia arriba, no desde una cifra fija: cada peso viene de un ticket real de Diego IA,
            con su cláusula citada y su aprobador. Este engagement nunca contrató cam-allocator (Renata) — así que
            esta página suma lo real y muestra los términos del contrato, pero nunca divide ni factura. Prorratear
            contra estos términos es exactamente lo que cam-allocator haría, no algo que este sistema calcule solo.
          </p>
        </div>
      </div>

      <div className="bg-white border border-hairline rounded-2xl p-4 sm:p-5 space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Gasto CAM Atribuido</p>
          <p className="text-[11px] text-ink-500 font-medium mt-0.5">
            Suma de los tickets de Diego IA atribuidos a CAM — nunca dividido entre locales.
          </p>
        </div>
        <div className="bg-slate-50 border border-hairline rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Atribuido</p>
          <p className="text-lg font-extrabold text-ink">{formatMxn(data.ledger.totalAttributed)}</p>
          <p className="text-[11px] text-ink-500 font-medium mt-0.5">
            {data.ledger.lines.length} ticket{data.ledger.lines.length === 1 ? "" : "s"}
          </p>
        </div>
        {data.ledger.lines.length === 0 ? (
          <p className="text-xs text-ink-500 font-medium">
            Ningún ticket atribuido a CAM todavía — el total sube en cuanto Diego IA cite uno.
          </p>
        ) : (
          <div className="divide-y divide-hairline border-t border-hairline">
            {data.ledger.lines.map((l) => (
              <div key={l.ticketId} className="py-2.5 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-ink">
                    {l.ticketNumber} · {l.unitCode}
                  </p>
                  <span className="text-xs font-bold text-ink">{formatMxn(l.cost)}</span>
                </div>
                {l.leaseClauseCitation && <p className="text-[11px] text-ink-500 italic">&ldquo;{l.leaseClauseCitation}&rdquo;</p>}
                <p className="text-[10px] text-ink-400 font-medium">
                  {l.approvedByName ? `Aprobado por ${l.approvedByName}` : "Sin aprobador registrado"}
                  {l.approvedAt ? ` · ${formatSpanishDate(l.approvedAt)}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-hairline rounded-2xl p-4 sm:p-5 space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Términos CAM en Contrato</p>
          <p className="text-[11px] text-ink-500 font-medium mt-0.5">
            {data.terms.reviewedCount} de {data.terms.totalActiveLeases} contratos activos tienen base de prorrateo
            registrada. Solo términos — ningún monto por local se calcula aquí.
          </p>
        </div>
        {data.terms.candidates.length === 0 ? (
          <p className="text-xs text-emerald-700 font-bold">Todos los contratos activos tienen términos CAM registrados.</p>
        ) : (
          <div className="space-y-3">
            {data.terms.candidates.map((c) => (
              <TermsCandidateRow key={c.leaseRowId} candidate={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
