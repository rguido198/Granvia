"use client";

import { useState } from "react";
import Link from "next/link";
import { TENANTS } from "@/content/tenants";

type ActiveTab = "overview" | "leasing" | "maint" | "cam" | "saari";
type ActiveAgent = "mariana" | "diego" | "renata";

interface ApplicantCase {
  id: string;
  brand: string;
  category: string;
  menu: string;
  sqm: number;
  conflictingTenant: string;
  conflictingClause: string;
  status: "RECHAZADO" | "CONDICIONADO" | "APROBADO";
  reasoning: string;
  rentLossPrevented: string;
  contractPdfName: string;
  contractPdfPage: string;
  contractExactSnippet: string;
  overlapScore: string;
  legalFilter: string;
}

interface CapexCase {
  id: string;
  tenant: string;
  expenseType: string;
  amount: number;
  isQuestionable: boolean;
  verdict: "RECHAZADO_RESPONSABILIDAD_INQUILINO" | "APROBADO_GARANTIA_COSTO_CERO" | "APROBADO_PRORRATEO_CAM";
  details: string;
}

const LEASING_APPLICANTS: ApplicantCase[] = [
  {
    id: "SOL-01",
    brand: "Starbucks Reserve",
    category: "Cafetería & Bar de Espresso",
    menu: "Café espresso, bebidas frías, repostería importada",
    sqm: 190,
    conflictingTenant: "Blue Luna Café (Local B-02 / Zona 4)",
    conflictingClause: "Cláusula #14: Exclusividad absoluta en venta de café preparado & bar de espresso.",
    status: "RECHAZADO",
    reasoning: "Imposible arrendar. Solapamiento directo del 98.4% en menú de café espresso. Incumplimiento directo del contrato vigente de Blue Luna Café. Riesgo de demanda legal inmediata y pérdida de renta de $65,000 MXN/mes.",
    rentLossPrevented: "$780,000 MXN / año",
    contractPdfName: "Contrato_Arrendamiento_BlueLuna_LocB02_Firmado.pdf",
    contractPdfPage: "Página 12, Párrafo 3.4 (Sección de Exclusividades)",
    contractExactSnippet: '"...EL ARRENDADOR otorga al ARRENDATARIO exclusividad comercial absoluta dentro de la Zona 4 de Plaza La Gran Vía, prohibiendo expresamente la instalación de cualquier negocio o franquicia cuyo giro principal o secundario sea la venta de café espresso preparado, bebidas a base de café o bar de especialidad durante los 60 meses de vigencia del contrato..."',
    overlapScore: "98.4% Coincidencia Semántica de Menú",
    legalFilter: "Cumplimiento Estricto de Contrato Vigente",
  },
  {
    id: "SOL-02",
    brand: "Krispy Kreme",
    category: "Donas & Repostería Glaseada",
    menu: "Donas glaseadas, café americano, pan dulce",
    sqm: 110,
    conflictingTenant: "La Purísima Bakery (Local B-05 / Zona 4)",
    conflictingClause: "Cláusula #08: Exclusividad en productos de postres y repostería glaseada.",
    status: "RECHAZADO",
    reasoning: "Violación de pacto de no-competencia de La Purísima Bakery. El algoritmo de Mariana detectó solapamiento directo en categoría 'postres/repostería glaseada'.",
    rentLossPrevented: "$540,000 MXN / año",
    contractPdfName: "Contrato_LaPurisima_Bakery_LocB05_Firmado.pdf",
    contractPdfPage: "Página 8, Párrafo 2.1 (Protección de Giro)",
    contractExactSnippet: '"...Queda estrictamente prohibido a la administración de Plaza La Gran Vía arrendar locales adyacentes a competidores directos en la categoría de repostería fina, donas glaseadas o panadería artesanal..."',
    overlapScore: "91.2% Coincidencia en Repostería",
    legalFilter: "Protección de Arrendatario Ancla de Repostería",
  },
  {
    id: "SOL-03",
    brand: "La Vicenta Tacos & Parrilla",
    category: "Restaurante Mexicano & Cortes de Carne",
    menu: "Tacos de arrachera, ensaladas verdes, margaritas",
    sqm: 240,
    conflictingTenant: "Alma Verde (Local B-10 / Zona 7)",
    conflictingClause: "Cláusula #22: Exclusividad genérica en 'comida saludable y ensaladas'.",
    status: "CONDICIONADO",
    reasoning: "Conflicto parcial en ensaladas. Sin embargo, tras aplicar el filtro de Ley Antimonopolio (LFCE §3), la exclusividad genérica de Alma Verde es legalmente excesiva. Se aprueba condicionando el menú a no vender ensaladas bowls como plato fuerte.",
    rentLossPrevented: "Aprobación Viable ($1,150,000 MXN Renta Nueva)",
    contractPdfName: "Contrato_AlmaVerde_LocB10_Firmado.pdf",
    contractPdfPage: "Página 15, Párrafo 5.2 (Filtro Antimonopolio LFCE)",
    contractExactSnippet: '"...Las partes acuerdan que la restricción de giro sobre ensaladas aplica únicamente a conceptos dedicados 100% a bowls saludables, no limitando la venta de acompañamientos en restaurantes de especialidad de carne..."',
    overlapScore: "24.5% Coincidencia Menor (Ajustable)",
    legalFilter: "Ley Federal de Competencia Económica (LFCE §3)",
  },
];

