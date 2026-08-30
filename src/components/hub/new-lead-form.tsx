"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BUSINESS_CATEGORIES } from "@/content/leasing";
import type { LocaleOption } from "@/lib/data/tenant-portal.server";

export function NewLeadForm({
  localeOptions,
  initialLocaleId,
  isOpen: externalIsOpen,
  onClose: externalOnClose,
}: {
  localeOptions: LocaleOption[];
  initialLocaleId?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalIsOpen ?? internalOpen;
  const setOpen = (val: boolean) => {
    setInternalOpen(val);
    if (!val && externalOnClose) externalOnClose();
  };

  const [applicantEntity, setApplicantEntity] = useState("");
  const [category, setCategory] = useState(BUSINESS_CATEGORIES[0] ?? "");
  const [targetLocaleId, setTargetLocaleId] = useState(initialLocaleId ?? "");
  const [contactChannel, setContactChannel] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!applicantEntity.trim()) {
      setError("Ingresa el nombre o marca del prospecto");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantEntity: applicantEntity.trim(),
          category,
          targetLocaleId: targetLocaleId || null,
          contactChannel: contactChannel.trim() || null,
          source: source.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "No se pudo registrar el prospecto.");
      }

      setOpen(false);
      setApplicantEntity("");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar el prospecto.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
      >
        + Nuevo Prospecto
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 max-h-[90vh] flex flex-col">
        <div className="bg-slate-900 text-white p-6 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pipeline · Registrar Nuevo Prospecto
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg font-bold"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Captura contactos iniciales y muestra de interés antes de solicitar una aplicación formal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Prospecto / Marca <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={applicantEntity}
              onChange={(e) => setApplicantEntity(e.target.value)}
              placeholder="Ej. Churrería Porfirio"
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
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Local Objetivo (Opcional)
              </label>
              <select
                value={targetLocaleId}
                onChange={(e) => setTargetLocaleId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Sin definir aún</option>
                {localeOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.unitNumber} — {l.tenantEntity ?? "Vacante"} ({l.propertyName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Canal de Contacto
              </label>
              <input
                type="text"
                value={contactChannel}
                onChange={(e) => setContactChannel(e.target.value)}
                placeholder="Ej. WhatsApp / Teléfono"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Origen / Broker</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Ej. Broker Inmobiliario Mexicali"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Notas iniciales</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Interés expresado, requerimientos especiales o notas de seguimiento."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            />
          </div>

          {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Guardando…" : "Registrar Prospecto"}
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
      </div>
    </div>
  );
}
