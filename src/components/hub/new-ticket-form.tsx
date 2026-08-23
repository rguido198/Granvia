"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LocaleOption } from "@/lib/data/tenant-portal.server";

/**
 * Real ticket intake — posts to /api/ingest (Phase 1) and, for
 * kind=maintenance_ticket, the same call starts Diego's workflow (Phase 2).
 * Used by both the landlord (locale picker) and the tenant (locale fixed to
 * their own unit) — the only difference is whether localeOptions or
 * fixedLocaleId is passed in.
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
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!localeId) {
      setError("Selecciona un local");
      return;
    }
    setSubmitting(true);
    setError(null);

    const body = new FormData();
    body.set("kind", "maintenance_ticket");
    body.set("locale_id", localeId);
    body.set("source_channel", sourceChannel);
    body.set("description", description);

    if (file) {
      // Sent alongside description above — /api/ingest uses the typed text
      // as raw_text for images instead of losing it (a photo alone extracts
      // no text).
      body.set("file", file);
    } else {
      // /api/ingest requires a file — the description itself becomes the
      // uploaded document when no photo is attached.
      body.set("file", new File([description], "reporte.txt", { type: "text/plain" }));
    }

    try {
      const res = await fetch("/api/ingest", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "HTTP " + res.status);
      }
      setDone(true);
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
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      {localeOptions && (
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Local</label>
          <select
            value={localeId}
            onChange={(e) => setLocaleId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            {localeOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.unitNumber} — {l.tenantEntity ?? "Vacante"} ({l.propertyName})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Descripción de la falla</label>
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Ej. El aire acondicionado no enfría desde esta mañana…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Foto (opcional)</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/heic,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-xs"
        />
      </div>

      {error && <p className="text-[11px] text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50"
        >
          {submitting ? "Enviando…" : "Enviar Reporte"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-slate-600 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
