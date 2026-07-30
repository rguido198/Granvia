"use client";

import { useState, type FormEvent } from "react";
import { PassportPhone } from "@/components/events/passport-phone";

const DISTANCES = ["5K", "10K"] as const;
type Distance = (typeof DISTANCES)[number];

type GeneratedPass = { id: string; name: string; distance: Distance };

/**
 * Mini registration form that instantly "generates" the Digital Runner's
 * Pass below it — the live-demo hook showing the landlord how a signup
 * turns into a trackable, redeemable asset with zero manual work.
 */
export function RaceRegistration() {
  const [nombre, setNombre] = useState("");
  const [distancia, setDistancia] = useState<Distance>("5K");
  const [pass, setPass] = useState<GeneratedPass | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = nombre.trim();
    if (!trimmed) return;
    setGenerating(true);
    setPass(null);
    setTimeout(() => {
      setPass({
        id: `#${1000 + Math.floor(Math.random() * 900)}`,
        name: trimmed,
        distance: distancia,
      });
      setGenerating(false);
    }, 850);
  };

  return (
    <div id="registro" className="grid gap-7">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-hairline bg-sand-50 p-5 sm:p-6"
      >
        <p className="mb-3.5 font-mono text-[11px] tracking-[0.18em] text-ink-400 uppercase">
          Inscripción rápida · demo en vivo
        </p>
        <div className="grid gap-3.5 sm:grid-cols-[1.3fr_1fr_auto] sm:items-end">
          <div>
            <label className="mb-1.5 block text-xs font-semibold" htmlFor="runner-nombre">
              Nombre del corredor
            </label>
            <input
              id="runner-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              required
              className="w-full rounded-xs border border-hairline-strong bg-sand-50 px-3.5 py-2.75 text-sm text-ink placeholder:text-ink-400 focus:border-terra"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold" htmlFor="runner-distancia">
              Distancia
            </label>
            <select
              id="runner-distancia"
              value={distancia}
              onChange={(e) => setDistancia(e.target.value as Distance)}
              className="w-full rounded-xs border border-hairline-strong bg-sand-50 px-3.5 py-2.75 text-sm text-ink focus:border-terra"
            >
              {DISTANCES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={generating}
            className="cursor-pointer rounded-xs border border-terra bg-terra px-6 py-2.75 text-sm font-semibold text-sand-100 transition-colors hover:bg-terra-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? "Generando pase…" : "Inscribirme →"}
          </button>
        </div>
      </form>

      <div>
        {pass ? (
          <>
            <p className="mb-4 text-center text-sm font-semibold text-pine">
              ¡Listo, {pass.name}! Tu pasaporte digital ya está activo.
            </p>
            <PassportPhone
              holderId={pass.id}
              holderName={pass.name}
              distance={pass.distance}
              justGenerated
            />
          </>
        ) : (
          <div className="relative">
            <PassportPhone />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-full border border-hairline-strong bg-sand-50/95 px-3.5 py-1.5 font-mono text-[10.5px] tracking-[0.08em] text-ink-500 uppercase shadow-sm">
                Vista previa · inscríbete arriba
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
