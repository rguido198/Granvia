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
    details: "RECHAZADO: Solicitud improcedente. El contrato de arrendamiento (Sección 12) establece que la iluminación estética interior es responsabilidad 100% del arrendatario.",
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
    equipmentModel: "Carrier Commercial WeatherMaster",
    serialNumber: "CR-884920",
  },
  {
    id: "CAP-03",
    tenant: "Cinemex Premium",
    expenseType: "Mantenimiento Preventivo de Planta de Emergencia Común",
    amount: 52000,
    isQuestionable: false,
    verdict: "APROBADO_PRORRATEO_CAM",
    details: "APROBADO PARA CAM NNN: Gasto de infraestructura común prorrateable entre todos los locales en la liquidación mensual.",
    equipmentModel: "Caterpillar C15 ACERT 500kW",
    serialNumber: "CAT-500-9942",
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

  // Mariana Chat Query State
  const [marianaQuery, setMarianaQuery] = useState("");
  const [marianaChatResponse, setMarianaChatResponse] = useState({
    query: "¿Cuál es la exclusividad exacta de Blue Luna Café y por qué bloqueó a Starbucks?",
    answer: "Blue Luna Café (Local B-02, Zona 4) cuenta con la Cláusula #14 en su contrato vigente (2023-2028). Otorga exclusividad comercial absoluta en la venta de café espresso y especialidad en Zona 4. La propuesta de Starbucks Reserve presentaba un 98.4% de solapamiento semántico en menú.",
    pdfName: "Contrato_Arrendamiento_BlueLuna_LocB02_Firmado.pdf",
    pdfClause: "Página 12, Cláusula 14",
  });

  // Diego Chat Query State
  const [diegoQuery, setDiegoQuery] = useState("");
  const [diegoChatResponse, setDiegoChatResponse] = useState({
    query: "¿Por qué el reemplazo de compresor HVAC de Ashley Furniture no le cuesta al propietario?",
    answer: "Diego verificó el número de serie Carrier #CR-884920. La póliza de garantía del fabricante Carrier cubre fallas mecánicas de compresores de 15 toneladas durante 5 años (vigente hasta Noviembre 2028). Se tramitó la sustitución sin costo para el propietario ($0 MXN).",
    pdfName: "Poliza_Garantia_Carrier_Ashley_HVAC.pdf",
    pdfClause: "Serie #CR-884920 (Cobertura 100% Fábrica)",
  });

  // Renata Chat Query State
  const [renataQuery, setRenataQuery] = useState("");
  const [renataChatResponse, setRenataChatResponse] = useState({
    query: "¿Por qué MINT Boutique registró una alerta fiscal SAT CFDI 4.0?",
    answer: "MINT Boutique pagó $32,000 MXN mediante transferencia registrando el método PUE (Pago en una sola exhibición), pero la factura original se emitió bajo el régimen PPD (Pago en parcialidades). Renata detectó la discrepancia antes de la declaración mensual del SAT para auto-emitir el Complemento de Recepción de Pagos sin sanción.",
    xmlName: "CFDI_4.0_Complemento_Pago_SAT_MINT.xml",
    xmlClause: "Anexo 20 RMF SAT §2.7.1.35",
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

        {/* Ventriloc Navigation Pill Container */}
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

          {/* Asymmetric Rent Roll Card */}
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
                    <th className="p-3.5 font-normal">Giro Comercial</th>
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
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 2: MARIANA AI (FULL 5 SECTIONS) ---------------- */}
      {activeTab === "leasing" && (
        <div className="space-y-10">
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

          <div className="bg-white p-8 border border-[#e8e8e8] rounded-[20px] space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-[#202020] text-white flex items-center justify-center text-xs font-mono">M</div>
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

            <div className="bg-[#f5f5f5] p-6 border border-[#e8e8e8] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#828282]">
                <span className="font-mono text-[#202020]">Pregunta: {marianaChatResponse.query}</span>
                <span className="text-[#ff682c] font-mono">✓ Respuesta RAG Verificada</span>
              </div>
              <p className="text-sm text-[#202020] leading-relaxed">{marianaChatResponse.answer}</p>
              <div className="pt-2 flex items-center justify-between text-xs border-t border-[#e8e8e8]">
                <span className="font-mono text-[#816729]">📄 Documento Fuente: {marianaChatResponse.pdfName} ({marianaChatResponse.pdfClause})</span>
                <button onClick={() => alert(`Descargando ${marianaChatResponse.pdfName}...`)} className="text-[#202020] border-b border-[#ff682c] cursor-pointer">
                  Descargar Referencia PDF →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 3: DIEGO AI (CAPEX & GASTOS DUDOSOS VS GARANTÍAS - SCREENSHOT 1 & 2 MATCH) ---------------- */}
      {activeTab === "maint" && (
        <div className="space-y-10">
          {/* Header & 3 Metric Cards Strip (Screenshot 1 Match) */}
          <div className="bg-[#efefef] rounded-tl-[6px] rounded-tr-none rounded-br-none rounded-bl-none p-8 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
              <div>
                <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                  SOP §2B & CAPEX GUARDIAN AI
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#202020] tracking-[-0.02em] mt-1">
                  Auditoría de Gastos CapEx Dudosos vs. Garantías (Diego)
                </h2>
                <p className="text-xs text-[#4d4d4d] mt-1">
                  Verificación técnica de reclamos de mantenimiento, garantías de fabricante y protección del flujo del propietario.
                </p>
              </div>
              <span className="px-4 py-2 bg-[#202020] text-white font-mono text-xs">
                6 EQUIPOS CRÍTICOS MONITOREADOS
              </span>
            </div>

            {/* 3 Metric Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#828282] block">RECLAMOS AUDITADOS</span>
                <div className="text-2xl font-normal text-[#202020]">3 Casos Auditados</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#828282] block">GARANTÍAS RECOBRADAS ($0)</span>
                <div className="text-2xl font-normal text-[#2b593a]">$145,000 MXN / Evento</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#828282] block">GASTO IMPROCEDENTE RECHAZADO</span>
                <div className="text-2xl font-normal text-[#ff682c]">$78,000 MXN Rechazado</div>
              </div>
            </div>
          </div>

          {/* Interactive RAG AI Chat Assistant Box */}
          <div className="bg-white p-8 border border-[#e8e8e8] rounded-[20px] space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-[#202020] text-white flex items-center justify-center text-xs font-mono">D</div>
                <div>
                  <h3 className="text-sm font-normal text-[#202020] uppercase font-mono tracking-wider">
                    ASISTENTE OPERATIVO AI: CONSULTA DIRECTA A DIEGO
                  </h3>
                  <p className="text-xs text-[#828282]">
                    Haz preguntas sobre pólizas Carrier, números de serie, deslinde CapEx/OpEx o contratos de mantenimiento.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-[#816729]">● AUDITORÍA TÉCNICA ACTIVA</span>
            </div>

            {/* Preset Query Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setDiegoQuery("Póliza Carrier HVAC Ashley (#CR-884920)");
                  setDiegoChatResponse({
                    query: "¿Por qué el reemplazo de compresor HVAC de Ashley Furniture no le cuesta al propietario?",
                    answer: "Diego verificó el número de serie Carrier #CR-884920. La póliza de garantía del fabricante Carrier cubre fallas mecánicas de compresores de 15 toneladas durante 5 años (vigente hasta Noviembre 2028). Se tramitó la sustitución sin costo para el propietario ($0 MXN).",
                    pdfName: "Poliza_Garantia_Carrier_Ashley_HVAC.pdf",
                    pdfClause: "Serie #CR-884920 (Cobertura 100% Fábrica)",
                  });
                }}
                className="px-4 py-2 bg-[#efefef] hover:bg-[#ebe6dd] text-[#202020] text-xs rounded-[200px] transition-colors cursor-pointer font-sans"
              >
                ❄️ Póliza Carrier HVAC Ashley (#CR-884920)
              </button>
              <button
                onClick={() => {
                  setDiegoQuery("Iluminación Estética Derma Club ($78k)");
                  setDiegoChatResponse({
                    query: "¿Por qué se rechazó el gasto de iluminación de Derma Club?",
                    answer: "Diego auditó la Sección 12 del contrato marco. Las luminarias decorativas e interiores son responsabilidad 100% del inquilino, por lo que el reclamo de $78,000 MXN fue rechazado para el propietario.",
                    pdfName: "Contrato_DermaClub_Seccion12.pdf",
                    pdfClause: "Sección 12: Mantenimiento Local",
                  });
                }}
                className="px-4 py-2 bg-[#efefef] hover:bg-[#ebe6dd] text-[#202020] text-xs rounded-[200px] transition-colors cursor-pointer font-sans"
              >
                💡 Iluminación Estética Derma Club ($78k)
              </button>
              <button
                onClick={() => {
                  setDiegoQuery("Mantenimiento Planta Emergencia Cinemex");
                  setDiegoChatResponse({
                    query: "¿Cómo se asigna el mantenimiento de la planta de emergencia de Cinemex?",
                    answer: "La planta diésel Caterpillar 500kW alimenta áreas comunes. El costo preventivo de $52,000 MXN se aprueba como gasto común prorrateable en la liquidación CAM NNN mensual.",
                    pdfName: "Cat_Maint_2026.pdf",
                    pdfClause: "Contrato Anual Preventivo",
                  });
                }}
                className="px-4 py-2 bg-[#efefef] hover:bg-[#ebe6dd] text-[#202020] text-xs rounded-[200px] transition-colors cursor-pointer font-sans"
              >
                ⚡ Mantenimiento Planta Emergencia Cinemex
              </button>
            </div>

            {/* Answer Display Card */}
            <div className="bg-[#f5f5f5] p-6 border border-[#e8e8e8] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#828282]">
                <span className="font-mono text-[#202020]">Consulta: {diegoChatResponse.query}</span>
                <span className="text-[#2b593a] font-mono">✓ Verificado en Bitácora de Equipos</span>
              </div>
              <p className="text-sm text-[#202020] leading-relaxed">{diegoChatResponse.answer}</p>
              <div className="pt-2 flex items-center justify-between text-xs border-t border-[#e8e8e8]">
                <span className="font-mono text-[#816729]">📄 Certificado de Garantía / Contrato: {diegoChatResponse.pdfName} ({diegoChatResponse.pdfClause})</span>
                <button onClick={() => alert(`Descargando copia de ${diegoChatResponse.pdfName}...`)} className="text-[#202020] border-b border-[#ff682c] cursor-pointer">
                  Descargar Póliza PDF →
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: EVALUADOR DE SOLICITUDES CAPEX & RECLAMACIÓN DE GARANTÍAS */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3">
              <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                1. EVALUADOR DE SOLICITUDES CAPEX & RECLAMACIÓN DE GARANTÍAS
              </h3>
              <span className="text-xs text-[#828282]">SELECCIONA UN GASTO RECLAMADO PARA AUDITAR</span>
            </div>

            {/* Case Selector Cards */}
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
                    <span className="font-mono text-xs font-bold text-[#ff682c]">
                      ${item.amount.toLocaleString()} MXN
                    </span>
                  </div>
                  <p className="text-xs text-[#4d4d4d]">{item.expenseType}</p>
                </button>
              ))}
            </div>

            {/* Dark Dictamen Box (Screenshot 1 & 2 Match) */}
            <div className="bg-[#202020] text-white p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-[#4d4d4d] pb-4 text-xs font-mono">
                <span>● DICTAMEN TÉCNICO & CONTRACTUAL DIEGO AI ({selectedCapex.id})</span>
                <span className="text-[#ff682c] border-b border-[#ff682c]">
                  🚫 RECHAZADO (RESPONSABILIDAD INQUILINO)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="bg-[#2d2a26] p-4 space-y-1">
                  <span className="text-[#828282] block text-[10px]">INQUILINO SOLICITANTE:</span>
                  <span className="text-sm font-normal text-white">{selectedCapex.tenant}</span>
                </div>
                <div className="bg-[#2d2a26] p-4 space-y-1">
                  <span className="text-[#828282] block text-[10px]">MONTO MONITOREADO:</span>
                  <span className="text-sm font-normal text-[#ff682c]">${selectedCapex.amount.toLocaleString()} MXN</span>
                </div>
                <div className="bg-[#2d2a26] p-4 space-y-1">
                  <span className="text-[#828282] block text-[10px]">IMPACTO AL PROPIETARIO:</span>
                  <span className="text-sm font-normal text-[#2b593a]">$0 MXN (Absorbido)</span>
                </div>
              </div>

              <div className="bg-[#2d2a26] p-6 space-y-2 border border-[#4d4d4d]">
                <span className="text-[10px] font-mono text-[#816729] uppercase block">ANÁLISIS COGNITIVO DIEGO:</span>
                <p className="text-xs text-white leading-relaxed">{selectedCapex.details}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#4d4d4d] text-xs">
                <span className="text-[#828282] font-mono">✓ Auditado automáticamente contra pólizas Carrier & Sección 12 del contrato marco.</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => alert("Generando dictamen técnico en PDF...")} className="px-4 py-2 bg-white text-[#202020] text-xs cursor-pointer">
                    📄 Dictamen PDF
                  </button>
                  <button onClick={() => setDiegoNotificationSent(true)} className="px-4 py-2 bg-[#ff682c] text-white text-xs cursor-pointer">
                    ✉️ {diegoNotificationSent ? "✓ Notificación Enviada" : "Notificar Resolución Técnica"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: BITÁCORA DE EQUIPOS CRÍTICOS & PÓLIZAS DE GARANTÍA VIGENTES (Screenshot 2 Match) */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3">
              <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                2. BITÁCORA DE EQUIPOS CRÍTICOS & PÓLIZAS DE GARANTÍA VIGENTES
              </h3>
              <span className="px-3 py-1 bg-[#202020] text-white text-xs font-mono">
                6 EQUIPOS REGISTRADOS
              </span>
            </div>

            <div className="overflow-x-auto bg-white border border-[#e8e8e8] rounded-[8px]">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-[#e8e8e8] text-[#828282] uppercase text-[10px] bg-[#f5f5f5] tracking-wider font-mono">
                    <th className="p-3.5 font-normal">Equipo / Ubicación</th>
                    <th className="p-3.5 font-normal">Marca & Modelo</th>
                    <th className="p-3.5 font-normal">Número de Serie</th>
                    <th className="p-3.5 font-normal">Vigencia Garantía</th>
                    <th className="p-3.5 font-normal">Estatus de Cobertura</th>
                    <th className="p-3.5 font-normal text-right">Póliza PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8] font-normal text-[#202020]">
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-normal">Carrier HVAC 15 Toneladas (Ashley)</td>
                    <td className="p-3.5 text-[#4d4d4d]">Carrier Commercial WeatherMaster</td>
                    <td className="p-3.5 font-mono text-[#202020]">#CR-884920</td>
                    <td className="p-3.5 font-mono text-[#4d4d4d]">2023 - 2028 (5 Años)</td>
                    <td className="p-3.5"><span className="text-[#2b593a] bg-[#eaf2ec] px-2.5 py-1 text-[11px] font-mono">✓ Garantía 100% Activa ($0 MXN)</span></td>
                    <td className="p-3.5 text-right font-mono"><button onClick={() => alert("Abriendo Póliza Carrier...")} className="px-3 py-1 bg-[#efefef] text-[#202020] text-[11px]">Carrier_Poliza.pdf</button></td>
                  </tr>
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-normal">Planta de Emergencia Diésel 500kW (Cinemex)</td>
                    <td className="p-3.5 text-[#4d4d4d]">Caterpillar C15 ACERT</td>
                    <td className="p-3.5 font-mono text-[#202020]">#CAT-500-9942</td>
                    <td className="p-3.5 font-mono text-[#4d4d4d]">Contrato Anual Preventivo</td>
                    <td className="p-3.5"><span className="text-[#816729] bg-[#f4efe6] px-2.5 py-1 text-[11px] font-mono">✓ Cobertura CAM Prorrateable</span></td>
                    <td className="p-3.5 text-right font-mono"><button onClick={() => alert("Abriendo Contrato Cat...")} className="px-3 py-1 bg-[#efefef] text-[#202020] text-[11px]">Cat_Maint_2026.pdf</button></td>
                  </tr>
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-normal">Subestación Eléctrica Principal 13.8kV</td>
                    <td className="p-3.5 text-[#4d4d4d]">Schneider Electric Trihal 1500kVA</td>
                    <td className="p-3.5 font-mono text-[#202020]">#SCH-SE-44210</td>
                    <td className="p-3.5 font-mono text-[#4d4d4d]">Garantía Infraestructura Propietario</td>
                    <td className="p-3.5"><span className="text-[#202020] bg-[#efefef] px-2.5 py-1 text-[11px] font-mono">✓ Mantenimiento Bianual Al Día</span></td>
                    <td className="p-3.5 text-right font-mono"><button onClick={() => alert("Abriendo Póliza Schneider...")} className="px-3 py-1 bg-[#efefef] text-[#202020] text-[11px]">Schneider_13.8kV.pdf</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: MATRIZ DE DESLINDE CAPEX / OPEX & REGLAS DE MANTENIMIENTO (Screenshot 2 Match) */}
          <div className="space-y-6 pt-4">
            <div className="border-b border-[#e8e8e8] pb-3">
              <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                3. MATRIZ DE DESLINDE CAPEX / OPEX & REGLAS DE MANTENIMIENTO
              </h3>
              <p className="text-xs text-[#4d4d4d] mt-1">
                Criterios normativos de asignación de costos entre Propietario, Inquilino y Fondo Común CAM.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#202020]">1. Carga del Propietario</span>
                  <span className="px-2 py-0.5 bg-[#202020] text-white text-[10px] font-mono">CAPEX PROPIETARIO</span>
                </div>
                <p className="text-xs text-[#4d4d4d]">Infraestructura estructural primaria y activos mayores de la plaza.</p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Cimentación & muros de carga</p>
                  <p>• Impermeabilización general de losas</p>
                  <p>• Red principal hidrosanitaria</p>
                </div>
              </div>

              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#202020]">2. Carga del Inquilino</span>
                  <span className="px-2 py-0.5 bg-[#ff682c] text-white text-[10px] font-mono">RESPONSABILIDAD LOCAL</span>
                </div>
                <p className="text-xs text-[#4d4d4d]">Equipamiento interior, acabados arquitectónicos y mantenimiento preventivo del giro.</p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Luminarias estéticas e interiores</p>
                  <p>• Trampas de grasa y filtros de cocina</p>
                  <p>• Cortinas metálicas y cristales</p>
                </div>
              </div>

              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#202020]">3. Prorrateo CAM NNN</span>
                  <span className="px-2 py-0.5 bg-[#816729] text-white text-[10px] font-mono">GASTO COMÚN</span>
                </div>
                <p className="text-xs text-[#4d4d4d]">Gastos operativos de conservación y servicios compartidos entre los 85 locales.</p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Vigilancia 24/7 y circuito cerrado</p>
                  <p>• Alumbrado de estacionamiento</p>
                  <p>• Planta de emergencia diésel común</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 4: RENATA AI (CAM NNN & FISCAL SAT - SCREENSHOT 3 & 4 MATCH) ---------------- */}
      {activeTab === "cam" && (
        <div className="space-y-10">
          {/* Header & 3 Metric Cards Strip (Screenshot 3 Match) */}
          <div className="bg-[#efefef] rounded-tl-[6px] rounded-tr-none rounded-br-none rounded-bl-none p-8 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
              <div>
                <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                  SOP §2C & FISCAL GUARDIAN AI
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#202020] tracking-[-0.02em] mt-1">
                  Prorrateo CAM NNN & Auditoría Fiscal SAT CFDI 4.0 (Renata)
                </h2>
                <p className="text-xs text-[#4d4d4d] mt-1">
                  Auditoría en tiempo real de timbrado CFDI 4.0, complementos de pago PPD/PUE y balance matemático invariante del prorrateo CAM.
                </p>
              </div>
              <span className="px-4 py-2 bg-[#202020] text-white font-mono text-xs">
                85 LOCALES BALANCED 1.0000
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#828282] block">VALIDACIÓN FISCAL SAT</span>
                <div className="text-2xl font-normal text-[#202020]">84 / 85 CFDIs Validados</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#828282] block">INVARIANTE PRORRATEO CAM</span>
                <div className="text-2xl font-normal text-[#2b593a]">1.0000 Balance Exacto</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#828282] block">MULTA SAT PREVENIDA</span>
                <div className="text-2xl font-normal text-[#ff682c]">$12,500 MXN Sanción $0</div>
              </div>
            </div>
          </div>

          {/* Interactive RAG AI Chat Assistant Box */}
          <div className="bg-white p-8 border border-[#e8e8e8] rounded-[20px] space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-[#202020] text-white flex items-center justify-center text-xs font-mono">R</div>
                <div>
                  <h3 className="text-sm font-normal text-[#202020] uppercase font-mono tracking-wider">
                    ASISTENTE FISCAL AI: CONSULTA DIRECTA A RENATA
                  </h3>
                  <p className="text-xs text-[#828282]">
                    Haz preguntas sobre timbrado SAT CFDI 4.0, complementos de pago PPD vs PUE o la fórmula de prorrateo NNN.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-[#816729]">● VALIDADOR SAT CFDI 4.0 ACTIVO</span>
            </div>

            <div className="bg-[#f5f5f5] p-6 border border-[#e8e8e8] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#828282]">
                <span className="font-mono text-[#202020]">Consulta Fiscal: {renataChatResponse.query}</span>
                <span className="text-[#2b593a] font-mono">✓ Validación SAT Anexo 20</span>
              </div>
              <p className="text-sm text-[#202020] leading-relaxed">{renataChatResponse.answer}</p>
              <div className="pt-2 flex items-center justify-between text-xs border-t border-[#e8e8e8]">
                <span className="font-mono text-[#816729]">📄 Esquema XML / Póliza SAT: {renataChatResponse.xmlName} ({renataChatResponse.xmlClause})</span>
                <button onClick={() => alert(`Descargando XML SAT...`)} className="text-[#202020] border-b border-[#ff682c] cursor-pointer">
                  Descargar XML SAT →
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: AUDITORÍA DE ERRORES FISCALES SAT CFDI 4.0 & COMPLEMENTOS PPD (Screenshot 3 Match) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3">
              <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                1. AUDITORÍA DE ERRORES FISCALES SAT CFDI 4.0 & COMPLEMENTOS PPD
              </h3>
              <span className="text-xs text-[#828282]">MONITOREO AUTOMÁTICO PRE-DECLARACIÓN</span>
            </div>

            {/* Red Alert Box (Screenshot 3 Match) */}
            <div className="bg-[#f5e9e8] p-8 border border-[#e8d2d1] space-y-6">
              <div className="flex items-center justify-between border-b border-[#e8d2d1] pb-4 font-mono text-xs">
                <span className="text-[#7a2e2b] font-bold">🚨 ⚠️ ALERTA FISCAL SAT CFDI 4.0: MINT BOUTIQUE (LOCAL B-14)</span>
                <span className="bg-[#7a2e2b] text-white px-3 py-1 text-[11px]">RIESGO MULTA: $12,500 MXN PREVENIDO</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div className="bg-white p-4 space-y-1 border border-[#e8d2d1]">
                  <span className="text-[#828282] block text-[10px]">Factura Original Emitida:</span>
                  <span className="text-sm font-bold text-[#202020]">Folio #CFDI-8842 (Método PPD)</span>
                </div>
                <div className="bg-white p-4 space-y-1 border border-[#e8d2d1]">
                  <span className="text-[#828282] block text-[10px]">Pago Recibido en Banco:</span>
                  <span className="text-sm font-bold text-[#2b593a]">$32,000 MXN (Registrado PUE)</span>
                </div>
                <div className="bg-white p-4 space-y-1 border border-[#e8d2d1]">
                  <span className="text-[#828282] block text-[10px]">Discrepancia SAT:</span>
                  <span className="text-sm font-bold text-[#7a2e2b]">Falta Complemento de Pago</span>
                </div>
              </div>

              <p className="text-xs text-[#7a2e2b] leading-relaxed">
                Renata detectó que la transferencia bancaria fue registrada erróneamente por el cliente como PUE (Pago en una sola exhibición). Conforme al Reglamento de la Cédula Fiscal SAT CFDI 4.0, se requiere auto-emitir el Complemento de Recepción de Pagos oficial antes del cierre del mes para evitar auditorías al propietario.
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-[#e8d2d1] text-xs">
                <span className="text-[#7a2e2b] font-mono">Estado: Esperando confirmación para timbrado directo ante el PAC SAT</span>
                <button
                  onClick={() => setRenataCfdiIssued(true)}
                  className="px-6 py-3 bg-[#7a2e2b] text-white rounded-none font-bold text-xs cursor-pointer hover:bg-[#962826]"
                >
                  ⚡ {renataCfdiIssued ? "✓ Complemento SAT CFDI 4.0 Emitido" : "Auto-Emitir Complemento SAT CFDI 4.0"}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: MATRIZ DE PRORRATEO NNN & LIQUIDACIÓN CAM POR INQUILINO (Screenshot 4 Match) */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3">
              <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                2. MATRIZ DE PRORRATEO NNN & LIQUIDACIÓN CAM POR INQUILINO (85 LOCALES)
              </h3>
              <span className="px-3 py-1 bg-[#202020] text-white text-xs font-mono">
                INVARIANTE 1.0000 CUADRADA
              </span>
            </div>

            <div className="overflow-x-auto bg-white border border-[#e8e8e8] rounded-[8px]">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-[#e8e8e8] text-[#828282] uppercase text-[10px] bg-[#f5f5f5] tracking-wider font-mono">
                    <th className="p-3.5 font-normal">Inquilino / Local</th>
                    <th className="p-3.5 font-normal text-right">Superficie M²</th>
                    <th className="p-3.5 font-normal text-right">% Pro-Rata NNN</th>
                    <th className="p-3.5 font-normal text-right">Cuota CAM Base</th>
                    <th className="p-3.5 font-normal text-right">Admin (15%)</th>
                    <th className="p-3.5 font-normal text-right">IVA (16%)</th>
                    <th className="p-3.5 font-normal text-right">Total CFDI MXN</th>
                    <th className="p-3.5 font-normal text-right">Estado SAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8] font-normal text-[#202020] font-mono text-[11px]">
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold font-sans">260 Grill & Bar</td>
                    <td className="p-3.5 text-right font-bold">320 m²</td>
                    <td className="p-3.5 text-right text-[#ff682c] font-bold">2.51%</td>
                    <td className="p-3.5 text-right">$11,360</td>
                    <td className="p-3.5 text-right">$1,704</td>
                    <td className="p-3.5 text-right">$2,090</td>
                    <td className="p-3.5 text-right font-bold">$15,154</td>
                    <td className="p-3.5 text-right"><span className="bg-[#eaf2ec] text-[#2b593a] px-2 py-0.5">✓ Timbrado SAT CFDI 4.0</span></td>
                  </tr>
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold font-sans">Alma Verde</td>
                    <td className="p-3.5 text-right font-bold">220 m²</td>
                    <td className="p-3.5 text-right text-[#ff682c] font-bold">1.73%</td>
                    <td className="p-3.5 text-right">$7,810</td>
                    <td className="p-3.5 text-right">$1,172</td>
                    <td className="p-3.5 text-right">$1,437</td>
                    <td className="p-3.5 text-right font-bold">$10,419</td>
                    <td className="p-3.5 text-right"><span className="bg-[#eaf2ec] text-[#2b593a] px-2 py-0.5">✓ Timbrado SAT CFDI 4.0</span></td>
                  </tr>
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold font-sans">AmoreMe</td>
                    <td className="p-3.5 text-right font-bold">76 m²</td>
                    <td className="p-3.5 text-right text-[#ff682c] font-bold">0.60%</td>
                    <td className="p-3.5 text-right">$2,698</td>
                    <td className="p-3.5 text-right">$405</td>
                    <td className="p-3.5 text-right">$496</td>
                    <td className="p-3.5 text-right font-bold">$3,599</td>
                    <td className="p-3.5 text-right"><span className="bg-[#eaf2ec] text-[#2b593a] px-2 py-0.5">✓ Timbrado SAT CFDI 4.0</span></td>
                  </tr>
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold font-sans">Ashley</td>
                    <td className="p-3.5 text-right font-bold">1450 m²</td>
                    <td className="p-3.5 text-right text-[#ff682c] font-bold">11.38%</td>
                    <td className="p-3.5 text-right">$51,475</td>
                    <td className="p-3.5 text-right">$7,721</td>
                    <td className="p-3.5 text-right">$9,471</td>
                    <td className="p-3.5 text-right font-bold">$68,667</td>
                    <td className="p-3.5 text-right"><span className="bg-[#eaf2ec] text-[#2b593a] px-2 py-0.5">✓ Timbrado SAT CFDI 4.0</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: REGLAS DE GOBERNANZA FISCAL SAT CFDI 4.0 & ESTÁNDAR NNN (Screenshot 4 Match) */}
          <div className="space-y-6 pt-4">
            <div className="border-b border-[#e8e8e8] pb-3">
              <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                3. REGLAS DE GOBERNANZA FISCAL SAT CFDI 4.0 & ESTÁNDAR NNN
              </h3>
              <p className="text-xs text-[#4d4d4d] mt-1">
                Criterios de auditoría tributaria y conservación del fondo operativo de la plaza.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#202020]">1. Régimen PPD / PUE SAT</span>
                  <span className="px-2 py-0.5 bg-[#202020] text-white text-[10px]">SAT 4.0</span>
                </div>
                <p className="text-xs text-[#4d4d4d]">Obligatoriedad de timbrado del Complemento de Pago dentro de los primeros 5 días hábiles del mes posterior.</p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Límite emisión complemento: Día 5</p>
                  <p>• Validación RFC receptor contra CIF</p>
                  <p>• Trazabilidad bancaria SPEI</p>
                </div>
              </div>

              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#202020]">2. Invariante NNN (1.0000)</span>
                  <span className="px-2 py-0.5 bg-[#202020] text-white text-[10px]">MATEMÁTICA NNN</span>
                </div>
                <p className="text-xs text-[#4d4d4d]">Distribución proporcional exacta del 100% de la superficie rentable de la plaza.</p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Superficie GLA: 7,550 m²</p>
                  <p>• Absorción vacancia propietario: 5.89%</p>
                  <p>• Error de redondeo tolerado: 0.0000</p>
                </div>
              </div>

              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#202020]">3. Honorario Administración</span>
                  <span className="px-2 py-0.5 bg-[#202020] text-white text-[10px]">FEE 15% NNN</span>
                </div>
                <p className="text-xs text-[#4d4d4d]">Cálculo del 15% sobre gastos de mantenimiento común para la administración del activo.</p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Aplicable a: Mantenimientos comunes</p>
                  <p>• Excluido de: Renta base pura</p>
                  <p>• Facturación transparente mensual</p>
                </div>
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
