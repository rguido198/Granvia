"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BUSINESS_CATEGORIES } from "@/content/leasing";
import type { LocaleOption } from "@/lib/data/tenant-portal.server";

/**
 * Real lease-application intake for Mariana (lease-screener/SKILL.md) —
 * posts to /api/ingest (kind=lease_application), which starts
 * marianaScreeningWorkflow: exclusive-use overlap audit, risk
 * classification, and Match Score (src/workflows/mariana-screening.ts).
 *
 * Structured fields, not one free-text box — SKILL.md §2A is explicit that
 * itemized products are "the critical input for the exclusive-use audit,
 * not the category label," and that missing product detail should block
 * the audit rather than let it guess from a category name.
 */
export function MarianaApplicationForm({ localeOptions }: { localeOptions: LocaleOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetLocaleId, setTargetLocaleId] = useState(localeOptions[0]?.id ?? "");
  const [applicantEntity, setApplicantEntity] = useState("");
  const [category, setCategory] = useState(BUSINESS_CATEGORIES[0] ?? "");
  const [subcategory, setSubcategory] = useState("");
  const [productsText, setProductsText] = useState("");
  const [requestedSqm, setRequestedSqm] = useState("");
  const [proposedRentPerSqm, setProposedRentPerSqm] = useState("");
  const [desiredTermYears, setDesiredTermYears] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!targetLocaleId) {
      setError("Selecciona el local objetivo");
      return;
    }
    if (!applicantEntity.trim()) {
      setError("Escribe el nombre del solicitante");
      return;
    }
    const products = productsText
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    if (products.length === 0) {
      // SKILL.md §2A/Step 1: missing product detail blocks the audit —
      // enforced here rather than letting a category label stand in for it.
      setError("Enumera al menos un producto — la auditoría de exclusividad no puede correr solo con la categoría");
      return;
    }

    setSubmitting(true);

    const summary = [
      `Solicitante: ${applicantEntity.trim()}.`,
      `Categoría: ${category}.`,
      subcategory.trim() ? `Subcategoría: ${subcategory.trim()}.` : null,
      `Productos: ${products.join(", ")}.`,
      requestedSqm ? `Superficie solicitada: ${requestedSqm} m².` : null,
      proposedRentPerSqm ? `Renta ofrecida: $${proposedRentPerSqm} MXN/m².` : null,
      desiredTermYears ? `Plazo deseado: ${desiredTermYears} años.` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const body = new FormData();
    body.set("kind", "lease_application");
    body.set("locale_id", targetLocaleId);
    body.set("source_channel", "consola_propietario");
    body.set("description", summary);
    body.set("file", new File([summary], "solicitud.txt", { type: "text/plain" }));

    try {
      const res = await fetch("/api/ingest", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "HTTP " + res.status);
      }
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar la solicitud");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
      >
        + Nueva Solicitud de Arrendamiento
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 font-sans max-h-[90vh] flex flex-col">
        <div className="bg-slate-900 text-white p-6 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Mariana IA · Nueva Solicitud de Arrendamiento
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg font-bold"
              aria-label="Cerrar ventana"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Captura lo que el solicitante envió — Mariana audita contra las cláusulas de exclusividad vigentes.
          </p>
        </div>

        {done ? (
          <div className="p-6 space-y-4">
            <p className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              Solicitud recibida — en cola para auditoría de exclusividad.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Local objetivo</label>
              <select
                value={targetLocaleId}
                onChange={(e) => setTargetLocaleId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                {localeOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.unitNumber} — {l.tenantEntity ?? "Vacante"} ({l.propertyName})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Solicitante</label>
              <input
                type="text"
                value={applicantEntity}
                onChange={(e) => setApplicantEntity(e.target.value)}
                placeholder="Ej. Tacos El Compa S.A. de C.V."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subcategoría</label>
                <input
                  type="text"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="Ej. Hamburguesas gourmet"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Productos (uno por línea)
              </label>
              <textarea
                value={productsText}
                onChange={(e) => setProductsText(e.target.value)}
                rows={4}
                placeholder={"Ej.\nTacos de ribeye\nQuesadillas\nAgua fresca"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white font-mono"
              />
              <p className="text-[11px] text-slate-500">
                El inventario itemizado, no la categoría, es lo que Mariana audita contra las cláusulas de
                exclusividad.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Superficie solicitada (m²)
                </label>
                <input
                  type="number"
                  value={requestedSqm}
                  onChange={(e) => setRequestedSqm(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Renta ofrecida ($/m²)
                </label>
                <input
                  type="number"
                  value={proposedRentPerSqm}
                  onChange={(e) => setProposedRentPerSqm(e.target.value)}
                  placeholder="MXN"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                />
                <p className="text-[11px] text-slate-500">Sin esto, Mariana no puede calcular el Yield Score.</p>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Plazo deseado (años)
                </label>
                <input
                  type="number"
                  value={desiredTermYears}
                  onChange={(e) => setDesiredTermYears(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                />
              </div>
            </div>

            {error && <p className="text-[11px] text-red-600">{error}</p>}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Enviando…" : "Enviar Solicitud"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-600 font-bold px-3 py-2.5 rounded-lg text-xs cursor-pointer hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
