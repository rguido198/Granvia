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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "ok" | "sat" | "excl">("all");

  const [selectedLeasingApp, setSelectedLeasingApp] = useState<ApplicantCase>(LEASING_APPLICANTS[0]);
  const [selectedCapex, setSelectedCapex] = useState<CapexCase>(CAPEX_CASES[0]);
  const [attorneySent, setAttorneySent] = useState(false);
  const [diegoNotificationSent, setDiegoNotificationSent] = useState(false);
  const [renataCfdiIssued, setRenataCfdiIssued] = useState(false);

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
    <div className="min-h-screen bg-[#ffffff] text-[#202020] font-sans p-4 sm:p-8 space-y-12 max-w-[1200px] mx-auto">
      {/* ---------------- 1. VENTRILOC FLOATING PILL HEADER ---------------- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#e8e8e8]">
        {/* Brand Wordmark Left-Aligned */}
        <Link href="/" className="block shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/la-gran-via-logo-horizontal.png"
            alt="La Gran Vía Mexicali"
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Ventriloc Navigation Pill Container (Ash #efefef background, 200px radius, 8px/18px padding) */}
        <nav className="hidden sm:flex items-center gap-2 bg-[#efefef] px-4 py-2 rounded-[200px]">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-1.5 rounded-[200px] text-sm font-normal transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "bg-[#202020] text-white"
                : "text-[#202020] hover:text-[#ff682c]"
            }`}
          >
            Rent Roll ({TENANTS.length})
          </button>

          <button
            onClick={() => setActiveTab("leasing")}
            className={`px-4 py-1.5 rounded-[200px] text-sm font-normal transition-colors cursor-pointer ${
              activeTab === "leasing"
                ? "bg-[#202020] text-white"
                : "text-[#202020] hover:text-[#ff682c]"
            }`}
          >
            Mariana (Legal)
          </button>

          <button
            onClick={() => setActiveTab("maint")}
            className={`px-4 py-1.5 rounded-[200px] text-sm font-normal transition-colors cursor-pointer ${
              activeTab === "maint"
                ? "bg-[#202020] text-white"
                : "text-[#202020] hover:text-[#ff682c]"
            }`}
          >
            Diego (CapEx)
          </button>

          <button
            onClick={() => setActiveTab("cam")}
            className={`px-4 py-1.5 rounded-[200px] text-sm font-normal transition-colors cursor-pointer ${
              activeTab === "cam"
                ? "bg-[#202020] text-white"
                : "text-[#202020] hover:text-[#ff682c]"
            }`}
          >
            Renata (SAT)
          </button>
        </nav>

        {/* Dual Button Stack: Primary CTA (Graphite #202020, 0px radius) + Ghost Outlined Button (0px radius) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => alert("Generando informe ejecutivo oficial...")}
            className="px-5 py-2.5 bg-transparent border border-[#202020] text-[#202020] rounded-none text-xs font-normal hover:bg-[#f5f5f5] transition-colors cursor-pointer"
          >
            Exportar PDF
          </button>

          <button
            onClick={() => setActiveTab("saari")}
            className="px-5 py-2.5 bg-[#202020] text-white rounded-none text-xs font-normal hover:bg-[#333333] transition-colors cursor-pointer"
          >
            Sincronizar SAARI
          </button>
        </div>
      </header>

      {/* ---------------- 2. HERO HEADLINE BLOCK (66px Whisper Weight + Inter Body) ---------------- */}
      {activeTab === "overview" && (
        <div className="space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                Asset Management Observatory · 7,550 m² GLA Mexicali
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-[-0.02em] text-[#202020] font-sans leading-[0.95]">
                Accelerating Growth Through Precision Analytics.
              </h1>
              <p className="text-base text-[#4d4d4d] leading-relaxed max-w-xl font-normal">
                Consola privada de control operativo para el Sr. Martín. Monitoreo continuo del Rent Roll, prevención de conflictos de exclusividad legal y balance CAM NNN en Plaza La Gran Vía.
              </p>
              <div className="pt-2">
                <a
                  href="#rentroll"
                  className="inline-block text-sm text-[#202020] font-normal border-b border-[#ff682c] pb-0.5 hover:text-[#ff682c] transition-colors"
                >
                  Explorar Matriz de Inquilinos →
                </a>
              </div>
            </div>

            {/* Data Dashboard Cards Cluster (Floating 20px Radius White Cards on Canvas) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Card 1: Revenues */}
              <div className="bg-white rounded-[20px] p-6 border border-[#e8e8e8] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#828282]">
                  <span className="font-normal uppercase tracking-wider text-[10px]">Cobranza Mensual</span>
                  <span className="text-[#ff682c] font-normal text-xs">● 98.2% Al Día</span>
                </div>
                <div className="text-3xl font-normal text-[#202020] tracking-[-0.02em]">
                  $3 145 000 <span className="text-xs text-[#828282]">MXN</span>
                </div>
                <p className="text-xs text-[#4d4d4d]">vs $3 080 000 mes anterior (+2.1% MoM)</p>
              </div>

              {/* Card 2: Occupancy & CapEx Savings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-[20px] p-6 border border-[#e8e8e8] space-y-2">
                  <span className="text-[10px] uppercase text-[#828282] block">Ocupación GLA</span>
                  <div className="text-2xl font-normal text-[#202020]">94.1%</div>
                  <span className="text-[11px] text-[#4d4d4d]">7,105 m² rentados</span>
                </div>
                <div className="bg-white rounded-[20px] p-6 border border-[#e8e8e8] space-y-2">
                  <span className="text-[10px] uppercase text-[#828282] block">Ahorro CapEx</span>
                  <div className="text-2xl font-normal text-[#ff682c]">$78 000</div>
                  <span className="text-[11px] text-[#4d4d4d]">Garantía Carrier</span>
                </div>
              </div>
            </div>
          </div>

          {/* Partner Logo Strip Style Caption & Section Divider */}
          <div className="pt-8 border-t border-[#e8e8e8] flex flex-wrap items-center justify-between gap-6 text-xs text-[#816729]">
            <span>Trusted by 85 ancla & boutique commercial partners</span>
            <div className="flex items-center gap-8 font-mono text-[#202020] opacity-80">
              <span>ASHLEY</span>
              <span>CINEMEX</span>
              <span>BANORTE</span>
              <span>PETCO</span>
              <span>BUFFALO WILD WINGS</span>
            </div>
          </div>

          {/* ---------------- 3. ASYMMETRIC RADIUS CARD & RENT ROLL TABLE ---------------- */}
          <div id="rentroll" className="space-y-6 pt-4">
            {/* Ventriloc Signature Asymmetric Radius Card (6px 0px 0px 0px radius, Ash #efefef surface) */}
            <div className="bg-[#efefef] rounded-tl-[6px] rounded-tr-none rounded-br-none rounded-bl-none p-8 sm:p-12 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
                <div>
                  <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                    Matriz Principal de Arrendamiento
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-normal text-[#202020] tracking-[-0.02em] mt-1">
                    Rent Roll Plaza La Gran Vía ({filteredTenants.length} Locales)
                  </h2>
                </div>

                {/* Search & Neutral Filter Pills */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por inquilino..."
                    className="px-4 py-2 bg-white border border-[#e8e8e8] text-xs text-[#202020] placeholder-[#828282] focus:outline-none focus:border-[#202020] transition-colors w-full sm:w-56"
                  />

                  <div className="flex items-center gap-1.5 bg-[#ebe6dd] p-1 rounded-[200px]">
                    <button
                      onClick={() => setFilterCategory("all")}
                      className={`px-3 py-1 rounded-[200px] text-xs font-normal cursor-pointer ${
                        filterCategory === "all" ? "bg-[#202020] text-white" : "text-[#202020]"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFilterCategory("ok")}
                      className={`px-3 py-1 rounded-[200px] text-xs font-normal cursor-pointer ${
                        filterCategory === "ok" ? "bg-[#202020] text-white" : "text-[#202020]"
                      }`}
                    >
                      Al Día
                    </button>
                    <button
                      onClick={() => setFilterCategory("sat")}
                      className={`px-3 py-1 rounded-[200px] text-xs font-normal cursor-pointer ${
                        filterCategory === "sat" ? "bg-[#202020] text-white" : "text-[#202020]"
                      }`}
                    >
                      Alerta SAT
                    </button>
                  </div>
                </div>
              </div>

              {/* Clean Monospaced Data Table */}
              <div className="overflow-x-auto bg-white border border-[#e8e8e8] rounded-[8px]">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-[#e8e8e8] text-[#828282] uppercase text-[10px] bg-[#f5f5f5] tracking-wider font-mono">
                      <th className="p-3.5 font-normal">#</th>
                      <th className="p-3.5 font-normal">Inquilino / Local</th>
                      <th className="p-3.5 font-normal">Zona</th>
                      <th className="p-3.5 font-normal">Giro Commercial</th>
                      <th className="p-3.5 font-normal text-right">Superficie</th>
                      <th className="p-3.5 font-normal text-right">Pro-Rata NNN</th>
                      <th className="p-3.5 font-normal text-right">Renta MXN</th>
                      <th className="p-3.5 font-normal">Estatus CFDI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e8e8] font-normal text-[#202020]">
                    {filteredTenants.map((t, idx) => {
                      const sqm = getTenantSqm(t.name, idx);
                      const sharePct = ((sqm / plazaTotalGla) * 100).toFixed(2);
                      const estRent = Math.round(sqm * 240);
                      const isSatError = t.name.includes("MINT");

                      return (
                        <tr key={t.slug} className="hover:bg-[#f5f5f5] transition-colors">
                          <td className="p-3.5 text-[#828282] font-mono text-[11px]">{idx + 1}</td>
                          <td className="p-3.5 font-normal text-[#202020]">{t.name}</td>
                          <td className="p-3.5 text-[#4d4d4d] text-[11px]">{t.zone}</td>
                          <td className="p-3.5 text-[#4d4d4d]">{t.tag}</td>
                          <td className="p-3.5 text-right font-mono text-[#202020]">{sqm} m²</td>
                          <td className="p-3.5 text-right font-mono text-[#4d4d4d]">{sharePct}%</td>
                          <td className="p-3.5 text-right font-mono text-[#202020]">${estRent.toLocaleString()}</td>
                          <td className="p-3.5">
                            {isSatError ? (
                              <span className="text-[#ff682c] font-normal text-xs border-b border-[#ff682c] pb-0.5">
                                Alerta SAT PPD
                              </span>
                            ) : (
                              <span className="text-[#4d4d4d] text-xs">
                                Al Día CFDI 4.0
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-[#202020] text-white text-xs font-mono">
                    <tr>
                      <td className="p-3.5">TOTAL</td>
                      <td className="p-3.5 font-normal" colSpan={3}>
                        PLAZA LA GRAN VÍA (85 LOCALES)
                      </td>
                      <td className="p-3.5 text-right">{plazaTotalGla.toLocaleString()} m²</td>
                      <td className="p-3.5 text-right">1.0000</td>
                      <td className="p-3.5 text-right text-[#ff682c]">$3 145 000 MXN</td>
                      <td className="p-3.5 text-[#828282]">94.1% Ocupación</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 2: MARIANA AI (DETALLES LEGALES RAG & PROSPECTOS) ---------------- */}
      {activeTab === "leasing" && (
        <div className="space-y-8">
          <div className="bg-[#efefef] rounded-tl-[6px] rounded-tr-none rounded-br-none rounded-bl-none p-8 sm:p-12 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
              <div>
                <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                  Inteligencia Legal RAG & Protección de Exclusividades
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#202020] tracking-[-0.02em] mt-1">
                  Agente Mariana · Dictamen Cognitivo de Contratos
                </h2>
              </div>
              <span className="px-4 py-1.5 bg-[#202020] text-white text-xs font-normal">
                85 Contratos RAG Indexados
              </span>
            </div>

            {/* Applicant Selector Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LEASING_APPLICANTS.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    setSelectedLeasingApp(app);
                    setAttorneySent(false);
                  }}
                  className={`p-6 bg-white border text-left transition-colors cursor-pointer space-y-3 ${
                    selectedLeasingApp.id === app.id
                      ? "border-[#202020]"
                      : "border-[#e8e8e8] hover:border-[#828282]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-normal text-base text-[#202020]">{app.brand}</span>
                    <span className="text-xs text-[#ff682c] border-b border-[#ff682c]">
                      {app.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#4d4d4d]">{app.category}</p>
                  <p className="text-xs font-mono text-[#816729]">
                    Prevención: {app.rentLossPrevented}
                  </p>
                </button>
              ))}
            </div>

            {/* Deep RAG Contract Viewer Box */}
            <div className="bg-white p-8 border border-[#e8e8e8] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e8e8e8] pb-4">
                <div>
                  <span className="text-[10px] font-normal text-[#816729] uppercase tracking-wider block font-mono">
                    Dictamen Cognitivo RAG
                  </span>
                  <h3 className="text-xl font-normal text-[#202020]">
                    Expediente: {selectedLeasingApp.brand} ({selectedLeasingApp.category})
                  </h3>
                </div>
                <span className="text-xs text-[#ff682c] border-b border-[#ff682c] font-mono">
                  {selectedLeasingApp.overlapScore}
                </span>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-[#4d4d4d]">
                <p><strong className="text-[#202020]">Fundamento Jurídico:</strong> {selectedLeasingApp.reasoning}</p>
                <p><strong className="text-[#202020]">Arrendatario Afectado:</strong> {selectedLeasingApp.conflictingTenant}</p>
                <p><strong className="text-[#202020]">Cláusula Invocada:</strong> {selectedLeasingApp.conflictingClause}</p>
              </div>

              {/* Exact Contract Snippet Box */}
              <div className="bg-[#f5f5f5] p-6 border border-[#e8e8e8] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#828282] font-mono">
                  <span>📄 {selectedLeasingApp.contractPdfName}</span>
                  <span>{selectedLeasingApp.contractPdfPage}</span>
                </div>
                <p className="text-sm text-[#202020] font-normal leading-relaxed">
                  {selectedLeasingApp.contractExactSnippet}
                </p>
              </div>

              {/* Action Buttons (0px radius CTA) */}
              <div className="pt-2">
                <button
                  onClick={() => setAttorneySent(true)}
                  className="px-6 py-3 bg-[#202020] text-white rounded-none text-xs font-normal hover:bg-[#333333] transition-colors cursor-pointer"
                >
                  {attorneySent ? "✓ Instrucción Enviada a Despacho Legal" : "Enviar Instrucción a Despacho Legal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 3: DIEGO AI (CAPEX & MANTENIMIENTO) ---------------- */}
      {activeTab === "maint" && (
        <div className="space-y-8">
          <div className="bg-[#efefef] rounded-tl-[6px] rounded-tr-none rounded-br-none rounded-bl-none p-8 sm:p-12 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
              <div>
                <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                  Auditoría Técnica & Pólizas de Fábrica
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#202020] tracking-[-0.02em] mt-1">
                  Agente Diego · Verificación CapEx
                </h2>
              </div>
              <span className="px-4 py-1.5 bg-[#202020] text-white text-xs font-normal">
                $145,000 MXN en Pólizas Activas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CAPEX_CASES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedCapex(item);
                    setDiegoNotificationSent(false);
                  }}
                  className={`p-6 bg-white border text-left transition-colors cursor-pointer space-y-3 ${
                    selectedCapex.id === item.id ? "border-[#202020]" : "border-[#e8e8e8] hover:border-[#828282]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-normal text-base text-[#202020]">{item.tenant}</span>
                    <span className="font-mono text-xs text-[#202020]">
                      ${item.amount.toLocaleString()} MXN
                    </span>
                  </div>
                  <p className="text-xs text-[#4d4d4d]">{item.expenseType}</p>
                </button>
              ))}
            </div>

            <div className="bg-white p-8 border border-[#e8e8e8] space-y-6">
              <h3 className="text-xl font-normal text-[#202020]">
                {selectedCapex.tenant} — {selectedCapex.expenseType}
              </h3>
              <div className="space-y-3 text-xs text-[#4d4d4d] leading-relaxed">
                <p><strong className="text-[#202020]">Número de Serie:</strong> <code className="bg-[#f5f5f5] px-2 py-1 font-mono text-[#202020]">{selectedCapex.serialNumber}</code></p>
                <p><strong className="text-[#202020]">Resolución de Diego AI:</strong> {selectedCapex.details}</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setDiegoNotificationSent(true)}
                  className="px-6 py-3 bg-[#202020] text-white rounded-none text-xs font-normal hover:bg-[#333333] transition-colors cursor-pointer"
                >
                  {diegoNotificationSent ? "✓ Póliza Reclamada con Carrier" : "Reclamar Garantía con Carrier"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 4: RENATA AI (CAM NNN & FISCAL SAT) ---------------- */}
      {activeTab === "cam" && (
        <div className="space-y-8">
          <div className="bg-[#efefef] rounded-tl-[6px] rounded-tr-none rounded-br-none rounded-bl-none p-8 sm:p-12 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
              <div>
                <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                  Auditoría Fiscal SAT CFDI 4.0
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#202020] tracking-[-0.02em] mt-1">
                  Agente Renata · Conciliación Bancaria PPD / PUE
                </h2>
              </div>
              <span className="px-4 py-1.5 bg-[#202020] text-white text-xs font-normal">
                1 Alerta PPD
              </span>
            </div>

            <div className="bg-white p-8 border border-[#e8e8e8] space-y-6">
              <h3 className="text-xl font-normal text-[#202020]">
                Detalle de Alerta Fiscal: MINT Boutique (Local B-14)
              </h3>
              <p className="text-xs text-[#4d4d4d] leading-relaxed">
                El depósito bancario se registró como PUE, pero la factura se emitió bajo PPD. Se requiere Complemento de Pago CFDI 4.0 para conciliar libros contables.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => setRenataCfdiIssued(true)}
                  className="px-6 py-3 bg-[#202020] text-white rounded-none text-xs font-normal hover:bg-[#333333] transition-colors cursor-pointer"
                >
                  {renataCfdiIssued ? "✓ Complemento CFDI 4.0 Emitido" : "Emitir Complemento CFDI 4.0 Automático"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 5: CONECTOR SAARI ERP ---------------- */}
      {activeTab === "saari" && (
        <div className="space-y-8">
          <div className="bg-[#efefef] rounded-tl-[6px] rounded-tr-none rounded-br-none rounded-bl-none p-8 sm:p-12 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
              <div>
                <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                  Integración de Inmuebles
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#202020] tracking-[-0.02em] mt-1">
                  Conector Directo SAARI ERP
                </h2>
              </div>
              <span className="px-4 py-1.5 bg-[#202020] text-white text-xs font-normal">
                Estado: Sincronizado
              </span>
            </div>

            <div className="bg-white p-8 border border-[#e8e8e8] space-y-4 text-xs text-[#4d4d4d]">
              <p><strong className="text-[#202020]">Última Sincronización:</strong> Hace 12 minutos (Lote Batch #SAARI-8849)</p>
              <p><strong className="text-[#202020]">Auxiliares de Cobranza Procesados:</strong> 85 contratos de arrendamiento en Mexicali.</p>
              <button
                onClick={() => alert("Sincronizando base de datos SAARI ERP...")}
                className="mt-2 px-6 py-3 bg-[#202020] text-white rounded-none text-xs font-normal hover:bg-[#333333] transition-colors cursor-pointer"
              >
                Forzar Resincronización SAARI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
