"use client";

import { useState } from "react";
import type { ResolvedContractorToken } from "@/lib/data/contractor-execution.server";

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContractorActionPanel({
  token,
  initialData,
}: {
  token: string;
  initialData: ResolvedContractorToken;
}) {
  const [arrivedAt, setArrivedAt] = useState<string | null>(initialData.arrivedAt);
  const [markingArrival, setMarkingArrival] = useState(false);
  const [arrivalError, setArrivalError] = useState<string | null>(null);

  const [workPerformed, setWorkPerformed] = useState("");
  const [finalCost, setFinalCost] = useState("");
  const [submittingWork, setSubmittingWork] = useState(false);
  const [workError, setWorkError] = useState<string | null>(null);

  const [completed, setCompleted] = useState(initialData.status !== "dispatched");

  async function handleMarkArrival() {
    setMarkingArrival(true);
    setArrivalError(null);
    try {
      const res = await fetch(`/api/contratista/${token}/arrived`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "No se pudo registrar la llegada.");
      }
      setArrivedAt(new Date().toISOString());
    } catch (err) {
      setArrivalError(err instanceof Error ? err.message : "Error al registrar la llegada.");
    } finally {
      setMarkingArrival(false);
    }
  }

  async function handleMarkWorkDone() {
    if (!workPerformed.trim()) {
      setWorkError("Describe el trabajo realizado.");
      return;
    }

    let parsedCost: number | null = null;
    if (finalCost.trim() !== "") {
      const num = Number(finalCost.trim());
      if (!Number.isFinite(num) || num < 0) {
        setWorkError("El costo final debe ser un número válido no negativo.");
        return;
      }
      parsedCost = num;
    }

    setSubmittingWork(true);
    setWorkError(null);
    try {
      const res = await fetch(`/api/contratista/${token}/work-done`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workPerformed: workPerformed.trim(),
          finalCost: parsedCost,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "No se pudo registrar el trabajo.");
      }
      setCompleted(true);
    } catch (err) {
      setWorkError(err instanceof Error ? err.message : "Error al enviar el reporte de trabajo.");
      setSubmittingWork(false);
    }
  }

  if (completed) {
    return (
      <section className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
        <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 font-bold text-lg flex items-center justify-center mx-auto">
          ✓
        </div>
        <h2 className="text-lg font-bold text-emerald-900">Trabajo Registrado</h2>
        <p className="text-xs text-emerald-800/90 font-medium leading-relaxed">
          El reporte de trabajo ha sido enviado al propietario para confirmación con el inquilino.
        </p>
      </section>
    );
  }

  return (
    <section className="w-full space-y-4">
      {/* 1. Onsite Arrival Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Llegada a Sitio</h2>
          {arrivedAt && <span className="text-[11px] font-bold text-emerald-700">✓ En Sitio</span>}
        </div>

        {arrivedAt ? (
          <p className="text-xs font-semibold text-slate-700">
            Llegada registrada a las {formatTimestamp(arrivedAt)}
          </p>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              disabled={markingArrival}
              onClick={() => void handleMarkArrival()}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs sm:text-sm cursor-pointer disabled:opacity-50 transition-colors"
            >
              {markingArrival ? "Registrando…" : "Marcar Llegada en Sitio"}
            </button>
            {arrivalError && <p className="text-[11px] font-semibold text-red-600">{arrivalError}</p>}
          </div>
        )}
      </div>

      {/* 2. Completion Report Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Marcar Trabajo Terminado</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Descripción del trabajo realizado <span className="text-red-500">*</span>
            </label>
            <textarea
              value={workPerformed}
              onChange={(e) => setWorkPerformed(e.target.value)}
              placeholder="Ej. Se reemplazó la válvula de 2 pulgadas y se verificó presión sin fuga."
              rows={3}
              className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Costo Final (MXN) — opcional</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={finalCost}
              onChange={(e) => setFinalCost(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-slate-900 focus:outline-none"
            />
          </div>

          {workError && <p className="text-[11px] font-semibold text-red-600">{workError}</p>}

          <button
            type="button"
            disabled={submittingWork || !workPerformed.trim()}
            onClick={() => void handleMarkWorkDone()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs sm:text-sm cursor-pointer disabled:opacity-50 transition-colors"
          >
            {submittingWork ? "Enviando…" : "✓ Finalizar y Enviar Trabajo"}
          </button>
        </div>
      </div>
    </section>
  );
}
