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
    <div className="w-full space-y-8">
      {/* ---------------- 1. Quick Utility Bar (Sleek Compact Cards) ---------------- */}
      <div className="grid gap-4 md:grid-cols-3">
        {HUB_ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => setActiveModal(action.key)}
            className="group flex cursor-pointer items-center justify-between rounded-lg border border-hairline bg-sand-100 p-4.5 text-left transition-all duration-200 hover:border-ink hover:bg-sand-50 hover:shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sand-100",
                  action.accent === "terra" && "bg-terra",
                  action.accent === "pine" && "bg-pine",
                  action.accent === "gold" && "bg-gold"
                )}
              >
                {action.icon === "diamond" && (
                  <span className="h-3 w-3 bg-sand-100 rotate-45 rounded-[1px]" />
                )}
                {action.icon === "circle" && (
                  <span className="h-3 w-3 bg-sand-100 rounded-full" />
                )}
                {action.icon === "square" && (
                  <span className="h-3 w-3 bg-sand-100 rounded-[1px]" />
                )}
              </div>
              <div>
                <span className="block font-display text-base font-bold text-ink">
                  {action.title}
                </span>
                <span className="block font-mono text-[10.5px] tracking-[0.08em] text-ink-400 uppercase">
                  {action.en}
                </span>
              </div>
            </div>
            <span className="text-sm font-semibold text-terra transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </button>
        ))}
      </div>

      {/* ---------------- 2. MAIN COMPONENT: Landlord Control Panel ---------------- */}
      <section
        id="panel-administracion"
        aria-labelledby="landlord-titulo"
        className="rounded-xl border border-hairline-strong bg-sand-100 p-6 shadow-md sm:p-8"
      >
        {/* Header Bar */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-hairline pb-6 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-pine/30 bg-pine/10 px-3 py-1 font-mono text-[11px] font-semibold text-pine uppercase">
                <span className="h-2 w-2 rounded-full bg-pine animate-pulse" />
                Control Operativo & Asset Management
              </span>
              <span className="font-mono text-[11px] text-ink-400">
                // La Gran Vía Mexicali
              </span>
            </div>
            <h2 id="landlord-titulo" className="font-display text-2xl sm:text-3xl font-bold text-ink">
              Panel de Control General
            </h2>
            <p className="mt-1 text-sm text-ink-500 max-w-2xl">
              Consola central para propietarios, administradores y equipo operativo de La Gran Vía.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="rounded-md border border-hairline bg-sand-200 px-3 py-1.5 font-mono text-xs text-ink-700 font-medium">
              Julio 2026
            </span>
            <button
              type="button"
              onClick={() => alert("Generando reporte PDF consolidado...")}
              className="cursor-pointer rounded-md bg-ink px-4 py-1.5 text-xs font-semibold text-sand-100 transition-colors hover:bg-ink-700"
            >
              Exportar Reporte (.PDF)
            </button>
          </div>
        </div>

        {/* Executive KPI Bar */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-hairline bg-sand-50 p-4.5">
            <p className="font-mono text-[10.5px] tracking-[0.1em] text-ink-400 uppercase">
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

          <div className="rounded-lg border border-hairline bg-sand-50 p-4.5">
            <p className="font-mono text-[10.5px] tracking-[0.1em] text-ink-400 uppercase">
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

          <div className="rounded-lg border border-hairline bg-sand-50 p-4.5">
            <p className="font-mono text-[10.5px] tracking-[0.1em] text-ink-400 uppercase">
              Cobranza Renta & CAM
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-display text-3xl font-bold text-ink">98.5%</span>
              <span className="font-mono text-xs font-semibold text-gold">Al día</span>
            </div>
            <p className="mt-1.5 text-[12px] text-ink-500">
              $2.45M MXN recaudados en fecha
            </p>
          </div>

          <div className="rounded-lg border border-hairline bg-sand-50 p-4.5">
            <p className="font-mono text-[10.5px] tracking-[0.1em] text-ink-400 uppercase">
              Mesa de Ayuda
            </p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-display text-3xl font-bold text-ink">4 Abiertas</span>
              <span className="font-mono text-xs font-semibold text-terra">SLA &lt;45 min</span>
            </div>
            <p className="mt-1.5 text-[12px] text-ink-500">
              2 HVAC · 1 Limpieza · 1 Estacionamiento
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-hairline">
          <nav className="flex gap-6 overflow-x-auto" aria-label="Secciones del panel">
            <button
              type="button"
              onClick={() => setActiveTab("ocupacion")}
              className={cn(
                "cursor-pointer border-b-2 pb-3 text-sm font-semibold whitespace-nowrap transition-colors",
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
                "cursor-pointer border-b-2 pb-3 text-sm font-semibold whitespace-nowrap transition-colors",
                activeTab === "financiero"
                  ? "border-terra text-terra"
                  : "border-transparent text-ink-500 hover:text-ink"
              )}
            >
              💰 Rendimiento Financiero & Ventas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("operaciones")}
              className={cn(
                "cursor-pointer border-b-2 pb-3 text-sm font-semibold whitespace-nowrap transition-colors",
                activeTab === "operaciones"
                  ? "border-terra text-terra"
                  : "border-transparent text-ink-500 hover:text-ink"
              )}
            >
              🛠️ Mesa de Ayuda & Mantenimiento
            </button>
          </nav>
        </div>

        {/* Tab 1: Ocupación & Mix */}
        {activeTab === "ocupacion" && (
          <div className="grid gap-6 lg:grid-cols-2">
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
                    <span className="text-ink-700">Entretenimiento & Hoteles</span>
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
                  <span className="inline-block rounded bg-pine/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-pine">
                    Vence Oct 2026 · Renovado
                  </span>
                </li>

                <li className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-ink block text-sm">Cinépolis VIP</span>
                    <span className="text-ink-400">Entretenimiento · Ancla Principal</span>
                  </div>
                  <span className="inline-block rounded bg-pine/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-pine">
                    Vence Nov 2026 · Contrato Seguro
                  </span>
                </li>

                <li className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-ink block text-sm">MINT Boutique</span>
                    <span className="text-ink-400">Moda Mujer · Local B-12</span>
                  </div>
                  <span className="inline-block rounded bg-gold/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-gold">
                    Vence Dic 2026 · En Negociación
                  </span>
                </li>

                <li className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-ink block text-sm">Local C-08 (Vacante)</span>
                    <span className="text-ink-400">Disponible 120 m² · Zona Gastro</span>
                  </div>
                  <span className="inline-block rounded bg-terra/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-terra">
                    2 Ofertas Recibidas
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: Financiero */}
        {activeTab === "financiero" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-hairline bg-sand-50 p-5">
              <h3 className="font-display text-lg font-bold text-ink mb-1">
                Rendimiento de Ventas por m²
              </h3>
              <p className="text-xs text-ink-500 mb-4">
                Ventas promedio reportadas por inquilinos comparadas contra el costo de renta.
              </p>

              <div className="mb-4 rounded-md border border-hairline bg-sand-100 p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-500">Ventas promedio por m²:</span>
                  <span className="font-semibold text-ink">$4,350 MXN / m²</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-500">Razón Venta vs Renta (Effort Rate):</span>
                  <span className="font-semibold text-pine">8.1% (Excelente &lt;12%)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-500">Categoría líder en facturación:</span>
                  <span className="font-semibold text-terra">Gastronomía & Bares</span>
                </div>
              </div>

              <p className="text-xs text-ink-500">
                * 96% de los inquilinos registraron su reporte mensual de ventas antes del 5 del mes.
              </p>
            </div>

            <div className="rounded-lg border border-hairline bg-sand-50 p-5">
              <h3 className="font-display text-lg font-bold text-ink mb-1">
                Gestión Financiera
              </h3>
              <p className="text-xs text-ink-500 mb-4">
                Emisión de estados de cuenta y facturación fiscal.
              </p>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => alert("Descargando Estado de Cuenta Consolidado...")}
                  className="flex items-center justify-between rounded-md border border-hairline bg-sand-100 p-3 text-left transition-colors hover:border-terra cursor-pointer"
                >
                  <div>
                    <span className="block text-xs font-semibold text-ink">
                      Estado de Cuenta Consolidado (Julio)
                    </span>
                    <span className="text-[11px] text-ink-400">
                      Incluye renta base, mantenimiento y cuota de publicidad.
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-terra">Descargar →</span>
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
                      Formulario digital para arrendatarios.
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-terra">Subir →</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Operaciones */}
        {activeTab === "operaciones" && (
          <div className="rounded-lg border border-hairline bg-sand-50 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-ink mb-0.5">
                  Mesa de Ayuda & Mantenimiento
                </h3>
                <p className="text-xs text-ink-500">
                  Seguimiento en tiempo real de tickets de mantenimiento en plaza.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal("ticket")}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-terra px-3.5 py-1.5 text-xs font-semibold text-sand-100 transition-colors hover:bg-terra-600 cursor-pointer"
              >
                + Nuevo Ticket de Mantenimiento
              </button>
            </div>

            <div className="overflow-x-auto">
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

      {/* ---------------- 3. Interactive Utility Modals ---------------- */}

      {/* Modal 1: Ticket submission */}
      {activeModal === "ticket" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-sand-100 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-hairline pb-4 mb-4">
              <h3 className="font-display text-xl font-bold text-ink">
                Reportar Incidencia de Mantenimiento
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setTicketSubmitted(false);
                }}
                className="text-ink-400 hover:text-ink font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {ticketSubmitted ? (
              <div className="py-8 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-pine/20 text-pine text-2xl mb-3">
                  ✓
                </span>
                <h4 className="font-display text-xl font-bold text-ink">Ticket #INC-403 Creado</h4>
                <p className="mt-2 text-sm text-ink-500">
                  El equipo técnico de La Gran Vía ha recibido la solicitud y responderá en menos de 45 minutos.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setTicketSubmitted(false);
                  }}
                  className="mt-6 rounded-md bg-ink px-5 py-2 text-xs font-semibold text-sand-100 cursor-pointer"
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
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-ink mb-1">Nombre del Local / Inquilino</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Alma Verde (Local C-01)"
                    className="w-full rounded-md border border-hairline bg-sand-50 p-2.5 text-ink outline-none focus:border-terra"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">Tipo de Servicio</label>
                  <select className="w-full rounded-md border border-hairline bg-sand-50 p-2.5 text-ink outline-none focus:border-terra">
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
                    placeholder="Describe los detalles de la incidencia..."
                    className="w-full rounded-md border border-hairline bg-sand-50 p-2.5 text-ink outline-none focus:border-terra"
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
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-sand-100 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-hairline pb-4 mb-4">
              <h3 className="font-display text-xl font-bold text-ink">
                Reporte Mensual de Ventas
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setSalesSubmitted(false);
                }}
                className="text-ink-400 hover:text-ink font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {salesSubmitted ? (
              <div className="py-8 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-pine/20 text-pine text-2xl mb-3">
                  ✓
                </span>
                <h4 className="font-display text-xl font-bold text-ink">Reporte Registrado</h4>
                <p className="mt-2 text-sm text-ink-500">
                  Tu informe mensual de ventas para Julio 2026 ha sido guardado correctamente.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setSalesSubmitted(false);
                  }}
                  className="mt-6 rounded-md bg-ink px-5 py-2 text-xs font-semibold text-sand-100 cursor-pointer"
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
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-ink mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Bodega 8"
                    className="w-full rounded-md border border-hairline bg-sand-50 p-2.5 text-ink outline-none focus:border-terra"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">Mes a Reportar</label>
                  <input
                    type="text"
                    disabled
                    value="Julio 2026"
                    className="w-full rounded-md border border-hairline bg-sand-200 p-2.5 font-mono text-ink"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">Total de Ventas Brutas ($ MXN)</label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    className="w-full rounded-md border border-hairline bg-sand-50 p-2.5 text-ink outline-none focus:border-terra font-mono"
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
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-sand-100 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-hairline pb-4 mb-4">
              <h3 className="font-display text-xl font-bold text-ink">
                Reglamentos & Lineamientos Vigentes
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-ink-400 hover:text-ink font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-md border border-hairline bg-sand-50 p-3">
                <div>
                  <span className="font-semibold text-ink block text-sm">Reglamento General de Operaciones 2026</span>
                  <span className="text-ink-400">PDF · 2.4 MB · Horarios, carga/descarga y ruido</span>
                </div>
                <button
                  type="button"
                  onClick={() => alert("Descargando Reglamento General 2026...")}
                  className="rounded bg-gold px-3 py-1.5 font-semibold text-ink hover:bg-gold/80 cursor-pointer"
                >
                  Descargar
                </button>
              </div>

              <div className="flex items-center justify-between rounded-md border border-hairline bg-sand-50 p-3">
                <div>
                  <span className="font-semibold text-ink block text-sm">Manual de Fit-Out & Remodelaciones</span>
                  <span className="text-ink-400">PDF · 1.8 MB · Lineamientos arquitectónicos</span>
                </div>
                <button
                  type="button"
                  onClick={() => alert("Descargando Manual de Fit-Out...")}
                  className="rounded bg-gold px-3 py-1.5 font-semibold text-ink hover:bg-gold/80 cursor-pointer"
                >
                  Descargar
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-md bg-ink px-4 py-2 font-semibold text-sand-100 cursor-pointer"
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
