"use client";

import { useState } from "react";
import Link from "next/link";
import { TENANTS } from "@/content/tenants";

type ActiveTab = "overview" | "leasing" | "maint" | "cam" | "saari";

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
    contractExactSnippet: '"...Queda strictly prohibido a la administración de Plaza La Gran Vía arrendar locales adyacentes a competidores directos en la categoría de repostería fina, donas glaseadas o panadería artesanal..."',
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

  // Mariana RAG Chat Input State
  const [marianaQuery, setMarianaQuery] = useState("");
  const [marianaChatResponse, setMarianaChatResponse] = useState<{
    query: string;
    answer: string;
    pdfName: string;
    pdfClause: string;
  }>({
    query: "¿Cuál es la exclusividad exacta de Blue Luna Café y por qué bloqueó a Starbucks?",
    answer: "Blue Luna Café (Local B-02, Zona 4) cuenta con la Cláusula #14 en su contrato vigente (2023-2028). Otorga exclusividad comercial absoluta en la venta de café espresso y especialidad en Zona 4. La propuesta de Starbucks Reserve presentaba un 98.4% de solapamiento semántico en menú.",
    pdfName: "Contrato_Arrendamiento_BlueLuna_LocB02_Firmado.pdf",
    pdfClause: "Página 12, Cláusula 14",
  });

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
    <div className="min-h-screen bg-[#ffffff] text-[#202020] font-sans p-4 sm:p-8 space-y-10 max-w-[1250px] mx-auto">
      {/* ---------------- 1. VENTRILOC FLOATING PILL HEADER ---------------- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#e8e8e8]">
        <Link href="/" className="block shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/la-gran-via-logo-horizontal.png"
            alt="La Gran Vía Mexicali"
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Ventriloc Navigation Pill Container (#efefef, 200px radius) */}
        <nav className="hidden sm:flex items-center gap-2 bg-[#efefef] px-4 py-2 rounded-[200px]">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-1.5 rounded-[200px] text-xs font-normal transition-colors cursor-pointer ${
              activeTab === "overview" ? "bg-[#202020] text-white" : "text-[#202020] hover:text-[#ff682c]"
            }`}
          >
            Rent Roll ({TENANTS.length})
          </button>

          <button
            onClick={() => setActiveTab("leasing")}
            className={`px-4 py-1.5 rounded-[200px] text-xs font-normal transition-colors cursor-pointer ${
              activeTab === "leasing" ? "bg-[#202020] text-white" : "text-[#202020] hover:text-[#ff682c]"
            }`}
          >
            Arrendamiento (Mariana RAG)
          </button>

          <button
            onClick={() => setActiveTab("maint")}
            className={`px-4 py-1.5 rounded-[200px] text-xs font-normal transition-colors cursor-pointer ${
              activeTab === "maint" ? "bg-[#202020] text-white" : "text-[#202020] hover:text-[#ff682c]"
            }`}
          >
            CapEx & Gastos (Diego)
          </button>

          <button
            onClick={() => setActiveTab("cam")}
            className={`px-4 py-1.5 rounded-[200px] text-xs font-normal transition-colors cursor-pointer ${
              activeTab === "cam" ? "bg-[#202020] text-white" : "text-[#202020] hover:text-[#ff682c]"
            }`}
          >
            CAM & Fiscal SAT (Renata)
          </button>
        </nav>

        {/* Buttons Stack */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => alert("Exportando informe oficial en PDF...")}
            className="px-5 py-2.5 bg-transparent border border-[#202020] text-[#202020] rounded-none text-xs font-normal hover:bg-[#f5f5f5] transition-colors cursor-pointer"
          >
            Exportar Reporte (.PDF)
          </button>

          <button
            onClick={() => setActiveTab("saari")}
            className="px-5 py-2.5 bg-[#202020] text-white rounded-none text-xs font-normal hover:bg-[#333333] transition-colors cursor-pointer"
          >
            Sincronizar SAARI →
          </button>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="flex sm:hidden overflow-x-auto gap-1.5 bg-[#efefef] p-1.5 rounded-[200px] text-xs font-mono">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-1.5 rounded-[200px] whitespace-nowrap ${activeTab === "overview" ? "bg-[#202020] text-white" : "text-[#202020]"}`}
        >
          Rent Roll
        </button>
        <button
          onClick={() => setActiveTab("leasing")}
          className={`px-3.5 py-1.5 rounded-[200px] whitespace-nowrap ${activeTab === "leasing" ? "bg-[#202020] text-white" : "text-[#202020]"}`}
        >
          Arrendamiento
        </button>
        <button
          onClick={() => setActiveTab("maint")}
          className={`px-3.5 py-1.5 rounded-[200px] whitespace-nowrap ${activeTab === "maint" ? "bg-[#202020] text-white" : "text-[#202020]"}`}
        >
          CapEx
        </button>
        <button
          onClick={() => setActiveTab("cam")}
          className={`px-3.5 py-1.5 rounded-[200px] whitespace-nowrap ${activeTab === "cam" ? "bg-[#202020] text-white" : "text-[#202020]"}`}
        >
          CAM SAT
        </button>
      </div>

      {/* ---------------- PESTAÑA 1: OVERVIEW (RENT ROLL & METRICS) ---------------- */}
      {activeTab === "overview" && (
        <div className="space-y-12">
          {/* Hero Headline Block */}
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

            {/* Floating 20px Radius White Cards Cluster */}
            <div className="lg:col-span-5 space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-[20px] p-6 border border-[#e8e8e8] space-y-2">
                  <span className="text-[10px] uppercase text-[#828282] block font-mono">Ocupación GLA</span>
                  <div className="text-2xl font-normal text-[#202020]">94.1%</div>
                  <span className="text-[11px] text-[#4d4d4d]">7,105 m² rentados</span>
                </div>
                <div className="bg-white rounded-[20px] p-6 border border-[#e8e8e8] space-y-2">
                  <span className="text-[10px] uppercase text-[#828282] block font-mono">Ahorro CapEx</span>
                  <div className="text-2xl font-normal text-[#ff682c]">$78 000</div>
                  <span className="text-[11px] text-[#4d4d4d]">Garantía Carrier</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section Divider */}
          <div className="pt-6 border-t border-[#e8e8e8] flex flex-wrap items-center justify-between gap-6 text-xs text-[#816729]">
            <span>Trusted by 85 ancla & boutique commercial partners</span>
            <div className="flex items-center gap-8 font-mono text-[#202020] opacity-80">
              <span>ASHLEY</span>
              <span>CINEMEX</span>
              <span>BANORTE</span>
              <span>PETCO</span>
              <span>BUFFALO WILD WINGS</span>
            </div>
          </div>

          {/* Asymmetric Radius Rent Roll Card (6px 0px 0px 0px) */}
          <div id="rentroll" className="bg-[#efefef] rounded-tl-[6px] rounded-tr-none rounded-br-none rounded-bl-none p-8 sm:p-12 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
              <div>
                <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                  Matriz Principal de Arrendamiento
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#202020] tracking-[-0.02em] mt-1">
                  Rent Roll Plaza La Gran Vía ({filteredTenants.length} Locales)
                </h2>
              </div>

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
                    className={`px-3 py-1 rounded-[200px] text-xs font-normal cursor-pointer ${filterCategory === "all" ? "bg-[#202020] text-white" : "text-[#202020]"}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterCategory("ok")}
                    className={`px-3 py-1 rounded-[200px] text-xs font-normal cursor-pointer ${filterCategory === "ok" ? "bg-[#202020] text-white" : "text-[#202020]"}`}
                  >
                    Al Día
                  </button>
                  <button
                    onClick={() => setFilterCategory("sat")}
                    className={`px-3 py-1 rounded-[200px] text-xs font-normal cursor-pointer ${filterCategory === "sat" ? "bg-[#202020] text-white" : "text-[#202020]"}`}
                  >
                    Alerta SAT
                  </button>
                </div>
              </div>
            </div>

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
                            <span className="text-[#4d4d4d] text-xs">Al Día CFDI 4.0</span>
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
      )}

      {/* ---------------- PESTAÑA 2: MARIANA AI (FULL 5-SECTION LEGAL RAG MODULE FROM SCREENSHOTS) ---------------- */}
      {activeTab === "leasing" && (
        <div className="space-y-10">
          {/* Header & 3 Metric Cards Strip */}
          <div className="bg-[#efefef] rounded-tl-[6px] rounded-tr-none rounded-br-none rounded-bl-none p-8 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
              <div>
                <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                  SOP §2A & General Counsel AI · Bóveda 85 Contratos RAG
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#202020] tracking-[-0.02em] mt-1">
                  Módulo de Arrendamiento & Inteligencia Legal (Mariana)
                </h2>
                <p className="text-xs text-[#4d4d4d] mt-1">
                  Monitoreo en vivo de solicitudes prospecto, consulta RAG de contratos, exclusividades y guardrails de la plaza.
                </p>
              </div>
              <span className="px-4 py-2 bg-[#202020] text-white font-mono text-xs">
                85 CONTRATOS EN BÓVEDA RAG
              </span>
            </div>

            {/* 3 Metric Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#828282] block">SOLICITUDES EVALUADAS</span>
                <div className="text-2xl font-normal text-[#202020]">3 Prospectos Auditados</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#828282] block">EXCLUSIVIDADES ACTIVAS</span>
                <div className="text-2xl font-normal text-[#ff682c]">14 Cláusulas Protegidas</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#828282] block">RIESGO LEGAL PREVENIDO</span>
                <div className="text-2xl font-normal text-[#202020]">$780,000 MXN / año</div>
              </div>
            </div>
          </div>

          {/* Interactive RAG AI Chat Assistant Box */}
          <div className="bg-white p-8 border border-[#e8e8e8] rounded-[20px] space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-[#202020] text-white flex items-center justify-center text-xs font-mono">
                  M
                </div>
                <div>
                  <h3 className="text-sm font-normal text-[#202020] uppercase font-mono tracking-wider">
                    ASISTENTE LEGAL RAG: CONSULTA DIRECTA A MARIANA
                  </h3>
                  <p className="text-xs text-[#828282]">
                    Haz cualquier pregunta sobre los 85 contratos, leyes de Baja California o políticas de la plaza.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-[#816729]">● BÓVEDA INDEXADA RAG</span>
            </div>

            {/* Preset Query Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setMarianaQuery("¿Por qué bloqueamos a Starbucks?");
                  setMarianaChatResponse({
                    query: "¿Por qué bloqueamos a Starbucks?",
                    answer: "Starbucks presentó 98.4% de conflicto de menú con Blue Luna Café (Local B-02, Zona 4), violando la Cláusula #14 de exclusividad comercial.",
                    pdfName: "Contrato_Arrendamiento_BlueLuna_LocB02_Firmado.pdf",
                    pdfClause: "Página 12, Cláusula 14",
                  });
                }}
                className="px-4 py-2 bg-[#efefef] hover:bg-[#ebe6dd] text-[#202020] text-xs rounded-[200px] transition-colors cursor-pointer font-sans"
              >
                ☕ ¿Por qué bloqueamos a Starbucks?
              </button>
              <button
                onClick={() => {
                  setMarianaQuery("¿Cómo aplica la Ley Antimonopolio (LFCE §3)?");
                  setMarianaChatResponse({
                    query: "¿Cómo aplica la Ley Antimonopolio (LFCE §3)?",
                    answer: "La Ley Federal de Competencia Económica (LFCE Art. 3 y 53) prohibe exclusividades genéricas desproporcionadas. Se aplicó para acotar la exclusividad de Alma Verde y permitir la entrada de La Vicenta en cortes de carne.",
                    pdfName: "Contrato_AlmaVerde_LocB10_Firmado.pdf",
                    pdfClause: "Página 15, Cláusula 22",
                  });
                }}
                className="px-4 py-2 bg-[#efefef] hover:bg-[#ebe6dd] text-[#202020] text-xs rounded-[200px] transition-colors cursor-pointer font-sans"
              >
                ⚖️ ¿Cómo aplica la Ley Antimonopolio (LFCE §3)?
              </button>
              <button
                onClick={() => {
                  setMarianaQuery("Reglas de Subarrendamiento");
                  setMarianaChatResponse({
                    query: "Reglas de Subarrendamiento",
                    answer: "El subarrendamiento está estrictamente prohibido en Plaza La Gran Vía sin previa autorización por escrito de la administración del Sr. Martín y trazabilidad 100% en SAARI ERP.",
                    pdfName: "Reglamento_Operativo_LaGranVia_2026.pdf",
                    pdfClause: "Página 4, Artículo 9",
                  });
                }}
                className="px-4 py-2 bg-[#efefef] hover:bg-[#ebe6dd] text-[#202020] text-xs rounded-[200px] transition-colors cursor-pointer font-sans"
              >
                📜 Reglas de Subarrendamiento
              </button>
            </div>

            {/* Answer Display Card */}
            <div className="bg-[#f5f5f5] p-6 border border-[#e8e8e8] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#828282]">
                <span className="font-mono text-[#202020]">Pregunta: {marianaChatResponse.query}</span>
                <span className="text-[#ff682c] font-mono">✓ Respuesta RAG Verificada</span>
              </div>
              <p className="text-sm text-[#202020] leading-relaxed">
                {marianaChatResponse.answer}
              </p>
              <div className="pt-2 flex items-center justify-between text-xs border-t border-[#e8e8e8]">
                <span className="font-mono text-[#816729]">📄 Documento Fuente: {marianaChatResponse.pdfName} ({marianaChatResponse.pdfClause})</span>
                <button
                  onClick={() => alert(`Descargando copia de cotejo de ${marianaChatResponse.pdfName}...`)}
                  className="text-[#202020] font-normal border-b border-[#ff682c] pb-0.5 hover:text-[#ff682c] cursor-pointer"
                >
                  Descargar Referencia PDF →
                </button>
              </div>
            </div>

            {/* Query Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!marianaQuery.trim()) return;
                setMarianaChatResponse({
                  query: marianaQuery,
                  answer: `Respuesta RAG para "${marianaQuery}": Expediente verificado en la bóveda de 85 contratos de Plaza La Gran Vía conforme a la legislación de Baja California.`,
                  pdfName: "Contrato_General_LaGranVia.pdf",
                  pdfClause: "Sección General",
                });
                setMarianaQuery("");
              }}
              className="flex items-center gap-3"
            >
              <input
                type="text"
                value={marianaQuery}
                onChange={(e) => setMarianaQuery(e.target.value)}
                placeholder="Pregunta a Mariana sobre cualquier contrato, ley estatal o política de la plaza..."
                className="flex-1 px-5 py-3 bg-[#f5f5f5] border border-[#e8e8e8] text-xs text-[#202020] placeholder-[#828282] focus:outline-none focus:border-[#202020] transition-colors"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#202020] text-white rounded-none text-xs font-normal hover:bg-[#333333] transition-colors cursor-pointer"
              >
                Consultar AI →
              </button>
            </form>
          </div>

          {/* Section 1: EVALUADOR DE SOLICITUDES PROSPECTO VS. CONTRATOS EXISTENTES */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3">
              <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                1. EVALUADOR DE SOLICITUDES PROSPECTO VS. CONTRATOS EXISTENTES
              </h3>
              <span className="text-xs text-[#828282]">SELECCIONA UNA SOLICITUD PARA INSPECCIONAR</span>
            </div>

            {/* Applicant Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LEASING_APPLICANTS.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    setSelectedLeasingApp(app);
                    setAttorneySent(false);
                  }}
                  className={`p-6 bg-white border text-left transition-colors cursor-pointer space-y-3 ${
                    selectedLeasingApp.id === app.id ? "border-[#202020]" : "border-[#e8e8e8] hover:border-[#828282]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-normal text-base text-[#202020]">{app.brand}</span>
                    <span className="text-xs text-[#ff682c] border-b border-[#ff682c]">
                      {app.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#4d4d4d]">{app.category}</p>
                </button>
              ))}
            </div>

            {/* Side-by-Side Evaluator Box (Screenshot Match) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Box: SOLICITANTE EVALUADO */}
              <div className="lg:col-span-5 bg-[#f5f5f5] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 text-xs">
                  <span className="font-mono uppercase text-[#202020]">📄 SOLICITANTE EVALUADO</span>
                  <span className="font-mono text-[#828282]">Expediente: {selectedLeasingApp.id}</span>
                </div>
                <div className="space-y-3 text-xs text-[#4d4d4d]">
                  <div>
                    <span className="text-[#828282] block text-[11px]">Marca Solicitante:</span>
                    <span className="text-base text-[#202020] font-normal">{selectedLeasingApp.brand}</span>
                  </div>
                  <div>
                    <span className="text-[#828282] block text-[11px]">Giro & Categoría Comercial:</span>
                    <span className="text-[#202020] font-normal">{selectedLeasingApp.category}</span>
                  </div>
                  <div>
                    <span className="text-[#828282] block text-[11px] mb-1">Menú / Productos Solicitados:</span>
                    <div className="bg-white p-3 border border-[#e8e8e8] text-xs font-mono text-[#202020]">
                      {selectedLeasingApp.menu}
                    </div>
                  </div>
                  <div className="pt-2 flex items-center justify-between border-t border-[#e8e8e8]">
                    <span className="text-[#828282]">Superficie Solicitada:</span>
                    <span className="font-mono text-base font-normal text-[#202020]">{selectedLeasingApp.sqm} m²</span>
                  </div>
                </div>
              </div>

              {/* Right Box: DICTAMEN LEGAL MARIANA AI */}
              <div className="lg:col-span-7 bg-white p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 text-xs">
                  <span className="font-mono uppercase text-[#202020]">● DICTAMEN LEGAL MARIANA AI</span>
                  <span className="text-[#ff682c] border-b border-[#ff682c] font-mono">🚫 Bloqueado por Exclusividad</span>
                </div>
                <div className="space-y-3 text-xs text-[#4d4d4d]">
                  <p><strong className="text-[#202020]">Inquilino Afectado en Plaza:</strong> {selectedLeasingApp.conflictingTenant}</p>
                  <p><strong className="text-[#202020]">Cláusula Contractual Violada:</strong> {selectedLeasingApp.conflictingClause}</p>

                  <div className="bg-[#f5f5f5] p-4 border border-[#e8e8e8] space-y-2">
                    <span className="text-[10px] font-mono text-[#816729] uppercase block">ANÁLISIS COGNITIVO MARIANA:</span>
                    <p className="text-xs text-[#202020] leading-relaxed">{selectedLeasingApp.reasoning}</p>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#e8e8e8]">
                    <span className="text-[#828282]">Riesgo Financiero Prevenido:</span>
                    <span className="font-mono text-base font-normal text-[#ff682c]">{selectedLeasingApp.rentLossPrevented}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: BÓVEDA HISTÓRICA DE CONTRATOS VIGENTES & CALLOUTS LEGALES (Screenshot Match) */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3">
              <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                2. BÓVEDA HISTÓRICA DE CONTRATOS VIGENTES & CALLOUTS LEGALES
              </h3>
              <span className="px-3 py-1 bg-[#202020] text-white text-xs font-mono">
                85 CONTRATOS INDEXADOS RAG
              </span>
            </div>

            <div className="overflow-x-auto bg-white border border-[#e8e8e8] rounded-[8px]">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-[#e8e8e8] text-[#828282] uppercase text-[10px] bg-[#f5f5f5] tracking-wider font-mono">
                    <th className="p-3.5 font-normal">Inquilino / Local</th>
                    <th className="p-3.5 font-normal">Giro Comercial</th>
                    <th className="p-3.5 font-normal">Vigencia Contrato</th>
                    <th className="p-3.5 font-normal">Exclusividad Registrada</th>
                    <th className="p-3.5 font-normal">Callout / Alerta Mariana</th>
                    <th className="p-3.5 font-normal text-right">Contrato PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8] font-normal text-[#202020]">
                  {TENANTS.slice(0, 10).map((t, idx) => {
                    const isExcl = t.name.includes("Blue Luna") || t.name.includes("Alma Verde") || t.name.includes("La Purísima");

                    return (
                      <tr key={t.slug} className="hover:bg-[#f5f5f5] transition-colors">
                        <td className="p-3.5 font-normal text-[#202020]">
                          <span className="block font-normal">{t.name}</span>
                          <span className="text-[11px] text-[#828282]">{t.zone}</span>
                        </td>
                        <td className="p-3.5 text-[#4d4d4d]">{t.tag}</td>
                        <td className="p-3.5 text-[#4d4d4d] font-mono">2023 - 2028 (5 Años)</td>
                        <td className="p-3.5">
                          {isExcl ? (
                            <span className="text-[#ff682c] border-b border-[#ff682c] pb-0.5">
                              Cláusula Activa Registrada
                            </span>
                          ) : (
                            <span className="text-[#828282]">Sin Exclusividad Especial</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {isExcl ? (
                            <span className="text-[#816729] font-mono text-[11px]">⚠️ Protegido por Mariana AI</span>
                          ) : (
                            <span className="text-[#828282] font-mono text-[11px]">Sin Conflictos Registrados</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono">
                          <button
                            onClick={() => alert(`Abriendo expediente PDF oficial de ${t.name}...`)}
                            className="px-3 py-1 bg-[#efefef] hover:bg-[#ebe6dd] text-[#202020] text-[11px] cursor-pointer"
                          >
                            PDF ({t.slug}.pdf)
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: MOTOR DE GOBERNANZA LEGAL & GUARDRAILS DEL PROPIETARIO (Screenshot Match) */}
          <div className="space-y-6 pt-4">
            <div className="border-b border-[#e8e8e8] pb-3">
              <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                3. MOTOR DE GOBERNANZA LEGAL & GUARDRAILS DEL PROPIETARIO
              </h3>
              <p className="text-xs text-[#4d4d4d] mt-1">
                Configuración de la jurisdicción legal aplicable, legislación antimonopolio y políticas corporativas de Plaza La Gran Vía.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#202020]">1. Jurisdicción Civil Estatal</span>
                  <span className="px-2 py-0.5 bg-[#202020] text-white text-[10px] font-mono">ACTIVO</span>
                </div>
                <p className="text-xs text-[#4d4d4d] leading-relaxed">
                  Código Civil & Mercantil del Estado de Baja California para contratos de arrendamiento comercial.
                </p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Plazo máximo arrendamiento: 20 Años</p>
                  <p>• Notificación aviso rescisión: 30 Días</p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#202020]">2. Filtro Antimonopolio (LFCE)</span>
                  <span className="px-2 py-0.5 bg-[#202020] text-white text-[10px] font-mono">FEDERAL</span>
                </div>
                <p className="text-xs text-[#4d4d4d] leading-relaxed">
                  Ley Federal de Competencia Económica (Art. 3 & 53). Prohibe exclusividades comerciales desproporcionadas en la plaza.
                </p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Restricción máxima por zona: 200 metros</p>
                  <p>• Prohibido bloqueo en acompañamientos</p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#202020]">3. Guardrails del Propietario</span>
                  <span className="px-2 py-0.5 bg-[#202020] text-white text-[10px] font-mono">REGLAS PLAZA</span>
                </div>
                <p className="text-xs text-[#4d4d4d] leading-relaxed">
                  Políticas operativas obligatorias aprobadas por el Sr. Martín para la administración del activo.
                </p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Límite: Máx 1 Exclusividad / Zona</p>
                  <p>• Subarrendamiento: Prohibido sin aval</p>
                  <p>• Trazabilidad 100% en SAARI ERP</p>
                </div>
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
                  Agente Diego · Verificación CapEx & Garantías de Equipos
                </h2>
              </div>
              <span className="px-4 py-1.5 bg-[#202020] text-white text-xs font-normal font-mono">
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
                <p><strong className="text-[#202020]">Número de Serie Registrado:</strong> <code className="bg-[#f5f5f5] px-2 py-1 font-mono text-[#202020]">{selectedCapex.serialNumber}</code></p>
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
              <span className="px-4 py-1.5 bg-[#202020] text-white text-xs font-mono">
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
              <span className="px-4 py-1.5 bg-[#202020] text-white text-xs font-mono">
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
