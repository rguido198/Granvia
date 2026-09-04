"use client";

import { useState } from "react";
import { Inter } from "next/font/google";
import type { ConsoleData } from "@/lib/console-data";

// Console-scoped typeface, matching console-shell.tsx's choice — this route
// renders standalone (fixed over the marketing chrome, not nested under
// ConsoleShell), so it loads its own copy rather than sharing that file's
// module-scoped font instance. Never touches the marketing site's
// --font-display/--font-sans (Cormorant/Work Sans) in globals.css.
const consoleFont = Inter({
  subsets: ["latin"],
  variable: "--font-console-prototype",
  display: "swap",
});

/**
 * DARK CONSOLE PROTOTYPE — overview tab only.
 *
 * Evaluates the "modern analytics" direction against real data before committing
 * the other four tabs. What it takes from the reference: two-tier surface
 * (canvas + elevated panel), hairline borders instead of shadows, weight capped
 * at 500, one chromatic accent, large card radii, centred pill nav, and the
 * ghost-skeleton empty state.
 *
 * What it deliberately does NOT take is the reference's vertical generosity. That
 * layout carries six near-empty cards; this one carries 85 rows × 8 columns, so
 * card padding is generous while table rhythm stays tight. Copying the spacing
 * wholesale would make the rent roll roughly forty screens tall.
 *
 * Renders fixed over the marketing chrome. Shipping it properly means splitting
 * the root layout into (site) and (console) route groups — see the note in the
 * page component.
 */

const TABS = [
  { key: "overview", label: "Rent Roll" },
  { key: "leasing", label: "Arrendamiento" },
  { key: "maint", label: "CapEx" },
  { key: "cam", label: "CAM & SAT" },
  { key: "saari", label: "SAARI ERP" },
];

