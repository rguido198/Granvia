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
    overlapScore: "98.4% Coincidencia Semántica",
    legalFilter: "Cumplimiento Estricto de Contrato",
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
    contractExactSnippet: '"...Queda strictly prohibido a la administración de Plaza La Gran Vía arrendar locales adyacentes a competidores directos en la categoría de repostería fina, donas glaseadas o panadería artesanal..."',
    overlapScore: "91.2% Coincidencia en Repostería",
    legalFilter: "Protección de Arrendatario Ancla",
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
    expenseType: "Falla de Compresor HVAC 15 Toneladas (Calor Mexicali)",
    amount: 145000,
    isQuestionable: false,
    verdict: "APROBADO_GARANTIA_COSTO_CERO",
    details: "GARANTÍA APLICADA ($0 COSTO PROPIETARIO): Diego verificó número de serie Carrier #CR-884920. El reemplazo está cubierto al 100% por póliza de fábrica de Carrier.",
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

  const [aiQuery, setAiQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{ agent: string; query: string; answer: string; ref?: string }[]>([
    {
      agent: "Mariana (Legal)",
      query: "¿Por qué se rechazó a Starbucks Reserve?",
      answer: "Presentó 98.4% de conflicto de menú con Blue Luna Café (Local B-02), violando la Cláusula #14 de exclusividad comercial.",
      ref: "Contrato_BlueLuna_LocB02.pdf",
    },
    {
      agent: "Diego (CapEx)",
      query: "¿Cuál fue la resolución del compresor HVAC de Ashley?",
      answer: "Se hizo efectiva la garantía Carrier #CR-884920. Reemplazo a $0 costo para el propietario ($145,000 MXN ahorrados).",
      ref: "Poliza_Carrier_Ashley.pdf",
    },
  ]);

  const totalOccupiedSqm = TENANTS.reduce((sum, t, idx) => sum + getTenantSqm(t.name, idx), 0);
  const vacancySqm = 445;
  const plazaTotalGla = totalOccupiedSqm + vacancySqm;

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
    <div className="min-h-screen bg-[#f9f8f5] text-[#1c1a17] font-sans p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1550px] mx-auto">
      {/* ---------------- 1. MATURE EXECUTIVE TOP HEADER (Estilo Ventriloc) ---------------- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#e8e4dc]">
        <div className="flex items-center gap-6">
          <Link href="/" className="block shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/la-gran-via-logo-horizontal.png"
              alt="La Gran Vía Mexicali"
              className="h-9 w-auto object-contain"
            />
          </Link>

          {/* Clean Pill Dropdowns/Tabs Header (Ventriloc Top Pill Navigation) */}
          <nav className="hidden sm:flex items-center gap-1.5 bg-[#f0ede6] p-1 rounded-full border border-[#e2ddd4]">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-[#1c1a17] text-white shadow-xs"
                  : "text-[#6e685e] hover:text-[#1c1a17]"
              }`}
            >
              Rent Roll ({TENANTS.length})
            </button>

            <button
              onClick={() => setActiveTab("leasing")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === "leasing"
                  ? "bg-[#1c1a17] text-white shadow-xs"
                  : "text-[#6e685e] hover:text-[#1c1a17]"
              }`}
            >
              Arrendamiento (Mariana)
            </button>

            <button
              onClick={() => setActiveTab("maint")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === "maint"
                  ? "bg-[#1c1a17] text-white shadow-xs"
                  : "text-[#6e685e] hover:text-[#1c1a17]"
              }`}
            >
              CapEx & Gastos (Diego)
            </button>

            <button
              onClick={() => setActiveTab("cam")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === "cam"
                  ? "bg-[#1c1a17] text-white shadow-xs"
                  : "text-[#6e685e] hover:text-[#1c1a17]"
              }`}
            >
              CAM & Fiscal SAT (Renata)
            </button>
          </nav>
        </div>

        {/* Right Header Pill Actions */}
        <div className="flex items-center gap-3">
          <span className="hidden lg:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0ede6] text-[#5e584e] text-xs font-medium border border-[#e2ddd4]">
            <span className="h-2 w-2 rounded-full bg-[#3d7a52]" />
            7,550 m² GLA Mexicali
          </span>

          <button
            onClick={() => alert("Generando reporte PDF ejecutivo...")}
            className="px-4 py-2 border border-[#d8d2c6] text-[#1c1a17] bg-white hover:bg-[#f0ede6] text-xs font-medium rounded-full transition-all cursor-pointer"
          >
            Exportar Reporte
          </button>

          <button
            onClick={() => setActiveTab("saari")}
            className="px-5 py-2 bg-[#1c1a17] text-white hover:bg-[#2d2a26] text-xs font-medium rounded-full transition-all cursor-pointer shadow-xs"
          >
            Conectar SAARI
          </button>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="flex sm:hidden overflow-x-auto gap-1 bg-[#f0ede6] p-1 rounded-full border border-[#e2ddd4] text-xs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium ${
            activeTab === "overview" ? "bg-[#1c1a17] text-white" : "text-[#6e685e]"
          }`}
        >
          Rent Roll
        </button>
        <button
          onClick={() => setActiveTab("leasing")}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium ${
            activeTab === "leasing" ? "bg-[#1c1a17] text-white" : "text-[#6e685e]"
          }`}
        >
          Arrendamiento
        </button>
        <button
          onClick={() => setActiveTab("maint")}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium ${
            activeTab === "maint" ? "bg-[#1c1a17] text-white" : "text-[#6e685e]"
          }`}
        >
          CapEx
        </button>
        <button
          onClick={() => setActiveTab("cam")}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium ${
            activeTab === "cam" ? "bg-[#1c1a17] text-white" : "text-[#6e685e]"
          }`}
        >
          CAM SAT
        </button>
      </div>

      {/* ---------------- 2. MAIN LAYOUT GRID (Estilo Ventriloc: Editorial + Clean Data) ---------------- */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Hero Statement Section (Estilo Ventriloc "Accelerating Growth Through Analytics") */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-semibold text-[#8c8273] uppercase tracking-wider block">
                Consola de Control Operativo · La Gran Vía Mexicali
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1c1a17] font-display leading-tight">
                Gestión Integral de Activo Inmobiliario
              </h1>
              <p className="text-sm text-[#666055] leading-relaxed max-w-xl">
                Supervisión centralizada del Rent Roll, prorrateo NNN de mantenimiento y auditoría cognitiva de contratos para prevenir conflictos de exclusividad en Plaza La Gran Vía.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <span className="text-xs font-semibold text-[#1c1a17]">Titular: Sr. Martín</span>
                <span className="text-[#a0988a]">•</span>
                <span className="text-xs text-[#706a5f]">Director de Operaciones & Asset Management</span>
              </div>
            </div>

            {/* KPI Cards Grid (Estilo Ventriloc Floating Neutral Cards) */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Cobranza */}
              <div className="bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-[#827a6e]">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Cobranza Mensual</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#eaf2ec] text-[#2b593a] text-[10px] font-semibold">
                    98.2% Al Día
                  </span>
                </div>
                <div className="text-2xl font-bold text-[#1c1a17] font-display">
                  $3,145,000 <span className="text-xs font-normal text-[#8c8477]">MXN</span>
                </div>
                <p className="text-xs text-[#736c60]">Total facturado periodo Julio 2026</p>
              </div>

              {/* Card 2: Ocupación */}
              <div className="bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-[#827a6e]">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Ocupación GLA</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#eaf2ec] text-[#2b593a] text-[10px] font-semibold">
                    94.1% Ocupado
                  </span>
                </div>
                <div className="text-2xl font-bold text-[#1c1a17] font-display">
                  7,105 m² <span className="text-xs font-normal text-[#8c8477]">Arrendados</span>
                </div>
                <p className="text-xs text-[#736c60]">445 m² vacantes (2 locales)</p>
              </div>

              {/* Card 3: Invariante CAM */}
              <div className="bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-[#827a6e]">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Invariante CAM</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#f0ede6] text-[#1c1a17] text-[10px] font-semibold">
                    Balance NNN
                  </span>
                </div>
                <div className="text-2xl font-bold text-[#1c1a17] font-display">
                  1.0000 <span className="text-xs font-normal text-[#8c8477]">Exacto</span>
                </div>
                <p className="text-xs text-[#736c60]">85 locales cuadrados al 100%</p>
              </div>

              {/* Card 4: Ahorro CapEx */}
              <div className="bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-[#827a6e]">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Ahorro CapEx AI</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#f4efe6] text-[#6b5838] text-[10px] font-semibold">
                    Garantía Carrier
                  </span>
                </div>
                <div className="text-2xl font-bold text-[#2b593a] font-display">
                  $78,000 <span className="text-xs font-normal text-[#8c8477]">MXN</span>
                </div>
                <p className="text-xs text-[#736c60]">Gasto improcedente rechazado</p>
              </div>
            </div>
          </div>

          {/* GLA Commercial Mix Neutral Segment Bar */}
          <div className="bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f0ede6] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#1c1a17] font-display">
                  Distribución de Mezcla Comercial (7,550 m² GLA Total)
                </h3>
                <p className="text-xs text-[#736c60]">
                  Proporción de área arrendable por sector comercial en la plaza.
                </p>
              </div>
              <span className="text-xs font-medium text-[#2b593a] bg-[#eaf2ec] px-3 py-1 rounded-full border border-[#d2e3d6]">
                94.1% Área Activa Generando Renta
              </span>
            </div>

            {/* Subtle Neutral Segmented Bar */}
            <div className="h-3 w-full rounded-full bg-[#f0ede6] overflow-hidden flex">
              <div style={{ width: "35.2%" }} className="bg-[#4a443c] h-full" title="Gastronomía (35.2%)" />
              <div style={{ width: "28.6%" }} className="bg-[#8c8273] h-full" title="Retail (28.6%)" />
              <div style={{ width: "18.4%" }} className="bg-[#b8ae9e] h-full" title="Servicios (18.4%)" />
              <div style={{ width: "11.9%" }} className="bg-[#d4cdbf] h-full" title="Entretenimiento (11.9%)" />
              <div style={{ width: "5.9%" }} className="bg-[#e8e4dc] h-full" title="Vacancia (5.9%)" />
            </div>

            {/* Neutral Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 text-[#5e584e]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#4a443c]" />
                <span>Gastronomía & Rest. (35.2%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8c8273]" />
                <span>Retail & Moda (28.6%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#b8ae9e]" />
                <span>Servicios & Bancos (18.4%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#d4cdbf]" />
                <span>Entretenimiento (11.9%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e8e4dc]" />
                <span className="text-[#8c8477]">Vacancia Absorbida (5.9%)</span>
              </div>
            </div>
          </div>

          {/* ---------------- 3. RENT ROLL TABLE & FLOATING AI DRAWER GRID ---------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Rent Roll Table Card (8 Columns) */}
            <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#f0ede6] pb-4">
                <div>
                  <h3 className="font-bold text-sm text-[#1c1a17] font-display">
                    Matriz Consolidada de Rent Roll ({filteredTenants.length} Locales)
                  </h3>
                  <p className="text-xs text-[#736c60]">
                    Estado de cobranza y validación fiscal CFDI 4.0 en tiempo real.
                  </p>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por inquilino, local, giro..."
                    className="px-3.5 py-1.5 rounded-full text-xs border border-[#e2ddd4] bg-[#f9f8f5] text-[#1c1a17] placeholder-[#a0988a] focus:outline-none focus:ring-1 focus:ring-[#1c1a17] focus:bg-white transition-all w-full sm:w-56"
                  />

                  <div className="flex items-center gap-1 text-xs">
                    <button
                      onClick={() => setFilterCategory("all")}
                      className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                        filterCategory === "all"
                          ? "bg-[#1c1a17] text-white"
                          : "bg-[#f0ede6] text-[#5e584e] hover:bg-[#e4dfd5]"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFilterCategory("ok")}
                      className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                        filterCategory === "ok"
                          ? "bg-[#2b593a] text-white"
                          : "bg-[#f0ede6] text-[#5e584e] hover:bg-[#e4dfd5]"
                      }`}
                    >
                      Al Día
                    </button>
                    <button
                      onClick={() => setFilterCategory("sat")}
                      className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                        filterCategory === "sat"
                          ? "bg-[#7a2e2b] text-white"
                          : "bg-[#f0ede6] text-[#5e584e] hover:bg-[#e4dfd5]"
                      }`}
                    >
                      Alerta SAT
                    </button>
                  </div>
                </div>
              </div>

              {/* Table Component */}
              <div className="overflow-x-auto border border-[#f0ede6] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#f0ede6] text-[#8c8477] uppercase text-[10px] bg-[#f9f8f5] tracking-wider">
                      <th className="p-3 font-semibold">#</th>
                      <th className="p-3 font-semibold">Inquilino / Local</th>
                      <th className="p-3 font-semibold">Zona</th>
                      <th className="p-3 font-semibold">Giro</th>
                      <th className="p-3 font-semibold text-right">Superficie</th>
                      <th className="p-3 font-semibold text-right">Pro-Rata</th>
                      <th className="p-3 font-semibold text-right">Renta MXN</th>
                      <th className="p-3 font-semibold">Estado Cobranza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f2eb] font-normal text-[#2d2a26]">
                    {filteredTenants.map((t, idx) => {
                      const sqm = getTenantSqm(t.name, idx);
                      const sharePct = ((sqm / plazaTotalGla) * 100).toFixed(2);
                      const estRent = Math.round(sqm * 240);
                      const isSatError = t.name.includes("MINT");

                      return (
                        <tr key={t.slug} className="hover:bg-[#fcfbf9] transition-colors">
                          <td className="p-3 text-[#a0988a] font-mono text-[11px]">{idx + 1}</td>
                          <td className="p-3 font-semibold text-[#1c1a17]">{t.name}</td>
                          <td className="p-3 text-[#736c60] text-[11px]">{t.zone}</td>
                          <td className="p-3 text-[#5e584e]">{t.tag}</td>
                          <td className="p-3 text-right font-medium text-[#1c1a17]">{sqm} m²</td>
                          <td className="p-3 text-right font-medium text-[#5e584e]">{sharePct}%</td>
                          <td className="p-3 text-right font-semibold text-[#1c1a17]">${estRent.toLocaleString()}</td>
                          <td className="p-3">
                            {isSatError ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f5e9e8] text-[#7a2e2b] text-[10px] font-semibold border border-[#e8d2d1]">
                                Alerta Fiscal SAT (PPD)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#eaf2ec] text-[#2b593a] text-[10px] font-semibold border border-[#d2e3d6]">
                                Al Día (CFDI 4.0)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-[#1c1a17] text-white text-xs">
                    <tr>
                      <td className="p-3 font-bold">TOTAL</td>
                      <td className="p-3 font-semibold" colSpan={3}>
                        PLAZA LA GRAN VÍA ({TENANTS.length} LOCALES)
                      </td>
                      <td className="p-3 text-right font-semibold">{plazaTotalGla.toLocaleString()} m²</td>
                      <td className="p-3 text-right font-semibold">1.0000</td>
                      <td className="p-3 text-right font-bold text-[#e6dfd5]">$3,145,000 MXN</td>
                      <td className="p-3 text-[#c4b8aa]">94.1% Ocupación</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Interactive Right AI Agent Drawer (4 Columns) */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-4 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="border-b border-[#f0ede6] pb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8c8477] block mb-1">
                    Consulta a Agentes IA (Mariana / Diego / Renata)
                  </span>
                  <div className="flex items-center gap-1 bg-[#f0ede6] p-1 rounded-full border border-[#e2ddd4]">
                    <button
                      onClick={() => setActiveAgent("mariana")}
                      className={`flex-1 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        activeAgent === "mariana" ? "bg-[#1c1a17] text-white shadow-xs" : "text-[#6e685e]"
                      }`}
                    >
                      Mariana (Legal)
                    </button>
                    <button
                      onClick={() => setActiveAgent("diego")}
                      className={`flex-1 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        activeAgent === "diego" ? "bg-[#1c1a17] text-white shadow-xs" : "text-[#6e685e]"
                      }`}
                    >
                      Diego (CapEx)
                    </button>
                    <button
                      onClick={() => setActiveAgent("renata")}
                      className={`flex-1 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        activeAgent === "renata" ? "bg-[#1c1a17] text-white shadow-xs" : "text-[#6e685e]"
                      }`}
                    >
                      Renata (SAT)
                    </button>
                  </div>
                </div>

                {/* Preset Prompt Pills */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-[#8c8477] block">Consultas Frecuentes:</span>
                  {activeAgent === "mariana" && (
                    <button
                      onClick={() => {
                        setChatHistory([
                          ...chatHistory,
                          {
                            agent: "Mariana",
                            query: "¿Por qué se bloqueó a Starbucks Reserve?",
                            answer: "Starbucks presentó 98.4% de coincidencia en menú con Blue Luna Café, violando la Cláusula #14 de exclusividad comercial.",
                          },
                        ]);
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-[#f9f8f5] hover:bg-[#f0ede6] border border-[#e8e4dc] text-[#2d2a26] text-xs transition-all cursor-pointer"
                    >
                      Exclusividad Blue Luna vs Starbucks
                    </button>
                  )}
                  {activeAgent === "diego" && (
                    <button
                      onClick={() => {
                        setChatHistory([
                          ...chatHistory,
                          {
                            agent: "Diego",
                            query: "¿Cuál es el estatus del compresor HVAC?",
                            answer: "Póliza de garantía Carrier #CR-884920 cubre 100% del reemplazo en Ashley Furniture ($0 costo propietario).",
                          },
                        ]);
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-[#f9f8f5] hover:bg-[#f0ede6] border border-[#e8e4dc] text-[#2d2a26] text-xs transition-all cursor-pointer"
                    >
                      Garantía Carrier HVAC Ashley
                    </button>
                  )}
                  {activeAgent === "renata" && (
                    <button
                      onClick={() => {
                        setChatHistory([
                          ...chatHistory,
                          {
                            agent: "Renata",
                            query: "¿Por qué MINT Boutique tiene alerta SAT?",
                            answer: "Factura emitida en PPD requiere Complemento de Pago CFDI 4.0 para conciliar depósito bancario.",
                          },
                        ]);
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-[#f9f8f5] hover:bg-[#f0ede6] border border-[#e8e4dc] text-[#2d2a26] text-xs transition-all cursor-pointer"
                    >
                      Alerta CFDI 4.0 MINT Boutique
                    </button>
                  )}
                </div>

                {/* Conversation History */}
                <div className="space-y-3 pt-2 max-h-60 overflow-y-auto">
                  {chatHistory.map((item, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#f9f8f5] border border-[#e8e4dc] text-xs space-y-1">
                      <span className="text-[10px] font-semibold text-[#8c8477] block">{item.agent}</span>
                      <p className="font-semibold text-[#1c1a17]">{item.query}</p>
                      <p className="text-[#5e584e] leading-relaxed">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!aiQuery.trim()) return;
                  setChatHistory([
                    ...chatHistory,
                    {
                      agent: activeAgent === "mariana" ? "Mariana" : activeAgent === "diego" ? "Diego" : "Renata",
                      query: aiQuery,
                      answer: `Respuesta para "${aiQuery}": Verificado y conciliado conforme a expediente oficial.`,
                    },
                  ]);
                  setAiQuery("");
                }}
                className="pt-2 border-t border-[#f0ede6]"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    placeholder={`Escribe a ${activeAgent === "mariana" ? "Mariana" : activeAgent === "diego" ? "Diego" : "Renata"}...`}
                    className="w-full px-4 py-2.5 pr-10 rounded-full bg-[#f9f8f5] border border-[#e2ddd4] text-xs text-[#1c1a17] placeholder-[#a0988a] focus:outline-none focus:ring-1 focus:ring-[#1c1a17] focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full bg-[#1c1a17] text-white text-xs font-bold flex items-center justify-center cursor-pointer hover:bg-[#2d2a26] transition-all"
                  >
                    ↑
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Modules */}
      {activeTab === "leasing" && (
        <div className="bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-4">
          <h3 className="font-bold text-base text-[#1c1a17] font-display">Módulo de Arrendamiento & Inteligencia Legal (Mariana)</h3>
          <p className="text-xs text-[#736c60]">Evaluación de solicitudes prospecto y bóveda RAG de 85 contratos en Mexicali.</p>
        </div>
      )}

      {activeTab === "maint" && (
        <div className="bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-4">
          <h3 className="font-bold text-base text-[#1c1a17] font-display">Auditoría de Gastos CapEx & Garantías de Equipos (Diego)</h3>
          <p className="text-xs text-[#736c60]">Verificación técnica de reclamos de mantenimiento y pólizas Carrier / Caterpillar.</p>
        </div>
      )}

      {activeTab === "cam" && (
        <div className="bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-4">
          <h3 className="font-bold text-base text-[#1c1a17] font-display">Prorrateo CAM NNN & Auditoría Fiscal SAT (Renata)</h3>
          <p className="text-xs text-[#736c60]">Timbrado CFDI 4.0, complementos PPD y balance NNN exacto.</p>
        </div>
      )}

      {activeTab === "saari" && (
        <div className="bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-4">
          <h3 className="font-bold text-base text-[#1c1a17] font-display">Conector SAARI ERP</h3>
          <p className="text-xs text-[#736c60]">Ingestión de auxiliares de cobranza y exportación de lotes para SAARI ERP.</p>
        </div>
      )}
    </div>
  );
}