const CAPEX_CASES: CapexCase[] = [
  {
    id: "CAP-01",
    tenant: "Derma Club Farmacia Dermatológica",
    expenseType: "Remodelación de Luminarias Decorativas Interiores",
    amount: 78000,
    isQuestionable: true,
    verdict: "RECHAZADO_RESPONSABILIDAD_INQUILINO",
    details: "RECHAZADO: Solicitud improcedente. El contrato de arrendamiento (Sección 12) establece que la iluminación estética interior es responsabilidad 100% del arrendatario.",
  },
  {
    id: "CAP-02",
    tenant: "Ashley Furniture",
    expenseType: "Falla de Compresor HVAC 15 Toneladas (Calor 44°C Mexicali)",
    amount: 145000,
    isQuestionable: false,
    verdict: "APROBADO_GARANTIA_COSTO_CERO",
    details: "GARANTÍA APLICADA ($0 COSTO PROPIETARIO): Diego verificó número de serie Carrier #CR-884920. El reemplazo está cubierto al 100% por póliza de fábrica de Carrier.",
  },
  {
    id: "CAP-03",
    tenant: "Cinemex Premium",
    expenseType: "Mantenimiento Preventivo de Planta de Emergencia Común",
    amount: 52000,
    isQuestionable: false,
    verdict: "APROBADO_PRORRATEO_CAM",
    details: "APROBADO PARA CAM: Gasto de infraestructura común prorrateable entre todos los locales en la liquidación NNN del mes.",
  },
];

function getTenantSqm(name: string, index: number): number {
  if (name.includes("Ashley")) return 1450;
  if (name.includes("Cinemex")) return 1180;
  if (name.includes("Buffalo")) return 650;
  if (name.includes("Fairfield") || name.includes("Holiday Inn")) return 850;
  if (name.includes("Cabanna") || name.includes("Bodega 8") || name.includes("260 Grill")) return 320;
  if (name.includes("Banorte") || name.includes("Banregio") || name.includes("Santander")) return 210;
  if (name.includes("PETCO")) return 420;
  if (name.includes("Alma Verde")) return 220;
  if (name.includes("Blue Luna")) return 180;
  if (name.includes("IHOP")) return 340;
  return Math.max(45, 80 - (index % 15) * 2);
}

