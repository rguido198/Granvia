"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LocaleOption } from "@/lib/data/tenant-portal.server";

const CATEGORIES = [
  { key: "hvac", label: "Aire / Clima", placeholder: "Ej. El aire acondicionado no enfría desde esta mañana…" },
  { key: "plomeria", label: "Plomería", placeholder: "Ej. Hay una fuga de agua en el baño de empleados…" },
  { key: "electrico", label: "Eléctrico", placeholder: "Ej. Se fue la luz del local, el interruptor no responde…" },
  { key: "refrigeracion", label: "Refrigeración", placeholder: "Ej. El refrigerador comercial dejó de enfriar…" },
  { key: "seguridad", label: "Seguridad / Accesos", placeholder: "Ej. La cámara del pasillo dejó de grabar…" },
  { key: "otro", label: "Otro", placeholder: "Describe lo que está pasando…" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

/**
 * Real ticket intake — posts to /api/ingest (Phase 1) and, for
 * kind=maintenance_ticket, the same call starts Diego's workflow (Phase 2).
 * Used by both the landlord (locale picker) and the tenant (locale fixed to
 * their own unit) — the only difference is whether localeOptions or
 * fixedLocaleId is passed in.
 *
 * Category + urgency are picked (not typed) and prepended to the report text
 * sent to Diego — a stronger, faster signal than relying on free text alone,
 * without needing a schema change on the ingest side.
 */
export function NewTicketForm({
  localeOptions,
  fixedLocaleId,
  sourceChannel = "consola",
}: {
  localeOptions?: LocaleOption[];
  fixedLocaleId?: string;
  sourceChannel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [localeId, setLocaleId] = useState(fixedLocaleId ?? localeOptions?.[0]?.id ?? "");
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [urgent, setUrgent] = useState(false);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const activeCategory = CATEGORIES.find((c) => c.key === category);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!localeId) {
      setError("Selecciona un local");
      return;
    }
    if (!category) {
      setError("Elige una categoría");
      return;
    }
    if (!description.trim() && !file) {
      setError("Describe lo que pasa o adjunta una foto");
      return;
    }
    setSubmitting(true);
    setError(null);

    const tags = `Categoría: ${activeCategory?.label}. Urgencia: ${urgent ? "Alta" : "Normal"}.`;
    const fullReport = `${tags} ${description}`.trim();

    const body = new FormData();
    body.set("kind", "maintenance_ticket");
    body.set("locale_id", localeId);
    body.set("source_channel", sourceChannel);
    body.set("description", fullReport);

    if (file) {
      // Sent alongside description above — /api/ingest uses the typed text
      // as raw_text for images instead of losing it (a photo alone extracts
      // no text).
      body.set("file", file);
    } else {
      // /api/ingest requires a file — the description itself becomes the
      // uploaded document when no photo is attached.
      body.set("file", new File([fullReport], "reporte.txt", { type: "text/plain" }));
    }

    try {
      const res = await fetch("/api/ingest", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "HTTP " + res.status);
      }
      setDone(true);
      setCategory(null);
      setUrgent(false);
      setDescription("");
      setFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el reporte");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer shadow-xs"
      >
        + Nuevo Ticket
      </button>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center justify-between">
        <span>Reporte enviado — Diego lo está procesando.</span>
        <button
          onClick={() => {
            setDone(false);
            setOpen(false);
          }}
          className="text-emerald-700 underline cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
      {localeOptions && (
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Local</label>
          <select
            value={localeId}
            onChange={(e) => setLocaleId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white"
          >
            {localeOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.unitNumber} — {l.tenantEntity ?? "Vacante"} ({l.propertyName})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">¿Qué tipo de falla es?</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                category === c.key
                  ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">¿Qué tan urgente es?</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUrgent(false)}
            className={`flex-1 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              !urgent
                ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => setUrgent(true)}
            className={`flex-1 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              urgent
                ? "border-terra bg-terra text-white shadow-xs"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            Urgente
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cuéntanos más (opcional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={activeCategory?.placeholder ?? "Elige una categoría arriba primero…"}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Foto (opcional)</label>
        <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-xs font-semibold text-slate-600 hover:border-slate-400">
          <span>{file ? file.name : "Toca para tomar o subir una foto"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/heic,application/pdf"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
      </div>

      {error && <p className="text-[11px] text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50"
        >
          {submitting ? "Enviando…" : "Enviar Reporte"}
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
  );
}
