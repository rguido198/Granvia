"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { StalledHandoff } from "@/lib/data/stalled-handoffs.server";

const DEFAULT_THRESHOLD_DAYS = 14;

const WAITING_ON_CLS: Record<StalledHandoff["waitingOn"], string> = {
  Arrendador: "bg-amber-50 text-amber-900 border-amber-200",
  "Mariana IA": "bg-indigo-50 text-indigo-800 border-indigo-200",
  "Asesoría legal": "bg-slate-100 text-slate-700 border-slate-200",
};

function ageCls(days: number, threshold: number): string {
  if (days >= threshold * 2) return "bg-red-50 text-red-800 border-red-200";
  if (days >= threshold) return "bg-amber-50 text-amber-900 border-amber-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

function HandoffRow({ h, threshold }: { h: StalledHandoff; threshold: number }) {
  return (
    <div className="border border-hairline rounded-xl p-3.5 space-y-2 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-ink text-sm">{h.title}</p>
          <p className="text-xs text-ink-500 font-medium">{h.subtitle}</p>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${ageCls(h.daysStuck, threshold)}`}>
          {h.daysStuck === 0 ? "hoy" : `${h.daysStuck} día${h.daysStuck === 1 ? "" : "s"}`}
        </span>
      </div>
      {h.note && <p className="text-xs text-ink-600 italic bg-slate-50 border border-hairline rounded-lg p-2">{h.note}</p>}
      <div className="flex items-center justify-between gap-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${WAITING_ON_CLS[h.waitingOn]}`}>
          Espera a: {h.waitingOn}
        </span>
        <Link href={h.actionHref} className="text-xs font-bold text-[var(--console-accent)] hover:underline">
          {h.actionLabel} →
        </Link>
      </div>
    </div>
  );
}

export function StalledHandoffsView({ handoffs }: { handoffs: StalledHandoff[] }) {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD_DAYS);

  const { stalled, inProgress } = useMemo(() => {
    const stalled = handoffs.filter((h) => h.daysStuck >= threshold);
    const inProgress = handoffs.filter((h) => h.daysStuck < threshold);
    return { stalled, inProgress };
  }, [handoffs, threshold]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">Traspasos Atascados</h1>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
            Cada punto donde un agente terminó su parte y el siguiente paso quedó esperando a un humano — o a otro
            agente — sin que nadie lo note. Ocho estados reales, todos derivados de los mismos contratos que el
            resto de la consola ya lee. Nada aquí se resuelve solo: cada renglón apunta a una acción concreta.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 bg-slate-50 border border-hairline rounded-xl px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Umbral de atasco</span>
            <input
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => {
                const n = Number(e.target.value);
                setThreshold(Number.isFinite(n) ? Math.max(0, n) : DEFAULT_THRESHOLD_DAYS);
              }}
              className="w-14 bg-white border border-hairline-strong rounded px-1.5 py-0.5 text-sm font-bold text-ink text-center focus:border-[var(--console-accent)] focus:outline-none"
            />
            <span className="text-xs font-semibold text-ink-500">días</span>
          </label>
          <div className="bg-slate-50 border border-hairline rounded-xl px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Atascados</span>{" "}
            <span className={`text-sm font-extrabold ${stalled.length > 0 ? "text-red-700" : "text-emerald-700"}`}>
              {stalled.length}
            </span>
          </div>
          <div className="bg-slate-50 border border-hairline rounded-xl px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">En curso (aún no)</span>{" "}
            <span className="text-sm font-extrabold text-slate-900">{inProgress.length}</span>
          </div>
        </div>
      </div>

      {stalled.length === 0 ? (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-8 text-center">
          <p className="text-sm font-bold text-emerald-800">Nada atascado hoy.</p>
          <p className="text-xs text-emerald-700 font-medium mt-1">
            {inProgress.length > 0
              ? `${inProgress.length} traspaso${inProgress.length === 1 ? "" : "s"} en curso, ninguno pasó de ${threshold} días.`
              : "No hay traspasos pendientes en ningún estado — cada handoff se resolvió del otro lado."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {stalled.map((h) => (
            <HandoffRow key={h.key} h={h} threshold={threshold} />
          ))}
        </div>
      )}

      {inProgress.length > 0 && (
        <details className="bg-white border border-hairline rounded-2xl p-4 sm:p-5">
          <summary className="text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer">
            En curso, aún no atascados ({inProgress.length})
          </summary>
          <div className="space-y-3 mt-3">
            {inProgress.map((h) => (
              <HandoffRow key={h.key} h={h} threshold={threshold} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
