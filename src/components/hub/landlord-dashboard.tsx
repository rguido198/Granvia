"use client";

import { useState } from "react";
import { cn } from "@/components/ui";

type DashboardTab = "ocupacion" | "financiero" | "operaciones";

export function LandlordDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("ocupacion");

  return (
    <section
      id="panel-administracion"
      aria-labelledby="landlord-titulo"
      className="mt-14 rounded-xl border border-hairline-strong bg-sand-100 p-6 shadow-sm sm:p-8"
    >
      {/* ---------------- Header & Control Bar ---------------- */}
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-hairline pb-6 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-pine/30 bg-pine/10 px-3 py-1 font-mono text-[11px] font-semibold text-pine uppercase">
              <span className="h-2 w-2 rounded-full bg-pine animate-pulse" />
              Vista de Propietarios & Asset Management
            </span>
            <span className="font-mono text-[11px] text-ink-400">
              // Actualizado hoy 12:00 PM
            </span>
          </div>
          <h2 id="landlord-titulo" className="font-display text-2xl sm:text-3xl font-bold text-ink">
            Panel de Control de la Plaza
          </h2>
          <p className="mt-1 text-sm text-ink-500 max-w-2xl">
            Monitoreo en tiempo real de ocupación, salud financiera, afluencia de visitantes y estado operativo de La Gran Vía.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-hairline bg-sand-200 px-3 py-1.5 font-mono text-xs text-ink-700 font-medium">
            Julio 2026
          </span>
          <button
            type="button"
            className="cursor-pointer rounded-md bg-ink px-3.5 py-1.5 text-xs font-semibold text-sand-100 transition-colors hover:bg-ink-700"
          >
            Descargar Reporte (.PDF)
          </button>
        </div>
      </div>

      {/* ---------------- Key Performance Indicators (KPIs) ---------------- */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 */}
        <div className="rounded-lg border border-hairline bg-sand-50 p-4.5">
          <p className="font-mono text-[11px] tracking-[0.1em] text-ink-400 uppercase">
            Tasa de Ocupación
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold text-ink">94.1%</span>
            <span className="font-mono text-xs font-semibold text-pine">+2.4% vs 2025</span>
          </div>
          <p className="mt-1.5 text-[12px] text-ink-500">
            79 Locales · 3 Pop-Ups · 2 Vacantes
          </p>
        </div>

        {/* KPI 2 */}
        <div className="rounded-lg border border-hairline bg-sand-50 p-4.5">
          <p className="font-mono text-[11px] tracking-[0.1em] text-ink-400 uppercase">
            Afluencia Mensual
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold text-ink">142,800</span>
            <span className="font-mono text-xs font-semibold text-pine">+8.4% YoY</span>
          </div>
          <p className="mt-1.5 text-[12px] text-ink-500">
            Pico: Viernes a Domingo 6-11 PM
          </p>
        </div>

        {/* KPI 3 */}
        <div className="rounded-lg border border-hairline bg-sand-50 p-4.5">
          <p className="font-mono text-[11px] tracking-[0.1em] text-ink-400 uppercase">
            Cobranza de Renta & CAM
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold text-ink">98.5%</span>
            <span className="font-mono text-xs font-semibold text-gold">Al día</span>
          </div>
          <p className="mt-1.5 text-[12px] text-ink-500">
            $2.45M MXN recaudados en fecha
          </p>
        </div>

        {/* KPI 4 */}
        <div className="rounded-lg border border-hairline bg-sand-50 p-4.5">
          <p className="font-mono text-[11px] tracking-[0.1em] text-ink-400 uppercase">
            Incidencias Operativas
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold text-ink">4 Abiertas</span>
            <span className="font-mono text-xs font-semibold text-terra">Atención &lt;45 min</span>
          </div>
          <p className="mt-1.5 text-[12px] text-ink-500">
            2 HVAC · 1 Limpieza · 1 Estacionamiento
          </p>
        </div>
      </div>

      {/* ---------------- Navigation Tabs ---------------- */}
      <div className="mb-6 border-b border-hairline">
        <nav className="flex gap-6" aria-label="Secciones del panel">
          <button
            type="button"
            onClick={() => setActiveTab("ocupacion")}
            className={cn(
              "cursor-pointer border-b-2 pb-3 text-sm font-semibold transition-colors",
              activeTab === "ocupacion"
                ? "border-terra text-terra"
                : "border-transparent text-ink-500 hover:text-ink"
            )}
          >
            📊 Ocupación & Tenant Mix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("financiero")}
            className={cn(
              "cursor-pointer border-b-2 pb-3 text-sm font-semibold transition-colors",
              activeTab === "financiero"
                ? "border-terra text-terra"
                : "border-transparent text-ink-500 hover:text-ink"
            )}
          >
            💰 Salud Financiera & Ventas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("operaciones")}
            className={cn(
              "cursor-pointer border-b-2 pb-3 text-sm font-semibold transition-colors",
              activeTab === "operaciones"
                ? "border-terra text-terra"
                : "border-transparent text-ink-500 hover:text-ink"
            )}
          >
            🛠️ Estado Operativo & Tickets
          </button>
        </nav>
      </div>

      {/* ---------------- Tab Content ---------------- */}
      {activeTab === "ocupacion" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tenant Mix breakdown */}
          <div className="rounded-lg border border-hairline bg-sand-50 p-5">
            <h3 className="font-display text-lg font-bold text-ink mb-1">
              Distribución de Giros Comerciales (Tenant Mix)
            </h3>
            <p className="text-xs text-ink-500 mb-4">
              Equilibrio estratégico para maximizar la permanencia del visitante en plaza.
            </p>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-ink-700">Gastronomía, Bares & Cafés</span>
                  <span className="text-terra">35% (29 locales)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
                  <div className="h-full bg-terra" style={{ width: "35%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-ink-700">Moda, Boutiques & Accesorios</span>
                  <span className="text-pine">28% (23 locales)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
                  <div className="h-full bg-pine" style={{ width: "28%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-ink-700">Salud, Bienestar & Belleza</span>
                  <span className="text-gold">18% (15 locales)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
                  <div className="h-full bg-gold" style={{ width: "18%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-ink-700">Entretenimiento, Cine & Hoteles</span>
                  <span className="text-ink-700">13% (11 locales)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
                  <div className="h-full bg-ink-700" style={{ width: "13%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-ink-700">Espacios Pop-Up Flexibles</span>
                  <span className="text-pine">6% (5 locales)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
                  <div className="h-full bg-pine/60" style={{ width: "6%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming lease renewals */}
          <div className="rounded-lg border border-hairline bg-sand-50 p-5">
            <h3 className="font-display text-lg font-bold text-ink mb-1">
              Próximos Vencimientos de Contrato (Q3-Q4 2026)
            </h3>
            <p className="text-xs text-ink-500 mb-4">
              Pipeline de renovaciones prioritarias y estado de negociación.
            </p>

            <ul className="divide-y divide-hairline text-xs">
              <li className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-ink block text-sm">Bodega 8</span>
                  <span className="text-ink-400">Restaurante & Bar · Local A-04</span>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded bg-pine/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-pine">
                    Vence Oct 2026 · Renovación Firmada
                  </span>
                </div>
              </li>

              <li className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-ink block text-sm">Cinépolis VIP</span>
                  <span className="text-ink-400">Entretenimiento · Ancla Principal</span>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded bg-pine/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-pine">
                    Vence Nov 2026 · Contrato Seguro
                  </span>
                </div>
              </li>

              <li className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-ink block text-sm">MINT Boutique</span>
                  <span className="text-ink-400">Moda Mujer · Local B-12</span>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded bg-gold/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-gold">
                    Vence Dic 2026 · En Negociación
                  </span>
                </div>
              </li>

              <li className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-ink block text-sm">Local C-08 (Vacante)</span>
                  <span className="text-ink-400">Disponible 120 m² · Zona Gastro</span>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded bg-terra/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-terra">
                    2 Propuestas de Arrendamiento
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === "financiero" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sales Performance */}
          <div className="rounded-lg border border-hairline bg-sand-50 p-5">
            <h3 className="font-display text-lg font-bold text-ink mb-1">
              Rendimiento de Ventas por m²
            </h3>
            <p className="text-xs text-ink-500 mb-4">
              Ventas promedio reportadas por inquilinos comparadas contra el costo de renta.
            </p>

            <div className="mb-4 rounded-md border border-hairline bg-sand-100 p-3.5">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-ink-500">Ventas promedio por m²:</span>
                <span className="font-semibold text-ink">$4,350 MXN / m²</span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-ink-500">Razón Venta vs Renta (Effort Rate):</span>
                <span className="font-semibold text-pine">8.1% (Muy Saludable &lt;12%)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-500">Categoría líder en facturación:</span>
                <span className="font-semibold text-terra">Gastronomía & Bares</span>
              </div>
            </div>

            <div className="text-xs text-ink-500">
              * El 96% de los inquilinos entregaron su reporte mensual de ventas a tiempo a través de este portal.
            </div>
          </div>

          {/* Quick Financial Operations */}
          <div className="rounded-lg border border-hairline bg-sand-50 p-5">
            <h3 className="font-display text-lg font-bold text-ink mb-1">
              Acciones Financieras del Administrador
            </h3>
            <p className="text-xs text-ink-500 mb-4">
              Gestión directa de estado de cuenta y facturación fiscal.
            </p>

            <div className="grid gap-3">
              <button
                type="button"
                className="flex items-center justify-between rounded-md border border-hairline bg-sand-100 p-3 text-left transition-colors hover:border-terra"
              >
                <div>
                  <span className="block text-xs font-semibold text-ink">
                    Generar Estado de Cuenta Consolidado
                  </span>
                  <span className="text-[11px] text-ink-400">
                    Incluye renta base, mantenimientos y cuota de publicidad.
                  </span>
                </div>
                <span className="text-xs font-semibold text-terra">Exportar →</span>
              </button>

              <button
                type="button"
                className="flex items-center justify-between rounded-md border border-hairline bg-sand-100 p-3 text-left transition-colors hover:border-terra"
              >
                <div>
                  <span className="block text-xs font-semibold text-ink">
                    Conciliación de Pagos CAM (Mantenimiento)
                  </span>
                  <span className="text-[11px] text-ink-400">
                    48 recibos validados automáticamente este mes.
                  </span>
                </div>
                <span className="text-xs font-semibold text-terra">Revisar →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "operaciones" && (
        <div className="rounded-lg border border-hairline bg-sand-50 p-5">
          <h3 className="font-display text-lg font-bold text-ink mb-1">
            Feed en Vivo de Incidencias & Mantenimiento
          </h3>
          <p className="text-xs text-ink-500 mb-4">
            Reportes registrados por inquilinos y estatus de atención por el equipo técnico de La Gran Vía.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-hairline text-ink-400 font-mono uppercase text-[10.5px]">
                  <th className="pb-2.5 font-normal">ID Ticket</th>
                  <th className="pb-2.5 font-normal">Inquilino / Ubicación</th>
                  <th className="pb-2.5 font-normal">Tipo de Incidencia</th>
                  <th className="pb-2.5 font-normal">Técnico Asignado</th>
                  <th className="pb-2.5 font-normal">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-ink-700">
                <tr>
                  <td className="py-3 font-mono font-semibold text-terra">#INC-402</td>
                  <td className="py-3 font-medium text-ink">260 Grill & Bar (A-02)</td>
                  <td className="py-3">Ajuste de Compresor HVAC</td>
                  <td className="py-3">Carlos R. (Climas)</td>
                  <td className="py-3">
                    <span className="inline-block rounded bg-gold/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-gold">
                      En Progreso (30m)
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="py-3 font-mono font-semibold text-terra">#INC-401</td>
                  <td className="py-3 font-medium text-ink">Alma Verde (C-01)</td>
                  <td className="py-3">Revisión Trampa de Grasa</td>
                  <td className="py-3">Servicios Plaza</td>
                  <td className="py-3">
                    <span className="inline-block rounded bg-pine/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-pine">
                      Resuelto (Hace 2h)
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
                      Resuelto (Ayer)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
