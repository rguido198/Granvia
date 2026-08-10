"use client";

import { useState } from "react";
import type {
  ConsoleData,
} from "@/lib/console-data";

type SidebarTab = "analytics" | "rentroll" | "cam" | "maint" | "legal" | "erp";

/**
 * Format currency in MXN with optional decimals
 */
function formatMxn(val: number, decimals = 0) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(val);
}

/**
 * SVG Sparkline Curve for Metric Cards (Monochrome & Understated)
 */
function Sparkline({ data, color = "#0F172A" }: { data: number[]; color?: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * 120;
      const y = 32 - ((val - min) / range) * 26;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="w-24 h-8 overflow-visible" viewBox="0 0 120 32">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,32 ${points} 120,32`}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

/**
 * Institutional 12-Month Revenue & Collection Dual Line Chart (Achromatic Slate)
 */
function RevenueTrendChart() {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const contracted = [2.35, 2.38, 2.41, 2.42, 2.45, 2.46, 2.47, 2.48, 2.48, 2.48, 2.49, 2.50];
  const collected = [2.28, 2.34, 2.39, 2.40, 2.42, 2.45, 2.46, 2.48, 2.45, 2.46, 2.47, 2.49];
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(7); // Default August

  const width = 640;
  const height = 170;
  const paddingX = 40;
  const paddingY = 20;

  const minVal = 2.2;
  const maxVal = 2.55;

  const getX = (i: number) => paddingX + (i / (months.length - 1)) * (width - 2 * paddingX);
  const getY = (v: number) => height - paddingY - ((v - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);

  const contractedPoints = contracted.map((v, i) => `${getX(i)},${getY(v)}`).join(" ");
  const collectedPoints = collected.map((v, i) => `${getX(i)},${getY(v)}`).join(" ");

  return (
    <div className="relative w-full space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-900 tracking-tight">Actividad de Cobranza vs Facturación</h3>
          <p className="text-xs text-slate-500">Tendencia mensual de Renta Base en Millones MXN (2026)</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-slate-900">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
            Facturado
          </span>
          <span className="flex items-center gap-1.5 text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
            Recaudado
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[480px]">
          {[2.25, 2.35, 2.45].map((level) => (
            <g key={level}>
              <line
                x1={paddingX}
                y1={getY(level)}
                x2={width - paddingX}
                y2={getY(level)}
                stroke="#E2E8F0"
                strokeDasharray="4 4"
              />
              <text x="5" y={getY(level) + 4} className="text-[10px] fill-slate-400 font-medium">
                ${level}M
              </text>
            </g>
          ))}

          <polyline
            fill="none"
            stroke="#0F172A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={contractedPoints}
          />

          <polyline
            fill="none"
            stroke="#047857"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={collectedPoints}
          />

          {months.map((m, i) => {
            const cx = getX(i);
            const cyCol = getY(collected[i]);
            const cyCon = getY(contracted[i]);
            const isHovered = hoveredIdx === i;

            return (
              <g key={m} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(i)}>
                {isHovered && (
                  <line
                    x1={cx}
                    y1={paddingY}
                    x2={cx}
                    y2={height - paddingY}
                    stroke="#94A3B8"
                    strokeDasharray="2 2"
                    strokeWidth="1.5"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cyCol}
                  r={isHovered ? 5 : 3.5}
                  className="fill-emerald-700 stroke-white stroke-2 transition-all"
                />
                <circle
                  cx={cx}
                  cy={cyCon}
                  r={isHovered ? 5 : 3.5}
                  className="fill-slate-900 stroke-white stroke-2 transition-all"
                />
                <text
                  x={cx}
                  y={height - 4}
                  textAnchor="middle"
                  className={`text-[11px] transition-colors ${
                    isHovered ? "fill-slate-900 font-bold" : "fill-slate-500 font-medium"
                  }`}
                >
                  {m}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredIdx !== null && (
          <div
            className="absolute top-2 bg-slate-900 text-white rounded-xl p-3 text-xs shadow-xl border border-slate-700 pointer-events-none transition-all"
            style={{
              left: `${(hoveredIdx / (months.length - 1)) * 75 + 10}%`,
            }}
          >
            <p className="font-bold text-slate-200 mb-0.5">{months[hoveredIdx]} 2026</p>
            <p className="text-emerald-400 font-semibold">Recaudado: ${collected[hoveredIdx].toFixed(2)}M MXN</p>
            <p className="text-slate-300 font-medium">Facturado: ${contracted[hoveredIdx].toFixed(2)}M MXN</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main Landlord Asset Management Console Component
 */
export function LandlordDashboard({ data }: { data: ConsoleData }) {
  const {
    rentRoll,
    camRows,
    camMonthlyPool,
    leasedSqm,
    plazaTotalGla,
    contractedRent,
    occupancyRate,
    collectionRate,
    leasingApplicants,
    criticalEquipment,
    periodLabel,
    marianaReplies,
    diegoReplies,
    renataReplies,
  } = data;

  // View & Filter States
  const [activeTab, setActiveTab] = useState<SidebarTab>("analytics");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // AI Copilot Drawer State
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState<"renata" | "mariana" | "diego">("renata");
  const [userQuery, setUserQuery] = useState("");
  const [queryResult, setQueryResult] = useState<string | null>(null);

  // Interactive AI Action States & Simulations
  const [cfdiIssued, setCfdiIssued] = useState(false);
  const [attorneyNotified, setAttorneyNotified] = useState(false);
  const [hvacDispatched, setHvacDispatched] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Filtered Rent Roll Data
  const filteredRentRoll = rentRoll.filter((row) => {
    const matchesSearch =
      row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.zone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "ALL" || row.tag === categoryFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ALERT" && row.fiscalAlert) ||
      (statusFilter === "OK" && !row.fiscalAlert);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;

    const q = userQuery.toLowerCase();
    if (q.includes("mint") || q.includes("sat") || q.includes("cfdi") || q.includes("renata")) {
      setActiveAgent("renata");
      setQueryResult(
        "Renata AI (Fiscal & CAM): Inconsistencia detectada en MINT Boutique (Local B-12). Se registraron $18,400 MXN de cobro sin emisión de complemento CFDI 4.0. Utiliza el botón 'Emitir Complemento SAT' para regularizar."
      );
    } else if (q.includes("contrato") || q.includes("starbucks") || q.includes("dunkin") || q.includes("mariana")) {
      setActiveAgent("mariana");
      setQueryResult(
        "Mariana AI (Legal & Leasing): Conflicto de exclusividad detectado. La solicitud de Dunkin' Donuts viola la Cláusula 14.2 del contrato de Starbucks (Bóveda PDF página 4). Dictamen: RECHAZADO."
      );
    } else if (q.includes("climas") || q.includes("hvac") || q.includes("mantenimiento") || q.includes("diego")) {
      setActiveAgent("diego");
      setQueryResult(
        "Diego AI (CapEx & Ops): Póliza de garantía vigente con Climas de Mexicali para equipo MX-HVAC-9902 (Local A-04). Cobertura al 100% sin costo para la plaza."
      );
    } else {
      setQueryResult(
        `Gran Vía Asset Copilot: Consulta "${userQuery}" procesada. Rent Roll contratado: ${formatMxn(contractedRent)}, Ocupación: ${(occupancyRate * 100).toFixed(1)}%.`
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row font-sans antialiased">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-semibold animate-slideUp">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer font-bold">
            ✕
          </button>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-full lg:w-64 bg-white border-r border-slate-200/80 shrink-0 flex flex-col justify-between p-4.5 space-y-6">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-display font-bold text-sm shadow-sm">
              GV
            </div>
            <div>
              <h1 className="font-display font-bold text-slate-900 text-sm tracking-tight">La Gran Vía</h1>
              <p className="text-xs text-slate-500 font-medium">Asset Management Hub</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <p className="px-2 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Analítica & Operaciones
            </p>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>Resumen Ejecutivo</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeTab === "analytics" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500"}`}>
                General
              </span>
            </button>

            <button
              onClick={() => setActiveTab("rentroll")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "rentroll"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>Rent Roll & Ocupación</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                84 Locales
              </span>
            </button>

            <p className="px-2 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mt-6 mb-2">
              Módulos de Inteligencia (IA)
            </p>

            <button
              onClick={() => setActiveTab("cam")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "cam"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>Renata (CAM / SAT)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                1 Alerta
              </span>
            </button>

            <button
              onClick={() => setActiveTab("legal")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "legal"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>Mariana (Legal RAG)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                Contratos
              </span>
            </button>

            <button
              onClick={() => setActiveTab("maint")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "maint"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>Diego (CapEx & Ops)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                Garantías
              </span>
            </button>

            <button
              onClick={() => setActiveTab("erp")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "erp"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>Conector ERP SAP</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                Sincronizado
              </span>
            </button>
          </nav>
        </div>

        {/* Footer Session Badge */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="rounded-xl bg-slate-50 p-3 space-y-1 text-xs border border-slate-200/60">
            <div className="flex items-center justify-between text-slate-900 font-bold">
              <span>Propietario / Admin</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-xs text-slate-500 font-medium truncate">Sesión activa · {periodLabel}</p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* TOP HEADER BAR */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          {/* Global Search Bar */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por inquilino, local, contrato o serie..."
              className="w-full bg-slate-100/80 border border-slate-200/80 rounded-xl pl-4 pr-12 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all font-medium"
            />
            <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-400 border border-slate-200 bg-white px-2 py-0.5 rounded-md">
              ⌘K
            </span>
          </div>

          {/* Controls & AI Copilot Drawer Toggle */}
          <div className="flex items-center gap-3">
            <select className="bg-slate-100/80 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer">
              <option>{periodLabel}</option>
              <option>Julio 2026</option>
              <option>Q3 2026</option>
              <option>Año 2026</option>
            </select>

            <button
              onClick={() => triggerToast("Generando reporte ejecutivo en PDF...")}
              className="hidden sm:flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
            >
              Exportar PDF
            </button>

            <button
              onClick={() => setCopilotOpen(!copilotOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                copilotOpen
                  ? "bg-slate-800 text-white"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Copilot Sidebar</span>
            </button>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* TAB 1: ANALYTICS OVERVIEW DASHBOARD */}
          {activeTab === "analytics" && (
            <div className="space-y-6 animate-fadeIn">
              {/* TOP KPI CARDS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Renta Contratada Mensual
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      +3.5%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-display text-slate-900">
                      {formatMxn(contractedRent)}
                    </span>
                    <Sparkline data={[2.1, 2.2, 2.25, 2.3, 2.4, 2.45, 2.48]} color="#0F172A" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    79 de 84 locales con pago al día
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Ocupación de Plaza (GLA)
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      +1.2%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-display text-slate-900">
                      {(occupancyRate * 100).toFixed(1)}%
                    </span>
                    <Sparkline data={[94, 94.5, 95, 95.2, 95.8, 96, 96.4]} color="#0F172A" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {leasedSqm.toLocaleString("es-MX")} m² de {plazaTotalGla.toLocaleString("es-MX")} m²
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Fondo CAM NNN Mensual
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      100% Bal.
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-display text-slate-900">
                      {formatMxn(camMonthlyPool)}
                    </span>
                    <Sparkline data={[250, 255, 260, 262, 265, 268.5, 268.5]} color="#475569" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Renata AI: Prorrateado sin desbalance
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Eficiencia de Cobranza
                    </span>
                    <span className="text-xs font-bold text-amber-800">
                      1 Alerta SAT
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-display text-slate-900">
                      {(collectionRate * 100).toFixed(1)}%
                    </span>
                    <Sparkline data={[95, 96, 97, 96.5, 97.2, 97.6, 97.6]} color="#D97706" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    MINT Boutique CFDI pendiente
                  </p>
                </div>
              </div>

              {/* MIDDLE ANALYTICS VISUALS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <RevenueTrendChart />
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900 tracking-tight">Distribución por Giro Comercial</h3>
                      <p className="text-xs text-slate-500">84 Locales en 4 zonas clave</p>
                    </div>
                    <span className="text-xs font-bold text-slate-400">7,550 m²</span>
                  </div>

                  <div className="space-y-3">
                    <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden">
                      <div className="bg-slate-900 h-full w-[32%]" title="Gastronomía (32%)" />
                      <div className="bg-slate-700 h-full w-[28%]" title="Retail & Moda (28%)" />
                      <div className="bg-slate-500 h-full w-[24%]" title="Servicios (24%)" />
                      <div className="bg-slate-300 h-full w-[16%]" title="Entretenimiento (16%)" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-medium pt-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                        <span className="text-slate-700">Gastronomía (32%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                        <span className="text-slate-700">Retail/Moda (28%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                        <span className="text-slate-700">Servicios (24%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                        <span className="text-slate-700">Entretenimiento (16%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Mapa de Ocupación por Local</span>
                      <span className="text-xs text-slate-500 font-medium">81 Activos · 1 Vacante</span>
                    </div>

                    <div className="grid grid-cols-12 gap-1 max-h-24 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      {rentRoll.slice(0, 48).map((r, i) => (
                        <div
                          key={r.slug}
                          title={`${r.name} (${r.zone}) - ${r.fiscalAlert ? 'Alerta SAT' : 'OK'}`}
                          className={`h-3.5 rounded-xs transition-transform hover:scale-125 cursor-pointer ${
                            r.fiscalAlert
                              ? "bg-amber-600"
                              : i === 12
                              ? "bg-slate-300 border border-slate-400"
                              : "bg-slate-800"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* RESTRAINED & INSTITUTIONAL AI AGENT OPERATIONS CONSOLE */}
              <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
                {/* Console Title & Live Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-slate-900 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wide">
                        Módulos de Inteligencia
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Sincronización con ERP SAP</span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-slate-900 tracking-tight">
                      Módulos Operativos de Inteligencia (Renata · Mariana · Diego)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tres agentes autónomos conectados al ERP de la plaza para auditoría fiscal, análisis legal RAG y mantenimiento.
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      3 Agentes Activos
                    </span>
                  </div>
                </div>

                {/* Interactive Query Input Bar */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Consulta RAG al Copilot de Asset Management
                  </label>

                  <form onSubmit={handleQuerySubmit} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="Ej. ¿Cómo resolver la alerta fiscal de MINT Boutique? o ¿Qué contratos vencen pronto?"
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-500 font-medium"
                    />
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
                    >
                      Consultar IA →
                    </button>
                  </form>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                    <span className="text-slate-400 font-semibold text-xs mr-1">Sugerencias:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setUserQuery("¿Cómo resolver la alerta fiscal de MINT Boutique?");
                        setActiveAgent("renata");
                        setQueryResult(
                          "Renata AI: MINT Boutique pagó $18,400 MXN en banco pero falta timbrar el complemento CFDI 4.0 en el SAT. Haz clic en 'Emitir Complemento SAT' en el módulo de Renata para resolverlo automáticamente."
                        );
                      }}
                      className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                    >
                      Alerta SAT MINT Boutique
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserQuery("Evaluar exclusividad de café (Dunkin' vs Starbucks)");
                        setActiveAgent("mariana");
                        setQueryResult(
                          "Mariana AI: Dunkin' Donuts solicita abrir en Local B-04. El análisis RAG del PDF del contrato de Starbucks (página 4, Cláusula 14.2) prohibe strictly competidores directos de café de especialidad. Dictamen: RECHAZADO."
                        );
                      }}
                      className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                    >
                      Exclusividad Starbucks (RAG)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserQuery("Despachar mantenimiento HVAC de climas");
                        setActiveAgent("diego");
                        setQueryResult(
                          "Diego AI: Recibido reporte por WhatsApp para el Local A-04. Verifiqué póliza de garantía vigente con Climas de Mexicali (Serie: MX-HVAC-9902). Asignado a Carlos R. con $0 costo para la plaza."
                        );
                      }}
                      className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                    >
                      WhatsApp HVAC Climas
                    </button>
                  </div>

                  {/* Query Result Box */}
                  {queryResult && (
                    <div className="mt-3 bg-white border border-slate-300 rounded-xl p-4 text-xs text-slate-800 animate-fadeIn space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">Respuesta RAG</span>
                        <button onClick={() => setQueryResult(null)} className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer">✕</button>
                      </div>
                      <p className="leading-relaxed text-slate-700">{queryResult}</p>
                    </div>
                  )}
                </div>

                {/* 3 CORE INSTITUTIONAL AGENT CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* AGENT 1: RENATA AI */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-xs">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Renata AI</span>
                        <span className="bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-0.5 rounded-md text-[11px] font-bold">
                          CAM & SAT CFDI
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-sm text-slate-900">
                        Fondo CAM & Auditoría SAT
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Audita el fondo CAM de $268,500 MXN sin desbalance y verifica el timbrado fiscal CFDI 4.0 de los 84 inquilinos.
                      </p>

                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1 text-xs">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                          {cfdiIssued ? "Status: REGULARIZADO" : "Estatus: ALERTA DETECTADA"}
                        </span>
                        <p className="text-slate-600 text-xs font-medium">
                          {cfdiIssued
                            ? "Complemento de pago timbrado exitosamente en el SAT."
                            : "MINT Boutique ($18,400 MXN) pagó sin complemento CFDI."}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <button
                        onClick={() => {
                          setCfdiIssued(true);
                          triggerToast("Renata AI: Complemento de pago CFDI 4.0 emitido y enviado a contabilidad.");
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        {cfdiIssued ? "Complemento Emitido" : "Emitir Complemento SAT →"}
                      </button>

                      <button
                        onClick={() => setActiveTab("cam")}
                        className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center block"
                      >
                        Ver Matriz NNN ($268.5k) →
                      </button>
                    </div>
                  </div>

                  {/* AGENT 2: MARIANA AI */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-xs">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Mariana AI</span>
                        <span className="bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-0.5 rounded-md text-[11px] font-bold">
                          Legal RAG & Lease
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-sm text-slate-900">
                        Bóveda Legal & Exclusividades
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Analiza contratos PDF en tiempo real para proteger $1.8M MXN anuales y evaluar nuevos prospectos de arrendamiento.
                      </p>

                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1 text-xs">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                          Cláusula 14.2 (Starbucks)
                        </span>
                        <p className="text-slate-600 text-xs italic font-medium">
                          &ldquo;Queda prohibida la venta de café de especialidad a menos de 50m...&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <button
                        onClick={() => {
                          setAttorneyNotified(true);
                          triggerToast("Mariana AI: Dictamen legal enviado al despacho de abogados.");
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        {attorneyNotified ? "Notificación Enviada" : "Enviar a Abogado →"}
                      </button>

                      <button
                        onClick={() => setActiveTab("legal")}
                        className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center block"
                      >
                        Ver Bóveda Legal PDF →
                      </button>
                    </div>
                  </div>

                  {/* AGENT 3: DIEGO AI */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-xs">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Diego AI</span>
                        <span className="bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-0.5 rounded-md text-[11px] font-bold">
                          CapEx & Ops
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-sm text-slate-900">
                        Bitácora CapEx & Mantenimiento
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Mesa de ayuda 24/7 por WhatsApp para inquilinos. Verifica pólizas de garantía para reducir costos de plaza a $0.
                      </p>

                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1 text-xs">
                        <p className="text-slate-800 text-xs font-semibold">
                          Inquilino: &ldquo;Aire no enfría en A-04&rdquo;
                        </p>
                        <p className="text-slate-600 text-xs font-medium">
                          Diego: Garantía MX-HVAC-9902 activa. Técnico asignado.
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <button
                        onClick={() => {
                          setHvacDispatched(true);
                          triggerToast("Diego AI: Orden enviada por WhatsApp a Climas de Mexicali.");
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        {hvacDispatched ? "Técnico Despachado" : "Despachar Mantenimiento →"}
                      </button>

                      <button
                        onClick={() => setActiveTab("maint")}
                        className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center block"
                      >
                        Ver Bitácora de Equipos →
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* RENT ROLL & TENANT ANALYTICS TABLE */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-4 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900 tracking-tight">Rent Roll de Inquilinos & Estatus IA</h3>
                    <p className="text-xs text-slate-500 font-medium">Métrica individual de 84 locales con verificación fiscal y mantenimiento</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => setCategoryFilter("ALL")}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${categoryFilter === "ALL" ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-slate-600"}`}
                      >
                        Todos ({rentRoll.length})
                      </button>
                      <button
                        onClick={() => setCategoryFilter("Restaurante & Bar")}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${categoryFilter === "Restaurante & Bar" ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-slate-600"}`}
                      >
                        Gastronomía
                      </button>
                      <button
                        onClick={() => setCategoryFilter("Tienda & Moda")}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${categoryFilter === "Tienda & Moda" ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-slate-600"}`}
                      >
                        Retail
                      </button>
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Estatus: Todos</option>
                      <option value="OK">Al día</option>
                      <option value="ALERT">Alerta SAT / IA</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 font-sans">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-600 border-y border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Local / Inquilino</th>
                        <th className="py-3 px-4">Giro / Zona</th>
                        <th className="py-3 px-4 text-right">Superficie (GLA)</th>
                        <th className="py-3 px-4 text-right">Renta Base</th>
                        <th className="py-3 px-4 text-right">Cuota CAM NNN</th>
                        <th className="py-3 px-4">Estatus Fiscal & IA</th>
                        <th className="py-3 px-4 text-center">Acciones IA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRentRoll.slice(0, 10).map((row) => (
                        <tr key={row.slug} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-xs">{row.name}</div>
                            <div className="text-[11px] text-slate-400 font-medium">{row.slug}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block bg-slate-100 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-700">
                              {row.zone}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium">
                            {row.sqm} m² <span className="text-slate-400">({row.sharePct.toFixed(2)}%)</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            {formatMxn(row.rent)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-600 font-medium">
                            {formatMxn((row.rent * 0.12))}
                          </td>
                          <td className="py-3.5 px-4">
                            {row.fiscalAlert ? (
                              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold">
                                Inconsistencia CFDI SAT
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-1 rounded-md text-xs font-medium">
                                Al Día
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => {
                                setCopilotOpen(true);
                                setActiveAgent(row.fiscalAlert ? "renata" : "mariana");
                                triggerToast(`Copilot IA activado para ${row.name}`);
                              }}
                              className="bg-white hover:bg-slate-900 hover:text-white text-slate-700 border border-slate-200 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            >
                              Consultar IA →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-3 border-t border-slate-100">
                  <span>Mostrando {Math.min(10, filteredRentRoll.length)} de {rentRoll.length} locales</span>
                  <div className="flex items-center gap-2">
                    <button className="px-3.5 py-1.5 bg-white rounded-xl border border-slate-200 text-slate-700 font-semibold cursor-pointer hover:bg-slate-50">Anterior</button>
                    <button className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl font-bold cursor-pointer">Siguiente</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OTHER DEEP DIVE TABS (Rent Roll, CAM, Mantenimiento, Legal, Universal ERP) */}
          {activeTab === "rentroll" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xs font-sans">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">Rent Roll Completo & Distribución GLA</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">84 Locales activos en La Gran Vía Mexicali</p>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Local</th>
                      <th className="p-3.5">Inquilino</th>
                      <th className="p-3.5">Superficie</th>
                      <th className="p-3.5 text-right">Renta Mensual</th>
                      <th className="p-3.5 text-right">% Prorrateo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {rentRoll.map((r) => (
                      <tr key={r.slug} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 text-slate-500 font-medium">{r.slug}</td>
                        <td className="p-3.5 font-bold text-slate-900">{r.name}</td>
                        <td className="p-3.5 font-medium">{r.sqm} m²</td>
                        <td className="p-3.5 text-right font-bold text-slate-900">{formatMxn(r.rent)}</td>
                        <td className="p-3.5 text-right font-medium">{r.sharePct.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "cam" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-8 animate-fadeIn text-slate-900 font-sans shadow-sm">
              {/* TOP EXECUTIVE HEADER */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Módulo de Finanzas & Gastos Comunes · Renata AI
                    </span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-slate-900 mt-1">
                    Fondo de Mantenimiento CAM NNN & Auditoría Fiscal
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Prorrateo automatizado de gastos comunes entre los 84 locales de La Gran Vía Mexicali.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      triggerToast("Factura cargada. Renata calculó el prorrateo automáticamente entre los 84 locales.");
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    <span>📄</span> Subir Factura PDF / XML
                  </button>
                </div>
              </div>

              {/* 4 EXECUTIVE KPI SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gastos CAM del Mes</p>
                  <p className="text-2xl font-bold text-slate-900">$268,500 MXN</p>
                  <p className="text-xs text-slate-500">4 Facturas acumuladas en Julio</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Superficie Total (GLA)</p>
                  <p className="text-2xl font-bold text-slate-900">35,400 m²</p>
                  <p className="text-xs text-slate-500">84 Locales comerciales activos</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Inquilinos al Corriente</p>
                  <p className="text-2xl font-bold text-emerald-700">83 / 84</p>
                  <p className="text-xs text-emerald-600 font-medium">98.8% de cuotas pagadas</p>
                </div>
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4.5 space-y-1">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Auditoría Fiscal SAT</p>
                  <p className="text-2xl font-bold text-amber-900">1 Pendiente</p>
                  <p className="text-xs text-amber-700 font-medium">Complemento CFDI MINT Boutique</p>
                </div>
              </div>

              {/* FISCAL SAT ACTION CARD */}
              <div className="bg-gradient-to-r from-amber-50 via-amber-50/60 to-orange-50/40 border border-amber-200 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Requerimiento Fiscal SAT (CFDI 4.0)
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      MINT Boutique (Local B-12) · Pago de $18,400 MXN sin timbrado
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                      MINT realizó una transferencia bancaria por su cuota mensual. Como la factura inicial fue PPD (Pago en Parcialidades), la ley del SAT exige emitir un <strong>Complemento de Recepción de Pagos (CRP)</strong> para evitar sanciones fiscales a la plaza.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCfdiIssued(true);
                      triggerToast("Complemento de pago CFDI 4.0 timbrado y enviado al SAT exitosamente.");
                    }}
                    className="bg-amber-800 hover:bg-amber-900 text-white px-5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm"
                  >
                    {cfdiIssued ? "✓ Complemento SAT Timbrado" : "Timbrar Recibo SAT →"}
                  </button>
                </div>
              </div>

              {/* THREE INGESTION CHANNELS SUMMARY */}
              <div className="space-y-4 pt-2">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Canales de Ingreso de Facturas
                  </h3>
                  <p className="text-xs text-slate-500">
                    Renata recopila automáticamente los gastos desde tres fuentes principales:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">1. Portal Inquilinos</span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Automático</span>
                    </div>
                    <p className="text-xs text-slate-600">Comprobantes y ventas enviados directamente por los locales en <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-900 font-sans">/inquilinos</code>.</p>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">2. Conector ERP SAP</span>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Sincronizado</span>
                    </div>
                    <p className="text-xs text-slate-600">Facturas de CFE, Seguridad Securitas y Climas de Mexicali recibidas por API.</p>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">3. Carga Manual</span>
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">Administración</span>
                    </div>
                    <p className="text-xs text-slate-600">Subida directa de archivos PDF/XML para prorrateo inmediato.</p>
                  </div>
                </div>
              </div>

              {/* INVOICES RECEIVED LEDGER */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Facturas de Mantenimiento Ingeridas este Mes
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Fórmula de División: (Monto Total × m² del Local) ÷ 35,400 m²
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-4">Proveedor / Emisor</th>
                        <th className="p-4">Concepto</th>
                        <th className="p-4">Origen</th>
                        <th className="p-4 text-right">Monto Total</th>
                        <th className="p-4">Criterio de Reparto</th>
                        <th className="p-4 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-bold text-slate-900">CFE Mexicali</td>
                        <td className="p-4 text-slate-600">Energía Eléctrica (Pasillos y Áreas Comunes)</td>
                        <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[11px] font-medium">Conector ERP</span></td>
                        <td className="p-4 text-right font-bold text-slate-900">$145,000 MXN</td>
                        <td className="p-4 text-slate-500">Prorrateado según superficie (m²)</td>
                        <td className="p-4 text-center"><span className="text-emerald-700 font-bold">Prorrateado ✓</span></td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-bold text-slate-900">Grupo Securitas</td>
                        <td className="p-4 text-slate-600">Vigilancia & Control de Acceso 24/7</td>
                        <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[11px] font-medium">Conector ERP</span></td>
                        <td className="p-4 text-right font-bold text-slate-900">$65,000 MXN</td>
                        <td className="p-4 text-slate-500">Prorrateado según superficie (m²)</td>
                        <td className="p-4 text-center"><span className="text-emerald-700 font-bold">Prorrateado ✓</span></td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-bold text-slate-900">Climas de Mexicali</td>
                        <td className="p-4 text-slate-600">Mantenimiento Preventivo Climas Torre Central</td>
                        <td className="p-4"><span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-medium">Carga Manual</span></td>
                        <td className="p-4 text-right font-bold text-slate-900">$38,500 MXN</td>
                        <td className="p-4 text-slate-500">Prorrateado según superficie (m²)</td>
                        <td className="p-4 text-center"><span className="text-emerald-700 font-bold">Prorrateado ✓</span></td>
                      </tr>
                      <tr className="hover:bg-amber-50/40 transition-colors bg-amber-50/20">
                        <td className="p-4 font-bold text-slate-900">MINT Boutique (B-12)</td>
                        <td className="p-4 text-slate-600">Comprobante de Pago Renta + CAM</td>
                        <td className="p-4"><span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[11px] font-medium">Portal Inquilinos</span></td>
                        <td className="p-4 text-right font-bold text-amber-900">$18,400 MXN</td>
                        <td className="p-4 text-amber-800">Directo a Local B-12</td>
                        <td className="p-4 text-center"><span className="text-amber-700 font-bold">⚠️ Pendiente SAT</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TENANT PRORATION MATRIX */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Cobro Final por Inquilino (Cuota CAM NNN)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Desglose individual correspondiente a cada local para el periodo actual.
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-4">Inquilino / Local</th>
                        <th className="p-4 text-right">Superficie</th>
                        <th className="p-4 text-right">% Participación</th>
                        <th className="p-4 text-right">Cuota Base CAM</th>
                        <th className="p-4 text-right">Administración</th>
                        <th className="p-4 text-right">IVA (16%)</th>
                        <th className="p-4 text-right">Total NNN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {camRows.slice(0, 10).map((c) => (
                        <tr key={c.key} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-900">{c.label}</td>
                          <td className="p-4 text-right font-medium">{c.sqm} m²</td>
                          <td className="p-4 text-right font-medium">{c.sharePct.toFixed(2)}%</td>
                          <td className="p-4 text-right font-medium">{formatMxn(c.base)}</td>
                          <td className="p-4 text-right font-medium">{formatMxn(c.admin)}</td>
                          <td className="p-4 text-right font-medium">{formatMxn(c.iva)}</td>
                          <td className="p-4 text-right font-bold text-slate-900">{formatMxn(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "maint" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xs font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">Bitácora CapEx & Diego AI</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">Garantías de equipos, mantenimiento preventivo y reclamos a proveedores</p>
                </div>
                <button
                  onClick={() => {
                    setHvacDispatched(true);
                    triggerToast("Técnico de Climas de Mexicali despachado.");
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {hvacDispatched ? "✓ Técnico Despachado" : "Despachar Técnico HVAC →"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {criticalEquipment.map((eq) => (
                  <div key={eq.serial} className="border border-slate-200/80 rounded-xl p-5 space-y-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{eq.asset}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        {eq.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">Modelo: {eq.model} | Serie: {eq.serial}</p>
                    <p className="text-xs text-slate-500 font-medium">Garantía: {eq.warranty} ({eq.doc})</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "legal" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xs font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">Bóveda Legal RAG & Mariana AI</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">Análisis automatizado de contratos PDF y cláusulas de exclusividad comercial</p>
                </div>
                <button
                  onClick={() => {
                    setAttorneyNotified(true);
                    triggerToast("Notificación legal enviada a despacho.");
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {attorneyNotified ? "✓ Notificación Enviada" : "Enviar a Abogado →"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {leasingApplicants.map((app) => (
                  <div key={app.id} className="border border-slate-200/80 rounded-xl p-5 space-y-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm font-display">{app.brand} ({app.category})</span>
                      <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        {app.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{app.reasoning}</p>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1 shadow-2xs">
                      <p className="font-bold text-slate-900">Cláusula Extraída ({app.contractPdfName}):</p>
                      <p className="italic text-slate-600 font-medium">&ldquo;{app.contractExactSnippet}&rdquo;</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "erp" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xs font-sans text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">Conector ERP Universal Sync</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">Sincronización automatizada con SAP, Yardi, RealPage y SAARI ERP</p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-bold">
                  Sincronización Activa (200 OK)
                </span>
              </div>

              <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl border border-slate-800 text-xs space-y-2.5 max-h-64 overflow-y-auto leading-relaxed shadow-sm font-sans">
                <p className="text-emerald-400 font-semibold">[ERP-SYNC 14:58:12] POST /api/v2/erp/batch-ingest ... 200 OK (Universal Adapter)</p>
                <p>[ERP-SYNC 14:58:14] Sincronizados 84 locales comerciales para La Gran Vía Mexicali.</p>
                <p>[ERP-SYNC 14:58:15] Validado Fondo CAM: $268,500 MXN contra 79 contratos vigentes.</p>
                <p>[ERP-SYNC 14:58:16] Adaptador Neutral: Conectado a ERP SAP (Esquema detectado automáticamente).</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* AI ASSISTANT DRAWER / SLIDE-OVER PANEL */}
      {copilotOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between animate-slideLeft font-sans">
          <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <h3 className="font-display font-bold text-sm">Copilot Sidebar</h3>
            </div>
            <button
              onClick={() => setCopilotOpen(false)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer font-bold"
            >
              ✕ Cerrar
            </button>
          </div>

          <div className="p-3 bg-slate-100 border-b border-slate-200 flex gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveAgent("renata")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeAgent === "renata" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Renata (CAM)
            </button>
            <button
              onClick={() => setActiveAgent("mariana")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeAgent === "mariana" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mariana (Legal)
            </button>
            <button
              onClick={() => setActiveAgent("diego")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeAgent === "diego" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Diego (CapEx)
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wide block">
                Alerta Detectada por el Agente
              </span>
              <p className="text-slate-700 leading-relaxed font-medium text-xs">
                {activeAgent === "renata" && "MINT Boutique presenta inconsistencia CFDI 4.0 ($18,400 MXN pagados sin complemento)."}
                {activeAgent === "mariana" && "Solicitud de Dunkin' Donuts viola la exclusividad de café de Starbucks (Cláusula 14.2)."}
                {activeAgent === "diego" && "Equipo HVAC de Mexicali Climas en garantía vigente (Serie: MX-HVAC-9902)."}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Consulta al Agente</span>
                <span className="font-bold text-slate-900">{activeAgent.toUpperCase()} AI</span>
              </div>
              <p className="font-bold text-slate-900 text-xs">
                {activeAgent === "renata" && renataReplies[0].query}
                {activeAgent === "mariana" && marianaReplies[0].query}
                {activeAgent === "diego" && diegoReplies[0].query}
              </p>
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 leading-relaxed text-xs font-medium shadow-2xs">
                {activeAgent === "renata" && renataReplies[0].answer}
                {activeAgent === "mariana" && marianaReplies[0].answer}
                {activeAgent === "diego" && diegoReplies[0].answer}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-slate-200 bg-slate-50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                triggerToast(`Consulta procesada por ${activeAgent.toUpperCase()} AI`);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Pregunta a la IA sobre la plaza..."
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium"
              />
              <button
                type="submit"
                className="bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800 transition-colors shadow-xs"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
