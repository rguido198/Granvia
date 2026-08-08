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
  equipmentModel: string;
  serialNumber: string;
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
    legalFilter: "Protección de Arrendatario Ancla",
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
    details: "RECHAZADO POR DIEGO AI: Solicitud improcedente. El contrato de arrendamiento (Sección 12) establece que la iluminación estética interior es responsabilidad 100% del arrendatario.",
    equipmentModel: "Luminaria LED Estética 240V",
    serialNumber: "DL-99482-DECO",
  },
  {
    id: "CAP-02",
    tenant: "Ashley Furniture",
    expenseType: "Falla de Compresor HVAC 15 Toneladas (Calor Mexicali)",
    amount: 145000,
    isQuestionable: false,
    verdict: "APROBADO_GARANTIA_COSTO_CERO",
    details: "GARANTÍA APLICADA ($0 COSTO PROPIETARIO): Diego verificó número de serie Carrier #CR-884920. El reemplazo está cubierto al 100% por póliza de fábrica de Carrier.",
    equipmentModel: "Carrier WeatherExpert 15-Ton HVAC",
    serialNumber: "CR-884920-MEX",
  },
  {
    id: "CAP-03",
    tenant: "Cinemex Premium",
    expenseType: "Mantenimiento Preventivo de Planta de Emergencia Común",
    amount: 52000,
    isQuestionable: false,
    verdict: "APROBADO_PRORRATEO_CAM",
    details: "APROBADO PARA CAM NNN: Gasto de infraestructura común prorrateable entre todos los locales en la liquidación mensual.",
    equipmentModel: "Planta Diésel Caterpillar 500kW",
    serialNumber: "CAT-99201-PLAZA",
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

  const [selectedLeasingApp, setSelectedLeasingApp] = useState<ApplicantCase>(LEASING_APPLICANTS[0]);
  const [selectedCapex, setSelectedCapex] = useState<CapexCase>(CAPEX_CASES[0]);
  const [attorneySent, setAttorneySent] = useState(false);
  const [diegoNotificationSent, setDiegoNotificationSent] = useState(false);
  const [renataCfdiIssued, setRenataCfdiIssued] = useState(false);

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

      {/* ---------------- PESTAÑA 1: OVERVIEW (RENT ROLL & SUMMARY) ---------------- */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Hero Statement Section */}
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

            {/* KPI Cards Grid */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* GLA Commercial Mix Bar */}
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

            <div className="h-3 w-full rounded-full bg-[#f0ede6] overflow-hidden flex">
              <div style={{ width: "35.2%" }} className="bg-[#4a443c] h-full" title="Gastronomía (35.2%)" />
              <div style={{ width: "28.6%" }} className="bg-[#8c8273] h-full" title="Retail (28.6%)" />
              <div style={{ width: "18.4%" }} className="bg-[#b8ae9e] h-full" title="Servicios (18.4%)" />
              <div style={{ width: "11.9%" }} className="bg-[#d4cdbf] h-full" title="Entretenimiento (11.9%)" />
              <div style={{ width: "5.9%" }} className="bg-[#e8e4dc] h-full" title="Vacancia (5.9%)" />
            </div>

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

          {/* Rent Roll Table & AI Drawer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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

            {/* Floating AI Drawer */}
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
                      Mariana
                    </button>
                    <button
                      onClick={() => setActiveAgent("diego")}
                      className={`flex-1 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        activeAgent === "diego" ? "bg-[#1c1a17] text-white shadow-xs" : "text-[#6e685e]"
                      }`}
                    >
                      Diego
                    </button>
                    <button
                      onClick={() => setActiveAgent("renata")}
                      className={`flex-1 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        activeAgent === "renata" ? "bg-[#1c1a17] text-white shadow-xs" : "text-[#6e685e]"
                      }`}
                    >
                      Renata
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {chatHistory.map((item, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#f9f8f5] border border-[#e8e4dc] text-xs space-y-1">
                      <span className="text-[10px] font-semibold text-[#8c8477] block">{item.agent}</span>
                      <p className="font-semibold text-[#1c1a17]">{item.query}</p>
                      <p className="text-[#5e584e] leading-relaxed">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!aiQuery.trim()) return;
                  setChatHistory([
                    ...chatHistory,
                    {
                      agent: activeAgent === "mariana" ? "Mariana" : activeAgent === "diego" ? "Diego" : "Renata",
                      query: aiQuery,
                      answer: `Respuesta para "${aiQuery}": Expediente conciliado en base de datos.`,
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

      {/* ---------------- PESTAÑA 2: MARIANA AI (DETALLES LEGALES RAG & PROSPECTOS) ---------------- */}
      {activeTab === "leasing" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f0ede6] pb-4">
              <div>
                <span className="text-xs font-semibold text-[#8c8273] uppercase tracking-wider block">
                  Inteligencia Legal RAG & Protección de Exclusividades
                </span>
                <h2 className="text-xl font-bold text-[#1c1a17] font-display mt-0.5">
                  Agente Mariana · Auditoría de Solicitudes de Arrendamiento
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#eaf2ec] text-[#2b593a] text-xs font-semibold border border-[#d2e3d6]">
                85 Contratos RAG Indexados
              </span>
            </div>

            {/* Applicant Selector Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {LEASING_APPLICANTS.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    setSelectedLeasingApp(app);
                    setAttorneySent(false);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-2 ${
                    selectedLeasingApp.id === app.id
                      ? "border-[#1c1a17] bg-[#f9f8f5] shadow-xs"
                      : "border-[#e8e4dc] bg-white hover:bg-[#f9f8f5]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#1c1a17]">{app.brand}</span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
                        app.status === "RECHAZADO"
                          ? "bg-[#f5e9e8] text-[#7a2e2b] border border-[#e8d2d1]"
                          : "bg-[#f4efe6] text-[#6b5838] border border-[#e2ddd4]"
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#736c60] line-clamp-1">{app.category}</p>
                  <p className="text-[11px] text-[#2b593a] font-medium pt-1">
                    Prevención de Daño: {app.rentLossPrevented}
                  </p>
                </button>
              ))}
            </div>

            {/* Deep RAG Contract Viewer Box */}
            <div className="bg-[#f9f8f5] rounded-xl p-6 border border-[#e8e4dc] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e8e4dc] pb-3">
                <div>
                  <span className="text-[10px] font-semibold text-[#8c8477] uppercase tracking-wider block">
                    Dictamen Cognitivo Automático
                  </span>
                  <h3 className="font-bold text-base text-[#1c1a17] font-display">
                    Expediente: {selectedLeasingApp.brand} ({selectedLeasingApp.category})
                  </h3>
                </div>
                <span className="text-xs font-semibold text-[#7a2e2b] bg-[#f5e9e8] px-3 py-1 rounded-full border border-[#e8d2d1]">
                  {selectedLeasingApp.overlapScore}
                </span>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-[#2d2a26]">
                <p><strong>Fundamento Jurídico:</strong> {selectedLeasingApp.reasoning}</p>
                <p><strong>Arrendatario Afectado:</strong> {selectedLeasingApp.conflictingTenant}</p>
                <p><strong>Cláusula Legal Invocada:</strong> {selectedLeasingApp.conflictingClause}</p>
              </div>

              {/* Exact Contract Snippet Box */}
              <div className="bg-white p-4 rounded-xl border border-[#e8e4dc] space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#8c8477] font-mono">
                  <span>📄 {selectedLeasingApp.contractPdfName}</span>
                  <span>{selectedLeasingApp.contractPdfPage}</span>
                </div>
                <p className="text-xs text-[#1c1a17] italic font-serif leading-relaxed bg-[#f9f8f5] p-3 rounded-lg border border-[#f0ede6]">
                  {selectedLeasingApp.contractExactSnippet}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setAttorneySent(true)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    attorneySent
                      ? "bg-[#2b593a] text-white"
                      : "bg-[#1c1a17] text-white hover:bg-[#2d2a26]"
                  }`}
                >
                  {attorneySent ? "✓ Notificación Enviada a Despacho Legal" : "Enviar Instrucción a Despacho Legal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 3: DIEGO AI (CAPEX & MANTENIMIENTO) ---------------- */}
      {activeTab === "maint" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f0ede6] pb-4">
              <div>
                <span className="text-xs font-semibold text-[#8c8273] uppercase tracking-wider block">
                  Auditoría Técnica de Mantenimiento & Garantías de Equipos
                </span>
                <h2 className="text-xl font-bold text-[#1c1a17] font-display mt-0.5">
                  Agente Diego · Verificación CapEx & Pólizas de Fábrica
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#f4efe6] text-[#6b5838] text-xs font-semibold border border-[#e2ddd4]">
                $145,000 MXN en Pólizas Activas
              </span>
            </div>

            {/* CapEx Cases List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {CAPEX_CASES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedCapex(item);
                    setDiegoNotificationSent(false);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-2 ${
                    selectedCapex.id === item.id
                      ? "border-[#1c1a17] bg-[#f9f8f5] shadow-xs"
                      : "border-[#e8e4dc] bg-white hover:bg-[#f9f8f5]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#1c1a17]">{item.tenant}</span>
                    <span className="font-mono text-xs font-bold text-[#1c1a17]">
                      ${item.amount.toLocaleString()} MXN
                    </span>
                  </div>
                  <p className="text-xs text-[#736c60] line-clamp-1">{item.expenseType}</p>
                </button>
              ))}
            </div>

            {/* CapEx Details Box */}
            <div className="bg-[#f9f8f5] rounded-xl p-6 border border-[#e8e4dc] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e8e4dc] pb-3">
                <div>
                  <span className="text-[10px] font-semibold text-[#8c8477] uppercase tracking-wider block">
                    Verificación de Póliza & Número de Serie
                  </span>
                  <h3 className="font-bold text-base text-[#1c1a17] font-display">
                    {selectedCapex.tenant} — {selectedCapex.expenseType}
                  </h3>
                </div>
                <span className="text-xs font-semibold text-[#2b593a] bg-[#eaf2ec] px-3 py-1 rounded-full border border-[#d2e3d6]">
                  Modelo: {selectedCapex.equipmentModel}
                </span>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-[#2d2a26]">
                <p><strong>Número de Serie Registrado:</strong> <code className="bg-white px-2 py-0.5 rounded border border-[#e2ddd4] font-mono">{selectedCapex.serialNumber}</code></p>
                <p><strong>Resolución de Diego AI:</strong> {selectedCapex.details}</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setDiegoNotificationSent(true)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    diegoNotificationSent
                      ? "bg-[#2b593a] text-white"
                      : "bg-[#1c1a17] text-white hover:bg-[#2d2a26]"
                  }`}
                >
                  {diegoNotificationSent ? "✓ Póliza Reclamada con Proveedor" : "Reclamar Garantía con Proveedor Carrier"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 4: RENATA AI (CAM NNN & FISCAL SAT) ---------------- */}
      {activeTab === "cam" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f0ede6] pb-4">
              <div>
                <span className="text-xs font-semibold text-[#8c8273] uppercase tracking-wider block">
                  Auditoría Fiscal SAT CFDI 4.0 & Prorrateo NNN Exacto
                </span>
                <h2 className="text-xl font-bold text-[#1c1a17] font-display mt-0.5">
                  Agente Renata · Conciliación Bancaria & Complementos PPD / PUE
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#f5e9e8] text-[#7a2e2b] text-xs font-semibold border border-[#e8d2d1]">
                1 Alerta de Inconsistencia PPD
              </span>
            </div>

            {/* Table of SAT Inconsistencies */}
            <div className="bg-[#f9f8f5] rounded-xl p-6 border border-[#e8e4dc] space-y-4">
              <h3 className="font-bold text-sm text-[#1c1a17] font-display">
                Detalle de Alerta Fiscal: MINT Boutique (Local B-14)
              </h3>
              <p className="text-xs text-[#5e584e] leading-relaxed">
                El depósito bancario se registró bajo clave PUE (Pago en Una Sola Exhibición), pero el sistema fiscal emitió la factura bajo el régimen PPD (Pago en Parcialidades o Diferido). Se requiere emitir el Complemento de Pago CFDI 4.0 para evitar multa del SAT.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => setRenataCfdiIssued(true)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    renataCfdiIssued
                      ? "bg-[#2b593a] text-white"
                      : "bg-[#1c1a17] text-white hover:bg-[#2d2a26]"
                  }`}
                >
                  {renataCfdiIssued ? "✓ Complemento CFDI 4.0 Emitido Ante el SAT" : "Emitir Complemento de Pago CFDI 4.0 Automático"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 5: CONECTOR SAARI ERP ---------------- */}
      {activeTab === "saari" && (
        <div className="bg-white rounded-2xl p-6 border border-[#e8e4dc] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f0ede6] pb-4">
            <div>
              <span className="text-xs font-semibold text-[#8c8273] uppercase tracking-wider block">
                Integración de Datos de Inmuebles
              </span>
              <h2 className="text-xl font-bold text-[#1c1a17] font-display mt-0.5">
                Conector Directo SAARI ERP
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#eaf2ec] text-[#2b593a] text-xs font-semibold border border-[#d2e3d6]">
              Estado: Sincronizado
            </span>
          </div>

          <div className="bg-[#f9f8f5] rounded-xl p-6 border border-[#e8e4dc] space-y-3 text-xs text-[#2d2a26]">
            <p><strong>Última Sincronización:</strong> Hace 12 minutos (Lote Batch #SAARI-8849)</p>
            <p><strong>Auxiliares de Cobranza Procesados:</strong> 85 contratos de arrendamiento en Mexicali.</p>
            <button
              onClick={() => alert("Sincronizando base de datos SAARI ERP...")}
              className="mt-2 px-4 py-2 bg-[#1c1a17] text-white rounded-full font-medium hover:bg-[#2d2a26] transition-all cursor-pointer"
            >
              Forzar Resincronización SAARI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