export function LandlordDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [activeAgent, setActiveAgent] = useState<ActiveAgent>("mariana");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "ok" | "sat" | "excl">("all");

  // Chat Query States
  const [aiQuery, setAiQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{ agent: string; query: string; answer: string; ref?: string }[]>([
    {
      agent: "Mariana (Legal)",
      query: "¿Por qué bloqueamos la propuesta de Starbucks Reserve?",
      answer: "Starbucks Reserve presentó un 98.4% de solapamiento semántico en menú con Blue Luna Café (Local B-02, Zona 4), violando la Cláusula #14 de exclusividad comercial de especialidad en café.",
      ref: "Contrato_BlueLuna_LocB02.pdf",
    },
    {
      agent: "Diego (CapEx)",
      query: "¿Cuál es el ahorro en el compresor HVAC de Ashley Furniture?",
      answer: "Se aplicó la póliza de garantía del fabricante Carrier (#CR-884920), logrando un reemplazo a $0 costo para el propietario ($145,000 MXN ahorrados).",
      ref: "Poliza_Carrier_Ashley.pdf",
    },
  ]);

  // Compute exact total GLA and occupied metrics
  const totalOccupiedSqm = TENANTS.reduce((sum, t, idx) => sum + getTenantSqm(t.name, idx), 0);
  const vacancySqm = 445;
  const plazaTotalGla = totalOccupiedSqm + vacancySqm;

  // Filtered tenants for search & category filters
  const filteredTenants = TENANTS.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tag.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const isSatError = t.name.includes("MINT");
    const isExclusivityHold = t.name.includes("Alma Verde") || t.name.includes("Blue Luna") || t.name.includes("La Purísima");

    if (filterCategory === "ok") return !isSatError;
    if (filterCategory === "sat") return isSatError;
    if (filterCategory === "excl") return isExclusivityHold;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-slate-900 font-sans p-4 sm:p-6 lg:p-7 flex flex-col lg:flex-row gap-6">
      {/* ---------------- 1. FLOATING SIDEBAR (Navegación Estilo Logip / Solarius) ---------------- */}
      <aside className="w-full lg:w-64 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between shrink-0 lg:sticky lg:top-7 lg:h-[calc(100vh-3.5rem)]">
        <div className="space-y-6">
          {/* Logo Brand Header */}
          <div className="px-2 py-1">
            <Link href="/" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/la-gran-via-logo-horizontal.png"
                alt="La Gran Vía Mexicali"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-sans">
              <span>Torre de Control</span>
              <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[10px]">
                7,550 m² GLA
              </span>
            </div>
          </div>

          {/* Menú de Navegación Principal Limpio */}
          <nav className="space-y-1">
            <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-sans">
              Consola Principal
            </span>

            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <span>Resumen Rent Roll</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === "overview" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {TENANTS.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("leasing")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "leasing"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <span>Arrendamiento (Mariana)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                RAG
              </span>
            </button>

            <button
              onClick={() => setActiveTab("maint")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "maint"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <span>CapEx & Gastos (Diego)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">
                CapEx
              </span>
            </button>

            <button
              onClick={() => setActiveTab("cam")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "cam"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <span>CAM & Fiscal SAT (Renata)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold">
                SAT
              </span>
            </button>

            <button
              onClick={() => setActiveTab("saari")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "saari"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <span>SAARI ERP (Conector)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
                ERP
              </span>
            </button>
          </nav>
        </div>

        {/* User Card at Sidebar Bottom */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="h-9 w-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center font-display">
              M
            </div>
            <div className="truncate">
              <span className="block font-bold text-xs text-slate-900 truncate">Sr. Martín</span>
              <span className="block text-[10px] text-slate-500 truncate">Director de Operaciones</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ---------------- 2. MAIN CENTER DASHBOARD AREA ---------------- */}
      <main className="flex-1 space-y-6 min-w-0">
        {/* Header Bar with Greeting (Estilo Logip "Hello, Margaret") */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operación Al Día
              </span>
              <span className="text-xs text-slate-400">• La Gran Vía Mexicali</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 font-display tracking-tight">
              Hola, Sr. Martín 👋
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Consola unificada de arrendamiento, cobranza CAM y auditoría con Agentes IA.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => alert("Exportando reporte oficial en PDF...")}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Exportar Reporte (.PDF)
            </button>
            <button
              onClick={() => setActiveTab("saari")}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Sincronizar SAARI →
            </button>
          </div>
        </div>

        {/* ---------------- PESTAÑA 1: OVERVIEW ---------------- */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards Strip (4 Clean Floating White Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-semibold uppercase text-[10px] tracking-wider">Cobranza Mensual</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                    +2.4% MoM
                  </span>
                </div>
                <span className="text-2xl font-bold text-slate-900 font-display block">
                  $3,145,000 <span className="text-xs font-normal text-slate-400">MXN</span>
                </span>
                <span className="text-[11px] text-slate-500 block">
                  98.2% Cobrado (Julio 2026)
                </span>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-semibold uppercase text-[10px] tracking-wider">Ocupación GLA</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                    94.1% Ocupado
                  </span>
                </div>
                <span className="text-2xl font-bold text-slate-900 font-display block">
                  7,105 m² <span className="text-xs font-normal text-slate-400">Rentados</span>
                </span>
                <span className="text-[11px] text-slate-500 block">
                  445 m² Vacantes (2 Locales)
                </span>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-semibold uppercase text-[10px] tracking-wider">Invariante CAM</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                    NNN Balance
                  </span>
                </div>
                <span className="text-2xl font-bold text-slate-900 font-display block">
                  1.0000 <span className="text-xs font-normal text-slate-400">Exacto</span>
                </span>
                <span className="text-[11px] text-slate-500 block">
                  85 Locales Cuadrados
                </span>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-semibold uppercase text-[10px] tracking-wider">Ahorro CapEx AI</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                    Propietario
                  </span>
                </div>
                <span className="text-2xl font-bold text-emerald-600 font-display block">
                  $78,000 <span className="text-xs font-normal text-slate-400">MXN</span>
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Gasto Dudoso Rechazado
                </span>
              </div>
            </div>

            {/* Visual GLA Commercial Mix Bar Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 font-display">
                    Distribución de Mezcla Comercial (7,550 m² GLA Total)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Porcentaje de ocupación por categoría de negocio en Plaza La Gran Vía.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  94.1% Ocupación Activa
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="h-3.5 w-full rounded-full bg-slate-100 overflow-hidden flex p-0.5">
                <div style={{ width: "35.2%" }} className="bg-rose-500 h-full rounded-l-full" title="Gastronomía (35.2%)" />
                <div style={{ width: "28.6%" }} className="bg-amber-400 h-full" title="Retail (28.6%)" />
                <div style={{ width: "18.4%" }} className="bg-emerald-500 h-full" title="Servicios (18.4%)" />
                <div style={{ width: "11.9%" }} className="bg-blue-500 h-full" title="Entretenimiento (11.9%)" />
                <div style={{ width: "5.9%" }} className="bg-slate-300 h-full rounded-r-full" title="Vacancia (5.9%)" />
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-700 font-medium">Gastronomía & Rest. (35.2%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="text-slate-700 font-medium">Retail & Moda (28.6%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-700 font-medium">Servicios & Bancos (18.4%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-slate-700 font-medium">Entretenimiento (11.9%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="text-slate-500">Vacancia Absorbida (5.9%)</span>
                </div>
              </div>
            </div>

            {/* Rent Roll Table Card with Search & Filters */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 font-display flex items-center gap-2">
                    <span>Rent Roll Matriz Consolidada ({filteredTenants.length} Locales)</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                      SAARI Sync Live
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sincronización continua de depósitos bancarios y estado de cobranza.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar inquilino, local, giro..."
                    className="px-3.5 py-2 rounded-xl text-xs border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                  />

                  <div className="flex items-center gap-1 text-xs">
                    <button
                      onClick={() => setFilterCategory("all")}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                        filterCategory === "all"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Todos ({TENANTS.length})
                    </button>
                    <button
                      onClick={() => setFilterCategory("ok")}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                        filterCategory === "ok"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Al Día
                    </button>
                    <button
                      onClick={() => setFilterCategory("sat")}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                        filterCategory === "sat"
                          ? "bg-rose-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Alerta SAT
                    </button>
                  </div>
                </div>
              </div>

              {/* Clean Modern Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] bg-slate-50/70 font-sans tracking-wider">
                      <th className="p-3.5 font-bold">#</th>
                      <th className="p-3.5 font-semibold">Local / Inquilino</th>
                      <th className="p-3.5 font-semibold">Zona</th>
                      <th className="p-3.5 font-semibold">Giro / Categoría</th>
                      <th className="p-3.5 font-semibold text-right">Superficie</th>
                      <th className="p-3.5 font-semibold text-right">Pro-Rata</th>
                      <th className="p-3.5 font-semibold text-right">Renta MXN</th>
                      <th className="p-3.5 font-semibold">Estatus Cobranza</th>
                      <th className="p-3.5 font-semibold">Protección AI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredTenants.map((t, idx) => {
                      const sqm = getTenantSqm(t.name, idx);
                      const sharePct = ((sqm / plazaTotalGla) * 100).toFixed(2);
                      const estRent = Math.round(sqm * 240);

                      const isSatError = t.name.includes("MINT");
                      const isCapexRejection = t.name.includes("Derma Club");
                      const isExclusivityHold = t.name.includes("Alma Verde") || t.name.includes("Blue Luna");

                      return (
                        <tr key={t.slug} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="p-3.5 font-bold text-slate-900 font-sans">{t.name}</td>
                          <td className="p-3.5 text-slate-500 text-[11px]">{t.zone}</td>
                          <td className="p-3.5 text-slate-600">{t.tag}</td>
                          <td className="p-3.5 text-right font-semibold text-slate-900">{sqm} m²</td>
                          <td className="p-3.5 text-right font-semibold text-rose-600">{sharePct}%</td>
                          <td className="p-3.5 text-right font-bold text-slate-900">${estRent.toLocaleString()}</td>
                          <td className="p-3.5">
                            {isSatError ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                                Alerta Fiscal SAT (PPD)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Al Día (CFDI)
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-[11px]">
                            {isSatError && <span className="text-rose-600 font-bold">Alerta CFDI 4.0</span>}
                            {isCapexRejection && <span className="text-amber-600 font-bold">CapEx $78k Rechazado</span>}
                            {isExclusivityHold && <span className="text-emerald-600 font-bold">Exclusividad Activa</span>}
                            {!isSatError && !isCapexRejection && !isExclusivityHold && (
                              <span className="text-slate-400">Protección AI</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-semibold text-xs rounded-b-xl">
                    <tr>
                      <td className="p-3.5">TOTAL</td>
                      <td className="p-3.5 font-bold" colSpan={3}>
                        PLAZA LA GRAN VÍA ({TENANTS.length} LOCALES + VACANTES)
                      </td>
                      <td className="p-3.5 text-right text-amber-300 font-bold">{plazaTotalGla.toLocaleString()} m²</td>
                      <td className="p-3.5 text-right text-rose-300 font-bold">1.0000 (100%)</td>
                      <td className="p-3.5 text-right text-amber-300 font-bold">$3,145,000 MXN</td>
                      <td className="p-3.5 text-slate-300" colSpan={2}>94.1% Ocupación Activa</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- PESTAÑAS SECUNDARIAS (Mariana, Diego, Renata, SAARI) ---------------- */}
        {activeTab === "leasing" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
            <h3 className="font-bold text-base text-slate-900 font-display">Módulo de Arrendamiento & Inteligencia Legal (Mariana)</h3>
            <p className="text-xs text-slate-500">Evaluación cognitiva de solicitudes prospecto y bóveda RAG de 85 contratos en Baja California.</p>
          </div>
        )}

        {activeTab === "maint" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
            <h3 className="font-bold text-base text-slate-900 font-display">Auditoría de Gastos CapEx & Garantías de Equipos (Diego)</h3>
            <p className="text-xs text-slate-500">Verificación técnica de reclamos de mantenimiento y pólizas Carrier / Caterpillar ($0 costo).</p>
          </div>
        )}

        {activeTab === "cam" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
            <h3 className="font-bold text-base text-slate-900 font-display">Prorrateo CAM NNN & Auditoría Fiscal SAT CFDI 4.0 (Renata)</h3>
            <p className="text-xs text-slate-500">Timbrado CFDI 4.0, complementos de pago PPD vs PUE y balance NNN exacto.</p>
          </div>
        )}

        {activeTab === "saari" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
            <h3 className="font-bold text-base text-slate-900 font-display">Conector SAARI ERP</h3>
            <p className="text-xs text-slate-500">Ingestión de auxiliares de cobranza y exportación de lotes batch para SAARI ERP.</p>
          </div>
        )}
      </main>

      {/* ---------------- 3. FLOATING RIGHT PANEL (Asistente AI Interactivo - Mariana/Diego/Renata) ---------------- */}
      <aside className="w-full lg:w-80 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between shrink-0 lg:sticky lg:top-7 lg:h-[calc(100vh-3.5rem)] space-y-4">
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Agent Switcher Header */}
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Asistente AI Asignado
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveAgent("mariana")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeAgent === "mariana" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Mariana
              </button>
              <button
                onClick={() => setActiveAgent("diego")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeAgent === "diego" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Diego
              </button>
              <button
                onClick={() => setActiveAgent("renata")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeAgent === "renata" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Renata
              </button>
            </div>
          </div>

          {/* Quick Query Pills */}
          <div className="space-y-1.5 text-xs">
            <span className="text-[10px] text-slate-400 font-semibold block">Preguntas Rápidas:</span>
            {activeAgent === "mariana" && (
              <button
                onClick={() => {
                  setAiQuery("¿Por qué bloqueamos a Starbucks Reserve?");
                  setChatHistory([
                    ...chatHistory,
                    {
                      agent: "Mariana",
                      query: "¿Por qué bloqueamos a Starbucks Reserve?",
                      answer: "Starbucks presentó 98.4% de conflicto de menú con Blue Luna Café (Cláusula #14 de exclusividad).",
                    },
                  ]);
                }}
                className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700 text-[11px] transition-all cursor-pointer"
              >
                ☕ Exclusividad Blue Luna vs Starbucks
              </button>
            )}
            {activeAgent === "diego" && (
              <button
                onClick={() => {
                  setAiQuery("¿Cuál es la garantía del compresor Carrier?");
                  setChatHistory([
                    ...chatHistory,
                    {
                      agent: "Diego",
                      query: "¿Cuál es la garantía del compresor Carrier?",
                      answer: "Póliza Carrier #CR-884920 cubre el 100% de la falla de compresor de Ashley Furniture ($0 costo).",
                    },
                  ]);
                }}
                className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700 text-[11px] transition-all cursor-pointer"
              >
                ❄️ Póliza Carrier HVAC Ashley
              </button>
            )}
            {activeAgent === "renata" && (
              <button
                onClick={() => {
                  setAiQuery("¿Por qué MINT Boutique tiene alerta SAT?");
                  setChatHistory([
                    ...chatHistory,
                    {
                      agent: "Renata",
                      query: "¿Por qué MINT Boutique tiene alerta SAT?",
                      answer: "Pago registrado como PUE pero factura emitida en PPD. Se requiere Complemento SAT CFDI 4.0.",
                    },
                  ]);
                }}
                className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700 text-[11px] transition-all cursor-pointer"
              >
                📄 Alerta SAT CFDI MINT Boutique
              </button>
            )}
          </div>

          {/* Feed de Conversaciones */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {chatHistory.map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 block">{item.agent}</span>
                <p className="font-semibold text-slate-900">{item.query}</p>
                <p className="text-slate-600 leading-relaxed text-[11px]">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Input Bar at Bottom (Estilo Steep AI Chat) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!aiQuery.trim()) return;
            setChatHistory([
              ...chatHistory,
              {
                agent: activeAgent === "mariana" ? "Mariana" : activeAgent === "diego" ? "Diego" : "Renata",
                query: aiQuery,
                answer: `Respuesta verificada para "${aiQuery}": Expediente en regla conforme a la normativa de Plaza La Gran Vía.`,
              },
            ]);
            setAiQuery("");
          }}
          className="pt-2 border-t border-slate-100"
        >
          <div className="relative">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder={`Pregunta a ${activeAgent === "mariana" ? "Mariana" : activeAgent === "diego" ? "Diego" : "Renata"}...`}
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 h-7 w-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-all"
            >
              ↑
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