/** Ghost skeleton for a panel with nothing to show yet — the pattern the console has never had. */
function EmptyState({ title, hint, shape = "bars" }: { title: string; hint: string; shape?: "bars" | "rows" }) {
  const bars = [62, 38, 84, 46, 70, 30, 92, 54, 44, 76, 34, 66];
  return (
    <section className="rounded-2xl border border-console-hairline bg-console-panel p-6 sm:p-8">
      <h3 className="text-[15px] font-medium text-console-bone">{title}</h3>
      <p className="mt-1 text-[13px] text-console-slate">
        Sin datos todavía — {hint} o espera actividad de la plaza.
      </p>

      <div aria-hidden="true" className="mt-7 select-none opacity-[0.07]">
        {shape === "bars" ? (
          <div className="flex h-32 items-end gap-2">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm bg-console-bone" style={{ height: `${h}%` }} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {[100, 74, 52, 36, 22].map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 rounded-sm bg-console-bone" style={{ width: `${w / 3}%` }} />
                <div className="h-3 w-14 rounded-sm bg-console-bone" />
                <div className="h-3 w-8 rounded-sm bg-console-bone" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

type Tone = "neutral" | "ok" | "caution" | "alert";

const TONE: Record<Tone, string> = {
  neutral: "text-console-ash",
  ok: "text-ok-on-dark",
  caution: "text-caution-on-dark",
  alert: "text-signal-on-dark",
};

function Kpi({ label, value, note, tone = "neutral" }: { label: string; value: string; note: string; tone?: Tone }) {
  return (
    <div
      className={`rounded-2xl border bg-console-panel p-6 ${
        tone === "alert" ? "border-signal-on-dark/30" : "border-console-hairline"
      }`}
    >
      <span className="block text-[11px] uppercase tracking-[0.08em] text-console-slate">{label}</span>
      <div className="mt-3 text-[30px] font-normal leading-none tracking-[-0.02em] text-console-bone">{value}</div>
      <span className={`mt-3 block text-[12px] ${TONE[tone]}`}>{note}</span>
    </div>
  );
}

export function ConsolePrototype({ data }: { data: ConsoleData }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");

  const {
    rentRoll,
    vacantUnit,
    contractedRent,
    potentialRent,
    leasedSqm,
    plazaTotalGla,
    occupancyRate,
    collectionRate,
    tenantsAlDia,
    tenantsWithAlert,
    camTotals,
    camMonthlyPool,
    generatedAt,
    periodLabel,
  } = data;

  const q = search.toLowerCase();
  const rows = rentRoll.filter(
    (r) => r.name.toLowerCase().includes(q) || r.zone.toLowerCase().includes(q) || r.tag.toLowerCase().includes(q),
  );

  return (
    <div
      className={`${consoleFont.variable} fixed inset-0 z-50 overflow-y-auto bg-console-canvas font-[family-name:var(--font-console-prototype)] text-console-bone`}
    >
      <div className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8 sm:py-14">
        {/* Centred pill nav, per the reference */}
        <nav
          role="tablist"
          aria-label="Módulos"
          className="mx-auto flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full border border-console-hairline bg-console-panel p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((tab) => {
            const on = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                type="button"
                aria-selected={on}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 font-mono text-[12px] transition-colors ${
                  on
                    ? "border border-console-hairline-strong bg-console-raised text-console-bone"
                    : "border border-transparent text-console-slate hover:text-console-bone"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <header className="mt-12 text-center">
          <h1 className="text-[34px] font-normal leading-tight tracking-[-0.02em] text-console-bone sm:text-[42px]">
            {activeTab === "overview" ? "Rent Roll" : TABS.find((t) => t.key === activeTab)?.label}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-console-ash">
            Operación consolidada de La Gran Vía Mexicali — {rentRoll.length} locales activos, mantenimiento vía Diego
            AI y expedientes de arrendamiento vía Mariana IA en una sola vista.
          </p>
          <p className="mt-4 text-[11px] text-console-slate">
            Periodo <span className="font-mono text-console-ash">{periodLabel}</span>
            <span aria-hidden="true"> · </span>
            generado <span className="font-mono text-console-ash">{generatedAt}</span>
          </p>
        </header>

        {activeTab !== "overview" ? (
          <div className="mt-12 space-y-5">
            <EmptyState
              title={TABS.find((t) => t.key === activeTab)?.label ?? ""}
              hint="este módulo aún no está en el prototipo"
              shape={activeTab === "cam" ? "rows" : "bars"}
            />
          </div>
        ) : (
          <div className="mt-12 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                label="Renta contratada"
                value={`$${(contractedRent / 1000).toFixed(0)}k MXN`}
                note={`${collectionRate.toFixed(1)}% al día · ${tenantsAlDia}/${rentRoll.length}`}
                tone={tenantsWithAlert > 0 ? "alert" : "ok"}
              />
              <Kpi
                label="Ocupación GLA"
                value={`${occupancyRate.toFixed(1)}%`}
                note={`${leasedSqm.toLocaleString()} de ${plazaTotalGla.toLocaleString()} m²`}
                tone="caution"
              />
              <Kpi
                label="Invariante CAM"
                value={(camTotals.sharePct / 100).toFixed(4)}
                note={camTotals.base === camMonthlyPool ? "Cuadra contra la bolsa" : "Descuadre"}
                tone={camTotals.base === camMonthlyPool ? "ok" : "alert"}
              />
            </div>

            {/* Collection meter */}
            <section className="rounded-2xl border border-console-hairline bg-console-panel p-6 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="block text-[11px] uppercase tracking-[0.08em] text-console-slate">
                    Estado de cobranza
                  </span>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-[40px] font-normal leading-none tracking-[-0.02em]">
                      {collectionRate.toFixed(1)}%
                    </span>
                    <span className="text-[13px] text-console-ash">al día</span>
                  </div>
                </div>
                {tenantsWithAlert > 0 && (
                  <p className="text-[13px] text-console-ash">
                    {tenantsAlDia} de {rentRoll.length} al día ·{" "}
                    <span className="text-signal-on-dark">{tenantsWithAlert} con alerta fiscal SAT</span>
                  </p>
                )}
              </div>
              <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-console-raised">
                <div className="h-full rounded-full bg-ok-on-dark" style={{ width: `${collectionRate}%` }} />
              </div>
            </section>

            {/* Rent roll — card padding is generous, row rhythm stays tight */}
            <section className="rounded-2xl border border-console-hairline bg-console-panel">
              <div className="flex flex-col gap-3 border-b border-console-hairline p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <div>
                  <h2 className="text-[15px] font-medium text-console-bone">Matriz consolidada</h2>
                  <p className="mt-0.5 text-[12px] text-console-slate">
                    {rentRoll.length} locales activos + vacancia · {plazaTotalGla.toLocaleString()} m² GLA
                  </p>
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar inquilino, zona o giro…"
                  className="w-full rounded-lg border border-console-hairline bg-console-canvas px-3.5 py-2 text-[13px] text-console-bone outline-none placeholder:text-console-slate focus:border-console-hairline-strong sm:w-72"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-console-hairline text-[11px] uppercase tracking-[0.06em] text-console-slate">
                      <th className="px-6 py-3 font-normal sm:px-8">Local / inquilino</th>
                      <th className="px-3 py-3 font-normal">Zona</th>
                      <th className="px-3 py-3 text-right font-normal">m²</th>
                      <th className="px-3 py-3 text-right font-normal">Pro-rata</th>
                      <th className="px-3 py-3 text-right font-normal">Renta MXN</th>
                      <th className="px-6 py-3 font-normal sm:px-8">Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.slug} className="border-b border-console-hairline/60 last:border-0 hover:bg-console-raised/40">
                        <td className="px-6 py-2.5 font-medium text-console-bone sm:px-8">{r.name}</td>
                        <td className="px-3 py-2.5 text-console-slate">{r.zone}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-console-ash">{r.sqm}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-console-ash">{r.sharePct.toFixed(2)}%</td>
                        <td className="px-3 py-2.5 text-right font-mono text-console-bone">
                          ${r.rent.toLocaleString()}
                        </td>
                        <td className="px-6 py-2.5 sm:px-8">
                          {r.fiscalAlert ? (
                            <span className="rounded-full border border-signal-on-dark/30 px-2.5 py-0.5 text-[11px] text-signal-on-dark">
                              Alerta SAT
                            </span>
                          ) : (
                            <span className="text-[11px] text-console-slate">Al día</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-b border-console-hairline/60 bg-caution-on-dark/[0.04]">
                      <td className="px-6 py-2.5 font-medium text-caution-on-dark sm:px-8">{vacantUnit.label}</td>
                      <td className="px-3 py-2.5 text-console-slate">{vacantUnit.zone}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-caution-on-dark">{vacantUnit.sqm}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-caution-on-dark">
                        {vacantUnit.sharePct.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-caution-on-dark">
                        ${vacantUnit.askingRent.toLocaleString()}
                      </td>
                      <td className="px-6 py-2.5 text-[11px] text-caution-on-dark sm:px-8">Absorbe propietario</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="text-[12px] text-console-ash">
                      <td className="px-6 py-4 font-medium sm:px-8">Total plaza</td>
                      <td />
                      <td className="px-3 py-4 text-right font-mono text-console-bone">
                        {plazaTotalGla.toLocaleString()}
                      </td>
                      <td className="px-3 py-4 text-right font-mono text-ok-on-dark">100.00%</td>
                      <td className="px-3 py-4 text-right font-mono text-console-bone">
                        ${potentialRent.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-[11px] sm:px-8">{rentRoll.length + 1} registrados</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* The pattern the console has never had */}
            <EmptyState
              title="Cobranza por zona"
              hint="conecta el desglose por zona en SAARI"
              shape="bars"
            />
          </div>
        )}

        <p className="mt-10 text-center text-[11px] text-console-slate">
          Prototipo de superficie oscura · pendiente de aprobación de marca
        </p>
      </div>
    </div>
  );
}
