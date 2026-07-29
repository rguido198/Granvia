"use client";

import { useState } from "react";
import { cn } from "@/components/ui";
import { HUB_ACTIONS } from "@/content/hub";
import { SITE } from "@/content/site";

type DashboardTab = "ocupacion" | "financiero" | "operaciones";

export function LandlordDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("ocupacion");
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [salesSubmitted, setSalesSubmitted] = useState(false);

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* ---------------- 1. Quick Utility Bar (Mobile Responsive Cards) ---------------- */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        {HUB_ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => {
              if (action.key === "ticket") setActiveTab("operaciones");
              if (action.key === "ventas") setActiveTab("financiero");
              setActiveModal(action.key);
            }}
            className="group flex cursor-pointer items-center justify-between rounded-lg border border-hairline bg-sand-100 p-3.5 sm:p-4.5 text-left transition-all duration-200 hover:border-ink hover:bg-sand-50 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-md text-sand-100",
                  action.accent === "terra" && "bg-terra",
                  action.accent === "pine" && "bg-pine",
                  action.accent === "gold" && "bg-gold"
                )}
              >
                {action.icon === "diamond" && (
                  <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-sand-100 rotate-45 rounded-[1px]" />
                )}
                {action.icon === "circle" && (
                  <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-sand-100 rounded-full" />
                )}
                {action.icon === "square" && (
                  <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-sand-100 rounded-[1px]" />
                )}
              </div>
              <div>
                <span className="block font-display text-sm sm:text-base font-bold text-ink leading-tight">
                  {action.title}
                </span>
                <span className="block font-mono text-[9.5px] sm:text-[10.5px] tracking-[0.08em] text-ink-400 uppercase mt-0.5">
                  {action.en}
                </span>
              </div>
            </div>
            <span className="text-sm font-semibold text-terra transition-transform duration-200 group-hover:translate-x-1 pl-2">
              →
            </span>
          </button>
        ))}
      </div>

      {/* ---------------- 2. MAIN COMPONENT: Landlord Control Panel ---------------- */}
      <section
        id="panel-administracion"
        aria-labelledby="landlord-titulo"
        className="rounded-xl border border-hairline-strong bg-sand-100 p-4 sm:p-7 shadow-md"
      >
        {/* Header Bar */}
        <div className="mb-6 sm:mb-8 flex flex-col justify-between gap-3 sm:gap-4 border-b border-hairline pb-4 sm:pb-6 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-pine/30 bg-pine/10 px-2.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-semibold text-pine uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-pine animate-pulse" />
                Control Operativo & Asset Management
              </span>
              <span className="font-mono text-[10px] sm:text-[11px] text-ink-400">
                // La Gran Vía
              </span>
            </div>
            <h2 id="landlord-titulo" className="font-display text-xl sm:text-3xl font-bold text-ink leading-tight">
              Panel de Control General
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-ink-500 max-w-2xl">
              Consola central para propietarios, administradores y equipo operativo de La Gran Vía.
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0">
            <span className="rounded-md border border-hairline bg-sand-200 px-2.5 py-1 font-mono text-[11px] text-ink-700 font-medium">
              Julio 2026
            </span>
            <button
              type="button"
              onClick={() => alert("Generando reporte PDF consolidado...")}
              className="cursor-pointer rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-sand-100 transition-colors hover:bg-ink-700"
            >
              Exportar (.PDF)
            </button>
          </div>
        </div>

        {/* Executive KPI Bar (Grid of 2 on mobile) */}
        <div className="mb-6 sm:mb-8 grid gap-2.5 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveTab("ocupacion")}
            className={cn(
              "cursor-pointer text-left rounded-lg border bg-sand-50 p-3 sm:p-4.5 transition-all hover:bg-sand-100 hover:shadow-sm",
              activeTab === "ocupacion" ? "border-terra/40 ring-1 ring-terra/30" : "border-hairline"
            )}
          >
            <p className="font-mono text-[9px] sm:text-[10.5px] tracking-[0.08em] text-ink-400 uppercase">
              Ocupación
            </p>
            <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
              <span className="font-display text-xl sm:text-3xl font-bold text-ink">94.1%</span>
              <span className="font-mono text-[10px] sm:text-xs font-semibold text-pine">+2.4% vs '25</span>
            </div>
            <p className="mt-1 text-[10.5px] sm:text-[12px] text-ink-500 hidden sm:block">
              79 Locales · 3 Pop-Ups · 2 Vacantes
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ocupacion")}
            className={cn(
              "cursor-pointer text-left rounded-lg border bg-sand-50 p-3 sm:p-4.5 transition-all hover:bg-sand-100 hover:shadow-sm",
              activeTab === "ocupacion" ? "border-terra/40 ring-1 ring-terra/30" : "border-hairline"
            )}
          >
            <p className="font-mono text-[9px] sm:text-[10.5px] tracking-[0.08em] text-ink-400 uppercase">
              Afluencia
            </p>
            <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
              <span className="font-display text-xl sm:text-3xl font-bold text-ink">142.8k</span>
              <span className="font-mono text-[10px] sm:text-xs font-semibold text-pine">+8.4% YoY</span>
            </div>
            <p className="mt-1 text-[10.5px] sm:text-[12px] text-ink-500 hidden sm:block">
              Pico: Vie–Dom 6-11 PM
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("financiero")}
            className={cn(
              "cursor-pointer text-left rounded-lg border bg-sand-50 p-3 sm:p-4.5 transition-all hover:bg-sand-100 hover:shadow-sm",
              activeTab === "financiero" ? "border-terra/40 ring-1 ring-terra/30" : "border-hairline"
            )}
          >
            <p className="font-mono text-[9px] sm:text-[10.5px] tracking-[0.08em] text-ink-400 uppercase">
              Cobranza
            </p>
            <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
              <span className="font-display text-xl sm:text-3xl font-bold text-ink">98.5%</span>
              <span className="font-mono text-[10px] sm:text-xs font-semibold text-gold">Al día</span>
            </div>
            <p className="mt-1 text-[10.5px] sm:text-[12px] text-ink-500 hidden sm:block">
              $2.45M MXN en fecha
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("operaciones")}
            className={cn(
              "cursor-pointer text-left rounded-lg border bg-sand-50 p-3 sm:p-4.5 transition-all hover:bg-sand-100 hover:shadow-sm",
              activeTab === "operaciones" ? "border-terra/40 ring-1 ring-terra/30" : "border-hairline"
            )}
          >
            <p className="font-mono text-[9px] sm:text-[10.5px] tracking-[0.08em] text-ink-400 uppercase">
              Mesa Ayuda
            </p>
            <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
              <span className="font-display text-xl sm:text-3xl font-bold text-ink">4</span>
              <span className="font-mono text-[10px] sm:text-xs font-semibold text-terra">SLA &lt;45m</span>
            </div>
            <p className="mt-1 text-[10.5px] sm:text-[12px] text-ink-500 hidden sm:block">
              2 HVAC · 1 Limpieza · 1 Estac.
            </p>
          </button>
        </div>

        {/* Tab Navigation (Mobile Responsive Horizontal Pill Scroll) */}
        <div className="mb-6 rounded-lg border border-hairline bg-sand-200 p-1 overflow-x-auto scrollbar-none">
          <div className="flex sm:grid sm:grid-cols-3 gap-1 min-w-[320px]" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "ocupacion"}
              onClick={() => setActiveTab("ocupacion")}
              className={cn(
                "cursor-pointer flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 px-3 text-xs font-bold whitespace-nowrap transition-all duration-200",
                activeTab === "ocupacion"
                  ? "bg-sand-100 text-terra shadow-sm"
                  : "text-ink-600 hover:text-ink hover:bg-sand-100/50"
              )}
            >
              <span>📊</span>
              <span>Ocupación</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "financiero"}
              onClick={() => setActiveTab("financiero")}
              className={cn(
                "cursor-pointer flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 px-3 text-xs font-bold whitespace-nowrap transition-all duration-200",
                activeTab === "financiero"
                  ? "bg-sand-100 text-terra shadow-sm"
                  : "text-ink-600 hover:text-ink hover:bg-sand-100/50"
              )}
            >
              <span>💰</span>
              <span>Finanzas & Ventas</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "operaciones"}
              onClick={() => setActiveTab("operaciones")}
              className={cn(
                "cursor-pointer flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 px-3 text-xs font-bold whitespace-nowrap transition-all duration-200",
                activeTab === "operaciones"
                  ? "bg-sand-100 text-terra shadow-sm"
                  : "text-ink-600 hover:text-ink hover:bg-sand-100/50"
              )}
            >
              <span>🛠️</span>
              <span>Mantenimiento</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Ocupación & Mix */}
        {activeTab === "ocupacion" && (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-hairline bg-sand-50 p-4 sm:p-5">
              <h3 className="font-display text-base sm:text-lg font-bold text-ink mb-1">
                Distribución de Giros (Tenant Mix)
              </h3>
              <p className="text-xs text-ink-500 mb-3.5">
                Equilibrio comercial para optimizar la estadía en plaza.
              </p>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-ink-700">Gastronomía & Bares</span>
                    <span className="text-terra">35% (29)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
                    <div className="h-full bg-terra" style={{ width: "35%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-ink-700">Moda & Boutiques</span>
                    <span className="text-pine">28% (23)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
                    <div className="h-full bg-pine" style={{ width: "28%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-ink-700">Salud & Bienestar</span>
                    <span className="text-gold">18% (15)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
                    <div className="h-full bg-gold" style={{ width: "18%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-ink-700">Entretenimiento & Hoteles</span>
                    <span className="text-ink-700">13% (11)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
                    <div className="h-full bg-ink-700" style={{ width: "13%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-ink-700">Espacios Pop-Up Flexibles</span>
                    <span className="text-pine">6% (5)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
                    <div className="h-full bg-pine/60" style={{ width: "6%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-hairline bg-sand-50 p-4 sm:p-5">
              <h3 className="font-display text-base sm:text-lg font-bold text-ink mb-1">
                Próximos Vencimientos (Q3-Q4 2026)
              </h3>
              <p className="text-xs text-ink-500 mb-3.5">
                Pipeline de renovaciones prioritarias.
              </p>

              <ul className="divide-y divide-hairline text-xs">
                <li className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-semibold text-ink block text-sm">Bodega 8</span>
                    <span className="text-ink-400">Restaurante & Bar · Local A-04</span>
                  </div>
                  <div>
                    <span className="inline-block rounded bg-pine/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-pine">
                      Oct '26 · Renovado
                    </span>
                  </div>
                </li>

                <li className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-semibold text-ink block text-sm">Cinépolis VIP</span>
                    <span className="text-ink-400">Entretenimiento · Ancla Principal</span>
                  </div>
                  <div>
                    <span className="inline-block rounded bg-pine/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-pine">
                      Nov '26 · Seguro
                    </span>
                  </div>
                </li>

                <li className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-semibold text-ink block text-sm">MINT Boutique</span>
                    <span className="text-ink-400">Moda Mujer · Local B-12</span>
                  </div>
                  <div>
                    <span className="inline-block rounded bg-gold/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-gold">
                      Dic '26 · Negociación
                    </span>
                  </div>
                </li>

                <li className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-semibold text-ink block text-sm">Local C-08 (Vacante)</span>
                    <span className="text-ink-400">Disponible 120 m² · Zona Gastro</span>
                  </div>
                  <div>
                    <span className="inline-block rounded bg-terra/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-terra">
                      2 Ofertas
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: Financiero */}
        {activeTab === "financiero" && (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-hairline bg-sand-50 p-4 sm:p-5">
              <h3 className="font-display text-base sm:text-lg font-bold text-ink mb-1">
                Rendimiento de Ventas por m²
              </h3>
              <p className="text-xs text-ink-500 mb-3.5">
                Ventas promedio reportadas por inquilinos.
              </p>

              <div className="mb-3.5 rounded-md border border-hairline bg-sand-100 p-3 space-y-2">
                <div className="flex flex-col sm:flex-row justify-between text-xs gap-0.5">
                  <span className="text-ink-500">Ventas promedio por m²:</span>
                  <span className="font-semibold text-ink">$4,350 MXN / m²</span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between text-xs gap-0.5">
                  <span className="text-ink-500">Effort Rate (Venta vs Renta):</span>
                  <span className="font-semibold text-pine">8.1% (&lt;12% Excelente)</span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between text-xs gap-0.5">
                  <span className="text-ink-500">Giro líder en ventas:</span>
                  <span className="font-semibold text-terra">Gastronomía & Bares</span>
                </div>
              </div>

              <p className="text-[11px] sm:text-xs text-ink-500">
                * 96% de los inquilinos registraron su reporte mensual de ventas antes del 5 del mes.
              </p>
            </div>

            <div className="rounded-lg border border-hairline bg-sand-50 p-4 sm:p-5">
              <h3 className="font-display text-base sm:text-lg font-bold text-ink mb-1">
                Gestión Financiera
              </h3>
              <p className="text-xs text-ink-500 mb-3.5">
                Estados de cuenta y facturación.
              </p>

              <div className="grid gap-2.5">
                <button
                  type="button"
                  onClick={() => alert("Descargando Estado de Cuenta Consolidado...")}
                  className="flex items-center justify-between rounded-md border border-hairline bg-sand-100 p-3 text-left transition-colors hover:border-terra cursor-pointer"
                >
                  <div>
                    <span className="block text-xs font-semibold text-ink">
                      Estado de Cuenta Consolidado
                    </span>
                    <span className="text-[11px] text-ink-400">
                      Renta base, CAM y publicidad.
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-terra shrink-0 pl-2">Descargar →</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal("ventas")}
                  className="flex items-center justify-between rounded-md border border-hairline bg-sand-100 p-3 text-left transition-colors hover:border-terra cursor-pointer"
                >
                  <div>
                    <span className="block text-xs font-semibold text-ink">
                      Cargar Reporte de Ventas Mensual
                    </span>
                    <span className="text-[11px] text-ink-400">
                      Formulario digital para inquilinos.
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-terra shrink-0 pl-2">Subir →</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Operaciones & Incidencias (Table on Desktop, Sleek Cards on Mobile) */}
        {activeTab === "operaciones" && (
          <div className="rounded-lg border border-hairline bg-sand-50 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-ink mb-0.5">
                  Mantenimiento & Mesa de Ayuda
                </h3>
                <p className="text-xs text-ink-500">
                  Seguimiento de tickets de servicio en plaza.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal("ticket")}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-terra px-3.5 py-2 text-xs font-semibold text-sand-100 transition-colors hover:bg-terra-600 cursor-pointer w-full sm:w-auto"
              >
                + Nuevo Ticket de Mantenimiento
              </button>
            </div>

            {/* Mobile View: Clean Ticket Cards */}
            <div className="block sm:hidden space-y-2.5">
              <div className="rounded-md border border-hairline bg-sand-100 p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-terra">#INC-402</span>
                  <span className="rounded bg-gold/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-gold">
                    En Progreso
                  </span>
                </div>
                <div className="font-semibold text-ink text-sm">260 Grill & Bar (A-02)</div>
                <div className="text-ink-600 mt-0.5">Compresor HVAC Terraza</div>
                <div className="text-ink-400 text-[11px] mt-1 pt-1 border-t border-hairline">
                  Técnico: Carlos R. (Climas)
                </div>
              </div>

              <div className="rounded-md border border-hairline bg-sand-100 p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-terra">#INC-401</span>
                  <span className="rounded bg-pine/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-pine">
                    Resuelto
                  </span>
                </div>
                <div className="font-semibold text-ink text-sm">Alma Verde (C-01)</div>
                <div className="text-ink-600 mt-0.5">Mantenimiento Trampa de Grasa</div>
                <div className="text-ink-400 text-[11px] mt-1 pt-1 border-t border-hairline">
                  Técnico: Servicios Plaza
                </div>
              </div>

              <div className="rounded-md border border-hairline bg-sand-100 p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-terra">#INC-398</span>
                  <span className="rounded bg-pine/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-pine">
                    Resuelto
                  </span>
                </div>
                <div className="font-semibold text-ink text-sm">Baja Brunch (B-05)</div>
                <div className="text-ink-600 mt-0.5">Sustitución Luminaria Terraza</div>
                <div className="text-ink-400 text-[11px] mt-1 pt-1 border-t border-hairline">
                  Técnico: Eléctrico Plaza
                </div>
              </div>
            </div>

            {/* Desktop View: Full Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-hairline text-ink-400 font-mono uppercase text-[10.5px]">
                    <th className="pb-2.5 font-normal">Ticket</th>
                    <th className="pb-2.5 font-normal">Inquilino / Ubicación</th>
                    <th className="pb-2.5 font-normal">Detalle de Incidencia</th>
                    <th className="pb-2.5 font-normal">Técnico</th>
                    <th className="pb-2.5 font-normal">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-ink-700">
                  <tr>
                    <td className="py-3 font-mono font-semibold text-terra">#INC-402</td>
                    <td className="py-3 font-medium text-ink">260 Grill & Bar (A-02)</td>
                    <td className="py-3">Compresor HVAC Terraza</td>
                    <td className="py-3">Carlos R. (Climas)</td>
                    <td className="py-3">
                      <span className="inline-block rounded bg-gold/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-gold">
                        En Progreso
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 font-mono font-semibold text-terra">#INC-401</td>
                    <td className="py-3 font-medium text-ink">Alma Verde (C-01)</td>
                    <td className="py-3">Mantenimiento Trampa de Grasa</td>
                    <td className="py-3">Servicios Plaza</td>
                    <td className="py-3">
                      <span className="inline-block rounded bg-pine/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-pine">
                        Resuelto
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 font-mono font-semibold text-terra">#INC-398</td>
                    <td className="py-3 font-medium text-ink">Baja Brunch (B-05)</td>
                    <td className="py-3">Sustitución Luminaria Terraza</td>
                    <td className="py-3">Eléctrico Plaza</td>
                    <td className="py-3">
                      <span className="inline-block rounded bg-pine/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-pine">
                        Resuelto
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ---------------- 3. Interactive Modals ---------------- */}

      {/* Modal 1: Ticket submission */}
      {activeModal === "ticket" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-sand-100 p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
              <h3 className="font-display text-lg sm:text-xl font-bold text-ink">
                Reportar Incidencia de Mantenimiento
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setTicketSubmitted(false);
                }}
                className="text-ink-400 hover:text-ink font-mono text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {ticketSubmitted ? (
              <div className="py-6 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pine/20 text-pine text-xl mb-2">
                  ✓
                </span>
                <h4 className="font-display text-lg font-bold text-ink">Ticket #INC-403 Creado</h4>
                <p className="mt-2 text-xs sm:text-sm text-ink-500">
                  El equipo técnico de La Gran Vía responderá en menos de 45 minutos.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setTicketSubmitted(false);
                  }}
                  className="mt-5 rounded-md bg-ink px-5 py-2 text-xs font-semibold text-sand-100 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setTicketSubmitted(true);
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-semibold text-ink mb-1">Nombre del Local / Inquilino</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Alma Verde (Local C-01)"
                    className="w-full rounded-md border border-hairline bg-sand-50 p-2.5 text-ink outline-none focus:border-terra text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">Tipo de Servicio</label>
                  <select className="w-full rounded-md border border-hairline bg-sand-50 p-2.5 text-ink outline-none focus:border-terra text-xs">
                    <option>Climatización / HVAC</option>
                    <option>Plomería & Agua</option>
                    <option>Electricidad & Iluminación</option>
                    <option>Seguridad & Estacionamiento</option>
                    <option>Limpieza Area Común</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">Descripción del Problema</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe los detalles..."
                    className="w-full rounded-md border border-hairline bg-sand-50 p-2.5 text-ink outline-none focus:border-terra text-xs"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="rounded-md border border-hairline px-4 py-2 font-semibold text-ink cursor-pointer hover:bg-sand-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-terra px-4 py-2 font-semibold text-sand-100 cursor-pointer hover:bg-terra-600"
                  >
                    Enviar Ticket →
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Sales report */}
      {activeModal === "ventas" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-sand-100 p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
              <h3 className="font-display text-lg sm:text-xl font-bold text-ink">
                Reporte Mensual de Ventas
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setSalesSubmitted(false);
                }}
                className="text-ink-400 hover:text-ink font-mono text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {salesSubmitted ? (
              <div className="py-6 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pine/20 text-pine text-xl mb-2">
                  ✓
                </span>
                <h4 className="font-display text-lg font-bold text-ink">Reporte Registrado</h4>
                <p className="mt-2 text-xs sm:text-sm text-ink-500">
                  Tu informe mensual de ventas para Julio 2026 ha sido guardado correctamente.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setSalesSubmitted(false);
                  }}
                  className="mt-5 rounded-md bg-ink px-5 py-2 text-xs font-semibold text-sand-100 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSalesSubmitted(true);
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-semibold text-ink mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Bodega 8"
                    className="w-full rounded-md border border-hairline bg-sand-50 p-2.5 text-ink outline-none focus:border-terra text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">Mes a Reportar</label>
                  <input
                    type="text"
                    disabled
                    value="Julio 2026"
                    className="w-full rounded-md border border-hairline bg-sand-200 p-2.5 font-mono text-ink text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">Total Ventas Brutas ($ MXN)</label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    className="w-full rounded-md border border-hairline bg-sand-50 p-2.5 text-ink outline-none focus:border-terra font-mono text-xs"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="rounded-md border border-hairline px-4 py-2 font-semibold text-ink cursor-pointer hover:bg-sand-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-pine px-4 py-2 font-semibold text-sand-100 cursor-pointer hover:bg-pine-600"
                  >
                    Confirmar & Enviar →
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: Download Regulations */}
      {activeModal === "reglamentos" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-sand-100 p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
              <h3 className="font-display text-lg sm:text-xl font-bold text-ink">
                Reglamentos & Lineamientos
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-ink-400 hover:text-ink font-mono text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-hairline bg-sand-50 p-3">
                <div>
                  <span className="font-semibold text-ink block text-sm">Reglamento General 2026</span>
                  <span className="text-ink-400">PDF · 2.4 MB · Horarios y normas</span>
                </div>
                <button
                  type="button"
                  onClick={() => alert("Descargando Reglamento General 2026...")}
                  className="rounded bg-gold px-3 py-1.5 font-semibold text-ink hover:bg-gold/80 cursor-pointer text-center"
                >
                  Descargar
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-hairline bg-sand-50 p-3">
                <div>
                  <span className="font-semibold text-ink block text-sm">Manual de Remodelaciones</span>
                  <span className="text-ink-400">PDF · 1.8 MB · Lineamientos de fit-out</span>
                </div>
                <button
                  type="button"
                  onClick={() => alert("Descargando Manual de Fit-Out...")}
                  className="rounded bg-gold px-3 py-1.5 font-semibold text-ink hover:bg-gold/80 cursor-pointer text-center"
                >
                  Descargar
                </button>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-md bg-ink px-4 py-2 font-semibold text-sand-100 cursor-pointer text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
